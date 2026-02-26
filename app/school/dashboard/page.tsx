'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminProfile {
  id: string
  email: string
  name: string
  schoolName: string
  subscriptionTier: 'basic' | 'standard' | 'premium'
  subscriptionStatus: string
}

interface Job {
  _id: string
  position: string
  schoolName: string
  city: string
  country: string
  description: string
  status: string
  publishedAt?: string
  createdAt: string
}

const TIER_NAMES: Record<string, string> = {
  basic: 'Starter',
  standard: 'Plus',
  premium: 'Premium',
}

const TIER_COLORS: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-800',
  standard: 'bg-blue-100 text-blue-800',
  premium: 'bg-amber-100 text-amber-800',
}

export default function SchoolDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [tier, setTier] = useState('')
  const [liveCount, setLiveCount] = useState(0)
  const [tierLimit, setTierLimit] = useState(3)
  const [loading, setLoading] = useState(true)
  const [hasClaimedSchool, setHasClaimedSchool] = useState(false)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/school/me')
        if (!meRes.ok) {
          router.push('/school/login')
          return
        }
        const meData = await meRes.json()
        setAdmin(meData)

        const jobsRes = await fetch('/api/school/jobs')
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json()
          setJobs(jobsData.jobs)
          setTier(jobsData.tier)
          setLiveCount(jobsData.liveCount)
          setTierLimit(jobsData.tierLimit)
        }

        const profileRes = await fetch('/api/school/profile')
        setHasClaimedSchool(profileRes.ok)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/school/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleTakeDown = async (jobId: string) => {
    if (!confirm('Are you sure you want to take down this listing? You can re-post it later.')) return

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (res.ok) {
        setJobs(jobs.map((j) => (j._id === jobId ? { ...j, status: 'taken_down' } : j)))
        setLiveCount((prev) => prev - 1)
      }
    } catch (error) {
      console.error('Failed to take down listing:', error)
    }
  }

  const handleStartEdit = (job: Job) => {
    setEditingJobId(job._id)
    setEditDescription(job.description)
  }

  const handleCancelEdit = () => {
    setEditingJobId(null)
    setEditDescription('')
  }

  const handleSaveEdit = async (jobId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      })
      if (res.ok) {
        setJobs(jobs.map((j) => (j._id === jobId ? { ...j, description: editDescription } : j)))
        setEditingJobId(null)
        setEditDescription('')
      }
    } catch (error) {
      console.error('Failed to update job:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Loading dashboard...</p>
      </div>
    )
  }

  if (!admin) return null

  const atLimit = liveCount >= tierLimit
  const usagePercent = tierLimit > 0 ? Math.round((liveCount / tierLimit) * 100) : 0

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{admin.schoolName}</h1>
          <p className="text-text-muted">Welcome back, {admin.name}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${TIER_COLORS[tier] || TIER_COLORS.basic}`}>
          {TIER_NAMES[tier] || 'Starter'} Plan
        </span>
      </div>

      {/* Usage Bar */}
      <div className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-5 mb-4 md:mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">
            Active Listings: {liveCount} of {tierLimit}
          </p>
          {atLimit && (
            <Link href="/pricing" className="text-xs text-accent-blue hover:underline">
              Upgrade for more →
            </Link>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${atLimit ? 'bg-red-500' : 'bg-accent-blue'}`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 md:mb-8 flex flex-wrap items-center gap-3">
        {atLimit ? (
          <>
            <button disabled className="btn-primary opacity-50 cursor-not-allowed text-sm">
              Post New Job
            </button>
            <span className="text-sm text-text-muted">
              You&apos;ve reached your limit.{' '}
              <Link href="/pricing" className="text-accent-blue hover:underline">
                Upgrade your plan
              </Link>{' '}
              to post more.
            </span>
          </>
        ) : (
          <Link href="/post-job" className="btn-primary text-sm inline-block">
            Post New Job
          </Link>
        )}
        {hasClaimedSchool && (
          <Link href="/school/profile" className="btn-secondary text-sm inline-block">
            Edit School Profile
          </Link>
        )}
      </div>

      {/* Job Listings */}
      <h2 className="text-xl font-bold mb-4">My Job Postings</h2>

      {jobs.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-[15px] p-8 text-center">
          <p className="text-text-muted mb-4">You haven&apos;t posted any jobs yet.</p>
          <Link href="/post-job" className="btn-primary text-sm">
            Post Your First Job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job._id} className="bg-card-bg border border-card-border rounded-[15px] p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold mb-1">{job.position}</h3>
                  <p className="text-sm text-text-muted mb-2">
                    {job.city}, {job.country} · Posted{' '}
                    {new Date(job.publishedAt || job.createdAt).toLocaleDateString()}
                  </p>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      job.status === 'live'
                        ? 'bg-green-100 text-green-800'
                        : job.status === 'taken_down'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {job.status === 'live' ? 'Live' : job.status === 'taken_down' ? 'Taken Down' : 'Pending'}
                  </span>
                </div>

                {job.status === 'live' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(job)}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTakeDown(job._id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Take Down
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Edit */}
              {editingJobId === job._id && (
                <div className="mt-4 pt-4 border-t border-card-border">
                  <label className="block text-sm font-semibold mb-2">Edit Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 border border-card-border rounded font-mono text-sm mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(job._id)}
                      disabled={saving}
                      className="btn-primary text-xs disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-xs text-text-muted hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
