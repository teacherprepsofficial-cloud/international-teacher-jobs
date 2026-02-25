'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Job {
  _id: string
  position: string
  status: string
  city: string
  createdAt: string
}

interface Message {
  _id: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function SchoolDashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Fetch jobs and messages for authenticated school admin
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleTakeDown = async (jobId: string) => {
    if (!confirm('Are you sure you want to take down this listing?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (response.ok) {
        setJobs(jobs.filter((job) => job._id !== jobId))
      }
    } catch (error) {
      console.error('Failed to take down listing:', error)
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">School Dashboard</h1>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Jobs */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">My Job Postings</h2>
          {jobs.length === 0 ? (
            <div className="bg-card-bg border border-card-border rounded-[15px] p-6 text-center">
              <p className="text-text-muted mb-4">No job postings yet.</p>
              <Link href="/post-job" className="btn-primary">
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job._id} className="job-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{job.position}</h3>
                      <p className="text-sm text-text-muted mb-2">
                        {job.city} · Posted {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          job.status === 'live'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : job.status === 'correction_needed'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {job.status === 'live'
                          ? 'Live'
                          : job.status === 'pending'
                            ? 'Pending Review'
                            : job.status === 'correction_needed'
                              ? 'Needs Correction'
                              : 'Taken Down'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'correction_needed' || job.status === 'live' ? (
                        <Link href={`/school/edit/${job._id}`} className="btn-secondary text-xs">
                          Edit
                        </Link>
                      ) : null}
                      <button onClick={() => handleTakeDown(job._id)} className="text-xs text-red-600 hover:underline">
                        Take Down
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbox */}
        <div>
          <h2 className="text-xl font-bold mb-4">Inbox</h2>
          {messages.length === 0 ? (
            <div className="bg-card-bg border border-card-border rounded-[15px] p-6 text-center text-sm text-text-muted">
              No messages yet
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`bg-card-bg border border-card-border rounded p-3 text-sm cursor-pointer hover:bg-blue-50 ${
                    !msg.isRead ? 'font-bold' : ''
                  }`}
                >
                  <p className="line-clamp-2">{msg.message}</p>
                  <p className="text-xs text-text-muted mt-1">{new Date(msg.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
