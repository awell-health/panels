export default [
  {
    name: 'Patient Details & Demographics',
    fields: [
      {
        label: 'Full Name',
        key: 'fullName',
        fhirPath: 'name',
        resourceType: 'Patient',
      },
      {
        label: 'Date of Birth',
        key: 'dateOfBirth',
        fhirPath: 'birthDate',
        resourceType: 'Patient',
      },
      {
        label: 'Gender',
        key: 'gender',
        fhirPath: 'gender',
        resourceType: 'Patient',
      },
      {
        label: 'Phone',
        key: 'phone',
        fhirPath: "telecom.where(system='phone').value",
        resourceType: 'Patient',
      },
      {
        label: 'Email',
        key: 'email',
        fhirPath: "telecom.where(system='email').value",
        resourceType: 'Patient',
      },
      {
        label: 'Address',
        key: 'address',
        fhirPath: 'address[0].line[0]',
        resourceType: 'Patient',
      },
    ],
  },
  {
    name: 'Basic Task Information',
    fields: [
      {
        label: 'Task Status',
        key: 'status',
        fhirPath: 'status',
        resourceType: 'Task',
      },
      {
        label: 'Task Intent',
        key: 'intent',
        fhirPath: 'intent',
        resourceType: 'Task',
      },
      {
        label: 'Priority',
        key: 'priority',
        fhirPath: 'priority',
        resourceType: 'Task',
      },
      {
        label: 'Description',
        key: 'description',
        fhirPath: 'description',
        resourceType: 'Task',
      },
      {
        label: 'Created Date',
        key: 'created',
        fhirPath: 'created',
        resourceType: 'Task',
      },
      {
        label: 'Last Modified',
        key: 'lastModified',
        fhirPath: 'meta.lastUpdated',
        resourceType: 'Task',
      },
    ],
  },
]
