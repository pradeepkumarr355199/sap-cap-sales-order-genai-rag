using { sap.sd.KNA1, sap.sd.VBAK, sap.sd.VBAP } from '../db/schema';

service SalesService {

    entity Customers        as projection on KNA1;
    entity SalesOrders      as projection on VBAK;
    entity SalesOrderItems  as projection on VBAP;

}
