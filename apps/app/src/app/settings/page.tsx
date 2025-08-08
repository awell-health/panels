'use client'

import { DateTimeFormatSelector } from '@/components/DateTimeFormatSelector'
import { Settings, Calendar, Clock, Palette } from 'lucide-react'
import PageNavigation from '../../components/PageNavigation'

export default function Page() {
  return (
    <PageNavigation
      breadcrumb={[{ label: 'Settings' }]}
      title="Settings"
      description="Customize your settings to suit your needs."
    >
      <div className="space-y-4">
        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Date & Time Formatting Section */}
          <div className="card card-border border-gray-200 bg-base-100">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Date & Time Formatting
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Customize how dates and times are displayed throughout the
                    application
                  </p>
                </div>
              </div>

              <DateTimeFormatSelector />
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="card card-border border-gray-200 bg-base-100">
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg flex-shrink-0">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
                <p className="text-gray-700 text-sm mb-3">
                  If you need assistance with any settings or have questions
                  about the application, please don't hesitate to reach out to
                  our support team.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    // TODO: Implement help/support functionality
                    console.log('Help requested')
                  }}
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageNavigation>
  )
}
