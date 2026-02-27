/**
 * Find schools that might belong to major international school networks
 * by checking for network keywords in school names.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const NETWORKS = [
  { name: 'Nord Anglia', keywords: ['nord anglia', 'nordanglia'] },
  { name: 'GEMS', keywords: ['gems '] },
  { name: 'ISP (International Schools Partnership)', keywords: [' isp', 'international school of'] },
  { name: 'Cognita', keywords: ['cognita', 'ruamrudee', 'shrewsbury', 'stonehill'] },
  { name: 'Inspired', keywords: ['inspired'] },
  { name: 'Maple Bear', keywords: ['maple bear'] },
  { name: 'ACS International', keywords: ['acs '] },
  { name: 'Harrow', keywords: ['harrow '] },
  { name: 'Dulwich College', keywords: ['dulwich'] },
  { name: 'British School', keywords: ['british school'] },
  { name: 'American School', keywords: ['american school of', 'american international school'] },
  { name: 'Tandem', keywords: ['tandem'] },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const db = (mongoose.connection as any).db

  const allSchools = await db.collection('schools').find({}).project({ name: 1, country: 1 }).toArray()

  for (const network of NETWORKS) {
    const matches = allSchools.filter((s: any) => {
      const n = s.name.toLowerCase()
      return network.keywords.some(k => n.includes(k))
    })
    if (matches.length > 0) {
      console.log(`\n${network.name} (${matches.length} schools):`)
      matches.forEach((s: any) => console.log(`  - ${s.name} (${s.country})`))
    }
  }

  await mongoose.disconnect()
}
main().catch(console.error)
