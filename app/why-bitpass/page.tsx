'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Link from 'next/link'
import PageNavigation from '@/components/PageNavigation'

export default function WhyKeyRex() {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'key-benefits', label: 'Key Benefits' },
    { id: 'use-cases', label: 'Use Cases' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'key-takeaways', label: 'Key Takeaways' },
  ]

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex relative">
        {/* Sticky Navigation */}
        <div className="hidden lg:block">
          <PageNavigation items={navItems} title="On This Page" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4" id="overview">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Why Key-Rex?</h1>
              <p className="text-xl text-white/200 leading-relaxed">
                Here's why website owners are choosing Key-Rex for their authentication needs
              </p>
            </div>

            {/* Mission & Values */}
            <section id="mission">
              <Card className="p-8 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                <div className="text-center space-y-6">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                      <div className="text-6xl mb-4">⚡</div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Built by Bitcoiners, for Bitcoiners
                      </h2>
                    </div>
                    
                    <p className="text-xl text-white/200 leading-relaxed font-medium">
                      Our mission is to help grow the Bitcoin ethos around the world—individual privacy, financial sovereignty, and the freedom that comes with truly decentralized technology.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
                      <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50">
                        <div className="flex items-start gap-3">
                          <span className="text-orange-400 text-2xl mt-0.5">⚡</span>
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Bitcoin-Only</h3>
                            <p className="text-white/200 text-base leading-relaxed">
                              To us, there is Bitcoin and that's it. We're not interested in creating or supporting products that aren't Bitcoin-focused. Every decision we make reinforces our commitment to Bitcoin.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700/50">
                        <div className="flex items-start gap-3">
                          <span className="text-orange-400 text-2xl mt-0.5">🌍</span>
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Fix the Money, Fix the World</h3>
                            <p className="text-white/200 text-base leading-relaxed">
                              We believe that if we fix the money, we can fix the world. Bitcoin is the solution humanity needs to achieve its full potential—and we're building tools to help make that vision a reality.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-orange-500/30">
                      <p className="text-white/200 text-base leading-relaxed">
                        When you choose Key-Rex, you're not just choosing authentication technology. <strong className="text-white">You're choosing a partner who shares your values</strong> and is committed to the same mission: growing Bitcoin adoption and empowering individual sovereignty.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Key Benefits */}
            <section id="key-benefits">
              <Card className="p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">Key Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔐</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Stop Worrying About Password Breaches</h3>
                      <p className="text-white/400 text-sm leading-relaxed">
                        When users sign in with their Lightning wallet, there are no passwords to steal. They use cryptographic signatures (the same security that protects Bitcoin) to prove who they are. This means you don't have to worry about password databases being hacked, and your users don't have to worry about their passwords being stolen.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Your Visitors Will Love How Fast It Is</h3>
                      <p className="text-white/400 text-sm leading-relaxed">
                        Instead of filling out forms and waiting for email verification codes, your visitors can sign in with just one click. No typing passwords, no checking email inboxes. This faster experience typically means more people actually complete the sign-in process instead of giving up halfway through.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Get It Running Quickly</h3>
                      <p className="text-white/400 text-sm leading-relaxed">
                        Adding Key-Rex to your website is straightforward. You add two lines of code to your HTML, set up a simple backend endpoint to receive sign-in information, and you're done. You don't need to set up email services, create user databases, or configure complex systems. Most people can get it working in under an hour.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🌐</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Better Privacy for Everyone</h3>
                      <p className="text-white/400 text-sm leading-relaxed">
                        With Key-Rex, you don't need to collect email addresses, names, or any personal information from your visitors. They sign in using their wallet, which proves their identity without sharing personal details. This means less data for you to protect, simpler privacy compliance, and more privacy for your users.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Use Cases */}
            <section id="use-cases">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Works For Any Website</h2>
                <p className="text-white/300 mb-6">
                  Whether you run an online store, a blog, a SaaS application, or something else entirely, Key-Rex can work for you. Here are some common ways website owners use it. You stay in control of how accounts work on your side—you can treat each wallet as a separate user, or allow multiple wallets (multiple xpubs) to unlock the same account in your own system.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="text-4xl mb-4">🛒</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Online Stores</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      Make checkout faster and easier. Customers can sign in instantly without waiting for email codes, which means fewer abandoned carts. Plus, you won't get support requests about forgotten passwords.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Faster checkout process</li>
                      <li>• No password reset requests</li>
                      <li>• Reduced cart abandonment</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <div className="text-4xl mb-4">💼</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Software-as-a-Service Apps</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      Give your users a modern sign-in option that's more secure than passwords. You won't have to worry about securing email databases or dealing with password breach notifications.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Reduced security liability</li>
                      <li>• Better user experience</li>
                      <li>• Lower infrastructure costs</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Blogs & Content Sites</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      Let visitors comment or access member-only content without the hassle of managing user accounts, email verification, or password resets.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Comment authentication</li>
                      <li>• Member-only content</li>
                      <li>• No spam accounts</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Community Platforms</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      Lower the barrier to entry for your community. People can join and start participating immediately without filling out long registration forms or waiting for email confirmations.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Lower signup friction</li>
                      <li>• Higher engagement rates</li>
                      <li>• Privacy-focused approach</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <div className="text-4xl mb-4">⚙️</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Developer Tools</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      If your audience is technical, they'll appreciate the cryptographic security and privacy-focused approach. It aligns with the values many developers care about.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Appeals to technical users</li>
                      <li>• Aligns with crypto values</li>
                      <li>• Minimal data collection</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <div className="text-4xl mb-4">🔒</div>
                    <h3 className="text-white font-semibold text-xl mb-3">Membership Sites</h3>
                    <p className="text-white/400 mb-4 text-sm">
                      Control access to your premium content securely. Members can sign in instantly without email verification delays, so they can access what they paid for right away.
                    </p>
                    <ul className="text-white/300 text-sm space-y-1">
                      <li>• Quick access activation</li>
                      <li>• No email delays</li>
                      <li>• Secure identity verification</li>
                    </ul>
                  </Card>
                </div>
              </Card>
            </section>

            {/* Comparison */}
            <section id="comparison">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">How Does Key-Rex Compare to Other Sign-In Methods?</h2>
                <p className="text-white/300 mb-6">
                  Here's how Key-Rex stacks up against the traditional ways people sign in to websites:
                </p>

                <div className="overflow-x-auto">
                  <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-dark-800/50 border-b border-dark-700">
                            <th className="px-6 py-4 text-left text-white font-semibold">Feature</th>
                            <th className="px-6 py-4 text-center text-orange-400 font-semibold">Key-Rex</th>
                            <th className="px-6 py-4 text-center text-white/400 font-semibold">Email/Password</th>
                            <th className="px-6 py-4 text-center text-white/400 font-semibold">OAuth (Google/Facebook)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          <tr>
                            <td className="px-6 py-4 text-white/300 font-medium">Setup Time</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Minutes</td>
                            <td className="px-6 py-4 text-center text-white/400">Hours/Days</td>
                            <td className="px-6 py-4 text-center text-white/400">Hours</td>
                          </tr>
                          <tr className="bg-dark-800/30">
                            <td className="px-6 py-4 text-white/300 font-medium">Cost</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ No Cost</td>
                            <td className="px-6 py-4 text-center text-white/400">Email service costs</td>
                            <td className="px-6 py-4 text-center text-white/400">Free (with data sharing)</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-white/300 font-medium">Password Breaches</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Impossible</td>
                            <td className="px-6 py-4 text-center text-red-400">✗ High Risk</td>
                            <td className="px-6 py-4 text-center text-white/400">No passwords</td>
                          </tr>
                          <tr className="bg-dark-800/30">
                            <td className="px-6 py-4 text-white/300 font-medium">User Data Collection</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ None</td>
                            <td className="px-6 py-4 text-center text-white/400">Emails required</td>
                            <td className="px-6 py-4 text-center text-red-400">✗ Extensive</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-white/300 font-medium">Privacy Compliance</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Minimal burden</td>
                            <td className="px-6 py-4 text-center text-white/400">GDPR/CCPA applies</td>
                            <td className="px-6 py-4 text-center text-white/400">GDPR/CCPA applies</td>
                          </tr>
                          <tr className="bg-dark-800/30">
                            <td className="px-6 py-4 text-white/300 font-medium">Email Verification</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Not needed</td>
                            <td className="px-6 py-4 text-center text-red-400">✗ Required</td>
                            <td className="px-6 py-4 text-center text-white/400">Not needed</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-white/300 font-medium">User Friction</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ One click</td>
                            <td className="px-6 py-4 text-center text-white/400">Registration + email</td>
                            <td className="px-6 py-4 text-center text-white/400">OAuth popup</td>
                          </tr>
                          <tr className="bg-dark-800/30">
                            <td className="px-6 py-4 text-white/300 font-medium">Dependency on Third Party</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Decentralized</td>
                            <td className="px-6 py-4 text-center text-white/400">Email provider</td>
                            <td className="px-6 py-4 text-center text-red-400">✗ Google/Facebook</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-white/300 font-medium">Open Source</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Yes</td>
                            <td className="px-6 py-4 text-center text-white/400">Varies</td>
                            <td className="px-6 py-4 text-center text-red-400">✗ Proprietary</td>
                          </tr>
                          <tr className="bg-dark-800/30">
                            <td className="px-6 py-4 text-white/300 font-medium">Infrastructure Required</td>
                            <td className="px-6 py-4 text-center text-green-400">✓ Minimal</td>
                            <td className="px-6 py-4 text-center text-white/400">Email service, DB</td>
                            <td className="px-6 py-4 text-center text-white/400">OAuth integration</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </Card>
            </section>

            {/* Key Takeaways */}
            <section id="key-takeaways">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-3">🔐</div>
                  <h3 className="text-white font-semibold mb-2">Better Security</h3>
                  <p className="text-white/400 text-sm">
                    No passwords to breach, no email databases to compromise. Cryptographic signatures provide superior security.
                  </p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-3">🛡️</div>
                  <h3 className="text-white font-semibold mb-2">Better Privacy</h3>
                  <p className="text-white/400 text-sm">
                    Minimal data collection, no tracking, no sharing with third parties. Your users' privacy is protected.
                  </p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="text-white font-semibold mb-2">Better Experience</h3>
                  <p className="text-white/400 text-sm">
                    One-click authentication with no registration forms, email verification, or password resets.
                  </p>
                </Card>
              </div>
            </section>

            {/* CTA */}
            <Card className="p-8 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-orange-500/30 text-center">
                  <h3 className="text-white font-semibold text-xl mb-3">Ready to Try It?</h3>
              <p className="text-white/300 mb-6">
                If Key-Rex sounds like it could work for your website, you can get started in just a few minutes. There's no cost, no credit card required, and no long-term commitment.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Get Your Integration Code →
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}


