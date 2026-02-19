import Layout from '@/components/Layout'
import Card from '@/components/Card'
import PageNavigation from '@/components/PageNavigation'
import Link from 'next/link'

export default function OpenSource() {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'repository', label: 'Repository & License' },
    { id: 'license', label: 'License' },
    { id: 'what-open', label: 'What Is Open Source in Key-Rex?' },
    { id: 'data-collection', label: 'Data Collection & Privacy' },
    { id: 'code-map', label: 'Where Things Live in the Code' },
    { id: 'self-hosting', label: 'Running Key-Rex Yourself' },
    { id: 'security', label: 'Security & Vulnerabilities' },
    { id: 'contributing', label: 'Contributing & Reporting Issues' },
  ]

  const codeAreas = [
    {
      category: 'Core App & Public Pages',
      items: [
        {
          path: 'app/page.tsx',
          description:
            'Homepage and main marketing content, including the Key-Rex button preview and onboarding entry points.',
        },
        {
          path: 'app/faq/page.tsx',
          description: 'Frequently Asked Questions with plain-language explanations for website owners.',
        },
        {
          path: 'app/support/page.tsx',
          description: 'Combined support page with service availability, support model, data retention/privacy, custom solutions, and contact form.',
        },
        {
          path: 'app/how-it-works/page.tsx',
          description: 'Explains how Lightning wallet authentication works and what is required to integrate Key-Rex.',
        },
        {
          path: 'app/requirements/page.tsx',
          description: 'Technical requirements for using Key-Rex on a website (backend, domains, HTTPS, etc.).',
        },
        {
          path: 'app/why-bitpass/page.tsx',
          description: 'Why Key-Rex exists, what makes it different, and how it fits Bitcoin-first companies.',
        },
        {
          path: 'app/for-wallets/page.tsx',
          description: 'Wallet Partnerships page for Lightning wallet providers who want to integrate with Key-Rex.',
        },
        {
          path: 'app/docs/page.tsx',
          description: 'Developer documentation and integration guide with quick start, framework examples, API reference, and troubleshooting.',
        },
      ],
    },
    {
      category: 'Dashboard & Admin',
      items: [
        {
          path: 'app/dashboard/page.tsx',
          description:
            'Main user dashboard: integration code, domains, analytics, troubleshooting, documentation, and settings.',
        },
        {
          path: 'app/admin/login/page.tsx',
          description: 'Admin login using LNURL-auth for the Key-Rex administrator.',
        },
        {
          path: 'app/admin/dashboard/page.tsx',
          description:
            'Admin dashboard for system-wide analytics, user management, contact submissions, and featured wallets.',
        },
        {
          path: 'app/onboarding/page.tsx',
          description: 'Multi-step onboarding wizard for new Key-Rex customers, guiding them through account setup and first integration.',
        },
      ],
    },
    {
      category: 'Authentication & Embed',
      items: [
        {
          path: 'components/LoginButton.tsx',
          description: 'Reusable login button that initiates LNURL-auth via WebLN or QR code.',
        },
        {
          path: 'app/embed/route.ts',
          description:
            'Serves the embeddable JavaScript for the Key-Rex button, including verified domain validation and branding rules.',
        },
        {
          path: 'app/embed/qr/page.tsx',
          description: 'QR-code-based sign-in flow for users on mobile wallets or without WebLN.',
        },
        {
          path: 'app/auth/success/page.tsx',
          description: 'Post-authentication success page that receives the xpub from the auth flow and redirects the user back to the client site.',
        },
        {
          path: 'app/api/auth/callback/route.ts',
          description: 'LNURL-auth callback handler that verifies signatures and derives a deterministic xpub identifier.',
        },
        {
          path: 'app/api/verify/route.ts',
          description:
            'Verifies each login, enforces verified domain checks (only verified domains can authenticate), records analytics, and respects integration shutdown.',
        },
      ],
    },
    {
      category: 'APIs & Storage',
      items: [
        {
          path: 'app/api/user/route.ts',
          description: 'Returns the current authenticated Key-Rex account (website owner) based on signed cookies.',
        },
        {
          path: 'app/api/domains/route.ts',
          description: 'Create, update, and delete allowed domains for a Key-Rex account. Manages domain verification status (pending, verified, failed).',
        },
        {
          path: 'app/api/domains/verify/route.ts',
          description: 'Verifies domain ownership by checking DNS TXT records. Production domains require verification before authentication works.',
        },
        {
          path: 'app/api/embed/config/route.ts',
          description: 'Provides configuration for the embed script and live previews, including featured wallets.',
        },
        {
          path: 'app/api/contact/route.ts',
          description:
            'Stores contact form submissions in the database and captures basic metadata for support.',
        },
        {
          path: 'app/api/admin/*',
          description:
            'Admin-only APIs for authentication, system stats, users, contact submissions, and wallet management.',
        },
        {
          path: 'lib/storage.ts',
          description:
            'PostgreSQL storage layer using Prisma ORM for users, domains, analytics, and contact submissions. All functions are async and return Promises.',
        },
        {
          path: 'lib/db.ts',
          description: 'Prisma database client singleton with connection pooling for serverless, retry logic for transient errors, and Map/Set to JSON serialization helpers.',
        },
        {
          path: 'prisma/schema.prisma',
          description: 'PostgreSQL database schema defining all models: User, Domain, UsageStats, ActivityLog, AuthSession, FeaturedWallet, and ContactSubmission.',
        },
        {
          path: 'types/index.ts',
          description: 'Shared TypeScript types for users, analytics, activity logs, and admin data.',
        },
      ],
    },
    {
      category: 'Security & Utilities',
      items: [
        {
          path: 'lib/auth.ts',
          description: 'Low-level LNURL-auth helpers: signature verification and deterministic xpub derivation.',
        },
        {
          path: 'lib/admin-auth.ts',
          description: 'Admin-only authentication helpers that check the configured ADMIN_XPUB.',
        },
        {
          path: 'lib/utils.ts',
          description: 'Utility helpers including device/wallet detection used for analytics, domain validation, and verification token generation.',
        },
        {
          path: 'lib/domain-verification.ts',
          description: 'DNS TXT record lookup and domain verification logic. Checks for keyrex-verification tokens in domain DNS records.',
        },
        {
          path: 'lib/lnurl.ts',
          description: 'LNURL bech32 encoding and decoding used to generate Lightning authentication challenge URLs.',
        },
        {
          path: 'lib/cors.ts',
          description: 'Cross-origin request validation for the embed script, checking request origins against allowed domains.',
        },
        {
          path: 'lib/rate-limit.ts',
          description: 'Rate limiting middleware to protect API endpoints from abuse.',
        },
      ],
    },
    {
      category: 'Configuration & Meta',
      items: [
        {
          path: 'package.json',
          description: 'Project dependencies and scripts (Next.js, React, Tailwind, TypeScript, analytics libraries, etc.).',
        },
        {
          path: 'tsconfig.json',
          description: 'TypeScript configuration for the project.',
        },
        {
          path: 'tailwind.config.ts',
          description: 'Tailwind CSS theme and utility configuration.',
        },
        {
          path: 'next.config.js',
          description: 'Next.js configuration.',
        },
        {
          path: 'LICENSE',
          description: 'MIT License text for Key-Rex.',
        },
        {
          path: 'README.md',
          description: 'High-level project overview and development setup instructions.',
        },
      ],
    },
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
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Open Source</h1>
              <p className="text-xl text-white/200 leading-relaxed">
                A transparent, MIT-licensed Lightning login system you can read, run, and adapt.
              </p>
            </div>

            {/* Overview */}
            <div id="overview" className="space-y-4 scroll-mt-24">
              <Card className="p-6 border-2 border-orange-500/30 bg-dark-200/90">
                <h2 className="text-2xl font-semibold text-white mb-3">What This Page Is For</h2>
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  This page is here to give you a clear, non-technical-first overview of how the Key-Rex codebase is structured, what is
                  actually open source, and what kind of data the system uses. If you are a developer, you can drill into the file and
                  directory references. If you are less technical, you can still get a high-level understanding of how things work and where
                  to look if your team needs more detail.
                </p>
                <p className="text-white/200 text-base leading-relaxed">
                  Everything described here reflects the current implementation of Key-Rex (including the admin dashboard, analytics,
                  documentation, and public pages). Outdated parts of the earlier prototype (like the original onboarding flow and old
                  subscription system) have been removed from both the product and this page.
                </p>
              </Card>
            </div>

            {/* Repository & License */}
            <div id="repository" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">Repository & License</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-orange-500/30">
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  The complete Key-Rex source code is available in our public repository. All code is released under the MIT License, which
                  means you can use, modify, and distribute it freely.
                </p>
                <div className="space-y-4">
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">Source Code Repository</h3>
                    <p className="text-white/200 text-xs mb-2 leading-relaxed">
                      The full Key-Rex codebase is available on GitHub. You can browse the code, review the implementation, fork it for your
                      own use, or contribute improvements.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                      <p className="text-yellow-200 text-xs">
                        <strong>Note:</strong> Repository link will be added when the GitHub repository is created. For now, the source code
                        is available through the hosted Key-Rex service.
                      </p>
                    </div>
                    {/* Placeholder for repository link - will be updated when GitHub repo is created */}
                    {/* <a
                      href="https://github.com/yourusername/keyrex"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium text-sm mt-2"
                    >
                      <span>View on GitHub</span>
                      <span>→</span>
                    </a> */}
                  </div>
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">License File</h3>
                    <p className="text-white/200 text-xs mb-2 leading-relaxed">
                      The complete MIT License text is included in the <code className="bg-dark-800 px-1 rounded">LICENSE</code> file in the
                      repository root. Once the repository is available, you can view it directly there.
                    </p>
                    <p className="text-white/200 text-xs leading-relaxed">
                      The license grants you permission to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
                      the Software, subject to including the copyright notice and license text in any redistributed copies.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* License */}
            <div id="license" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">License</h2>
              <Card className="p-6 border-l-4 border-orange-500 bg-dark-200/90">
                <p className="text-white/200 mb-2">
                  <strong>Key-Rex is released under the MIT License.</strong>
                </p>
                <p className="text-white/200 text-base leading-relaxed mb-2">
                  In practical terms, MIT means you can:
                </p>
                <ul className="list-disc list-inside text-white/200 text-base space-y-1 mb-2 leading-relaxed">
                  <li>Use the code in your own projects (commercial or non-commercial)</li>
                  <li>Modify it to fit your needs</li>
                  <li>Fork it, host it yourself, or build your own version</li>
                  <li>Bundle it into a broader product you sell</li>
                </ul>
                <p className="text-white/200 text-base leading-relaxed mb-2">
                  The main requirement is that if you redistribute the code (for example, in your own open source project or product), you
                  keep the original license text and copyright notice.
                </p>
                <p className="text-white/200 text-base leading-relaxed">
                  You are not required to give Key-Rex credit when you use the code, but it&apos;s appreciated if you do.
                </p>
              </Card>
            </div>

            {/* What Is Open Source in Key-Rex? */}
            <div id="what-open" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">What Is Open Source in Key-Rex?</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-orange-500/30">
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  Key-Rex is designed as a fully open-source application. The same code that powers the public website, customer dashboard,
                  admin dashboard, and embed script is available in this repository.
                </p>
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  That means you (or your developers) can:
                </p>
                <ul className="list-disc list-inside text-white/300 text-sm space-y-1 mb-3">
                  <li>Inspect all authentication logic (including LNURL-auth and signature checks)</li>
                  <li>Review how domains, analytics, and settings are stored and used</li>
                  <li>See exactly what data is collected and how it flows through the system</li>
                  <li>Understand the admin tools and how they aggregate system-wide metrics</li>
                </ul>
                <p className="text-white/200 text-base leading-relaxed">
                  There are no hidden proprietary services, closed-source “black box” enforcement modules, or secret tracking libraries
                  injected at runtime. When in doubt, you can always search the code under the <code className="bg-dark-900 px-1 rounded">app/</code>,{' '}
                  <code className="bg-dark-900 px-1 rounded">components/</code>, and <code className="bg-dark-900 px-1 rounded">lib/</code> directories to see
                  exactly how something works.
                </p>
              </Card>
            </div>

            {/* Data Collection & Privacy */}
            <div id="data-collection" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">Data Collection & Privacy</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-dark-700/60">
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  This section focuses on what the <strong>Key-Rex service itself</strong> uses in order to run. For a more policy-focused
                  explanation, see the{' '}
                  <Link href="/support#data-retention" className="text-orange-400 hover:text-orange-300 underline">
                    Support
                  </Link>{' '}
                  page. Here we focus on how it shows up in the code.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">
                      What Key-Rex Does <span className="underline">Not</span> Track for Your Visitors
                    </h3>
                    <ul className="list-disc list-inside text-white/300 text-xs space-y-1">
                      <li>No email addresses or names from your end users</li>
                      <li>No marketing pixels or behavioral tracking scripts</li>
                      <li>No browser fingerprinting or device IDs for visitors</li>
                      <li>No IP address storage for your end users&apos; sign-ins</li>
                    </ul>
                  </div>
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">
                      What Key-Rex <span className="underline">Does</span> Use
                    </h3>
                    <ul className="list-disc list-inside text-white/300 text-xs space-y-1">
                      <li>
                        <strong>xpub (extended public identifier)</strong> – a deterministic identifier derived from a wallet&apos;s public
                        key, used as the &quot;username&quot; for authentication.
                      </li>
                      <li>
                        <strong>Site ID</strong> – a unique ID that ties your Key-Rex account to the embed script on your site.
                      </li>
                      <li>
                        <strong>Allowed domains and verification status</strong> – the list of domains that are permitted to use your Key-Rex integration. Production domains require DNS TXT record verification to prove ownership before authentication works. Test domains (localhost, *.test, staging.*) are automatically verified.
                      </li>
                      <li>
                        <strong>Analytics metrics</strong> – counts of logins and high-level patterns (e.g., per domain, per wallet type,
                        browser/device categories, day-of-week, new vs returning).
                      </li>
                      <li>
                        <strong>Account-owner metadata</strong> – when you accept the disclaimer or submit the contact form, the code
                        captures IP address and user agent for audit/support purposes.
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="text-white/300 text-xs mt-4">
                  All of this behavior is implemented in first-party code under <code className="bg-dark-900 px-1 rounded">lib/storage.ts</code>, <code className="bg-dark-900 px-1 rounded">lib/db.ts</code>, and
                  various API routes in <code className="bg-dark-900 px-1 rounded">app/api/</code>. There are no hidden third-party analytics SDKs.
                </p>
              </Card>
            </div>

            {/* Where Things Live in the Code */}
            <div id="code-map" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">Where Things Live in the Code</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-orange-500/30">
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  If you (or your developers) want to understand or audit a specific part of Key-Rex, this high-level map shows where to
                  start. It is not an exhaustive per-file listing, but it covers the main areas most people look for.
                </p>
                <div className="space-y-6">
                  {codeAreas.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-lg font-semibold text-white mb-2">{group.category}</h3>
                      <div className="space-y-2">
                        {group.items.map((item, idx) => (
                          <Card key={idx} className="p-3 border-l-4 border-orange-500 bg-dark-900/70">
                            <div className="font-mono text-xs text-orange-300">{item.path}</div>
                            <div className="text-white/300 text-xs mt-1">{item.description}</div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Running Key-Rex Yourself */}
            <div id="self-hosting" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">Running Key-Rex Yourself</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-dark-700/60">
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  Many open source projects include a &quot;how to run this yourself&quot; section. Key-Rex is no different – you can run the
                  full stack locally or deploy your own instance if you want complete control.
                </p>
                <ol className="list-decimal list-inside text-white/300 text-sm space-y-1 mb-3">
                  <li>Clone the repository and install dependencies (see <code className="bg-dark-900 px-1 rounded">README.md</code>).</li>
                  <li>Run the development server (usually <code className="bg-dark-900 px-1 rounded">npm run dev</code>).</li>
                  <li>Set any required environment variables (for example, <code className="bg-dark-900 px-1 rounded">ADMIN_XPUB</code> for admin login).</li>
                  <li>
                    In production, set <code className="bg-dark-900 px-1 rounded">DATABASE_URL</code> to your PostgreSQL connection string and run{' '}
                    <code className="bg-dark-900 px-1 rounded">npx prisma migrate deploy</code> to initialize the database.
                  </li>
                  <li>Deploy to your preferred host (Vercel, your own infrastructure, etc.).</li>
                </ol>
                <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-4 mt-4">
                  <h3 className="text-orange-400 font-semibold mb-2 text-sm">⚠️ Important: Known Limitations for Production Use</h3>
                  <p className="text-white/300 text-xs mb-2">
                    The current implementation includes some simplified implementations that work for development and basic use, but should be enhanced for production deployments:
                  </p>
                  <ul className="text-white/300 text-xs space-y-1 ml-4 list-disc mb-2">
                    <li><strong>Database:</strong> Uses PostgreSQL via Prisma ORM. Connection pooling may need tuning for serverless environments (e.g., Vercel). See <code className="bg-dark-900 px-1 rounded">lib/db.ts</code> for the current pooling configuration.</li>
                    <li><strong>Signature Verification:</strong> Uses production-grade libraries (<code className="bg-dark-900 px-1 rounded">@noble/secp256k1</code> and <code className="bg-dark-900 px-1 rounded">elliptic</code>) with support for both compact and DER-encoded signatures. Consider reducing verbose debug logging in <code className="bg-dark-900 px-1 rounded">lib/auth.ts</code> for production.</li>
                    <li><strong>xpub Derivation:</strong> Uses a simplified derivation method. For production, consider implementing proper HD wallet derivation if you need to link multiple keys from the same wallet.</li>
                  </ul>
                  <p className="text-white/400 text-xs">
                    These limitations are documented in <code className="bg-dark-900 px-1 rounded">DEPLOYMENT.md</code>. Review and address these before deploying to production.
                  </p>
                </div>
                <p className="text-white/300 text-xs mt-4">
                  Self-hosting is optional and requires engineering time. For most sites, using the hosted Key-Rex service is simpler, but
                  the open source code is there if you ever need to move or customize.
                </p>
              </Card>
            </div>

            {/* Security & Vulnerabilities */}
            <div id="security" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">Security & Vulnerabilities</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-red-500/30">
                <p className="text-white/200 text-base leading-relaxed mb-4">
                  Security is a priority for Key-Rex. If you discover a security vulnerability, we appreciate responsible disclosure so we can
                  address it before it becomes public.
                </p>
                <div className="space-y-4">
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">Security Policy</h3>
                    <p className="text-white/200 text-xs mb-2 leading-relaxed">
                      A detailed security policy is available in the <code className="bg-dark-800 px-1 rounded">SECURITY.md</code> file in the repository root. This file follows GitHub&apos;s standard security policy format and provides complete details on how to report vulnerabilities.
                    </p>
                    <p className="text-white/300 text-xs mb-3">
                      If you find a security vulnerability in Key-Rex, please report it privately rather than opening a public issue. This
                      gives us time to fix the issue before it&apos;s disclosed publicly.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                      <p className="text-red-200 text-xs mb-2">
                        <strong>Security Email:</strong> Please use the contact form on our website with &quot;SECURITY&quot; in the subject
                        line, or email us directly at the address below.
                      </p>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-2">
                        <p className="text-yellow-200 text-xs">
                          <strong>Note:</strong> Security email address will be added when available. For now, please use the contact form
                          with &quot;SECURITY&quot; in the subject line.
                        </p>
                      </div>
                      {/* Placeholder for security email - will be updated when email is set up */}
                      {/* <p className="text-white/300 text-xs mt-2">
                        Email: <a href="mailto:security@keyrex.com" className="text-orange-400 hover:text-orange-300 underline">security@keyrex.com</a>
                      </p> */}
                    </div>
                  </div>
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">What to Include in Your Report</h3>
                    <ul className="list-disc list-inside text-white/300 text-xs space-y-1">
                      <li>Description of the vulnerability and potential impact</li>
                      <li>Steps to reproduce the issue (if applicable)</li>
                      <li>Affected versions or components</li>
                      <li>Suggested fix (if you have one)</li>
                    </ul>
                  </div>
                  <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                    <h3 className="text-white font-semibold mb-2 text-sm">Our Commitment</h3>
                    <p className="text-white/200 text-xs leading-relaxed">
                      We commit to acknowledging receipt of security reports within 48 hours and providing an initial assessment within 7
                      days. Critical vulnerabilities will be prioritized for immediate attention. We will work with you to coordinate public
                      disclosure after the issue is resolved.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contributing & Reporting Issues */}
            <div id="contributing" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-3">Contributing & Reporting Issues</h2>
              <Card className="p-6 bg-dark-800/70 border-2 border-dark-700/60">
                <p className="text-white/200 text-base leading-relaxed mb-3">
                  At this stage, Key-Rex is focused on being a reliable, understandable reference implementation. Contribution guidelines are available in the <code className="bg-dark-900 px-1 rounded">CONTRIBUTING.md</code> file in the repository (when available). If you are interested in contributing, auditing, or suggesting improvements, you can:
                </p>
                <ul className="list-disc list-inside text-white/300 text-sm space-y-1 mb-3">
                  <li>Review the public code and raise questions through the contact form on the website.</li>
                  <li>Fork the project and maintain your own internal version if you have very specific needs.</li>
                  <li>Share feedback on documentation gaps or confusing areas so the public pages and dashboard docs can be improved.</li>
                  <li>Check the <code className="bg-dark-900 px-1 rounded">CHANGELOG.md</code> file for version history and recent changes.</li>
                </ul>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                  <h4 className="text-blue-400 font-semibold mb-2 text-xs">Third-Party Dependencies</h4>
                  <p className="text-white/300 text-xs mb-2">
                    Key-Rex uses several open source libraries. Key dependencies include:
                  </p>
                  <ul className="text-white/300 text-xs space-y-1 ml-4 list-disc">
                    <li><strong>Next.js & React</strong> - Web framework and UI library</li>
                    <li><strong>Prisma & @prisma/client</strong> - Database ORM and PostgreSQL access layer</li>
                    <li><strong>@noble/secp256k1</strong> - Cryptographic signature verification</li>
                    <li><strong>bech32</strong> - LNURL encoding/decoding</li>
                    <li><strong>qrcode</strong> - QR code generation for mobile authentication</li>
                  </ul>
                  <p className="text-white/400 text-xs mt-2">
                    See <code className="bg-dark-900 px-1 rounded">package.json</code> for the complete list of dependencies and their licenses.
                  </p>
                </div>
                <p className="text-white/300 text-xs mt-4">
                  Over time, more formal contribution guidelines (pull requests, coding standards, security disclosure process) can be added.
                  For now, the priority is clarity and auditability for people deciding whether to trust Key-Rex as their Lightning login
                  layer.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}


