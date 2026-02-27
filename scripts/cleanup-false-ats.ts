/**
 * Removes ATS slugs from schools where the slug points to the wrong company,
 * and removes the associated false-positive job postings.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SchoolSchema = new mongoose.Schema({ name: String, atsPlatform: String, atsSlug: String }, { strict: false })
const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

const JobSchema = new mongoose.Schema({ source: String, schoolId: mongoose.Schema.Types.ObjectId }, { strict: false })
const Job = mongoose.models.JobPosting || mongoose.model('JobPosting', JobSchema)

// These school IDs have confirmed false-positive ATS slugs
// Based on verification: keystone→Keystone Strategy, korea→SIE Korea, nexus→CGS Nexus, spain→capSpire, capetown→Impact
const CONFIRMED_FALSE_POSITIVES = [
  'keystone',   // greenhouse/keystone → Keystone Strategy (consulting), not Keystone Academy Beijing
  'korea',      // greenhouse/korea → SIE Korea, not Korea International School  
  'nexus',      // greenhouse/nexus → CGS Nexus (IT), not Nexus International School Malaysia
  'spain',      // greenhouse/spain → capSpire Spain, not International College Spain
  'capetown',   // greenhouse/capetown → Impact Cape Town, not Int'l School of Cape Town
  'markham',    // lever/markham → unknown company with Business Dev Manager jobs
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  
  // Find schools with false-positive ATS slugs
  const falseSchools = await School.find({
    atsSlug: { $in: CONFIRMED_FALSE_POSITIVES }
  }).lean()
  
  console.log(`Found ${falseSchools.length} schools with false-positive ATS slugs:\n`)
  for (const s of falseSchools) {
    const school = s as any
    console.log(` - ${school.name}: ${school.atsPlatform}/${school.atsSlug}`)
  }
  
  const schoolIds = falseSchools.map((s: any) => s._id)
  
  // Remove jobs from these schools
  const jobResult = await Job.deleteMany({ schoolId: { $in: schoolIds } })
  console.log(`\nDeleted ${jobResult.deletedCount} false-positive job listings`)
  
  // Clear ATS fields from these schools
  const schoolResult = await School.updateMany(
    { atsSlug: { $in: CONFIRMED_FALSE_POSITIVES } },
    { $unset: { atsPlatform: '', atsSlug: '', atsDiscoveredAt: '' } }
  )
  console.log(`Cleared ATS data from ${schoolResult.modifiedCount} schools`)
  
  // Show remaining ATS schools
  const remaining = await School.find({ atsPlatform: { $exists: true } }).lean()
  console.log(`\nRemaining confirmed ATS schools: ${remaining.length}`)
  for (const s of remaining) {
    const school = s as any
    console.log(` - ${school.name}: ${school.atsPlatform}/${school.atsSlug}`)
  }
  
  const jobCount = await Job.countDocuments({ status: 'live' })
  console.log(`\nLive jobs remaining: ${jobCount}`)
  
  await mongoose.disconnect()
}
main().catch(console.error)
