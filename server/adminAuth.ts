export type AdminAuthEnv = {
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_SECRET?: string
}

export async function adminLogin(
  rawJson: string,
  env: AdminAuthEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = env

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return { status: 503, body: { error: 'Admin auth is not configured' } }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawJson) as Record<string, unknown>
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return { status: 401, body: { error: 'Invalid credentials' } }
  }

  return { status: 200, body: { token: ADMIN_SECRET } }
}

export function checkAdminToken(authHeader: string | undefined | null, env: AdminAuthEnv): boolean {
  const secret = env.ADMIN_SECRET
  if (!secret) return false
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  return token.length > 0 && token === secret
}
