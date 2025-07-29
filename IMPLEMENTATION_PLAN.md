# Healthcare Data Hub - Services Implementation Plan (Comprehensive vNext)

## Overview
This plan transforms the current basic services module into the comprehensive Healthcare Data Hub architecture described in EVOLUTION.md (Comprehensive vNext). Following an external-to-internal approach: start with API interfaces (with fake implementations), then build internals, finally connect real implementations.

**Key Changes from Previous Versions:**
- **Immutable Versioning System**: WorkflowTemplate, Mapping, ValidationRule all support versioning with activation/rollback
- **Version Pinning**: WorkflowRun and TransformationResult record exact versions used for reproducibility
- **LogicalName Concept**: Stable identifiers across versions (logicalName for templates, ruleName for mappings/validation)
- **Graph Drift Detection**: graphChecksum field for WorkflowTemplate to detect n8n drift
- **Enhanced Audit Fields**: templateId, templateVersion, validationRuleVersionIds, modelId, modelParams in TransformationResult
- **Comprehensive JetStream Schemas**: Detailed message formats with aw.v1.* schemas
- **Enhanced API Endpoints**: Version filtering, activation controls, reprocess with pinning
- **mapping-dsl v1**: Complete DSL specification for human-readable, deterministic FHIR mapping authoring
- **AI-Assisted Mapping Pipeline**: Classifier → Draft-Mapper → HITL Review → Production with detailed prompts
- **HITL Review Interface**: Live FHIR preview, DSL editor, validation panel, confidence heat-maps
- **Advanced Mapping APIs**: Preview, compilation, validation, critic evaluation endpoints
- **Safety & Evaluation**: Metrics, gates, rollback policies for AI-generated mappings

---

## Phase 1: External Interface Foundation
*Establish all new API endpoints with fake data/behavior first*

### Stage 1.1: New API Route Structure Setup
- [ ] **1.1.1** Create new module directories structure
  - [ ] Create `modules/workflowTemplate/` (workflow templates with versioning)
  - [ ] Create `modules/workflow/` (workflow instances & runs with version pinning)  
  - [ ] Create `modules/mapping/` (mappings and AI suggestions with versioning)
  - [ ] Create `modules/rawData/` (raw data records)
  - [ ] Create `modules/transformation/` (transformation results & audit with version tracking)
  - [ ] Create `modules/control/` (runtime controls & locks)
  - [ ] Create `modules/event/` (events & status streaming)
  - [ ] Create `modules/source/` (source definitions with versioning)
  - [ ] Create `modules/validation/` (validation rules with versioning)

- [ ] **1.1.2** Update main app.ts to register new modules
  - [ ] Add autoload for new modules
  - [ ] Configure module dependencies

### Stage 1.2: Workflow Template Management APIs (Fake Implementation)
- [ ] **1.2.1** Workflow Template CRUD endpoints with versioning (fake data)
  - [ ] `GET /api/workflow-templates` - list templates with logicalName/version/status filtering (mock data)
  - [ ] `GET /api/workflow-templates/{id}` - get specific template version (mock template)
  - [ ] `POST /api/workflow-templates` - create draft template v1 (fake validation)
  - [ ] `PUT /api/workflow-templates/{id}` - create new version (clone to draft)
  - [ ] `PUT /api/workflow-templates/{id}/activate` - activate template version (fake activation)
  - [ ] `DELETE /api/workflow-templates/{id}` - mark deprecated (fake deprecation)

- [ ] **1.2.2** Template validation schemas with versioning
  - [ ] Create Zod schemas for versioned template requests/responses
  - [ ] Add logicalName, graphChecksum, version fields
  - [ ] Add TypeScript types with versioning constraints
  - [ ] Mock template definition structure (n8n export format)

### Stage 1.3: Workflow Management APIs (Fake Implementation)  
- [ ] **1.3.1** Workflow control endpoints with version pinning (fake data)
  - [ ] `POST /api/workflows/deploy` - deploy with templateId/templateVersion pinning (fake deployment)
  - [ ] `GET /api/workflows` - list workflows with kind/tag/tenantId filtering (mock workflows)
  - [ ] `GET /api/workflows/{id}/status` - get workflow status (fake status)
  - [ ] `GET /api/workflows/{id}/runs` - list workflow runs (mock runs)
  - [ ] `GET /api/workflow-runs/{runId}` - get run details with version info (mock run)
  - [ ] `POST /api/workflow-runs/{runId}/cancel` - cancel run (fake cancellation)
  - [ ] `POST /api/workflows/{id}/pause` - pause workflow (fake pause)
  - [ ] `POST /api/workflows/{id}/resume` - resume workflow (fake resume)

- [ ] **1.3.2** Workflow archetype convenience aliases (fake implementation)
  - [ ] `GET /api/ingestion-workflows` - alias for workflows?kind=Ingestion
  - [ ] `GET /api/agent-workflows` - alias for workflows?kind=Agent
  - [ ] `GET /api/transformation-workflows` - alias for transformation workflows
  - [ ] `POST /api/ingestion-workflows/deploy` - deploy ingestion workflow
  - [ ] `POST /api/agent-workflows/deploy` - deploy agent workflow

