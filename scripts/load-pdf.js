const fs = require('fs');
const crypto = require('crypto');
const cds = require('@sap/cds');
const { pipeline } = require('@xenova/transformers');

module.exports = cds.service.impl(async function () {

  const db = await cds.connect.to('db');

  this.on('loadText', async () => {

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

    const fullText = fs.readFileSync('sales_context.txt', 'utf8');

    const chunks = fullText.match(/.{1,500}/g) || [];

    for (const chunk of chunks) {
      const vector = await embed(chunk);

      await db.run(
        INSERT.into('sap.vector.DocumentEmbeddings').entries({
          ID: crypto.randomUUID(),
          content: chunk,
          embedding: vector,
          source: 'sales_context.txt'
        })
      );
    }

    return `Inserted ${chunks.length} chunks`;
  });

});
