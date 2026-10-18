import { NextResponse } from 'next/server'
import { getPublicJwks } from '@/lib/token'

// Public signing keys for verifying Key-Rex login tokens. Safe to cache and to fetch cross-origin.
export async function GET() {
  const jwks = await getPublicJwks()
  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