### Stage 1.4: AI-Assisted Mapping (HITL) APIs (Fake Implementation)
- [ ] **1.4.1** AI Pipeline endpoints (Classifier → Draft-Mapper → Critic)
  - [ ] `POST /api/mapping/suggest` - Resource type classification + draft mapping generation (fake AgentWorkflow calls)
  - [ ] `POST /api/mapping/validate-draft` - Validate mapping-dsl v1 with critic + Medplum $validate (fake validation)
  - [ ] `POST /api/mapping/preview-from-dsl` - Live FHIR preview from mapping-dsl v1 + sample data (fake executor)
  - [ ] `POST /api/mapping/compile` - Compile mapping-dsl v1 to executable form (fake compilation)

- [ ] **1.4.2** mapping-dsl v1 Support endpoints with fake implementation
  - [ ] JSON Schema validation for mapping-dsl v1 authoring format
  - [ ] Helper function validation (map, toNumber, parseDate, etc.)
  - [ ] Expression syntax checking and determinism validation
  - [ ] FHIR path validation against StructureDefinition

- [ ] **1.4.3** Mapping suggestion persistence with versioning (fake data)
  - [ ] `POST /api/mapping-suggestions` - persist AI suggestions with modelId/promptVersion (fake creation)
  - [ ] `GET /api/mapping-suggestions/{id}` - get suggestion details with confidence scores (mock suggestion)
  - [ ] `GET /api/mapping-suggestions` - list suggestions with filtering (mock suggestions)

- [ ] **1.4.4** Approved mapping management endpoints with versioning (fake data)
  - [ ] `GET /api/mappings` - list approved mappings with ruleName/version filtering (mock rules)
  - [ ] `POST /api/mappings` - create mapping rule draft from approved suggestion (fake creation)
  - [ ] `PUT /api/mappings/{id}/activate` - activate mapping rule version (fake activation)
  - [ ] `GET /api/mappings/{id}` - get mapping rule details with DSL and metadata (mock rule)

- [ ] **1.4.5** Human review workflow endpoints with comprehensive HITL support (fake data)
  - [ ] `POST /api/human-review-events` - record human review decision with notes and edits (fake recording)
  - [ ] `GET /api/human-review-events` - list review events with filtering (mock events)
  - [ ] Review workflow state management (pending → reviewing → approved/rejected)

- [ ] **1.4.6** Safety and evaluation endpoints (fake implementation)
  - [ ] `GET /api/mapping/metrics` - AI pipeline metrics (accuracy, edit distance, error rates) (mock metrics)
  - [ ] `POST /api/mapping/evaluate` - Evaluate mapping performance against test data (fake evaluation)
  - [ ] Rate limiting and tenant controls for AI usage

### Stage 1.5: Raw Data & Transformation APIs (Fake Implementation)
- [ ] **1.5.1** Raw data management endpoints with fake data
  - [ ] `GET /api/raw-data` - list raw data with status filtering (mock records)
  - [ ] `GET /api/raw-data/{id}` - get raw data details (mock record + payload)
  - [ ] `POST /api/raw-data/{id}/retry` - retry failed record (fake retry)

- [ ] **1.5.2** Transformation audit endpoints with version tracking (fake data)  
  - [ ] `GET /api/transformations` - list transformations with version info (mock results)
  - [ ] `GET /api/transformations/{id}` - get transformation details with applied versions (mock before/after)
  - [ ] `GET /api/transformations/{id}/diff` - get JSON patch diff (mock patch)
  - [ ] `GET /api/transformations/{id}/fhir` - get FHIR resource via read-through (mock FHIR)

### Stage 1.6: Source & Validation APIs (Fake Implementation)
- [ ] **1.6.1** Source definition endpoints with versioning (fake data)
  - [ ] `GET /api/sources` - list source definitions with version filtering (mock sources)
  - [ ] `POST /api/sources` - create source definition (fake creation)
  - [ ] `GET /api/sources/{id}` - get source details (mock source)

- [ ] **1.6.2** Validation rule endpoints with versioning (fake data)
  - [ ] `GET /api/validation-rules` - list validation rules with ruleName/version filtering (mock rules)
  - [ ] `POST /api/validation-rules` - create validation rule draft (fake creation)
  - [ ] `PUT /api/validation-rules/{id}/activate` - activate validation rule version (fake activation)
  - [ ] `POST /api/validation/run` - dry-run validation with sample (fake validation)

### Stage 1.7: Control & Monitoring APIs (Fake Implementation)
- [ ] **1.7.1** Runtime control endpoints with version pinning (fake behavior)
  - [ ] `GET /api/locks` - list active locks (mock locks)
  - [ ] `DELETE /api/locks/{rawDataId}` - force release lock (fake release)
  - [ ] `POST /api/controls/raw-data/{id}/reprocess` - reprocess with version pinning (fake control)
  - [ ] `POST /api/controls/workflows/{id}/pause` - control workflow pause (fake)
  - [ ] `POST /api/controls/workflows/{id}/resume` - control workflow resume (fake)
  - [ ] `POST /api/controls/workflow-templates/{id}/deploy` - control template deploy (fake)

- [ ] **1.7.2** Events & monitoring endpoints with fake data
  - [ ] `GET /api/events/stream` - SSE events stream (fake events)
  - [ ] `GET /api/metrics/summary` - get metrics summary (mock metrics)
  - [ ] `GET /api/logs` - get logs with filtering (mock logs)
  - [ ] `GET /api/health` - enhanced health check (mock health)

