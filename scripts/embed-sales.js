const rows = await db.run(
  SELECT.from("sap.sd.SalesOrderView")
);

for (const row of rows) {
  const text = `
    Sales Order ${row.SalesOrderNumber}
    Customer ${row.CustomerName}
    Total value ${row.NETWR}
    Item ${row.ARKTX}
    Quantity ${row.KWMENG}
    Price ${row.NETPR}
  `;

  const vector = await embed(text);

  await db.run(
    INSERT.into("sap.vector.SalesOrderEmbeddings").entries({
      ID: crypto.randomUUID(),
      salesOrderID: row.SalesOrderUUID,
      content: text,
      embedding: vector
    })
  );
}
