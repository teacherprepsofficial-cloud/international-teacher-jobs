import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { AdminMessage } from '@/models/AdminMessage'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const { status, message, adminNotes } = await request.json()

    const job = await JobPosting.findByIdAndUpdate(
      params.id,
      {
        status,
        adminNotes,
        ...(status === 'approved' && { publishedAt: new Date() }),
      },
      { new: true }
    )

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Create message if correction needed
    if (status === 'correction_needed' && message) {
      await AdminMessage.create({
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
