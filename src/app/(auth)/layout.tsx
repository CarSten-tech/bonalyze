import { Receipt } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Receipt className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">Bonalyze</span>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Deine Belege. Intelligent analysiert.
      </p>
    </div>
  )
}