### Stage 1.8: Request/Response Schemas & Types
- [ ] **1.8.1** Create comprehensive Zod schemas with versioning (CamelCase aligned)
  - [ ] WorkflowTemplate schemas (logicalName, version, graphChecksum, definitionJson, metadataJson)
  - [ ] RawData schemas (rawPayload, processingStatus, lock fields)
  - [ ] Mapping schemas (ruleName, version, ruleDefinition, promptMetadata)
  - [ ] ValidationRule schemas (ruleName, version, phase, ruleDefinition)
  - [ ] Transformation schemas (templateId, templateVersion, appliedMappingIds, validationRuleVersionIds, jsonPatch)
  - [ ] Control schemas (version pinning, lock info, commands)
  - [ ] Event schemas (JetStream envelope with aw.v1.* schemas, subject payloads)

- [ ] **1.8.2** mapping-dsl v1 Zod schemas and validation
  - [ ] Complete JSON Schema implementation for mapping-dsl v1
  - [ ] Helper function signatures (map, toNumber, parseDate, hash, concat, if, lookup, default)
  - [ ] Expression validation and determinism checking
  - [ ] FHIR path validation schemas
  - [ ] Confidence score and metadata schemas
  - [ ] Compilation and execution result schemas

- [ ] **1.8.3** AI-Assisted Mapping Zod schemas
  - [ ] Classifier prompt and response schemas (candidates with confidence/rationale)
  - [ ] Draft-Mapper prompt and response schemas (mapping-dsl v1 output)
  - [ ] Critic prompt and response schemas (validation results)
  - [ ] HITL review schemas (accept/reject/edit actions with notes)
  - [ ] Mapping suggestion schemas (suggestedResourceType, suggestedMapping, modelId, promptVersion)
  - [ ] Human review event schemas (action, notes, createdAt)
  - [ ] Preview and compilation request/response schemas

- [ ] **1.8.4** TypeScript type definitions with versioning and AI support
  - [ ] Export types from @panels/types
  - [ ] Ensure camelCase consistency across all endpoints
  - [ ] Add versioning constraint types
  - [ ] Add mapping-dsl v1 and AI pipeline types
  - [ ] Add proper error response types with validation details

---

## Phase 2: Data Model Foundation  
*Create new entities with camelCase/PascalCase naming and versioning support*

### Stage 2.1: New Core Entities (MikroORM PascalCase with Versioning)
- [ ] **2.1.1** Create RawData entity (enhanced)
  - [ ] Fields: id, tenantId, sourceId, rawPayload, ingestedAt, processingStatus, lastError
  - [ ] Lock fields: lockOwner, lockAcquiredAt, lastSeenAt
  - [ ] Deduplication: dedupeKey
  - [ ] Indexes for queue scanning: (processingStatus, tenantId)
  - [ ] Partitioning hints by month/tenant

- [ ] **2.1.2** Create CandidateResource entity  
  - [ ] Fields: id, tenantId, rawDataId, candidateJson, status, updatedAt, transformLog
  - [ ] Status: unmapped|mapped|reviewRequired|approved|errored
  - [ ] Foreign key to RawData

- [ ] **2.1.3** Create Mapping entity (versioned approved rules)
  - [ ] Fields: id, tenantId, scope, ruleName, ruleDefinition, promptMetadata, version, active, createdAt, updatedAt
  - [ ] Scope: global|clientSpecific
  - [ ] Unique constraints: (tenantId, ruleName, version), at most one active per (tenantId, ruleName)

- [ ] **2.1.4** Create MappingSuggestion entity (enhanced for mapping-dsl v1)
  - [ ] Fields: id, tenantId, rawDataId, suggestedResourceType, suggestedMapping (mapping-dsl v1 YAML as JSON), modelId, promptVersion, createdAt
  - [ ] Confidence and metadata fields: confidence scores, field-level confidences, rationale
  - [ ] Links to RawData for AI suggestions
  - [ ] Validation results and critic feedback storage

- [ ] **2.1.5** Create HumanReviewEvent entity
  - [ ] Fields: id, tenantId, suggestionId, reviewerId, action, notes, createdAt
  - [ ] Action: accept|reject|edit
  - [ ] Links to MappingSuggestion

- [ ] **2.1.6** Create ValidationRule entity (versioned)
  - [ ] Fields: id, tenantId, ruleName, phase, ruleDefinition, version, active, createdAt
  - [ ] Phase: preMap|postMapPreValidate|postValidatePrePublish
  - [ ] Unique constraints: (tenantId, ruleName, version), at most one active per (tenantId, ruleName)

- [ ] **2.1.7** Create TransformationResult entity (audit-focused with version tracking)
  - [ ] Core fields: id, rawDataId, tenantId, appliedMappingIds, validationStatus, validationErrors, jsonPatch, medplumId, postedToMedplumAt, createdAt
  - [ ] Version pinning: templateId, templateVersion, validationRuleVersionIds, modelId, modelParams
  - [ ] Optional (AUDIT_STORE_FULL_FHIR=true): fhirResourceType, fhirResourceJson
  - [ ] Unique constraint on rawDataId (idempotency)

