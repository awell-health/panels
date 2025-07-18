import type { FHIRCard } from '../../FhirExpandableCard'

export const wellpathCards: FHIRCard[] = [
  {
    name: 'Patient demographics',
    fields: [
      {
        label: 'Full name',
        key: 'name',
        resourceType: 'Patient',
        fhirPath: 'name',
      },
      {
        label: 'Date of birth',
        key: 'birthDate',
        resourceType: 'Patient',
        fhirPath: 'birthDate',
      },
      {
        label: 'Email',
        key: 'email',
        resourceType: 'Patient',
        fhirPath: 'telecom.where(system="email").value',
      },
      {
        label: 'Phone',
        key: 'phone',
        resourceType: 'Patient',
        fhirPath: "telecom.where(system='phone').value",
      },
    ],
  },
  // ─────────────────────────────── Card 0 • Call-flow summary ───────────────────────────────
  {
    name: 'Call-flow summary',
    fields: [
      {
        label: 'AI-generated summary (HTML)',
        key: 'SummaryBeforeFirstTask_MainTrack',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url='SummaryBeforeFirstTask_MainTrack').valueString",
      },
    ],
  },

  // ───────────────────────── Card 2 • Call summary & metadata ──────────────────────────────
  {
    name: 'Call summary & metadata',
    fields: [
      {
        label: 'Caller name',
        key: 'caller_name',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'caller_name').valueString",
      },
      {
        label: 'Call reason',
        key: 'call_reason',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'call_reason').valueString",
      },
      {
        label: 'Call category',
        key: 'call_category',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'call_category').valueString",
      },
      {
        label: 'Free-text summary',
        key: 'summary',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'summary').valueString",
      },
      {
        label: 'Call ID',
        key: 'callId',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'callId').valueString",
      },
      {
        /* callPayload lives in JSON string → parse first */
        label: 'Urgency',
        key: 'call_urgency',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'callPayload').valueString.analysis.call_urgency" /* requires JSON.parse */,
      },
      {
        label: 'Caller state',
        key: 'incoming_state',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'incoming_state').valueString",
      },
      {
        label: 'Caller city',
        key: 'caller_city',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'callPayload').valueString.variables.city" /* requires JSON.parse */,
      },
      {
        label: 'Caller ZIP',
        key: 'caller_zip',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'callPayload').valueString.variables.zip" /* requires JSON.parse */,
      },
    ],
  },

  // ───────────────────────── Card 3 • Provider & claim overview ────────────────────────────
  {
    name: 'Provider & claim overview',
    fields: [
      {
        label: 'Provider name',
        key: 'provider_name',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'provider_name').valueString",
      },
      {
        label: 'Provider state',
        key: 'provider_state',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'provider_state').valueString",
      },
      {
        /* claim number resides inside callPayload JSON */
        label: 'Claim number',
        key: 'claim_number',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'callPayload').valueString.variables.claim_number" /* requires JSON.parse */,
      },
      {
        /* tableau_response[0] = first line item */
        label: 'Claim status',
        key: 'ClaimStatus',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'tableau_response').valueString[0].ClaimStatus" /* requires JSON.parse */,
      },
      {
        label: 'First DOS',
        key: 'FDOS',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'tableau_response').valueString[0].FDOS" /* requires JSON.parse */,
      },
      {
        label: 'Total charges',
        key: 'Max. TCHARGE',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'tableau_response').valueString[0]['Max. TCHARGE']" /* requires JSON.parse */,
      },
      {
        label: 'Provider tax ID',
        key: 'provider_tax_id',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'callPayload').valueString.variables.provider_tax_id" /* requires JSON.parse */,
      },
      {
        label: 'TDOS',
        key: 'tdos',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'tdos').valueString",
      },
    ],
  },

  // ───────────────────── Card 4 • Claim line-item details (expandable) ────────────────────
  {
    name: 'Claim line-item details',
    fields: [
      {
        label: 'Line-items array',
        key: 'tableau_response',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json')" +
          ".extension.where(url = 'tableau_response').valueString" /* requires JSON.parse */,
      },
    ],
  },

  // ───────────────────────────── Card 5 • Task metadata ───────────────────────────────────
  {
    name: 'Task metadata',
    fields: [
      {
        label: 'Task status',
        key: 'status',
        resourceType: 'Task',
        fhirPath: 'status',
      },
      {
        label: 'Priority',
        key: 'priority',
        resourceType: 'Task',
        fhirPath: 'priority',
      },
      {
        label: 'Description',
        key: 'description',
        resourceType: 'Task',
        fhirPath: 'description',
      },
      {
        label: 'Task code (display)',
        key: 'task-code-display',
        resourceType: 'Task',
        fhirPath: 'code.coding[0].display',
      },
      {
        label: 'Awell activity-id',
        key: 'activity-id',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'activity-id').valueString",
      },
    ],
  },

  // ───────────────────── Card 6 • Workflow / pathway context ─────────────────────────────
  {
    name: 'Care flow context',
    fields: [
      {
        label: 'Awell Care URL',
        key: 'awell-care-url',
        resourceType: 'Task',
        fhirPath: "input[?(@.type.coding[0].code='awell-care')].valueUrl",
      },
      {
        label: 'Pathway title',
        key: 'pathway-title',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'pathway-title').valueString",
      },
      {
        label: 'Pathway id',
        key: 'pathway-id',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'pathway-id').valueString",
      },
      {
        label: 'Step name',
        key: 'step-name',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'step-name').valueString",
      },
      {
        label: 'Activity type',
        key: 'activity-type',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'activity-type').valueString",
      },
      {
        label: 'Stakeholder',
        key: 'stakeholder',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'stakeholder').valueString",
      },
      {
        label: 'Pathway start date',
        key: 'pathway-start-date',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-task')" +
          ".extension.where(url = 'pathway-start-date').valueString",
      },
    ],
  },

  // ───────────────────────────── Card 7 • Administrative ─────────────────────────────────
  {
    name: 'Administrative',
    fields: [
      {
        label: 'Identifier value',
        key: 'identifier.value',
        resourceType: 'Task',
        fhirPath: 'identifier[0].value',
      },
      {
        label: 'Owner (Practitioner)',
        key: 'owner.display',
        resourceType: 'Task',
        fhirPath: 'owner.display',
      },
      {
        fhirPath: 'note[*].text',
        label: 'Notes text',
        key: 'note.text',
        resourceType: 'Task',
      },
      {
        fhirPath: 'note[*].time',
        label: 'Notes time',
        key: 'note.time',
        resourceType: 'Task',
      },
    ],
  },
]
