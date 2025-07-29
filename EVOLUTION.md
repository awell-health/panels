# Healthcare Data Hub – Detailed Architecture (Naming-Aligned vNext)

## 0. Goals

- Ingest heterogeneous healthcare data and persist raw payloads.
- Transform payloads into valid FHIR resources and store them in **Medplum**.
- Enable low/no-code workflows in **n8n** and per-tenant customization.
- Provide a cohesive **Backend Facade** (single API) abstracting all moving parts.
- Preserve auditability (per-record before/after via JSON Patch) and run introspection.
- Maintain evented control/status via **JetStream** while exposing REST APIs to the UI.
- **Naming:** Camel/PascalCase for entities/columns/tables (quoted identifiers), camelCase in API JSON.

---

## 1. Component Map

### Intent & Behavior
- **Purpose:** Define the moving parts and their boundaries so contributors know where logic lives.
- **Behavior:** Backend Facade exposes REST and publishes/consumes JetStream control/status; n8n executes workflows (including **AgentWorkflows**); Transformation Service (hybrid) performs universal mapping/validation and may delegate to tenant **TransformationWorkflows**; Medplum validates & persists FHIR.
- **Key decisions:** Keep orchestration out of the Facade; keep Facade⇄JetStream; deterministic core with AI used in authoring or explicitly in AgentWorkflows.
- **Operator impact:** Each component scales independently with dedicated SLOs.

| Component                             | Responsibility                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend Facade**                    | Public REST API (templates, workflows, rules, records, audit, controls, events). Publishes `control.*` and consumes `status.*` on JetStream.                                                      |
| **n8n**                               | Executes ingestion and transformation flows; hosts **AgentWorkflows** (workflows that include AI steps).                                                                                          |
| **Postgres**                          | Stores RawData, CandidateResource, Mapping, MappingSuggestion, HumanReviewEvent, ValidationRule, WorkflowTemplate, Workflow, WorkflowRun, TransformationResult, SourceDefinition, ExecutionEvent. |
| **NATS JetStream**                    | `events.*` (ingestion), `status.*` (workflow/transformation), `control.*` (Facade commands).                                                                                                      |
| **Medplum**                           | FHIR validation & storage (+ Provenance/AuditEvent).                                                                                                                                              |
| **Transformation Service (optional)** | Universal mapping/validation; optionally delegates to **TransformationWorkflow (ClientSpecific)** (hybrid mode).                                                                                  |
| **Monitoring Stack**                  | Logs/metrics/traces (Loki/Prometheus/OpenTelemetry).                                                                                                                                              |

---

## 2. Data Model (Camel/PascalCase tables, quoted identifiers)

### Intent & Behavior
- **Purpose:** Durable, queryable records for ingestion, staged candidates, mappings, reviews, workflow state, and transformation audit—aligned to MikroORM naming.
- **Behavior:** Payloads become **RawData**; optional **CandidateResource** captures staged mapping; approved **Mapping** drives deterministic transforms; **TransformationResult** stores JSON Patch & Medplum IDs.
- **Key decisions:** Audit entities append-only; RawData immutable except status/locks; full FHIR stored only behind a flag.
- **Operator impact:** Index and partition high-volume tables; enforce retention policies.

> **MikroORM:** Entities use PascalCase; columns camelCase; Postgres identifiers quoted. API JSON uses camelCase keys.

### 2.1 Core Entities

**"RawData"**
```
id (uuid PK)
tenantId (uuid)
sourceId (uuid)
rawPayload (jsonb)
ingestedAt (timestamptz)
processingStatus (enum: pending|inProgress|succeeded|failed)
lastError (text)
lockOwner (text)
lockAcquiredAt (timestamptz)
lastSeenAt (timestamptz)
dedupeKey (text)
```

**"CandidateResource"**
```
id (uuid PK)
tenantId (uuid)
rawDataId (uuid FK -> "RawData".id)
candidateJson (jsonb)
status (enum: unmapped|mapped|reviewRequired|approved|errored)
updatedAt (timestamptz)
transformLog (jsonb nullable)      -- optional lineage blob
```

**"Mapping"** (approved rules)
```
id (uuid PK)
tenantId (uuid)
scope (enum: global|clientSpecific)
ruleName (text)
ruleDefinition (jsonb)              -- DSL or compiled spec
promptMetadata (jsonb)              -- modelId, promptVersion, etc.
version (int)
active (bool)
createdAt / updatedAt
```
_Constraints:_ Unique (`tenantId`, `ruleName`, `version`); at most one active per (`tenantId`, `ruleName`).

**"MappingSuggestion"**
```
id (uuid PK)
tenantId (uuid)
rawDataId (uuid FK)
suggestedResourceType (text)
suggestedMapping (jsonb)
modelId (text)
promptVersion (text)
createdAt (timestamptz)
```

**"HumanReviewEvent"**
```
id (uuid PK)
tenantId (uuid)
suggestionId (uuid FK)
reviewerId (uuid)
action (enum: accept|reject|edit)
notes (text)
createdAt (timestamptz)
```

**"ValidationRule"**
```
id (uuid PK)
tenantId (uuid)
ruleName (text)
phase (enum: preMap|postMapPreValidate|postValidatePrePublish)
ruleDefinition (jsonb)
version (int)
active (bool)
createdAt (timestamptz)
```
_Constraints:_ Unique (`tenantId`, `ruleName`, `version`); at most one active per (`tenantId`, `ruleName`).

**"TransformationResult"** (audit-focused by default)
```
id (uuid PK)
rawDataId (uuid FK)
tenantId (uuid)
appliedMappingIds (uuid[])
validationStatus (enum: valid|invalid)
validationErrors (jsonb)
jsonPatch (jsonb)                   -- RFC6902 diff rawPayload -> FHIR representation
medplumId (text)
postedToMedplumAt (timestamptz)
createdAt (timestamptz)
-- Version pinning for full reproducibility:
templateId (uuid)
templateVersion (int)
validationRuleVersionIds (uuid[])
modelId (text)
modelParams (jsonb)
-- OPTIONAL (config: AUDIT_STORE_FULL_FHIR=true)
fhirResourceType (text)
fhirResourceJson (jsonb)
```

