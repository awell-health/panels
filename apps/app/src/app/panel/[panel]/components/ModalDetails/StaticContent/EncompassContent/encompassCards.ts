export const encompassCards = [
  // ─────────── Card 1 • Patient demographics ────────────────────
  {
    name: 'Patient demographics',
    fields: [
      {
        label: 'Gender',
        key: 'gender',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'gender').valueString",
      },
      {
        label: 'Caregiver name',
        key: 'caregiver',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'caregiver').valueString",
      },
      {
        label: 'Caregiver phone',
        key: 'caregiver_phone',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'caregiver_phone').valueString",
      },
      {
        label: 'MRN',
        key: 'mrn',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'mrn').valueString",
      },
      {
        label: 'Patient code',
        key: 'patient_code',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'patient_code').valueString",
      },
    ],
  },

  // ─────────── Card 2 • Admission & discharge snapshot ──────────
  {
    name: 'Admission & discharge snapshot',
    fields: [
      {
        label: 'Admit date',
        key: 'admit_date',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'admit_date').valueString",
      },
      {
        label: 'Discharge date',
        key: 'discharge_date',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'discharge_date').valueString",
      },
      {
        label: 'Length of stay (days)',
        key: 'length_of_stay',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'length_of_stay').valueString",
      },
      {
        label: 'Discharge status (code)',
        key: 'discharge_status_code',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'discharge_status_code').valueString",
      },
      {
        label: 'Discharge status (desc)',
        key: 'discharge_status_desc',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'discharge_status_desc').valueString",
      },
      {
        label: 'Facility name',
        key: 'facility',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'facility').valueString",
      },
      {
        label: 'Facility code',
        key: 'facility_code',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'facility_code').valueString",
      },
      {
        label: 'Encounter ID',
        key: 'encounter_id',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'encounter_id').valueString",
      },
    ],
  },

  // ─────────── Card 3 • Diagnosis & clinical context ────────────
  {
    name: 'Diagnosis & clinical context',
    fields: [
      {
        label: 'Primary diagnosis (description)',
        key: 'primary_diagnosis_desc',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'primary_diagnosis_desc').valueString",
      },
      {
        label: 'Primary diagnosis (code)',
        key: 'primary_diagnosis_code',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'primary_diagnosis_code').valueString",
      },
      {
        label: 'Primary diagnosis (group)',
        key: 'primary_diagnosis_group',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'primary_diagnosis_group').valueString",
      },
      {
        label: 'Reason for visit',
        key: 'reason_for_visit',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'reason_for_visit').valueString",
      },
      {
        label: 'Readmission risk',
        key: 'readmission_risk_level',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'readmission_risk_level').valueString",
      },
    ],
  },

  // ─────────── Card 4 • Insurance & financials ──────────────────
  {
    name: 'Insurance & financials',
    fields: [
      {
        label: 'Primary payer',
        key: 'insurance_company_name_1',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'insurance_company_name_1').valueString",
      },
      {
        label: 'Secondary payer',
        key: 'insurance_company_name_2',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'insurance_company_name_2').valueString",
      },
      {
        label: 'Contract description',
        key: 'contract_desc',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'contract_desc').valueString",
      },
      {
        label: 'Financial number (FIN)',
        key: 'financial_number',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'financial_number').valueString",
      },
    ],
  },

  // ─────────── Card 5 • Care-team & program info ────────────────
  {
    name: 'Care-team & program info',
    fields: [
      {
        label: 'Case manager',
        key: 'case_manager',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'case_manager').valueString",
      },
      {
        label: 'Admitting physician',
        key: 'admitting_physician',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'admitting_physician').valueString",
      },
      {
        label: 'Attending physician',
        key: 'attending_physician',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'attending_physician').valueString",
      },
      {
        label: 'Home-health provider',
        key: 'home_health_provider',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'home_health_provider').valueString",
      },
      {
        label: 'Program enrolled',
        key: 'program_enrolled',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'program_enrolled').valueString",
      },
      {
        label: 'Assessment status',
        key: 'assessment_status',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'assessment_status').valueString",
      },
      {
        label: 'Assigned to',
        key: 'assigned_to',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'assigned_to').valueString",
      },
      {
        label: 'Existing care flows',
        key: 'nbr_care_flow_exists',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'nbr_care_flow_exists').valueString",
      },
    ],
  },

  // ─────────── Card 6 • Call summary & metadata ────────────────
  {
    name: 'Call summary & metadata',
    fields: [
      {
        label: 'Call status',
        key: 'call_status',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'call_status').valueString",
      },
      {
        label: 'Call attempt',
        key: 'call_attempt',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'call_attempt').valueString",
      },
      {
        label: 'Call time slot',
        key: 'call_time_slot',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'call_time_slot').valueString",
      },
      {
        label: 'Answered by',
        key: 'answered_by',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'answered_by').valueString",
      },
      {
        label: 'Webhook call ID',
        key: 'webhook_call_id',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'webhook_call_id').valueString",
      },
      {
        label: 'Transition escalation category',
        key: 'transition_escalation_category',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'transition_escalation_category').valueString",
      },
      {
        label: 'Initial call review status',
        key: 'initial_call_review_status',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'initial_call_review_status').valueString",
      },
      {
        label: 'Initial call review explanation',
        key: 'initial_call_review_status_explanation',
        fhirPath:
          "extension.where(url = 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')" +
          ".extension.where(url = 'initial_call_review_status_explanation').valueString",
      },
    ],
  },
]
