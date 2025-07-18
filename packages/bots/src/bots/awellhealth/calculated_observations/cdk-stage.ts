import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Observation, DetectedIssue } from '@medplum/fhirtypes'

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Observation>,
): Promise<void> {
  console.log('CDK Stage Bot: Starting processing', {
    observationId: event.input?.id,
    resourceType: event.input?.resourceType,
  })

  const obs = event.input
  const egfr = obs.valueQuantity?.value

  console.log('CDK Stage Bot: Extracted eGFR value', {
    egfr,
    observationId: obs.id,
    hasValueQuantity: !!obs.valueQuantity,
    unit: obs.valueQuantity?.unit,
  })

  if (egfr !== undefined && obs.subject?.reference) {
    const patientRef = obs.subject.reference
    console.log(
      'CDK Stage Bot: Processing observation with valid eGFR and patient reference',
      {
        egfr,
        patientRef,
        observationId: obs.id,
      },
    )

    const stage =
      egfr >= 90
        ? 'Stage I'
        : egfr >= 60
          ? 'Stage II'
          : egfr >= 45
            ? 'Stage IIIa'
            : egfr >= 30
              ? 'Stage IIIb'
              : egfr >= 15
                ? 'Stage IV'
                : 'Stage V'

    console.log('CDK Stage Bot: Calculated CKD stage', {
      egfr,
      stage,
      patientRef,
    })

    const derived: Observation = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'CKD Stage' },
      subject: { reference: patientRef },
      effectiveDateTime: obs.effectiveDateTime,
      valueString: stage,
      derivedFrom: [{ reference: `Observation/${obs.id}` }],
    }

    try {
      const createdObservation = await medplum.createResource(derived)
      console.log('CDK Stage Bot: Successfully created CKD stage observation', {
        newObservationId: createdObservation.id,
        stage,
        patientRef,
        sourceObservationId: obs.id,
      })
    } catch (error) {
      console.error('CDK Stage Bot: Failed to create CKD stage observation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stage,
        patientRef,
        sourceObservationId: obs.id,
      })
      throw error
    }

    if (stage === 'Stage IV' || stage === 'Stage V') {
      console.log(
        'CDK Stage Bot: Creating high-severity detected issue for advanced CKD stage',
        {
          stage,
          patientRef,
          sourceObservationId: obs.id,
        },
      )

      const issue: DetectedIssue = {
        resourceType: 'DetectedIssue',
        status: 'final',
        severity: 'high',
        code: { text: `CKD ${stage}` },
        patient: { reference: patientRef },
        implicated: [{ reference: `Observation/${obs.id}` }],
        identifiedDateTime: new Date().toISOString(),
      }

      try {
        const createdIssue = await medplum.createResource(issue)
        console.log('CDK Stage Bot: Successfully created detected issue', {
          issueId: createdIssue.id,
          stage,
          patientRef,
          sourceObservationId: obs.id,
        })
      } catch (error) {
        console.error('CDK Stage Bot: Failed to create detected issue', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stage,
          patientRef,
          sourceObservationId: obs.id,
        })
        throw error
      }
    }
  } else {
    console.log('CDK Stage Bot: Skipping observation - missing required data', {
      hasEgfr: egfr !== undefined,
      hasPatientRef: !!obs.subject?.reference,
      observationId: obs.id,
      egfr,
      patientRef: obs.subject?.reference,
    })
  }

  console.log('CDK Stage Bot: Processing completed', {
    observationId: obs.id,
    egfr,
    stage:
      egfr !== undefined
        ? egfr >= 90
          ? 'Stage I'
          : egfr >= 60
            ? 'Stage II'
            : egfr >= 45
              ? 'Stage IIIa'
              : egfr >= 30
                ? 'Stage IIIb'
                : egfr >= 15
                  ? 'Stage IV'
                  : 'Stage V'
        : 'N/A',
  })
}
