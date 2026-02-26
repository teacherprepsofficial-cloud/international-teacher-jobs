import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IJobPosting extends Document {
  adminId: Types.ObjectId
  schoolId?: Types.ObjectId
  schoolName: string
  city: string
  country: string
  countryCode: string
  region?: string
  position: string
  positionCategory: 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff'
  description: string
  applicationUrl: string
  salary?: string
  contractType: 'Full-time' | 'Part-time' | 'Contract'
  startDate: string
  subscriptionTier: 'basic' | 'standard' | 'premium'
  status: 'pending' | 'approved' | 'live' | 'correction_needed' | 'taken_down'
  publishedAt?: Date
  adminNotes?: string
  // Crawler fields
  sourceUrl?: string
  sourceKey?: string
  contentHash?: string
  isAutoCrawled: boolean
  lastCheckedAt?: Date
  staleCheckFailCount: number
  crawledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'SchoolAdmin', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    schoolName: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    region: String,
    position: { type: String, required: true },
    positionCategory: {
      type: String,
      enum: ['elementary', 'middle-school', 'high-school', 'admin', 'support-staff'],
      required: true,
    },
    description: { type: String, required: true },
    applicationUrl: { type: String, required: true },
    salary: String,
    contractType: { type: String, enum: ['Full-time', 'Part-time', 'Contract'], required: true },
    startDate: { type: String, required: true },
    subscriptionTier: { type: String, enum: ['basic', 'standard', 'premium'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'live', 'correction_needed', 'taken_down'],
      default: 'pending',
    },
    publishedAt: Date,
    adminNotes: String,
    // Crawler fields
    sourceUrl: String,
    sourceKey: String,
    contentHash: String,
    isAutoCrawled: { type: Boolean, default: false },
    lastCheckedAt: Date,
    staleCheckFailCount: { type: Number, default: 0 },
    crawledAt: Date,
  },
  { timestamps: true }
)

// Index for faster queries
JobPostingSchema.index({ status: 1, countryCode: 1 })
JobPostingSchema.index({ status: 1, region: 1 })
JobPostingSchema.index({ adminId: 1 })
JobPostingSchema.index({ contentHash: 1 }, { unique: true, sparse: true })
JobPostingSchema.index({ isAutoCrawled: 1, status: 1 })
JobPostingSchema.index({ schoolId: 1, status: 1 })

export const JobPosting =
  mongoose.models.JobPosting || mongoose.model<IJobPosting>('JobPosting', JobPostingSchema)