- [ ] **2.1.8** Create WorkflowTemplate entity (versioned)
  - [ ] Fields: id, logicalName, name, version, status, type, definitionJson, metadataJson, graphChecksum, createdAt, updatedAt
  - [ ] Status: draft|active|deprecated
  - [ ] Type: ingestion|transformation|utility
  - [ ] Unique constraints: (logicalName, version), at most one active per logicalName

- [ ] **2.1.9** Create Workflow entity (with template version pinning)
  - [ ] Fields: id, templateId, templateVersion, tenantId, status, activationAt, paramsJson, kind, tagsJson
  - [ ] Kind: Ingestion|Agent|TransformationGeneral|TransformationClient|Utility
  - [ ] TagsJson mirrors enforced n8n tags

- [ ] **2.1.10** Create WorkflowRun entity (with version tracking)
  - [ ] Fields: id, workflowId, templateId, templateVersion, tenantId, status, startedAt, finishedAt
  - [ ] Context fields: inputContext, outputContext, errorMessage
  - [ ] Version tracking: mappingVersionIds, validationRuleVersionIds, modelId, modelParams
  - [ ] Status: running|succeeded|failed|canceled

- [ ] **2.1.11** Create SourceDefinition entity (versioned)
  - [ ] Fields: id, tenantId, logicalName, type, schemaHint, authRef, linkedWorkflowTemplateId, rateLimit, dedupeStrategy, version, status
  - [ ] Type: ehr|s3|ftp|http
  - [ ] Status: draft|active|deprecated

- [ ] **2.1.12** Create ExecutionEvent entity  
  - [ ] Fields: id, tenantId, entityType, entityId, eventType, at, detailsJson
  - [ ] EntityType: RawData|CandidateResource|WorkflowRun|...
  - [ ] EventType: received|mapped|reviewRequired|approved|validated|posted|failed|deadLetter|...

### Stage 2.2: Database Migrations
- [ ] **2.2.1** Create migrations for new versioned entities
  - [ ] RawData migration with quoted identifiers and lock fields
  - [ ] CandidateResource migration
  - [ ] Mapping migration with versioning constraints
  - [ ] MappingSuggestion migration
  - [ ] HumanReviewEvent migration
  - [ ] ValidationRule migration with versioning constraints
  - [ ] TransformationResult migration with version tracking fields
  - [ ] WorkflowTemplate migration with logicalName and graphChecksum
  - [ ] Workflow migration with templateVersion
  - [ ] WorkflowRun migration with version tracking
  - [ ] SourceDefinition migration with versioning
  - [ ] ExecutionEvent migration

- [ ] **2.2.2** Update existing entities if needed
  - [ ] Remove old snake_case entities
  - [ ] Add new indexes for performance (versioning queries)
  - [ ] Update relationships with new naming

### Stage 2.3: ORM Configuration Updates
- [ ] **2.3.1** Update orm.config.ts for camelCase with versioning
  - [ ] Register all new entities
  - [ ] Configure quoted identifiers for Postgres
  - [ ] Set up entity relationships with version constraints
  - [ ] Add partitioning configuration

---

## Phase 3: Core Infrastructure
*Add supporting infrastructure (fake JetStream with aw.v1 schemas, configs, etc.)*

### Stage 3.1: Configuration Management
- [ ] **3.1.1** Add new environment variables
  - [ ] MODE (hybrid | n8n_only)
  - [ ] JetStream configuration (STREAM_EVENTS, STREAM_STATUS, STREAM_CONTROL)
  - [ ] AI model configuration (AI_MODEL_ID, AI_TIMEOUT_MS)
  - [ ] Delegation settings (DELEGATION_ENABLED, DELEGATION_TIMEOUT_MS)
  - [ ] Audit configuration (AUDIT_STORE_FULL_FHIR)
  - [ ] Event streaming (EVENTS_SSE_ENABLED)
  - [ ] Versioning settings (JS_TENANT_SUBJECT_PREFIX)

- [ ] **3.1.2** Configuration validation
  - [ ] Update env.ts with new variables
  - [ ] Add validation schemas
  - [ ] Default values and documentation

### Stage 3.2: Mock JetStream Integration with aw.v1 Schemas
- [ ] **3.2.1** Create fake JetStream client with proper subject taxonomy
  - [ ] Mock publisher for control.* subjects (rawData.reprocess, workflow.pause/resume, workflowTemplate.deploy)
  - [ ] Mock subscriber for status.* subjects (workflow.{workflowId}, transformation.{rawDataId})
  - [ ] Mock publisher for events.* subjects (record.created)
  - [ ] In-memory event handling with aw.v1.* envelope structure

- [ ] **3.2.2** Event system foundation with comprehensive schemas
  - [ ] Common envelope structure (schema, id, timestamp, tenantId, correlationId, traceId, actor, data)
  - [ ] aw.v1.RecordCreated schema for events.record.created
  - [ ] aw.v1.WorkflowStatusChanged schema for status.workflow.*
  - [ ] aw.v1.TransformationStatusChanged schema for status.transformation.*
  - [ ] aw.v1.ControlRawDataReprocess schema for control.rawData.reprocess
  - [ ] aw.v1.ControlWorkflowStateChange schema for control.workflow.pause/resume
  - [ ] aw.v1.ControlWorkflowTemplateDeploy schema for control.workflowTemplate.deploy
  - [ ] Event publishing interfaces with header management
  - [ ] Event consumption patterns with durable consumers (transformer-svc-events, facade-status, controller-control)
  - [ ] SSE streaming setup with tenant filtering

