import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { School } from '@/models/School'
import { JobPosting } from '@/models/JobPosting'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region')
    const country = searchParams.get('country')
    const curriculum = searchParams.get('curriculum')
    const hiring = searchParams.get('hiring')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = 24
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    if (region) query.region = region
    if (country) query.countryCode = country
    if (curriculum) query.curriculum = curriculum
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
      ]
    }

    // If "Currently Hiring" filter is active, first get schoolIds with live jobs
    if (hiring === 'true') {
      const hiringSchoolIds = await JobPosting.distinct('schoolId', {
        status: 'live',
        schoolId: { $ne: null },
      })
      query._id = { $in: hiringSchoolIds }
    }

    // Count total for pagination
    const total = await School.countDocuments(query)

    // Fetch schools sorted: verified first → completeness desc → name asc
    const schools = await School.find(query)
      .sort({ isVerified: -1, profileCompleteness: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get active job counts for these schools
    const schoolIds = schools.map((s: any) => s._id)
    const jobCounts = await JobPosting.aggregate([
      { $match: { schoolId: { $in: schoolIds }, status: 'live' } },
      { $group: { _id: '$schoolId', count: { $sum: 1 } } },
    ])
    const jobCountMap: Record<string, number> = {}
    for (const jc of jobCounts) {
      jobCountMap[jc._id.toString()] = jc.count
    }

    const schoolsWithJobs = (schools as any[]).map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      country: s.country,
      countryCode: s.countryCode,
      city: s.city,
      region: s.region,
      curriculum: s.curriculum || [],
      schoolType: s.schoolType,
      isVerified: s.isVerified,
      claimed: s.claimed,
      profileCompleteness: s.profileCompleteness,
      logo: s.logo,
      activeJobCount: jobCountMap[s._id.toString()] || 0,
    }))

    return NextResponse.json({
      schools: schoolsWithJobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch schools:', error)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}
