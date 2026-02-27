import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

// SchoolAdmin schema inline to avoid Next.js import issues
const SchoolAdminSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true },
    name: { type: String, required: true },
    schoolName: { type: String, required: true },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    subscriptionTier: { type: String, enum: ['basic', 'standard', 'premium'], default: 'basic' },
    subscriptionStatus: { type: String, enum: ['active', 'cancelled', 'past_due'], default: 'active' },
    passwordHash: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
)

const SchoolAdmin =
  mongoose.models.SchoolAdmin || mongoose.model('SchoolAdmin', SchoolAdminSchema)

interface AdminAccount {
  email: string
  name: string
  role: string
}

const ADMINS: AdminAccount[] = [
  { email: 'hello@internationalteacherjobs.com', name: 'Admin', role: 'Administrator' },
  { email: 'support@teacherpreps.com', name: 'Support', role: 'Assistant' },
]

async function main() {
  await mongoose.connect(MONGODB_URI!)
  console.log('Connected to MongoDB\n')

  for (const admin of ADMINS) {
    // Generate a random password
    const password = crypto.randomBytes(12).toString('base64url')
    const passwordHash = await bcrypt.hash(password, 12)

    // Upsert: create or update
    await SchoolAdmin.findOneAndUpdate(
      { email: admin.email },
      {
        $set: {
          name: admin.name,
          schoolName: 'InternationalTeacherJobs',
          passwordHash,
          isSuperAdmin: true,
          subscriptionTier: 'premium',
          subscriptionStatus: 'active',
        },
      },
      { upsert: true, new: true }
    )

    console.log(`${admin.role}: ${admin.email}`)
    console.log(`  Password: ${password}`)
    console.log()
  }

  console.log('Save these credentials securely. They cannot be recovered.\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
