# Appointment Participant Resolution with FHIR Bundle

This module provides efficient batch resolution of FHIR references in appointment participants using Medplum's batch request capabilities. The main function `getAppointmentsPaginated` automatically resolves all participant references and returns them as a FHIR Bundle, enabling FHIR path navigation.

## Overview

When working with FHIR Appointments, participant references are often stored as simple reference strings (e.g., `"Patient/123"`, `"Practitioner/456"`). To get the actual resource data, you need to resolve these references. This module provides efficient batch resolution integrated directly into the appointment fetching process, returning everything as a FHIR Bundle for easy navigation using FHIR path expressions.

## Key Features

- **FHIR Bundle Format**: Returns all resources in a standard FHIR Bundle for easy navigation
- **FHIR Path Support**: Use FHIR path expressions to navigate from appointments to participants
- **Integrated Resolution**: Participant references are automatically resolved when fetching appointments
- **Batch Processing**: All references across multiple appointments are resolved in a single batch request
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Graceful handling of failed reference resolutions
- **Pagination Support**: Works seamlessly with pagination

## Main Functions

### `getAppointmentsPaginated(options: PaginationOptions)`

Fetches appointments with pagination and automatically resolves all participant references as a FHIR Bundle.

### `createEnhancedAppointments(bundle: Bundle)`

Creates enhanced appointment objects with resolved participant data flattened into the appointment object for easier FHIR path access without needing the `resolve()` function.

```typescript
import { getAppointmentsPaginated } from '@/lib/server/medplum-server'

const result = await getAppointmentsPaginated({
  pageSize: 10,
  lastUpdated: '2025-01-01T00:00:00Z'
})

console.log(result)
// {
//   bundle: {
//     resourceType: 'Bundle',
//     type: 'searchset',
//     entry: [
//       { resource: Appointment },
//       { resource: Patient },
//       { resource: Practitioner },
//       { resource: Location },
//       // ... all resolved resources
//     ]
//   },
//   hasMore: boolean,
//   nextCursor?: string,
//   totalCount?: number
// }
```

### `resolveReferencesBatch(references: string[])`

Internal function that resolves multiple FHIR references using a single batch request.

```typescript
import { resolveReferencesBatch } from '@/lib/server/medplum-server'

const references = [
  'Patient/0199a008-19f7-73c9-a2f5-495559e5aab7',
  'Practitioner/01999ff3-cdd5-76e8-90f4-7d31059c669e',
  'Location/01999ff3-cec8-723e-a774-d4eb4bd68c50'
]

const resolvedResources = await resolveReferencesBatch(references)
// Returns: Array<Patient | Practitioner | Location | null>
```

## Enhanced Appointments (Recommended for UI Components)

For UI components like tables and forms, it's often easier to work with enhanced appointment objects that have resolved participant data flattened into the appointment object. This eliminates the need for the `resolve()` function in FHIR path expressions.

```typescript
import { getAppointmentsPaginated } from '@/lib/server/medplum-server'
import { createEnhancedAppointments } from '@/lib/fhir-bundle-utils'

// Get appointments with resolved participants as FHIR Bundle
const result = await getAppointmentsPaginated({ pageSize: 10 })
const bundle = result.bundle

// Create enhanced appointment objects with resolved participant data
const enhancedAppointments = createEnhancedAppointments(bundle)

// Now you can access resolved participant data directly without resolve() function
enhancedAppointments.forEach(appointment => {
  console.log(`Appointment: ${appointment.id}`)
  console.log(`Patient: ${appointment.resolvedPatient?.name?.[0]?.given?.join(' ')} ${appointment.resolvedPatient?.name?.[0]?.family}`)
  console.log(`Practitioner: ${appointment.resolvedPractitioner?.name?.[0]?.given?.join(' ')} ${appointment.resolvedPractitioner?.name?.[0]?.family}`)
  console.log(`Location: ${appointment.resolvedLocation?.name}`)
})
```

### Enhanced Appointment Structure

Enhanced appointments include these additional properties:

