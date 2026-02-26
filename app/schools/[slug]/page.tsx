'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getCountryByCode } from '@/lib/countries'
import { SCHOOL_TYPE_LABELS } from '@/lib/school-utils'

interface SchoolProfile {
  _id: string
  name: string
  slug: string
  country: string
  countryCode: string
  city: string | null
  region: string
  description?: string
  website?: string
  logo?: string
  photos: string[]
  curriculum: string[]
  gradeRange?: string
  schoolType?: string
  studentCount?: number
  foundedYear?: number
  languages: string[]
  accreditations: string[]
  benefits: string[]
  contactEmail?: string
  careerPageUrl?: string
  claimed: boolean
  isVerified: boolean
  profileCompleteness: number
}

interface JobListing {
  _id: string
  position: string
  positionCategory: string
  city: string
  country: string
  contractType: string
  startDate: string
  salary?: string
  publishedAt?: string
}

export default function SchoolProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [school, setSchool] = useState<SchoolProfile | null>(null)
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolRes, authRes] = await Promise.all([
          fetch(`/api/schools/${slug}`),
          fetch('/api/school/me'),
        ])

        if (!schoolRes.ok) {
          router.push('/schools')
          return
        }

        const data = await schoolRes.json()
        setSchool(data.school)
        setJobs(data.jobs || [])
        setIsLoggedIn(authRes.ok)
      } catch (error) {
        console.error('Failed to fetch school:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, router])

  const handleClaim = async () => {
    setClaiming(true)
    setClaimError('')
    try {
      const res = await fetch(`/api/schools/${slug}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (res.ok) {
        // Refresh school data
        const schoolRes = await fetch(`/api/schools/${slug}`)
        const refreshed = await schoolRes.json()
        setSchool(refreshed.school)
      } else {
        setClaimError(data.error || 'Failed to claim school')
      }
    } catch (error) {
      setClaimError('An error occurred. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-6" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">School not found.</p>
        <Link href="/schools" className="text-accent-blue hover:underline text-sm mt-2 inline-block">
          ← Back to directory
        </Link>
      </div>
    )
  }

  const countryData = getCountryByCode(school.countryCode)
  const flag = countryData?.emoji || '🌍'
  const location = school.city ? `${school.city}, ${school.country}` : school.country

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 md:py-8 max-w-4xl">
      {/* Back link */}
      <Link href="/schools" className="text-sm text-accent-blue hover:underline mb-4 inline-block">
        ← Back to directory
      </Link>

      {/* Header */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-4 sm:p-6 mb-4">
        <div className="flex items-start gap-4">
          {/* Logo or initial */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[10px] bg-gray-100 border border-card-border flex items-center justify-center shrink-0">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-full h-full object-cover rounded-[10px]" />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {school.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                {school.name}
              </h1>
              {school.isVerified && (
                <span className="text-blue-600 shrink-0" title="Verified School">
                  ✓
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted">
              {flag} {location}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {school.curriculum.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Curriculum</p>
            <p className="text-sm font-semibold">{school.curriculum.join(', ')}</p>
          </div>
        )}
        {school.gradeRange && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Grade Range</p>
            <p className="text-sm font-semibold">{school.gradeRange}</p>
          </div>
        )}
        {school.schoolType && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Type</p>
            <p className="text-sm font-semibold">{SCHOOL_TYPE_LABELS[school.schoolType] || school.schoolType}</p>
          </div>
        )}
        {school.foundedYear && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Founded</p>
            <p className="text-sm font-semibold">{school.foundedYear}</p>
          </div>
        )}
        {school.studentCount && school.studentCount > 0 && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Students</p>
            <p className="text-sm font-semibold">{school.studentCount.toLocaleString()}</p>
          </div>
        )}
        {school.languages.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-[15px] p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Languages</p>
            <p className="text-sm font-semibold">{school.languages.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {school.description && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-4 sm:p-6 mb-4">
          <h2 className="text-sm font-bold mb-2">About</h2>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
            {school.description}
          </p>
        </div>
      )}

      {/* Accreditations */}
      {school.accreditations.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-4 mb-4">
          <h2 className="text-sm font-bold mb-2">Accreditations</h2>
          <div className="flex flex-wrap gap-2">
            {school.accreditations.map((a) => (
              <span key={a} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      {school.benefits.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-4 mb-4">
          <h2 className="text-sm font-bold mb-2">Benefits</h2>
          <div className="flex flex-wrap gap-2">
            {school.benefits.map((b) => (
              <span key={b} className="text-xs px-2 py-1 rounded bg-green-50 text-green-800 border border-green-200">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-4 sm:p-6 mb-4">
        <h2 className="text-sm font-bold mb-3">
          Open Positions {jobs.length > 0 && `(${jobs.length})`}
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-text-muted">No open positions at this time.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job._id} href={`/jobs/${job._id}`}>
                <div className="border border-card-border rounded p-3 hover:border-gray-400 transition-colors">
                  <h3 className="text-sm font-semibold mb-1">{job.position}</h3>
                  <p className="text-xs text-text-muted">
                    {job.contractType} · {job.startDate}
                    {job.salary && ` · ${job.salary}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section */}
      {(school.website || school.careerPageUrl || school.contactEmail) && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-4 mb-4">
          <h2 className="text-sm font-bold mb-2">Contact</h2>
          <div className="space-y-2">
            {school.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-accent-blue hover:underline"
              >
                Website →
              </a>
            )}
            {school.careerPageUrl && (
              <a
                href={school.careerPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-accent-blue hover:underline"
              >
                Careers Page →
              </a>
            )}
            {school.contactEmail && (
              <a
                href={`mailto:${school.contactEmail}`}
                className="block text-sm text-accent-blue hover:underline"
              >
                {school.contactEmail}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Claim CTA (if unclaimed and user is logged in) */}
      {!school.claimed && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-4 sm:p-6 text-center">
          <p className="text-sm text-text-muted mb-2">
            Do you represent this school?
          </p>
          {isLoggedIn ? (
            <>
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {claiming ? 'Claiming...' : 'Claim This School'}
              </button>
              {claimError && (
                <p className="text-xs text-red-600 mt-2">{claimError}</p>
              )}
            </>
          ) : (
            <Link href="/school/login" className="btn-primary text-sm inline-block">
              Log in to Claim This School
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
