import type { BotEvent, MedplumClient } from '@medplum/core'

export async function handler(
  medplum: MedplumClient,
  event: BotEvent,
): Promise<void> {
  // Your code here
  await medplum.createResource({
    resourceType: 'Patient',
    identifier: [
      {
        system: 'https://awellhealth.com/patients',
        value: 'test',
      },
    ],
    active: true,
  })
}
