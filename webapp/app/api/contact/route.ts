import { NextRequest, NextResponse } from 'next/server'
import { createContactSubmission } from '@/lib/storage'
import { ContactSubmission } from '@/types'
import { getClientIP } from '@/lib/rate-limit'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent spam and cost abuse
  const rateLimit = rateLimitMiddleware(request, 3, 60000) // 3 requests per minute (reduced from 5 for cost control)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (100KB for contact form)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 100 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== /api/contact POST called ===')
  }
  
  try {
    const body = await request.json()
    const { name, email, subject, message, urgent } = body

    // SECURITY: Input length validation
    if (name && name.length > 100) {
      return NextResponse.json({ error: 'Name is too long (max 100 characters)' }, { status: 400 })
    }
    if (email && email.length > 254) {
      return NextResponse.json({ error: 'Email is too long (max 254 characters)' }, { status: 400 })
    }
    if (subject && subject.length > 200) {
      return NextResponse.json({ error: 'Subject is too long (max 200 characters)' }, { status: 400 })
    }
    if (message && message.length > 10000) {
      return NextResponse.json({ error: 'Message is too long (max 10,000 characters)' }, { status: 400 })
    }

    // Validation
    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, subject, and message are required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // SECURITY: Get IP address correctly (handles proxies)
    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create contact submission
    const submission = await createContactSubmission({
      name: name ? name.trim().substring(0, 100) : undefined,
      email: email.trim().substring(0, 254),
      subject: subject.trim().substring(0, 200),
      message: message.trim().substring(0, 10000),
      urgent: urgent === true,
      ipAddress,
      userAgent,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Contact submission created:', {
        id: submission.id,
        email: submission.email,
        subject: submission.subject,
        timestamp: new Date(submission.timestamp).toISOString(),
      })
    }

    // TODO: Send email notification to admin
    // This would integrate with an email service (SendGrid, Mailgun, AWS SES, etc.)
    // Example:
    // await sendEmailNotification({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `New Contact Form Submission: ${subject}`,
    //   body: `Name: ${name || 'Not provided'}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
    // })

    return NextResponse.json({
      success: true,
      message: 'Your message has been received. We will get back to you soon.',
      submissionId: submission.id,
    })
  } catch (error) {
    console.error('Error processing contact submission:', error)
    return NextResponse.json(
      { error: 'Failed to process your message. Please try again later.' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to retrieve submissions (for admin dashboard later)
// This should be protected with admin authentication
export async function GET(request: NextRequest) {
  // For now, return empty array - admin dashboard will implement proper auth
  // In production, this should check for admin authentication
  return NextResponse.json({
    message: 'Contact submissions are stored and will be accessible via admin dashboard',
    // submissions: [] // Uncomment when admin auth is implemented
  })
}

