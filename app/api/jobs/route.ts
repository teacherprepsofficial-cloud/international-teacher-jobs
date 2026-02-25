import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const TIER_LIMITS: Record<string, number> = {
  basic: 3,      // Starter $99/mo
  standard: 10,  // Plus $199/mo
  premium: 20,   // Premium $299/mo
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')
    const category = searchParams.get('category')
    const region = searchParams.get('region')

    const query: any = { status: 'live' }
    if (region) query.region = region
    if (country) query.countryCode = country
    if (category) query.positionCategory = category

    const [rawJobs, totalLiveCount] = await Promise.all([
      JobPosting.find(query)
        .populate('adminId', 'schoolName')
        .sort({ publishedAt: -1 })
        .lean(),
      JobPosting.countDocuments({ status: 'live' }),
    ])

    // Sort by publishedAt (when approved/went live), NOT createdAt (when crawler found it).
    // Within each day: premium first, then plus, then starter. Within same tier: newest first.
    const tierPriority: Record<string, number> = { premium: 0, standard: 1, basic: 2 }
    const jobs = (rawJobs as any[]).sort((a, b) => {
      const pubA = a.publishedAt || a.createdAt
      const pubB = b.publishedAt || b.createdAt
      // Group by date first (newest day first)
      const dayA = new Date(pubA).toDateString()
      const dayB = new Date(pubB).toDateString()
      if (dayA !== dayB) {
        return new Date(pubB).getTime() - new Date(pubA).getTime()
      }
      // Same day: sort by tier priority (premium first)
      const tierA = tierPriority[a.subscriptionTier] ?? 2
      const tierB = tierPriority[b.subscriptionTier] ?? 2
      if (tierA !== tierB) return tierA - tierB
      // Same day + same tier: newest first
      return new Date(pubB).getTime() - new Date(pubA).getTime()
    })

    return NextResponse.json({ jobs, totalLiveCount })
  } catch (error: any) {
    console.error('Failed to fetch jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs', detail: error?.message || 'unknown' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify school admin authentication
    const token = await getAuthCookie()
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const admin = await SchoolAdmin.findById(payload.adminId)
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Enforce posting limits based on subscription tier
    const tier = admin.subscriptionTier || 'basic'
    const limit = TIER_LIMITS[tier] || 3
    const activeJobCount = await JobPosting.countDocuments({
      adminId: admin._id,
      status: 'live',
    })

    if (activeJobCount >= limit) {
      const tierNames: Record<string, string> = { basic: 'Starter', standard: 'Plus', premium: 'Premium' }
      return NextResponse.json(
        {
          error: `You've reached your ${tierNames[tier]} plan limit of ${limit} active listings. Upgrade your plan to post more jobs.`,
          limit,
          current: activeJobCount,
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    const job = await JobPosting.create({
      ...body,
      adminId: admin._id,
      subscriptionTier: tier,
      status: 'live',
      publishedAt: new Date(),
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Failed to create job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
