'use client'

import { useState, useEffect } from 'react'

/**
 * Simple client-side preview gate
 *
 * TEMPORARY: This is a simple password gate for preview access.
 * To remove: Delete this file and remove <PreviewGate /> from app/layout.tsx
 */

// HARDCODED PASSWORD - Change this to whatever you want
const PREVIEW_PASSWORD = 'keyrex2024'

export default function PreviewGate() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if already unlocked in this browser session
    const unlocked = sessionStorage.getItem('preview_unlocked')
    if (unlocked === 'true') {
      setIsUnlocked(true)
    }
    setIsLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === PREVIEW_PASSWORD) {
      // Store in session storage (cleared when browser closes)
      sessionStorage.setItem('preview_unlocked', 'true')
      setIsUnlocked(true)
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  // Don't render anything while checking storage
  if (isLoading) {
    return null
  }

  // If unlocked, don't show the gate
  if (isUnlocked) {
    return null
  }

  // Show the gate
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-block text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-2">Preview Access</h1>
          <p className="text-white/60">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-dark-800/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Unlock Preview
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm">
            Preview password: <code className="text-orange-400">keyrex2024</code>
          </p>
        </div>
      </div>
    </div>
  )
}
