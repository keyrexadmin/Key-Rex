'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Link from 'next/link'
import PageNavigation from '@/components/PageNavigation'

export default function HowItWorks() {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'authentication-flow', label: 'Authentication Flow' },
    { id: 'integration-steps', label: 'Integration Steps' },
    { id: 'lightning-wallets', label: 'Lightning Wallets' },
    { id: 'technical-details', label: 'Technical Details' },
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
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h1>
              <p className="text-xl text-white/200 leading-relaxed">
                Here's how visitors sign in to your website using their Lightning wallets
              </p>
            </div>

            {/* Overview */}
            <section id="overview">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-semibold text-white mb-4">Overview</h2>
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  Key-Rex lets your website visitors sign in using their Lightning wallets—these are Bitcoin wallets that work on the Lightning Network. Instead of asking for passwords or email addresses, visitors prove who they are using cryptographic signatures (the same security technology that protects Bitcoin).
                </p>
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  Here's the simple version: When someone wants to sign in, they click the button on your website. Their wallet app asks them to approve the sign-in request. Once they approve, your website receives proof that they are who they claim to be—no password needed, no email verification required.
                </p>
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 mt-4">
                  <p className="text-white/200 text-sm leading-relaxed">
                    <strong className="text-white">Key Benefits:</strong> No passwords to breach, no email databases to secure, quick authentication, and minimal privacy compliance burden.
                  </p>
                </div>
              </Card>
            </section>

            {/* Authentication Flow */}
            <section id="authentication-flow">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-semibold text-white mb-6">Authentication Flow</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Visitor Clicks the Sign-In Button</h3>
                      <p className="text-white/200 text-base leading-relaxed">
                        When someone visits your website and wants to sign in, they click the "Sign in with Key-Rex" button. This starts the sign-in process.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Their Wallet App Asks for Approval</h3>
                      <p className="text-white/200 text-base leading-relaxed">
                        The visitor's Lightning wallet app (like Alby, Phoenix, or Zeus) opens and shows them a sign-in request. This request is unique to this specific sign-in attempt and expires after a short time for security.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Visitor Approves the Sign-In</h3>
                      <p className="text-white/200 text-base leading-relaxed">
                        The visitor taps "Approve" or "Sign In" in their wallet app. Their wallet creates a cryptographic signature that proves their identity. This signature is created using their private key, which never leaves their wallet—it stays secure on their device.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Key-Rex Verifies the Signature</h3>
                      <p className="text-white/200 text-base leading-relaxed">
                        Key-Rex checks that the signature is valid using the same cryptographic security that Bitcoin uses (called ECDSA secp256k1). If the signature is valid, Key-Rex creates a unique identifier for this visitor (called an xpub) and delivers it to your frontend code.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Your Website Signs Them In</h3>
                      <p className="text-white/300 text-sm leading-relaxed mb-2">
                        Your frontend code receives the visitor's unique identifier (xpub) via a callback function. You then send this xpub to your backend server, which can sign them into your website, link this identifier to their existing account if they're a returning visitor, or create a new account if this is their first time. Then you redirect them to the appropriate page on your site.
                      </p>
                      <p className="text-white/200 text-base leading-relaxed">
                        If you want to go further, you can also allow a single user account to have multiple wallets by storing more than one xpub for that account in your own database (for example, one for their mobile wallet and one for their desktop wallet).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-6">
                  <p className="text-orange-200 text-sm mb-3">
                    <strong>Technical Note:</strong> Key-Rex uses LNURL-auth, which is a standard way for Lightning wallets to handle authentication. This means it works with all major Lightning wallet apps, so your visitors can use whichever wallet they prefer.
                  </p>
                  <p className="text-orange-200 text-sm">
                    <strong>Authentication Methods:</strong> Key-Rex supports three authentication methods: <strong>WebLN</strong> (browser extension, one-click authentication - this is the desired/preferred method), <strong>QR code popup</strong> (desktop fallback when WebLN isn't available), and <strong>QR code redirect</strong> (mobile fallback). Many wallets currently don't support QR code scanning for LNURL-auth, but we expect them to rapidly incorporate this technology over time as the Lightning Network ecosystem matures.
                  </p>
                </div>
              </Card>
            </section>

            {/* Integration Steps */}
            <section id="integration-steps">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">How to Add Key-Rex to Your Website</h2>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-orange-500 pl-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Step 1: Add the Button to Your Website</h3>
                    <p className="text-white/300 text-sm leading-relaxed mb-3">
                      After you sign up and get your integration code, you'll copy the integration code and paste it into your website's HTML. The script automatically initializes when the page loads, so the sign-in button will appear automatically.
                    </p>
                    <div className="bg-dark-900 rounded-lg p-3 mt-3">
                      <code className="text-xs text-orange-400 font-mono">
                        {'<script src="https://keyrex.example.com/embed?siteId=YOUR_SITE_ID"></script>'}
                      </code>
                    </div>
                    <p className="text-white/400 text-xs mt-2">
                      <strong>Note:</strong> The script auto-initializes when the DOM is ready. Including <code className="bg-dark-800 px-1 rounded">Key-Rex.init()</code> is optional but recommended for explicit control.
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Step 2: Set Up Your Frontend to Receive the xpub</h3>
                    <p className="text-white/300 text-sm leading-relaxed mb-3">
                      You'll need to set up a callback function in your frontend code that receives the visitor's identifier (xpub) when they sign in. This callback is called automatically by Key-Rex when authentication succeeds.
                    </p>
                    <div className="bg-dark-900 rounded-lg p-3 mt-3 mb-3">
                      <code className="text-xs text-orange-400 font-mono whitespace-pre-wrap break-words">
{`window.Key-Rex.onSuccess = function(xpub) {
  // Send xpub to your backend
  fetch('/api/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ xpub: xpub })
  });
};`}
                      </code>
                    </div>
                    <p className="text-white/300 text-sm leading-relaxed mb-3">
                      The xpub can be delivered via the <code className="bg-dark-800 px-1 rounded">onSuccess</code> callback, URL parameters (after QR redirect), cookies, or postMessage (from popup). Your frontend code then sends this xpub to your backend server.
                    </p>
                    <p className="text-white/400 text-xs">
                      <strong>Important:</strong> You also need a backend server to receive the xpub from your frontend and create a user session. Without this, visitors can click the button, but they won't actually be signed in. See <Link href="/requirements" className="text-orange-400 hover:text-orange-300 underline">Requirements</Link> for more details and examples.
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Step 3: Connect to Your User Accounts (Optional)</h3>
                    <p className="text-white/300 text-sm leading-relaxed mb-3">
                      If you already have user accounts on your website, you can link the visitor's identifier (xpub) to their existing account. New visitors can sign in and you create accounts for them, while existing users can link their Lightning wallet to their current account. This step is optional—you can also just use the identifier directly if you don't need traditional user accounts.
                    </p>
                    <p className="text-white/400 text-xs">
                      See <Link href="/faq#category-4" className="text-orange-400 hover:text-orange-300 underline">FAQ</Link> for more details, or check the dashboard Documentation tab after signup for complete code examples and implementation guides.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Lightning Wallets */}
            <section id="lightning-wallets">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">What Lightning Wallets Are</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  For someone to sign in with Key-Rex, they need a Lightning wallet app on their phone or computer. These are free apps that work with Bitcoin's Lightning Network. Think of them like a digital wallet that can also prove your identity. Here are the most popular options your visitors might use:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 text-center">
                    <div className="text-4xl mb-4">🦉</div>
                    <h3 className="text-white font-semibold text-lg mb-2">Alby</h3>
                      <p className="text-white/400 text-sm mb-4">
                      A browser extension that works great for signing in on desktop computers.
                    </p>
                    <a
                      href="https://getalby.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Get Alby →
                    </a>
                  </Card>

                  <Card className="p-6 text-center">
                    <div className="text-4xl mb-4">🔥</div>
                    <h3 className="text-white font-semibold text-lg mb-2">Phoenix</h3>
                      <p className="text-white/400 text-sm mb-4">
                      A mobile app for iPhone and Android phones. Easy to use and set up.
                    </p>
                    <a
                      href="https://phoenix.acinq.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Get Phoenix →
                    </a>
                  </Card>

                  <Card className="p-6 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-white font-semibold text-lg mb-2">Zeus</h3>
                      <p className="text-white/400 text-sm mb-4">
                      A more advanced mobile app for users who want more control over their Lightning setup.
                    </p>
                    <a
                      href="https://zeusln.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Get Zeus →
                    </a>
                  </Card>
                </div>

                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 mt-6">
                  <p className="text-white/300 text-sm">
                    <strong className="text-white">Good to Know:</strong> All Lightning wallets are completely free to download and use. Your visitors can use whichever wallet they prefer—Key-Rex works with any wallet that supports the LNURL-auth standard.
                  </p>
                </div>
              </Card>
            </section>

            {/* Technical Details */}
            <section id="technical-details">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">Technical Details (For Developers)</h2>
                <p className="text-white/300 text-sm mb-4">
                  If you're technical and want to understand the underlying technology, here are the key details:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold mb-2">Protocol: LNURL-auth</h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      Key-Rex uses LNURL-auth, which is a standardized protocol for Lightning Network authentication. This ensures compatibility with all major Lightning wallets and follows established industry standards.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Cryptography: ECDSA secp256k1</h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      The authentication signatures use ECDSA secp256k1, which is the exact same cryptographic algorithm that secures Bitcoin transactions. This provides strong security guarantees without relying on passwords or centralized authentication systems.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">User Identifier: xpub (Extended Public Key)</h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      Each user is uniquely identified by their xpub (extended public key), which is derived from their Lightning wallet's public key. The xpub is deterministic (always the same for a given wallet) and persistent across sessions, making it ideal for user identification and account linking.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">No Personal Data Required</h3>
                    <p className="text-white/300 text-sm leading-relaxed">
                      The authentication process requires no email addresses, names, phone numbers, or any other personally identifiable information. Users authenticate purely through cryptographic proof of identity, which significantly reduces privacy compliance requirements (GDPR, CCPA, etc.).
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/requirements"
                    className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                  >
                    View Technical Requirements →
                  </Link>
                </div>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}

