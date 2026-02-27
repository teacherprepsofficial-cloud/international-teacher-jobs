'use client'

import { useState, useEffect, useRef } from 'react'
import { getCountriesForFilter } from '@/lib/countries'
import { getRegionsForFilter, getRegionForCountryCode } from '@/lib/regions'

interface Job {
  _id: string
  schoolName: string
  position: string
  city: string
  country: string
  status: string
  isAutoCrawled?: boolean
  sourceUrl?: string
  crawledAt?: string
  createdAt: string
}

interface CrawlRun {
  _id: string
  type: 'crawl' | 'stale-check'
  completedAt: string
  durationMs: number
  jobsFound: number
  jobsNew: number
  jobsSkipped: number
  crawlErrors: string[]
  staleCheckResults?: {
    totalChecked: number
    stillLive: number
    markedTakenDown: number
    failedChecks: number
  }
}

export default function AdminPage() {
  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [adminName, setAdminName] = useState('')

  // Existing state
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [crawlHistory, setCrawlHistory] = useState<CrawlRun[]>([])
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [crawlStatus, setCrawlStatus] = useState('')
  const [subStats, setSubStats] = useState<any>(null)
  const [subRecent, setSubRecent] = useState<any[]>([])
  const [clicksByWeek, setClicksByWeek] = useState<any[]>([])
  const [schoolStats, setSchoolStats] = useState<any>(null)
  const [claimedSchools, setClaimedSchools] = useState<any[]>([])

  // Post Job form state
  const [postJobOpen, setPostJobOpen] = useState(false)
  const [postJobLoading, setPostJobLoading] = useState(false)
  const [postJobSuccess, setPostJobSuccess] = useState('')
  const [logo, setLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const countries = getCountriesForFilter()
  const regions = getRegionsForFilter()

  const [formData, setFormData] = useState({
    schoolName: '',
    city: '',
    country: '',
    countryCode: '',
    region: '',
    position: '',
    positionCategory: 'elementary',
    description: '',
    applicationUrl: '',
    salary: '',
    contractType: 'Full-time',
    startDate: '',
    careerPageUrl: '',
  })

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try calling a protected admin endpoint to verify cookie
        const res = await fetch('/api/admin/jobs?status=pending')
        if (res.ok) {
          setIsAuthenticated(true)
          loadAllData()
        }
      } catch {
        // Not authenticated
      } finally {
        setAuthChecking(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      setIsAuthenticated(true)
      setAdminName(data.admin?.name || '')
      loadAllData()
    } catch {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setEmail('')
    setPassword('')
  }

  const loadAllData = () => {
    fetchPendingJobs()
    fetchCrawlHistory()
    fetchSubscriberStats()
    fetchSchoolClaims()
  }

  const fetchPendingJobs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/jobs?status=pending')
      const data = await response.json()
      setJobs(data)
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCrawlHistory = async () => {
    try {
      const response = await fetch('/api/admin/crawl')
      const data = await response.json()
      setCrawlHistory(data)
    } catch (err) {
      console.error('Failed to fetch crawl history:', err)
    }
  }

  const fetchSchoolClaims = async () => {
    try {
      const response = await fetch('/api/admin/schools?status=claimed')
      const data = await response.json()
      setSchoolStats(data.stats)
      setClaimedSchools(data.schools || [])
    } catch (err) {
      console.error('Failed to fetch school claims:', err)
    }
  }

  const handleSchoolAction = async (schoolId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/admin/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, action }),
      })
      fetchSchoolClaims()
    } catch (err) {
      console.error('Failed to update school:', err)
    }
  }

  const fetchSubscriberStats = async () => {
    try {
      const response = await fetch('/api/admin/subscribers')
      const data = await response.json()
      setSubStats(data.stats)
      setSubRecent(data.recentSubscribers || [])
      setClicksByWeek(data.clicksByWeek || [])
    } catch (err) {
      console.error('Failed to fetch subscriber stats:', err)
    }
  }

  const handleApprove = async (jobId: string) => {
    try {
      await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      fetchPendingJobs()
    } catch (error) {
      console.error('Failed to approve job:', error)
    }
  }

  const handleRequestCorrection = async (jobId: string) => {
    const message = prompt('Enter correction request message:')
    if (!message) return

    try {
      await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'correction_needed', message }),
      })
      fetchPendingJobs()
    } catch (error) {
      console.error('Failed to request correction:', error)
    }
  }

  const handleRunCrawl = async () => {
    setCrawlLoading(true)
    setCrawlStatus('Running crawl...')
    try {
      const response = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crawl', maxPages: 5 }),
      })
      const data = await response.json()
      if (data.success) {
        setCrawlStatus(`Crawl complete: ${data.summary.jobsNew} new jobs found`)
        fetchPendingJobs()
        fetchCrawlHistory()
      } else {
        setCrawlStatus(`Crawl error: ${data.error}`)
      }
    } catch (err: any) {
      setCrawlStatus(`Crawl failed: ${err.message}`)
    } finally {
      setCrawlLoading(false)
    }
  }

  const handleRunStaleCheck = async () => {
    setCrawlLoading(true)
    setCrawlStatus('Running stale check...')
    try {
      const response = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stale-check' }),
      })
      const data = await response.json()
      if (data.success) {
        const r = data.result
        setCrawlStatus(`Stale check complete: ${r.stillLive} live, ${r.markedTakenDown} taken down`)
        fetchCrawlHistory()
      } else {
        setCrawlStatus(`Stale check error: ${data.error}`)
      }
    } catch (err: any) {
      setCrawlStatus(`Stale check failed: ${err.message}`)
    } finally {
      setCrawlLoading(false)
    }
  }

  // --- Post Job Form Handlers ---

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'countryCode') {
      const region = value ? getRegionForCountryCode(value) : ''
      // Find country name from code
      const countryObj = countries.find((c) => c.code === value)
      setFormData((prev) => ({ ...prev, countryCode: value, region, country: countryObj?.name || '' }))
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

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setPostJobLoading(true)
    setError('')
    setPostJobSuccess('')

    try {
      const res = await fetch('/api/admin/post-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logo }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to post job')
        return
      }

      let msg = 'Job posted and live on homepage!'
      if (data.schoolMatched) msg += ' School matched in directory.'
      if (data.careerPageSaved) msg += ' Career page URL saved.'
      setPostJobSuccess(msg)

      // Reset form
      setFormData({
        schoolName: '',
        city: '',
        country: '',
        countryCode: '',
        region: '',
        position: '',
        positionCategory: 'elementary',
        description: '',
        applicationUrl: '',
        salary: '',
        contractType: 'Full-time',
        startDate: '',
        careerPageUrl: '',
      })
      setLogo('')
      setLogoPreview('')
      fetchPendingJobs()
    } catch {
      setError('Failed to post job')
    } finally {
      setPostJobLoading(false)
    }
  }

  if (authChecking) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card-bg border border-card-border rounded-[15px] p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-card-border rounded"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-card-border rounded"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Admin Panel</h1>
        <button onClick={handleLogout} className="btn-outline text-sm">
          Logout
        </button>
      </div>

      {/* Post Job Form */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Post a Job</h2>
          <button
            onClick={() => setPostJobOpen(!postJobOpen)}
            className="btn-secondary text-sm"
          >
            {postJobOpen ? 'Close' : 'New Job'}
          </button>
        </div>

        {postJobSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            {postJobSuccess}
          </div>
        )}

        {error && postJobOpen && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>
        )}

        {postJobOpen && (
          <form onSubmit={handlePostJob} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Position Title *</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., Middle School Math Teacher"
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">School Name *</label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Country *</label>
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Region</label>
                <input
                  type="text"
                  value={formData.region ? regions.find((r) => r.value === formData.region)?.label || formData.region : ''}
                  disabled
                  className="w-full px-3 py-2 border border-card-border rounded text-sm bg-gray-50 text-text-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Category *</label>
                <select
                  name="positionCategory"
                  value={formData.positionCategory}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle-school">Middle School</option>
                  <option value="high-school">High School</option>
                  <option value="admin">Administration</option>
                  <option value="support-staff">Support Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Contract Type *</label>
                <select
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Salary (optional)</label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleFormChange}
                  placeholder="e.g., $65,000-$80,000/yr"
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Application URL *</label>
                <input
                  type="url"
                  name="applicationUrl"
                  value={formData.applicationUrl}
                  onChange={handleFormChange}
                  required
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-card-border rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Job Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                rows={4}
                placeholder="Describe the position, responsibilities, qualifications..."
                className="w-full px-3 py-2 border border-card-border rounded text-sm"
              />
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-semibold mb-1">School Logo (optional)</label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain border border-card-border rounded" />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 border border-card-border rounded text-text-muted text-xs">
                    No logo
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs">
                  {logoPreview ? 'Change' : 'Upload'}
                </button>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogo(''); setLogoPreview('') }} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>

            {/* Career page URL — saved to School directory */}
            <div>
              <label className="block text-sm font-semibold mb-1">School Career Page URL (optional)</label>
              <input
                type="url"
                name="careerPageUrl"
                value={formData.careerPageUrl}
                onChange={handleFormChange}
                placeholder="https://school.edu/careers — saved for automated crawling"
                className="w-full px-3 py-2 border border-card-border rounded text-sm"
              />
              <p className="text-xs text-text-muted mt-1">
                If the school matches our directory, this URL is saved for future automated crawling.
              </p>
            </div>

            <button
              type="submit"
              disabled={postJobLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {postJobLoading ? 'Posting...' : 'Post Job (Goes Live Immediately)'}
            </button>
          </form>
        )}
      </div>

      {/* Crawler Controls */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Job Crawler</h2>
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleRunCrawl}
            disabled={crawlLoading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {crawlLoading ? 'Running...' : 'Run Crawl Now'}
          </button>
          <button
            onClick={handleRunStaleCheck}
            disabled={crawlLoading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {crawlLoading ? 'Running...' : 'Run Stale Check'}
          </button>
        </div>
        {crawlStatus && (
          <p className="text-sm text-text-muted mb-4">{crawlStatus}</p>
        )}

        {/* Recent Crawl History */}
        {crawlHistory.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-text-muted">Recent Runs</h3>
            <div className="space-y-2">
              {crawlHistory.slice(0, 5).map((run) => (
                <div key={run._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-sm border border-card-border rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                      run.type === 'crawl' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {run.type === 'crawl' ? 'CRAWL' : 'STALE'}
                    </span>
                    <span className="text-text-muted">
                      {new Date(run.completedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-text-muted">
                    {run.type === 'crawl' ? (
                      <span>{run.jobsNew} new / {run.jobsFound} found</span>
                    ) : run.staleCheckResults ? (
                      <span>{run.staleCheckResults.stillLive} live / {run.staleCheckResults.markedTakenDown} removed</span>
                    ) : (
                      <span>{run.jobsFound} checked</span>
                    )}
                    <span className="ml-2">({(run.durationMs / 1000).toFixed(1)}s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Subscribers */}
      {subStats && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Email Subscribers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{subStats.confirmed}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{subStats.pending}</div>
              <div className="text-xs text-text-muted">Pending</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{subStats.unsubscribed}</div>
              <div className="text-xs text-text-muted">Unsubscribed</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{subStats.total}</div>
              <div className="text-xs text-text-muted">All Time</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{subStats.totalClicks}</div>
              <div className="text-xs text-text-muted">Total Clicks</div>
            </div>
          </div>

          {/* Click stats by digest */}
          {clicksByWeek.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 text-text-muted">Digest Click Rates</h3>
              <div className="space-y-1">
                {clicksByWeek.map((w: any) => (
                  <div key={w.date} className="flex items-center justify-between text-sm border border-card-border rounded p-2">
                    <span className="text-text-muted">{new Date(w.date).toLocaleDateString()}</span>
                    <span>{w.clicks} clicks from {w.uniqueClickers} subscribers</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent subscribers */}
          {subRecent.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-text-muted">Recent Subscribers</h3>
              <div className="space-y-1">
                {subRecent.map((sub: any) => (
                  <div key={sub._id} className="flex items-center justify-between text-sm border border-card-border rounded p-2">
                    <span className="font-mono text-xs">{sub.email}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                      sub.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* School Directory Claims */}
      {schoolStats && (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">School Directory</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{schoolStats.total}</div>
              <div className="text-xs text-text-muted">Total Schools</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{schoolStats.claimed}</div>
              <div className="text-xs text-text-muted">Claimed</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{schoolStats.verified}</div>
              <div className="text-xs text-text-muted">Verified</div>
            </div>
            <div className="border border-card-border rounded p-3 text-center">
              <div className="text-lg sm:text-2xl font-bold">{schoolStats.pendingClaims}</div>
              <div className="text-xs text-text-muted">Pending Review</div>
            </div>
          </div>

          {claimedSchools.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-text-muted">Claimed Schools</h3>
              <div className="space-y-2">
                {claimedSchools.map((school: any) => (
                  <div key={school._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-card-border rounded p-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{school.name}</span>
                        {school.isVerified ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">VERIFIED</span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">PENDING</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {school.city ? `${school.city}, ` : ''}{school.country}
                        {school.claimedBy && ` · Claimed by ${school.claimedBy.email}`}
                      </p>
                    </div>
                    {!school.isVerified && (
                      <div className="flex gap-2">
                        <button onClick={() => handleSchoolAction(school._id, 'approve')} className="btn-secondary text-xs">
                          Approve
                        </button>
                        <button onClick={() => handleSchoolAction(school._id, 'reject')} className="btn-outline text-xs">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Jobs */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-4 md:p-6">
        <h2 className="text-xl font-bold mb-4">Pending Review ({jobs.length})</h2>

        {loading ? (
          <div className="text-center text-text-muted">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center text-text-muted">No jobs pending review</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job._id} className="border border-card-border rounded p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/jobs/${job._id}?preview=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-700 hover:underline"
                      >
                        {job.position}
                      </a>
                      {job.isAutoCrawled && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wide">
                          AUTO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted">
                      {job.schoolName} · {job.city}{job.country ? `, ${job.country}` : ''}
                    </p>
                    {job.sourceUrl && (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View source listing
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(job._id)} className="btn-secondary text-sm">
                    Approve
                  </button>
                  <button onClick={() => handleRequestCorrection(job._id)} className="btn-outline text-sm">
                    Request Correction
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