- `resolvedParticipants`: Array of all participants with their resolved actors
- `resolvedPatient`: Direct reference to the resolved Patient resource (if any)
- `resolvedPractitioner`: Direct reference to the resolved Practitioner resource (if any)
- `resolvedLocation`: Direct reference to the resolved Location resource (if any)

### Column SourceField Examples for Enhanced Appointments

```typescript
// These sourceField expressions work with enhanced appointments without resolve():

// Patient name
sourceField: 'resolvedPatient.name[0].given[0] + " " + resolvedPatient.name[0].family'

// Practitioner name
sourceField: 'resolvedPractitioner.name[0].given[0] + " " + resolvedPractitioner.name[0].family'

// Location name
sourceField: 'resolvedLocation.name'

// Patient birth date
sourceField: 'resolvedPatient.birthDate'

// Patient gender
sourceField: 'resolvedPatient.gender'

// Check if all participant types are resolved
sourceField: 'resolvedPatient.exists() and resolvedPractitioner.exists() and resolvedLocation.exists()'

// Count total resolved participants
sourceField: 'resolvedParticipants.count()'

// Count required participants
sourceField: 'resolvedParticipants.where(required = "required").count()'
```

## Usage Examples

### Basic Usage with FHIR Bundle

```typescript
import { getAppointmentsPaginated } from '@/lib/server/medplum-server'

const result = await getAppointmentsPaginated({
  pageSize: 10
})

// Access the FHIR Bundle
const bundle = result.bundle
console.log('Bundle contains:', bundle.entry?.length, 'resources')

// Extract resources by type (FHIR path-like filtering)
const appointments = bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Appointment')
  .map(entry => entry.resource) || []

const patients = bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Patient')
  .map(entry => entry.resource) || []

const practitioners = bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Practitioner')
  .map(entry => entry.resource) || []

const locations = bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Location')
  .map(entry => entry.resource) || []
```

### FHIR Path Navigation (Without resolve() function)

**Note**: The standard `fhirpath` library doesn't implement the `resolve()` function. Use these utility functions instead:

```typescript
import { 
  extractResourcesByType, 
  resolveReferenceInBundle, 
  getAppointmentsWithResolvedParticipants,
  BundleQueryExamples 
} from '@/lib/fhir-bundle-utils'

const result = await getAppointmentsPaginated({ pageSize: 10 })
const bundle = result.bundle

// Extract resources by type using utility functions
const appointments = extractResourcesByType<Appointment>(bundle, 'Appointment')
const patients = extractResourcesByType<Patient>(bundle, 'Patient')
const practitioners = extractResourcesByType<Practitioner>(bundle, 'Practitioner')
const locations = extractResourcesByType<Location>(bundle, 'Location')

// Navigate from appointments to participants using utility functions
const appointmentsWithParticipants = getAppointmentsWithResolvedParticipants(bundle)

appointmentsWithParticipants.forEach((item, index) => {
  const { appointment, participants } = item
  console.log(`Appointment ${index + 1}:`)
  console.log(`  Status: ${appointment.status}`)
  console.log(`  Start: ${appointment.start}`)
  console.log(`  End: ${appointment.end}`)
  
  participants.forEach((participantItem, pIndex) => {
    const { participant, resolvedActor } = participantItem
    console.log(`  Participant ${pIndex + 1}: ${participant.actor?.reference}`)
    
    if (resolvedActor) {
      console.log(`    Resolved: ${resolvedActor.resourceType}/${resolvedActor.id}`)
      // FHIR path: Patient.name.given or Practitioner.name.given
      if (resolvedActor.name?.[0]?.given) {
        console.log(`    Name: ${resolvedActor.name[0].given.join(' ')} ${resolvedActor.name[0].family}`)
      }
    } else {
      console.log(`    ❌ Could not resolve reference: ${participant.actor?.reference}`)
    }
  })
})
```

### FHIR Path-like Queries (Using Utility Functions)

