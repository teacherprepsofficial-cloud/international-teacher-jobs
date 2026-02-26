import type { ISchool } from '@/models/School'

/**
 * Generate a URL-safe slug from a school name.
 * Lowercase, strip special chars, hyphenate spaces.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes
    .replace(/[&]/g, 'and')         // & → and
    .replace(/[^a-z0-9\s-]/g, '')   // Strip special chars
    .replace(/\s+/g, '-')           // Spaces → hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '')          // Trim leading/trailing hyphens
}

/**
 * Calculate profile completeness as a weighted 0-100 score.
 * Used for sort ordering (richer profiles surface first).
 */
export function calculateProfileCompleteness(school: Partial<ISchool>): number {
  let score = 0
  const weights: Record<string, number> = {
    description: 20,
    website: 10,
    logo: 10,
    curriculum: 10,
    gradeRange: 5,
    schoolType: 5,
    studentCount: 5,
    foundedYear: 5,
    languages: 5,
    accreditations: 10,
    benefits: 5,
    contactEmail: 5,
    careerPageUrl: 5,
  }

  if (school.description && school.description.length > 50) score += weights.description
  if (school.website) score += weights.website
  if (school.logo) score += weights.logo
  if (school.curriculum && school.curriculum.length > 0) score += weights.curriculum
  if (school.gradeRange) score += weights.gradeRange
  if (school.schoolType) score += weights.schoolType
  if (school.studentCount && school.studentCount > 0) score += weights.studentCount
  if (school.foundedYear && school.foundedYear > 0) score += weights.foundedYear
  if (school.languages && school.languages.length > 0) score += weights.languages
  if (school.accreditations && school.accreditations.length > 0) score += weights.accreditations
  if (school.benefits && school.benefits.length > 0) score += weights.benefits
  if (school.contactEmail) score += weights.contactEmail
  if (school.careerPageUrl) score += weights.careerPageUrl

  return score
}

export const CURRICULUM_OPTIONS = [
  'American',
  'Australian',
  'British',
  'Canadian',
  'Chinese',
  'Dutch',
  'Finnish',
  'French',
  'German',
  'Indian',
  'International Baccalaureate',
  'Japanese',
  'Montessori',
  'New Zealand',
  'Singaporean',
  'South African',
  'South Korean',
  'Swiss',
  'Swedish',
  'Waldorf',
]

export const FACULTY_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (fewer than 20 teachers)' },
  { value: 'medium', label: 'Medium (20–50 teachers)' },
  { value: 'large', label: 'Large (51–100 teachers)' },
  { value: 'very-large', label: 'Very Large (more than 100 teachers)' },
]

export const ACCREDITATION_OPTIONS = [
  'CIS (Council of International Schools)',
  'NEASC (New England Association)',
  'MSA (Middle States Association)',
  'WASC (Western Association)',
  'AdvancED / Cognia',
  'IBO (International Baccalaureate Organization)',
  'Cambridge International',
  'COBIS',
  'ECIS',
  'ACSI',
  'BSO (British Schools Overseas)',
  'Other',
]

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  day: 'Day School',
  boarding: 'Boarding School',
  'day-boarding': 'Day & Boarding',
  online: 'Online School',
}

/** Whitelist of fields a school admin can update via PATCH */
export const UPDATABLE_PROFILE_FIELDS = [
  // Core fields (editable by school admin)
  'name',
  'city',
  'country',
  'countryCode',
  'region',
  // Profile fields
  'description',
  'website',
  'logo',
  'photos',
  'curriculum',
  'gradeRange',
  'schoolType',
  'facultySize',
  'studentCount',
  'foundedYear',
  'languages',
  'accreditations',
  'benefits',
  'contactEmail',
  'careerPageUrl',
] as const
