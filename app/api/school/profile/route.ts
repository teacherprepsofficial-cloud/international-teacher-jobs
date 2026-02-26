import { connectDB } from '@/lib/db'
import { School } from '@/models/School'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import { calculateProfileCompleteness } from '@/lib/school-utils'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET — return the school claimed by the authenticated admin */
export async function GET() {
  try {
    await connectDB()

    const token = await getAuthCookie()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const school = await School.findOne({ claimedBy: payload.adminId }).lean()
    if (!school) return NextResponse.json({ error: 'No claimed school found' }, { status: 404 })

    return NextResponse.json(school)
  } catch (error) {
    console.error('Failed to fetch school profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

/** PATCH — update the school claimed by the authenticated admin */
export async function PATCH(request: Request) {
  try {
    await connectDB()

    const token = await getAuthCookie()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const school = await School.findOne({ claimedBy: payload.adminId })
    if (!school) return NextResponse.json({ error: 'No claimed school found' }, { status: 404 })

    const body = await request.json()

    const ALLOWED = [
      'name', 'city', 'country', 'countryCode', 'region',
      'description', 'website', 'logo', 'curriculum', 'gradeRange',
      'schoolType', 'facultySize', 'studentCount', 'foundedYear',
      'languages', 'accreditations', 'benefits', 'contactEmail', 'careerPageUrl',
    ]

    for (const key of ALLOWED) {
      if (key in body) {
        (school as any)[key] = body[key]
      }
    }

    school.profileCompleteness = calculateProfileCompleteness(school)
    await school.save()

    return NextResponse.json(school)
  } catch (error) {
    console.error('Failed to update school profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