```typescript
import { BundleQueryExamples } from '@/lib/fhir-bundle-utils'

const result = await getAppointmentsPaginated({ pageSize: 10 })
const bundle = result.bundle

// FHIR Path-like expressions using utility functions

// 1. Find all appointments with status 'booked'
// FHIR path: Appointment.status = 'booked'
const bookedAppointments = BundleQueryExamples.findBookedAppointments(bundle)

// 2. Find all patients with a specific birth year
// FHIR path: Patient.birthDate starts with '1990'
const patientsBornIn1990 = BundleQueryExamples.findPatientsBornInYear(bundle, '1990')

// 3. Find all practitioners with qualifications
// FHIR path: Practitioner.qualification exists
const qualifiedPractitioners = BundleQueryExamples.findQualifiedPractitioners(bundle)

// 4. Find all locations in a specific city
// FHIR path: Location.address.city contains 'anytown'
const cityLocations = BundleQueryExamples.findLocationsInCity(bundle, 'anytown')

console.log('Query results:', {
  bookedAppointments: bookedAppointments.length,
  patientsBornIn1990: patientsBornIn1990.length,
  qualifiedPractitioners: qualifiedPractitioners.length,
  cityLocations: cityLocations.length
})
```

### Using BundleQuery Class for Complex Queries

```typescript
import { createBundleQuery } from '@/lib/fhir-bundle-utils'

const result = await getAppointmentsPaginated({ pageSize: 10 })
const bundle = result.bundle

const query = createBundleQuery(bundle)

// Find appointments with specific conditions
const urgentAppointments = query.whereAppointments(apt => apt.priority === 'urgent')
const malePatients = query.wherePatients(patient => patient.gender === 'male')
const qualifiedPractitioners = query.wherePractitioners(p => p.qualification && p.qualification.length > 0)

// Get all appointments with their resolved participants
const appointmentsWithParticipants = query.getAppointmentsWithParticipants()

console.log('Complex query results:', {
  urgentAppointments: urgentAppointments.length,
  malePatients: malePatients.length,
  qualifiedPractitioners: qualifiedPractitioners.length,
  appointmentsWithParticipants: appointmentsWithParticipants.length
})
```

### Pagination with FHIR Bundle

```typescript
let cursor: string | undefined
let allBundles: any[] = []

do {
  const result = await getAppointmentsPaginated({
    pageSize: 5,
    lastUpdated: cursor
  })
  
  allBundles.push(result.bundle)
  cursor = result.nextCursor
  
  console.log(`Fetched ${result.bundle.entry?.length || 0} resources`)
  
} while (cursor)

console.log(`Total bundles: ${allBundles.length}`)

// Combine all bundles if needed
const combinedBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  entry: allBundles.flatMap(bundle => bundle.entry || [])
}
```

### Error Handling

```typescript
try {
  const result = await getAppointmentsPaginated({ pageSize: 10 })
  const bundle = result.bundle
  
  // Check for appointments with unresolved participants
  const appointments = bundle.entry
    ?.filter(entry => entry.resource?.resourceType === 'Appointment')
    .map(entry => entry.resource) || []
  
  const appointmentsWithUnresolved = appointments.filter(appointment => {
    const participantReferences = appointment.participant?.map(p => p.actor?.reference).filter(Boolean) || []
    const resolvedReferences = bundle.entry
      ?.filter(entry => entry.resource?.resourceType !== 'Appointment')
      .map(entry => `${entry.resource?.resourceType}/${entry.resource?.id}`) || []
    
    const unresolvedCount = participantReferences.filter(ref => !resolvedReferences.includes(ref)).length
    return unresolvedCount > 0
  })
  
  if (appointmentsWithUnresolved.length > 0) {
    console.warn(`Could not resolve all participants for ${appointmentsWithUnresolved.length} appointments`)
  }
  
} catch (error) {
  console.error('Failed to fetch appointments with participants:', error)
  // Handle error appropriately
}
```

## Type Definitions

### `PaginatedAppointmentBundleResult`

