export interface CrawledJob {
  position: string
  schoolName: string
  city: string
  country: string
  countryCode: string
  region: string
  description: string
  sourceUrl: string
  sourceKey: string
  salary?: string
  contractType: 'Full-time' | 'Part-time' | 'Contract'
  startDate?: string
  positionCategory: 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff'
  // For ATS jobs we can link directly to the school record
  schoolId?: string
}

export interface JobSource {
  id: string
  name: string
  baseUrl: string
  searchUrl: string
  parserType: 'tes' | 'tie-online'
  maxPages: number
}

export interface CrawlResult {
  source: string
  jobsFound: number
  jobsNew: number
  jobsSkipped: number
  errors: string[]
  durationMs: number
}

export interface StaleCheckResult {
  totalChecked: number
  stillLive: number
  markedTakenDown: number
  failedChecks: number
  errors: string[]
  durationMs: number
}

// ATS discovery result for a single school
export interface AtsDiscoveryResult {
  schoolId: string
  schoolName: string
  platform: 'greenhouse' | 'lever' | 'workable'
  slug: string
  jobCount: number
}
