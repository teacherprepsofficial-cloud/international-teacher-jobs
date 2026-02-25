import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { SchoolAdmin } from '../models/SchoolAdmin'
import { JobPosting } from '../models/JobPosting'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/international-teacher-jobs'

const SAMPLE_JOBS = [
  {
    schoolName: 'Taipei European School',
    city: 'Taipei',
    country: 'Taiwan',
    countryCode: 'TW',
    position: 'Middle School Math Specialist',
    positionCategory: 'middle-school',
    description:
      'We are looking for an experienced mathematics educator to join our middle school team. The ideal candidate should have a passion for making mathematics engaging and accessible to all students. Responsibilities include curriculum development, classroom instruction, and extracurricular support.',
    applicationUrl: 'https://taipeischool.edu/careers',
    salary: '$65,000–$80,000/yr',
    contractType: 'Full-time',
    startDate: 'August 2026',
    subscriptionTier: 'premium',
    status: 'live',
    publishedAt: new Date(),
  },
  {
    schoolName: 'Bangkok International School',
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    position: 'Elementary English Teacher',
    positionCategory: 'elementary',
    description:
      'Seeking enthusiastic English Language Arts teacher for grades 1-3. We value creative teaching methods, student-centered learning, and strong communication with parents. Experience with integrated curriculum and differentiated instruction preferred.',
    applicationUrl: 'https://bangkokint.edu/jobs',
    salary: '$50,000–$70,000/yr',
    contractType: 'Full-time',
    startDate: 'August 2026',
    subscriptionTier: 'standard',
    status: 'live',
    publishedAt: new Date(),
  },
  {
    schoolName: 'Dubai International Academy',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    position: 'High School Science Teacher (Physics)',
    positionCategory: 'high-school',
    description:
      'Looking for a passionate Physics teacher to inspire the next generation of scientists. Must have strong laboratory experience and the ability to engage students in hands-on learning. Our school offers excellent facilities and professional development opportunities.',
    applicationUrl: 'https://dubaiacademy.ae/careers',
    salary: '$80,000–$120,000/yr',
    contractType: 'Full-time',
    startDate: 'August 2026',
    subscriptionTier: 'basic',
    status: 'live',
    publishedAt: new Date(),
  },
  {
    schoolName: 'Mexico City International School',
    city: 'Mexico City',
    country: 'Mexico',
    countryCode: 'MX',
    position: 'Spanish Language Program Coordinator',
    positionCategory: 'admin',
    description:
      'Oversee the Spanish language program across all grade levels. Responsibilities include curriculum coordination, professional development for teachers, and liaison with parents. Experience in bilingual education required.',
    applicationUrl: 'https://mexicocity-intl.edu/positions',
    salary: '$75,000–$95,000/yr',
    contractType: 'Full-time',
    startDate: 'August 2026',
    subscriptionTier: 'basic',
    status: 'live',
    publishedAt: new Date(),
  },
  {
    schoolName: 'Singapore Heritage Academy',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    position: 'School Nurse',
    positionCategory: 'support-staff',
    description:
      'Join our student health team to provide comprehensive health services. Responsibilities include health education, preventive care, and student wellness programs. Must be a registered nurse with experience in school settings.',
    applicationUrl: 'https://sgheritage.edu.sg/careers',
    salary: '$55,000–$75,000/yr',
    contractType: 'Full-time',
    startDate: 'August 2026',
    subscriptionTier: 'basic',
    status: 'live',
    publishedAt: new Date(),
  },
]

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Clear existing data
    await SchoolAdmin.deleteMany({})
    await JobPosting.deleteMany({})
    console.log('Cleared existing data')

    // Create sample school admins
    const admins = []
    const adminData = [
      {
        email: 'admin@taipei-school.edu',
        name: 'Maria Chen',
        schoolName: 'Taipei European School',
        subscriptionTier: 'premium',
      },
      {
        email: 'admin@bangkok-school.edu',
        name: 'Somchai Rajphet',
        schoolName: 'Bangkok International School',
        subscriptionTier: 'standard',
      },
      {
        email: 'admin@dubai-academy.ae',
        name: 'Sarah Johnson',
        schoolName: 'Dubai International Academy',
        subscriptionTier: 'basic',
      },
      {
        email: 'admin@mexico-school.edu',
        name: 'Carlos García',
        schoolName: 'Mexico City International School',
        subscriptionTier: 'basic',
      },
      {
        email: 'admin@singapore-school.edu',
        name: 'Priya Nair',
        schoolName: 'Singapore Heritage Academy',
        subscriptionTier: 'basic',
      },
    ]

    for (const data of adminData) {
      const passwordHash = await bcrypt.hash('password123', 10)
      const admin = await SchoolAdmin.create({
        ...data,
        passwordHash,
        subscriptionStatus: 'active',
      })
      admins.push(admin)
    }

    console.log(`Created ${admins.length} school admins`)

    // Create sample jobs
    const jobsWithAdmins = SAMPLE_JOBS.map((job, index) => ({
      ...job,
      adminId: admins[index]._id,
    }))

    await JobPosting.insertMany(jobsWithAdmins)
    console.log(`Created ${jobsWithAdmins.length} sample jobs`)

    console.log('✅ Seeding complete!')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

seed()
