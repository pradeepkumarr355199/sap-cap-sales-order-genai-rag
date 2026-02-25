using { sap.sd.VBAP } from './schema';

namespace sap.sd;

entity SalesOrderView as
    select from VBAP {
        VBELN.ID                  as SalesOrderUUID,
        VBELN.VBELN               as SalesOrderNumber,
        VBELN.ERDAT,
        VBELN.AUART,
        VBELN.NETWR,

        VBELN.KUNNR.ID            as CustomerUUID,
        VBELN.KUNNR.KUNNR         as CustomerNumber,
        VBELN.KUNNR.NAME1         as CustomerName,
        VBELN.KUNNR.LAND1,
        VBELN.KUNNR.CITY1,

        ID                        as ItemUUID,
        POSNR,
        MATNR,
        ARKTX,
        KWMENG,
        NETPR
    };
