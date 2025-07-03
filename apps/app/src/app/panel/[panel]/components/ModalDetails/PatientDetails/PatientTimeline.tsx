import type { WorklistPatient } from "@/hooks/use-medplum-store";
import { Bold, Italic, Link, List } from "lucide-react";
import { useState } from "react";

interface Props {
  patient: WorklistPatient;
}

const PatientTimeline = ({ patient }: Props) => {
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; user: string; timestamp: string }>
  >([]);
  const [newMessage, setNewMessage] = useState("");

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                Hospital Discharge
              </div>
              <div className="text-gray-600 text-sm">
                June 20, 2025 - 2:30 PM
              </div>
            </div>
            <div className="text-gray-500 mt-1">
              Discharged from St. Mary's Hospital after pneumonia treatment
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                Medication Prescribed
              </div>
              <div className="text-gray-600 text-sm">
                June 20, 2025 - 2:45 PM
              </div>
            </div>
            <div className="text-gray-500 mt-1">
              Amoxicillin 500mg prescribed for 7 days
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                Follow-up Scheduled
              </div>
              <div className="text-gray-600 text-sm">
                June 20, 2025 - 3:00 PM
              </div>
            </div>
            <div className="text-gray-500 mt-1">
              Appointment with Dr. Smith scheduled for June 27, 2025
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                Care Coordinator Assigned
              </div>
              <div className="text-gray-600 text-sm">
                June 21, 2025 - 9:00 AM
              </div>
            </div>
            <div className="text-gray-500 mt-1">
              Sarah Johnson assigned as care coordinator
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                Wellness Check Required
              </div>
              <div className="text-gray-600 text-sm">
                June 25, 2025 - Current
              </div>
            </div>
            <div className="text-gray-500 mt-1">
              72-hour post-discharge wellness check needed
            </div>
          </div>
        </div>

        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-900">Team Message</div>
                <div className="text-gray-600 text-sm">{message.timestamp}</div>
              </div>
              <div className="text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                {message.text}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                by {message.user}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t">
        <div className="border border-gray-200 rounded-lg">
          <textarea
            placeholder="Add a message to the timeline..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="border-none resize-none focus:ring-0 p-2 textarea textarea-neutral"
            rows={3}
          />
          <div className="flex justify-end p-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                if (newMessage.trim()) {
                  const newMsg = {
                    id: Date.now().toString(),
                    text: newMessage,
                    user: "Current User",
                    timestamp: new Date().toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                  };
                  setMessages([newMsg, ...messages]);
                  setNewMessage("");
                }
              }}
              className="btn btn-primary btn-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTimeline;
