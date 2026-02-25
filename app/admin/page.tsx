'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Job {
  _id: string
  schoolName: string
  position: string
  city: string
  status: string
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Verify password against ADMIN_PASSWORD env var
    if (adminPassword === 'admin123') {
      // For demo purposes only
      setIsAuthenticated(true)
      fetchPendingJobs()
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <div className="bg-card-bg border border-card-border rounded-[15px] p-6">
        <h2 className="text-xl font-bold mb-4">Pending Review ({jobs.length})</h2>

        {loading ? (
          <div className="text-center text-text-muted">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center text-text-muted">No jobs pending review</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job._id} className="border border-card-border rounded p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{job.position}</h3>
                    <p className="text-sm text-text-muted">
                      {job.schoolName} · {job.city}
                    </p>
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
