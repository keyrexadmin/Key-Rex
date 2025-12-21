'use client'

import { useState } from 'react'
import Tooltip from './Tooltip'

interface HelpIconProps {
  content: string | React.ReactNode
  className?: string
}

export default function HelpIcon({ content, className = '' }: HelpIconProps) {
  return (
    <Tooltip content={content} position="top" className={className}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dark-700 hover:bg-dark-600 text-white/300 hover:text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
        aria-label="Help"
      >
        ?
      </button>
    </Tooltip>
  )
}





