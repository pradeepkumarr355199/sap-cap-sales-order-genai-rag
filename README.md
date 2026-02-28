#  Hybrid Enterprise RAG on SAP CAP + HANA + Groq

##  Project Overview

This project implements a Hybrid Enterprise Retrieval-Augmented Generation (RAG) system built using:

- SAP CAP (v9+)
- SAP HANA Cloud (HDI container)
- Vector embeddings (MiniLM – 384 dimensions)
- Groq LLM integration
- Hybrid retrieval (Structured + Semantic)
- Enterprise guardrails
- RBAC
- Audit logging
- Token governance
- Model fallback
- Embedding warm pool

This is not a demo RAG.  
It is a governed, role-aware, resilient AI backend architecture.

---

##  Architecture Flow

User  
↓  
AIService (/ai/ask)  
↓  
Intent Detection  
↓  
Structured Retrieval (HANA View) + Vector Similarity Search  
↓  
Role-Based Filtering (RBAC)  
↓  
Guardrails Enforcement  
↓  
Context Merge  
↓  
Groq LLM (Primary → Fallback)  
↓  
Audit Logging (HANA)  
↓  
Response  

---

## 1. Environment Setup

### Platform

- SAP Business Application Studio (BAS)
- Cloud Foundry (Trial)
- SAP HANA Cloud
- CAP v9+
- @cap-js/hana
- Hybrid profile binding

### Key Commands

cf login  
cf target  
cds deploy --to hana  
cds bind -2 <db-service>  
cds watch --profile hybrid  

---

## 2. Data Modeling

### Structured Layer (SAP SD Simulation)

Namespace: sap.sd

Entities:
- KNA1 – Customer
- VBAK – Sales Order Header
- VBAP – Sales Order Items

Joined View:
SalesOrderView → Generated in HANA as SAP_SD_SALESORDERVIEW

---

## 3. Vector Layer

Namespace: sap.vector

Table:
DocumentEmbeddings
- ID (UUID)
- content (LargeString)
- embedding (Vector(384))
- source (String)

Embedding Model:
Xenova/all-MiniLM-L6-v2  
Dimension: 384

Embeddings stored using TO_REAL_VECTOR().

---

## 4. Ingestion Architecture

Final design decision:
- Convert PDF → TXT offline
- Chunk text
- Generate embeddings
- Store in vector table

Reason:
- Avoid runtime PDF parsing issues
- Keep backend stable
- Separate ingestion from runtime serving

---

## 5. Hybrid Retrieval Logic

Intent Detection:
- Structured (Order numbers detected)
- Vector (Semantic questions)
- Hybrid (Both)

Structured Retrieval:
- Supports multiple order numbers
- SQL IN clause
- Queries SAP_SD_SALESORDERVIEW

Vector Retrieval:
- Embed query
- Compute cosine similarity
- Apply similarity threshold
- Deduplicate results

Context Merge:
Structured SAP Data + Relevant Document Chunks

---

## 6. Guardrail Layer

- Strict order-existence enforcement
- No-context protection
- Context-only LLM answering
- Controlled fallback response

Prevents hallucination and unsafe reasoning.

---

## 7. Role-Based Access Control (RBAC)

Role passed via header:
x-role: SALES_REP  
x-role: FINANCE  
x-role: RISK_MANAGER  

Rules:
- SALES_REP → Orders < 50,000
- RISK_MANAGER → Orders ≥ 50,000
- FINANCE → Full access

Filtering applied before LLM call.

---

## 8. Audit Logging

Namespace: sap.audit  
Table: SAP_AUDIT_AILOG

Logged fields:
- Question
- Intent
- Structured result count
- Vector result count
- Top similarity score
- LLM response
- Prompt tokens
- Completion tokens
- Total tokens
- Model used
- Timestamp (managed)

Ensures AI traceability.

---

## 9. Token Governance

Extracted from Groq response:
- prompt_tokens
- completion_tokens
- total_tokens

Enables monitoring:

SELECT SUM(TOTALTOKENS) FROM SAP_AUDIT_AILOG;

Supports cost control and governance.

---

## 10. Model Resilience

Primary model:
llama-3.3-70b-versatile

Fallback model:
llama-3.3-8b-instant

If primary fails:
→ fallback invoked  
If fallback fails:
→ controlled error message  

Prevents single point of failure.

---

## 11. Performance Optimization

Embedding model caching:
- Global extractor instance
- Loaded once at startup
- Reused across requests

Warm pool eliminates cold start delay.

---

## 12. Testing Scenarios

- Non-existing order → blocked
- Out-of-scope question → safe response
- Low-value order (SALES_REP) → visible
- High-value order (SALES_REP) → hidden
- High-value order (RISK_MANAGER) → visible
- Multi-order queries → correctly filtered

---

## Enterprise Maturity Level

Implemented:
- Hybrid Retrieval
- Guardrails
- RBAC
- Audit Logging
- Token Governance
- Model Fallback
- Performance Warm Pool

Architecture Level:
Governed Enterprise Hybrid RAG

---

## How To Run

npm install  
cds deploy --to hana  
cds watch --profile hybrid  

Test endpoint:
POST /ai/ask

Optional header:
x-role: FINANCE  

---

## Key Learnings

1. CAP v9 requires @cap-js/hana  
2. Hybrid profile must be explicitly used  
3. HANA DB column names are uppercase  
4. Vector dimension must match embedding model  
5. Role filtering must occur before LLM call  
6. Audit logging is mandatory in enterprise AI  
7. Token tracking enables cost governance  
8. Model fallback improves resilience  
9. Embedding caching improves performance  
10. Guardrails prevent hallucination  

---

## In SAP landscapes (CAP, HANA, BTP):
"In SAP enterprise systems, I prefer building the RAG core in standard Node.js for better control, performance, and CAP integration.
I use HANA native vector search and call the LLM directly.
LangChain.js is useful for rapid prototyping or complex agent workflows, but in production SAP systems I prefer lightweight architecture."

### Preferred Approach
1. Node.js service (CAP)
2. Direct HANA vector search (SQL)
3. Direct LLM SDK (OpenAI / Groq / Azure)
4. Custom prompt engineering
5. Full logging + observability

### Why not full LangChain.js?
1. Extra abstraction layer
2. Harder debugging inside CAP
3. Performance overhead
4. Enterprise compliance needs tighter control
5. Vendor lock concerns

So yes — LangChain.js is optional, not mandatory.
"LangChain is excellent for experimentation and rapid feature building, but in regulated SAP enterprise systems, minimizing abstraction layers improves auditability, latency, and operational control."


----
End of README
