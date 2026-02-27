/**
 * Scans career pages of schools to detect BambooHR subdomains.
 * Then tests the BambooHR careers API to pull job listings.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SchoolSchema = new mongoose.Schema({ name: String, careerPageUrl: String, website: String, atsDetected: String }, { strict: false })
const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

async function findBambooSubdomain(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    const html = await res.text()
    const match = html.match(/https?:\/\/([a-z0-9-]+)\.bamboohr\.com/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function testBambooHR(subdomain: string): Promise<number> {
  try {
    const res = await fetch(`https://${subdomain}.bamboohr.com/careers/list`, {
      headers: { 'User-Agent': 'InternationalTeacherJobs/1.0' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return 0
    const data = await res.json() as any
    return (data.result || []).length
  } catch {
    return 0
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)

  // Get all schools with career pages (not just the detected ones)
  const schools = await School.find({
    careerPageUrl: { $exists: true, $ne: null },
  }).lean()

  console.log(`Scanning ${schools.length} career pages for BambooHR...\n`)

  const found: Array<{ name: string, subdomain: string, jobCount: number }> = []

  for (const school of schools) {
    const s = school as any
    const subdomain = await findBambooSubdomain(s.careerPageUrl)
    if (subdomain) {
      const jobCount = await testBambooHR(subdomain)
      console.log(`✅ ${s.name}: bamboohr/${subdomain} (${jobCount} jobs)`)
      found.push({ name: s.name, subdomain, jobCount })
    }
  }

  console.log(`\n════════════════════`)
  console.log(`BambooHR schools found: ${found.length}`)
  console.log(`Total jobs available: ${found.reduce((a, b) => a + b.jobCount, 0)}`)

  await mongoose.disconnect()
}
main().catch(console.error)
