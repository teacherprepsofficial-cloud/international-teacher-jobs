import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { JobPosting } from '@/models/JobPosting'

const TIER_LIMITS: Record<string, number> = {
  basic: 3,
  standard: 10,
  premium: 20,
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = await getAuthCookie()
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const admin = await SchoolAdmin.findById(payload.adminId).lean() as any
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 })
    }

    const jobs = await JobPosting.find({ adminId: admin._id })
      .sort({ createdAt: -1 })
      .lean()

    const tier = admin.subscriptionTier || 'basic'
    const tierLimit = TIER_LIMITS[tier] || 3
    const liveCount = (jobs as any[]).filter((j: any) => j.status === 'live').length

    return NextResponse.json({
      jobs: (jobs as any[]).map((j: any) => ({
        _id: j._id.toString(),
        position: j.position,
        schoolName: j.schoolName,
        city: j.city,
        country: j.country,
        countryCode: j.countryCode,
        region: j.region,
        positionCategory: j.positionCategory,
        description: j.description,
        applicationUrl: j.applicationUrl,
        salary: j.salary,
        contractType: j.contractType,
        startDate: j.startDate,
        status: j.status,
        publishedAt: j.publishedAt,
        createdAt: j.createdAt,
      })),
      tier,
      liveCount,
      tierLimit,
    })
  } catch (error) {
    console.error('Failed to fetch school jobs:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