**"WorkflowTemplate"**
```
id (uuid PK)
logicalName (text)                  -- stable key across versions
name (text unique)                  -- human-readable
version (int)
status (enum: draft|active|deprecated)
type (enum: ingestion|transformation|utility)
definitionJson (jsonb)              -- n8n export
metadataJson (jsonb)
graphChecksum (text)                -- hash of node graph for drift detection
createdAt / updatedAt
```
_Constraints:_ Unique (`logicalName`, `version`); at most one active per `logicalName`.

**"Workflow"**
```
id (uuid PK)
templateId (uuid FK)
templateVersion (int)               -- pin to a concrete template version
tenantId (uuid)
status (enum: active|paused|archived)
activationAt (timestamptz)
paramsJson (jsonb)
kind (enum: Ingestion|Agent|TransformationGeneral|TransformationClient|Utility)
tagsJson (jsonb)                    -- mirror enforced n8n tags
```

**"WorkflowRun"**
```
id (uuid PK)
workflowId (uuid FK)
templateId (uuid FK)
templateVersion (int)               -- used at run start
tenantId (uuid)
status (enum: running|succeeded|failed|canceled)
startedAt / finishedAt
inputContext (jsonb)
outputContext (jsonb)
errorMessage (text)
mappingVersionIds (uuid[])
validationRuleVersionIds (uuid[])
modelId (text)
modelParams (jsonb)
```

**"SourceDefinition"**
```
id (uuid PK)
tenantId (uuid)
logicalName (text)
type (text)                         -- ehr|s3|ftp|http|...
schemaHint (jsonb)
authRef (text)
linkedWorkflowTemplateId (uuid)
rateLimit (jsonb)
dedupeStrategy (jsonb)
version (int)
status (enum: draft|active|deprecated)
```

**"ExecutionEvent"**
```
id (uuid PK)
tenantId (uuid)
entityType (text)                   -- RawData|CandidateResource|WorkflowRun|...
entityId (uuid)
eventType (text)                    -- received|mapped|reviewRequired|approved|validated|posted|failed|deadLetter|...
at (timestamptz)
detailsJson (jsonb)
```

**Indexes & Constraints**
- `"RawData"(processingStatus, tenantId)` for queue scans.
- Unique: `"TransformationResult"(rawDataId)` (idempotency).
- Partition `"RawData"` by month/tenant for scale.

---

## 3. Workflow Archetypes, Tags & Reconciliation

### Intent & Behavior
- **Purpose:** Classify workflows (Ingestion, Agent, TransformationGeneral, TransformationClient, Utility) with authoritative `Workflow.kind`, mirrored to n8n tags for discoverability.
- **Behavior:** Facade sets tags on deploy and reconciles drift; UIs/APIs filter by `kind` or tags.
- **Key decisions:** `kind` is source of truth; production workflows mutable only via Facade.
- **Operator impact:** Reconciliation alerts on drift; tag schema changes don’t break clients.

**Authoritative field:** `Workflow.kind`  
**Enforced n8n tags:**
- `aw:kind=Ingestion|Agent|TransformationGeneral|TransformationClient|Utility`
- `aw:tenant=<uuid>` / `aw:env=dev|stg|prod`
- Optional: `aw:source=<ehr|s3|ftp>`, `aw:purpose=<enrichment|validation>`

---

## 4. Template Management (DB-backed)

### Intent & Behavior
- **Purpose:** Store and version WorkflowTemplate definitions without a Git runtime dependency.
- **Behavior:** Activate → deploy/upgrade the corresponding n8n Workflow; failure rolls back template state.
- **Key decisions:** One active version per `logicalName`; validate JSON schema; store `graphChecksum` on activation.
- **Operator impact:** Reconcile live workflows vs templates; canary activate per tenant.

**APIs**
```
GET  /api/workflow-templates?type=&logicalName=&status=
GET  /api/workflow-templates/{id}
POST /api/workflow-templates                    # create draft (version=1)
PUT  /api/workflow-templates/{id}               # create new version (draft)
PUT  /api/workflow-templates/{id}/activate
DELETE /api/workflow-templates/{id}             # mark deprecated
```

---

## 5. Ingestion Flow

### Intent & Behavior
- **Purpose:** Reliably capture heterogeneous inputs, persist them as RawData, and signal transformation via JetStream.
- **Behavior:** IngestionWorkflow inserts `RawData(pending)` and publishes `events.record.created`; consumers lock and process per tenant.
- **Key decisions:** Idempotency via `dedupeKey`; event-driven over DB polling; large payloads can be offloaded to object storage with pointers.
- **Operator impact:** Tune concurrency; monitor event lag & `pending` backlog; compensators for missed publishes.

Steps:
1. External source → **IngestionWorkflow** (webhook/file/SFTP/etc.) or Facade endpoint.  
2. Insert `"RawData"` row (`pending`) and emit `events.record.created`.  
3. Transformation (hybrid **Transformation Service** or **TransformationWorkflow (General)**) processes pending records.

---

## 6. Transformation Design

### Intent & Behavior
- **Purpose:** Convert RawData into valid FHIR resources with deterministic, traceable steps and optional tenant customization.
- **Behavior:** **Hybrid:** Service applies global rules & validation, may call ClientSpecific TransformationWorkflow, writes to Medplum, and persists audit. **n8n-only:** General TransformationWorkflow does all steps.
- **Key decisions:** Delegation is per tenant/integration; Medplum writes idempotent (POST→PUT); audit row required; full FHIR storage optional.
- **Operator impact:** Autoscale on queue depth; configure timeouts/payload caps; track validation failures & DLQs.

---

## 7. AI-Assisted Mapping (HITL)

