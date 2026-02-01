'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Card from '@/components/Card'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const xpub = searchParams.get('xpub')

  useEffect(() => {
    if (!xpub) {
      console.error('No xpub in success page')
      router.push('/?wizard=true')
      return
    }

    // Set the cookie by calling the login API
    const setSession = async () => {
      try {
        // We need to get the challenge and sig/key, but we don't have them here
        // Instead, we'll call a special endpoint that sets the cookie based on xpub
        // Or we can store a temporary token and verify it
        
        // For now, let's call the user API to verify, and if it fails, 
        // we'll need to handle it differently
        const res = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ xpub }),
        })

        if (res.ok) {
          // Cookie should be set now, verify and check wizard completion
          const userRes = await fetch('/api/user', {
            credentials: 'include',
          })
          
          if (userRes.ok) {
            const userData = await userRes.json()
            
            // CRITICAL: Check if user has completed wizard (disclaimer accepted)
            // If not, redirect to home page to complete wizard
            if (!userData.freeDisclaimerAccepted) {
              console.log('User has not completed wizard - redirecting to home page to complete onboarding')
              router.push('/?wizard=true')
              return
            }
            
            // User has completed wizard - allow dashboard access
            router.push('/dashboard')
          } else {
            console.error('Failed to verify session after setting cookie')
            router.push('/?wizard=true')
          }
        } else {
          console.error('Failed to set session')
          router.push('/?wizard=true')
        }
      } catch (error) {
        console.error('Error setting session:', error)
        router.push('/?wizard=true')
      }
    }

    setSession()
  }, [xpub, router])

  return (
    <Layout showNav={false}>
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl border-2 border-orange-400/30">
            <span className="text-white font-bold text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-white">Completing login...</h1>
          <p className="text-white/300">Please wait...</p>
        </Card>
      </div>
    </Layout>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <Layout showNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-white">Loading...</h1>
          </Card>
        </div>
      </Layout>
    }>
      <SuccessContent />
    </Suspense>
  )
}

