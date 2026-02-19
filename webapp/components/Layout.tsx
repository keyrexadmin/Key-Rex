'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LoginButton from './LoginButton'

interface LayoutProps {
  children: React.ReactNode
  showNav?: boolean
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  // Use state to track pathname after mount to avoid hydration issues
  const [pathname, setPathname] = useState('/')
  const [logoSrc, setLogoSrc] = useState('/images/paw2.png')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isHomePage = pathname === '/'

  useEffect(() => {
    // Set pathname after mount
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
      // Add cache-busting query parameter to force browser to reload image
      setLogoSrc(`/images/paw2.png?t=${Date.now()}`)
    }
  }, [])

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Subtle T-Rex scale pattern overlay - diagonal texture suggesting scales */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg%3E%3Cpath d='M0 15 L15 0 M15 30 L30 15 M30 45 L45 30 M45 60 L60 45 M60 75 L75 60 M75 90 L90 75 M90 100 L100 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M0 30 L15 15 M15 45 L30 30 M30 60 L45 45 M45 75 L60 60 M60 90 L75 75 M75 100 L90 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 0 L30 15 M30 15 L45 30 M45 30 L60 45 M60 45 L75 60 M75 60 L90 75 M90 75 L100 90' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 15 L30 30 M30 30 L45 45 M45 45 L60 60 M60 60 L75 75 M75 75 L90 90 M90 90 L100 100' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
        backgroundPosition: '0 0',
        opacity: 0.16,
      }} />

      {/* Enhanced radial glow accents */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orange-500/12 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/12 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Navigation Bar */}
      {showNav && (
        <nav className="sticky top-0 z-50 border-b border-orange-500/30 backdrop-blur-md" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-20">
              {/* Logo - Left Side */}
              <div className="flex-shrink-0 h-full flex items-center -ml-4 sm:-ml-6">
                <Link href="/" className="flex items-center group" aria-label="Key-Rex Home">
                  <img
                    src={logoSrc}
                    alt="Key-Rex"
                    className="transform group-hover:scale-110 transition-transform duration-200 object-contain"
                    style={{
                      height: '5.11rem',
                      width: 'auto'
                    }}
                    onError={(e) => {
                      console.error('Failed to load logo image:', logoSrc)
                      // Fallback to original path without cache-busting
                      if (logoSrc.includes('?t=')) {
                        e.currentTarget.src = '/images/paw2.png'
                      }
                    }}
                  />
                  <span
                    className="md:hidden text-2xl font-extrabold tracking-tight -ml-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]"
                    style={{
                      background: 'linear-gradient(180deg, #f5b942 0%, #e8912d 50%, #c46d1a 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Key-Rex
                  </span>
                </Link>
              </div>

              {/* Navigation Links - Centered (desktop) */}
              <div className="flex-1 flex justify-center items-center">
                <div className="hidden md:flex items-center space-x-3 flex-nowrap">
                  <NavLink href="/how-it-works" active={pathname === '/how-it-works'}>How It Works</NavLink>
                  <NavLink href="/why-bitpass" active={pathname === '/why-bitpass'}>Why Key-Rex</NavLink>
                  <NavLink href="/requirements" active={pathname === '/requirements'}>Requirements</NavLink>
                  <NavLink href="/docs" active={pathname === '/docs'}>Documentation</NavLink>
                  <NavLink href="/faq" active={pathname === '/faq'}>FAQ</NavLink>
                  <NavLink href="/support" active={pathname === '/support'}>Support</NavLink>
                  <NavLink href="/for-wallets" active={pathname === '/for-wallets'}>Wallet Partnerships</NavLink>
                  <NavLink href="/open-source" active={pathname === '/open-source'}>Open Source</NavLink>
                </div>
              </div>

              {/* Delineator - Separates navigation links from sign-in section */}
              {pathname !== '/dashboard' && (
                <div className="hidden md:block h-8 w-px bg-orange-500/30 mx-4 flex-shrink-0"></div>
              )}

              {/* Right side: hamburger + sign-in */}
              <div className="flex-shrink-0 ml-auto flex items-center gap-2">
                {/* Hamburger toggle (mobile) */}
                <button
                  className="md:hidden p-2 rounded-lg text-white/80 hover:text-orange-400 hover:bg-dark-800/70 transition-colors"
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>

                {pathname !== '/dashboard' && (
                  <div className="flex items-center gap-3">
                    <span className="text-white/80 text-sm hidden sm:inline">
                      <span className="block">Already have a</span>
                      <span className="block font-semibold text-orange-400">Key-Rex Account?</span>
                    </span>
                    <LoginButton
                      buttonImage="/images/keyrex-websitebutton.png"
                      imageAlt="Sign in with Key-Rex"
                      buttonClassName="bg-orange-400 hover:bg-orange-500 active:bg-orange-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-xl shadow-lg border-2 border-orange-400/40 hover:border-orange-400/80 active:border-orange-400 flex items-center justify-center h-14 max-h-14 w-32 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                      compact={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-orange-500/20 px-4 py-3 space-y-1" style={{ backgroundColor: 'rgba(26, 26, 26, 0.98)' }}>
              <NavLink href="/how-it-works" active={pathname === '/how-it-works'}>How It Works</NavLink>
              <NavLink href="/why-bitpass" active={pathname === '/why-bitpass'}>Why Key-Rex</NavLink>
              <NavLink href="/requirements" active={pathname === '/requirements'}>Requirements</NavLink>
              <NavLink href="/docs" active={pathname === '/docs'}>Documentation</NavLink>
              <NavLink href="/faq" active={pathname === '/faq'}>FAQ</NavLink>
              <NavLink href="/support" active={pathname === '/support'}>Support</NavLink>
              <NavLink href="/for-wallets" active={pathname === '/for-wallets'}>Wallet Partnerships</NavLink>
              <NavLink href="/open-source" active={pathname === '/open-source'}>Open Source</NavLink>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      {showNav && (
        <footer className="relative z-10 border-t border-orange-500/30 backdrop-blur-md mt-auto" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="text-white/70 text-sm">
                © {new Date().getFullYear()} Key-Rex, LLC.
              </div>
              <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
                <Link href="/how-it-works" className="text-white/70 hover:text-orange-400 text-sm transition-colors">
                  How It Works
                </Link>
                <Link href="/why-bitpass" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Why Key-Rex
                </Link>
                <Link href="/for-wallets" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Wallet Partnerships
                </Link>
                <Link href="/requirements" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Requirements
                </Link>
                <Link href="/docs" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Documentation
                </Link>
                <Link href="/faq" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  FAQ
                </Link>
                <Link href="/support" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Support
                </Link>
                <Link href="/open-source" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Open Source
                </Link>
                <Link href="/admin/login" className="text-white/60 hover:text-orange-400 text-sm transition-colors">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] ${
        active
          ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50 shadow-sm'
          : 'text-white/80 hover:text-orange-400 hover:bg-dark-800/70'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
