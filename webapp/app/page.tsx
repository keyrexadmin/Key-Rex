'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import Card from '@/components/Card'
import OnboardingWizard from '@/components/OnboardingWizard'
import KeyRexButtonPreview from '@/components/KeyRexButtonPreview'

function HomeContent() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState('/images/KR%20Paw.png')
  const [mounted, setMounted] = useState(false)

  // Set cache-busting parameter only on client side to avoid hydration mismatch
  useEffect(() => {
    setImageSrc(`/images/KR%20Paw.png?t=${Date.now()}`)
  }, [])

  // Check if we should open wizard from URL hash or query param
  // Do this in a single useEffect after mount to avoid multiple renders
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      setMounted(true)
      
      // Check for hash
      if (window.location.hash === '#get-started') {
        setWizardOpen(true)
        try {
          window.history.replaceState(null, '', window.location.pathname)
        } catch (e) {
          // Safari may have issues with replaceState, ignore
          if (process.env.NODE_ENV === 'development') {
            console.warn('Safari replaceState error (ignored):', e)
          }
        }
        return
      }
      
      // Check for query params
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const setup = searchParams.get('setup')
        const wizard = searchParams.get('wizard')
        if (setup === 'true' || wizard === 'true') {
          setWizardOpen(true)
          try {
            window.history.replaceState(null, '', window.location.pathname)
          } catch (e) {
            // Safari may have issues with replaceState, ignore
            if (process.env.NODE_ENV === 'development') {
              console.warn('Safari replaceState error (ignored):', e)
            }
          }
        }
      } catch (e) {
        // Safari may have issues with URLSearchParams, ignore
        if (process.env.NODE_ENV === 'development') {
          console.warn('Safari URLSearchParams error (ignored):', e)
        }
      }
    } catch (error) {
      // Catch any Safari-specific errors and log them
      if (process.env.NODE_ENV === 'development') {
        console.error('Safari initialization error:', error)
      }
    }
  }, [])

  return (
    <Layout showNav={true}>
      <OnboardingWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-4 pb-20 animate-fade-in">
          <div className="max-w-4xl w-full text-center space-y-8">
            {/* Main Heading */}
            <div className="mb-6 leading-tight">
              {/* Mobile: paw2 logo, Desktop: KR Paw logo */}
              <img
                src="/images/paw2.png"
                alt="Key-Rex"
                className="mx-auto max-w-full h-auto md:hidden"
                style={{ maxHeight: '14rem' }}
              />
              <img
                src={imageSrc}
                alt="Key-Rex"
                className="mx-auto max-w-full h-auto hidden md:block"
                style={{ maxHeight: '20rem' }}
              />
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-orange-400 mt-4 text-center">
                Lightning Wallet Authentication
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
              Let your website visitors sign in using their Lightning wallets
              <span className="block text-lg text-white/60 mt-2">
                No passwords to hack. No email addresses to collect. No personal data to store. Just secure, quick sign-ins that your users control.
              </span>
            </p>

            {/* Get Started Box */}
            <div className="pt-8 max-w-2xl mx-auto">
              <Card className="p-4 sm:p-8 border-2 border-orange-500/40 bg-dark-200/90">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
                  Get Started
                </h2>
                <p className="text-white/90 text-base text-center mb-6 leading-relaxed">
                  Ready to add Lightning wallet authentication to your website? Here's what you need to do to get your integration code. The whole process takes just a few minutes.
                </p>
                <div className="space-y-4 mb-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-orange-400 font-bold text-base">1</span>
                    </div>
                    <p className="text-white/90 text-base leading-relaxed flex-1">
                      <strong className="text-white">Get a Lightning wallet</strong> if you don't have one (Alby, Phoenix, or Zeus are recommended)
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-orange-400 font-bold text-base">2</span>
                    </div>
                    <p className="text-white/90 text-base leading-relaxed flex-1">
                      <strong className="text-white">Sign in with your Lightning wallet</strong> to create your Key-Rex account
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-orange-400 font-bold text-base">3</span>
                    </div>
                    <p className="text-white/90 text-base leading-relaxed flex-1">
                      <strong className="text-white">Enter your domain</strong> where you'll use Key-Rex
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-orange-400 font-bold text-base">4</span>
                    </div>
                    <p className="text-white/90 text-base leading-relaxed flex-1">
                      <strong className="text-white">Accept the disclaimer</strong> and receive your integration code
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-base py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border border-orange-500/30 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-dark-900"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Your Integration Code
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Separator */}
                <div className="my-6 border-t border-orange-500/20"></div>

                {/* Preview Section */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-white text-center">
                    Live Preview
                  </h3>
                    <p className="text-white/80 text-base text-center leading-relaxed">
                    This is what your visitors will see on your website. When they click it, they can sign in using their Lightning wallet—no password needed.
                  </p>
                  
                  {/* Live Preview - uses shared component that stays in sync with embed script */}
                  <KeyRexButtonPreview />
                </div>

                {/* Code Example Section */}
                <div className="mt-8 pt-6 border-t border-dark-700">
                  <h3 className="text-2xl font-semibold text-white mb-3 text-center">
                    See the Integration Code
                  </h3>
                  <p className="text-white/80 text-base text-center mb-4 leading-relaxed">
                    Here's a quick look at what adding Key-Rex to your website involves. Don't worry if you're not technical—we provide step-by-step guides for all skill levels in your dashboard after you sign up.
                  </p>
                  
                  <div className="bg-dark-900/80 border border-dark-700 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-white/300 font-mono">
                      <code className="block mb-3 text-orange-400">// Frontend: Add to your HTML</code>
                      <code className="block mb-1">{'<script src="https://keyrex.example.com/embed?siteId=YOUR_SITE_ID"></script>'}</code>
                      <code className="block mb-4">{'<div id="keyrex-container"></div>'}</code>
                      
                      <code className="block mb-3 text-orange-400">// Backend: Handle authentication callback</code>
                      <code className="block mb-1 text-white/400">// Your backend receives: {'{'} xpub: "xpub_..." {'}'}</code>
                      <code className="block mb-1 text-white/400">// Create session and redirect user</code>
                      <code className="block text-white/400">// See dashboard for full examples</code>
                    </pre>
                  </div>
                  
                  <p className="text-white/400 text-xs text-center mt-3">
                    Create a Key-Rex account to get your unique site ID and full integration code
                  </p>
                </div>
              </Card>
            </div>

            {/* Important Requirements - Condensed */}
            <div className="pt-12 max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                What You Need to Know Before Starting
              </h2>
              <p className="text-white/80 text-center mb-8 text-base leading-relaxed">
                Before you decide if Key-Rex is right for your website, here are a couple of important things to understand. Most websites can use Key-Rex, but there are a few requirements to be aware of.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90 hover:border-orange-500/50 transition-all duration-200">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/30 mb-4">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">You'll Need a Backend</h3>
                  </div>
                  <p className="text-white/80 text-base leading-relaxed mb-4 text-center">
                    Key-Rex needs a way to receive authentication information from your visitors. This means you'll need either a backend server or a serverless function (like those offered by Vercel, AWS, or similar services).
                  </p>
                  <div className="text-center">
                    <Link href="/requirements#backend-requirements" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
                      Learn more
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </Card>

                <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90 hover:border-orange-500/50 transition-all duration-200">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/30 mb-4">
                      <span className="text-3xl">ℹ️</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Your Visitors Need Lightning Wallets</h3>
                  </div>
                  <p className="text-white/80 text-base leading-relaxed mb-4 text-center">
                    For someone to sign in with Key-Rex, they need a Lightning wallet app (like Alby, Phoenix, or Zeus). These are free to download. Key-Rex can work as a standalone sign-in option, and we recognize that many websites already have existing login processes. In these cases, Key-Rex works great as an alternative authentication method, allowing you to offer both options simultaneously so visitors can choose what works best for them.
                  </p>
                  <div className="text-center">
                    <Link href="/how-it-works#lightning-wallets" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
                      Wallet options
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </Card>

                <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90 hover:border-orange-500/50 transition-all duration-200">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/30 mb-4">
                      <span className="text-3xl">🔗</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Works With Your Existing Users</h3>
                  </div>
                  <p className="text-white/80 text-base leading-relaxed mb-4 text-center">
                    Already have user accounts? Key-Rex can connect to your existing system. New visitors can sign in and you create accounts for them, while existing users can link their Lightning wallet to their current account. You don't have to replace anything—just add Key-Rex alongside your current sign-in methods.
                  </p>
                  <div className="text-center">
                    <Link href="/faq#category-4" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
                      Learn more in FAQ
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </Card>
              </div>

              <div className="text-center">
                <Link
                  href="/requirements"
                  className="inline-block px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
                >
                  View All Requirements →
                </Link>
              </div>
            </div>

            {/* Key Benefits - Condensed */}
            <div className="pt-12 pb-12 max-w-4xl mx-auto space-y-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                Why Should You Consider Key-Rex?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" role="list">
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-2">🔐</div>
                  <h3 className="text-xl font-semibold text-white mb-1">No More Password Breaches</h3>
                  <p className="text-white/400 text-sm leading-relaxed">Users sign in with cryptographic proof—no passwords that can be stolen</p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="text-xl font-semibold text-white mb-1">Faster Sign-Ins</h3>
                  <p className="text-white/400 text-sm leading-relaxed">One click to sign in—no waiting for email verification codes</p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-2">🎨</div>
                  <h3 className="text-xl font-semibold text-white mb-1">Easy to Add</h3>
                  <p className="text-white/400 text-sm leading-relaxed">Just add two lines of code to your website</p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-2">🌐</div>
                  <h3 className="text-xl font-semibold text-white mb-1">Better Privacy</h3>
                  <p className="text-white/400 text-sm leading-relaxed">You don't need to collect emails, names, or any personal information</p>
                </Card>
              </div>
              <div className="text-center">
                <Link
                  href="/why-keyrex"
                  className="inline-block px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
                >
                  Learn More About Key-Rex →
                </Link>
              </div>
            </div>

            {/* Pricing - Condensed */}
            <div className="pt-12 pb-12 max-w-2xl mx-auto space-y-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                No Cost
              </h2>
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90 shadow-lg">
                <div className="text-center mb-8">
                  <p className="text-white/80 text-lg leading-relaxed">No credit card needed. No hidden fees. No limits. No catch.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50 hover:border-orange-500/30 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-orange-400 text-lg font-bold">✓</span>
                        </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1.5">Unlimited Sign-Ins</h3>
                        <p className="text-white/400 text-sm leading-relaxed">As many sign-ins as you need—no limits on visitors or usage</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50 hover:border-orange-500/30 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-orange-400 text-lg font-bold">✓</span>
                        </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1.5">Unlimited Domains</h3>
                        <p className="text-white/400 text-sm leading-relaxed">Add as many domains and subdomains as you need</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50 hover:border-orange-500/30 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-orange-400 text-lg font-bold">✓</span>
                        </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1.5">See How It's Being Used</h3>
                        <p className="text-white/400 text-sm leading-relaxed">Track sign-ins, see which wallets your visitors use, and understand usage patterns</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50 hover:border-orange-500/30 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-orange-400 text-lg font-bold">✓</span>
                        </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1.5">You Can See the Code</h3>
                        <p className="text-white/400 text-sm leading-relaxed">All code is open source, so you can verify exactly how it works</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="pt-12 pb-20 max-w-4xl mx-auto space-y-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                Learn More
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/how-it-works" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">⚙️</div>
                    <h3 className="text-xl font-semibold text-white mb-2">How It Works</h3>
                    <p className="text-white/400 text-sm leading-relaxed">Understand how visitors sign in and how to add it to your site</p>
                  </Card>
                </Link>
                <Link href="/why-keyrex" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">💡</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Why Key-Rex</h3>
                    <p className="text-white/400 text-sm leading-relaxed">Learn the benefits and see how it compares to password-based sign-ins</p>
                  </Card>
                </Link>
                <Link href="/requirements" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Requirements</h3>
                    <p className="text-white/400 text-sm leading-relaxed">See what you need to use Key-Rex on your website</p>
                  </Card>
                </Link>
                <Link href="/faq" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">❓</div>
                    <h3 className="text-xl font-semibold text-white mb-2">FAQ</h3>
                    <p className="text-white/400 text-sm leading-relaxed">Get answers to questions you might have</p>
                  </Card>
                </Link>
                <Link href="/support" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">🛟</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Support</h3>
                    <p className="text-white/400 text-sm leading-relaxed">Get help, understand service availability, and learn about data handling</p>
                  </Card>
                </Link>
                <Link href="/open-source" className="block">
                  <Card className="p-6 hover:border-orange-500/50 transition-all duration-200 text-center">
                    <div className="text-3xl mb-2">🔓</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Open Source</h3>
                    <p className="text-white/400 text-sm leading-relaxed">Browse the code and see exactly how everything works</p>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default function Home() {
  return (
    <HomeContent />
  )
}
