import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import '@/models/SchoolAdmin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')
    const category = searchParams.get('category')

    const query: any = { status: 'live' }
    if (country) query.countryCode = country
    if (category) query.positionCategory = category

    const [jobs, totalLiveCount] = await Promise.all([
      JobPosting.find(query)
        .populate('adminId', 'schoolName')
        .sort({ createdAt: -1 })
        .lean(),
      JobPosting.countDocuments({ status: 'live' }),
    ])

    return NextResponse.json({ jobs, totalLiveCount })
  } catch (error: any) {
    console.error('Failed to fetch jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs', detail: error?.message || 'unknown' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // TODO: Verify school admin authentication
    const body = await request.json()

    const job = await JobPosting.create({
      ...body,
      status: 'pending',
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Failed to create job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
