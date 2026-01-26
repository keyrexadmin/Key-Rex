import { NextRequest, NextResponse } from 'next/server'
import {
  getAllFeaturedWallets,
  addFeaturedWallet,
  updateFeaturedWallet,
  deleteFeaturedWallet,
  reorderFeaturedWallets,
} from '@/lib/storage'
import { FeaturedWallet } from '@/types'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

// Master xpub for admin access - set via environment variable
const MASTER_XPUB = process.env.MASTER_XPUB || ''

function isAdmin(xpub: string | undefined): boolean {
  if (!MASTER_XPUB) {
    console.warn('MASTER_XPUB not set - admin access disabled')
    return false
  }
  return xpub === MASTER_XPUB
}

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-admin)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }

  if (!isAdmin(xpub)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const wallets = getAllFeaturedWallets()
  return NextResponse.json({ wallets })
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for write operations)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (10KB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  if (!isAdmin(xpub)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, logoUrl, downloadUrl, enabled = true, priority } = body

    if (!name || !logoUrl || !downloadUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, logoUrl, downloadUrl' },
        { status: 400 }
      )
    }

    // If priority not provided, add to end
    const maxPriority = getAllFeaturedWallets().reduce(
      (max, w) => Math.max(max, w.priority),
      -1
    )
    const walletPriority = priority !== undefined ? priority : maxPriority + 1

    const wallet = addFeaturedWallet({
      name,
      logoUrl,
      downloadUrl,
      enabled,
      priority: walletPriority,
    })

    return NextResponse.json({ wallet }, { status: 201 })
  } catch (error) {
    console.error('Failed to add featured wallet:', error)
    return NextResponse.json(
      { error: 'Failed to add featured wallet' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for write operations)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (10KB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  if (!isAdmin(xpub)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 })
    }

    const wallet = updateFeaturedWallet(id, updates)
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    return NextResponse.json({ wallet })
  } catch (error) {
    console.error('Failed to update featured wallet:', error)
    return NextResponse.json(
      { error: 'Failed to update featured wallet' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for delete operations)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }

  if (!isAdmin(xpub)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 })
    }

    const deleted = deleteFeaturedWallet(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete featured wallet:', error)
    return NextResponse.json(
      { error: 'Failed to delete featured wallet' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for write operations)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (10KB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  if (!isAdmin(xpub)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, walletIds } = body

    if (action === 'reorder' && Array.isArray(walletIds)) {
      const success = reorderFeaturedWallets(walletIds)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reorder wallets' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, wallets: getAllFeaturedWallets() })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to reorder featured wallets:', error)
    return NextResponse.json(
      { error: 'Failed to reorder wallets' },
      { status: 500 }
    )
  }
}

