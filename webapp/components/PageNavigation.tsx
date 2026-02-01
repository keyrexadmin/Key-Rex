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

  return (
    <nav 
      className="sticky h-[calc(100vh-4rem)] overflow-y-auto" 
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
  )
}

