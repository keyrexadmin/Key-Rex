'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Link from 'next/link'
import PageNavigation from '@/components/PageNavigation'

export default function Requirements() {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'backend-requirements', label: 'Backend Requirements' },
    { id: 'browser-requirements', label: 'Browser Requirements' },
    { id: 'framework-compatibility', label: 'Framework Compatibility' },
    { id: 'user-requirements', label: 'User Requirements' },
    { id: 'integration-complexity', label: 'Integration Complexity' },
    { id: 'network-requirements', label: 'Network Requirements' },
    { id: 'testing', label: 'Testing & Staging' },
  ]

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex relative">
        {/* Sticky Navigation */}
        <div className="hidden lg:block">
          <PageNavigation items={navItems} title="Requirements" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Requirements</h1>
              <p className="text-xl text-white/200 leading-relaxed">
                What you need to know before deciding if Key-Rex will work for your website
              </p>
            </div>

            {/* Overview */}
            <section id="overview">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-semibold text-white mb-4">Overview</h2>
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  Before you decide to use Key-Rex, it's important to understand what you'll need. Most of these requirements are simple, but there's one critical requirement that's essential for Key-Rex to work: you need a backend server or serverless function.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                    <p className="text-orange-200 text-sm font-semibold mb-2">⚠️ Critical Requirement</p>
                  <p className="text-white/200 text-sm leading-relaxed">
                    You <strong className="text-white">must</strong> have a backend server or serverless function for Key-Rex to work. This is the one requirement that can't be skipped. If you only have a static website with no backend, you'll need to add a serverless function. See the Backend Requirements section below for details and examples.
                  </p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-orange-200 text-sm font-semibold mb-2">📋 Getting Started</p>
                  <p className="text-white/200 text-sm leading-relaxed">
                    To use Key-Rex, you'll need to <strong className="text-white">create a Key-Rex account</strong> first. After signing in with your Lightning wallet, you'll get a unique <code className="bg-dark-800 px-1 rounded">siteId</code> and integration code from your dashboard. This <code className="bg-dark-800 px-1 rounded">siteId</code> is included in your integration code and identifies your website to the Key-Rex service.
                  </p>
                </div>
              </Card>
            </section>

            {/* Backend Requirements */}
            <section id="backend-requirements">
              <Card className="p-8 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-600/5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">⚠️</span>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      Backend Requirements
                      <span className="text-orange-400 text-sm font-bold ml-2">(REQUIRED - NOT OPTIONAL)</span>
                    </h2>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                  <p className="text-orange-300 text-sm font-semibold mb-2">
                    ⚠️ Backend endpoint is REQUIRED - not optional
                  </p>
                  <p className="text-white/200 text-base mb-3 leading-relaxed">
                    Adding the button to your website is easy—just two lines of code. But for visitors to actually sign in, you need a backend server (or serverless function) that receives the sign-in information and signs them into your website. Without this, visitors can click the button, but nothing will happen.
                  </p>
                  <p className="text-white/400 text-xs">
                    <strong>What happens without a backend:</strong> The button appears on your website, but when someone clicks it, the sign-in process can't complete because there's nowhere to send the authentication information. It's like having a doorbell with no one to answer the door.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">What Your Backend Needs to Do</h3>
                    <p className="text-white/200 text-base mb-2 leading-relaxed">
                      Your backend code needs to handle a few simple tasks:
                    </p>
                    <ul className="text-white/200 text-base space-y-2 ml-4 list-disc leading-relaxed">
                      <li>Receive the visitor's unique identifier (called an xpub) when they sign in</li>
                      <li>Sign them into your website (create a session or login token)</li>
                      <li>Optionally link this identifier to their existing account in your system (see dashboard Documentation tab for complete examples)</li>
                      <li>If you want to support multiple wallets per user, optionally store an array of xpubs (or a separate <code className="bg-dark-800 px-1 rounded">user_wallets</code> table) so more than one wallet can unlock the same account.</li>
                      <li>Send them to the right page on your website after they sign in</li>
                    </ul>
                    <div className="bg-dark-800/50 rounded-lg p-3 mt-3 border border-dark-700/50">
                      <h4 className="text-white font-semibold mb-2 text-xs">How Your Backend Receives the xpub</h4>
                      <p className="text-white/300 text-xs mb-2">
                        The xpub can be delivered to your backend in several ways:
                      </p>
                      <ul className="text-white/300 text-xs space-y-1 ml-4 list-disc">
                        <li><strong>onSuccess callback:</strong> Set <code className="bg-dark-900 px-1 rounded">window.Key-Rex.onSuccess = function(xpub) {'{'} ... {'}'}</code> to receive xpub directly</li>
                        <li><strong>URL parameter:</strong> After QR code authentication, xpub is appended to your return URL as <code className="bg-dark-900 px-1 rounded">?xpub=...</code></li>
                        <li><strong>Cookies:</strong> xpub may be stored in cookies (format: <code className="bg-dark-900 px-1 rounded">keyrex_xpub_&lt;prefix&gt;</code>) for cross-domain scenarios</li>
                        <li><strong>postMessage:</strong> When using popup authentication, xpub is sent via <code className="bg-dark-900 px-1 rounded">window.postMessage()</code> from the popup window</li>
                      </ul>
                      <p className="text-white/400 text-xs mt-2">
                        See the dashboard Documentation tab for complete code examples showing how to handle each method.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">What Counts as a Backend?</h3>
                    <p className="text-white/300 text-sm mb-2">
                      Any of these options will work:
                    </p>
                    <ul className="text-white/300 text-sm space-y-2 ml-4 list-disc">
                      <li>A traditional server running code (Node.js, Python, PHP, Ruby, etc.)</li>
                      <li>Serverless functions (Vercel Functions, AWS Lambda, Google Cloud Functions, Netlify Functions)</li>
                      <li>Edge functions (Cloudflare Workers, Vercel Edge Functions)</li>
                      <li>API routes if you're using a framework like Next.js, Nuxt.js, or similar</li>
                    </ul>
                    <p className="text-white/300 text-sm mt-2">
                      If you're not sure which one applies to you, check our documentation or FAQ for examples that match your setup.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">What If I Only Have a Static Website?</h3>
                    <p className="text-white/300 text-sm mb-2">
                      If your website is completely static (like GitHub Pages, Netlify static hosting, or Vercel static), you can still use Key-Rex! You'll just need to add a serverless function to handle the sign-in process. Many hosting providers make this easy to set up, and we provide examples in the dashboard documentation.
                    </p>
                    <p className="text-white/400 text-xs">
                      See <Link href="/faq" className="text-orange-400 hover:text-orange-300 underline">FAQ</Link> for static site examples, or check the dashboard Documentation tab after signup for code examples.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Browser Requirements */}
            <section id="browser-requirements">
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌐</span>
                  Browser Requirements
                </h2>
                <ul className="text-white/300 space-y-2 text-sm">
                  <li>• Modern browser with JavaScript enabled</li>
                  <li>• Works on all major browsers (Chrome, Firefox, Safari, Edge)</li>
                  <li>• Mobile browsers supported (iOS Safari, Chrome Mobile)</li>
                  <li>• No browser extensions required for users</li>
                </ul>
              </Card>
            </section>

            {/* Framework Compatibility */}
            <section id="framework-compatibility">
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  Framework Compatibility
                </h2>
                <ul className="text-white/300 space-y-2 text-sm">
                  <li>• Works with any framework (React, Vue, Angular, etc.)</li>
                  <li>• Compatible with all CMS platforms (WordPress, Drupal, etc.)</li>
                  <li>• Plain HTML/JavaScript supported</li>
                  <li>• Server-side rendering (SSR) compatible</li>
                </ul>
              </Card>
            </section>

            {/* User Requirements */}
            <section id="user-requirements">
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  User Requirements
                </h2>
                <p className="text-white/300 text-sm mb-3">
                  For someone to sign in with Key-Rex, they need to have a Lightning wallet app on their phone or computer. If they don't have one, they won't be able to use this sign-in method. Key-Rex can work as a standalone sign-in option, and we recognize that many websites already have existing login processes. In these cases, Key-Rex works great as an alternative authentication method, allowing you to offer both options simultaneously so visitors can choose what works for them.
                </p>
                <ul className="text-white/300 space-y-2 text-sm ml-4 list-disc">
                  <li>Users need a Lightning wallet (Alby, Phoenix, Zeus, etc.)</li>
                  <li>Desktop: Browser extension (Alby recommended)</li>
                  <li>Mobile: Mobile wallet app (Phoenix, Zeus recommended)</li>
                  <li>All wallets are free to download and use</li>
                </ul>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-4">
                  <p className="text-orange-200 text-xs">
                    <strong>Note:</strong> Key-Rex can work as a standalone sign-in option, and we recognize that many websites already have existing login processes. In these cases, Key-Rex works great as an alternative authentication method, allowing you to offer both options simultaneously so visitors can choose what works best for them.
                  </p>
                </div>
              </Card>
            </section>

            {/* Integration Complexity */}
            <section id="integration-complexity">
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔧</span>
                  Integration Complexity
                </h2>
                <ul className="text-white/300 space-y-2 text-sm">
                  <li>• Frontend: Add single script tag (2 minutes)</li>
                  <li>• Backend: Implement callback handler (15-30 minutes)</li>
                  <li>• No database changes required (unless linking accounts)</li>
                  <li>• No email service configuration needed</li>
                </ul>
                <div className="bg-dark-800/50 rounded-lg p-3 mt-4 border border-dark-700/50">
                  <p className="text-white/300 text-xs">
                    <strong>Note:</strong> Your dashboard includes an integration toggle that can enable or disable authentication across all your domains. If authentication isn't working, check that the "Integration Status" toggle in your dashboard's "My Integration Code" tab is set to ON (green/active).
                  </p>
                </div>
              </Card>
            </section>

            {/* Network Requirements */}
            <section id="network-requirements">
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌍</span>
                  Network Requirements
                </h2>
                <ul className="text-white/300 space-y-2 text-sm">
                  <li>• Requires internet connection</li>
                  <li>• Depends on Lightning Network availability</li>
                  <li>• HTTPS required for production (security best practice)</li>
                  <li>• CORS handled automatically by Key-Rex—no configuration needed</li>
                </ul>
                <div className="bg-dark-800/50 rounded-lg p-3 mt-4 border border-dark-700/50">
                  <p className="text-white/300 text-xs">
                    <strong>Note:</strong> Key-Rex service availability depends on Lightning Network uptime. We don't control the Lightning Network, so if it experiences issues, authentication may be temporarily unavailable. See <Link href="/support#service-availability" className="text-orange-400 hover:text-orange-300 underline">Support</Link> for details.
                  </p>
                </div>
              </Card>
            </section>

            {/* Testing & Staging */}
            <section id="testing">
              <Card className="p-6 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🧪</span>
                  Testing & Staging
                </h2>
                <p className="text-white/300 text-sm mb-3">
                  Key-Rex supports test domains for safe testing before going live.
                </p>
                <ul className="text-white/300 space-y-2 text-sm ml-4 list-disc mb-3">
                  <li>Test domains are automatically detected and allowed—no need to add them to your dashboard</li>
                  <li>Automatically allowed: <code className="bg-dark-800 px-1 rounded">localhost</code>, <code className="bg-dark-800 px-1 rounded">127.0.0.1</code>, any subdomain starting with <code className="bg-dark-800 px-1 rounded">test.</code>, <code className="bg-dark-800 px-1 rounded">staging.</code>, <code className="bg-dark-800 px-1 rounded">dev.</code>, <code className="bg-dark-800 px-1 rounded">testing.</code>, <code className="bg-dark-800 px-1 rounded">development.</code>, <code className="bg-dark-800 px-1 rounded">local.</code>, <code className="bg-dark-800 px-1 rounded">demo.</code>, <code className="bg-dark-800 px-1 rounded">sandbox.</code>, <code className="bg-dark-800 px-1 rounded">qa.</code>, or <code className="bg-dark-800 px-1 rounded">preview.</code></li>
                  <li>Test domains ending in <code className="bg-dark-800 px-1 rounded">.test</code>, <code className="bg-dark-800 px-1 rounded">.local</code>, or <code className="bg-dark-800 px-1 rounded">.example</code> are also automatically allowed</li>
                  <li>Any IP address (e.g., <code className="bg-dark-800 px-1 rounded">192.168.1.1</code>) is automatically allowed for testing</li>
                  <li>Perfect for development and staging environments</li>
                </ul>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                  <p className="text-orange-200 text-xs font-semibold mb-1">💡 Important</p>
                  <p className="text-white/300 text-xs mb-2">
                    Test domains don't need to be added to your dashboard—they work automatically without verification. Production domains must be added to your dashboard and verified via DNS TXT record to prove ownership before authentication works.
                  </p>
                  <p className="text-white/300 text-xs">
                    <strong>Domain format:</strong> When adding production domains to your dashboard, use only the hostname (e.g., <code className="bg-dark-900 px-1 rounded">example.com</code>). Don't include protocols (<code className="bg-dark-900 px-1 rounded">https://</code>) or paths (<code className="bg-dark-900 px-1 rounded">/path</code>). Subdomains like <code className="bg-dark-900 px-1 rounded">www.example.com</code> are treated as separate domains and need to be added and verified separately if you want to support both.
                  </p>
                </div>
                <p className="text-white/400 text-xs mt-3">
                  Test your integration safely before deploying to production. All test authentication attempts are tracked separately in your dashboard.
                </p>
              </Card>
            </section>

            {/* Next Steps */}
            <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-orange-500/30">
              <h3 className="text-white font-semibold text-lg mb-3">Think Key-Rex Will Work for You?</h3>
              <p className="text-white/300 text-sm mb-4">
                If you have (or can add) a backend server or serverless function, you're ready to try Key-Rex. Get your integration code and start adding Lightning wallet sign-ins to your website. Remember, it's completely free with no credit card required.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/"
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  Get Your Integration Code →
                </a>
                <Link
                  href="/how-it-works"
                  className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
                >
                  Learn How It Works
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

