import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const db = (mongoose.connection as any).db

  const schools = await db.collection('schools').find({
    careerPageUrl: { $exists: true, $ne: null },
    atsPlatform: { $exists: false },
  }).project({ name: 1, country: 1, careerPageUrl: 1, atsDetected: 1, website: 1 }).toArray()

  console.log(`Schools with career pages (no confirmed ATS): ${schools.length}\n`)
  for (const s of schools) {
    const ats = s.atsDetected ? `[${s.atsDetected}]` : ''
    console.log(`${s.name} (${s.country}) ${ats}`)
    console.log(`  ${s.careerPageUrl}`)
  }

  await mongoose.disconnect()
}
main().catch(console.error)