### Intent & Behavior
- **Purpose:** Accelerate mapping authoring with AI suggestions while keeping production deterministic.
- **Behavior:** A **Classifier** and a **Draft-Mapper** (both AgentWorkflows) propose resource types and a field-level mapping in `mapping-dsl v1`. A human reviews/edits, then the Facade promotes an approved draft to a versioned **Mapping** used by production transforms.
- **Key decisions:** AI is used only in authoring (unless an AgentWorkflow is explicitly part of a tenant’s production path). All production writes are driven by **approved Mapping versions** and **ValidationRule**s.
- **Operator impact:** Per-tenant `AI_ALLOWED` switch; model versioning (`promptMetadata`); rate-limits; audit for suggestions and reviewer actions.

---

### 7.1 Pipeline Stages
1. **Resource Type Classifier (AgentWorkflow A)**  
   **Input:** redacted `RawData` sample, `SourceDefinition` hints, optional prior examples.  
   **Output:** candidates `{ resourceType, confidence, rationale }[]` into `MappingSuggestion`.
2. **Draft-Mapper (AgentWorkflow B)**  
   **Input:** raw sample + chosen `resourceType` + FHIR structure summary + examples.  
   **Output:** `MappingSuggestion.suggestedMapping` (YAML **mapping-dsl v1**), with `_meta.confidence` and per-field confidences.
3. **Validation**  
   Facade `POST /api/mapping/validate-draft`: runs local **ValidationRule**s and Medplum `$validate`. Failures are attached to the suggestion.
4. **HITL Review**  
   Reviewer edits the DSL and approves/rejects. On approval, Facade creates **Mapping v{n+1}** and (optionally) activates it.
5. **Production**  
   Production transformations use **approved Mapping** versions only.

---

### 7.2 Data Artifacts
- **MappingSuggestion**  
  - `suggestedResourceType: string`  
  - `suggestedMapping: mapping-dsl v1 (YAML, stored internally as JSON)`  
  - `modelId, promptVersion, createdAt`
- **HumanReviewEvent**: `accept | reject | edit` with notes
- **Mapping**: versioned, deterministic, executable

---

### 7.3 `mapping-dsl v1` (Authoring DSL)

**Design goals:** human-readable, machine-checkable, deterministic, FHIR-aware.

**Helpers (authoring contract)**
- `map(path: string)` → any
- `toNumber(x: any)` → number
- `parseDate(x: string, fmt: "iso" | "epoch" | "custom:<pattern>")` → ISO string
- `hash(x: any)` → string
- `concat(...args: any[])` → string
- `if(cond: boolean, a: any, b: any)` → any
- `lookup(table: string, key: string)` → string | number (from versioned tables)
- `default(value: any, expr: any)` → any (fallback without failing execution)

**Determinism rules**
- Expressions are pure (no network I/O at execution).
- Fail on unknown helpers or unresolved `map()` **unless** wrapped in `default(...)`.
- Validate the final FHIR JSON with Medplum `$validate` before publish.

**Example (Observation from CSV)**
```yaml
# mapping-dsl v1
resourceType: Observation
id: "${hash(map('rowId'))}"
status: "final"
subject.reference: "Patient/${map('patientId')}"
code.coding[0]:
  system: "http://loinc.org"
  code: "${map('loincCode')}"
valueQuantity:
  value: "${toNumber(map('value'))}"
  unit: "${map('unit')}"
  system: "http://unitsofmeasure.org"
  code: "${map('unitCode')}"
effectiveDateTime: "${parseDate(map('timestamp'), 'iso')}"
_meta:
  confidence: 0.82
  fields:
    valueQuantity.value: 0.91
    code.coding[0].code: 0.88
  notes: "Derived from columns value/unit; loincCode taken from source"
```

> See **Appendix A** for the JSON Schema and full rules.

---

### 7.4 Prompt Specs (Classifier, Draft-Mapper, Critic)

#### A) Classifier Prompt (AgentWorkflow A)
**System**
```
You are a FHIR R4 expert. Given raw healthcare data and source hints,
return 1–3 candidate FHIR resource types with confidence and a short rationale.
Choose only valid FHIR R4 types. Output STRICT JSON:
{"candidates":[{"resourceType":"<Type>","confidence":0.0-1.0,"rationale":"<short>"}]}
No prose outside JSON. If unsure, include "Observation" or "DocumentReference" with low confidence.
```
**User (variables in {{ }})**
```
SourceDefinition: {{json sourceDefinition}}
Sample RawData (redacted): {{json rawData}}
Known mapping examples (optional): {{json examples}}
Constraints: Prefer Patient-linked clinical data; avoid administrative-only resources.
```
**Good Output (example)**
```json
{"candidates":[
  {"resourceType":"Observation","confidence":0.86,"rationale":"vitals-like fields value/unit/timestamp"},
  {"resourceType":"Condition","confidence":0.34,"rationale":"diagnosis-like text present"}
]}
```

#### B) Draft-Mapper Prompt (AgentWorkflow B)
**System**
```
You generate a mapping-dsl v1 that converts raw data into a valid FHIR R4 {{resourceType}}.
Use ONLY fields that exist in the official StructureDefinition.
Output STRICT YAML of mapping-dsl v1. No prose.
Include _meta.confidence (0..1) and per-field confidences.
If a required field cannot be populated, set a safe literal and add a note in _meta.notes.
Do not invent code systems. If uncertain, leave code/system empty and add a note.
```
**User**
```
Target resourceType: {{resourceType}}
FHIR StructureDefinition summary: {{json structureSummary}}
Sample RawData (redacted): {{json rawData}}
Style examples (optional): {{yaml examples}}
Required fields policy: minimize empty required fields; prefer explicit literals over omissions.
```
**Good Output (excerpt)**
```yaml
resourceType: Observation
status: "final"
subject.reference: "Patient/${map('patientId')}"
effectiveDateTime: "${parseDate(map('ts'),'iso')}"
valueQuantity:
  value: "${toNumber(map('systolic'))}"
  unit: "mmHg"
  system: "http://unitsofmeasure.org"
  code: "mm[Hg]"
_meta:
  confidence: 0.81
  fields:
    valueQuantity.value: 0.88
    subject.reference: 0.73
  notes: "units inferred; code defaulted"
```

