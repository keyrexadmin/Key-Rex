'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import PageNavigation from '@/components/PageNavigation'
import Link from 'next/link'

export default function Docs() {
  // Organized navigation with logical grouping - matches content order
  const navItems = [
    { id: 'quick-start', label: 'Quick Start' },
    { id: 'prerequisites', label: 'Prerequisites' },
    { id: 'integration-checklist', label: 'Integration Checklist' },
    { id: 'integration-guide', label: 'Integration Guide' },
    { id: 'framework-examples', label: 'Framework Examples' },
    { id: 'react-example', label: '  → React' },
    { id: 'vue-example', label: '  → Vue' },
    { id: 'nextjs-example', label: '  → Next.js' },
    { id: 'html-example', label: '  → Plain HTML' },
    { id: 'backend-integration', label: 'Backend Integration' },
    { id: 'authentication-flow', label: 'Authentication Flow' },
    { id: 'api-reference', label: 'API Reference' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'best-practices', label: 'Best Practices' },
    { id: 'testing-debugging', label: 'Testing & Debugging' },
    { id: 'error-handling', label: 'Error Handling' },
    { id: 'account-linking', label: 'Account Linking' },
    { id: 'advanced-features', label: 'Advanced Features' },
    { id: 'use-cases', label: 'Common Use Cases' },
    { id: 'faq', label: 'FAQ' },
    { id: 'quick-reference', label: 'Quick Reference' },
  ]

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex flex-col lg:flex-row relative">
        {/* Sticky Navigation */}
        <div>
          <PageNavigation items={navItems} title="Documentation" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Documentation</h1>
              <p className="text-xl text-white/70 leading-relaxed">
                Complete guide to integrating Key-Rex authentication into your website
              </p>
              
              {/* Quick Links */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <a href="#quick-start" className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  🚀 Quick Start
                </a>
                <a href="#prerequisites" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/70 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  📋 Prerequisites
                </a>
                <a href="#integration-guide" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  📖 Integration Guide
                </a>
                <a href="#framework-examples" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  ⚛️ Framework Examples
                </a>
                <a href="#backend-integration" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  🔧 Backend Integration
                </a>
                <a href="#api-reference" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  📚 API Reference
                </a>
                <a href="#faq" className="bg-dark-700/50 hover:bg-dark-700/70 border border-dark-600/50 text-white/300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  ❓ FAQ
                </a>
              </div>
              
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-6">
                <p className="text-sm text-orange-200">
                  <strong>New to Key-Rex?</strong> <Link href="/" className="underline hover:text-orange-300">Sign in with your Lightning wallet and complete the setup wizard</Link> to get your integration code and access your personalized dashboard with account-specific examples.
                </p>
              </div>
            </div>

            {/* Quick Start Guide */}
            <section id="quick-start">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-semibold text-white mb-4">Quick Start Guide</h2>
                <p className="text-white/200 text-base leading-relaxed mb-6">
                  Get Key-Rex working on your website in just a few minutes. This guide covers the essential steps.
                </p>
                
                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Step 1: Get Your Integration Code</h3>
                    <ol className="list-decimal list-inside space-y-3 text-white/300">
                      <li>Sign in with your Lightning wallet and complete the setup wizard to access your dashboard (or <Link href="/" className="text-orange-400 hover:text-orange-300">create an account</Link> if you haven't)</li>
                      <li>Go to the "My Integration Code" tab in your dashboard</li>
                      <li>Copy the integration code provided</li>
                    </ol>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Step 2: Add Code to Your Website</h3>
                    <p className="text-white/200 text-base mb-4 leading-relaxed">Paste the integration code into your HTML, just before the closing <code className="bg-dark-900 px-1 rounded">&lt;/body&gt;</code> tag:</p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<body>
  <!-- Your website content -->
  
  <!-- Key-Rex Integration Code -->
  <script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
  <!-- Note: KeyRex.init() is optional - script auto-initializes when DOM is ready -->
  <script>KeyRex.init();</script>
</body>`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Step 3: Add and Verify Your Domain</h3>
                    <ol className="list-decimal list-inside space-y-3 text-white/200 text-base leading-relaxed">
                      <li>Go to the "Domains" tab in your dashboard</li>
                      <li>Add your website domain (e.g., <code className="bg-dark-900 px-1 rounded">example.com</code>)</li>
                      <li>Verify domain ownership by adding the DNS TXT record shown in the dashboard (production domains require verification)</li>
                      <li>Click "Verify" after adding the DNS record (wait 5-10 minutes for DNS propagation)</li>
                      <li>Add both www and non-www versions if you use both (each requires separate verification)</li>
                    </ol>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-orange-200">
                        <strong>Note:</strong> Test domains like <code className="bg-orange-600/30 px-1 rounded">localhost</code> and <code className="bg-orange-600/30 px-1 rounded">127.0.0.1</code> are automatically allowed for development and don't require verification.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Step 4: Set Up Backend Integration</h3>
                    <p className="text-white/300 mb-4">
                      When a user authenticates, Key-Rex will call your <code className="bg-dark-900 px-1 rounded">onSuccess</code> callback with their xpub (extended public key). You need to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Receive the xpub in your backend</li>
                      <li>Create a session for the user</li>
                      <li>Store the xpub as their user identifier</li>
                    </ul>
                    <p className="text-white/300 mt-4">
                      See the <a href="#backend-integration" className="text-orange-400 hover:text-orange-300">Backend Integration</a> section for detailed examples.
                    </p>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-orange-300 mb-2">✓ That's It!</h3>
                    <p className="text-orange-200 text-sm">
                      Your Key-Rex button should now appear on your website. Visitors can click it to sign in with their Lightning wallets. Continue reading for framework-specific examples and advanced configuration.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Prerequisites - NEW SECTION */}
            <section id="prerequisites">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Prerequisites</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  What you need before integrating Key-Rex into your website.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">1. Key-Rex Account</h3>
                    <p className="text-white/300 mb-4">
                      You need a Key-Rex account to get your integration code. <Link href="/" className="text-orange-400 hover:text-orange-300">Sign up</Link> for free - no credit card required.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Sign in with a compatible Lightning wallet</li>
                      <li>Complete the onboarding wizard</li>
                      <li>Get your unique Site ID from the dashboard</li>
                    </ul>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">2. Backend Server</h3>
                    <p className="text-white/300 mb-4">
                      Key-Rex requires a backend server to receive authentication data. You need:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>A server that can receive HTTP POST requests</li>
                      <li>Ability to create and manage user sessions</li>
                      <li>Database or storage for user records</li>
                      <li>CORS configured on your backend to allow requests from your frontend domain (Key-Rex handles its own CORS automatically)</li>
                    </ul>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-blue-200">
                        <strong>Options:</strong> Node.js/Express, Python/Flask, PHP, Ruby on Rails, serverless functions (Vercel, AWS Lambda, etc.), or any backend that can handle HTTP requests.
                      </p>
                      <p className="text-xs text-blue-200 mt-2">
                        <strong>Note:</strong> Key-Rex handles CORS for its own API endpoints automatically. The CORS requirement above is for your own backend endpoint that receives the xpub from your frontend.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">3. Website Domain</h3>
                    <p className="text-white/300 mb-4">
                      You need to know the domain(s) where you'll use Key-Rex:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Production domain (e.g., <code className="bg-dark-900 px-1 rounded">example.com</code>)</li>
                      <li>Both www and non-www versions if you use both</li>
                      <li>Any staging or test domains (or use auto-allowed test domains)</li>
                    </ul>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-orange-200">
                        <strong>Note:</strong> Test domains like <code className="bg-orange-600/30 px-1 rounded">localhost</code> and <code className="bg-orange-600/30 px-1 rounded">127.0.0.1</code> are automatically allowed for development - no need to add them or verify them.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">4. Lightning Wallet (For Testing)</h3>
                    <p className="text-white/300 mb-4">
                      To test your integration, you'll need a Lightning wallet:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li><strong>Desktop:</strong> A browser extension wallet (recommended for WebLN testing)</li>
                      <li><strong>Mobile:</strong> A mobile Lightning wallet app</li>
                      <li>Wallet must support LNURL-auth protocol</li>
                    </ul>
                    <div className="bg-dark-900/30 border border-dashed border-orange-500/30 rounded-lg p-3 mt-4 text-center">
                      <p className="text-white/60 text-sm font-medium">Featured Wallets — Coming Soon</p>
                      <p className="text-white/40 text-xs mt-1">Partner wallets will be showcased here</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-300 mb-2">⚠️ Important Requirements</h3>
                    <ul className="list-disc list-inside space-y-2 text-yellow-100 ml-4">
                      <li>Your website must have HTTPS in production (required for secure authentication)</li>
                      <li>Your backend must be able to handle CORS requests from your frontend domain</li>
                      <li>You must be able to modify your website's HTML to add the integration code</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {/* Integration Checklist */}
            <section id="integration-checklist">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Integration Checklist</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Use this checklist to ensure your integration is complete and working correctly.
                </p>
                
                <div className="space-y-3">
                  {[
                    { id: 1, text: 'Signed up for Key-Rex account and received Site ID' },
                    { id: 2, text: 'Added domain(s) to dashboard (Domains tab) and verified ownership' },
                    { id: 3, text: 'Integration code copied from dashboard' },
                    { id: 4, text: 'Code pasted on website (before closing </body> tag)' },
                    { id: 5, text: 'Script loads successfully (check browser Network tab)' },
                    { id: 6, text: 'Button appears on webpage' },
                    { id: 7, text: 'Button is clickable and shows wallet options' },
                    { id: 8, text: 'onSuccess callback set up to receive xpub' },
                    { id: 9, text: 'Backend endpoint created to handle xpub' },
                    { id: 10, text: 'Session management implemented' },
                    { id: 11, text: 'Tested authentication flow end-to-end' },
                    { id: 12, text: 'Tested on both desktop and mobile devices' },
                  ].map((step) => (
                    <div key={step.id} className="flex items-start gap-3 bg-dark-800/50 rounded-lg p-3 border border-dark-700">
                      <input
                        type="checkbox"
                        className="mt-1 w-5 h-5 text-orange-500 border-dark-600 rounded focus:ring-orange-500 bg-dark-800"
                      />
                      <label className="flex-1 text-white/200 text-sm cursor-pointer">
                        <span className="font-semibold text-white mr-2">{step.id}.</span>
                        {step.text}
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* Integration Guide */}
            <section id="integration-guide">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Integration Guide</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Detailed step-by-step guide for integrating Key-Rex into your website.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">1. Basic HTML Integration</h3>
                    <p className="text-white/300 mb-4">
                      The simplest way to add Key-Rex is to include the script tags in your HTML:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>
  
  <!-- Your website content -->
  
  <!-- Key-Rex Integration -->
  <script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
  <!-- Note: KeyRex.init() is optional - script auto-initializes when DOM is ready -->
  <script>KeyRex.init();</script>
</body>
</html>`}
                      </pre>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-yellow-200">
                        <strong>Important:</strong> Replace <code className="bg-yellow-600/30 px-1 rounded">YOUR_SITE_ID</code> with your actual Site ID from your dashboard. The script automatically initializes when the DOM is ready, but including <code className="bg-yellow-600/30 px-1 rounded">Key-Rex.init()</code> is recommended for explicit control.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">2. Set Up Success and Error Callbacks</h3>
                    <p className="text-white/300 mb-4">
                      You need to handle authentication success and errors. Set up callbacks before the script loads:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<!-- Set up callbacks BEFORE loading the script -->
<script>
  window.KeyRex = window.KeyRex || {};
  window.KeyRex.onSuccess = function(xpub) {
    console.log('User authenticated:', xpub);
    // Send xpub to your backend
    fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpub: xpub })
    })
    .then(response => response.json())
    .then(data => {
      // Redirect to dashboard or update UI
      window.location.href = '/dashboard';
    })
    .catch(error => {
      console.error('Auth error:', error);
    });
  };
  
  window.KeyRex.onError = function(error) {
    console.error('Key-Rex error:', error);
    alert('Authentication failed: ' + error.message);
  };
