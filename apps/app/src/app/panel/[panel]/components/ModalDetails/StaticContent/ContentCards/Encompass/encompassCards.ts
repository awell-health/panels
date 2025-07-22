import type { FHIRCard } from '../../FhirExpandableCard'

const encompassCards: FHIRCard[] = [
  {
    name: 'Patient Demographics',
    fields: [
      {
        label: 'MRN',
        key: 'mrn',
        resourceType: 'Patient',
        fhirPath:
          "identifier.where(system='https://www.encompasshealth.com').value",
      },
      {
        label: 'Name',
        key: 'name',
        resourceType: 'Patient',
        fhirPath: 'name',
      },
      {
        label: 'Date of Birth / Age',
        key: 'date_of_birth_age',
        resourceType: 'Patient',
        fhirPath: 'birthDate',
      },
      {
        label: 'Gender',
        key: 'gender',
        fhirPath: 'gender',
        resourceType: 'Patient',
      },
      {
        label: 'Primary Language',
        key: 'primary_language',
        resourceType: 'Patient',
        fhirPath: 'communication.language.coding.code',
      },
    ],
  },

  {
    name: 'Contact Information & Contact Preferences',
    fields: [
      {
        label: 'Primary phone',
        key: 'primary_phone',
        resourceType: 'Patient',
        fhirPath: "telecom.where(system='phone').value.first()",
      },
      {
        label: 'Email',
        key: 'email',
        resourceType: 'Patient',
        fhirPath: "telecom.where(system='email').value",
      },
      {
        label: 'Street',
        key: 'street',
        fhirPath: 'address.line.first()',
        resourceType: 'Patient',
      },
      {
        label: 'City',
        key: 'city',
        fhirPath: 'address.city',
        resourceType: 'Patient',
      },
      {
        label: 'State',
        key: 'state',
        fhirPath: 'address.state',
        resourceType: 'Patient',
      },
      {
        label: 'Country',
        key: 'country',
        fhirPath: 'address.country',
        resourceType: 'Patient',
      },
      {
        label: 'Caregiver phone',
        key: 'caregiver_phone',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='caregiver_phone').valueString",
      },
      {
        label: 'Preferred language (self‑report)',
        key: 'preferred_language_self_report',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='language').valueString",
      },
    ],
  },

  {
    name: 'Discharge & Hospital Stay Summary',
    fields: [
      {
        label: 'Admit date',
        key: 'admit_date',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='admit_date').valueString",
      },
      {
        label: 'Discharge date',
        key: 'discharge_date',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='discharge_date').valueString",
      },
      {
        label: 'Length of stay (days)',
        key: 'length_of_stay',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='length_of_stay').valueString",
      },
      {
        label: 'Disposition description',
        key: 'discharge_status_desc',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='discharge_status_desc').valueString",
      },
      {
        label: 'Facility',
        key: 'facility',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='facility').valueString",
      },
      {
        label: 'Primary DX code',
        key: 'primary_diagnosis_code',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='primary_diagnosis_code').valueString",
      },
      {
        label: 'Primary DX group',
        key: 'primary_diagnosis_group',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='primary_diagnosis_group').valueString",
      },
      {
        label: 'Primary DX description',
        key: 'primary_diagnosis_desc',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='primary_diagnosis_desc').valueString",
      },
      {
        label: 'Reason for visit',
        key: 'reason_for_visit',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='reason_for_visit').valueString",
      },
    ],
  },
  {
    name: 'Care Team & Coordination',
    fields: [
      {
        label: 'Program enrolled',
        key: 'program_enrolled',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='program_enrolled').valueString",
      },
      {
        label: 'Case manager',
        key: 'case_manager',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='case_manager').valueString",
      },
      {
        label: 'Assigned to',
        key: 'assigned_to',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='assigned_to').valueString",
      },
      {
        label: 'Admitting physician',
        key: 'admitting_physician',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='admitting_physician').valueString",
      },
      {
        label: 'Attending physician',
        key: 'attending_physician',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='attending_physician').valueString",
      },
      {
        label: 'SNF provider',
        key: 'snf_provider',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='snf_provider').valueString",
      },
      {
        label: 'Outpatient services provider',
        key: 'outpatient_services_provider',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='outpatient_services_provider').valueString",
      },
    ],
  },
  {
    name: 'Insurance Information',
    fields: [
      {
        label: 'Contract description',
        key: 'contract_desc',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='contract_desc').valueString",
      },
      {
        label: 'Insurance company 1',
        key: 'insurance_company_name_1',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='insurance_company_name_1').valueString",
      },
      {
        label: 'Insurance company 2',
        key: 'insurance_company_name_2',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='insurance_company_name_2').valueString",
      },
    ],
  },

  {
    name: 'TCM Outreach Status',
    fields: [
      {
        label: 'Assessment status',
        key: 'assessment_status',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='assessment_status').valueString",
      },
      {
        label: 'Call status',
        key: 'call_status',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='call_status').valueString",
      },
      {
        label: 'Readmission status',
        key: 'readmission_status',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='readmission_status').valueString",
      },
      {
        label: 'Readmission risk',
        key: 'readmission_risk_level',
        resourceType: 'Task',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='readmission_risk_level').valueString",
      },
      {
        label: 'Home‑health engaged',
        key: 'home_health_engaged',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='home_health_engaged').valueString",
      },
    ],
  },

  {
    name: 'Transition of Care Assessment',
    fields: [
      {
        label: 'Rx pickup status',
        key: 'prescriptions_picked_up',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='prescriptions_picked_up').valueString",
      },
      {
        label: 'Pickup barriers',
        key: 'pickup_barriers',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='pickup_barriers').valueString",
      },
      {
        label: 'Medication note',
        key: 'medication_note',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='medication_note').valueString",
      },
      {
        label: 'Follow‑up scheduled status',
        key: 'followup_scheduled_status',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='followup_scheduled_status').valueString",
      },
      {
        label: 'Follow‑up appointment note',
        key: 'followup_appointment_note',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='followup_appointment_note').valueString",
      },
      {
        label: 'Overall summary',
        key: 'overall_summary',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='overall_summary').valueString",
      },
      {
        label: 'Transition escalation category',
        key: 'transition_escalation_category',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='transition_escalation_category').valueString",
      },
      {
        label: 'Transition escalation explanation',
        key: 'transition_escalation_explanation',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='transition_escalation_explanation').valueString",
      },
      {
        label: 'Initial call review status',
        key: 'initial_call_review_status',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='initial_call_review_status').valueString",
      },
      {
        label: 'Initial call review explanation',
        key: 'initial_call_review_status_explanation',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='initial_call_review_status_explanation').valueString",
      },
      {
        label: 'Experience feedback',
        key: 'experience_feedback',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='experience_note').valueString",
      },
      {
        label: 'Readmission note',
        key: 'readmission_note',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='readmission_note').valueString",
      },
      {
        label: 'Current care location',
        key: 'current_care_location',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='current_care_location').valueString",
      },
      {
        label: 'Overall form summary',
        key: 'test_form_summary',
        resourceType: 'Patient',
        fhirPath:
          "extension.where(url='https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension.where(url='test_form_summary').valueString",
      },
    ],
  },
]

export default encompassCards
