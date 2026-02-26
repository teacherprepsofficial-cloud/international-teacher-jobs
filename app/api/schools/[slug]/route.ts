import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { School } from '@/models/School'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { JobPosting } from '@/models/JobPosting'
import { calculateProfileCompleteness, UPDATABLE_PROFILE_FIELDS } from '@/lib/school-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const school = await School.findOne({ slug }).lean() as any
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Get active jobs for this school
    const activeJobs = await JobPosting.find({
      schoolId: school._id,
      status: 'live',
    })
      .sort({ publishedAt: -1 })
      .lean()

    const jobs = (activeJobs as any[]).map((j) => ({
      _id: j._id.toString(),
      position: j.position,
      positionCategory: j.positionCategory,
      city: j.city,
      country: j.country,
      contractType: j.contractType,
      startDate: j.startDate,
      salary: j.salary,
      publishedAt: j.publishedAt,
    }))

    return NextResponse.json({
      school: {
        _id: school._id.toString(),
        name: school.name,
        slug: school.slug,
        country: school.country,
        countryCode: school.countryCode,
        city: school.city,
        region: school.region,
        description: school.description,
        website: school.website,
        logo: school.logo,
        photos: school.photos || [],
        curriculum: school.curriculum || [],
        gradeRange: school.gradeRange,
        schoolType: school.schoolType,
        studentCount: school.studentCount,
        foundedYear: school.foundedYear,
        languages: school.languages || [],
        accreditations: school.accreditations || [],
        benefits: school.benefits || [],
        contactEmail: school.contactEmail,
        careerPageUrl: school.careerPageUrl,
        claimed: school.claimed,
        isVerified: school.isVerified,
        profileCompleteness: school.profileCompleteness,
      },
      jobs,
    })
  } catch (error) {
    console.error('Failed to fetch school:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Auth required
    const token = await getAuthCookie()
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await connectDB()
    const { slug } = await params

    const school = await School.findOne({ slug })
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Must be the claimer
    if (!school.claimed || school.claimedBy?.toString() !== payload.adminId) {
      return NextResponse.json({ error: 'Not authorized to edit this school' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow whitelisted fields
    const updates: any = {}
    for (const field of UPDATABLE_PROFILE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Apply updates
    Object.assign(school, updates)

    // Recalculate profile completeness
    school.profileCompleteness = calculateProfileCompleteness(school)

    await school.save()

    return NextResponse.json({
      success: true,
      profileCompleteness: school.profileCompleteness,
    })
  } catch (error) {
    console.error('Failed to update school:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
