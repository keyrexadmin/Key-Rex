import { getUserSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const cookies = request.cookies.getAll()
  const userXpub = getUserSession(request)
  
  return NextResponse.json({
    allCookies: cookies.map(c => c.name),
    userXpub: userXpub || 'NOT FOUND',
    fullUserXpub: userXpub,
  })
}

