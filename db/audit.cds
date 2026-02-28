using { cuid, managed } from '@sap/cds/common';

namespace sap.audit;

entity AILog : cuid, managed {
  question          : LargeString;
  intent            : String(20);
  structuredCount   : Integer;
  vectorCount       : Integer;
  topScore          : Decimal(5,4);
  response          : LargeString;

  // NEW FIELDS
  promptTokens      : Integer;
  completionTokens  : Integer;
  totalTokens       : Integer;
  modelUsed         : String(100);
}