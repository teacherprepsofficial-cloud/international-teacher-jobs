'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      router.push('/pricing')
    }
  }, [sessionId, router])

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 text-center max-w-md">
      <div className="bg-green-50 border-2 border-green-200 rounded-[15px] p-5 sm:p-8">
        <div className="text-4xl sm:text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-text-muted mb-2">
          Your subscription is active.
        </p>
        <p className="text-text-muted mb-8">
          Check your email for login credentials — we sent your temporary password to the email you used at checkout.
        </p>

        <div className="space-y-3">
          <Link href="/school/login" className="block btn-primary">
            Go to Login
          </Link>
          <Link href="/" className="block btn-outline">
            Back to Job Board
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
