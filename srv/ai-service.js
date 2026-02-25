const cds = require('@sap/cds');
const fs = require('fs');
const crypto = require('crypto');
const { pipeline } = require('@xenova/transformers');

module.exports = cds.service.impl(async function () {

  const db = await cds.connect.to('db');

  // ✅ Correct entity resolution inside service
  const { DocumentEmbeddings } = this.entities;
  
  this.on('loadText', async () => {

    // ✅ Load embedding model
    const extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    const embed = async (text) => {
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true
      });
      return Array.from(output.data);
    };
    

    // ✅ Read text file
    const fullText = fs.readFileSync('sales_context.txt', 'utf8');
    const chunks = fullText.match(/.{1,500}/g) || [];

    let inserted = 0;

    for (const chunk of chunks) {

      // ✅ CAP v9 correct insert syntax
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
        JSON.stringify(Array.from(vector)),
        'sales_context.txt'
      ]
    );

      inserted++;
    }

    return `Inserted ${inserted} chunks`;
  });

});