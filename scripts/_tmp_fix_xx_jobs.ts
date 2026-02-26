import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { JobPosting } from '../models/JobPosting'

async function main() {
  const uri = process.env.MONGODB_URI as string
  await mongoose.connect(uri)

  const xxJobs = await JobPosting.find({ countryCode: 'XX' }).lean()
  console.log(`Found ${xxJobs.length} jobs with countryCode XX`)

  let fixed = 0
  for (const job of xxJobs) {
    await JobPosting.updateOne(
      { _id: job._id },
      { $set: { countryCode: 'GB', country: 'United Kingdom' } }
    )
    console.log(`Fixed: ${(job as any).city} | ${(job as any).position} → GB`)
    fixed++
  }

  console.log(`\nFixed ${fixed} jobs: XX → GB (United Kingdom)`)
  await mongoose.disconnect()
}
main()
