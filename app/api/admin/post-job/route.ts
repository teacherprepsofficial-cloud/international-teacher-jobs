import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifySuperAdmin } from '@/lib/admin-auth'
import { JobPosting } from '@/models/JobPosting'
import { School } from '@/models/School'
import { computeContentHash } from '@/lib/job-crawler/parser'
import { getRegionForCountryCode } from '@/lib/regions'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const {
      position,
      schoolName,
      city,
      country,
      countryCode,
      description,
      applicationUrl,
      logo,
      salary,
      contractType,
      startDate,
      positionCategory,
      careerPageUrl,
    } = body

    // Validate required fields
    if (!position || !schoolName || !city || !country || !countryCode || !description || !applicationUrl || !contractType || !startDate || !positionCategory) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const region = getRegionForCountryCode(countryCode)
    const contentHash = computeContentHash(position, schoolName, applicationUrl)

    // Check for duplicate
    const existing = await JobPosting.findOne({ contentHash })
    if (existing) {
      return NextResponse.json({ error: 'A job with these details already exists' }, { status: 409 })
    }

    // Auto-match school from directory (case-insensitive)
    const school = await School.findOne({
      name: { $regex: new RegExp(`^${schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    // Create the job posting — goes live immediately
    const job = await JobPosting.create({
      adminId: admin.adminId,
      schoolId: school?._id || null,
      schoolName,
      city,
      country,
      countryCode,
      region,
      position,
      positionCategory,
      description,
      applicationUrl,
      logo: logo || undefined,
      salary: salary || undefined,
      contractType,
      startDate,
      subscriptionTier: 'premium',
      status: 'live',
      publishedAt: new Date(),
      isAutoCrawled: false,
      contentHash,
    })

    // If we matched a school and a career page URL was provided, save it
    if (school && careerPageUrl) {
      await School.updateOne(
        { _id: school._id },
        { $set: { careerPageUrl } }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: job._id,
      schoolMatched: !!school,
      careerPageSaved: !!(school && careerPageUrl),
    })
  } catch (error) {
    console.error('Post job error:', error)
    return NextResponse.json({ error: 'Failed to post job' }, { status: 500 })
  }
}
