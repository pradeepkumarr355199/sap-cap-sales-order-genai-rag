namespace sap.vector;

entity DocumentEmbeddings {
    key ID        : UUID;
    content       : LargeString;
    embedding     : Vector(384);
    source        : String(255);
}

entity SalesOrderEmbeddings {
    key ID            : UUID;
    salesOrderID      : UUID;
    content           : LargeString;
    embedding         : Vector(384);
}


