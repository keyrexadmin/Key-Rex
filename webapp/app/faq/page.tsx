'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import PageNavigation from '@/components/PageNavigation'

export default function FAQ() {
  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How long does it take to set up?',
          a: 'Setup takes just a few minutes. You\'ll need a Lightning wallet, sign in to create your account, add and verify your domain (requires adding a DNS TXT record), and copy the integration code to your website. Domain verification can take 5-10 minutes for DNS propagation. Test domains work immediately without verification. The entire process typically takes less than 15 minutes including verification.',
        },
        {
          q: 'Do I need a backend server?',
          a: 'Yes, you\'ll need a backend server or serverless function for Key-Rex to work. Adding the button to your website is easy (just two lines of code), but you need a backend to actually sign visitors in. Think of it like this: the button is the doorbell, but you need someone (your backend) to answer the door. See our Documentation tab in the dashboard for code examples that show you exactly how to set this up.',
        },
        {
          q: 'What if I only have a static site?',
          a: 'Even if your website is completely static (like GitHub Pages, Netlify static, or Vercel static), you can still use Key-Rex! You\'ll just need to add a serverless function to handle the sign-in process. Many hosting providers make this easy to set up, and we provide step-by-step examples for Vercel Functions, AWS Lambda, and other platforms in the dashboard documentation.',
        },
        {
          q: 'Can I use Key-Rex on a completely static website with no backend?',
          a: 'Not without adding a serverless function. Key-Rex needs somewhere to send the sign-in information when someone clicks the button. If you have a completely static site with no backend at all, you\'ll need to add a serverless function (which many hosting providers make easy). The good news is that even "static" sites can use serverless functions—they\'re still considered a backend, just one that runs on-demand. We provide examples for Vercel Functions, AWS Lambda, Netlify Functions, and other platforms in the dashboard documentation.',
        },
        {
          q: 'Do you offer white-label or custom solutions?',
          a: 'If you\'re interested in white-label branding (removing Key-Rex references), priority support with SLA commitments, or custom integrations tailored to your infrastructure, we\'re open to discussing paid custom solutions. Contact us through our Support page to discuss your requirements and we can work together to determine if we can set something up that meets your needs.',
        },
      ],
    },
    {
      category: 'User Experience',
      questions: [
        {
          q: 'What if my visitors don\'t have Lightning wallets?',
          a: 'If someone doesn\'t have a Lightning wallet, they won\'t be able to use Key-Rex to sign in. Key-Rex can work as a standalone sign-in option, and we recognize that many websites already have existing login processes. In these cases, Key-Rex works great as an alternative authentication method, allowing you to offer both options simultaneously so visitors can choose what works for them. Compatible Lightning wallets are free to download.',
        },
        {
          q: 'Can I use this alongside email/password authentication?',
          a: 'Absolutely! Key-Rex can coexist with any other authentication method. Many websites offer multiple sign-in options, letting users choose their preferred method.',
        },
        {
          q: 'What browsers and devices are supported?',
          a: 'Any modern browser that supports JavaScript. Lightning wallets work on desktop (via browser extensions) and mobile (via wallet apps). The authentication button works on all devices.',
        },
        {
          q: 'What happens if the Lightning Network is down?',
          a: 'If the Lightning Network experiences issues, authentication may be temporarily unavailable. However, Lightning Network uptime is generally very high. You can offer fallback authentication methods (like email/password) alongside Key-Rex. For more details on service availability and uptime, see our <a href="/support" class="text-orange-400 hover:text-orange-300 underline">Support</a> page.',
        },
      ],
    },
    {
      category: 'Technical',
      questions: [
        {
          q: 'How does the authentication work?',
          a: 'When someone wants to sign in, they click the Key-Rex button on your website. Their Lightning wallet app opens and asks them to approve the sign-in. Once they approve, your website receives proof of their identity using the same cryptographic security that protects Bitcoin. No passwords to remember, no email codes to wait for—just a quick approval in their wallet app.',
        },
        {
          q: 'What data do you collect?',
          a: 'We collect minimal operational data: your xpub (cryptographic identifier), site ID, allowed domains, and usage statistics (login counts). We do NOT collect emails, names, personal information, IP addresses, or any tracking data. See our <a href="/open-source" class="text-orange-400 hover:text-orange-300 underline">Open Source page</a> for complete details. For information on data retention and deletion, see our <a href="/support#data-retention" class="text-orange-400 hover:text-orange-300 underline">Support</a> page.',
        },
        {
          q: 'How do I know if someone is a returning visitor?',
          a: 'Each visitor gets a unique identifier (called an xpub) that stays the same every time they sign in with the same wallet. Your backend receives this identifier when they sign in, so you can use it to recognize returning visitors and link it to their account in your system. See the Account Linking documentation in the dashboard for code examples showing exactly how to do this.',
        },
        {
          q: 'Can I customize the button appearance?',
          a: 'The Key-Rex button uses a standard design with orange styling and includes "Key-Rex" branding. This helps users recognize and trust the authentication method. If you\'re interested in custom branding or styling options, contact us to discuss custom solutions.',
        },
        {
          q: 'Is there a limit on logins or users?',
          a: 'There are no limits for legitimate use. You can have unlimited authentication attempts, unlimited unique users, and unlimited domains—everything is free with no restrictions. To protect against abuse, we have rate limiting and other safeguards in place that help prevent excessive requests from impacting the service, while ensuring normal usage remains unaffected.',
        },
        {
          q: 'What frameworks are supported?',
          a: 'Key-Rex works with any framework or CMS that supports JavaScript. We provide code examples for React, Vue.js, Next.js, and plain HTML. The integration is framework-agnostic—just add the script tag.',
        },
      ],
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          q: 'How secure is Lightning wallet authentication?',
          a: 'Very secure. It uses the same cryptographic signatures as Bitcoin (ECDSA secp256k1). There are no passwords to breach, no email databases to compromise, and no central point of failure. Each user controls their own private key.',
        },
        {
          q: 'Is the code open source?',
          a: 'Yes! The code is open source under the MIT License. You can audit every line, verify there\'s no tracking, and even self-host if desired. See our Open Source page for complete transparency.',
        },
        {
          q: 'What if I lose access to my Lightning wallet?',
          a: 'If you lose access to the Lightning wallet you use to sign in to your Key-Rex dashboard, you\'ll need to create a new Key-Rex account with a different wallet. We don\'t offer account recovery—this is intentional to prevent unauthorized access. Your new account will have a new Site ID, so you\'ll need to update the integration code on your website. For your own website users, you can set up your own recovery process (like email verification or a support review) to verify their identity and then link their new Key-Rex identifier to their existing account in your system. Key-Rex provides the cryptographic identifier; you control how account recovery and wallet changes work for your users.',
        },
        {
          q: 'Can users use multiple wallets?',
          a: 'Each Lightning wallet generates a unique xpub. If a user authenticates with different wallets, they\'ll appear as different identifiers to your system. You can safely support this by allowing multiple xpubs to be linked to the same user account in your own database (for example, storing an array of xpubs for each user). The Key-Rex dashboard documentation includes patterns and code examples for implementing this kind of account linking.',
        },
      ],
    },
    {
      category: 'Migration & Integration',
      questions: [
        {
          q: 'How do I switch from my current sign-in system?',
          a: 'Key-Rex can be used as a complete replacement for your existing sign-in system if you choose, but you don\'t have to switch—you can add Key-Rex alongside your existing sign-in methods. This way, visitors can choose whether to use Key-Rex, email/password, or whatever other options you offer. Over time, if you want, you can encourage visitors to use Key-Rex while still keeping your old methods available for those who prefer them.',
        },
        {
          q: 'How do I connect Key-Rex sign-ins to my existing user accounts?',
          a: 'Key-Rex works great with your existing user system. When someone signs in with Key-Rex, your backend receives their unique identifier. You can link this identifier to your existing user accounts in your database. This means: (1) New visitors can sign in with Key-Rex and you create accounts for them, or (2) Existing users can link their Lightning wallet to their current account so they can use Key-Rex sign-in too. Complete code examples and step-by-step guides are available in your dashboard Documentation tab after you create your account.',
        },
        {
          q: 'What happens to my data if I stop using Key-Rex?',
          a: 'You can export your data (domains, usage statistics, settings) from the dashboard at any time. If you stop using Key-Rex, your users\' authentication typically stops working, so make sure to migrate them to another method first. For complete details on data retention and export, see our <a href="/support#data-retention" class="text-orange-400 hover:text-orange-300 underline">Support</a> page.',
        },
        {
          q: 'Can I use this on multiple domains?',
          a: 'Yes! You can add unlimited domains and subdomains. Each production domain must be added in your dashboard and verified before authentication works. Domain verification requires adding a DNS TXT record to prove you own the domain. Test domains (like localhost, 127.0.0.1, test.example.com, staging.example.com, dev.example.com, etc.) are recognized as test domains and work automatically without verification. This helps prevent unauthorized use of your integration code.',
        },
        {
          q: 'How do I verify my domain?',
          a: 'After adding a domain in your dashboard, you\'ll need to verify ownership by adding a DNS TXT record. The dashboard will show you the exact record to add (format: keyrex-verification=...). Add this TXT record to your domain\'s DNS settings, wait 5-10 minutes for DNS propagation, then click "Verify" in the dashboard. Test domains don\'t require verification and work immediately. See the Domains tab in your dashboard for detailed instructions.',
        },
      ],
    },
    {
      category: 'Service & Support',
      questions: [
        {
          q: 'What kind of support do you provide?',
          a: 'Users receive best-effort support via our contact form with a 24-48 hour response target (not guaranteed). We also provide comprehensive self-service resources including FAQ, dashboard documentation, troubleshooting tools, and open source code. If you\'re interested in guaranteed support with SLA commitments, priority assistance, or dedicated help, contact us to discuss paid custom solutions.',
        },
        {
          q: 'What is your uptime guarantee?',
          a: 'Key-Rex does not include a Service Level Agreement (SLA) or uptime guarantee. Service availability depends on Lightning Network uptime, which we don\'t control. We aim to maintain high service availability, but cannot guarantee 100% uptime. If you\'re interested in guaranteed uptime and SLA commitments, contact us to discuss paid custom solutions.',
        },
        {
          q: 'How long do you retain my data?',
          a: 'We retain your account data for as long as your account is active. You can export all your data at any time from the Settings tab in your dashboard. For complete details on data retention and export policies, see our <a href="/support#data-retention" class="text-orange-400 hover:text-orange-300 underline">Support</a> page.',
        },
        {
          q: 'Can I get guaranteed support or faster response times?',
          a: 'If you\'re interested in guaranteed support with SLA commitments, priority support queue, dedicated implementation assistance, or faster response times, we\'re open to discussing paid custom solutions. <a href="/support#contact-form" class="text-orange-400 hover:text-orange-300 underline">Contact us</a> to discuss your needs and we can work together to determine if we can set something up that meets your requirements.',
        },
      ],
    },
    {
      category: 'Troubleshooting Sign-In Issues',
      questions: [
        {
          q: 'The sign-in button doesn\'t do anything when I click it',
          a: 'This usually means your browser extension isn\'t installed or enabled. Try these steps: (1) Install a Lightning wallet browser extension, (2) Make sure the extension is enabled in your browser settings, (3) Refresh the page and try clicking the button again. If you\'re on mobile, you won\'t use a browser extension—instead, you\'ll see a QR code to scan with your mobile wallet app, or an "Open in Wallet" button that opens your wallet directly.',
        },
        {
          q: 'I scanned the QR code but nothing happened',
          a: 'Try these steps: (1) Make sure you approved the sign-in request in your wallet app—just scanning isn\'t enough, you need to tap "Approve" or "Sign In" in your wallet, (2) Check that your wallet supports LNURL-auth (most modern Lightning wallets do), (3) Make sure the QR code hasn\'t expired—they expire after 5 minutes, so if it\'s been a while, click the sign-in button again to get a new one, (4) If you\'re on mobile, make sure you return to the browser tab after approving in your wallet—the sign-in completes automatically when you come back.',
        },
        {
          q: 'My wallet app won\'t open when I click the button',
          a: 'If you\'re using a desktop browser: (1) Make sure you have a Lightning wallet browser extension installed, (2) Check that the extension is enabled in your browser settings, (3) Try refreshing the page. If you\'re on mobile: (1) You should see a QR code or an "Open in Wallet" button—if you don\'t, try refreshing the page, (2) Make sure you have a Lightning wallet app installed on your phone, (3) Some browsers block popups, so make sure popups are allowed for this website.',
        },
        {
          q: 'I get an "Authentication failed" or "Invalid signature" error',
          a: 'This can happen for a few reasons: (1) The authentication request expired—just try again by clicking the sign-in button, (2) Your wallet app had an issue creating the signature—try closing and reopening your wallet app, then try signing in again, (3) There\'s a network connectivity problem—check your internet connection and try again, (4) Your wallet app might need an update—check for updates in your app store. If the problem persists, try using a different wallet or contact the website owner for help.',
        },
        {
          q: 'I see "Key-Rex authentication is currently disabled" when trying to sign in',
          a: 'This means the website owner has disabled Key-Rex authentication in their dashboard. The integration toggle in the dashboard controls whether authentication works across all domains. Contact the website owner to ask them to enable authentication in their Key-Rex dashboard under the "My Integration Code" tab.',
        },
        {
          q: 'The QR code expired before I could scan it',
          a: 'QR codes expire after 5 minutes for security reasons. Just click the sign-in button again to generate a new QR code. If you\'re having trouble scanning quickly, try: (1) Making sure you have good lighting, (2) Holding your phone steady while scanning, (3) Moving closer to the screen, (4) Cleaning your phone camera lens. On mobile, you can also use the "Open in Wallet" button instead of scanning—this opens your wallet app directly and is often faster.',
        },
        {
          q: 'I\'m on mobile but don\'t see a QR code',
          a: 'On mobile devices, you should see an "Open in Wallet" button instead of a QR code. Tap that button to open your wallet app directly—this is usually faster than scanning. If you don\'t see the button: (1) Make sure you have a Lightning wallet app installed on your phone, (2) Try refreshing the page, (3) If the button doesn\'t work, look for a "Copy LNURL" option—you can copy that and paste it into your wallet app manually.',
        },
        {
          q: 'My wallet doesn\'t support this type of sign-in',
          a: 'Key-Rex requires a Lightning wallet that supports LNURL-auth (a specific authentication protocol). Most modern Lightning wallets support this, including browser extensions for desktop and mobile wallet apps. If your wallet doesn\'t support LNURL-auth, you have two options: (1) Use a different wallet that does support it (compatible wallets are free to download), or (2) Contact the website owner to see if they offer alternative sign-in methods like email/password.',
        },
      ],
    },
  ]

  const navItems = faqs.map((category, index) => ({
    id: `category-${index}`,
    label: category.category,
  }))

  return (
    <Layout showNav={true}>
      <div className="min-h-screen flex flex-col lg:flex-row relative">
        {/* Sticky Navigation */}
        <div>
          <PageNavigation items={navItems} title="Categories" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h1>
            <p className="text-xl text-white/200 leading-relaxed">
              Answers to common questions about using Key-Rex on your website
            </p>
          </div>

          {/* FAQ Categories */}
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} id={`category-${categoryIndex}`} className="space-y-4">
              <h2 className="text-2xl font-semibold text-orange-400 border-b border-orange-500/30 pb-2">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => (
                  <Card key={faqIndex} className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <h3 className="text-white font-semibold text-lg mb-3">
                      {faq.q}
                    </h3>
                    <p 
                      className="text-white/200 text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: faq.a }}
                    />
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Still Have Questions */}
          <Card className="p-8 border-2 border-orange-500/30 bg-dark-200/90 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Still Have Questions?</h2>
            <p className="text-white/200 text-base mb-6 leading-relaxed">
              If you didn't find what you're looking for, check out our detailed documentation in the dashboard after you sign up, or browse our open source code to see exactly how everything works under the hood.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/open-source"
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
              >
                View Open Source Code
              </a>
              <a
                href="/why-keyrex"
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition-colors"
              >
                Learn More About Key-Rex
              </a>
            </div>
          </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

