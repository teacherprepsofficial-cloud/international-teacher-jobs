import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { AdminMessage } from '@/models/AdminMessage'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const body = await request.json()
    const { status, message, adminNotes } = body

    const updateData: any = { status, adminNotes }
    if (status === 'approved' || status === 'live') {
      updateData.status = 'live'
      updateData.publishedAt = new Date()
    }

    const job = await (JobPosting as any).findByIdAndUpdate(params.id, updateData, { new: true })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Create message if correction needed
    if (status === 'correction_needed' && message) {
      await (AdminMessage as any).create({
        jobId: job._id,
        schoolAdminId: job.adminId,
        fromSuperAdmin: true,
        message,
      })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to update job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
