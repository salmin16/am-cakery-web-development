import { createHmac } from 'node:crypto'

export function getOwnerSessionToken() {
  const passkey = process.env.OWNER_PASSKEY
  if (!passkey) return ''
  return createHmac('sha256', passkey).update('am-cakery-owner-session-v1').digest('hex')
}
