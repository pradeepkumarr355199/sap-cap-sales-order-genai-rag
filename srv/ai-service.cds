using { sap.vector as vector } from '../db/vector';
using { sap.sd as sd } from '../db/views';

service AIService @(path:'/ai') {

  entity DocumentEmbeddings
    as projection on vector.DocumentEmbeddings;

  entity SalesOrderView
    as projection on sd.SalesOrderView;

  action loadText() returns String;

  action ask(question: String) returns String;

}