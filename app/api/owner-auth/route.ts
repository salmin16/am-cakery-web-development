import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getOwnerSessionToken } from '@/lib/owner-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const passkey = process.env.OWNER_PASSKEY
  if (!passkey) return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503 })

  let submitted: unknown
  try {
    const body = await request.json()
    submitted = body?.passkey
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (typeof submitted !== 'string') return NextResponse.json({ error: 'Invalid passkey.' }, { status: 401 })
  const expected = createHmac('sha256', passkey).update('am-cakery-owner-passkey').digest()
  const received = createHmac('sha256', passkey).update(submitted).digest()
  if (!timingSafeEqual(expected, received)) return NextResponse.json({ error: 'Invalid passkey.' }, { status: 401 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('am-owner-session', getOwnerSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60 * 8,
  })
  return response
}
