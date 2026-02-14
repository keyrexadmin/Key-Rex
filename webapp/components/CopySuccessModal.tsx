'use client'

import { useEffect } from 'react'

interface CopySuccessModalProps {
  selectedWallet: string
  onDismiss: () => void
  isVisible: boolean
}

export default function CopySuccessModal({ selectedWallet, onDismiss, isVisible }: CopySuccessModalProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  // Get wallet-specific next steps
  const getWalletInstructions = () => {
    switch (selectedWallet) {
      case 'sparrow':
        return {
          walletName: 'Sparrow Wallet',
          steps: ['Open Sparrow Wallet', 'Go to Tools → Sign Message', 'Paste the LNURL', 'Approve the authentication request']
        }
      case 'electrum':
        return {
          walletName: 'Electrum',
          steps: ['Open Electrum', 'Go to Tools → Sign/Verify Message', 'Paste the LNURL', 'Approve the authentication request']
        }
      case 'bluewallet':
        return {
          walletName: 'BlueWallet Desktop',
          steps: ['Open BlueWallet Desktop', 'Look for LNURL or Authenticate option', 'Paste the LNURL', 'Approve the authentication request']
        }
      case 'wasabi':
        return {
          walletName: 'Wasabi Wallet',
          steps: ['Open Wasabi Wallet', 'Go to Tools → Sign Message (if available)', 'Paste the LNURL', 'Note: Wasabi may not support LNURL-auth']
        }
      case 'other':
        return {
          walletName: 'your wallet',
          steps: ['Open your desktop Lightning wallet', 'Look for Authenticate, LNURL, or Sign Message option', 'Paste the LNURL', 'Approve the authentication request']
        }
      default:
        return {
          walletName: 'your wallet',
          steps: ['Open your desktop Lightning wallet', 'Look for Authenticate or LNURL option', 'Paste the LNURL', 'Approve the authentication request']
        }
    }
  }

  const instructions = getWalletInstructions()

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-success-title"
    >
      <div 
        className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-xl p-6 max-w-md w-full mx-4 border-2 border-green-500/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
            <svg 
              className="w-8 h-8 text-green-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 
          id="copy-success-title"
          className="text-white font-bold text-lg text-center mb-2"
        >
          ✓ LNURL Copied!
        </h3>

        {/* Instructions */}
        <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700/50 mb-4">
          <p className="text-white/300 text-sm font-semibold mb-3 text-center">
            Next: Use {instructions.walletName}
          </p>
          <ol className="text-white/400 text-xs space-y-2 ml-5 list-decimal">
            {instructions.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="w-full bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
        >
          Got it
        </button>

        {/* Auto-dismiss indicator */}
        <p className="text-white/500 text-xs text-center mt-3">
          This will close automatically in 5 seconds
        </p>
      </div>
    </div>
  )
}




