import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import '@/models/SchoolAdmin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const job = await JobPosting.findById(params.id).populate('adminId', 'schoolName')

    if (!job || job.status !== 'live') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to fetch job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    // TODO: Verify school admin owns this job
    const job = await JobPosting.findByIdAndUpdate(params.id, { status: 'taken_down' }, { new: true })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete job:', error)
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}