```typescript
interface PaginatedAppointmentBundleResult {
  bundle: AppointmentBundle
  hasMore: boolean
  nextCursor?: string
  totalCount?: number
}
```

### `AppointmentBundle`

```typescript
interface AppointmentBundle extends Bundle {
  resourceType: 'Bundle'
  type: 'searchset'
  entry: Array<{
    resource: Appointment | Patient | Practitioner | Location
  }>
  // Pagination metadata
  hasMore?: boolean
  nextCursor?: string
  totalCount?: number
}
```

## Performance Considerations

### Batch vs Individual Requests

**Batch Requests (Recommended)**:
- Single API call for multiple references across all appointments
- Better performance and reduced latency
- Atomic operation (all succeed or all fail)
- Automatic deduplication of references
- FHIR Bundle format for efficient navigation

**Individual Requests**:
- Multiple API calls (one per reference)
- Higher latency and more network overhead
- Partial failures possible

### Best Practices

1. **Use FHIR Bundle Format**: The `getAppointmentsPaginated` function returns a standard FHIR Bundle
2. **Leverage FHIR Path**: Use FHIR path expressions to navigate the Bundle efficiently
3. **Handle Failures Gracefully**: Some references might not resolve due to permissions or missing resources
4. **Cache Results**: Consider caching resolved resources if they're accessed frequently
5. **Type Safety**: Use TypeScript types to ensure proper handling of resolved resources
6. **Pagination**: Use appropriate page sizes to balance performance and memory usage

## Integration with Existing Code

This module integrates seamlessly with your existing Medplum server functions:

```typescript
// In your existing code
import { getAppointmentsPaginated } from '@/lib/server/medplum-server'

// Fetch appointments with resolved participants as FHIR Bundle
const result = await getAppointmentsPaginated({ pageSize: 10 })

// Use FHIR path-like navigation
const appointments = result.bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Appointment')
  .map(entry => entry.resource) || []

const patients = result.bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Patient')
  .map(entry => entry.resource) || []

// Navigate using FHIR path expressions
appointments.forEach(appointment => {
  appointment.participant?.forEach(participant => {
    const reference = participant.actor?.reference
    // Find referenced resource in bundle
    const resolvedResource = result.bundle.entry
      ?.find(entry => `${entry.resource?.resourceType}/${entry.resource?.id}` === reference)
      ?.resource
  })
})
```

## Testing

Run the tests to verify the functionality:

```bash
npm test appointment-resolution
```

The test suite includes:
- Batch reference resolution
- FHIR Bundle creation
- FHIR path navigation
- Error handling scenarios
- Type safety validation

## Examples

See `appointment-examples.ts` for comprehensive usage examples including:
- Basic appointment fetching with FHIR Bundle
- FHIR path navigation examples
- Pagination with Bundle format
- Complete workflow examples
- Error handling patterns

## Migration from Individual Requests

If you're currently resolving references individually:

**Before**:
```typescript
// Multiple individual requests
const appointments = await getAppointmentsPaginated({ pageSize: 10 })
for (const appointment of appointments.data) {
  for (const participant of appointment.participant || []) {
    const resource = await client.readResource(
      participant.actor?.reference?.split('/')[0] || '',
      participant.actor?.reference?.split('/')[1] || ''
    )
  }
}
```

**After**:
```typescript
// Single integrated request with FHIR Bundle
const result = await getAppointmentsPaginated({ pageSize: 10 })
const bundle = result.bundle

// Use FHIR path navigation
const appointments = bundle.entry
  ?.filter(entry => entry.resource?.resourceType === 'Appointment')
  .map(entry => entry.resource) || []

appointments.forEach(appointment => {
  appointment.participant?.forEach(participant => {
    const reference = participant.actor?.reference
    // Find resolved resource in bundle
    const resolvedResource = bundle.entry
      ?.find(entry => `${entry.resource?.resourceType}/${entry.resource?.id}` === reference)
      ?.resource
  })
})
```

This approach is much more efficient, follows FHIR standards, and enables powerful FHIR path navigation.
