'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { COUNTRIES } from '@/lib/countries'

interface Job {
  _id: string
  schoolName: string
  city: string
  country: string
  countryCode: string
  position: string
  positionCategory: string
  description: string
  applicationUrl: string
  salary?: string
  contractType: string
  startDate: string
  createdAt: string
}

export default function JobDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const isPreview = searchParams.get('preview') === 'true'
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const url = isPreview ? `/api/jobs/${jobId}?preview=true` : `/api/jobs/${jobId}`
        const response = await fetch(url)
        if (!response.ok) {
          setError('Job not found')
          setLoading(false)
          return
        }
        const data = await response.json()
        setJob(data)
      } catch (err) {
        console.error('Failed to fetch job:', err)
        setError('Failed to load job details')
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-text-muted">Loading...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-text-muted mb-4">{error || 'Job not found'}</p>
        <Link href="/" className="btn-secondary">
          Back to Job Board
        </Link>
      </div>
    )
  }

  const countryInfo = COUNTRIES.find((c) => c.code === job.countryCode)
  const emoji = countryInfo?.emoji || '🌍'

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/" className="text-accent-blue hover:underline text-sm mb-6 block">
        ← Back to Job Board
      </Link>

      {isPreview && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-sm font-semibold text-center">
          PREVIEW — This listing is pending approval and not yet public
        </div>
      )}

      <div className="bg-card-bg border border-card-border rounded-[15px] p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.position}</h1>
              <p className="text-lg text-text-muted">
                {job.schoolName} · {job.city}, {job.country}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-card-border">
          <div>
            <p className="text-xs text-text-muted font-semibold mb-1">Contract Type</p>
            <p className="font-semibold">{job.contractType}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted font-semibold mb-1">Start Date</p>
            <p className="font-semibold">{job.startDate}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted font-semibold mb-1">Category</p>
            <p className="font-semibold capitalize">{job.positionCategory.replace('-', ' ')}</p>
          </div>
          {job.salary && (
            <div>
              <p className="text-xs text-text-muted font-semibold mb-1">Salary</p>
              <p className="font-semibold">{job.salary}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Position Details</h2>
          <p className="text-text-muted whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>

        {/* Apply Button */}
        <div>
          <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center">
            Apply Now
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-card-border text-xs text-text-muted text-center">
          <p>Posted on {new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  )
}
