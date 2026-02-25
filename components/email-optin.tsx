'use client'

import { useState } from 'react'

export default function EmailOptin() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

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
    <div className="bg-card-bg border border-card-border rounded-[15px] p-4 sm:p-5">
      <h3 className="text-sm font-bold mb-1.5 sm:mb-2">Get International Teacher Jobs sent to you each week!</h3>
      <p className="text-xs text-text-muted mb-3 sm:mb-4">
        New listings delivered every Thursday. Free. Unsubscribe anytime.
      </p>

      {status === 'success' ? (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-[15px] p-3">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="w-full px-4 py-2.5 border border-card-border rounded-full text-sm"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-full bg-text-primary text-white font-semibold py-2.5 text-sm transition-all duration-200 hover:scale-[1.03] disabled:opacity-50 min-h-[44px]"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe Now'}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-600">{message}</p>
          )}
        </form>
      )}
    </div>
  )
}