#### C) Critic/Validator Prompt (optional AgentWorkflow C)
**System**
```
You are a strict validator. Given mapping-dsl v1, StructureDefinition, and sample raw data:
1) Check that referenced FHIR paths exist for {{resourceType}}.
2) Evaluate helper usage and expression syntax.
3) Simulate execution with the sample; report missing inputs or type mismatches.
Return STRICT JSON: {"valid":true|false,"errors":[...],"warnings":[...]}
No prose.
```
**User**
```
resourceType: {{resourceType}}
mapping-dsl v1 (YAML): {{yaml suggestedMapping}}
StructureDefinition summary: {{json structureSummary}}
Sample RawData: {{json rawData}}
```
**Good Output (example)**
```json
{"valid":false,"errors":["valueQuantity.value: toNumber received 'abc'"],"warnings":["code.coding[0].code is empty"]}
```

---

### 7.5 Prompt Inputs (concrete examples)

**RawData (CSV row as JSON)**
```json
{
  "rowId": "r-123",
  "patientId": "p-789",
  "value": "120",
  "unit": "mmHg",
  "unitCode": "mm[Hg]",
  "timestamp": "2025-07-21T09:30:00Z",
  "loincCode": "8480-6"
}
```

**SourceDefinition**
```json
{
  "logicalName": "ehr_csv_vitals",
  "type": "s3",
  "schemaHint": {"format":"csv","columns":["patientId","timestamp","value","unit","loincCode"]},
  "dedupeStrategy": {"key":"rowId"},
  "version": 3,
  "status": "active"
}
```

**StructureDefinition Summary (trimmed)**
```json
{
  "resourceType": "Observation",
  "required": ["status","code","subject","effective[x]","value[x]"],
  "paths": ["status","code.coding[].system","code.coding[].code","subject.reference","effectiveDateTime","valueQuantity.value","valueQuantity.unit","valueQuantity.system","valueQuantity.code"]
}
```

---

### 7.6 HITL Review UI (authoring)

**Layout**
- **Left:** RawData viewer (original + redacted toggle).
- **Center:** Live FHIR preview rendered from the current DSL (executor-in-browser).
- **Right:** DSL editor with validation panel (Critic errors/warnings, ValidationRule failures, Medplum `$validate` result).

**Widgets**
- Field confidence heat-map overlay.
- Inline suggestions for missing required fields.
- Before/After diff; on approval, persisted as **TransformationResult** `jsonPatch`.

**Actions**
- **Accept** → `POST /api/mappings` (draft) → `PUT /api/mappings/{id}/activate` (optional auto-activate).
- **Edit** → update DSL, re-validate.
- **Reject** → `POST /api/human-review-events` with `action=reject`.

---

### 7.7 Evaluation & Safety

**Metrics**
- Classifier top-1 / top-3 accuracy.  
- Draft-Mapper `$validate` pass-rate.  
- Reviewer edit distance (token/field diff).  
- Production error rates by Mapping version.

**Gates & Policies**
- Never auto-activate AI-generated mappings without human approval.  
- Require `$validate` pass + zero **errors** in Critic output.  
- Redact PHI in prompts (configurable allow-list).  
- Rate-limit AI calls per tenant; support on-prem models where needed.  
- Store `promptMetadata` (`modelId`, `promptVersion`, `systemPromptHash`) with each suggestion.

**Rollbacks**
- If failures spike after activation, re-activate the previous Mapping version (see Section 16).

---

## 8. Backend Facade – APIs

### Intent & Behavior
- **Purpose:** Offer cohesive control plane & read APIs; publish control commands; stream status to UI.
- **Behavior:** Facade never runs business transforms synchronously; it orchestrates versions, deployments, controls, and observability.
- **Key decisions:** Tenant-scoped APIs; convenience endpoints per archetype; read-through to Medplum for FHIR fetches.
- **Operator impact:** SLOs on p95 latency & error rate; circuit breakers for downstreams; audit all mutations.

### 8.1 Workflows & Runs
```
POST  /api/workflows/deploy                        # {templateId, templateVersion, tenantId, kind, tags, params}
GET   /api/workflows?kind=&tag=&tenantId=
GET   /api/workflows/{id}/status
GET   /api/workflows/{id}/runs
GET   /api/workflow-runs/{runId}
POST  /api/workflow-runs/{runId}/cancel
POST  /api/workflows/{id}/pause
POST  /api/workflows/{id}/resume
```
**Convenience aliases**
```
GET  /api/ingestion-workflows                  == /api/workflows?kind=Ingestion
GET  /api/agent-workflows                      == /api/workflows?kind=Agent
GET  /api/transformation-workflows             == /api/workflows?kind=TransformationGeneral,TransformationClient
POST /api/ingestion-workflows/deploy
POST /api/agent-workflows/deploy
```

### 8.2 Locks / Runtime Control
```
GET    /api/locks?tenantId=&rawDataId=
DELETE /api/locks/{rawDataId}                  # admin-only; duplication risk documented
```

### 8.3 Mapping & HITL
```
GET   /api/mappings?tenantId=
POST  /api/mappings
PUT   /api/mappings/{id}/activate
GET   /api/mappings/{id}

POST  /api/mapping/suggest
POST  /api/mapping/validate-draft
POST  /api/mappings/preview-from-dsl           # { resourceType, mappingDslYaml, sampleRawData } -> { fhirPreviewJson, validation }
POST  /api/mappings/compile                    # { mappingDslYaml } -> { compiledSpecJson, warnings[] }

POST  /api/mapping-suggestions                 # optional persistence of suggestions
GET   /api/mapping-suggestions/{id}

POST  /api/human-review-events
```

