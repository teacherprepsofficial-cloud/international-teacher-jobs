import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/db'
import { SchoolAdmin } from '@/models/SchoolAdmin'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const COOKIE_NAME = 'super-admin-auth'

export interface SuperAdminPayload {
  adminId: string
  email: string
  isSuperAdmin: true
}

export function generateSuperAdminToken(payload: Omit<SuperAdminPayload, 'isSuperAdmin'>): string {
  return jwt.sign({ ...payload, isSuperAdmin: true }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySuperAdminToken(token: string): SuperAdminPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SuperAdminPayload
    if (!payload.isSuperAdmin) return null
    return payload
  } catch {
    return null
  }
}

export async function verifySuperAdmin(req: NextRequest): Promise<SuperAdminPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifySuperAdminToken(token)
  if (!payload) return null

  // Verify the admin still exists and is still a super admin
  await connectDB()
  const admin = await SchoolAdmin.findById(payload.adminId).select('isSuperAdmin').lean()
  if (!admin || !(admin as any).isSuperAdmin) return null

  return payload
}

export { COOKIE_NAME }
