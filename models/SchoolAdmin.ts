import mongoose, { Schema, Document } from 'mongoose'

export interface ISchoolAdmin extends Document {
  email: string
  name: string
  schoolName: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionTier: 'basic' | 'standard' | 'premium'
  subscriptionStatus: 'active' | 'cancelled' | 'past_due'
  passwordHash: string
  resetToken?: string
  resetTokenExpires?: Date
  createdAt: Date
  updatedAt: Date
}

const SchoolAdminSchema = new Schema<ISchoolAdmin>(
  {
    email: { type: String, unique: true, required: true, lowercase: true },
    name: { type: String, required: true },
    schoolName: { type: String, required: true },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    subscriptionTier: { type: String, enum: ['basic', 'standard', 'premium'], default: 'basic' },
    subscriptionStatus: { type: String, enum: ['active', 'cancelled', 'past_due'], default: 'active' },
    passwordHash: { type: String, required: true },
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
)

export const SchoolAdmin =
  mongoose.models.SchoolAdmin || mongoose.model<ISchoolAdmin>('SchoolAdmin', SchoolAdminSchema)
