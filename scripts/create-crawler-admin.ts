import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })

const SchoolAdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  name: { type: String, required: true },
  schoolName: { type: String, required: true },
  subscriptionTier: { type: String, default: 'premium' },
  subscriptionStatus: { type: String, default: 'active' },
  passwordHash: { type: String, required: true },
}, { timestamps: true })

const SchoolAdmin = mongoose.models.SchoolAdmin || mongoose.model('SchoolAdmin', SchoolAdminSchema)

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)

  const CRAWLER_EMAIL = 'crawler-system@international-teacher-jobs.com'

  // Check if already exists
  const existing = await SchoolAdmin.findOne({ email: CRAWLER_EMAIL })
  if (existing) {
    console.log(`Crawler admin already exists!`)
    console.log(`CRAWLER_ADMIN_ID=${existing._id}`)
    console.log(`\nAdd this to your .env.local and Vercel env vars.`)
    await mongoose.disconnect()
    return
  }

  // Create system admin account
  const passwordHash = await bcrypt.hash('system-crawler-no-login-' + Date.now(), 10)
  const admin = await SchoolAdmin.create({
    email: CRAWLER_EMAIL,
    name: 'Auto Crawler',
    schoolName: 'System — Auto Crawled Jobs',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    passwordHash,
  })

  console.log(`Crawler admin created!`)
  console.log(`CRAWLER_ADMIN_ID=${admin._id}`)
  console.log(`\nAdd this to your .env.local and Vercel env vars:`)
  console.log(`CRAWLER_ADMIN_ID=${admin._id}`)

  await mongoose.disconnect()
}

main().catch(console.error)
