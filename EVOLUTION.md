# Healthcare Data Hub – Detailed Architecture (vNext)

## 0. Goals

- Ingest heterogeneous healthcare data and persist raw payloads.
- Transform raw payloads into valid FHIR resources and store them in **Medplum**.
- Allow low-code/no-code workflows via **n8n**; enable per-tenant customization.
- Provide a cohesive **Backend Facade** (single API) abstracting all moving parts.
- Preserve auditability: per-record before/after (JSON Patch) and run introspection.
- Maintain evented control/status via **JetStream** while exposing REST APIs to the UI.
- Support self-hosted and SaaS modes without mandatory paid services.

---

## 1. High-Level Component Map

| Component | Responsibility |
|----------|----------------|
| **Backend Facade** | Public REST API (templates, workflows, rules, records, audit, controls, events). Publishes control msgs and consumes status from JetStream. |
| **n8n Instance** | Executes ingestion, transformation (n8n-only or client-specific steps in hybrid), and utility workflows. |
| **Postgres** | Stores raw payloads (`collector_records`), templates, rules, workflow runs, audit results. |
| **NATS JetStream** | Events bus: `events.*` (ingestion), `status.*` (workflow/transformation status), `control.*` (commands from Facade). |
| **Medplum** | FHIR validation and storage. |
| **Transformation Service (optional)** | Universal mapping/validation + optional delegation to client-specific n8n workflows (hybrid mode). |
| **Monitoring Stack** | Logs/metrics/traces (Loki/Prometheus/OpenTelemetry). |

---

## 2. Data Model (Core Tables)

### 2.1 `workflow_templates`
```
id (uuid PK)
name (text unique)
version (int)
status (enum: draft|active|deprecated)
type (enum: ingestion|transformation|client_specific)
definition_json (jsonb)        -- n8n export
metadata_json (jsonb)          -- tags, description, author
created_at / updated_at
```

### 2.2 `collector_records`
```
id (uuid PK)
source_id (uuid)
tenant_id (uuid)
raw_payload (jsonb)
ingested_at (timestamptz)
processing_status (enum: pending|in_progress|succeeded|failed)
last_error (text)
lock_owner (text nullable)     -- actor/service
lock_acquired_at (timestamptz)
last_seen_at (timestamptz)     -- heartbeat for stale detection
```

### 2.3 `mapping_rules`
```
id (uuid PK)
tenant_id (uuid)
scope (enum: global|client_specific)
rule_name (text)
rule_definition (jsonb)        -- DSL or AI prompt-based spec
prompt_metadata (jsonb)        -- model id, prompt version (for HITL provenance)
version (int)
active (bool)
created_at / updated_at
```

### 2.4 `transformation_results`  (audit-focused by default)
```
id (uuid PK)
collector_record_id (uuid FK)
tenant_id (uuid)
applied_rule_ids (uuid[])
validation_status (enum: valid|invalid)
validation_errors (jsonb)
json_patch (jsonb)             -- RFC6902 diff raw_payload -> FHIR representation
medplum_id (text)              -- FHIR canonical id
posted_to_medplum_at (timestamptz)
created_at
-- OPTIONAL (config: AUDIT_STORE_FULL_FHIR=true)
fhir_resource_type (text)
fhir_resource_json (jsonb)
```

### 2.5 `workflow_runs`
```
id (uuid PK)
workflow_id (text|uuid from n8n)
template_id (uuid FK)
tenant_id (uuid)
status (enum: running|succeeded|failed|canceled)
started_at / finished_at
input_context (jsonb)
output_context (jsonb)
error_message (text)
```

**Indexes & Constraints**
- `collector_records(status, tenant_id)` for queue scans.
- Unique: `transformation_results(collector_record_id)` (idempotency).
- Partition `collector_records` by month/tenant for scale.

---

## 3. Template Management (DB-backed)

**Rationale & Implications**
- No runtime Git dependency; transactional versioning; simple rollback.
- Large binaries should live in object storage (store pointer in `metadata_json`).

**APIs**
```
GET  /api/templates?type=&tag=
GET  /api/templates/{id}
POST /api/templates                   # create draft (version=1)
PUT  /api/templates/{id}              # create new version (draft)
PUT  /api/templates/{id}/activate
DELETE /api/templates/{id}            # mark deprecated
```

On activation the Facade deploys/updates the workflow in n8n; rollback if deployment fails.

---

## 4. Ingestion Flow

1. External source → **n8n ingestion workflow** (webhook/file/SFTP/etc.) or Facade endpoint.
2. Workflow inserts row into `collector_records` (`pending`) and emits `events.record.created` to JetStream.
3. Transformation (service or n8n general workflow) processes pending records.

