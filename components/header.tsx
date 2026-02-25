'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const isSchoolRoute = pathname?.startsWith('/school')

  return (
    <header className="border-b border-card-border bg-card-bg">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-text-primary">
          International Teacher Jobs
        </Link>

        <nav className="flex gap-4">
          {!isSchoolRoute && (
            <>
              <Link href="/contact" className="text-sm text-accent-blue hover:underline">
                Contact
              </Link>
              <Link href="/pricing" className="text-sm text-accent-blue hover:underline">
                Pricing
              </Link>
              <Link href="/school/login" className="text-sm text-accent-blue hover:underline">
                School Login
              </Link>
              <Link href="/post-job" className="btn-primary text-sm">
                Post a Job
              </Link>
            </>
          )}

          {isSchoolRoute && (
            <>
              <Link href="/school/dashboard" className="text-sm text-accent-blue hover:underline">
                Dashboard
              </Link>
              <form action="/api/school/logout" method="POST" className="inline">
                <button type="submit" className="text-sm text-accent-blue hover:underline">
                  Logout
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
