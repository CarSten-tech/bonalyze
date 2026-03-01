import { Receipt } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-shell min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="auth-logo-badge flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Receipt className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="auth-logo-word text-2xl font-bold">Bonalyze</span>
      </div>

      {/* Auth Card Container */}
      <div className="auth-shell-card w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="auth-shell-footer mt-8 text-center text-sm text-muted-foreground">
        Deine Belege. Intelligent analysiert.
      </p>
    </div>
  )
}
