import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ToastContainer'

export const metadata: Metadata = {
  title: 'Key-Rex - Bitcoin Lightning Login',
  description: 'Open source, minimal data collection, Bitcoin-only authentication',
  icons: {
    icon: '/images/paw2.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/paw2.png" type="image/png" />
        <link rel="shortcut icon" href="/images/paw2.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/paw2.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}



