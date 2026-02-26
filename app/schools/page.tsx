'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCountriesForFilter, getCountryByCode } from '@/lib/countries'
import { getRegionsForFilter } from '@/lib/regions'
import { CURRICULUM_OPTIONS, SCHOOL_TYPE_LABELS } from '@/lib/school-utils'

interface SchoolCard {
  _id: string
  name: string
  slug: string
  country: string
  countryCode: string
  city: string | null
  region: string
  curriculum: string[]
  schoolType?: string
  isVerified: boolean
  claimed: boolean
  profileCompleteness: number
  logo?: string
  activeJobCount: number
}

const SCHOOL_TYPE_OPTIONS = [
  { value: '', label: 'School Type' },
  { value: 'day', label: 'Day School' },
  { value: 'boarding', label: 'Boarding School' },
  { value: 'day-boarding', label: 'Day & Boarding' },
  { value: 'online', label: 'Online School' },
]

export default function SchoolDirectoryPage() {
  const [schools, setSchools] = useState<SchoolCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCurriculum, setSelectedCurriculum] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [hiringOnly, setHiringOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const countries = getCountriesForFilter()
  const regions = getRegionsForFilter()

  const fetchSchools = async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      if (selectedRegion) params.append('region', selectedRegion)
      if (selectedCountry) params.append('country', selectedCountry)
      if (selectedCurriculum) params.append('curriculum', selectedCurriculum)
      if (hiringOnly) params.append('hiring', 'true')
      if (searchQuery) params.append('search', searchQuery)
      params.append('page', pageNum.toString())

      const res = await fetch(`/api/schools?${params.toString()}`)
      const data = await res.json()

      if (append) {
        setSchools((prev) => [...prev, ...(data.schools || [])])
      } else {
        setSchools(data.schools || [])
      }
      setTotal(data.total || 0)
      setPage(data.page || 1)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch schools:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Refetch on filter change (reset to page 1)
  useEffect(() => {
    setPage(1)
    fetchSchools(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedCountry, selectedCurriculum, selectedType, hiringOnly, searchQuery])

  const handleClear = () => {
    setSelectedRegion('')
    setSelectedCountry('')
    setSelectedCurriculum('')
    setSelectedType('')
    setHiringOnly(false)
    setSearchQuery('')
    setSearchInput('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
  }

  const handleLoadMore = () => {
    fetchSchools(page + 1, true)
  }

  const hasFilters = selectedRegion || selectedCountry || selectedCurriculum || selectedType || hiringOnly || searchQuery

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 md:py-8">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
          International School Directory
        </h1>
        <p className="text-sm text-text-muted">
          {total.toLocaleString()} schools worldwide
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-3 md:mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search schools by name, city, or country..."
            className="flex-1 px-3 py-2 border border-card-border rounded text-sm"
          />
          <button type="submit" className="btn-primary text-sm">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-3 md:mb-6 flex flex-wrap gap-2 items-center">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="text-xs sm:text-sm"
        >
          <option value="">Region</option>
          {regions.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="text-xs sm:text-sm"
        >
          <option value="">Country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>
          ))}
        </select>

        <select
          value={selectedCurriculum}
          onChange={(e) => setSelectedCurriculum(e.target.value)}
          className="text-xs sm:text-sm"
        >
          <option value="">Curriculum</option>
          {CURRICULUM_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="text-xs sm:text-sm"
        >
          {SCHOOL_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={() => setHiringOnly(!hiringOnly)}
          className={`text-xs sm:text-sm px-3 py-1.5 rounded border transition-colors ${
            hiringOnly
              ? 'bg-green-100 border-green-300 text-green-800 font-semibold'
              : 'border-card-border text-text-muted hover:border-gray-400'
          }`}
        >
          Currently Hiring
        </button>

        {hasFilters && (
          <button
            onClick={handleClear}
            className="text-sm text-accent-blue hover:underline py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* School Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card-bg border border-card-border rounded-[15px] p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center text-text-muted py-12">
          No schools found matching your criteria.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {schools.map((school) => {
              const countryData = getCountryByCode(school.countryCode)
              const flag = countryData?.emoji || '🌍'
              const location = school.city
                ? `${school.city}, ${school.country}`
                : school.country

              return (
                <Link key={school._id} href={`/schools/${school.slug}`}>
                  <div className="bg-card-bg border border-card-border rounded-[15px] p-4 hover:border-gray-400 transition-colors h-full">
                    {/* School name + verified badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-bold leading-tight">
                        {school.name}
                      </h3>
                      {school.isVerified && (
                        <span className="shrink-0 text-blue-600" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <p className="text-xs text-text-muted mb-3">
                      {flag} {location}
                    </p>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {school.curriculum.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                        >
                          {c}
                        </span>
                      ))}
                      {school.curriculum.length > 2 && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          +{school.curriculum.length - 2}
                        </span>
                      )}
                      {school.activeJobCount > 0 && (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                          Hiring ({school.activeJobCount})
                        </span>
                      )}
                    </div>

                    {/* School type if available */}
                    {school.schoolType && (
                      <p className="text-[10px] text-text-muted">
                        {SCHOOL_TYPE_LABELS[school.schoolType] || school.schoolType}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <div className="text-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load More (${total - schools.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Bottom CTA */}
      <div className="mt-8 sm:mt-12 border-t border-card-border pt-6 sm:pt-8 text-center">
        <p className="text-sm text-text-muted mb-1">Is your school listed?</p>
        <p className="text-sm text-text-muted mb-3">
          Claim your free profile to add details, post jobs, and connect with teachers.
        </p>
        <Link href="/school/login" className="btn-primary text-sm">
          Claim Your School Profile →
        </Link>
      </div>
    </div>
  )
}
