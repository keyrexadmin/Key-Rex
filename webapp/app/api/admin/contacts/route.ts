import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllContactSubmissions, getUnreadContactSubmissions, updateContactSubmissionStatus, deleteContactSubmission } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Contact Submissions API Route
 * 
 * Returns all contact form submissions (admin only)
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
    const allSubmissions = await getAllContactSubmissions()
    const unreadSubmissions = await getUnreadContactSubmissions()
    
    console.log('Admin contacts API: Returning', {
      total: allSubmissions.length,
      unread: unreadSubmissions.length,
      submissions: allSubmissions.map(s => ({ id: s.id, subject: s.subject, status: s.status })),
    })
    
    return NextResponse.json({
      submissions: allSubmissions,
      total: allSubmissions.length,
      unread: unreadSubmissions.length,
    })
  } catch (error) {
    console.error('Error fetching contact submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch contact submissions' }, { status: 500 })
  }
}

/**
 * Update contact submission status
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
    const { id, status } = body
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }
    
    const updated = await updateContactSubmissionStatus(id, status)
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, submission: updated })
  } catch (error) {
    console.error('Error updating contact submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}

/**
 * Delete contact submission
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
    
    const deleted = await deleteContactSubmission(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact submission:', error)
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
  }
}

