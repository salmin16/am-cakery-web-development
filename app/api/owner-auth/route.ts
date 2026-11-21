import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
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
  const expected = createHash('sha256').update(passkey).digest()
  const received = createHash('sha256').update(submitted).digest()
  if (!timingSafeEqual(expected, received)) return NextResponse.json({ error: 'Invalid passkey.' }, { status: 401 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('am-owner-session', getOwnerSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/admin',
    maxAge: 60 * 60 * 8,
  })
  return response
}
