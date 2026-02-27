/**
 * Verifies that each school's ATS slug actually points to their school
 * by checking the company name in the ATS board response.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SchoolSchema = new mongoose.Schema({ name: String, atsPlatform: String, atsSlug: String, country: String }, { strict: false })
const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

async function verifyGreenhouse(slug: string): Promise<string | null> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = await res.json() as any
  return data.name || null
}

async function verifyLever(slug: string): Promise<string | null> {
  // Lever doesn't have a board info endpoint - check first posting
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=1`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const jobs = await res.json() as any[]
  if (!Array.isArray(jobs) || jobs.length === 0) return `${slug} (no jobs)`
  return `${slug} (${jobs.length} postings)`
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  
  const schools = await School.find({
    atsPlatform: { $in: ['greenhouse', 'lever', 'workable'] },
    atsSlug: { $exists: true },
  }).lean()

  console.log(`Verifying ${schools.length} ATS slugs...\n`)

  for (const school of schools) {
    const s = school as any
    let atsName: string | null = null
    
    if (s.atsPlatform === 'greenhouse') atsName = await verifyGreenhouse(s.atsSlug)
    else if (s.atsPlatform === 'lever') atsName = await verifyLever(s.atsSlug)
    
    const match = atsName?.toLowerCase().includes(s.name.toLowerCase().split(' ')[0].toLowerCase())
    const status = match ? '✅' : atsName ? '❌ MISMATCH' : '⚠️  NO BOARD'
    console.log(`${status} ${s.name} (${s.country})`)
    console.log(`   ATS: ${s.atsPlatform}/${s.atsSlug} → "${atsName}"`)
  }
  
  await mongoose.disconnect()
}
main().catch(console.error)
