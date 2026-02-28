const cds = require('@sap/cds');
const fs = require('fs');
const crypto = require('crypto');
const { pipeline } = require('@xenova/transformers');
const Groq = require('groq-sdk');

module.exports = cds.service.impl(async function () {

  const db = await cds.connect.to('db');
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });

  // ✅ Correct entity resolution
  //const { DocumentEmbeddings, SalesOrderView } = this.entities;
  const { DocumentEmbeddings } = this.entities;
  const SalesOrderView = cds.entities['sap.sd.SalesOrderView'];
  // =====================================
  // CONFIGURATION
  // =====================================
  const TOP_K = 5;
  const SIMILARITY_THRESHOLD = 0.70;

  // =====================================
  // Load embedding model ONCE
  // =====================================
  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );

  async function embed(text) {
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }

  // =====================================
  // 1️⃣ LOAD TEXT (Existing – Optimized)
  // =====================================
  this.on('loadText', async () => {

    const fullText = fs.readFileSync('sales_context.txt', 'utf8');
    const chunks = fullText.match(/.{1,500}/g) || [];

    let inserted = 0;

    for (const chunk of chunks) {

      const vector = await embed(chunk);

      await db.run(
        `
        INSERT INTO SAP_VECTOR_DOCUMENTEMBEDDINGS
        (ID, content, embedding, source)
        VALUES (?, ?, TO_REAL_VECTOR(?), ?)
        `,
        [
          crypto.randomUUID(),
          chunk,
          JSON.stringify(vector),
          'sales_context.txt'
        ]
      );

      inserted++;
    }

    return `Inserted ${inserted} chunks`;
  });

  // =====================================
  // 2️⃣ VECTOR SIMILARITY SEARCH
  // =====================================
  async function similaritySearch(questionEmbedding, topK = TOP_K) {

    const results = await db.run(
      `
      SELECT TOP ${topK}
        content,
        COSINE_SIMILARITY(
          embedding,
          TO_REAL_VECTOR(?)
        ) AS score
      FROM SAP_VECTOR_DOCUMENTEMBEDDINGS
      ORDER BY score DESC
      `,
      [JSON.stringify(questionEmbedding)]
    );

    if (!results.length) return [];

    const topScore = results[0].SCORE;
    const threshold = topScore * 0.80;

    // Step 1: threshold filter
    let filtered = results.filter(r => r.SCORE >= threshold);

    // Step 2: deduplicate
    const uniqueMap = new Map();
    for (const r of filtered) {
      if (!uniqueMap.has(r.CONTENT)) {
        uniqueMap.set(r.CONTENT, r);
      }
    }
    let uniqueResults = Array.from(uniqueMap.values());

    // Step 3: sort
    uniqueResults.sort((a, b) => b.SCORE - a.SCORE);

    // Step 4: gap analysis
    if (uniqueResults.length > 1) {
      const gap = uniqueResults[0].SCORE - uniqueResults[1].SCORE;

      // If gap is significant, keep only the top result
      if (gap > 0.15) {
        uniqueResults = [uniqueResults[0]];
      }
    }

    return uniqueResults;
  }
  
     
  // =====================================
  // 3️⃣ STRUCTURED SEARCH
  // =====================================
  async function structuredSearch(question) {

    // Detect Sales Order number (basic intent logic)
    const soMatch = question.match(/\d{6,10}/);

    if (soMatch) {
      return await SELECT
        .from(SalesOrderView)
        .where({ SalesOrderNumber: soMatch[0] });
    }

    // Detect customer name (simple heuristic)
    if (question.toLowerCase().includes('customer')) {
      return await SELECT
        .from(SalesOrderView)
        .limit(5);
    }

    // Fallback
    return await SELECT
      .from(SalesOrderView)
      .limit(3);
  }
  // =====================================
  // 4. Intent Detection Function
  // =====================================
  
  function detectIntent(question) {

    const q = question.toLowerCase();

    const hasNumber = /\d{6,10}/.test(q);

    const semanticKeywords = [
      'explain',
      'describe',
      'policy',
      'context',
      'about',
      'meaning',
      'information'
    ];

    const hasSemantic =
      semanticKeywords.some(word => q.includes(word));

    // ==============================
    // HYBRID: both structured + semantic
    // ==============================
    if (hasNumber && hasSemantic) {
      return 'hybrid';
    }

    // ==============================
    // STRUCTURED ONLY
    // ==============================
    if (hasNumber) {
      return 'structured';
    }

    // ==============================
    // VECTOR ONLY
    // ==============================
    if (hasSemantic) {
      return 'vector';
    }

    // ==============================
    // DEFAULT
    // ==============================
    return 'hybrid';
  }
  
 
 
  // =====================================
  // 4️⃣ HYBRID RETRIEVER (ask logic)
  // =====================================
  this.on('ask', async (req) => {

    const { question } = req.data;

    if (!question) {
      return { error: "Please provide a question." };
    }

    const intent = detectIntent(question);

    let vectorResults = [];
    let structuredResults = [];

    // =============================
    // STRUCTURED ONLY
    // =============================
    if (intent === 'structured') {
      structuredResults = await structuredSearch(question);
    }

    // =============================
    // VECTOR ONLY
    // =============================
    if (intent === 'vector') {
      const questionEmbedding = await embed(question);
      vectorResults = await similaritySearch(questionEmbedding);
    }

    // =============================
    // HYBRID
    // =============================
    if (intent === 'hybrid') {
      const questionEmbedding = await embed(question);
      vectorResults = await similaritySearch(questionEmbedding);
      structuredResults = await structuredSearch(question);
    }

    // =============================
    // 🔐 GUARDRAIL: No Retrieval Protection
    // =============================
    if (
      intent === 'vector' &&
      vectorResults.length === 0
    ) {
      return {
        intent,
        answer: "Information not found in knowledge base."
      };
    }

    if (
      intent === 'structured' &&
      structuredResults.length === 0
    ) {
      return {
        intent,
        answer: "Sales order not found in system."
      };
    }

    if (
      intent === 'hybrid' &&
      vectorResults.length === 0 &&
      structuredResults.length === 0
    ) {
      return {
        intent,
        answer: "Relevant information not found."
      };
    }

    // =============================
    // RETRIEVAL COMPLETE
    // =============================

    // 🔐 Strict rule: if question contains order number,
    // structured data must exist
    const containsOrderNumber = /\d{6,10}/.test(question);

    if (containsOrderNumber && structuredResults.length === 0) {
      return {
        intent,
        answer: "Sales order not found in system."
      };
    }

    // =============================
    // CONTEXT MERGE
    // =============================
    const structuredContext =
      structuredResults.length
        ? JSON.stringify(structuredResults, null, 2)
        : "";

    const vectorContext =
      vectorResults.length
        ? vectorResults.map(v => v.CONTENT).join('\n')
        : "";

    const finalContext = `
  Structured SAP Data:
  ${structuredContext}

  Relevant Documents:
  ${vectorContext}
  `;


    // =============================
    // 🔐 STRICT SYSTEM PROMPT - CALL GROQ
    // =============================
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
  You are an SAP Sales AI assistant.

  Strict Rules:
  1. Use ONLY the provided context.
  2. Do NOT assume policies or thresholds not explicitly stated.
  3. If required data is missing, respond exactly with:
    "Information not found in system."
  4. Do NOT use general knowledge.
  `
        },
        {
          role: "user",
          content: `
  Context:
  ${finalContext}

  Question:
  ${question}
  `
        }
      ]
    });

    return {
      intent,
      answer: completion.choices[0].message.content
    };

  });
   
});