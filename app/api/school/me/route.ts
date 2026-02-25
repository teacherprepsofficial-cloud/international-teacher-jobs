import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { SchoolAdmin } from '@/models/SchoolAdmin'

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

    const admin = await SchoolAdmin.findById(payload.adminId).lean()
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 })
    }

    return NextResponse.json({
      id: (admin as any)._id.toString(),
      email: (admin as any).email,
      name: (admin as any).name,
      schoolName: (admin as any).schoolName,
      subscriptionTier: (admin as any).subscriptionTier,
      subscriptionStatus: (admin as any).subscriptionStatus,
    })
  } catch (error) {
    console.error('Failed to fetch admin profile:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
