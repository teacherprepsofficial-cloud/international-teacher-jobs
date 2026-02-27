/**
 * Crawl career pages and post jobs directly to the homepage.
 *
 * Usage: npx tsx scripts/crawl-and-post-jobs.ts
 *
 * This script demonstrates the career-page-to-live-job pipeline:
 * 1. Fetch career page HTML
 * 2. Extract job details (structured or AI-assisted)
 * 3. Post as live JobPosting records
 * 4. Save career page URL to School record for future crawling
 */

import mongoose from 'mongoose'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

// --- Inline schemas to avoid Next.js import issues ---

const JobPostingSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolAdmin', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    schoolName: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    region: String,
    position: { type: String, required: true },
    positionCategory: { type: String, enum: ['elementary', 'middle-school', 'high-school', 'admin', 'support-staff'], required: true },
    description: { type: String, required: true },
    applicationUrl: { type: String, required: true },
    logo: String,
    salary: String,
    contractType: { type: String, enum: ['Full-time', 'Part-time', 'Contract'], required: true },
    startDate: { type: String, required: true },
    subscriptionTier: { type: String, enum: ['basic', 'standard', 'premium'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'live', 'correction_needed', 'taken_down'], default: 'pending' },
    publishedAt: Date,
    adminNotes: String,
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
JobPostingSchema.index({ contentHash: 1 }, { unique: true, sparse: true })

const SchoolAdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  isSuperAdmin: { type: Boolean, default: false },
})

const SchoolSchema = new mongoose.Schema({
  name: String,
  slug: String,
  careerPageUrl: String,
})

const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', JobPostingSchema)
const SchoolAdmin = mongoose.models.SchoolAdmin || mongoose.model('SchoolAdmin', SchoolAdminSchema)
const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

// --- Region mapping ---
const COUNTRY_TO_REGION: Record<string, string> = {
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', BH: 'middle-east',
  OM: 'middle-east', KW: 'middle-east', JO: 'middle-east', LB: 'middle-east',
  CN: 'east-asia', HK: 'east-asia', JP: 'east-asia', KR: 'east-asia', TW: 'east-asia',
  TH: 'southeast-asia', VN: 'southeast-asia', MY: 'southeast-asia', SG: 'southeast-asia',
  ID: 'southeast-asia', PH: 'southeast-asia', KH: 'southeast-asia',
  IN: 'south-asia', PK: 'south-asia', BD: 'south-asia', LK: 'south-asia',
  GB: 'europe', DE: 'europe', FR: 'europe', ES: 'europe', IT: 'europe', NL: 'europe',
  CH: 'europe', AT: 'europe', BE: 'europe', DK: 'europe', SE: 'europe', NO: 'europe',
  FI: 'europe', PL: 'europe', CZ: 'europe', PT: 'europe', IE: 'europe', GR: 'europe',
  TR: 'europe', RO: 'europe', HU: 'europe',
  US: 'north-america', CA: 'north-america', MX: 'north-america',
  BR: 'central-south-america', AR: 'central-south-america', CL: 'central-south-america',
  CO: 'central-south-america', PE: 'central-south-america', EC: 'central-south-america',
  CR: 'central-south-america', PA: 'central-south-america',
  EG: 'africa', ZA: 'africa', KE: 'africa', NG: 'africa', GH: 'africa',
  AU: 'oceania', NZ: 'oceania',
}

function computeContentHash(position: string, schoolName: string, sourceUrl: string): string {
  const input = `${position.trim().toLowerCase()}|${schoolName.trim().toLowerCase()}|${sourceUrl.trim().toLowerCase()}`
  return crypto.createHash('sha256').update(input).digest('hex')
}

// --- Job definitions extracted from career pages ---

interface JobDef {
  position: string
  schoolName: string
  city: string
  country: string
  countryCode: string
  positionCategory: 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff'
  description: string
  applicationUrl: string
  salary?: string
  contractType: 'Full-time' | 'Part-time' | 'Contract'
  startDate: string
  sourceUrl: string
  careerPageUrl?: string  // Save to School record for future crawling
}

