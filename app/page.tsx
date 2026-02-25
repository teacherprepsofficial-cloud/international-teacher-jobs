'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCountriesForFilter } from '@/lib/countries'
import { getRegionsForFilter } from '@/lib/regions'
import EmailOptin from '@/components/email-optin'

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
  publishedAt?: string
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

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const getJobDate = (job: Job) => job.publishedAt || job.createdAt

  const shouldShowDate = (index: number) => {
    if (index === 0) return true
    const currentJobDate = new Date(getJobDate(jobs[index]))
    const previousJobDate = new Date(getJobDate(jobs[index - 1]))
    return !isSameDay(currentJobDate, previousJobDate)
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 md:py-8">
      {/* Filters */}
      <div className="mb-3 md:mb-8 grid grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-4 items-center">
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full md:w-auto text-xs sm:text-sm">
          <option value="">Region</option>
          {regions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>

        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full md:w-auto text-xs sm:text-sm">
          <option value="">Country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.emoji} {country.name}
            </option>
          ))}
        </select>

        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full md:w-auto text-xs sm:text-sm">
          {POSITION_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {(selectedRegion || selectedCountry || selectedCategory) && (
          <button onClick={handleClear} className="col-span-3 md:col-span-1 text-sm text-accent-blue hover:underline py-1">
            Clear Filters
          </button>
        )}
      </div>

      {/* Main content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Mobile email optin — above job list */}
        <div className="lg:hidden">
          <EmailOptin />
        </div>

        {/* Job Listings */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card-bg border border-card-border rounded-[15px] p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-text-muted py-12">No jobs found matching your criteria.</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {jobs.map((job, index) => {
                const showDate = shouldShowDate(index)

                return (
                  <div key={job._id}>
                    {showDate && (
                      <div className="mb-2 sm:mb-3 flex items-center justify-between">
                        <span className="text-xs text-text-muted font-semibold hidden sm:inline">
                          {formatDate(getJobDate(job))}
                        </span>
                        <span className="text-xs text-text-muted font-semibold sm:hidden">
                          {formatDateShort(getJobDate(job))}
                        </span>
                        {index === 0 && (
                          <span className="text-xs font-semibold">
                            Total Jobs: <span className="text-accent-blue">{totalLiveCount.toLocaleString()}</span>
                          </span>
                        )}
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
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              {job.subscriptionTier === 'premium' && (
                                <span className="inline-block bg-premium text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                  PREMIUM
                                </span>
                              )}
                              {job.subscriptionTier === 'standard' && (
                                <span className="inline-block bg-featured text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white">
                                  FEATURED
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-semibold truncate">
                                {job.schoolName} · {job.city}, {job.country}
                              </span>
                              <span className="text-base sm:text-lg">{(() => {
                                const country = countries.find((c) => c.code === job.countryCode)
                                return country?.emoji || '🌍'
                              })()}</span>
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold mb-1">{job.position}</h3>
                            <p className="text-xs sm:text-sm text-text-muted">
                              {job.contractType} · {job.startDate}
                              {job.salary && ` · ${job.salary}`}
                            </p>
                          </div>
                          <div className="hidden sm:block sm:text-right shrink-0">
                            <span className="btn-secondary text-xs">Learn More</span>
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
          <div className="mt-8 sm:mt-12 border-t border-card-border pt-6 sm:pt-8 text-center">
            <p className="text-sm text-text-muted mb-3">Are you an international school looking to hire?</p>
            <Link href="/pricing" className="btn-primary text-sm">
              View Pricing Plans
            </Link>
          </div>
        </div>

        {/* Sidebar — sticky email opt-in */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20">
            <EmailOptin />
          </div>
        </div>
      </div>
    </div>
  )
}
