import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JobSchema = new mongoose.Schema({
  title: String, schoolName: String, country: String, source: String, status: String, applicationUrl: String
}, { strict: false })
const Job = mongoose.models.JobPosting || mongoose.model('JobPosting', JobSchema)

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const jobs = await Job.find({ status: 'live', source: { $in: ['greenhouse', 'lever', 'workable', 'bamboohr'] } })
    .select('title schoolName country source').lean()
  
  console.log(`Scraped jobs (live): ${jobs.length}\n`)
  const bySchool: any = {}
  for (const j of jobs) {
    const key = `${(j as any).schoolName} (${(j as any).source})`
    if (!bySchool[key]) bySchool[key] = []
    bySchool[key].push((j as any).title)
  }
  for (const [school, titles] of Object.entries(bySchool)) {
    console.log(`\n${school}: ${(titles as any[]).length} jobs`)
    ;(titles as string[]).forEach(t => console.log(`  - ${t}`))
  }
  await mongoose.disconnect()
}
main().catch(console.error)
