'use client'

import { useState } from 'react'

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
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === 'admin123') {
      setIsAuthenticated(true)
      fetchPendingJobs()
      fetchCrawlHistory()
      fetchSubscriberStats()
      fetchSchoolClaims()
    } else {
      setError('Invalid password')
    }
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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card-bg border border-card-border rounded-[15px] p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border border-card-border rounded"
              />
            </div>
            <button type="submit" className="w-full btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 md:mb-8">Admin Panel</h1>

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
                        View source listing →
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
