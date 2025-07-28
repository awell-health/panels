# Healthcare Data Hub – Detailed Architecture Document (Enriched)

## 0. Goals

- Ingest heterogeneous healthcare data and persist raw payloads.
- Transform raw payloads into valid FHIR resources and store them in **Medplum**.
- Allow low-code/no-code creation of data workflows (“agents”/“bots”) via **n8n**.
- Provide a cohesive backend façade (single API) abstracting all moving parts.
- Support multiple deployment modes (self-hosted, SaaS) without mandatory paid services.
- Offer **full observability and auditability**: inspect workflow state, locks, per-record before/after transformation.

---

## 1. High-Level Component Map

| Component | Responsibility |
|----------|----------------|
| Backend Facade Service | Public API (REST) for templates, workflows, data, mapping, monitoring, audit. Orchestrates n8n, Postgres, Medplum, NATS. |
| n8n Instance | Executes workflow templates (ingestion, transformation, client-specific logic). |
| Postgres | Stores raw collected payloads (`collector_records`), template/workflow metadata, mapping rules, audit logs, transformation results. |
| NATS JetStream | Event bus for ingestion events and transformation tasks. |
| Medplum | FHIR storage & validation. |
| Transformation Service (optional) | Universal mapping/validation (Hybrid mode). |
| Monitoring Stack | Logs/metrics/traces (Loki/Prometheus/OpenTelemetry). |

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
lock_owner (text nullable)     -- actor/service holding processing lock
lock_acquired_at (timestamptz)
```

### 2.3 `mapping_rules`
```
id (uuid PK)
tenant_id (uuid)
scope (enum: global|client_specific)
rule_name (text)
rule_definition (jsonb)        -- DSL or prompt spec
version (int)
active (bool)
created_at / updated_at
```

### 2.4 `transformation_results`
```
id (uuid PK)
collector_record_id (uuid FK)
tenant_id (uuid)
applied_rule_ids (uuid[])
intermediate_json (jsonb)      -- optional snapshot before final assembly
fhir_resource_type (text)
fhir_resource_json (jsonb)
validation_status (enum: valid|invalid)
validation_errors (jsonb)
json_patch (jsonb)             -- RFC6902 diff raw_payload -> fhir_resource_json
posted_to_medplum_at (timestamptz)
medplum_id (text)
created_at
```

### 2.5 `workflow_runs` (for execution introspection)
```
id (uuid PK)
workflow_id (text or uuid from n8n)
template_id (uuid FK)
tenant_id (uuid)
status (enum: running|succeeded|failed|canceled)
started_at / finished_at
input_context (jsonb)
output_context (jsonb)
error_message (text)
```

---

## 3. Template Management (Improved)

### 3.1 Rationale & Implications
- **Database-backed** templates remove Git operational overhead; easier backup/restore.
- Versioning inside Postgres enables strict transactional guarantees.
- Limitation: large binaries (e.g., attachments) should be externalized (object storage) to keep table lean.

### 3.2 Storage / Activation
- Only one active version per `name`.
- Activation triggers deployment to n8n; failure rolls back status.
- Deprecated templates remain for audit; cannot be reactivated (must clone to new version).

### 3.3 APIs
```
GET  /api/templates?type=&tag=
GET  /api/templates/{id}
POST /api/templates                   # create draft
PUT  /api/templates/{id}              # new version (draft)
PUT  /api/templates/{id}/activate
DELETE /api/templates/{id}            # mark deprecated
```

---

## 4. Ingestion Flow

1. External source → n8n ingestion workflow or backend endpoint.
2. Workflow inserts record into `collector_records` (`pending`) and emits `record.created` to NATS.
3. Transformation processor (service or workflow) picks up pending records.

**Considerations:**  
- Backpressure handled by limiting consumer concurrency.  
- Large payloads can be truncated or offloaded to object storage with pointer stored in `raw_payload`.

---

## 5. Transformation Design

### 5.1 Hybrid Approach (Recommended)

**Flow:**  
Service consumes `record.created` → locks row (`lock_owner`) → applies global mapping rules → optionally invokes client-specific n8n workflow → builds FHIR resource → validates via Medplum → computes JSON Patch → persists `transformation_results` → posts to Medplum → updates statuses and releases lock.

**Implications:**  
- Clear separation of deterministic vs. customizable logic.  
- Easier to unit test core mapping functions.  
- Additional deployment unit (service) increases operational overhead.

### 5.2 n8n-Only Approach

**Flow:**  
General transformation workflow polls for `pending` records → updates status to `in_progress` (simulated lock) → applies general logic (script nodes) → optionally calls client-specific workflow → validates → persists results → posts to Medplum.

**Implications:**  
- Simplest stack; all visual.  
- Concurrency control less robust (DB-level locking must be manually scripted).  
- Complex general workflow may become hard to maintain.

### 5.3 Selection Guidelines
| Criterion | Hybrid | n8n-Only |
|-----------|--------|---------|
| Performance / Scaling | High (service tuned) | Medium |
| Simplicity | Medium | High |
| Advanced Debug / Testing | High | Lower |
| Non-dev Customization | Medium | High |

---

## 6. Mapping Rules & AI Integration

### 6.1 Execution Order
1. Static DSL mapping (deterministic).
2. AI prompt fills gaps.
3. Post-processor enforces whitelist of allowed FHIR fields.
4. Validator (Medplum) ensures conformance.

### 6.2 Implications
- AI output variability requires deterministic sanitization; failing to validate is logged but never silently accepted.
- Storing `applied_rule_ids` and `json_patch` enables full forensic reconstruction.

---

## 7. Backend Facade Service

### 7.1 Responsibilities
Unified interface for: template/rule lifecycle, record introspection, workflow control, transformation audit, metrics, auth.

### 7.2 REST API Surface (Expanded)

#### Templates
```
GET    /api/templates
GET    /api/templates/{id}
POST   /api/templates
PUT    /api/templates/{id}
PUT    /api/templates/{id}/activate
DELETE /api/templates/{id}
```

#### Workflows (instantiated)
```
POST   /api/workflows/deploy                 # {template_id, tenant_id, params}
GET    /api/workflows/{id}/status
GET    /api/workflows/{id}/runs              # list recent runs
GET    /api/workflow-runs/{run_id}
POST   /api/workflow-runs/{run_id}/cancel
POST   /api/workflows/{id}/pause
POST   /api/workflows/{id}/resume
```

#### Locks / Runtime Control
```
GET    /api/locks?tenant_id=&record_id=      # view active locks
DELETE /api/locks/{record_id}                # force release (admin) – warns about duplication risk
```

#### Mapping Rules
```
GET    /api/mapping-rules?tenant_id=
POST   /api/mapping-rules
PUT    /api/mapping-rules/{id}/activate
GET    /api/mapping-rules/{id}
```

#### Records & Transformation
```
GET    /api/records?status=pending|failed
GET    /api/records/{id}                     # raw payload + status
POST   /api/records/{id}/retry               # reset status to pending (if failed)
```

#### Transformation Audit (Before/After)
```
GET    /api/transformations?record_id=
GET    /api/transformations/{id}             # includes raw_payload, fhir_resource_json, json_patch, applied_rule_ids
GET    /api/transformations/{id}/diff        # returns json_patch only
```
*`json_patch` uses RFC 6902 operations, enabling UI diff rendering.*

#### Metrics / Logs
```
GET    /api/metrics/summary
GET    /api/logs?record_id=&run_id=
```

#### Health
```
GET    /api/health
```

### 7.3 Considerations
- Forcing lock release (`DELETE /api/locks/{record_id}`) risks duplicate FHIR posts; recommended only after verifying no active processing.
- Workflow pause/resume maps to n8n’s internal activation flag; cancellation creates a compensating entry in `workflow_runs`.

---

## 8. Security

- **AuthN**: OIDC (Keycloak); JWT includes `tenant_id` claim.
- **AuthZ**: RBAC + ownership checks; `admin` can force lock release.
- **Audit**: Each mutating endpoint inserts audit row (old/new snapshot).
- **Data Minimization**: `raw_payload` access restricted to roles with PHI clearance; transformation endpoints can redact sensitive fields if configured.

---

## 9. Monitoring & Observability

- Locks age dashboard: highlight locks older than threshold.
- Transformation success rate per tenant.
- Average `pending` queue age.
- Diff size distribution (large diffs may indicate mapping instability).

---

## 10. Failure & Recovery

| Scenario | Handling |
|----------|---------|
| Stale Lock (service crashed) | Cron job scans `collector_records` where `lock_owner` stale > timeout → releases lock; raises alert. |
| Double Processing Post Lock-Force | `transformation_results` has unique constraint on `(collector_record_id)`; second attempt fails fast. |
| AI Model Failure | Fallback to static DSL only; mark partial result; record flagged for manual review. |
| Medplum outage | Exponential retry; if threshold exceeded mark failed; operator retries later. |

---

## 11. Deployment

### 11.1 Kubernetes Resources
- `Deployment`: backend, transformation service.
- `StatefulSet`: Postgres.
- `Deployment`: n8n, NATS JetStream.
- `CronJob`: stale-lock cleaner.
- `HPA`: scale transformation service on queue depth.

### 11.2 Modes
- **Hybrid**: enable transformation service; general workflow light.
- **n8n-Only**: disable service; general workflow handles everything; lock cleaner adjusts logic.

---

## 12. Operational Playbook

1. **Add Integration** → Deploy ingestion template.
2. **Define Mapping** → Create rule(s), activate.
3. **Observe** → Check metrics; resolve failures.
4. **Audit** → Use `/api/transformations/{id}` to show before/after for compliance.
5. **Scale** → Increase replicas when pending backlog > threshold.

---

## 13. Future Enhancements

- UI “Diff Viewer” consuming `json_patch`.
- Rule simulation endpoint (`POST /api/simulate-transformation`) without persisting.
- Pluggable AI model registry.

---

## 14. Summary

This enriched design delivers a cohesive façade with strong audit, flexible transformation strategies, explicit workflow/lock control, and full before/after traceability—forming a robust foundation for implementation and AI-assisted development.