### Stage 3.3: Mock External Service Clients
- [ ] **3.3.1** Mock n8n client with workflow archetypes and tag enforcement
  - [ ] Template deployment simulation with tag enforcement (aw:kind, aw:tenant, aw:env)
  - [ ] Workflow status simulation
  - [ ] Run management simulation
  - [ ] Tag reconciliation simulation (graphChecksum comparison)

- [ ] **3.3.2** Mock Medplum client  
  - [ ] FHIR validation simulation ($validate operation)
  - [ ] Resource posting simulation with idempotency (POST → PUT)
  - [ ] Read-through simulation for audit endpoints
  - [ ] Provenance and AuditEvent creation simulation

- [ ] **3.3.3** Mock AI service client (AgentWorkflows with detailed prompts)
  - [ ] **Classifier AgentWorkflow A simulation**
    - [ ] Resource type classification with confidence and rationale
    - [ ] System prompt: FHIR R4 expert with strict JSON output
    - [ ] Input: SourceDefinition, redacted RawData, optional examples
    - [ ] Output: candidates array with resourceType, confidence, rationale
  - [ ] **Draft-Mapper AgentWorkflow B simulation**
    - [ ] mapping-dsl v1 generation for chosen resource type
    - [ ] System prompt: mapping-dsl v1 generator with YAML output
    - [ ] Input: resourceType, StructureDefinition summary, redacted RawData, examples
    - [ ] Output: complete mapping-dsl v1 YAML with _meta confidence/notes
  - [ ] **Critic AgentWorkflow C simulation (optional)**
    - [ ] Validation of mapping-dsl v1 against StructureDefinition and sample data
    - [ ] System prompt: strict validator with JSON output
    - [ ] Input: mapping-dsl v1 YAML, StructureDefinition, sample RawData
    - [ ] Output: validation results with errors/warnings
  - [ ] **mapping-dsl v1 executor simulation**
    - [ ] Helper function execution (map, toNumber, parseDate, etc.)
    - [ ] Expression evaluation with determinism rules
    - [ ] FHIR resource assembly and Medplum $validate simulation
  - [ ] Prompt metadata tracking (modelId, promptVersion, systemPromptHash)
  - [ ] Rate limiting and per-tenant AI_ALLOWED controls

---

## Phase 4: Business Logic Implementation
*Connect real implementations step by step*

### Stage 4.1: Workflow Template Management (Real Implementation)
- [ ] **4.1.1** Real versioned template storage and retrieval
  - [ ] Replace fake data with WorkflowTemplate entity operations
  - [ ] Implement immutable versioning logic (draft → active → deprecated)
  - [ ] LogicalName resolution and version constraints
  - [ ] GraphChecksum generation and validation

- [ ] **4.1.2** Template activation workflow with versioning
  - [ ] Real n8n deployment integration with version pinning
  - [ ] Tag enforcement and reconciliation
  - [ ] Rollback on deployment failure (activate previous version)
  - [ ] Status management with JetStream events

### Stage 4.2: Raw Data Processing Foundation
- [ ] **4.2.1** Real raw data ingestion
  - [ ] RawData entity persistence with deduplication (dedupeKey)
  - [ ] Processing status management
  - [ ] Advisory lock acquisition/release with heartbeat (lockOwner, lockAcquiredAt, lastSeenAt)

- [ ] **4.2.2** Processing queue management
  - [ ] Queue depth monitoring
  - [ ] Backpressure handling
  - [ ] Stale lock detection and cleanup

### Stage 4.3: Mapping Rules Engine with Versioning
- [ ] **4.3.1** Versioned rule execution engine
  - [ ] DSL processor implementation
  - [ ] Rule versioning and activation (one active per ruleName)
  - [ ] Tenant isolation and scope enforcement
  - [ ] Version resolution at execution time

- [ ] **4.3.2** AI integration (AgentWorkflows with comprehensive pipeline)
  - [ ] **Real AI model integration for 5-stage pipeline**
    - [ ] Stage 1: Classifier AgentWorkflow - resource type classification
    - [ ] Stage 2: Draft-Mapper AgentWorkflow - mapping-dsl v1 generation
    - [ ] Stage 3: Validation - ValidationRule + Medplum $validate
    - [ ] Stage 4: HITL Review - human approval/editing interface
    - [ ] Stage 5: Production - approved Mapping execution
  - [ ] **mapping-dsl v1 real executor implementation**
    - [ ] Helper function implementations (map, toNumber, parseDate, hash, concat, if, lookup, default)
    - [ ] Expression parser and evaluator with safety checks
    - [ ] Determinism enforcement (no network I/O, pure functions)
    - [ ] FHIR resource assembly and validation
  - [ ] **Prompt management and safety**
    - [ ] Prompt versioning and metadata tracking (modelId, promptVersion, systemPromptHash)
    - [ ] PHI redaction in prompts with configurable allow-lists
    - [ ] Rate limiting per tenant and model usage tracking
    - [ ] On-premises model support for sensitive environments
  - [ ] **Evaluation and rollback mechanisms**
    - [ ] Classifier accuracy metrics (top-1/top-3)
    - [ ] Draft-Mapper $validate pass-rate tracking
    - [ ] Reviewer edit distance measurement
    - [ ] Automatic rollback on error rate spikes
  - [ ] **Safety gates and policies**
    - [ ] Never auto-activate without human approval
    - [ ] Require $validate pass + zero critic errors
    - [ ] Per-tenant AI_ALLOWED switch
    - [ ] Fallback to static rules on AI failure

