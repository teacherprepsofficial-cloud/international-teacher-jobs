import mongoose, { Schema, Document } from 'mongoose'
import crypto from 'crypto'

export interface ISubscriber extends Document {
  email: string
  status: 'pending' | 'confirmed' | 'unsubscribed'
  confirmToken: string
  unsubscribeToken: string
  confirmedAt?: Date
  unsubscribedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending',
    },
    confirmToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    unsubscribeToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    confirmedAt: Date,
    unsubscribedAt: Date,
  },
  { timestamps: true }
)

SubscriberSchema.index({ status: 1 })
SubscriberSchema.index({ confirmToken: 1 })
SubscriberSchema.index({ unsubscribeToken: 1 })

export const Subscriber =
  mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema)
