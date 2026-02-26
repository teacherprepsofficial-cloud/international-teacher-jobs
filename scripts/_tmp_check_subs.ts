import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const uri = process.env.MONGODB_URI as string
  await mongoose.connect(uri)
  const db = mongoose.connection.db as any
  const subs = await db.collection('subscribers').find({}).toArray()
  console.log('Subscribers in DB:', subs.length)
  subs.forEach((s: any) => {
    console.log('  -', s.email, '| status:', s.status, '| created:', s.createdAt)
  })
  await mongoose.disconnect()
}
check()