### Stage 4.4: Transformation Pipeline with Audit
- [ ] **4.4.1** Core transformation logic (hybrid mode)
  - [ ] Raw payload processing
  - [ ] Mapping application with version tracking
  - [ ] FHIR resource assembly
  - [ ] Validation integration with Medplum

- [ ] **4.4.2** Audit and traceability with version pinning
  - [ ] JSON patch generation (RFC 6902)
  - [ ] TransformationResult persistence with full version tracking
  - [ ] Applied mapping IDs and validation rule version IDs tracking
  - [ ] ExecutionEvent logging

### Stage 4.5: Control System Implementation
- [ ] **4.5.1** Real lock management
  - [ ] Advisory locks implementation
  - [ ] Heartbeat system with lastSeenAt
  - [ ] Force release safeguards

- [ ] **4.5.2** Workflow control integration
  - [ ] Real n8n pause/resume via API
  - [ ] Run cancellation
  - [ ] Status propagation via JetStream with proper schemas

---

## Phase 5: Event System & Real-time Features
*Implement real JetStream with aw.v1 schemas and streaming*

### Stage 5.1: JetStream Integration
- [ ] **5.1.1** Real JetStream setup with streams
  - [ ] STREAM_EVENTS configuration (7d retention, File storage, 3 replicas)
  - [ ] STREAM_STATUS configuration (24-48h retention, File storage, 3 replicas)
  - [ ] STREAM_CONTROL configuration (24h retention, File storage, 3 replicas)
  - [ ] Connection management and error handling

- [ ] **5.1.2** Event publishing with aw.v1 envelope schemas
  - [ ] Control message publishing (control.*) with proper schemas
  - [ ] Status event publishing (status.*) with proper schemas  
  - [ ] Business event publishing (events.*) with proper schemas
  - [ ] Header management (x-tenant-id, x-trace-id, x-correlation-id, Nats-Msg-Id, x-schema, x-sig)
  - [ ] Message deduplication with Nats-Msg-Id

- [ ] **5.1.3** Event consumption with durable consumers
  - [ ] transformer-svc-events consumer (events.record.created, Pull mode, 30s ack wait, backoff 1s,5s,30s,2m)
  - [ ] facade-status consumer (status.*, Pull mode, 10s ack wait, backoff 1s,5s)
  - [ ] controller-control consumer (control.*, Pull mode, 30s ack wait, backoff 1s,10s,30s)
  - [ ] Message acknowledgment and retry logic
  - [ ] DLQ handling (mirror to dlq.* or ExecutionEvent with deadLetter eventType)

### Stage 5.2: Real-time Streaming
- [ ] **5.2.1** SSE implementation
  - [ ] Real event streaming to UI clients
  - [ ] Tenant-scoped filtering (tenantId header filtering)
  - [ ] Connection management and heartbeat

- [ ] **5.2.2** Status propagation
  - [ ] Real-time status updates for workflows and transformations
  - [ ] Progress tracking with ExecutionEvent
  - [ ] Error propagation and alerting

---

## Phase 6: External Service Integration
*Connect to real external services*

### Stage 6.1: n8n Integration with Tag Enforcement
- [ ] **6.1.1** Real n8n client implementation
  - [ ] Workflow template deployment to n8n with version info
  - [ ] Tag enforcement (aw:kind, aw:tenant, aw:env) during deployment
  - [ ] Workflow management API calls
  - [ ] Run monitoring and control

- [ ] **6.1.2** Tag reconciliation system
  - [ ] Periodic comparison of Workflow.tagsJson vs n8n tags
  - [ ] GraphChecksum comparison with live n8n definitions
  - [ ] Auto-correction or alerting on drift
  - [ ] Immutable production policy enforcement

### Stage 6.2: Medplum Integration  
- [ ] **6.2.1** Real Medplum client
  - [ ] FHIR resource validation via $validate
  - [ ] Resource posting with retries and circuit breaker (POST → PUT idempotency)
  - [ ] Read-through for audit endpoints
  - [ ] Provenance and AuditEvent creation

- [ ] **6.2.2** FHIR compliance
  - [ ] Resource type validation
  - [ ] Schema compliance checking
  - [ ] Error message handling and categorization

