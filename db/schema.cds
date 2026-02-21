namespace sap.sd;

using { cuid, managed } from '@sap/cds/common';

entity KNA1 : cuid, managed {
    KUNNR     : String(10);     // Customer Number
    NAME1     : String(100);    // Customer Name
    LAND1     : String(3);      // Country
    CITY1     : String(40);
}

entity VBAK : cuid, managed {
    VBELN     : String(10);     // Sales Order Number
    ERDAT     : Date;           // Created Date
    AUART     : String(4);      // Order Type
    KUNNR     : Association to KNA1;
    NETWR     : Decimal(15,2);  // Net Value

    Items     : Composition of many VBAP
                on Items.VBELN = $self;
}

entity VBAP : cuid, managed {
    POSNR     : String(6);      // Item Number
    MATNR     : String(18);     // Material
    ARKTX     : String(100);    // Description
    KWMENG    : Decimal(13,3);  // Order Qty
    NETPR     : Decimal(13,2);  // Net Price

    VBELN     : Association to VBAK;
}
