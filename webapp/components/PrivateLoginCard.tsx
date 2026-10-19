'use client'

import { useCallback, useEffect, useState } from 'react'

interface LoginStatus {
  mode: 'standard' | 'private'
  host: string | null
  status: 'pending' | 'active' | null
  privateActive: boolean
  cnameTarget: string | null
}

export default function PrivateLoginCard() {
  const [info, setInfo] = useState<LoginStatus | null>(null)
  const [host, setHost] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/login-domain', { credentials: 'include' })
    if (res.ok) setInfo(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function act(body: Record<string, string>) {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/login-domain', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setMessage({ ok: false, text: data.error || 'Request failed' })
      else if (data.verified === false) setMessage({ ok: false, text: data.error || 'DNS record not found yet' })
      else setMessage({ ok: true, text: 'Saved' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!info) return null

  return (
    <div className="bg-dark-800/50 border-2 border-dark-700/50 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-1">Private login (optional)</h3>
      <p className="text-white/70 text-sm mb-4 leading-relaxed">
        Standard login works with no setup. Private login gives your site its own login domain, so
        each visitor&apos;s wallet uses a different key on your site than on any other site. Nobody,
        including Key-Rex, can link your visitors across sites. You can switch back at any time.
      </p>

      <div className="text-sm text-white/80 mb-4">
        Current mode: <strong className="text-white">{info.privateActive ? 'Private' : 'Standard'}</strong>
        {info.host && (
          <>
            {' '}
            · Login domain: <code>{info.host}</code> ({info.status})
          </>
        )}
      </div>

      {!info.host && (
        <div className="flex gap-2 mb-3">
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="auth.yourdomain.com"
            className="flex-1 px-3 py-2 rounded bg-dark-900 border border-dark-700 text-white text-sm"
          />
          <button
            disabled={busy || !host}
            onClick={() => act({ action: 'set', host })}
            className="px-4 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {info.host && info.status === 'pending' && (
        <div className="text-sm text-white/80 mb-3">
          <p className="mb-2">
            Add this DNS record, then verify. It must be a subdomain of one of your verified domains.
          </p>
          <pre className="bg-dark-900 rounded p-3 text-xs overflow-x-auto">
            {`${info.host}  CNAME  ${info.cnameTarget || '(not configured on this server)'}`}
          </pre>
          <button
            disabled={busy}
            onClick={() => act({ action: 'verify' })}
            className="mt-3 px-4 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-50"
          >
            Verify DNS
          </button>
        </div>
      )}

      {info.host && info.status === 'active' && (
        <div className="flex gap-2 mb-3">
          {info.mode === 'private' ? (
            <button
              disabled={busy}
              onClick={() => act({ action: 'mode', mode: 'standard' })}
              className="px-4 py-2 rounded bg-dark-700 text-white text-sm disabled:opacity-50"
            >
              Switch back to standard
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => act({ action: 'mode', mode: 'private' })}
              className="px-4 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-50"
            >
              Enable private login
            </button>
          )}
        </div>
      )}

      {info.mode === 'private' && (
        <p className="text-xs text-yellow-300/90 mb-3">
          Visitors will get a new account identifier on your site (their per-site key). Existing
          accounts must be linked or re-created. Verify tokens with the v2 receipt as described in the docs.
        </p>
      )}

      {info.host && (
        <button
          disabled={busy}
          onClick={() => act({ action: 'remove' })}
          className="text-xs text-white/50 underline disabled:opacity-50"
        >
          Remove login domain
        </button>
      )}

      {message && <p className={`mt-3 text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
