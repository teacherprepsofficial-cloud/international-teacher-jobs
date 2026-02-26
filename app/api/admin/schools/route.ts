import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { School } from '@/models/School'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query: any = {}

    if (status === 'pending-claims') {
      // Schools that are claimed but not yet verified (for manual review)
      query = { claimed: true, isVerified: false }
    } else if (status === 'claimed') {
      query = { claimed: true }
    } else if (status === 'verified') {
      query = { isVerified: true }
    }

    const schools = await School.find(query)
      .populate('claimedBy', 'email name schoolName')
      .sort({ claimedAt: -1 })
      .limit(100)
      .lean()

    const results = (schools as any[]).map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      country: s.country,
      city: s.city,
      claimed: s.claimed,
      isVerified: s.isVerified,
      claimedAt: s.claimedAt,
      claimedBy: s.claimedBy
        ? {
            email: s.claimedBy.email,
            name: s.claimedBy.name,
            schoolName: s.claimedBy.schoolName,
          }
        : null,
      profileCompleteness: s.profileCompleteness,
    }))

    const stats = {
      total: await School.countDocuments(),
      claimed: await School.countDocuments({ claimed: true }),
      verified: await School.countDocuments({ isVerified: true }),
      pendingClaims: await School.countDocuments({ claimed: true, isVerified: false }),
    }

    return NextResponse.json({ schools: results, stats })
  } catch (error) {
    console.error('Failed to fetch admin schools:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { schoolId, action } = body

    if (!schoolId || !action) {
      return NextResponse.json({ error: 'schoolId and action required' }, { status: 400 })
    }

    const school = await School.findById(schoolId)
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    if (action === 'approve') {
      school.isVerified = true
      await school.save()
      return NextResponse.json({ success: true, message: 'School verified' })
    } else if (action === 'reject') {
      // Unclaim and unverify
      school.claimed = false
      school.claimedBy = undefined
      school.claimedAt = undefined
      school.isVerified = false
      await school.save()
      return NextResponse.json({ success: true, message: 'Claim rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to update school:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
