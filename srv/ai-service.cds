using { sap.vector as vector } from '../db/vector';

service AIService {

  entity DocumentEmbeddings
    as projection on vector.DocumentEmbeddings;

  action loadText() returns String;

}