### 8.4 RawData & Transformation
```
GET   /api/raw-data?status=pending|failed|inProgress
GET   /api/raw-data/{id}
POST  /api/raw-data/{id}/retry
```

### 8.5 Transformation Audit (Before/After)
```
GET   /api/transformations?rawDataId=
GET   /api/transformations/{id}                 # rawData ref, medplumId, jsonPatch, validation
GET   /api/transformations/{id}/diff            # JSON Patch only
GET   /api/transformations/{id}/fhir            # read-through to Medplum
```

### 8.6 Control (publish to JetStream)
```
POST  /api/controls/raw-data/{id}/reprocess
POST  /api/controls/workflows/{id}/pause
POST  /api/controls/workflows/{id}/resume
POST  /api/controls/workflow-templates/{id}/deploy
```

### 8.7 Events to UI (status fan-in)
```
GET   /api/events/stream                        # SSE: relays status.* (tenant-scoped)
```

### 8.8 Sources & Validation
```
GET   /api/sources
POST  /api/sources
GET   /api/validation-rules
POST  /api/validation-rules
POST  /api/validation/run                       # dry-run with payload sample
```

---

## 9. Security

### Intent & Behavior
- **Purpose:** Guarantee tenant isolation, PHI protection, and traceable changes.
- **Behavior:** OIDC JWT with `tenantId`; RBAC per route; RLS in Postgres; secrets in Vault/K8s; optional HMAC signatures on JetStream messages.
- **Key decisions:** Restrict raw payload visibility; always create FHIR Provenance; redact secrets in logs.
- **Operator impact:** Rotate secrets; audit tokens; watch cross-tenant access attempts.

---

## 10. Observability

### Intent & Behavior
- **Purpose:** End-to-end debuggability and measurable health.
- **Behavior:** Structured logs with `traceId`; Prometheus metrics; OpenTelemetry traces across Facade→n8n→Service; SSE status to UI.
- **Key decisions:** Standardize ExecutionEvent types; capture JSON Patch size distributions; define SLOs & alerts per stage.
- **Operator impact:** Dashboards for backlog age, stale locks, validation errors, Medplum errors, HITL throughput.

---

## 11. Failure & Recovery (Normative)

### Intent & Behavior
- **Purpose:** Ensure forward progress and safe retries under partial failures.
- **Behavior:** Advisory locks with heartbeat; stale-lock sweeper resets to `pending`; idempotency guard on `"TransformationResult"(rawDataId)`; circuit breakers around Medplum.
- **Key decisions:** DLQ or DB “deadLetter” events; retry backoff schedules; operator controls for pause/resume and reprocess.
- **Operator impact:** Clear runbooks per alert; bulk reprocess APIs; guardrails for forced lock release.

---

## 12. Deployment

### Intent & Behavior
- **Purpose:** Predictable rollout, scaling, and tenancy controls.
- **Behavior:** Services scale independently; n8n & Transformation Service HPA on queue depth/CPU; CronJobs reconcile tags and clean stale locks.
- **Key decisions:** `MODE=hybrid|n8n_only`; “immutable in prod”; per-tenant config for delegation & AI usage.
- **Operator impact:** Canary template activation; right-size resource limits; backups + restore drills.

**Config Flags**
```
MODE=hybrid|n8n_only
DELEGATION_ENABLED=true|false          # tenant/integration overrides supported
DELEGATION_TIMEOUT_MS=15000
AUDIT_STORE_FULL_FHIR=false
AI_ALLOWED=true|false
AI_MODEL_ID=<model>
AI_TIMEOUT_MS=10000
EVENTS_SSE_ENABLED=true
```

---

## 13. JetStream Subjects, Envelopes & Payloads

### Intent & Behavior
- **Purpose:** Standardize how events, status, and control commands flow through the system with tenant scoping and idempotency.
- **Behavior:** IngestionWorkflows publish `events.record.created`; Transformation Service/Workflows emit `status.*`; Facade publishes `control.*` and streams `status.*` to the UI via SSE.
- **Key decisions:** Three streams (events, status, control); common envelope; `tenantId` header required; optional tenant-prefixed subjects; durable consumers with defined backoff.
- **Operator impact:** Monitor stream lag & redeliveries; secure publish/subscribe permissions; DLQ or ExecutionEvent entries for exhausted retries.

### 13.1 Streams & Subjects

| Stream           | Purpose                     | Subjects (wildcards allowed)                                                                                        | Retention (default) | Storage | Replicas |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- | -------- |
| `STREAM_EVENTS`  | Business events (ingestion) | `events.record.created`                                                                                             | 7d                  | File    | 3        |
| `STREAM_STATUS`  | Runtime status for UIs/ops  | `status.workflow.*`, `status.transformation.*`                                                                      | 24–48h              | File    | 3        |
| `STREAM_CONTROL` | Operator commands           | `control.rawData.reprocess`, `control.workflow.pause`, `control.workflow.resume`, `control.workflowTemplate.deploy` | 24h                 | File    | 3        |

> **Tenant scoping**  
> - Required header: `tenantId` on every message.  
> - Optional subject prefix: enable `JS_TENANT_SUBJECT_PREFIX=true` to publish under `ten.{tenantId}.<subject>` (e.g., `ten.1111.events.record.created`). The façade can support both modes; SSE filters by `tenantId`.

### 13.2 Common Envelope

```json
{
  "schema": "aw.v1.EventName",
  "id": "c5f8a6b0-1a3e-4f32-98b9-7f7c8b3e3a20",
  "timestamp": "2025-07-29T10:15:23.456Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "2c874f50-9f5a-46e1-9b36-0d2a5bc2a4e0",
  "traceId": "f0a5e0a9e0e94f1c",
  "actor": { "type": "Workflow|Service|User", "id": "wf_9d2c... or svc_transformer" },
  "data": { /* subject-specific payload */ }
}
```

