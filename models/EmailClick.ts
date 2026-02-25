import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IEmailClick extends Document {
  subscriberId: Types.ObjectId
  digestDate: Date
  jobId: Types.ObjectId
  clickedAt: Date
}

const EmailClickSchema = new Schema<IEmailClick>({
  subscriberId: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true },
  digestDate: { type: Date, required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
  clickedAt: { type: Date, default: Date.now },
})

EmailClickSchema.index({ digestDate: 1 })
EmailClickSchema.index({ subscriberId: 1 })

export const EmailClick =
  mongoose.models.EmailClick || mongoose.model<IEmailClick>('EmailClick', EmailClickSchema)