### Stage 6.3: AI Service Integration (AgentWorkflows with detailed prompts)
- [ ] **6.3.1** Real AI model integration with comprehensive prompts
  - [ ] **Classifier AgentWorkflow A (Resource Type Classification)**
    - [ ] Implement system prompt: "You are a FHIR R4 expert. Given raw healthcare data..."
    - [ ] Variable injection: sourceDefinition, rawData (redacted), examples
    - [ ] Strict JSON output parsing with candidates array
    - [ ] Confidence scoring and rationale extraction
    - [ ] Fallback to "Observation" or "DocumentReference" on uncertainty
  - [ ] **Draft-Mapper AgentWorkflow B (mapping-dsl v1 Generation)**
    - [ ] Implement system prompt: "You generate a mapping-dsl v1 that converts raw data..."
    - [ ] Variable injection: resourceType, structureSummary, rawData (redacted), examples
    - [ ] YAML output parsing and validation
    - [ ] Confidence metadata extraction (_meta.confidence, _meta.fields)
    - [ ] Required field safety handling
  - [ ] **Critic AgentWorkflow C (Validation)**
    - [ ] Implement system prompt: "You are a strict validator. Given mapping-dsl v1..."
    - [ ] Variable injection: resourceType, suggestedMapping, structureSummary, rawData
    - [ ] JSON output parsing with errors/warnings arrays
    - [ ] Integration with ValidationRule and Medplum $validate
  - [ ] **HITL Review Interface Integration**
    - [ ] Live FHIR preview generation from mapping-dsl v1
    - [ ] DSL editor with syntax highlighting and validation
    - [ ] Confidence heat-map overlay on fields
    - [ ] Before/after diff visualization
    - [ ] Inline suggestions for missing required fields

- [ ] **6.3.2** Advanced prompt management and safety
  - [ ] **Prompt versioning and metadata**
    - [ ] Store promptMetadata with modelId, promptVersion, systemPromptHash
    - [ ] Support for prompt A/B testing and gradual rollout
    - [ ] Prompt performance tracking and optimization
  - [ ] **PHI protection and redaction**
    - [ ] Configurable allow-list for fields that can be sent to AI
    - [ ] Automatic redaction of sensitive healthcare data
    - [ ] Audit trail for all AI interactions
  - [ ] **Rate limiting and usage controls**
    - [ ] Per-tenant rate limits for AI calls
    - [ ] Cost tracking and budgeting per tenant
    - [ ] Priority queuing for interactive vs batch requests
  - [ ] **On-premises and hybrid model support**
    - [ ] Support for local model deployments
    - [ ] Fallback chains: local → cloud → static rules
    - [ ] Model performance comparison and routing

- [ ] **6.3.3** Evaluation, metrics, and fallback mechanisms
  - [ ] **Comprehensive evaluation metrics**
    - [ ] Classifier top-1 and top-3 accuracy tracking
    - [ ] Draft-Mapper Medplum $validate pass-rate
    - [ ] Human reviewer edit distance (token and field level)
    - [ ] Production error rates by Mapping version
    - [ ] End-to-end pipeline latency and throughput
  - [ ] **Automated rollback and safety**
    - [ ] Spike detection in validation failures
    - [ ] Automatic revert to previous Mapping version
    - [ ] Circuit breaker patterns for AI service failures
    - [ ] Graceful degradation to deterministic rules
  - [ ] **Continuous improvement**
    - [ ] Feedback loop from production errors to model training
    - [ ] A/B testing for prompt variations
    - [ ] Model performance benchmarking and updates

---

## Phase 7: Monitoring & Observability
*Add real monitoring and ops features*

### Stage 7.1: Metrics Collection
- [ ] **7.1.1** Application metrics
  - [ ] Queue depth metrics (RawData pending/inProgress)
  - [ ] Processing success rates
  - [ ] Lock age tracking
  - [ ] Transformation latency
  - [ ] JetStream message rates and lag

- [ ] **7.1.2** Business metrics with versioning and comprehensive AI tracking
  - [ ] **Per-tenant statistics**
    - [ ] Data ingestion rates and success rates
    - [ ] Transformation success rates by source type
    - [ ] Tenant-specific AI usage and costs
  - [ ] **FHIR validation and compliance**
    - [ ] Medplum $validate success rates
    - [ ] Resource type distribution and validation errors
    - [ ] Compliance score tracking over time
  - [ ] **AI pipeline comprehensive metrics**
    - [ ] Classifier accuracy: top-1/top-3 resource type accuracy
    - [ ] Draft-Mapper performance: $validate pass-rate, confidence scores
    - [ ] Critic effectiveness: error/warning detection rates
    - [ ] HITL efficiency: review time, edit distance, approval rates
    - [ ] End-to-end AI pipeline latency and throughput
    - [ ] Per-model usage and cost tracking
  - [ ] **Human review and mapping quality**
    - [ ] Review queue depth and processing time
    - [ ] Reviewer edit distance (token and field level changes)
    - [ ] Mapping activation frequency and rollback rates
    - [ ] Production error rates by Mapping version
  - [ ] **Version management and operations**
    - [ ] Version activation frequency across entity types
    - [ ] Rollback frequency and reasons
    - [ ] Tag reconciliation drift metrics
    - [ ] GraphChecksum drift detection and resolution

### Stage 7.2: Logging Enhancement
- [ ] **7.2.1** Structured logging
  - [ ] Request tracing with traceId
  - [ ] Business event logging with rawDataId, workflowRunId
  - [ ] Version information in logs (templateVersion, mappingVersionIds)
  - [ ] Error categorization and correlation

- [ ] **7.2.2** Log aggregation
  - [ ] Queryable log endpoints
  - [ ] Log retention policies
  - [ ] Performance optimization