**Backpressure**: consumer concurrency limits; optional queue depth autoscaling.

---

## 5. Transformation Design

### 5.1 Hybrid Approach (Recommended)

**Intent:** Separate **universal** logic from **client-specific** customization.

**Flow:**
1. Transformation Service consumes `events.record.created`, locks record (advisory lock + columns), updates `in_progress`, sets heartbeat.
2. Applies **global** deterministic mapping (DSL) and guardrails.
3. **Optional delegation** to client-specific n8n workflow **only if**:
   - `delegation_enabled` (tenant/integration scope) **and**
   - an active client workflow is registered.
   - Guardrails: `delegation_timeout_ms`, `max_payload_kb`, retries.
4. Assemble FHIR JSON, run Medplum `$validate`.
5. POST to Medplum (capture `medplum_id`); retries use PUT for idempotency.
6. Persist **audit row** in `transformation_results` (IDs + `json_patch` + validation).
7. Set record to `succeeded` or `failed` (with `last_error`), release lock, emit `status.transformation.{recordId}`.

**Why delegate?** To allow per-tenant logic without redeploying the service; platform still enforces validation and posting.

### 5.2 n8n-Only Approach

**Flow:**
- A **General Transformation Workflow** polls `collector_records` for `pending`, simulates locking, applies general rules, optionally calls a **Client-Specific Workflow**, validates, posts to Medplum, writes the audit row, updates status.

**Trade-offs:**
- Simpler deployment, fully visual.
- Harder concurrency control and backpressure; complex workflows may become unwieldy.

### 5.3 Mode Selection

- `MODE=hybrid` (default) for scale and testability.
- `MODE=n8n_only` for minimal footprint or early PoCs.

---

## 6. AI-Assisted Mapping (HITL)

### 6.1 Pipeline
1. **Detection Agent** → candidate FHIR resource types + confidence.
2. **Draft-Mapping Agent** → proposed field-level mapping (JSON DSL).
3. **Human Review UI** → accept/edit/reject rows; preview with sample data.
4. **Activation** → store as `mapping_rules` new version; production runs use deterministic executor (no LLM).

### 6.2 APIs
```
POST /api/mapping/suggest
  body: { raw_payload: {...}, tenant_id }
  resp: { candidates: [{resourceType, confidence}], draft_mapping: [...] }

POST /api/mapping/validate-draft
  body: { resourceType, draft_mapping:[...], sample_payload:{...} }
  resp: { validation_status, validation_errors }

POST /api/mapping-rules            # create draft (with prompt_metadata)
PUT  /api/mapping-rules/{id}/activate
```

**Provenance**
- Store exact prompt, model ID, and parameters in `mapping_rules.prompt_metadata`.

**Guardrails**
- Whitelist post-processor; validator gate before activation; latency timeout with static fallback.

---

## 7. Backend Facade Service

### 7.1 Responsibilities
- REST APIs for templates, rules, records, runs, locks, audit.
- **JetStream bridge**: publish `control.*` commands; consume `status.*` topics.
- n8n orchestration (create/update/activate workflows).
- Medplum validation & read-through when needed.
- AuthN/AuthZ, audit logging.

### 7.2 REST API Surface

#### Templates
```
GET    /api/templates
GET    /api/templates/{id}
POST   /api/templates
PUT    /api/templates/{id}
PUT    /api/templates/{id}/activate
DELETE /api/templates/{id}
```

#### Workflows & Runs
```
POST   /api/workflows/deploy                 # {template_id, tenant_id, params}
GET    /api/workflows/{id}/status
GET    /api/workflows/{id}/runs
GET    /api/workflow-runs/{run_id}
POST   /api/workflow-runs/{run_id}/cancel
POST   /api/workflows/{id}/pause
POST   /api/workflows/{id}/resume
```

#### Locks / Runtime Control
```
GET    /api/locks?tenant_id=&record_id=
DELETE /api/locks/{record_id}                # admin only; risk of duplicates explained
```

#### Mapping Rules & AI (HITL)
```
GET    /api/mapping-rules?tenant_id=
POST   /api/mapping-rules
PUT    /api/mapping-rules/{id}/activate
GET    /api/mapping-rules/{id}

POST   /api/mapping/suggest
POST   /api/mapping/validate-draft
```

#### Records & Transformation
```
GET    /api/records?status=pending|failed|in_progress
GET    /api/records/{id}
POST   /api/records/{id}/retry
```

