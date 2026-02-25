import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IJobPosting extends Document {
  adminId: Types.ObjectId
  schoolName: string
  city: string
  country: string
  countryCode: string
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
  createdAt: Date
  updatedAt: Date
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'SchoolAdmin', required: true },
    schoolName: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
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
  },
  { timestamps: true }
)

// Index for faster queries
JobPostingSchema.index({ status: 1, countryCode: 1 })
JobPostingSchema.index({ adminId: 1 })

export const JobPosting =
  mongoose.models.JobPosting || mongoose.model<IJobPosting>('JobPosting', JobPostingSchema)
