import { clearAuthCookie } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  await clearAuthCookie()
  return NextResponse.redirect(new URL('/', request.url))
}