**Headers** (required unless noted):
- `x-tenant-id`, `x-trace-id`, `x-correlation-id`, `Nats-Msg-Id`, optional `x-schema`, optional `x-sig`.

### 13.3 EVENTS — `events.record.created`

```json
{
  "schema": "aw.v1.RecordCreated",
  "id": "72a38e1f-5c1f-4d0f-b0b3-2d13f5a45d1e",
  "timestamp": "2025-07-29T10:00:02.001Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "b1c1b2c3-d4e5-6789-aaaa-bbbbccccdddd",
  "traceId": "2e0a1c9bfe3f4d1e",
  "actor": { "type": "Workflow", "id": "wf_ingest_abc123" },
  "data": {
    "rawDataId": "c2c67f7d-aaaa-bbbb-cccc-000000000001",
    "sourceId": "9f1a3d4c-eeee-ffff-0000-111111111111",
    "ingestionWorkflowId": "wf_ingest_abc123",
    "dedupeKey": "ehr-msg-987654",
    "approxSizeBytes": 18240
  }
}
```

**Consumers:** `transformer-svc-events` (durable, pull); optional compensator.

### 13.4 STATUS — `status.workflow.{workflowId}`

```json
{
  "schema": "aw.v1.WorkflowStatusChanged",
  "id": "8f6a3d1c-1a1a-44f8-96c9-0f5e9c0a2f30",
  "timestamp": "2025-07-29T10:01:10.100Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "b1c1b2c3-d4e5-6789-aaaa-bbbbccccdddd",
  "traceId": "2e0a1c9bfe3f4d1e",
  "actor": { "type": "Workflow", "id": "wf_ingest_abc123" },
  "data": {
    "workflowId": "wf_ingest_abc123",
    "workflowRunId": "run_6f7c...",
    "status": "running|succeeded|failed|canceled",
    "startedAt": "2025-07-29T10:00:00.000Z",
    "finishedAt": "2025-07-29T10:01:10.000Z",
    "errorMessage": null,
    "stats": { "processed": 120, "failed": 3, "durationMs": 70000 }
  }
}
```

**Consumers:** `facade-status` (durable), `ui-bridge` (ephemeral).

### 13.5 STATUS — `status.transformation.{rawDataId}`

```json
{
  "schema": "aw.v1.TransformationStatusChanged",
  "id": "1a2b3c4d-5555-4444-3333-222211110000",
  "timestamp": "2025-07-29T10:02:05.555Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "b1c1b2c3-d4e5-6789-aaaa-bbbbccccdddd",
  "traceId": "2e0a1c9bfe3f4d1e",
  "actor": { "type": "Service", "id": "svc_transformer" },
  "data": {
    "rawDataId": "c2c67f7d-aaaa-bbbb-cccc-000000000001",
    "state": "pickedUp|mapped|reviewRequired|validated|posted|failed",
    "appliedMappingIds": ["2b3a..."],
    "validationStatus": "valid|invalid|null",
    "medplumId": "Patient/abc123",
    "errorMessage": null
  }
}
```

**Consumers:** Facade; optional alert processor.

### 13.6 CONTROL — `control.rawData.reprocess`

_Single record_
```json
{
  "schema": "aw.v1.ControlRawDataReprocess",
  "id": "dccf5b92-4d5b-4f5a-a4cf-66b79a7a0a2f",
  "timestamp": "2025-07-29T10:05:00.000Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "op-req-20250729-001",
  "traceId": "aabbccddeeff0011",
  "actor": { "type": "User", "id": "user_admin_01" },
  "data": {
    "rawDataId": "c2c67f7d-aaaa-bbbb-cccc-000000000001",
    "mode": "full|mapOnly|validateOnly",
    "pinMappingVersionIds": ["2b3a..."],
    "pinTemplateVersion": { "id": "tmpl_123", "version": 5 },
    "pinValidationRuleVersionIds": ["vr-..."],
    "reason": "Rule fix v12; re-validate"
  }
}
```

_Bulk selector_
```json
{
  "schema": "aw.v1.ControlRawDataReprocess",
  "id": "e71b3a62-1b6d-4f0a-9a6a-420dfb5c03e1",
  "timestamp": "2025-07-29T10:05:05.000Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "op-req-20250729-002",
  "traceId": "bbccddeeff001122",
  "actor": { "type": "User", "id": "user_admin_01" },
  "data": {
    "selector": {
      "since": "2025-07-28T00:00:00Z",
      "status": ["failed"],
      "sourceIds": ["9f1a3d4c-eeee-ffff-0000-111111111111"]
    },
    "mode": "full",
    "reason": "Bulk reprocess after credentials fix"
  }
}
```

**Consumers:** Transformation Service (hybrid) or General TransformationWorkflow (n8n-only).

### 13.7 CONTROL — `control.workflow.pause` / `control.workflow.resume`

```json
{
  "schema": "aw.v1.ControlWorkflowStateChange",
  "id": "6fcb4c2e-0d0a-4efa-82b7-2b4e7b8e0b80",
  "timestamp": "2025-07-29T10:06:00.000Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "op-req-20250729-003",
  "traceId": "8899aabbccddeeff",
  "actor": { "type": "User", "id": "user_ops_17" },
  "data": {
    "workflowId": "wf_ingest_abc123",
    "desiredState": "paused|active",
    "reason": "Throttle source X"
  }
}
```

**Consumers:** Facade control-handler (calls n8n REST).

### 13.8 CONTROL — `control.workflowTemplate.deploy`

```json
{
  "schema": "aw.v1.ControlWorkflowTemplateDeploy",
  "id": "0d2a5bc2-4e5f-6789-abcd-ef0123456789",
  "timestamp": "2025-07-29T10:07:30.000Z",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "correlationId": "deploy-req-20250729-004",
  "traceId": "1122334455667788",
  "actor": { "type": "Service", "id": "facade" },
  "data": {
    "workflowTemplateId": "tmpl_123",
    "version": 5,
    "targetTenantId": "11111111-1111-1111-1111-111111111111",
    "params": { "sourceBucket": "s3://..." },
    "kind": "Ingestion|Agent|TransformationGeneral|TransformationClient",
    "tags": ["aw:kind=Ingestion","aw:env=prod"]
  }
}
```

