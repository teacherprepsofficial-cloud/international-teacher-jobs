import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Region mapping (same as lib/regions.ts)
const COUNTRY_TO_REGION: Record<string, string> = {
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', BH: 'middle-east',
  OM: 'middle-east', KW: 'middle-east', JO: 'middle-east', LB: 'middle-east',
  IQ: 'middle-east', IR: 'middle-east', IL: 'middle-east',
  CN: 'east-asia', HK: 'east-asia', JP: 'east-asia', KR: 'east-asia',
  TW: 'east-asia', MN: 'east-asia',
  TH: 'southeast-asia', VN: 'southeast-asia', MY: 'southeast-asia', SG: 'southeast-asia',
  ID: 'southeast-asia', PH: 'southeast-asia', KH: 'southeast-asia', MM: 'southeast-asia',
  LA: 'southeast-asia', BN: 'southeast-asia',
  IN: 'south-asia', PK: 'south-asia', BD: 'south-asia', LK: 'south-asia', NP: 'south-asia',
  KZ: 'central-asia', UZ: 'central-asia', GE: 'central-asia', AM: 'central-asia', AZ: 'central-asia',
  GB: 'europe', DE: 'europe', FR: 'europe', ES: 'europe', IT: 'europe', NL: 'europe',
  CH: 'europe', AT: 'europe', BE: 'europe', PT: 'europe', IE: 'europe', SE: 'europe',
  NO: 'europe', DK: 'europe', FI: 'europe', PL: 'europe', CZ: 'europe', HU: 'europe',
  RO: 'europe', GR: 'europe', TR: 'europe', RU: 'europe', UA: 'europe', SK: 'europe',
  BG: 'europe', LU: 'europe', CY: 'europe', MT: 'europe', MC: 'europe', AL: 'europe',
  EG: 'africa', MA: 'africa', NG: 'africa', KE: 'africa', ZA: 'africa', GH: 'africa',
  TZ: 'africa', ET: 'africa', UG: 'africa', RW: 'africa', SN: 'africa', CI: 'africa',
  CM: 'africa', MZ: 'africa', ZM: 'africa', ZW: 'africa', BW: 'africa', NA: 'africa',
  MG: 'africa', MU: 'africa', AO: 'africa', CD: 'africa', CG: 'africa', TN: 'africa',
  DZ: 'africa', LY: 'africa', SD: 'africa',
  US: 'north-america', CA: 'north-america', MX: 'north-america',
  BR: 'central-south-america', AR: 'central-south-america', CL: 'central-south-america',
  CO: 'central-south-america', PE: 'central-south-america', CR: 'central-south-america',
  PA: 'central-south-america', EC: 'central-south-america', UY: 'central-south-america',
  PY: 'central-south-america', BO: 'central-south-america', VE: 'central-south-america',
  GT: 'central-south-america', HN: 'central-south-america', SV: 'central-south-america',
  NI: 'central-south-america',
  JM: 'caribbean', TT: 'caribbean', DO: 'caribbean', CU: 'caribbean',
  HT: 'caribbean', PR: 'caribbean',
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PG: 'oceania', FK: 'oceania',
}

async function backfillRegions() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const db = mongoose.connection.db!

  const jobs = await db.collection('jobpostings').find({ region: { $exists: false } }).toArray()
  console.log(`Found ${jobs.length} jobs without region`)

  let updated = 0
  for (const job of jobs) {
    const region = COUNTRY_TO_REGION[job.countryCode] || 'europe'
    await db.collection('jobpostings').updateOne(
      { _id: job._id },
      { $set: { region } }
    )
    updated++
  }

  // Also fix any jobs that have region: null or region: ''
  const nullRegions = await db.collection('jobpostings').find({
    $or: [{ region: null }, { region: '' }]
  }).toArray()

  for (const job of nullRegions) {
    const region = COUNTRY_TO_REGION[job.countryCode] || 'europe'
    await db.collection('jobpostings').updateOne(
      { _id: job._id },
      { $set: { region } }
    )
    updated++
  }

  console.log(`Updated ${updated} jobs with region data`)

  // Print summary by region
  const regionCounts = await db.collection('jobpostings').aggregate([
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()

  console.log('\nRegion distribution:')
  for (const r of regionCounts) {
    console.log(`  ${r._id || '(none)'}: ${r.count}`)
  }

  await mongoose.disconnect()
}

backfillRegions().catch(console.error)
