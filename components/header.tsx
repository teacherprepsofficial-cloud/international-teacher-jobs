'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const isSchoolRoute = pathname?.startsWith('/school')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/school/me')
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false))
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-card-border bg-card-bg/95 backdrop-blur-md supports-[backdrop-filter]:bg-card-bg/80">
        <div className="container mx-auto flex items-center justify-between px-4 h-14 md:h-16">
          <Link href="/" className="text-base md:text-lg font-bold text-text-primary truncate mr-4">
            International Teacher Jobs
          </Link>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 rounded-lg active:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span className={`block h-0.5 w-5 bg-text-primary rounded-full transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 w-5 bg-text-primary rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-text-primary rounded-full transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
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
                <Link
                  href={isLoggedIn ? '/school/dashboard' : '/pricing'}
                  className="btn-primary text-sm"
                >
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

      {/* Mobile overlay + slide-down menu */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30" onClick={closeMenu} />

        {/* Menu panel */}
        <div
          className={`absolute top-14 left-0 right-0 bg-card-bg border-b border-card-border shadow-lg transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          {!isSchoolRoute && (
            <div className="flex flex-col px-4 pb-4">
              <Link
                href="/contact"
                onClick={closeMenu}
                className="flex items-center py-3.5 text-sm font-medium text-text-primary border-b border-card-border active:bg-gray-50 transition-colors"
              >
                Contact
              </Link>
              <Link
                href="/pricing"
                onClick={closeMenu}
                className="flex items-center py-3.5 text-sm font-medium text-text-primary border-b border-card-border active:bg-gray-50 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/school/login"
                onClick={closeMenu}
                className="flex items-center py-3.5 text-sm font-medium text-text-primary border-b border-card-border active:bg-gray-50 transition-colors"
              >
                School Login
              </Link>
              <Link
                href={isLoggedIn ? '/school/dashboard' : '/pricing'}
                onClick={closeMenu}
                className="btn-primary text-sm text-center mt-4"
              >
                Post a Job
              </Link>
            </div>
          )}

          {isSchoolRoute && (
            <div className="flex flex-col px-4 pb-4">
              <Link
                href="/school/dashboard"
                onClick={closeMenu}
                className="flex items-center py-3.5 text-sm font-medium text-text-primary border-b border-card-border active:bg-gray-50 transition-colors"
              >
                Dashboard
              </Link>
              <form action="/api/school/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center py-3.5 text-sm font-medium text-text-primary w-full text-left active:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