**Consumers:** Facade deployer (n8n REST) → writes `"Workflow"` with `templateVersion` and enforced tags.

### 13.9 Consumers, Durables, Backoff

| Consumer                 | Stream           | Subjects                | Mode | Ack Wait | Max Deliver | Backoff         |
| ------------------------ | ---------------- | ----------------------- | ---- | -------- | ----------- | --------------- |
| `transformer-svc-events` | `STREAM_EVENTS`  | `events.record.created` | Pull | 30s      | 10          | 1s, 5s, 30s, 2m |
| `facade-status`          | `STREAM_STATUS`  | `status.*`              | Pull | 10s      | 3           | 1s, 5s          |
| `controller-control`     | `STREAM_CONTROL` | `control.*`             | Pull | 30s      | 5           | 1s, 10s, 30s    |

**DLQ:** Mirror to `dlq.*` or write `"ExecutionEvent"` with `eventType="deadLetter"` when retries exhaust.

### 13.10 Idempotency & Ordering

- Use `Nats-Msg-Id` and DB uniqueness on `"TransformationResult"(rawDataId)`.  
- No cross-subject ordering guarantees; ignore stale states using a simple precedence model.

### 13.11 Security

- Internal subjects only; clients never publish.  
- Facade authenticates users, publishes **control** commands.  
- Optionally sign bodies with `x-sig`.  
- Enforce NATS permissions so only allowed actors publish/subscribe.

### 13.12 Quick Reference

| Subject                             | schema                                | `data` keys (high level)                                                                                                        |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `events.record.created`             | `aw.v1.RecordCreated`                 | `rawDataId, sourceId, ingestionWorkflowId, dedupeKey, approxSizeBytes`                                                          |
| `status.workflow.{workflowId}`      | `aw.v1.WorkflowStatusChanged`         | `workflowId, workflowRunId, status, startedAt, finishedAt, errorMessage, stats`                                                 |
| `status.transformation.{rawDataId}` | `aw.v1.TransformationStatusChanged`   | `rawDataId, state, appliedMappingIds, validationStatus, medplumId, errorMessage`                                                |
| `control.rawData.reprocess`         | `aw.v1.ControlRawDataReprocess`       | `rawDataId` **or** `selector`, `mode`, `pinMappingVersionIds?`, `pinTemplateVersion?`, `pinValidationRuleVersionIds?`, `reason` |
| `control.workflow.pause             | resume`                               | `aw.v1.ControlWorkflowStateChange`                                                                                              | `workflowId, desiredState, reason` |
| `control.workflowTemplate.deploy`   | `aw.v1.ControlWorkflowTemplateDeploy` | `workflowTemplateId, version, targetTenantId, params, kind, tags`                                                               |

---

## 14. Diagram (Mermaid)

### Intent & Behavior
- **Purpose:** One-screen mental model of runtime interactions.
- **Behavior:** Shows who writes/reads where, and which edges are synchronous (REST/SQL) versus async (JetStream).
- **Key decisions:** Keep Facade⇄JetStream arrows; label “audit-only” write-back to Postgres.

```mermaid
graph LR
    %% Ingestion
    ExternalSource -->|HTTP / File| n8nIngest[IngestionWorkflow (n8n)]
    n8nIngest -->|insert RawData| Postgres[(Postgres)]
    n8nIngest -->|events.record.created| NATS[(NATS JetStream)]

    %% Transformation (hybrid)
    NATS --> TransformerSvc[Transformation Service]
    TransformerSvc -->|lock + SELECT pending| Postgres
    TransformerSvc -- optional --> n8nClient[TransformationWorkflow (ClientSpecific)]
    TransformerSvc -->|$validate & POST| Medplum[Medplum FHIR]
    TransformerSvc -->|audit (jsonPatch + ids)| Postgres
    TransformerSvc -->|status.transformation.*| NATS

    %% Backend façade
    UserUI[UI / Dev Clients] --> Backend[Backend Facade API]
    Backend -->|REST| n8nCore[n8n REST]
    Backend -->|SQL| Postgres
    Backend -->|REST| Medplum
    Backend -->|control.* (publish)| NATS
    NATS -->|status.* (subscribe)| Backend

    %% Monitoring
    Prom[Prometheus / Grafana]
    Backend --metrics--> Prom
    TransformerSvc --metrics--> Prom
    n8nCore --metrics--> Prom
```

---

## 15. Summary

### Intent & Behavior
- **Purpose:** Remind readers of the invariants: deterministic core, audit-first, tenant-safe, event-driven; workflows as first-class with archetypes and tags.
- **Behavior:** The system continues to make progress under partial outages; operators can pause, resume, and reprocess safely; mapping evolves via HITL with provenance.

---

## 16. Versioning & Activation

### Intent & Behavior
- **Purpose:** Ensure every executable definition (templates, mappings, rules) is immutable once published, supports activation/rollback, and is pinned during execution for reproducibility.
- **Behavior:** Each publish creates a new version row; at most one active per logical family; executions record the specific versions used; reprocess requests can pin versions.

### 16.1 Principles
- **Immutable versions:** every published version is its own row (new UUID, incremented `version`).
- **One active per logical name:** at most one `active` per (`logicalName`, tenant scoped where relevant).
- **Version pinning:** every **WorkflowRun** and **TransformationResult** records the versions in effect.
- **Deterministic rollback:** activation switch + (re)deploy; no data migrations.
- **Human-friendly lineage:** stable `logicalName` + monotonic `version`.

