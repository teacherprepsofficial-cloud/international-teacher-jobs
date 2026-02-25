import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import '@/models/SchoolAdmin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const isPreview = searchParams.get('preview') === 'true'

    const job = await JobPosting.findById(id).populate('adminId', 'schoolName')

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Allow preview of any status; otherwise only show live jobs
    if (!isPreview && job.status !== 'live') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to fetch job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const job = await JobPosting.findById(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.adminId.toString() !== payload.adminId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow updating the description field
    if (body.description !== undefined) {
      job.description = body.description
      await job.save()
    }

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Failed to update job:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const job = await JobPosting.findById(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.adminId.toString() !== payload.adminId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    job.status = 'taken_down'
    await job.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to take down job:', error)
    return NextResponse.json({ error: 'Failed to take down job' }, { status: 500 })
  }
}
