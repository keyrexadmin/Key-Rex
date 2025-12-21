import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllContactSubmissions, getUnreadContactSubmissions, updateContactSubmissionStatus, deleteContactSubmission } from '@/lib/storage'

/**
 * Admin Contact Submissions API Route
 * 
 * Returns all contact form submissions (admin only)
 */
export async function GET(request: NextRequest) {
  // Verify admin session
  const adminSession = request.cookies.get('admin_session')?.value
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const allSubmissions = getAllContactSubmissions()
    const unreadSubmissions = getUnreadContactSubmissions()
    
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
  // Verify admin session
  const adminSession = request.cookies.get('admin_session')?.value
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { id, status } = body
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }
    
    const updated = updateContactSubmissionStatus(id, status)
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
  // Verify admin session
  const adminSession = request.cookies.get('admin_session')?.value
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const deleted = deleteContactSubmission(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact submission:', error)
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
  }
}

