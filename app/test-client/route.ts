import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the HTML file from the fake-client-site directory
    // The HTML file contains the siteId hardcoded - this simulates what an end user would see
    const htmlPath = join(process.cwd(), 'fake-client-site', 'index.html')
    const html = readFileSync(htmlPath, 'utf-8')
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error serving test client page:', error)
    return new NextResponse('Error loading test client page', { status: 500 })
  }
}

