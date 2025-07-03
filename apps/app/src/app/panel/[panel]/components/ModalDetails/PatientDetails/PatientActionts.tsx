import type { WorklistPatient } from "@/hooks/use-medplum-store";

interface Props {
  patient: WorklistPatient;
}

const PatientActions = ({ patient }: Props) => {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-600 h-1 rounded-full"
            style={{ width: "60%" }}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Post-Discharge Wellness Check
          </h4>
          <p className="text-sm text-blue-800 mb-4">
            Conduct a comprehensive wellness check within 72 hours of hospital
            discharge for pneumonia patients.
          </p>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Medication Adherence */}
            <div>
              <label
                htmlFor="medication-adherence"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Medication adherence
              </label>
              <select className="select">
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Unsure</option>
              </select>
            </div>

            {/* New Symptoms */}
            <div>
              <label
                htmlFor="new-symptoms"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New symptoms
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-neutral"
                    id="fever"
                  />
                  <label htmlFor="fever" className="text-sm">
                    Fever
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-neutral"
                    id="shortness"
                  />
                  <label htmlFor="shortness" className="text-sm">
                    Shortness of breath
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-neutral"
                    id="dizziness"
                  />
                  <label htmlFor="dizziness" className="text-sm">
                    Dizziness
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-neutral"
                    id="other"
                  />
                  <label htmlFor="other" className="text-sm">
                    Other
                  </label>
                </div>
              </div>
            </div>

            {/* Blood Pressure */}
            <div>
              <label
                htmlFor="blood-pressure"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Blood pressure
              </label>
              <div className="flex gap-2">
                <input placeholder="Systolic" className="flex-1 input" />
                <span className="flex items-center text-gray-500">/</span>
                <input placeholder="Diastolic" className="flex-1 input" />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label
                htmlFor="additional-notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional notes
              </label>
              <textarea
                id="additional-notes"
                placeholder="Enter any additional observations or notes..."
                className="min-h-[80px] textarea textarea-neutral"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="btn btn-success btn-sm">
                Complete
              </button>
              <button type="button" className="btn btn-warning btn-sm">
                Snooze
              </button>
              <button type="button" className="btn btn-error btn-sm">
                Escalate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientActions;
