/** Offline tests for signed session cookies. Run: npm run test:session */
import { signSession, verifySession } from '../lib/session'

let failed = 0
function check(name: string, ok: boolean) {
  console.log(`${ok ? '✅' : '❌'} ${name}`)
  if (!ok) failed++
}

const xpub = 'xpub_0123456789abcdef0123456789abcdef'
const c = signSession('user', xpub)
check('valid user cookie verifies', verifySession('user', c) === xpub)
check('bare identifier is rejected', verifySession('user', xpub) === undefined)
check('bare identifier with dots is rejected', verifySession('user', `${xpub}.1.2`) === undefined)
check('user cookie is not valid as admin cookie', verifySession('admin', c) === undefined)
const [x, exp, sig] = c.split('.')
check('tampered identifier rejected', verifySession('user', `xpub_ffffffffffffffffffffffffffffffff.${exp}.${sig}`) === undefined)
check('extended expiry rejected', verifySession('user', `${x}.${Number(exp) + 99999}.${sig}`) === undefined)
check('expired cookie rejected', verifySession('user', `${x}.1.${sig}`) === undefined)
check('empty/undefined rejected', verifySession('user', '') === undefined && verifySession('user', undefined) === undefined)
process.exit(failed ? 1 : 0)
