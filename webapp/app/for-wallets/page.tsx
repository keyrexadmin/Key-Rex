'use client'

import { useState, useRef } from 'react'
import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Link from 'next/link'
import PageNavigation from '@/components/PageNavigation'
import { useToast } from '@/components/ToastContainer'

export default function ForWallets() {
  const formRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Featured Wallet Partnership Inquiry',
    message: '',
    urgent: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Success
      setSubmitted(true)
      setFormData({ name: '', email: '', subject: 'Featured Wallet Partnership Inquiry', message: '', urgent: false })
      toast.showSuccess('Message sent successfully! We\'ll get back to you soon.')
    } catch (error) {
      console.error('Error submitting contact form:', error)
      toast.showError(error instanceof Error ? error.message : 'Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'what-you-get', label: 'What You Get' },
    { id: 'opportunity', label: 'The Opportunity' },
    { id: 'get-started', label: 'Get Started' },
  ]

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex flex-col lg:flex-row relative">
        {/* Sticky Navigation */}
        <div>
          <PageNavigation items={navItems} title="On This Page" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6" id="overview">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">
                Wallet Partnerships
              </h1>
              <p className="text-xl sm:text-2xl text-white/300 max-w-3xl mx-auto leading-relaxed">
                Grow your wallet user base by getting featured on websites and connecting directly with Bitcoin users looking for Lightning authentication
              </p>
              <div className="pt-4">
                <Link href="#get-started">
                  <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg border border-orange-400/30">
                    Become a Featured Wallet Partner
                  </Button>
                </Link>
              </div>
            </div>

            {/* What You Get Section */}
            <section id="what-you-get">
              <Card className="p-8 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                  What You Get
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🎯</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Logo Placement</h3>
                        <p className="text-white/300 text-sm leading-relaxed">
                          Your wallet logo appears prominently on every Key-Rex-enabled website, giving you brand visibility where users are actively looking for Lightning wallets.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🔗</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Direct Link</h3>
                        <p className="text-white/300 text-sm leading-relaxed">
                          Users can click directly from the authentication button to your wallet app or website, creating a seamless path from discovery to download.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50 relative">
                    <div className="absolute top-3 right-3 bg-orange-500/20 border border-orange-500/50 rounded-full px-3 py-1">
                      <span className="text-orange-400 text-xs font-semibold">Coming Soon</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">📊</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Analytics & Insights Dashboard</h3>
                        <p className="text-white/300 text-sm leading-relaxed mb-2">
                          We're building a comprehensive analytics dashboard that will provide real-time usage statistics, competitive insights, and data-driven growth metrics.
                        </p>
                        <p className="text-white/400 text-xs leading-relaxed">
                          <strong>Planned features:</strong> Track how many users choose your wallet, see market share comparisons, analyze growth trends, receive anonymized competitive data, and make informed decisions based on actual user behavior.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⭐</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Priority Placement</h3>
                        <p className="text-white/300 text-sm leading-relaxed">
                          Featured wallets appear above generic wallet options, ensuring maximum visibility and user engagement with your brand.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🚀</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">User Acquisition</h3>
                        <p className="text-white/300 text-sm leading-relaxed">
                          Reach Bitcoin users at the exact moment they need a Lightning wallet, creating a high-intent user acquisition channel.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* The Opportunity Section */}
            <section id="opportunity">
              <Card className="p-8 border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                  The Opportunity
                </h2>
                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <h3 className="text-white font-semibold text-xl mb-3 flex items-center gap-2">
                      <span className="text-2xl">🌐</span>
                      Massive Reach
                    </h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      Your wallet appears on every Key-Rex-enabled website. As Key-Rex grows and more websites adopt Lightning authentication, your visibility grows automatically. Every new Key-Rex customer means more exposure for your wallet.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <h3 className="text-white font-semibold text-xl mb-3 flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      High-Intent Users
                    </h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      Users visiting Key-Rex-enabled websites are actively looking for Lightning wallets to authenticate. This isn't passive browsing—these are users with immediate need and intent to download a wallet. You're reaching them at the perfect moment.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700/50">
                    <h3 className="text-white font-semibold text-xl mb-3 flex items-center gap-2">
                      <span className="text-2xl">📱</span>
                      One-Click Connection
                    </h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      From the authentication button on a customer's website, users can click directly to your wallet. There's no friction, no extra steps—just a direct path from "I need a wallet" to "downloading your wallet."
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Get Started Section */}
            <section id="get-started" ref={formRef}>
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                  Get Started
                </h2>
                <p className="text-white/300 text-center mb-8 max-w-2xl mx-auto">
                  Ready to grow your wallet user base? Fill out the form below and we'll get back to you with partnership details, pricing, and next steps.
                </p>

                {submitted ? (
                  <div className="bg-orange-500/20 border-2 border-orange-500/50 rounded-lg p-6 text-center">
                    <p className="text-orange-400 font-semibold text-lg mb-2">Thank you for your interest!</p>
                    <p className="text-white/300 text-sm">
                      We've received your message and will get back to you within 24-48 hours with partnership information.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                    <div>
                      <label htmlFor="name" className="block text-white font-medium mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-white font-medium mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                        placeholder="john@walletcompany.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-white font-medium mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                        placeholder="Featured Wallet Partnership Inquiry"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-white font-medium mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 resize-none"
                        placeholder="Please include: your wallet name, website/app store links, and any questions you have about becoming a featured wallet partner."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="urgent"
                        checked={formData.urgent}
                        onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                        className="w-4 h-4 text-orange-500 bg-dark-800 border-dark-700 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <label htmlFor="urgent" className="text-white/300 text-sm">
                        This is urgent (we'll prioritize your request)
                      </label>
                    </div>

                    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                      <p className="text-white/400 text-xs leading-relaxed">
                        <strong className="text-white/300">Response Time:</strong> We typically respond to partnership inquiries within 24-48 hours. For urgent requests, we'll prioritize your message and aim to respond within 12-24 hours.
                      </p>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg border border-orange-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {submitting ? 'Sending...' : 'Send Partnership Inquiry'}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}

