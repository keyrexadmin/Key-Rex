'use client'

import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Button from '@/components/Button'
import LoginButton from '@/components/LoginButton'

export default function Onboarding() {
  const router = useRouter()

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xl border-2 border-orange-400/30">
                <span className="text-white font-bold text-3xl">⚡</span>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white">
              Get Started with Key-Rex
            </h1>
            <p className="text-xl text-white/300">
              Add Bitcoin Lightning authentication to your website in minutes
            </p>
          </div>

          {/* Main Card */}
          <Card className="p-8 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Four Simple Steps
              </h2>
              <p className="text-white/400">
                Get your integration code and start accepting lightning authentication on your website
              </p>
            </div>
            
            {/* Steps */}
            <div className="space-y-4">
              {/* Step 1: Get a Lightning Wallet */}
              <Card variant="highlight" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-2">Get a Lightning Wallet</h3>
                    <p className="text-white/300 mb-3">
                      If you don't have a Lightning wallet yet, choose one of these popular options:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://getalby.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                      >
                        <span>🦉</span>
                        <span>Alby</span>
                      </a>
                      <a
                        href="https://phoenix.acinq.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                      >
                        <span>🔥</span>
                        <span>Phoenix</span>
                      </a>
                      <a
                        href="https://zeusln.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                      >
                        <span>⚡</span>
                        <span>Zeus</span>
                      </a>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Step 2: Click Sign In with Key-Rex */}
              <Card variant="highlight" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-2">Click Sign In with Key-Rex</h3>
                    <p className="text-white/300">
                      Click the "Sign in with Key-Rex" button below to authenticate with your Lightning wallet. 
                      No email or password required—just your Lightning wallet.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Step 3: Get Your Integration Code */}
              <Card variant="highlight" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-2">Get Your Integration Code</h3>
                    <p className="text-white/300">
                      Once signed in, you'll get your free integration code. 
                      This is a free integration code that you can use to add Lightning authentication to your website.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Step 4: Add Code to Your Website */}
              <Card variant="highlight" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-2">Add Code to Your Website</h3>
                    <p className="text-white/300">
                      Copy and paste the integration code into your website. 
                      That's it! Your website will now support Lightning wallet authentication.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="border-t border-dark-700 pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Ready to get started?
                </h3>
                <p className="text-white/400 text-sm mb-4">
                  Sign in with your Lightning wallet to continue
                </p>
              </div>
              <LoginButton />
            </div>
          </Card>

          {/* Back Button */}
          <div className="text-center">
            <Button variant="outline" onClick={() => router.push('/')}>
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}






