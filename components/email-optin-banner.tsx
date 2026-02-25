'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function EmailOptinBanner() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Skip on homepage (has sidebar version) and admin/school pages
  if (pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/school') || pathname.startsWith('/checkout')) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Check your email to confirm!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong')
    }
  }

  return (
    <div className="border-t border-card-border bg-card-bg">
      <div className="container mx-auto px-4 py-6">
        {status === 'success' ? (
          <p className="text-center text-sm text-green-700">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="text-sm font-semibold">Get new jobs delivered weekly!</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="px-4 py-2 border border-card-border rounded-full text-sm w-full sm:w-64"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-full bg-text-primary text-white font-semibold px-6 py-2 text-sm transition-all duration-200 hover:scale-[1.03] disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe Now'}
            </button>
            {status === 'error' && (
              <p className="text-xs text-red-600">{message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