### Stage 7.3: Health Checks
- [ ] **7.3.1** Enhanced health checks
  - [ ] Dependency health (DB, JetStream, n8n, Medplum)
  - [ ] Queue health monitoring
  - [ ] Performance indicators
  - [ ] Tag reconciliation status
  - [ ] Version consistency checks

---

## Phase 8: Cleanup & Final Integration
*Remove fake implementations and polish*

### Stage 8.1: Fake Implementation Removal
- [ ] **8.1.1** Remove all mock/fake data generators
  - [ ] WorkflowTemplate fake data removal (including versioning mocks)
  - [ ] RawData fake data removal
  - [ ] Mapping fake data removal (including versioning mocks)
  - [ ] ValidationRule fake data removal (including versioning mocks)
  - [ ] Transformation fake data removal (including version tracking mocks)
  - [ ] Control fake behavior removal

- [ ] **8.1.2** Remove mock service clients
  - [ ] Remove mock JetStream client (with aw.v1 schemas)
  - [ ] Remove mock n8n client (with tag enforcement)
  - [ ] Remove mock Medplum client
  - [ ] Remove mock AI clients

### Stage 8.2: Integration Testing
- [ ] **8.2.1** End-to-end testing with versioning
  - [ ] Full ingestion flow testing (IngestionWorkflow → RawData → Transformation → FHIR)
  - [ ] AI-assisted mapping flow testing (Detection → Draft → Human Review → Activation)
  - [ ] Version pinning and rollback testing
  - [ ] Control system testing (pause/resume/reprocess with version pinning)
  - [ ] Event system testing (JetStream flow with aw.v1 schemas)

- [ ] **8.2.2** Error scenario testing
  - [ ] Failure recovery testing
  - [ ] Lock management testing
  - [ ] Retry mechanism testing with DLQ
  - [ ] Circuit breaker testing
  - [ ] Version conflict resolution testing

### Stage 8.3: Performance Optimization
- [ ] **8.3.1** Database optimization
  - [ ] Query optimization for camelCase schema with versioning
  - [ ] Index tuning for partitioned tables and version queries
  - [ ] Connection pooling

- [ ] **8.3.2** API optimization
  - [ ] Response caching (with version invalidation)
  - [ ] Pagination implementation
  - [ ] Rate limiting

### Stage 8.4: Documentation & Deployment
- [ ] **8.4.1** API documentation
  - [ ] OpenAPI/Swagger documentation with versioning examples
  - [ ] JetStream subject documentation with aw.v1 schemas
  - [ ] Workflow archetype examples
  - [ ] Version pinning and rollback examples
  - [ ] Error response documentation

- [ ] **8.4.2** Deployment readiness
  - [ ] Docker configuration updates
  - [ ] Environment variable documentation
  - [ ] Migration scripts for camelCase transition and versioning
  - [ ] Rollback procedures (version-aware)

---

## Progress Tracking

**Current Stage:** Not Started (Plan Recreated with Comprehensive AI Integration)
**Next Action:** Begin Stage 1.1.1 - Create new module directories structure

---

## Notes & Considerations

### Core Architecture
- **Immutable Versioning**: All executable definitions (WorkflowTemplate, Mapping, ValidationRule) use immutable versioning with activation/rollback
- **Version Pinning**: WorkflowRun and TransformationResult record exact versions for reproducibility
- **LogicalName Pattern**: Stable identifiers across versions (logicalName for templates, ruleName for mappings/validation)
- **Graph Drift Detection**: graphChecksum comparison between WorkflowTemplate and live n8n definitions
- **JetStream aw.v1 Schemas**: Comprehensive message schemas with proper envelope structure
- **Tag Enforcement**: n8n tag reconciliation with drift detection and auto-correction
- **Reprocess with Pinning**: Support for reprocessing with specific version pins for debugging/rollback
- **Tenant Isolation**: Strict tenant scoping across all entities and API endpoints
- **Audit Trail**: Complete before/after traceability with JSON Patch, ExecutionEvent, and version tracking

### AI-Assisted Mapping (HITL) System
- **mapping-dsl v1**: Human-readable, deterministic DSL for FHIR mapping authoring with complete JSON Schema
- **5-Stage AI Pipeline**: Classifier → Draft-Mapper → Validation → HITL Review → Production
- **Comprehensive AgentWorkflows**: Detailed system prompts for resource classification, mapping generation, and validation
- **HITL Review Interface**: Live FHIR preview, confidence heat-maps, DSL editor with validation, before/after diffs
- **Safety-First Approach**: Never auto-activate, require human approval, $validate pass, zero critic errors
- **PHI Protection**: Configurable redaction, audit trails, on-premises model support
- **Continuous Evaluation**: Accuracy metrics, edit distance tracking, automatic rollback on error spikes

### Implementation Strategy
- **External-to-Internal**: API contracts first with comprehensive fake implementations
- **Deterministic Core**: AI used only in authoring phase, production uses approved deterministic mappings
- **Progressive Enhancement**: Start with fake AgentWorkflows, gradually replace with real AI integrations
- **Comprehensive Testing**: End-to-end AI pipeline testing, prompt validation, safety gate verification
- **Monitoring & Observability**: Full AI pipeline metrics, business intelligence, operational dashboards

---

*This plan will be updated as stages are completed, marking them as [✅] when done.* 