</script>

<!-- Then load the Key-Rex script -->
<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<script>KeyRex.init();</script>`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">3. Custom Container Placement</h3>
                    <p className="text-white/300 mb-4">
                      By default, the Key-Rex button is appended to the <code className="bg-dark-900 px-1 rounded">&lt;body&gt;</code>. To place it in a specific location, add an element with <code className="bg-dark-900 px-1 rounded">id="keyrex-container"</code>:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<div id="login-section">
  <h2>Sign In</h2>
  <div id="keyrex-container"></div>
  <!-- Key-Rex button will appear here -->
</div>

<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<script>KeyRex.init();</script>`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Framework Examples Section Header */}
            <div id="framework-examples" className="scroll-mt-24">
              <Card className="p-8 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Framework Examples</h2>
                <p className="text-white/300 leading-relaxed">
                  Choose your framework below to see a complete integration example. All examples follow the same pattern: set up callbacks, load the script, and handle the xpub in your backend.
                </p>
              </Card>
            </div>

            {/* Framework Examples - React */}
            <section id="react-example">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">React Integration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Example of integrating Key-Rex into a React application.
                </p>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`import { useEffect } from 'react';

function LoginPage() {
  useEffect(() => {
    // Set up callbacks
    window.KeyRex = window.KeyRex || {};
    window.KeyRex.onSuccess = function(xpub) {
      console.log('User authenticated:', xpub);
      // Handle authentication
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpub: xpub })
      })
      .then(response => response.json())
      .then(data => {
        window.location.href = '/dashboard';
      });
    };
    
    window.KeyRex.onError = function(error) {
      console.error('Auth error:', error);
    };
    
    // Load Key-Rex script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed?siteId=YOUR_SITE_ID';
    script.async = true;
    // Script auto-initializes when loaded
    document.body.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  return (
    <div>
      <h1>Login Page</h1>
      <div id="keyrex-container"></div>
    </div>
  );
}

export default LoginPage;`}
                  </pre>
                </div>
              </Card>
            </section>

            {/* Framework Examples - Vue */}
            <section id="vue-example">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Vue Integration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Example of integrating Key-Rex into a Vue application.
                </p>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<template>
  <div>
    <h1>Login Page</h1>
    <div id="keyrex-container"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  // Set up callbacks
  window.KeyRex = window.KeyRex || {};
  window.KeyRex.onSuccess = function(xpub) {
    console.log('User authenticated:', xpub);
    // Handle authentication
    fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpub: xpub })
    })
    .then(response => response.json())
    .then(data => {
      window.location.href = '/dashboard';
    });
  };
  
  window.KeyRex.onError = function(error) {
    console.error('Auth error:', error);
  };
  
  // Load Key-Rex script
  const script = document.createElement('script');
  script.src = 'https://yourdomain.com/embed?siteId=YOUR_SITE_ID';
  script.async = true;
  // Script auto-initializes when loaded
  document.body.appendChild(script);
});

