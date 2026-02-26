'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCountriesForFilter } from '@/lib/countries'
import { getRegionsForFilter, getRegionForCountryCode } from '@/lib/regions'

export default function PostJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState('')
  const [liveCount, setLiveCount] = useState(0)
  const [tierLimit, setTierLimit] = useState(3)
  const [tierName, setTierName] = useState('Starter')
  const [logo, setLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const countries = getCountriesForFilter()
  const regions = getRegionsForFilter()

  const [formData, setFormData] = useState({
    schoolName: '',
    city: '',
    countryCode: '',
    region: '',
    position: '',
    positionCategory: 'elementary',
    description: '',
    applicationUrl: '',
    salary: '',
    contractType: 'Full-time',
    startDate: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const meRes = await fetch('/api/school/me')
        if (!meRes.ok) {
          router.push('/pricing')
          return
        }
        const meData = await meRes.json()
        setFormData((prev) => ({ ...prev, schoolName: meData.schoolName || '' }))

        // Pre-fill logo from claimed school profile if available
        const profileRes = await fetch('/api/school/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          if (profileData.logo) {
            setLogo(profileData.logo)
            setLogoPreview(profileData.logo)
          }
        }

        const tierNames: Record<string, string> = { basic: 'Starter', standard: 'Plus', premium: 'Premium' }
        setTierName(tierNames[meData.subscriptionTier] || 'Starter')

        const jobsRes = await fetch('/api/school/jobs')
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json()
          setLiveCount(jobsData.liveCount)
          setTierLimit(jobsData.tierLimit)
        }
      } catch {
        router.push('/pricing')
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'countryCode') {
      const region = value ? getRegionForCountryCode(value) : ''
      setFormData((prev) => ({ ...prev, countryCode: value, region }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setError('Logo must be under 500 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setLogo(dataUrl)
      setLogoPreview(dataUrl)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logo }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post job')
      }

      router.push('/school/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  const atLimit = liveCount >= tierLimit

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Post a Job</h1>

      {/* Slot counter */}
      <p className="text-sm text-text-muted mb-6">
        {tierName} Plan · Posting {liveCount + 1} of {tierLimit}
      </p>

      {atLimit && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
          You&apos;ve reached your {tierName} plan limit of {tierLimit} active listings.{' '}
          <a href="/pricing" className="underline font-semibold">
            Upgrade your plan
          </a>{' '}
          to post more jobs.
        </div>
      )}

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">School Name *</label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">City *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Country *</label>
            <select
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.emoji} {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Region *</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="">Select a region</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Position Title *</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            placeholder="e.g., Middle School Math Specialist"
            className="w-full px-4 py-2 border border-card-border rounded"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Category *</label>
            <select
              name="positionCategory"
              value={formData.positionCategory}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="elementary">Elementary</option>
              <option value="middle-school">Middle School</option>
              <option value="high-school">High School</option>
              <option value="admin">Administration</option>
              <option value="support-staff">Support Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Contract Type *</label>
            <select
              name="contractType"
              value={formData.contractType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Start Date *</label>
            <input
              type="date"
              name="startDateRaw"
              value={formData.startDate ? (() => {
                const parts = formData.startDate.split('/')
                if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
                return formData.startDate
              })() : ''}
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  const [y, m, d] = val.split('-')
                  setFormData((prev) => ({ ...prev, startDate: `${m}/${d}/${y}` }))
                } else {
                  setFormData((prev) => ({ ...prev, startDate: '' }))
                }
              }}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Salary (Optional)</label>
            <input
              type="text"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="e.g., $65,000–$80,000/yr"
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Job Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Describe the position, responsibilities, and qualifications..."
            className="w-full px-4 py-2 border border-card-border rounded font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Application URL *</label>
          <input
            type="url"
            name="applicationUrl"
            value={formData.applicationUrl}
            onChange={handleChange}
            required
            placeholder="https://..."
            className="w-full px-4 py-2 border border-card-border rounded"
          />
        </div>

        {/* School Logo */}
        <div>
          <label className="block text-sm font-semibold mb-2">School Logo (Optional)</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School logo preview"
                className="w-14 h-14 object-contain border border-card-border rounded"
              />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center bg-gray-100 border border-card-border rounded text-text-muted text-xs text-center leading-tight px-1">
                No logo
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogo(''); setLogoPreview('') }}
                  className="ml-3 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
              <p className="text-xs text-text-muted mt-1">
                PNG, JPG or GIF · max 500 KB · shown on job card
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || atLimit}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Post Your Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
