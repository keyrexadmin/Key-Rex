import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll()
  const userXpub = request.cookies.get('user_xpub')?.value
  
  return NextResponse.json({
    allCookies: cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })),
    userXpub: userXpub || 'NOT FOUND',
    fullUserXpub: userXpub,
    headers: Object.fromEntries(request.headers.entries()),
  })
}

