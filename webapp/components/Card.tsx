'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'highlight' | 'warning' | 'danger'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-dark-200/80 border-dark-400 hover:border-orange-500/40',
    highlight: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/40 hover:border-orange-500/60',
    warning: 'bg-yellow-500/20 border-yellow-500/40 hover:border-yellow-500/60',
    danger: 'bg-red-500/20 border-red-500/40 hover:border-red-500/60'
  }
  
  return (
    <div 
      className={`border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 ${variants[variant]} ${className}`}
      style={{
        borderRadius: '0.875rem', // Slightly less rounded than rounded-xl (1rem), with subtle angular feel
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle T-Rex scale texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg%3E%3Cpath d='M0 9 L9 0 M9 18 L18 9 M18 27 L27 18 M27 36 L36 27 M36 45 L45 36 M45 54 L54 45' stroke='%23f97316' stroke-width='0.8' stroke-opacity='0.4' fill='none'/%3E%3Cpath d='M0 18 L9 9 M9 27 L18 18 M18 36 L27 27 M27 45 L36 36 M36 54 L45 45' stroke='%23f97316' stroke-width='0.8' stroke-opacity='0.4' fill='none'/%3E%3Cpath d='M9 0 L18 9 M18 9 L27 18 M27 18 L36 27 M36 27 L45 36 M45 36 L54 45' stroke='%23f97316' stroke-width='0.8' stroke-opacity='0.4' fill='none'/%3E%3Cpath d='M9 9 L18 18 M18 18 L27 27 M27 27 L36 36 M36 36 L45 45 M45 45 L54 54' stroke='%23f97316' stroke-width='0.8' stroke-opacity='0.4' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

