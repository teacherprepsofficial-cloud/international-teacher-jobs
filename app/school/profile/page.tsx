'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCountriesForFilter } from '@/lib/countries'
import { getRegionsForFilter, getRegionForCountryCode } from '@/lib/regions'
import {
  CURRICULUM_OPTIONS,
  FACULTY_SIZE_OPTIONS,
  ACCREDITATION_OPTIONS,
  SCHOOL_TYPE_LABELS,
} from '@/lib/school-utils'

interface SchoolProfile {
  _id: string
  name: string
  city: string | null
  country: string
  countryCode: string
  region: string
  logo?: string
  description?: string
  website?: string
  curriculum?: string[]
  gradeRange?: string
  schoolType?: string
  facultySize?: string
  studentCount?: number
  foundedYear?: number
  languages?: string[]
  accreditations?: string[]
  benefits?: string[]
  contactEmail?: string
  careerPageUrl?: string
  profileCompleteness: number
}

export default function SchoolProfilePage() {
  const router = useRouter()
  const countries = getCountriesForFilter()
  const regions = getRegionsForFilter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [school, setSchool] = useState<SchoolProfile | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [logo, setLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [curriculum, setCurriculum] = useState('')
  const [gradeRange, setGradeRange] = useState('')
  const [schoolType, setSchoolType] = useState('')
  const [facultySize, setFacultySize] = useState('')
  const [studentCount, setStudentCount] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [languageInput, setLanguageInput] = useState('')
  const [accreditations, setAccreditations] = useState<string[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [benefitInput, setBenefitInput] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [careerPageUrl, setCareerPageUrl] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const meRes = await fetch('/api/school/me')
        if (!meRes.ok) {
          router.push('/school/login')
          return
        }

        const profileRes = await fetch('/api/school/profile')
        if (profileRes.status === 404) {
          // Not yet claimed — send to dashboard
          router.push('/school/dashboard')
          return
        }
        if (!profileRes.ok) {
          setError('Failed to load profile')
          return
        }

        const data: SchoolProfile = await profileRes.json()
        setSchool(data)

        // Populate form
        setName(data.name || '')
        setCity(data.city || '')
        setCountryCode(data.countryCode || '')
        setCountry(data.country || '')
        setRegion(data.region || '')
        setLogo(data.logo || '')
        setLogoPreview(data.logo || '')
        setDescription(data.description || '')
        setWebsite(data.website || '')
        setCurriculum(data.curriculum?.[0] || '')
        setGradeRange(data.gradeRange || '')
        setSchoolType(data.schoolType || '')
        setFacultySize(data.facultySize || '')
        setStudentCount(data.studentCount?.toString() || '')
        setFoundedYear(data.foundedYear?.toString() || '')
        setLanguages(data.languages || [])
        setAccreditations(data.accreditations || [])
        setBenefits(data.benefits || [])
        setContactEmail(data.contactEmail || '')
        setCareerPageUrl(data.careerPageUrl || '')
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

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

  const handleCountryChange = (code: string) => {
    setCountryCode(code)
    const found = countries.find((c) => c.code === code)
    setCountry(found?.name || '')
    setRegion(code ? getRegionForCountryCode(code) : '')
  }

  const addLanguage = () => {
    const val = languageInput.trim()
    if (val && !languages.includes(val)) {
      setLanguages([...languages, val])
    }
    setLanguageInput('')
  }

  const removeLanguage = (lang: string) => setLanguages(languages.filter((l) => l !== lang))

  const toggleAccreditation = (acc: string) => {
    setAccreditations((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    )
  }

  const addBenefit = () => {
    const val = benefitInput.trim()
    if (val && !benefits.includes(val)) {
      setBenefits([...benefits, val])
    }
    setBenefitInput('')
  }

  const removeBenefit = (b: string) => setBenefits(benefits.filter((x) => x !== b))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const payload = {
      name,
      city,
      country,
      countryCode,
      region,
      logo,
      description,
      website,
      curriculum: curriculum ? [curriculum] : [],
      gradeRange,
      schoolType,
      facultySize,
      studentCount: studentCount ? parseInt(studentCount) : undefined,
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      languages,
      accreditations,
      benefits,
      contactEmail,
      careerPageUrl,
    }

    try {
      const res = await fetch('/api/school/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Loading profile...</p>
      </div>
    )
  }

  if (!school) return null

  const completeness = school.profileCompleteness

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl sm:text-2xl font-bold">School Profile</h1>
        <Link href="/school/dashboard" className="text-sm text-accent-blue hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Completeness bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-muted">Profile completeness</span>
          <span className="text-xs font-semibold text-accent-blue">{completeness}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-accent-blue transition-all"
            style={{ width: `${completeness}%` }}
          />
        </div>
        {completeness < 60 && (
          <p className="text-xs text-text-muted mt-1">
            Complete your profile to rank higher in the school directory.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          Profile saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Logo ──────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">School Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School logo"
                className="w-16 h-16 object-contain border border-card-border rounded"
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 border border-card-border rounded text-2xl font-bold text-gray-400">
                {name.charAt(0) || '?'}
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
              <p className="text-xs text-text-muted mt-1">PNG, JPG or GIF · max 500 KB</p>
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

        {/* ── School Name ───────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">School Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-card-border rounded"
          />
        </div>

        {/* ── Country & Region ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Country *</label>
            <select
              value={countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="">Select a country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Region *</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="">Select a region</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── City ─────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Dubai"
            className="w-full px-4 py-2 border border-card-border rounded"
          />
        </div>

        {/* ── Curriculum ───────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Curriculum</label>
          <select
            value={curriculum}
            onChange={(e) => setCurriculum(e.target.value)}
            className="w-full px-4 py-2 border border-card-border rounded"
          >
            <option value="">Select a curriculum</option>
            {CURRICULUM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* ── Faculty Size ─────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Faculty Size</label>
          <select
            value={facultySize}
            onChange={(e) => setFacultySize(e.target.value)}
            className="w-full px-4 py-2 border border-card-border rounded"
          >
            <option value="">Select faculty size</option>
            {FACULTY_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Career Page URL & Contact Email ──── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Career Page URL</label>
            <input
              type="url"
              value={careerPageUrl}
              onChange={(e) => setCareerPageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="jobs@school.com"
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>
        </div>

        {/* ── Description ──────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">School Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Tell teachers about your school — ethos, community, student body..."
            className="w-full px-4 py-2 border border-card-border rounded text-sm"
          />
        </div>

        {/* ── Website ──────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">School Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 border border-card-border rounded"
          />
        </div>

        {/* ── Grade Range & School Type ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Grade Range</label>
            <input
              type="text"
              value={gradeRange}
              onChange={(e) => setGradeRange(e.target.value)}
              placeholder="e.g., PreK–12"
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">School Type</label>
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value)}
              className="w-full px-4 py-2 border border-card-border rounded"
            >
              <option value="">Select type</option>
              {Object.entries(SCHOOL_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Founded Year & Student Count ──────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Founded Year</label>
            <input
              type="number"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              placeholder="e.g., 1985"
              min="1800"
              max={new Date().getFullYear()}
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Student Count</label>
            <input
              type="number"
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
              placeholder="e.g., 800"
              min="1"
              className="w-full px-4 py-2 border border-card-border rounded"
            />
          </div>
        </div>

        {/* ── Languages of Instruction ──────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Languages of Instruction</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addLanguage() }
              }}
              placeholder="e.g., English"
              className="flex-1 px-4 py-2 border border-card-border rounded"
            />
            <button type="button" onClick={addLanguage} className="btn-secondary text-sm px-4">
              Add
            </button>
          </div>
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-full"
                >
                  {lang}
                  <button type="button" onClick={() => removeLanguage(lang)} className="hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Accreditations ───────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Accreditations</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ACCREDITATION_OPTIONS.map((acc) => (
              <label key={acc} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accreditations.includes(acc)}
                  onChange={() => toggleAccreditation(acc)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm">{acc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Benefits / Perks ─────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Benefits &amp; Perks</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addBenefit() }
              }}
              placeholder="e.g., Housing allowance, Flight reimbursement..."
              className="flex-1 px-4 py-2 border border-card-border rounded"
            />
            <button type="button" onClick={addBenefit} className="btn-secondary text-sm px-4">
              Add
            </button>
          </div>
          {benefits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {benefits.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-1 rounded-full"
                >
                  {b}
                  <button type="button" onClick={() => removeBenefit(b)} className="hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ───────────────────────────── */}
        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