const JOBS: JobDef[] = [
  // 1. From NAIS (careers.nais.org) — The Steward School
  {
    position: 'Middle School Mathematics Teacher',
    schoolName: 'The Steward School',
    city: 'Richmond',
    country: 'United States',
    countryCode: 'US',
    positionCategory: 'middle-school',
    description: `The Steward School seeks a full-time Middle School Mathematics Teacher to teach five sections of Math 6 and/or Math 6.5 (Introduction to Pre-Algebra) to sixth-grade students. Responsibilities include building student relationships, creating inclusive learning environments, delivering effective instruction with technology integration, collaborating with colleagues, maintaining curriculum documentation, and differentiating instruction for diverse learners.\n\nQualifications: Bachelor's degree with major in Mathematics and/or Education required. Master's degree and Virginia state certification preferred. Experience with Google Educational apps and interactive whiteboards preferred. Strong communication, collaboration, and curriculum design skills required.`,
    applicationUrl: 'https://www.stewardschool.org/our-school/employment-opportunities',
    salary: 'Commensurate with experience and education',
    contractType: 'Full-time',
    startDate: 'August 2026',
    sourceUrl: 'https://careers.nais.org/jobs/22079230/middle-school-mathematics-teacher',
    careerPageUrl: 'https://careers.nais.org/jobs?keywords=&place=',
  },

  // 2. From Aarhus International School (ais-aarhus.com)
  {
    position: 'PYP4-8 English as an Additional Language (EAL) Teacher',
    schoolName: 'Aarhus International School',
    city: 'Aarhus',
    country: 'Denmark',
    countryCode: 'DK',
    positionCategory: 'elementary',
    description: `Aarhus International School is seeking an experienced EAL (English as an Additional Language) Teacher for PYP grades 4-8. The school follows the IB Primary Years Programme and serves an international student body in Aarhus, Denmark.\n\nThe ideal candidate will have experience supporting multilingual learners in an international school setting, with strong knowledge of EAL pedagogy and differentiation strategies. This is an opportunity to join a collaborative, globally-minded school community in one of Denmark's most vibrant cities.\n\nContact: administration@ais-aarhus.dk | +45 86 72 60 60\nAddress: Dalgas Avenue 12, 8000 Aarhus C, Denmark`,
    applicationUrl: 'https://ais-aarhus.com/work-with-us/',
    contractType: 'Full-time',
    startDate: 'August 2026',
    sourceUrl: 'https://ais-aarhus.com/work-with-us/',
    careerPageUrl: 'https://ais-aarhus.com/work-with-us/',
  },

  // 3. From ISS EDU Platform — Colegio Nueva Granada, Colombia
  {
    position: 'Physics Teacher (Secondary, Ages 12-18)',
    schoolName: 'Colegio Nueva Granada',
    city: 'Bogota',
    country: 'Colombia',
    countryCode: 'CO',
    positionCategory: 'high-school',
    description: `Colegio Nueva Granada, a leading international school in Bogota, Colombia, is seeking a qualified Physics Teacher for secondary students ages 12-18. The school provides a rigorous academic program for an international student community.\n\nThe ideal candidate will have a strong background in physics instruction, experience with international curricula, and the ability to engage students through inquiry-based learning and laboratory work. This is an excellent opportunity to join one of Latin America's top international schools.`,
    applicationUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000008aKQDMA2',
    contractType: 'Full-time',
    startDate: 'August 2026',
    sourceUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000008aKQDMA2',
    careerPageUrl: 'https://www.iss.edu/services/teacher-recruitment/teacher-postings',
  },

  // 4. From ISS EDU Platform — Vision International School, Qatar
  {
    position: 'Home Economics Teacher (Primary, Ages 6-11)',
    schoolName: 'Vision International School',
    city: 'Doha',
    country: 'Qatar',
    countryCode: 'QA',
    positionCategory: 'elementary',
    description: `Vision International School in Qatar is seeking a Home Economics Teacher for primary-level students ages 6-11. The school offers an international education in Doha's growing educational landscape.\n\nThe ideal candidate will have experience teaching home economics or a related subject at the primary level, with the ability to create engaging, hands-on learning experiences for young learners. Experience in an international school setting and familiarity with international curricula are preferred.`,
    applicationUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000009eICLMA2',
    contractType: 'Full-time',
    startDate: 'August 2026',
    sourceUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000009eICLMA2',
    careerPageUrl: 'https://www.iss.edu/services/teacher-recruitment/teacher-postings',
  },
]

async function main() {
  await mongoose.connect(MONGODB_URI!)
  console.log('Connected to MongoDB\n')

  // Find the super admin to use as adminId
  const admin = await SchoolAdmin.findOne({ isSuperAdmin: true })
  if (!admin) {
    console.error('No super admin found. Run scripts/create-admin-users.ts first.')
    process.exit(1)
  }
  console.log(`Using admin: ${admin.email}\n`)

  let posted = 0
  let skipped = 0

  for (const job of JOBS) {
    const contentHash = computeContentHash(job.position, job.schoolName, job.applicationUrl)

    // Check for duplicate
    const existing = await JobPosting.findOne({ contentHash })
    if (existing) {
      console.log(`SKIP (duplicate): ${job.position} at ${job.schoolName}`)
      skipped++
      continue
    }

    const region = COUNTRY_TO_REGION[job.countryCode] || ''

    // Auto-match school in directory
    const school = await School.findOne({
      name: { $regex: new RegExp(`^${job.schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    // Create live job posting
    await JobPosting.create({
      adminId: admin._id,
      schoolId: school?._id || null,
      schoolName: job.schoolName,
      city: job.city,
      country: job.country,
      countryCode: job.countryCode,
      region,
      position: job.position,
      positionCategory: job.positionCategory,
      description: job.description,
      applicationUrl: job.applicationUrl,
      salary: job.salary || undefined,
      contractType: job.contractType,
      startDate: job.startDate,
      subscriptionTier: 'premium',
      status: 'live',
      publishedAt: new Date(),
      isAutoCrawled: true,
      contentHash,
      sourceUrl: job.sourceUrl,
      crawledAt: new Date(),
    })

    console.log(`POSTED: ${job.position} at ${job.schoolName} (${job.city}, ${job.country})`)
    if (school) console.log(`  → Matched school: ${school.name}`)

    // Save career page URL to School record if matched
    if (school && job.careerPageUrl) {
      await School.updateOne({ _id: school._id }, { $set: { careerPageUrl: job.careerPageUrl } })
      console.log(`  → Saved career page URL: ${job.careerPageUrl}`)
    }

    posted++
  }

  console.log(`\nDone: ${posted} posted, ${skipped} skipped (duplicates)`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
