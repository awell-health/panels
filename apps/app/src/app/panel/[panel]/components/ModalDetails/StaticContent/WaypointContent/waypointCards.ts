export const waypointCards = [
  // ──────── Card 1 • Kidney function & metabolic panel (latest lab results) ───────────────
  {
    name: 'Kidney function & metabolic panel',
    fields: [
      {
        label: 'eGFR (mL/min)',
        key: 'observation_egfr_ml_min',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='33914-3')" + // eGFR
          '.sortBy(effectiveDateTime).last().valueQuantity.value ' +
          "∥ entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_egfr_ml_min').valueString",
      },
      {
        label: 'Creatinine (mg/dL)',
        key: 'observation_creatinine_mg_dl',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='2160-0')" + // Creatinine
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_creatinine_mg_dl').valueString",
      },
      {
        label: 'Sodium (mmol/L)',
        key: 'observation_sodium_mmol_l',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='2951-2')" + // Sodium
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_sodium_mmol_l').valueString",
      },
      {
        label: 'HbA1c (%)',
        key: 'observation_hba1c_percent',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='30425-0')" + // HbA1c
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_hba1c_percent').valueString",
      },
    ],
  },

  // ──────────────── Card 2 • Vital signs at most-recent observation ───────────────────────
  {
    name: 'Vital signs',
    fields: [
      {
        label: 'Weight (lbs)',
        key: 'observation_weight_lbs',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='29463-7')" + // Body weight
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_weight_lbs').valueString",
      },
      {
        label: 'Systolic BP (mmHg)',
        key: 'observation_sbp_mmHg',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='8480-6')" + // Systolic
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_sbp_mmHg').valueString",
      },
      {
        label: 'Diastolic BP (mmHg)',
        key: 'observation_dbp_mmHg',
        fhirPath:
          'entry.resource.ofType(Observation)' +
          ".where(code.coding.code='8462-4')" + // Diastolic
          '.sortBy(effectiveDateTime).last().valueQuantity.value ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='observation_dbp_mmHg').valueString",
      },
    ],
  },

  // ─────────────────────── Card 3 • Current encounter snapshot ────────────────────────────
  {
    name: 'Current encounter',
    fields: [
      {
        label: 'Encounter ID',
        key: 'encounter_id',
        fhirPath:
          "entry.resource.ofType(Encounter).identifier.where(system='<https://waypointhcs.com/encounters>').value" +
          " ∥ entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='encounter_id').valueString",
      },
      {
        label: 'Encounter type',
        key: 'encounter_type',
        fhirPath:
          'entry.resource.ofType(Encounter).type.coding.first().display ∥ ' +
          'entry.resource.ofType(Encounter).class.display ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='encounter_type').valueString",
      },
      {
        label: 'Start date/time',
        key: 'encounter_datetime',
        fhirPath:
          'entry.resource.ofType(Encounter).period.start ∥ ' +
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='encounter_datetime').valueString",
      },
      {
        label: 'Registration date/time',
        key: 'registration_dt_tm',
        fhirPath:
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='registration_dt_tm').valueString",
      },
      {
        label: 'Discharge disposition',
        key: 'discharge_disposition',
        fhirPath:
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='discharge_disposition').valueString",
      },
      {
        label: 'Discharge date',
        key: 'discharge_date',
        fhirPath:
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='discharge_date').valueString",
      },
    ],
  },

  // ───────────────────── Card 4 • Administrative & billing IDs ────────────────────────────
  {
    name: 'Administrative & billing',
    fields: [
      {
        label: 'FIN number',
        key: 'fin_number',
        fhirPath:
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='fin_number').valueString",
      },
      {
        label: 'Preferred channel',
        key: 'communication_pref',
        fhirPath:
          "entry.resource.ofType(Patient).extension.where(url='<https://awellhealth.com/fhir/StructureDefinition/awell-data-points>')" +
          ".extension.where(url='communication_pref').valueString",
      },
    ],
  },
]
