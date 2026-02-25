import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAdminMessage extends Document {
  jobId: Types.ObjectId
  schoolAdminId: Types.ObjectId
  fromSuperAdmin: boolean
  message: string
  isRead: boolean
  createdAt: Date
}

const AdminMessageSchema = new Schema<IAdminMessage>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
    schoolAdminId: { type: Schema.Types.ObjectId, ref: 'SchoolAdmin', required: true },
    fromSuperAdmin: { type: Boolean, default: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

AdminMessageSchema.index({ schoolAdminId: 1, isRead: 1 })

export const AdminMessage =
  mongoose.models.AdminMessage || mongoose.model<IAdminMessage>('AdminMessage', AdminMessageSchema)
