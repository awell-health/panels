import type { WorklistTask } from "@/hooks/use-medplum-store";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Fragment, useState } from "react";
import { RenderWithCopy } from "./RenderWithCopy";
import { calculateAge } from "./utils";
import ExpandableCard from "./ExpandableCard";

interface StaticContentProps {
  task: WorklistTask;
}

// Function to check if a string is valid JSON
const isJSON = (str: string): boolean => {
  if (typeof str !== "string") return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// More comprehensive isObject function
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const isObject = (value: any): boolean => {
  // Check if value is null (typeof null === 'object' in JavaScript)
  if (value === null) return false;

  // Check if it's an object type
  if (typeof value !== "object") return false;

  // Check if it's not an array
  if (Array.isArray(value)) return false;

  // Check if it's not a Date, RegExp, or other built-in objects if you want to exclude them
  // if (value instanceof Date) return false;
  // if (value instanceof RegExp) return false;

  return true;
};

const StaticContent = ({ task }: StaticContentProps) => {
  const getTitle = (url: string) => {
    return url?.split("/").pop()?.toUpperCase();
  };

  const [searchQuery, setSearchQuery] = useState("");

  const { patient, extension } = task;

  const HighlightText = ({ text }: { text: string | undefined }) => {
    const shouldHighlight = text && searchQuery.length > 2;

    if (shouldHighlight && text) {
      const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
      return parts.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <Fragment key={`${part}-${index}`}>
          {part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span className="bg-yellow-200">{part}</span>
          ) : (
            part
          )}
        </Fragment>
      ));
    }

    return text;
  };

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const rederArrayValue = (value: any[]) => {
    return (
      <div className="mb-4 mt-1">
        <ExpandableCard title={`Show ${value.length} items`}>
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={`${item.id}-${index}`} className="">
                {renderValue(item)}
              </div>
            ))}
          </div>
        </ExpandableCard>
      </div>
    );
  };

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const renderObjectValue = (value: Record<string, any>) => {
    const keysLength = Object.keys(value).length;
    const visibleObject = 5;

    if (keysLength === 0) {
      return "-";
    }

    return (
      <div className="mb-4 mt-1 border-l pl-3 pb-2 border-b border-gray-200 space-y-2">
        {Object.keys(value)
          .slice(0, visibleObject)
          .map((key) => renderKeyValue(key, value[key]))}
        {keysLength > visibleObject && (
          <div className="mt-2">
            <ExpandableCard
              title={`Show ${keysLength - visibleObject} more items`}
            >
              <div className="space-y-2 my-2">
                {Object.keys(value)
                  .slice(visibleObject)
                  .map((key) => renderKeyValue(key, value[key]))}
              </div>
            </ExpandableCard>
          </div>
        )}
      </div>
    );
  };

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const renderValue = (value: string | Record<string, any>, key?: string) => {
    if (value === "[object Object]") {
      return "unknown";
    }

    if (Array.isArray(value)) {
      return rederArrayValue(value);
    }

    if (isObject(value)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return renderObjectValue(value as Record<string, any>);
    }

    if (isJSON(value as string)) {
      const jsonValue = JSON.parse(value as string);
      const jsonValueKeys = Object.keys(jsonValue);

      if (jsonValueKeys.length === 0) {
        return renderValue(jsonValue);
      }

      return renderObjectValue(jsonValue);
    }

    const containsHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

    if (containsHTML(value as string)) {
      return (
        <RenderWithCopy text={value as string}>
          <div
            className="text-sm "
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{
              __html: value.replaceAll("\n", "<br />"),
            }}
          />
        </RenderWithCopy>
      );
    }

    if (key === "status") {
      const statuses = {
        completed: "badge-success",
        successful: "badge-success",
        cancelled: "badge-error",
        pending: "badge-warning",
        in_progress: "badge-info",
        on_hold: "badge-warning",
        entered_in_error: "badge-error",
        unknown: "badge-error",
      };
      return (
        <span
          className={`badge ${
            statuses[value as keyof typeof statuses]
          } badge-xs`}
        >
          {value.toString()}{" "}
        </span>
      );
    }

    if (value) {
      return (
        <RenderWithCopy text={value as string}>
          <HighlightText text={value as string} />
        </RenderWithCopy>
      );
    }

    return "-";
  };

  const renderKeyValue = (key: string, value: string) => {
    return (
      <div>
        <strong>
          <RenderWithCopy text={key}>
            <HighlightText text={key} />
          </RenderWithCopy>
        </strong>
        {renderValue(value, key)}
      </div>
    );
  };

  const arrayDataComponent = (
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    data: Record<string, any> | Array<Record<string, any>>
  ) => {
    if (Array.isArray(data)) {
      return (
        <>
          {data.map((item, index) => (
            <ExpandableCard
              key={`${item.id}-${index}`}
              title={getTitle(item?.url) ?? ""}
              defaultExpanded={searchQuery.length > 0}
            >
              <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-700 space-y-2 mt-3">
                  {item?.extension?.map(
                    (
                      ext: { url: string; valueString: string },
                      index: number
                    ) => {
                      const { valueString, url } = ext;

                      if (Array.isArray(valueString)) {
                        return arrayDataComponent(valueString);
                      }

                      return renderKeyValue(url, valueString);
                    }
                  )}
                </div>
              </div>
            </ExpandableCard>
          ))}
        </>
      );
    }
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Search Box */}
      <div className="relative mb-4">
        <label className="input w-full">
          <Search className="text-gray-400" />
          <input
            type="search"
            required
            placeholder="Search context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="text-xs text-gray-500 mt-1">
          Type at least 3 characters to search
        </div>
      </div>

      <div className="space-y-3">
        {/* Patient Information */}
        <ExpandableCard
          title="Patient Information"
          summary={`${patient?.name}, ${calculateAge(
            patient?.birthDate
          )} years`}
          defaultExpanded={true}
        >
          <div className="space-y-2 text-sm mt-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Full Name:</span>
              <span className="text-gray-900 font-medium">
                <RenderWithCopy text={patient?.name}>
                  <HighlightText text={patient?.name} />
                </RenderWithCopy>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Age:</span>
              <span className="text-gray-900">
                <RenderWithCopy
                  text={`${calculateAge(patient?.birthDate)} years`}
                >
                  <HighlightText
                    text={`${calculateAge(patient?.birthDate)} years`}
                  />
                </RenderWithCopy>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MRN:</span>
              <span className="text-gray-900">
                <RenderWithCopy text={patient?.id}>
                  <HighlightText text={patient?.id} />
                </RenderWithCopy>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DOB:</span>
              <span className="text-gray-900">
                <RenderWithCopy text={patient?.birthDate}>
                  <HighlightText text={patient?.birthDate} />
                </RenderWithCopy>
              </span>
            </div>
            {patient?.telecom?.map(
              (
                telecom: { id: string; system: string; value: string },
                index: number
              ) => (
                <div
                  className="flex justify-between"
                  key={`${telecom.id}-${index}`}
                >
                  <span className="text-gray-600">{telecom.system}:</span>
                  <span className="text-gray-900">
                    <RenderWithCopy text={telecom.value}>
                      <HighlightText text={telecom.value} />
                    </RenderWithCopy>
                  </span>
                </div>
              )
            )}
          </div>
        </ExpandableCard>

        {arrayDataComponent(extension)}

        {/* <h2 className="text-lg font-bold">MOCKED CONTENT</h2> */}

        {/* Discharge Summary */}
        {/* <ExpandableCard
          title="Discharge Summary"
          summary="Community-acquired pneumonia, 4-day stay"
        >
          <div className="text-sm text-gray-700 space-y-2 mt-3">
            <p>
              <strong>Primary Diagnosis:</strong> Community-acquired pneumonia
            </p>
            <p>
              <strong>Secondary Diagnoses:</strong> COPD exacerbation
            </p>
            <p>
              <strong>Treatment Received:</strong> IV antibiotics (Ceftriaxone),
              oxygen therapy, bronchodilators
            </p>
            <p>
              <strong>Length of Stay:</strong> 4 days (June 16-20, 2025)
            </p>
            <p>
              <strong>Discharge Condition:</strong> Stable, improved respiratory
              status
            </p>
            <p>
              <strong>Discharge Instructions:</strong> Continue oral
              antibiotics, use inhaler as needed, follow up with PCP in 1 week
            </p>
          </div>
        </ExpandableCard> */}

        {/* Current Medications */}
        {/* <ExpandableCard
          title="Current Medications"
          summary="2 active prescriptions"
        >
          <div className="space-y-3 mt-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-sm">Amoxicillin 500mg</div>
              <div className="text-gray-600 text-sm">3x daily for 7 days</div>
              <div className="text-xs text-gray-500 mt-1">
                Prescribed: June 20, 2025
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-sm">Albuterol Inhaler</div>
              <div className="text-gray-600 text-sm">
                2 puffs every 4-6 hours as needed
              </div>
              <div className="text-xs text-gray-500 mt-1">
                For shortness of breath
              </div>
            </div>
          </div>
        </ExpandableCard> */}

        {/* Risk Factors */}
        {/* <ExpandableCard
          title="Risk Factors"
          summary="3 identified risk factors"
        >
          <div className="space-y-2 text-sm mt-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>
                <strong>High Risk:</strong> Recent hospitalization for pneumonia
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>
                <strong>Moderate Risk:</strong> Age 65+ with COPD history
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>
                <strong>Moderate Risk:</strong> Lives alone (spouse available)
              </span>
            </div>
          </div>
        </ExpandableCard> */}

        {/* Care Team */}
        {/* <ExpandableCard title="Care Team" summary="4 team members assigned">
          <div className="space-y-3 mt-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">Dr. Smith</div>
                <div className="text-gray-600 text-xs">
                  Primary Care Physician
                </div>
              </div>
              <div className="text-xs text-gray-500">(555) 234-5678</div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">Sarah Johnson, RN</div>
                <div className="text-gray-600 text-xs">Care Coordinator</div>
              </div>
              <div className="text-xs text-gray-500">(555) 345-6789</div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">Mike Chen</div>
                <div className="text-gray-600 text-xs">Discharge Planner</div>
              </div>
              <div className="text-xs text-gray-500">(555) 456-7890</div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">Dr. Martinez</div>
                <div className="text-gray-600 text-xs">Attending Physician</div>
              </div>
              <div className="text-xs text-gray-500">(555) 567-8901</div>
            </div>
          </div>
        </ExpandableCard> */}

        {/* Insurance & Coverage */}
        {/* <ExpandableCard
          title="Insurance & Coverage"
          summary="Medicare Primary, Coverage verified"
        >
          <div className="space-y-2 text-sm mt-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Primary Insurance:</span>
              <span className="text-gray-900">Medicare Part A & B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member ID:</span>
              <span className="text-gray-900">1EG4-TE5-MK73</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Coverage Status:</span>
              <span className="text-green-600">Active & Verified</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Copay:</span>
              <span className="text-gray-900">$0 (Medicare covered)</span>
            </div>
          </div>
        </ExpandableCard> */}
      </div>
    </div>
  );
};

export default StaticContent;
