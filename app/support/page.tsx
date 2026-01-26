'use client'

import { useState, useRef } from 'react'
import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Link from 'next/link'
import PageNavigation from '@/components/PageNavigation'
import { useToast } from '@/components/ToastContainer'

export default function Support() {
  const formRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    urgent: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const navItems = [
    { id: 'service-availability', label: 'Service Availability' },
    { id: 'support-model', label: 'Support Model' },
    { id: 'data-retention', label: 'Data Retention & Privacy' },
    { id: 'custom-solutions', label: 'Custom Solutions' },
    { id: 'contact-form', label: 'Contact Form' },
  ]

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
      setFormData({ name: '', email: '', subject: '', message: '', urgent: false })
      toast.showSuccess('Message sent successfully! We\'ll get back to you soon.')
    } catch (error) {
      console.error('Error submitting contact form:', error)
      toast.showError(error instanceof Error ? error.message : 'Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [target.name]: target.type === 'checkbox' ? target.checked : target.value
    }))
  }

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex relative">
        {/* Sticky Navigation */}
        <div className="hidden lg:block">
          <PageNavigation items={navItems} title="On This Page" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Support</h1>
                  <p className="text-xl text-white/200 leading-relaxed">
                Here's what you can expect from Key-Rex and how to get help when you need it
              </p>
            </div>

            {/* Service Availability */}
            <section id="service-availability">
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-2xl font-semibold text-white mb-4">Service Availability & Uptime</h2>
                
                <div className="space-y-4">
                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">🌐</span>
                      Lightning Network Dependency
                    </h3>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      Key-Rex relies on the Lightning Network to work. We don't control the Lightning Network (it's a decentralized network), so if it has problems, sign-ins might be temporarily unavailable until it recovers.
                    </p>
                    <p className="text-white/400 text-xs">
                      <strong>What this means for you:</strong> If the Lightning Network is having issues, your visitors may not be able to sign in with Key-Rex during that time. This is why we recommend offering Key-Rex as an option alongside other sign-in methods, so visitors typically have a way to sign in.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      Our Commitment to Service Stability
                    </h3>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      We aim to maintain high service availability and monitor the Lightning Network status. Our infrastructure is designed to handle authentication requests reliably and efficiently.
                    </p>
                    <p className="text-white/400 text-xs">
                      <strong>Note:</strong> Key-Rex can work as a standalone sign-in option, and we recognize that many websites already have existing login processes. In these cases, Key-Rex works great as an alternative authentication method, allowing you to offer both options simultaneously so visitors can choose what works best for them.
                    </p>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      No SLA for Free Tier
                    </h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      Key-Rex does not include a Service Level Agreement (SLA) or uptime guarantee. We do our best to maintain service availability, but cannot guarantee 100% uptime. If you're interested in guaranteed uptime and SLA commitments, <a href="#custom-solutions" className="text-orange-400 hover:text-orange-300 underline">contact us</a> to discuss paid custom solutions.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Support Model */}
            <section id="support-model">
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-2xl font-semibold text-white mb-4">Support Model</h2>
                
                <div className="space-y-6">
                  {/* Free Tier Support */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🆓</span>
                      Free Tier Support
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                        <h4 className="text-white font-semibold mb-2">Response Time Target</h4>
                        <p className="text-white/200 text-base leading-relaxed mb-2">
                          When you contact us through our contact form, we try to respond within <strong className="text-orange-400">24-48 hours</strong>. This is our goal, but we can't guarantee it—response times can vary depending on how many questions we're receiving and how complex your question is.
                        </p>
                        <p className="text-white/400 text-xs">
                          Response times may vary based on inquiry volume and complexity.
                        </p>
                      </div>

                      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                        <h4 className="text-white font-semibold mb-2">Self-Service Resources</h4>
                        <p className="text-white/300 text-sm leading-relaxed mb-3">
                          Before contacting us, check out these resources—many questions can be answered quickly without waiting for a response:
                        </p>
                        <ul className="text-white/200 text-base space-y-2 ml-4 leading-relaxed">
                          <li>• <Link href="/faq" className="text-orange-400 hover:text-orange-300 underline">FAQ Page</Link> - Answers to common questions</li>
                          <li>• <strong>Dashboard Documentation Tab</strong> - Complete integration guides, code examples, account linking patterns (including multi-wallet per user), and API reference</li>
                          <li>• <strong>Dashboard Troubleshooting Tab</strong> - Diagnostic tools, common issues, and solutions</li>
                          <li>• <Link href="/open-source" className="text-orange-400 hover:text-orange-300 underline">Open Source Code</Link> - Review and audit the codebase yourself</li>
                        </ul>
                      </div>

                      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                        <h4 className="text-white font-semibold mb-2">Support Scope</h4>
                        <p className="text-white/200 text-base leading-relaxed mb-2">
                          Free tier support covers:
                        </p>
                        <ul className="text-white/200 text-base space-y-1 ml-4 mb-2 leading-relaxed">
                          <li>• General questions about Key-Rex functionality</li>
                          <li>• Integration guidance and troubleshooting</li>
                          <li>• Bug reports and technical issues</li>
                          <li>• Documentation clarifications</li>
                        </ul>
                        <p className="text-white/400 text-xs mt-2">
                          <strong>Note:</strong> We typically cannot provide custom code development, dedicated implementation assistance, or guaranteed response times for free tier users.
                        </p>
                      </div>

                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                        <h4 className="text-blue-400 font-semibold mb-2">Best Practices for Getting Help</h4>
                        <p className="text-white/200 text-base leading-relaxed mb-2">
                          To get the fastest help:
                        </p>
                        <ol className="text-white/300 text-sm space-y-1 ml-4 list-decimal">
                          <li>Check the <Link href="/faq" className="text-blue-400 hover:text-blue-300 underline">FAQ</Link> first</li>
                          <li>Review the <strong>Troubleshooting tab</strong> in your dashboard</li>
                          <li>Check the <strong>Documentation tab</strong> for code examples</li>
                          <li>Include relevant details in your support request (error messages, steps to reproduce, etc.)</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Paid Support Option */}
                  <div className="border-t border-dark-700 pt-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">💼</span>
                      Need Priority Support?
                    </h3>
                    
                    <Card className="p-6 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-2xl">💰</span>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-2">Custom Solutions with Priority Support</h4>
                          <p className="text-white/300 text-sm leading-relaxed mb-3">
                            If you're interested in priority support with SLA commitments, dedicated assistance, or custom implementation help, we're open to discussing paid custom solutions. Contact us below and we can work together to determine if we can set something up that meets your needs.
                          </p>
                          <div className="bg-dark-800/50 rounded-lg p-3 mb-3">
                            <p className="text-white/300 text-sm font-semibold mb-2">What we might include in paid support:</p>
                            <ul className="text-white/300 text-sm space-y-1 ml-4">
                              <li>• SLA-committed response times</li>
                              <li>• Priority support queue</li>
                              <li>• Dedicated implementation assistance</li>
                              <li>• Custom code development if needed</li>
                              <li>• Direct communication channels</li>
                            </ul>
                          </div>
                          <button
                            onClick={() => {
                              if (formRef.current) {
                                const offset = 80
                                const elementPosition = formRef.current.getBoundingClientRect().top
                                const offsetPosition = elementPosition + window.pageYOffset - offset
                                window.scrollTo({
                                  top: offsetPosition,
                                  behavior: 'smooth'
                                })
                                setTimeout(() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    subject: 'custom-solution'
                                  }))
                                }, 300)
                              }
                            }}
                            className="inline-block bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-orange-400/50 cursor-pointer"
                          >
                            Contact Us About Custom Solutions
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </section>

            {/* Data Retention & Privacy */}
            <section id="data-retention">
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-2xl font-semibold text-white mb-4">Data Retention & Privacy</h2>
                
                <div className="space-y-4">
                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                    <h3 className="text-white font-semibold mb-2">Data Retention</h3>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      We retain your account data for as long as your account is active. This includes:
                    </p>
                    <ul className="text-white/300 text-sm space-y-1 ml-4 mb-2">
                      <li>• Account information (xpub, site ID, domains, settings)</li>
                      <li>• Usage statistics (login counts, analytics, unique users)</li>
                      <li>• Activity logs (last 1000 activities per user)</li>
                      <li>• Disclaimer acceptance metadata (timestamp, IP address, user agent)</li>
                    </ul>
                    <p className="text-white/400 text-xs">
                      <strong>Usage statistics:</strong> Login counts and analytics data are retained to provide you with usage insights in your dashboard. Analytics include daily/hourly patterns, domain breakdowns, wallet usage, browser/device types, and user retention metrics.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                    <h3 className="text-white font-semibold mb-2">Data Export</h3>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      You can export your account data at any time from the <strong>Settings tab</strong> in your dashboard. Available exports include:
                    </p>
                    <ul className="text-white/300 text-sm space-y-1 ml-4 mb-2">
                      <li>• <strong>Account Data:</strong> xpub, site ID, creation date, domains, settings</li>
                      <li>• <strong>Usage Statistics:</strong> All analytics data (login counts, unique users, daily/hourly patterns, domain/wallet/browser/device breakdowns)</li>
                      <li>• <strong>Activity Logs:</strong> Your account activity history (exported separately)</li>
                    </ul>
                    <p className="text-white/400 text-xs mt-2">
                      <strong>Note:</strong> Disclaimer acceptance metadata (IP address, user agent) and contact form submissions are not included in user data exports. Data is exported in JSON format for easy integration with other systems.
                    </p>
                  </div>

                  <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
                    <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">🔐</span>
                      Lost Wallet Access
                    </h3>
                    <p className="text-white/200 text-sm leading-relaxed mb-3">
                      <strong>Important:</strong> If you lose access to the Lightning wallet you use to sign in to your Key-Rex dashboard, you must create a new Key-Rex account with a different wallet. There is no account recovery—this is by design to prevent bad actors from gaining unauthorized access to accounts.
                    </p>
                    <div className="bg-dark-900/50 rounded-lg p-3 mt-3 mb-3">
                      <p className="text-sm font-semibold text-white mb-2">What this means:</p>
                      <ul className="text-sm text-white/300 space-y-1 list-disc list-inside">
                        <li>You cannot recover your existing Key-Rex account if you lose your wallet</li>
                        <li>You must create a new account with a new wallet</li>
                        <li>Your new account will have a new Site ID</li>
                        <li>You will need to update your integration code on your website with the new Site ID</li>
                        <li>Your previous account&apos;s domains, settings, and statistics cannot be transferred</li>
                      </ul>
                    </div>
                    <p className="text-white/300 text-sm">
                      <strong>Recommendation:</strong> Keep your Lightning wallet secure and backed up. Consider using a hardware wallet or secure backup method for your wallet keys. Export your data regularly from the Settings tab in your dashboard for backup purposes.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                    <h3 className="text-white font-semibold mb-2">Privacy & Data Collection</h3>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      Key-Rex collects minimal operational data. We do NOT collect:
                    </p>
                    <ul className="text-white/300 text-sm space-y-1 ml-4 mb-3">
                      <li>• Email addresses (except for contact form submissions, which are optional)</li>
                      <li>• Names or personal information (except optional name in contact form)</li>
                      <li>• IP addresses for end users (your website's visitors)</li>
                      <li>• Tracking data or analytics pixels</li>
                      <li>• Browser fingerprints or device IDs</li>
                    </ul>
                    <p className="text-white/200 text-base leading-relaxed mb-2">
                      <strong>What we DO collect (for account owners):</strong>
                    </p>
                    <ul className="text-white/300 text-sm space-y-1 ml-4 mb-2">
                      <li>• <strong>IP address and user agent</strong> - Collected when you accept the disclaimer (for audit trail)</li>
                      <li>• <strong>IP address and user agent</strong> - Collected with contact form submissions (for support purposes)</li>
                    </ul>
                    <p className="text-white/300 text-sm leading-relaxed mb-2 mt-3">
                      <strong>What we collect (for end users - your website visitors):</strong>
                    </p>
                    <ul className="text-white/300 text-sm space-y-1 ml-4 mb-2">
                      <li>• <strong>User-Agent parsing</strong> - Raw User-Agent strings are NOT stored. Only parsed results (browser type, device type, wallet type) are stored in analytics for your dashboard insights.</li>
                    </ul>
                    <p className="text-white/400 text-xs">
                      See our <Link href="/open-source" className="text-orange-400 hover:text-orange-300 underline">Open Source page</Link> for complete details on data collection.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Custom Solutions */}
            <section id="custom-solutions">
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">💼</div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Need Something Custom?</h2>
                  <p className="text-white/300 mb-4">
                    If you're interested in white-label branding (removing Key-Rex references), priority support with guaranteed response times, or custom integrations tailored to your specific needs, we're open to discussing paid custom solutions. Contact us below and we can work together to determine if we can set something up that meets your requirements.
                  </p>
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-4 inline-block">
                    <p className="text-orange-400 font-semibold text-base mb-1">💰 Paid Service</p>
                    <p className="text-white/300 text-sm">Custom pricing based on your specific requirements</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-dark-800/50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🎨</div>
                    <h3 className="text-white font-semibold mb-2">White-Label Branding</h3>
                    <p className="text-white/400 text-sm">
                      Fully custom button styling and branding. Remove all Key-Rex references and use your own brand identity.
                    </p>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-4">
                    <div className="text-2xl mb-2">🛡️</div>
                    <h3 className="text-white font-semibold mb-2">Priority Support</h3>
                    <p className="text-white/400 text-sm">
                      Priority support with SLA commitments, dedicated assistance, and faster response times for critical issues.
                    </p>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-4">
                    <div className="text-2xl mb-2">⚙️</div>
                    <h3 className="text-white font-semibold mb-2">Custom Integrations</h3>
                    <p className="text-white/400 text-sm">
                      Tailored solutions for your specific infrastructure, workflows, and business requirements.
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-white/400 text-sm mb-4">
                    All custom solutions are paid services. Contact us below to discuss your needs and we can work together to determine if we can set something up that works for you.
                  </p>
                  <button
                    onClick={() => {
                      if (formRef.current) {
                        const offset = 80
                        const elementPosition = formRef.current.getBoundingClientRect().top
                        const offsetPosition = elementPosition + window.pageYOffset - offset
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                        setTimeout(() => {
                          setFormData(prev => ({
                            ...prev,
                            subject: 'custom-solution'
                          }))
                        }, 300)
                      }
                    }}
                    className="inline-block bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-orange-400/50 cursor-pointer"
                  >
                    Contact Us About Custom Solutions
                  </button>
                </div>
              </Card>
            </section>

            {/* Before Contacting Support */}
            <section id="before-contacting">
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-3xl">💡</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">Before Contacting Support</h2>
                    <p className="text-white/300 text-sm mb-4">
                      To help us assist you more quickly, please check these resources first. Many questions can be answered quickly without waiting for a response.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <a
                    href="/faq"
                    className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-lg hover:bg-dark-800/70 transition-colors border border-dark-700/50 hover:border-orange-500/30"
                  >
                    <div className="text-2xl">❓</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">FAQ Page</h3>
                      <p className="text-white/400 text-xs">Answers to common questions about setup, usage, and troubleshooting</p>
                    </div>
                  </a>

                  <a
                    href="/open-source"
                    className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-lg hover:bg-dark-800/70 transition-colors border border-dark-700/50 hover:border-orange-500/30"
                  >
                    <div className="text-2xl">🔍</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Open Source Code</h3>
                      <p className="text-white/400 text-xs">Review the codebase to understand exactly how everything works</p>
                    </div>
                  </a>

                  <div className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
                    <div className="text-2xl">📚</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Dashboard Documentation</h3>
                      <p className="text-white/400 text-xs">Comprehensive guides, code examples, and API documentation (after signing in)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
                    <div className="text-2xl">🐛</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Troubleshooting Tab</h3>
                      <p className="text-white/400 text-xs">Common issues, solutions, and diagnostic tools (in your dashboard)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-white/300 text-sm">
                    <strong className="text-orange-400">Still need help?</strong> If you've checked the resources above and still have questions, we're here to help! Use the form below to send us a message.
                  </p>
                </div>
              </Card>
            </section>

            {/* Contact Form */}
            <section id="contact-form" ref={formRef}>
              <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>
                
                {submitted ? (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <h3 className="text-white font-semibold text-lg mb-2">Message Sent!</h3>
                    <p className="text-white/300 text-sm mb-4">
                      We'll get back to you as soon as possible. In the meantime, check out our FAQ or documentation for quick answers.
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-white/300 text-sm font-medium mb-2">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                        placeholder="Your name"
                        aria-label="Your name (optional)"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-white/300 text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                        placeholder="your@email.com"
                        aria-label="Email address"
                        aria-required="true"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-white/300 text-sm font-medium mb-2">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                      >
                        <option value="">Select a topic...</option>
                        <option value="custom-solution">Custom Solution / White-Label Inquiry</option>
                        <option value="enterprise-support">Priority Support / Enterprise Inquiry</option>
                        <option value="integration-help">Integration Help</option>
                        <option value="technical-issue">Technical Issue</option>
                        <option value="feature-request">Feature Request</option>
                        <option value="billing-question">Billing Question</option>
                        <option value="general-inquiry">General Inquiry</option>
                        <option value="bug-report">Bug Report</option>
                      </select>
                    </div>

                    {/* Urgent Checkbox */}
                    <div className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
                      <input
                        type="checkbox"
                        id="urgent"
                        name="urgent"
                        checked={formData.urgent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-dark-600 bg-dark-700 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] cursor-pointer"
                      />
                      <label htmlFor="urgent" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-400 font-semibold">⚠️ URGENT</span>
                          <span className="text-white/400 text-xs">(Check this for urgent technical issues)</span>
                        </div>
                        <p className="text-white/400 text-xs">
                          Urgent requests typically receive priority attention and faster response times.
                        </p>
                      </label>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-white/300 text-sm font-medium mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 resize-none"
                        placeholder="Tell us how we can help..."
                      />
                    </div>

                    {/* Response Time Notice */}
                    <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-orange-400 text-xl flex-shrink-0">ℹ️</span>
                        <div>
                          <h3 className="text-white font-semibold mb-2 text-base">Response Time</h3>
                          <p className="text-white/300 text-sm leading-relaxed">
                            We aim to respond to all inquiries within <strong className="text-orange-400">24-48 hours</strong>. For urgent technical issues, check the <strong className="text-orange-400">"URGENT"</strong> checkbox above. For faster help, check the Troubleshooting tab in your dashboard first.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-orange-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {submitting ? 'Sending...' : 'Send Message'}
                    </Button>
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

