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
    studentCount: Number,
    foundedYear: Number,
    languages: { type: [String], default: [] },
    accreditations: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    contactEmail: String,
    careerPageUrl: String,

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

export const School =
  mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema)
