import NikoflixLogo from "./NikoflixLogo"

export default function AuthLayout({ title, children, showBackToLogin }) {
  return (
    <div className="min-h-screen flex flex-col auth-gradient">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary/30 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Logo top-left */}
      <div className="p-6 z-10">
        <NikoflixLogo />
      </div>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center px-4 -mt-20 z-10">
        <div className="w-full max-w-md auth-card p-8 rounded-xl shadow-2xl space-y-6">
          {title && (
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {title}
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full"></div>
            </div>
          )}

          <div className="space-y-6">{children}</div>

          {showBackToLogin && (
            <div className="pt-4 text-center">
              <a
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200 group"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