onUnmounted(() => {
  // Cleanup
  const scripts = document.querySelectorAll('script[src*="embed"]');
  scripts.forEach(script => script.remove());
});
</script>`}
                  </pre>
                </div>
              </Card>
            </section>

            {/* Framework Examples - Next.js */}
            <section id="nextjs-example">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Next.js Integration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Example of integrating Key-Rex into a Next.js application (App Router).
                </p>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    // Set up callbacks
    window.KeyRex = window.KeyRex || {};
    window.KeyRex.onSuccess = function(xpub) {
      console.log('User authenticated:', xpub);
      // Handle authentication
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpub: xpub })
      })
      .then(response => response.json())
      .then(data => {
        window.location.href = '/dashboard';
      });
    };
    
    window.KeyRex.onError = function(error) {
      console.error('Auth error:', error);
    };
    
    // Load Key-Rex script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed?siteId=YOUR_SITE_ID';
    script.async = true;
    // Script auto-initializes when loaded
    document.body.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  return (
    <div>
      <h1>Login Page</h1>
      <div id="keyrex-container"></div>
    </div>
  );
}`}
                  </pre>
                </div>
              </Card>
            </section>

            {/* Framework Examples - Plain HTML */}
            <section id="html-example">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Plain HTML Integration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Simple HTML example for static websites or basic integrations.
                </p>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome</h1>
  
  <!-- Set up callbacks BEFORE loading script -->
  <script>
    window.KeyRex = window.KeyRex || {};
    window.KeyRex.onSuccess = function(xpub) {
      console.log('User authenticated:', xpub);
      // Send to your backend
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpub: xpub })
      })
      .then(response => response.json())
      .then(data => {
        window.location.href = '/dashboard';
      });
    };
    
    window.KeyRex.onError = function(error) {
      console.error('Auth error:', error);
      alert('Authentication failed');
    };
  </script>
  
  <!-- Load Key-Rex script -->
  <script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
  <!-- Note: KeyRex.init() is optional - script auto-initializes when DOM is ready -->
  <script>KeyRex.init();</script>
  
  <!-- Optional: Place button in specific location -->
  <div id="keyrex-container"></div>
