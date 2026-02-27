/**
 * Standalone ATS crawl script — pulls jobs from schools with confirmed
 * Greenhouse / Lever / Workable ATS platforms.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import crypto from 'crypto'

// ── Minimal schema redeclarations ──────────────────────────────────────────
const SchoolSchema = new mongoose.Schema({ name: String, atsPlatform: String, atsSlug: String }, { strict: false })
const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

const JobPostingSchema = new mongoose.Schema({
  title: String,
  schoolName: String,
  schoolId: mongoose.Schema.Types.ObjectId,
  location: String,
  country: String,
  countryCode: String,
  jobType: String,
  subjects: [String],
  salary: String,
  currency: String,
  description: String,
  applicationUrl: String,
  expiresAt: Date,
  postedAt: Date,
  status: { type: String, default: 'live' },
  source: String,
  sourceJobId: String,
  contentHash: String,
  crawledAt: Date,
  postedById: mongoose.Schema.Types.ObjectId,
}, { timestamps: true })

const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', JobPostingSchema)

// ── Helpers ──────────────────────────────────────────────────────────────
function computeHash(...parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex')
}

interface JobData {
  title: string
  location?: string
  url: string
  postedAt?: Date
  description?: string
}

async function saveJob(job: JobData, school: any, source: string): Promise<boolean> {
  const hash = computeHash(job.title, school.name, job.url)
  const existing = await JobPosting.findOne({ contentHash: hash })
  if (existing) return false

  await JobPosting.create({
    title: job.title,
    schoolName: school.name,
    schoolId: school._id,
    location: job.location || school.city || null,
    country: school.country,
    countryCode: school.countryCode,
    applicationUrl: job.url,
    description: job.description || '',
    postedAt: job.postedAt || new Date(),
    status: 'live',
    source,
    sourceJobId: job.url,
    contentHash: hash,
    crawledAt: new Date(),
    postedById: new mongoose.Types.ObjectId(process.env.CRAWLER_ADMIN_ID!),
  })
  return true
}

// ── Greenhouse ──────────────────────────────────────────────────────────
async function crawlGreenhouse(school: any): Promise<{ found: number; saved: number }> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${school.atsSlug}/jobs?content=true`
  const res = await fetch(url, { headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' } })
  if (!res.ok) return { found: 0, saved: 0 }
  const data = await res.json() as any
  const jobs: any[] = data.jobs || []
  let saved = 0
  for (const j of jobs) {
    const ok = await saveJob({
      title: j.title,
      location: j.location?.name,
      url: j.absolute_url || `https://boards.greenhouse.io/${school.atsSlug}/jobs/${j.id}`,
      postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
      description: j.content ? j.content.replace(/<[^>]+>/g, '').slice(0, 2000) : undefined,
    }, school, 'greenhouse')
    if (ok) saved++
  }
  return { found: jobs.length, saved }
}

// ── Lever ──────────────────────────────────────────────────────────────
async function crawlLever(school: any): Promise<{ found: number; saved: number }> {
  const url = `https://api.lever.co/v0/postings/${school.atsSlug}?mode=json`
  const res = await fetch(url, { headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' } })
  if (!res.ok) return { found: 0, saved: 0 }
  const jobs = await res.json() as any[]
  let saved = 0
  for (const j of jobs) {
    const ok = await saveJob({
      title: j.text,
      location: j.categories?.location,
      url: j.hostedUrl || `https://jobs.lever.co/${school.atsSlug}/${j.id}`,
      postedAt: j.createdAt ? new Date(j.createdAt) : undefined,
      description: j.descriptionPlain?.slice(0, 2000),
    }, school, 'lever')
    if (ok) saved++
  }
  return { found: jobs.length, saved }
}

// ── Workable ──────────────────────────────────────────────────────────
async function crawlWorkable(school: any): Promise<{ found: number; saved: number }> {
  const url = `https://apply.workable.com/api/v2/accounts/${school.atsSlug}/jobs`
  const res = await fetch(url, { headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' } })
  if (!res.ok) return { found: 0, saved: 0 }
  const data = await res.json() as any
  const jobs: any[] = data.results || []
  let saved = 0
  for (const j of jobs) {
    const ok = await saveJob({
      title: j.title,
      location: j.location?.city,
      url: `https://apply.workable.com/${school.atsSlug}/j/${j.shortcode}`,
      postedAt: j.published_on ? new Date(j.published_on) : undefined,
    }, school, 'workable')
    if (ok) saved++
  }
  return { found: jobs.length, saved }
}

// ── BambooHR ─────────────────────────────────────────────────────────
async function crawlBambooHR(school: any, subdomain: string): Promise<{ found: number; saved: number }> {
  const url = `https://${subdomain}.bamboohr.com/careers/list`
  const res = await fetch(url, { headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' } })
  if (!res.ok) return { found: 0, saved: 0 }
  const data = await res.json() as any
  const jobs: any[] = data.result || []
  let saved = 0
  for (const j of jobs) {
    const jobId = j.id
    const ok = await saveJob({
      title: j.jobOpeningName,
      location: j.location?.city || j.atsLocation?.city || undefined,
      url: `https://${subdomain}.bamboohr.com/careers/${jobId}`,
      description: j.jobOpeningName,
    }, school, 'bamboohr')
    if (ok) saved++
  }
  return { found: jobs.length, saved }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB\n')

  const schools = await School.find({
    atsPlatform: { $in: ['greenhouse', 'lever', 'workable'] },
    atsSlug: { $exists: true, $ne: null },
  }).lean()

  console.log(`Found ${schools.length} schools with confirmed ATS platforms\n`)

  let totalFound = 0, totalSaved = 0

  for (const school of schools) {
    const s = school as any
    let result = { found: 0, saved: 0 }
    try {
      if (s.atsPlatform === 'greenhouse') result = await crawlGreenhouse(s)
      else if (s.atsPlatform === 'lever') result = await crawlLever(s)
      else if (s.atsPlatform === 'workable') result = await crawlWorkable(s)

      console.log(`✅ ${s.name} (${s.atsPlatform}/${s.atsSlug}): ${result.found} jobs found, ${result.saved} new`)
      totalFound += result.found
      totalSaved += result.saved
    } catch (err: any) {
      console.log(`❌ ${s.name}: ${err.message}`)
    }
  }

  // ── BambooHR schools (detected via career page HTML scan) ──────────────
  console.log('\n── BambooHR schools ──')
  const bambooSchools = await School.find({ atsDetected: 'bamboohr', careerPageUrl: { $exists: true } }).lean()

  for (const school of bambooSchools) {
    const s = school as any
    // Extract subdomain from careerPageUrl or website (e.g. https://cmis.bamboohr.com → cmis)
    // First try to fetch the career page HTML to find the subdomain
    try {
      const pageRes = await fetch(s.careerPageUrl, { headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' }, signal: AbortSignal.timeout(8000) })
      const html = await pageRes.text()
      const match = html.match(/https?:\/\/([a-z0-9-]+)\.bamboohr\.com/i)
      if (match) {
        const subdomain = match[1]
        const result = await crawlBambooHR(s, subdomain)
        console.log(`✅ ${s.name} (bamboohr/${subdomain}): ${result.found} jobs found, ${result.saved} new`)
        totalFound += result.found
        totalSaved += result.saved
      } else {
        console.log(`⚠️  ${s.name}: BambooHR subdomain not found in career page`)
      }
    } catch (err: any) {
      console.log(`❌ ${s.name}: ${err.message}`)
    }
  }

  console.log(`\n════════════════════════════════`)
  console.log(`Total jobs found: ${totalFound}`)
  console.log(`Total jobs saved: ${totalSaved}`)
  console.log(`Total jobs in DB: ${await JobPosting.countDocuments({ status: 'live' })}`)

  await mongoose.disconnect()
}

main().catch(console.error)
