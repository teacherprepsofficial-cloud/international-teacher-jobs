'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCountriesForFilter } from '@/lib/countries'
import { getRegionsForFilter } from '@/lib/regions'

interface Job {
  _id: string
  schoolName: string
  city: string
  country: string
  countryCode: string
  position: string
  positionCategory: string
  description: string
  contractType: string
  startDate: string
  salary?: string
  subscriptionTier: 'basic' | 'standard' | 'premium'
  createdAt: string
}

const POSITION_CATEGORIES = [
  { value: '', label: 'Position' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'middle-school', label: 'Middle School' },
  { value: 'high-school', label: 'High School' },
  { value: 'admin', label: 'Administration' },
  { value: 'support-staff', label: 'Support Staff' },
]

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [totalLiveCount, setTotalLiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const countries = getCountriesForFilter()
  const regions = getRegionsForFilter()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedRegion) params.append('region', selectedRegion)
        if (selectedCountry) params.append('country', selectedCountry)
        if (selectedCategory) params.append('category', selectedCategory)

        const res = await fetch(`/api/jobs?${params.toString()}`)
        const data = await res.json()
        setJobs(data.jobs || [])
        setTotalLiveCount(data.totalLiveCount || 0)
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [selectedRegion, selectedCountry, selectedCategory])

  const handleClear = () => {
    setSelectedRegion('')
    setSelectedCountry('')
    setSelectedCategory('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const shouldShowDate = (index: number) => {
    if (index === 0) return true
    const currentJobDate = new Date(jobs[index].createdAt)
    const previousJobDate = new Date(jobs[index - 1].createdAt)
    return !isSameDay(currentJobDate, previousJobDate)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Date + Job Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-muted">{today}</p>
        <p className="text-sm font-semibold">
          Total Jobs: <span className="text-accent-blue">{totalLiveCount.toLocaleString()}</span>
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-4 items-center">
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
          <option value="">Region</option>
          {regions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>

        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
          <option value="">Country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.emoji} {country.name}
            </option>
          ))}
        </select>

        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          {POSITION_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {(selectedRegion || selectedCountry || selectedCategory) && (
          <button onClick={handleClear} className="text-sm text-accent-blue hover:underline">
            Clear Filters
          </button>
        )}
      </div>

      {/* Job Listings */}
      {loading ? (
        <div className="text-center text-text-muted">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-text-muted">No jobs found matching your criteria.</div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => {
            const jobDate = new Date(job.createdAt)
            const showDate = shouldShowDate(index)

            return (
              <div key={job._id}>
                {showDate && (
                  <div className="mb-3 text-xs text-text-muted font-semibold">
                    {formatDate(job.createdAt)}
                  </div>
                )}
                <Link href={`/jobs/${job._id}`}>
                  <div
                    className={`job-card ${
                      job.subscriptionTier === 'premium'
                        ? 'premium'
                        : job.subscriptionTier === 'standard'
                          ? 'featured'
                          : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {job.subscriptionTier === 'premium' && (
                            <span className="inline-block bg-premium text-xs font-bold px-2 py-1 rounded">
                              PREMIUM
                            </span>
                          )}
                          {job.subscriptionTier === 'standard' && (
                            <span className="inline-block bg-featured text-xs font-bold px-2 py-1 rounded text-white">
                              FEATURED
                            </span>
                          )}
                          <span className="text-sm font-semibold">
                            {job.schoolName} · {job.city}, {job.country}
                          </span>
                          <span className="text-lg">{(() => {
                            const country = countries.find((c) => c.code === job.countryCode)
                            return country?.emoji || '🌍'
                          })()}</span>
                        </div>
                        <h3 className="text-base font-semibold mb-1">{job.position}</h3>
                        <p className="text-sm text-text-muted">
                          {job.contractType} · {job.startDate}
                          {job.salary && ` · ${job.salary}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <button className="btn-secondary text-xs">Learn More</button>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* School CTA */}
      <div className="mt-12 border-t border-card-border pt-8 text-center">
        <p className="text-sm text-text-muted mb-3">Are you an international school looking to hire?</p>
        <Link href="/pricing" className="btn-primary text-sm">
          View Pricing Plans
        </Link>
      </div>
    </div>
  )
}
