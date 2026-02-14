import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let k1 = searchParams.get('k1')
  
  console.log('=== /api/auth/get-xpub called ===')
  console.log('Full URL:', request.url)
  console.log('Received k1 (raw):', k1 ? k1.substring(0, 20) + '...' : 'MISSING')
  
  if (!k1) {
    console.error('Missing k1 parameter')
    return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
  }
  
  // Clean k1 of any extra query params that might have been appended
  const cleanedK1 = k1.split('&')[0].split('?')[0]
  console.log('Cleaned k1 for lookup:', cleanedK1.substring(0, 20) + '...')

  // Try in-memory storage first
  let xpub = await getAuthSession(cleanedK1)

  // If not found in memory, try cookie storage (for persistence across workers)
  if (!xpub) {
    console.log('Not found in memory, checking cookies...')
    const k1CookieName = `auth_k1_${cleanedK1.substring(0, 16)}`
    const cookieXpub = request.cookies.get(k1CookieName)?.value
    if (cookieXpub) {
      console.log('Found xpub in cookie:', k1CookieName)
      xpub = cookieXpub
    }
  }

  console.log('Xpub lookup result:', xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND')

  if (!xpub) {
    console.error('No xpub found for k1:', cleanedK1.substring(0, 20) + '...')
    console.error('This might mean:')
    console.error('1. The callback hasn\'t completed yet (wait longer)')
    console.error('2. The k1 challenge expired (5 minute timeout)')
    console.error('3. The callback failed or wasn\'t called')
    return NextResponse.json({ error: 'Session not found or expired. The authentication callback may not have completed yet.' }, { status: 404 })
  }

  console.log('Successfully retrieved xpub for k1')
  return NextResponse.json({ xpub })
}

