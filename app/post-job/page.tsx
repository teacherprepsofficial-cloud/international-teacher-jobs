'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCountriesForFilter } from '@/lib/countries'

export default function PostJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const countries = getCountriesForFilter()

  const [formData, setFormData] = useState({
    schoolName: '',
    city: '',
    countryCode: '',
    position: '',
    positionCategory: 'elementary',
    description: '',
    applicationUrl: '',
    salary: '',
    contractType: 'Full-time',
    startDate: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to post job')
      }

      router.push('/school/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Post a Job</h1>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Start Date *</label>
            <input
              type="text"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              placeholder="e.g., August 2026"
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

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit for Review'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-outline flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
