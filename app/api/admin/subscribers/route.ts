import { connectDB } from '@/lib/db'
import { Subscriber } from '@/models/Subscriber'
import { EmailClick } from '@/models/EmailClick'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const [
      totalSubscribers,
      confirmedCount,
      pendingCount,
      unsubscribedCount,
      totalClicks,
      recentSubscribers,
      clicksByWeek,
    ] = await Promise.all([
      (Subscriber as any).countDocuments(),
      (Subscriber as any).countDocuments({ status: 'confirmed' }),
      (Subscriber as any).countDocuments({ status: 'pending' }),
      (Subscriber as any).countDocuments({ status: 'unsubscribed' }),
      (EmailClick as any).countDocuments(),
      (Subscriber as any).find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('email status createdAt confirmedAt unsubscribedAt')
        .lean(),
      (EmailClick as any).aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$digestDate' } },
            clicks: { $sum: 1 },
            uniqueSubscribers: { $addToSet: '$subscriberId' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 10 },
        {
          $project: {
            date: '$_id',
            clicks: 1,
            uniqueClickers: { $size: '$uniqueSubscribers' },
          },
        },
      ]),
    ])

    return NextResponse.json({
      stats: {
        total: totalSubscribers,
        confirmed: confirmedCount,
        pending: pendingCount,
        unsubscribed: unsubscribedCount,
        totalClicks,
      },
      recentSubscribers,
      clicksByWeek,
    })
  } catch (error: any) {
    console.error('Admin subscribers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
