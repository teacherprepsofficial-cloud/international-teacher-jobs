import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISchool extends Document {
  // Core (seeded)
  name: string
  slug: string
  country: string
  countryCode: string
  city: string | null
  region: string

  // Profile (filled by school admin after claiming)
  description?: string
  website?: string
  logo?: string
  photos: string[]
  curriculum: string[]
  gradeRange?: string
  schoolType?: 'day' | 'boarding' | 'day-boarding' | 'online'
  facultySize?: 'small' | 'medium' | 'large' | 'very-large'
  studentCount?: number
  foundedYear?: number
  languages: string[]
  accreditations: string[]
  benefits: string[]
  contactEmail?: string
  careerPageUrl?: string

  // Claim
  claimed: boolean
  claimedBy?: Types.ObjectId
  claimedAt?: Date
  isVerified: boolean

  // ATS (Applicant Tracking System) — auto-discovered via discovery script
  atsPlatform?: 'greenhouse' | 'lever' | 'workable'
  atsSlug?: string              // Company slug on the ATS platform
  atsDiscoveredAt?: Date        // When the ATS was last confirmed working

  // Website / career page discovery (auto-discovered via discover-school-websites.ts)
  websiteDiscoveredAt?: Date    // When website was last auto-discovered
  atsDetected?: string          // ATS type detected on career page (e.g. 'bamboohr', 'workday')

  // Computed
  profileCompleteness: number

  createdAt: Date
  updatedAt: Date
}

const SchoolSchema = new Schema<ISchool>(
  {
    // Core
    name: { type: String, required: true },
    slug: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    city: { type: String, default: null },
    region: { type: String, required: true },

    // Profile
    description: String,
    website: String,
    logo: String,
    photos: { type: [String], default: [] },
    curriculum: { type: [String], default: [] },
    gradeRange: String,
    schoolType: { type: String, enum: ['day', 'boarding', 'day-boarding', 'online'] },
    facultySize: { type: String, enum: ['small', 'medium', 'large', 'very-large'] },
    studentCount: Number,
    foundedYear: Number,
    languages: { type: [String], default: [] },
    accreditations: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    contactEmail: String,
    careerPageUrl: String,

    // ATS
    atsPlatform: { type: String, enum: ['greenhouse', 'lever', 'workable'] },
    atsSlug: String,
    atsDiscoveredAt: Date,
    websiteDiscoveredAt: Date,
    atsDetected: String,

    // Claim
    claimed: { type: Boolean, default: false },
    claimedBy: { type: Schema.Types.ObjectId, ref: 'SchoolAdmin' },
    claimedAt: Date,
    isVerified: { type: Boolean, default: false },

    // Computed
    profileCompleteness: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Indexes
SchoolSchema.index({ slug: 1 }, { unique: true })
SchoolSchema.index({ countryCode: 1 })
SchoolSchema.index({ region: 1 })
SchoolSchema.index({ name: 'text' })
SchoolSchema.index({ claimed: 1, isVerified: 1 })
SchoolSchema.index({ profileCompleteness: -1 })
SchoolSchema.index({ atsPlatform: 1, atsSlug: 1 })

export const School =
  mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema)
