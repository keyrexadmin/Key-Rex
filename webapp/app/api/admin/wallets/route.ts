import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllFeaturedWallets, addFeaturedWallet, updateFeaturedWallet, deleteFeaturedWallet, reorderFeaturedWallets } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Featured Wallets API Route
 * 
 * Manage featured wallets (admin only)
 */
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-admin)
  const adminSession = request.cookies.get('admin_session')?.value
  const identifier = adminSession || 'anonymous'
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // Verify admin session
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const wallets = await getAllFeaturedWallets()
    return NextResponse.json({ wallets })
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
  }
}

/**
 * Add new featured wallet
 */
export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for write operations)
  const adminSession = request.cookies.get('admin_session')?.value
  const identifier = adminSession || 'anonymous'
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (10KB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  // Verify admin session
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { name, logoUrl, downloadUrl, enabled, priority } = body
    
    if (!name || !logoUrl || !downloadUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const wallet = await addFeaturedWallet({
      name,
      logoUrl,
      downloadUrl,
      enabled: enabled !== false,
      priority: priority || 0,
    })
    
    return NextResponse.json({ success: true, wallet })
  } catch (error) {
    console.error('Error adding wallet:', error)
    return NextResponse.json({ error: 'Failed to add wallet' }, { status: 500 })
  }
}

/**
 * Update featured wallet
 */
export async function PATCH(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for write operations)
  const adminSession = request.cookies.get('admin_session')?.value
  const identifier = adminSession || 'anonymous'
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (10KB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  // Verify admin session
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const updated = await updateFeaturedWallet(id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, wallet: updated })
  } catch (error) {
    console.error('Error updating wallet:', error)
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
  }
}

/**
 * Delete featured wallet
 */
export async function DELETE(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse (per-admin, stricter for delete operations)
  const adminSession = request.cookies.get('admin_session')?.value
  const identifier = adminSession || 'anonymous'
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 20, 60000) // 20 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // Verify admin session
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const deleted = await deleteFeaturedWallet(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json({ error: 'Failed to delete wallet' }, { status: 500 })
  }
}