### 16.2 Versioned Entities
- **WorkflowTemplate** — versioned (`draft|active|deprecated`), with `logicalName`, `graphChecksum`.
- **Mapping** — versioned; one active per (`tenantId`, `ruleName`).
- **ValidationRule** — versioned with `ruleName` and `phase`; one active per (`tenantId`, `ruleName`).
- **SourceDefinition** — _recommended_ to version for reproducible replays.
- **Workflow** — **not** versioned independently; it pins `templateVersion` to a specific WorkflowTemplate version.
- **AgentWorkflow** — same as Workflow (version via its template).

### 16.3 Schema Additions (recap)
- `"WorkflowTemplate"`: `logicalName`, `graphChecksum`; unique (`logicalName`,`version`).
- `"Workflow"`: `templateVersion`.
- `"WorkflowRun"`: `templateVersion`, `mappingVersionIds`, `validationRuleVersionIds`, `modelId`, `modelParams`.
- `"TransformationResult"`: `templateId`, `templateVersion`, `validationRuleVersionIds`, `modelId`, `modelParams`.
- `"ValidationRule"`: `ruleName`, `version`, `active`.
- `"SourceDefinition"`: `version`, `status`, plus optional `logicalName`.

### 16.4 APIs (lifecycle & pinning)

**WorkflowTemplate**
```
POST /api/workflow-templates                  # create draft (version=1)
PUT  /api/workflow-templates/{id}             # clone to new draft (version+=1)
PUT  /api/workflow-templates/{id}/activate    # set active; rollback-safe
GET  /api/workflow-templates?logicalName=&version=
GET  /api/workflow-templates?logicalName=&status=active
```

**Deploy Workflow pinned to a template version**
```
POST /api/workflows/deploy
{
  "templateId": "…",
  "templateVersion": 5,
  "tenantId": "…",
  "kind": "Ingestion|Agent|TransformationGeneral|TransformationClient",
  "tags": ["aw:kind=…", "aw:env=prod"],
  "params": {…}
}
```

**Mapping / ValidationRule**
```
POST /api/mappings
PUT  /api/mappings/{id}/activate
GET  /api/mappings?ruleName=&version=
POST /api/validation-rules
PUT  /api/validation-rules/{id}/activate
GET  /api/validation-rules?ruleName=&version=
```

**Reprocess with version pinning**
```
POST /api/controls/raw-data/{id}/reprocess
{
  "mode": "full|mapOnly|validateOnly",
  "pinMappingVersionIds": ["…"],
  "pinTemplateVersion": { "id":"…", "version": 5 },
  "pinValidationRuleVersionIds": ["…"],
  "reason": "…"
}
```

### 16.5 Runtime Rules
- **Resolution at start:** When a run starts, resolve **active** versions unless pins provided; store resolved versions in `WorkflowRun` and final `TransformationResult`.
- **Rollback:** Activate previous version; new runs use it; past runs remain pinned.
- **Canaries:** Deploy Workflows pinned to new template version for a subset (tenant/tag) before broad activation.
- **Drift detection:** Compare `graphChecksum` against live n8n definitions; alert on differences.

### 16.6 Examples

**Mapping rollout**
1. Create Mapping v12 (draft) → `validate-draft` with samples.
2. `activate` v12 (v11 becomes non-active).
3. New runs pick v12 automatically; rollback by activating v11.

**Template upgrade**
1. Create WorkflowTemplate v6 (draft) → `activate` v6.
2. Deploy new Workflows pinned to v6; old runs remain pinned to prior versions.
3. Reprocess problematic records with `pinTemplateVersion` if needed.

---

## Appendix A — `mapping-dsl v1` JSON Schema (authoring)

> Authoring schema for suggestions and reviews. The production executor consumes an equivalent compiled form.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://awell.health/schemas/mapping-dsl-v1.json",
  "title": "mapping-dsl v1",
  "type": "object",
  "required": ["resourceType"],
  "properties": {
    "resourceType": { "type": "string", "minLength": 1 },
    "_meta": {
      "type": "object",
      "properties": {
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "fields": { "type": "object", "additionalProperties": { "type": "number", "minimum": 0, "maximum": 1 } },
        "notes": { "type": "string" }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": {
    "oneOf": [
      { "type": "string" },
      {
        "type": "object",
        "additionalProperties": true
      }
    ]
  },
  "examples": [
    {
      "resourceType": "Observation",
      "status": "final",
      "subject": { "reference": "Patient/${map('patientId')}" },
      "code": { "coding": [ { "system": "http://loinc.org", "code": "${map('loincCode')}" } ] },
      "valueQuantity": {
        "value": "${toNumber(map('value'))}",
        "unit": "${map('unit')}",
        "system": "http://unitsofmeasure.org",
        "code": "${map('unitCode')}"
      },
      "effectiveDateTime": "${parseDate(map('timestamp'),'iso')}",
      "_meta": { "confidence": 0.82, "fields": { "valueQuantity.value": 0.91 } }
    }
  ]
}
```

**Helper signatures (authoring contract)**
- `map(path: string)` → any  
- `toNumber(x: any)` → number  
- `parseDate(x: string, fmt: "iso" | "epoch" | "custom:<pattern>")` → ISO string  
- `hash(x: any)` → string  
- `concat(...args: any[])` → string  
- `if(cond: boolean, a: any, b: any)` → any  
- `lookup(table: string, key: string)` → string | number  
- `default(value: any, expr: any)` → any

**Executor rules**
- Fail on unknown helpers or unresolved `map()` unless wrapped in `default(...)`.  
- Disallow network I/O.  
- Validate final FHIR JSON with Medplum `$validate` before publish.

---

## Narrative Overview (60 seconds)
As data arrives, an IngestionWorkflow persists it as RawData and emits an event. A transformer (service or workflow) locks the record, applies approved Mappings (and optional tenant-specific steps), validates the result with Medplum, writes the FHIR resource, and records a minimal audit (JSON Patch + IDs). The Backend Facade doesn’t transform data; it coordinates templates and workflows, publishes control commands, versions and activations, and streams live status to the UI. AI assists humans in authoring Mappings; production runs stay deterministic.