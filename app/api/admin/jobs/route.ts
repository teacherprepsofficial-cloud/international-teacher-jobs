import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import '@/models/SchoolAdmin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const query: any = {}
    if (status) query.status = status

    const jobs = await JobPosting.find(query)
      .populate('adminId', 'schoolName email')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Failed to fetch jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
