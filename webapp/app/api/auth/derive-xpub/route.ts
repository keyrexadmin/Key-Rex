import { NextRequest, NextResponse } from 'next/server'
import { deriveXpub } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { key } = await request.json()
  
  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
  }
  
  try {
    const xpub = deriveXpub(key)
    return NextResponse.json({ xpub })
  } catch (error) {
    console.error('Error deriving xpub:', error)
    return NextResponse.json({ error: 'Failed to derive xpub' }, { status: 500 })
  }
}