</body>
</html>`}
                  </pre>
                </div>
              </Card>
            </section>

            {/* Backend Integration */}
            <section id="backend-integration">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Backend Integration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Your backend needs to receive the xpub and create a user session. Here are examples for common backend frameworks.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Node.js/Express Example</h3>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true }
}));

// Handle Key-Rex authentication callback
app.post('/api/auth/callback', (req, res) => {
  const { xpub } = req.body;
  
  if (!xpub) {
    return res.status(400).json({ error: 'Missing xpub' });
  }
  
  // Find or create user by xpub
  // In a real app, you'd query your database
  let user = findUserByXpub(xpub);
  
  if (!user) {
    // Create new user
    user = createUser(xpub);
  }
  
  // Create session
  req.session.userId = user.id;
  req.session.xpub = xpub;
  
  res.json({ 
    success: true, 
    user: { id: user.id, xpub: xpub } 
  });
});

function findUserByXpub(xpub) {
  // Query your database
  // Return user object or null
}

function createUser(xpub) {
  // Create new user in database
  // Return user object
}`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Python/Flask Example</h3>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`from flask import Flask, request, jsonify, session
from flask_session import Session

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

@app.route('/api/auth/callback', methods=['POST'])
def auth_callback():
    data = request.json
    xpub = data.get('xpub')
    
    if not xpub:
        return jsonify({'error': 'Missing xpub'}), 400
    
    # Find or create user by xpub
    user = find_user_by_xpub(xpub)
    
    if not user:
        user = create_user(xpub)
    
    # Create session
    session['user_id'] = user['id']
    session['xpub'] = xpub
    
    return jsonify({
        'success': True,
        'user': {'id': user['id'], 'xpub': xpub}
    })

def find_user_by_xpub(xpub):
    # Query your database
    # Return user dict or None
    pass

def create_user(xpub):
    # Create new user in database
    # Return user dict
    pass`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Database Schema Example</h3>
                    <p className="text-white/300 mb-4">
                      Here's a simple database schema for storing users:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  xpub VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Sessions table (if using database sessions)
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Authentication Flow - Moved here for better flow */}
            <section id="authentication-flow">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">How Authentication Works</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Understanding how Key-Rex authentication works helps you integrate it correctly. This section explains the technical flow - you can skip it if you just want to get started.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">WebLN (Browser Extension) Flow</h3>
                    <ol className="list-decimal list-inside space-y-3 text-white/300">
                      <li>User clicks Key-Rex button on your website</li>
                      <li>Script detects WebLN extension in browser</li>
                      <li>Extension prompts user to approve sign-in request</li>
                      <li>User approves in extension</li>
                      <li>Extension returns signature directly to script</li>
                      <li>Script calls your <code className="bg-dark-900 px-1 rounded">Key-Rex.onSuccess(xpub)</code> callback</li>
                      <li>Your code receives xpub and creates user session</li>
                    </ol>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-blue-200">
                        <strong>Best UX:</strong> This is the fastest flow - one click, instant authentication. Works on desktop browsers with WebLN extensions.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">QR Code Flow (Desktop Popup)</h3>
                    <ol className="list-decimal list-inside space-y-3 text-white/300">
                      <li>User clicks Key-Rex button on your website</li>
                      <li>No WebLN detected - script opens popup window with QR code</li>
                      <li>User scans QR code with mobile Lightning wallet</li>
                      <li>Wallet authenticates and calls Key-Rex callback server</li>
                      <li>Popup detects authentication via polling</li>
                      <li>Popup sends xpub to main window via postMessage</li>
                      <li>Script calls your <code className="bg-dark-900 px-1 rounded">Key-Rex.onSuccess(xpub)</code> callback</li>
                      <li>Your code receives xpub and creates user session</li>
                    </ol>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-yellow-200">
                        <strong>Note:</strong> If popup is blocked, script automatically falls back to full-page redirect (same as mobile flow).
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">QR Code Flow (Mobile Redirect)</h3>
                    <ol className="list-decimal list-inside space-y-3 text-white/300">
                      <li>User clicks Key-Rex button on mobile device</li>
                      <li>Script detects mobile device and uses full-page redirect</li>
                      <li>Page redirects to Key-Rex QR code page</li>
                      <li>User scans QR code with another device or switches to wallet app</li>
                      <li>Wallet authenticates and calls Key-Rex callback server</li>
                      <li>QR page detects authentication and redirects back to your site</li>
                      <li>Redirect includes xpub in URL parameter: <code className="bg-dark-900 px-1 rounded">?xpub=...</code></li>
                      <li>Script detects xpub in URL and calls your <code className="bg-dark-900 px-1 rounded">Key-Rex.onSuccess(xpub)</code> callback</li>
                      <li>URL parameter is automatically cleaned up</li>
                      <li>Your code receives xpub and creates user session</li>
                    </ol>
                  </div>
                </div>
              </Card>
            </section>

            {/* API Reference */}
            <section id="api-reference">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">API Reference</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Complete reference for the Key-Rex JavaScript API.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Key-Rex.init()</h3>
                    <p className="text-white/300 mb-4">
                      <strong>Description:</strong> Initializes the Key-Rex button. The script automatically calls this when the DOM is ready, but you can call it manually if needed.
                    </p>
                    <p className="text-white/300 mb-4">
                      <strong>Note:</strong> This is optional - the script auto-initializes when the DOM is ready. Including it explicitly doesn't hurt and can be useful for explicit control.
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`// Auto-initialization (recommended)
<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
// Script auto-initializes when DOM is ready

// Manual initialization (optional)
KeyRex.init();`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Key-Rex.onSuccess(xpub)</h3>
                    <p className="text-white/300 mb-4">
                      <strong>Description:</strong> Callback function called when authentication succeeds. Receives the user's xpub (extended public key) as a parameter.
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onSuccess = function(xpub) {
  console.log('User authenticated:', xpub);
  // Send xpub to your backend
  fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub })
  })
  .then(response => response.json())
  .then(data => {
    // Handle successful authentication
    window.location.href = '/dashboard';
  });
};`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Key-Rex.onError(error)</h3>
                    <p className="text-white/300 mb-4">
                      <strong>Description:</strong> Callback function called when authentication fails or an error occurs.
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onError = function(error) {
  console.error('Key-Rex error:', error);
  // Handle error (show message to user, etc.)
  alert('Authentication failed: ' + error.message);
};`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Configuration */}
            <section id="configuration">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Configuration</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Key-Rex configuration is managed server-side through your dashboard. Most settings are standardized for consistency.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Server-Managed Configuration</h3>
                    <p className="text-white/300 mb-4">
                      The following settings are managed in your dashboard and fetched automatically:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li><strong>Button Text:</strong> Standardized to "Sign in with Key-Rex"</li>
                      <li><strong>Footer Text:</strong> Standardized branding</li>
                      <li><strong>Featured Wallets:</strong> Partner wallet list (managed by admin)</li>
                      <li><strong>Integration Toggle:</strong> Enable/disable authentication across all domains</li>
                    </ul>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-blue-200">
                        <strong>Note:</strong> These settings are standardized to ensure consistent user experience. If you need custom branding, contact support for enterprise options.
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Container Placement</h3>
                    <p className="text-white/300 mb-4">
                      Control where the Key-Rex button appears by using a container element:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`<!-- Button will appear in this container -->
<div id="keyrex-container"></div>

<!-- If no container found, button is appended to <body> -->
<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<script>KeyRex.init();</script>`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Best Practices */}
            <section id="best-practices">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Best Practices</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Follow these best practices for a secure and reliable integration.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Security</h3>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Always validate xpub on your backend - never trust client-side data alone</li>
                      <li>Use HTTPS for all authentication requests</li>
                      <li>Implement proper session management with secure, HTTP-only cookies</li>
                      <li>Never store sensitive data using only xpub as identifier - use proper user IDs</li>
                    </ul>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">User Experience</h3>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Set up callbacks before loading the script to avoid race conditions</li>
                      <li>Provide clear error messages if authentication fails</li>
                      <li>Test on both desktop and mobile devices</li>
                      <li>Handle both WebLN and QR code flows gracefully</li>
                    </ul>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Performance</h3>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li>Load the script asynchronously to avoid blocking page render</li>
                      <li>Only include the script on pages that need authentication</li>
                      <li>Use container placement for better control over button location</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {/* Testing & Debugging */}
            <section id="testing-debugging">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Testing & Debugging</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Tips for testing your Key-Rex integration and debugging common issues.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Browser Console Commands</h3>
                    <p className="text-white/300 mb-4">Open browser Developer Tools (F12) and use these commands:</p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`// Check if KeyRex is loaded
KeyRex

// Check if button exists
document.getElementById('keyrex-button')

// Check for xpub in URL
new URLSearchParams(window.location.search).get('xpub')

// Check for cookies (Note: Key-Rex cookies are httpOnly and won't appear here)
// Use DevTools → Application → Cookies to view httpOnly cookies
document.cookie.split(';').filter(c => c.includes('keyrex'))

// Test popup blocking
window.open('about:blank', 'test', 'width=100,height=100')`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Common Issues</h3>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li><strong>Button doesn't appear:</strong> Check browser console for errors, verify script loads in Network tab</li>
                      <li><strong>Domain not authorized:</strong> Add your domain in the dashboard Domains tab and verify it via DNS TXT record</li>
                      <li><strong>onSuccess not called:</strong> Verify callback is set before script loads</li>
                      <li><strong>CORS errors:</strong> Configure your backend to allow requests from your frontend domain</li>
                    </ul>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Testing Checklist</h3>
                    <ol className="list-decimal list-inside space-y-2 text-white/300 ml-4">
                      <li>Test on desktop browser with a WebLN extension</li>
                      <li>Test on desktop browser without WebLN (should show QR popup)</li>
                      <li>Test on mobile device (should redirect to QR page)</li>
                      <li>Test with popup blocker enabled (should fallback to redirect)</li>
                      <li>Verify xpub is received in onSuccess callback</li>
                      <li>Verify backend receives xpub and creates session</li>
                      <li>Test session persistence across page reloads</li>
                    </ol>
                  </div>
                </div>
              </Card>
            </section>

            {/* Error Handling */}
            <section id="error-handling">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Error Handling</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  How to handle errors and provide good user experience when authentication fails.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Setting Up Error Callbacks</h3>
                    <p className="text-white/300 mb-4">
                      Always set up an error callback to handle authentication failures gracefully:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onError = function(error) {
  console.error('Key-Rex error:', error);
  
  // Handle specific error types
  if (error.message.includes('Invalid siteId')) {
    // Site ID is wrong - show message to developer
    console.error('Check your siteId in the integration code');
  } else if (error.message.includes('domain is not authorized') || error.message.includes('not authorized — add it')) {
    // Domain not added - show user-friendly message
    alert('This website is not configured for authentication. Please contact the website owner.');
  } else if (error.message.includes('disabled')) {
    // Integration disabled
    alert('Authentication is currently disabled. Please try again later.');
  } else if (error.message.includes('timed out')) {
    // Authentication timeout
    alert('Authentication timed out. Please try again.');
  } else {
    // Generic error
    alert('Authentication failed. Please try again or contact support.');
  }
};`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Common Error Messages</h3>
                    <div className="space-y-3">
                      {[
                        { error: '"Invalid siteId"', cause: 'Site ID in integration code is incorrect', fix: 'Copy the exact code from your dashboard' },
                        { error: '"This domain is not authorized — add it in your dashboard"', cause: 'Domain not added to dashboard or not verified', fix: 'Add your domain in the Domains tab and verify it via DNS TXT record' },
                        { error: '"Integration is disabled"', cause: 'Integration toggle is off', fix: 'Enable integration in dashboard' },
                        { error: '"Failed to load configuration"', cause: 'Config API request failed', fix: 'Check network connection and try again' },
                        { error: '"Authentication timed out"', cause: 'User took too long or wallet didn\'t respond', fix: 'Try authenticating again' },
                        { error: '"Invalid signature"', cause: 'Wallet signature verification failed', fix: 'Try a different wallet or restart current wallet' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                          <h4 className="text-base font-semibold text-red-400 mb-2 font-mono">{item.error}</h4>
                          <p className="text-sm text-white/300 mb-1"><strong>Cause:</strong> {item.cause}</p>
                          <p className="text-sm text-white/200"><strong>Fix:</strong> {item.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">User-Friendly Error Messages</h3>
                    <p className="text-white/300 mb-4">
                      Show user-friendly messages instead of technical errors:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onError = function(error) {
  // Map technical errors to user-friendly messages
  const userMessages = {
    'Invalid siteId': 'This website is not properly configured. Please contact support.',
    'domain is not authorized': 'This website is not authorized for authentication. Please contact the website owner.',
    'not authorized — add it': 'This website is not authorized for authentication. Please contact the website owner.',
    'disabled': 'Authentication is temporarily unavailable. Please try again later.',
    'timed out': 'Authentication took too long. Please try again.',
    'Invalid signature': 'Authentication failed. Please try again with your wallet.',
  };
  
  // Find matching message or use generic
  let message = 'Authentication failed. Please try again.';
  for (const [key, value] of Object.entries(userMessages)) {
    if (error.message.includes(key)) {
      message = value;
      break;
    }
  }
  
  // Show to user (customize based on your UI)
  showNotification(message, 'error');
};`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Advanced Features */}
            <section id="advanced-features">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Advanced Features</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Advanced features and customization options.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">postMessage API</h3>
                    <p className="text-white/300 mb-4">
                      On desktop, the popup window communicates with the main window using postMessage. You can listen for these messages:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                      <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'keyrex-auth-success') {
    const xpub = event.data.xpub;
    // Handle authentication
  } else if (event.data && event.data.type === 'keyrex-auth-error') {
    const error = event.data.error;
    // Handle error
  } else if (event.data && event.data.type === 'keyrex-popup-closed') {
    // User closed the popup without completing authentication
  }
});`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">xpub Retrieval Methods</h3>
                    <p className="text-white/300 mb-4">
                      The xpub can be delivered in multiple ways:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
                      <li><strong>URL Parameters:</strong> Mobile/redirect flow includes <code className="bg-dark-900 px-1 rounded">?xpub=...</code> in URL</li>
                      <li><strong>postMessage:</strong> Desktop popup sends xpub via postMessage</li>
                      <li><strong>Cookies:</strong> Fallback method using cookies (automatically cleaned up)</li>
                    </ul>
                    <p className="text-white/300 mt-4">
                      The Key-Rex script handles all these methods automatically and calls your <code className="bg-dark-900 px-1 rounded">onSuccess</code> callback with the xpub.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Account Linking */}
            <section id="account-linking">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Account Linking & User Management</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  How to link Key-Rex authentication to existing user accounts.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Linking to Existing Accounts</h3>
                    <p className="text-white/300 mb-4">
                      If you already have user accounts, you can link Key-Rex authentication to them:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-white/300 ml-4">
                      <li>User signs in with existing method (email/password, etc.)</li>
                      <li>User clicks "Link Lightning Wallet" button</li>
                      <li>User authenticates with Key-Rex</li>
                      <li>Store xpub in user's account record</li>
                      <li>Future sign-ins can use either method</li>
                    </ol>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Creating New Accounts</h3>
                    <p className="text-white/300 mb-4">
                      For new users signing in with Key-Rex:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-white/300 ml-4">
                      <li>User clicks Key-Rex button and authenticates</li>
                      <li>Your backend receives xpub</li>
                      <li>Check if user exists by xpub</li>
                      <li>If not, create new user account with xpub</li>
                      <li>Create session and redirect to dashboard</li>
                    </ol>
                  </div>
                </div>
              </Card>
            </section>

            {/* Common Use Cases */}
            <section id="use-cases">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Common Use Cases</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Examples of how Key-Rex can be used in different scenarios.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Standalone Authentication</h3>
                    <p className="text-white/300">
                      Use Key-Rex as the only authentication method. Users sign in exclusively with Lightning wallets.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Alternative Authentication</h3>
                    <p className="text-white/300">
                      Offer Key-Rex alongside traditional authentication (email/password). Users can choose their preferred method.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Account Linking</h3>
                    <p className="text-white/300">
                      Allow existing users to link their Lightning wallet to their account for faster future sign-ins.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* FAQ */}
            <section id="faq">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Common questions about Key-Rex integration.
                </p>

                <div className="space-y-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-3">Do I need to call Key-Rex.init()?</h3>
                    <p className="text-white/300">
                      No, it's optional. The script automatically initializes when the DOM is ready. However, including it explicitly is recommended for better control and compatibility with some frameworks.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-3">Can I customize the button appearance?</h3>
                    <p className="text-white/300">
                      The button appearance is standardized for consistency. If you need custom branding, contact support for enterprise options.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-3">What if a user doesn't have a Lightning wallet?</h3>
                    <p className="text-white/300">
                      Users need a Lightning wallet to use Key-Rex. You can provide links to download compatible wallets or offer alternative authentication methods alongside Key-Rex.
                    </p>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-xl font-semibold text-white mb-3">Is the xpub unique per user?</h3>
                    <p className="text-white/300">
                      Yes, each Lightning wallet has a unique xpub. You can use it as a user identifier, but it's recommended to create your own user IDs and store the xpub as a linked identifier.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Quick Reference */}
            <section id="quick-reference">
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">Quick Reference</h2>
                <p className="text-white/300 leading-relaxed mb-6">
                  Quick reference guide for common tasks.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-lg font-semibold text-white mb-3">Basic Integration</h3>
                    <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                      <pre className="text-xs text-white/200 font-mono whitespace-pre-wrap break-words">
{`<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<script>KeyRex.init();</script>`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-lg font-semibold text-white mb-3">With Callbacks</h3>
                    <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                      <pre className="text-xs text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onSuccess = (xpub) => {
  // Handle success
};
window.KeyRex.onError = (error) => {
  // Handle error
};`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-lg font-semibold text-white mb-3">Container Placement</h3>
                    <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                      <pre className="text-xs text-white/200 font-mono whitespace-pre-wrap break-words">
{`<div id="keyrex-container"></div>`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
                    <h3 className="text-lg font-semibold text-white mb-3">Backend Endpoint</h3>
                    <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                      <pre className="text-xs text-white/200 font-mono whitespace-pre-wrap break-words">
{`POST /api/auth/callback
Body: { xpub: "xpub_..." }`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Footer CTA */}
            <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 border-orange-500/30 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-white/300 mb-6">
                Sign in with your Lightning wallet and complete the setup wizard to get your integration code and access your personalized dashboard.
              </p>
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold text-lg py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Get Your Integration Code
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

