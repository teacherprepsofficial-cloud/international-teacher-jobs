import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { School } from '@/models/School'
import { SchoolAdmin } from '@/models/SchoolAdmin'

export const dynamic = 'force-dynamic'

export async function POST(
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

    const admin = await SchoolAdmin.findById(payload.adminId).lean() as any
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 })
    }

    // Check if this admin already claimed a school
    const existingClaim = await School.findOne({ claimedBy: admin._id }).lean()
    if (existingClaim) {
      return NextResponse.json(
        { error: 'You have already claimed a school. Each account can claim one school.' },
        { status: 409 }
      )
    }

    const school = await School.findOne({ slug })
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    if (school.claimed) {
      return NextResponse.json(
        { error: 'This school has already been claimed' },
        { status: 409 }
      )
    }

    // Claim the school
    school.claimed = true
    school.claimedBy = admin._id
    school.claimedAt = new Date()
    school.isVerified = true // Auto-verify for MVP
    await school.save()

    return NextResponse.json({
      success: true,
      message: 'School claimed successfully',
      school: {
        name: school.name,
        slug: school.slug,
        isVerified: school.isVerified,
      },
    })
  } catch (error) {
    console.error('Failed to claim school:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
