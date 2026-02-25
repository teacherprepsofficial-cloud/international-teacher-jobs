import mongoose, { Schema, Document } from 'mongoose'

export interface ICrawlRun extends Document {
  type: 'crawl' | 'stale-check'
  startedAt: Date
  completedAt: Date
  durationMs: number
  jobsFound: number
  jobsNew: number
  jobsSkipped: number
  crawlErrors: string[]
  sourceResults?: any[]
  staleCheckResults?: {
    totalChecked: number
    stillLive: number
    markedTakenDown: number
    failedChecks: number
  }
  createdAt: Date
}

const CrawlRunSchema = new Schema<ICrawlRun>(
  {
    type: { type: String, enum: ['crawl', 'stale-check'], required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    jobsFound: { type: Number, default: 0 },
    jobsNew: { type: Number, default: 0 },
    jobsSkipped: { type: Number, default: 0 },
    crawlErrors: [String],
    sourceResults: Schema.Types.Mixed,
    staleCheckResults: Schema.Types.Mixed,
  },
  { timestamps: true }
)

CrawlRunSchema.index({ type: 1, createdAt: -1 })

export const CrawlRun =
  mongoose.models.CrawlRun || mongoose.model<ICrawlRun>('CrawlRun', CrawlRunSchema)
