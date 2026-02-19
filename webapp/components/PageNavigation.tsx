'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  id: string
  label: string
  href?: string
  onClick?: () => void
}

interface PageNavigationProps {
  items: NavItem[]
  title?: string
}

export default function PageNavigation({ items, title = 'Navigation' }: PageNavigationProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150 // Offset for fixed nav

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.id) {
          const element = document.getElementById(item.id)
          if (element) {
            const offsetTop = element.offsetTop
            if (scrollPosition >= offsetTop) {
              setActiveId(item.id)
              break
            }
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [items])

  const handleClick = (item: NavItem) => {
    setMobileNavOpen(false)
    if (item.onClick) {
      item.onClick()
    } else if (item.href?.startsWith('#')) {
      const id = item.href.substring(1)
      const element = document.getElementById(id)
      if (element) {
        const offset = 80 // Account for fixed nav bar
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - offset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    } else if (item.id) {
      // Handle items with just an id (no href)
      const element = document.getElementById(item.id)
      if (element) {
        const offset = 80 // Account for fixed nav bar
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - offset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
  }

  const activeLabel = items.find(i => i.id === activeId)?.label || title

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden sticky top-20 z-40">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-dark-900/95 border-b border-dark-700/50 text-white text-sm font-medium"
          onClick={() => setMobileNavOpen(prev => !prev)}
          aria-expanded={mobileNavOpen}
        >
          <span className="truncate">{activeLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileNavOpen && (
          <div className="bg-dark-900/95 border-b border-dark-700/50 max-h-[50vh] overflow-y-auto">
            <ul className="space-y-1 p-3">
              {items.map((item) => {
                const isActive = activeId === item.id
                const isExternal = item.href && !item.href.startsWith('#')

                if (isExternal) {
                  return (
                    <li key={item.id || item.label}>
                      <Link
                        href={item.href!}
                        className={`block px-3 py-2 rounded text-sm transition-colors ${
                          pathname === item.href
                            ? 'bg-orange-500/20 text-orange-400 font-medium'
                            : 'text-white/300 hover:text-white hover:bg-dark-800/50'
                        }`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                }

                return (
                  <li key={item.id || item.label}>
                    <button
                      onClick={() => handleClick(item)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-orange-500/20 text-orange-400 font-medium'
                          : 'text-white/300 hover:text-white hover:bg-dark-800/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <nav
        className="hidden lg:block sticky h-[calc(100vh-4rem)] overflow-y-auto"
        style={{
          top: '64px',
          position: 'sticky',
          alignSelf: 'flex-start',
          zIndex: 40,
          maxHeight: 'calc(100vh - 64px)'
        }}
      >
        <div className="bg-dark-900/95 border-r border-dark-700/50 p-4 min-w-[200px]">
          {title && (
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              {title}
            </h3>
          )}
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = activeId === item.id
              const isExternal = item.href && !item.href.startsWith('#')

              if (isExternal) {
                return (
                  <li key={item.id || item.label}>
                    <Link
                      href={item.href!}
                      className={`block px-3 py-2 rounded text-sm transition-colors ${
                        pathname === item.href
                          ? 'bg-orange-500/20 text-orange-400 font-medium'
                          : 'text-white/300 hover:text-white hover:bg-dark-800/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              }

              return (
                <li key={item.id || item.label}>
                  <button
                    onClick={() => handleClick(item)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-400 font-medium'
                        : 'text-white/300 hover:text-white hover:bg-dark-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </>
  )
}
