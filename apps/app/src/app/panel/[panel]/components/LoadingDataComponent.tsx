import { Calendar, Database, Users, Clock } from 'lucide-react'

interface LoadingDataComponentProps {
  dataSource: string
}

export default function LoadingDataComponent({
  dataSource,
}: LoadingDataComponentProps) {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Loading Card */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body p-8 text-center">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary-content" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                <div className="loading loading-spinner loading-sm text-success-content" />
              </div>
            </div>

            {/* Loading Text */}
            <h2 className="card-title text-xl justify-center mb-2">
              Loading {dataSource}
            </h2>
            <p className="text-base-content/70 mb-6">
              Fetching your latest data...
            </p>

            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                  <Database className="h-3 w-3 text-success-content" />
                </div>
                <span className="text-base-content">
                  Connecting to database
                </span>
              </div>

              <div className="flex items-center space-x-3 text-sm">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <div className="loading loading-spinner loading-xs text-primary-content" />
                </div>
                <span className="text-base-content">Loading data</span>
              </div>

              <div className="flex items-center space-x-3 text-sm">
                <div className="w-5 h-5 bg-base-300 rounded-full flex items-center justify-center">
                  <Users className="h-3 w-3 text-base-content/50" />
                </div>
                <span className="text-base-content/50">
                  Resolving references
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-base-300 rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full animate-pulse"
                style={{ width: '60%' }}
              />
            </div>

            {/* Loading Tips */}
            <div className="alert alert-info">
              <Clock className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Loading Tips</div>
                <div className="text-xs">
                  This may take a moment as we're fetching and organizing your{' '}
                  {dataSource.toLowerCase()} data with all participants.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full animate-ping" />
          <div className="absolute top-1/4 -right-8 w-6 h-6 bg-secondary/20 rounded-full animate-ping animation-delay-1000" />
          <div className="absolute bottom-1/4 -left-8 w-4 h-4 bg-accent/20 rounded-full animate-ping animation-delay-2000" />
        </div>
      </div>
    </div>
  )
}
