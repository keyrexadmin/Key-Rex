'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export default function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current
      const trigger = triggerRef.current
      const rect = trigger.getBoundingClientRect()

      // Position tooltip
      switch (position) {
        case 'top':
          tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`
          tooltip.style.left = `${rect.left + rect.width / 2}px`
          tooltip.style.transform = 'translateX(-50%)'
          break
        case 'bottom':
          tooltip.style.top = `${rect.bottom + 8}px`
          tooltip.style.left = `${rect.left + rect.width / 2}px`
          tooltip.style.transform = 'translateX(-50%)'
          break
        case 'left':
          tooltip.style.right = `${window.innerWidth - rect.left + 8}px`
          tooltip.style.top = `${rect.top + rect.height / 2}px`
          tooltip.style.transform = 'translateY(-50%)'
          break
        case 'right':
          tooltip.style.left = `${rect.right + 8}px`
          tooltip.style.top = `${rect.top + rect.height / 2}px`
          tooltip.style.transform = 'translateY(-50%)'
          break
      }
    }
  }, [isVisible, position])

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[200] bg-dark-900 text-white text-sm rounded-lg shadow-xl border-2 border-orange-500/30 p-3 max-w-xs pointer-events-none ${
            position === 'top' ? 'mb-2' : position === 'bottom' ? 'mt-2' : ''
          }`}
          role="tooltip"
        >
          {typeof content === 'string' ? (
            <p className="text-white/100">{content}</p>
          ) : (
            content
          )}
          <div
            className={`absolute w-0 h-0 border-4 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-r-transparent border-b-transparent border-l-transparent'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-r-transparent border-t-transparent border-l-transparent'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-r-transparent border-t-transparent border-b-transparent'
                : 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-l-transparent border-t-transparent border-b-transparent'
            }`}
          />
        </div>
      )}
    </div>
  )
}