#### Transformation Audit (Before/After)
```
GET    /api/transformations?record_id=
GET    /api/transformations/{id}             # includes raw_payload ref, medplum_id, json_patch, validation
GET    /api/transformations/{id}/diff        # JSON Patch only
GET    /api/transformations/{id}/fhir        # proxy fetch from Medplum (read-through)
```

#### Control (publish to JetStream)
```
POST   /api/controls/records/{id}/reprocess
POST   /api/controls/workflows/{id}/pause
POST   /api/controls/workflows/{id}/resume
POST   /api/controls/templates/{id}/deploy
```

#### Events (Status fan-in to UI)
```
GET    /api/events/stream   # SSE: relays status.* to browser (tenant-scoped)
```

#### Metrics / Logs / Health
```
GET    /api/metrics/summary
GET    /api/logs?record_id=&run_id=
GET    /api/health
```

---

## 8. Security

- OIDC JWT with `tenant_id` claim; RBAC on endpoints.
- Postgres Row-Level Security per `tenant_id`.
- Secret management via Kubernetes Secrets/Vault; redaction in logs.
- Immutable audit sink for compliance (append-only object storage).

---

## 9. Monitoring & Observability

- Structured logs with `trace_id`, `record_id`, `run_id`.
- Metrics: success/failure counters, queue depth, lock age, validation errors.
- Tracing via OpenTelemetry; pass context through Facade → n8n → Service.
- Dashboards: transformation latency, backlog age, stale locks, Medplum error rates.

---

## 10. Failure & Recovery (Normative)

- **Advisory locks** + stale lock sweeper (Cron) revert stuck `in_progress` to `pending`.
- Unique constraint on `transformation_results.collector_record_id` ensures idempotency.
- Circuit breaker for Medplum (retry w/ exponential backoff).
- Graceful shutdown hooks release locks/heartbeat.

---

## 11. Deployment

- Kubernetes Deployments: Facade, Transformation Service, n8n, NATS JetStream.
- StatefulSet: Postgres (HA options as needed).
- HPA scales Transformation Service by queue depth; optionally scale n8n workers.
- CronJob: stale-lock cleaner; reconciliation job for template vs. n8n drift.

---

## 12. Operational Playbook

1. Add integration → deploy ingestion template.
2. Create mapping → validate draft with sample → activate.
3. Monitor dashboards; fix failures; retry via API.
4. Use audit endpoints for before/after and compliance exports.
5. Use control endpoints to pause/resume or reprocess as needed.

---

## 13. JetStream Subjects & Retention (Appendix)

**Events**
- `events.record.created`

**Status (emitted by n8n / Service)**
- `status.workflow.{workflowId}`
- `status.transformation.{recordId}`

**Control (published by Facade)**
- `control.record.reprocess`
- `control.workflow.pause`
- `control.workflow.resume`
- `control.template.deploy`

**Retention**
- `events.*` → 7d time-based.
- `status.*` → 24–48h.
- `control.*` → short retention with **durable** consumers (Facade uses `facade-status`).

---

## 14. Diagram (Mermaid)

```mermaid
graph LR
    %% Ingestion
    ExternalSource -->|HTTP / File| n8nIngest[n8n Ingestion Workflow]
    n8nIngest -->|insert raw| Postgres[(Postgres\ncollector_records)]
    n8nIngest -->|events.record.created| NATS[(NATS JetStream)]

    %% Transformation (hybrid)
    NATS --> TransformerSvc[Transformation Service]
    TransformerSvc -->|SELECT pending + lock| Postgres
    TransformerSvc -- optional --> n8nClient[n8n Client-Specific WF]
    TransformerSvc -->|$validate & POST| Medplum[Medplum FHIR]
    TransformerSvc -->|audit row (json_patch + ids)| Postgres
    TransformerSvc -->|status.transformation.*| NATS

    %% Backend façade
    UserUI[UI / Dev Clients] --> Backend[Facade API]
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

## 15. Modes & Config Flags

```
MODE = hybrid | n8n_only
DELEGATION_ENABLED = true|false                # per-tenant override supported
DELEGATION_TIMEOUT_MS = 15000
AUDIT_STORE_FULL_FHIR = false
AI_ALLOWED = true|false
AI_MODEL_ID = <model>
AI_TIMEOUT_MS = 10000
EVENTS_SSE_ENABLED = true
```

---

## 16. Summary

This version keeps the **Facade⇄JetStream** integration for control and live status, narrows transformation persistence to **audit-first**, defines **optional delegation** in hybrid mode, and adds a practical **AI-assisted mapping (HITL)** pipeline and APIs. It provides a coherent, versioned foundation suitable for implementation and AI-assisted code generation.