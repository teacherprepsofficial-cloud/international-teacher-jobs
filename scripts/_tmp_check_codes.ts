import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { JobPosting } from '../models/JobPosting'

async function main() {
  const uri = process.env.MONGODB_URI as string
  await mongoose.connect(uri)
  const jobs = await JobPosting.find({ status: 'live' }, 'countryCode country position').lean()
  const codes = [...new Set(jobs.map((j: any) => j.countryCode))]
  console.log('Unique country codes:', codes)
  console.log('')
  jobs.forEach((j: any) => console.log(j.countryCode || 'MISSING', '|', j.country, '|', j.position))
  await mongoose.disconnect()
}
main()
