import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const wallets = [
  {
    id: 'wallet_alby',
    name: 'Alby',
    logoUrl: '/images/wallets/alby-logo.svg',
    downloadUrl: 'https://getalby.com',
    enabled: true,
    priority: 1,
  },
  {
    id: 'wallet_phoenix',
    name: 'Phoenix',
    logoUrl: '/images/wallets/phoenix-logo.svg',
    downloadUrl: 'https://phoenix.acinq.co',
    enabled: true,
    priority: 2,
  },
  {
    id: 'wallet_zeus',
    name: 'Zeus',
    logoUrl: '/images/wallets/zeus-logo.svg',
    downloadUrl: 'https://zeusln.app',
    enabled: true,
    priority: 3,
  },
  {
    id: 'wallet_manna',
    name: 'Manna',
    logoUrl: '/images/wallets/manna-logo.svg',
    downloadUrl: 'https://mannabitcoin.com',
    enabled: true,
    priority: 4,
  },
]

async function main() {
  console.log('Seeding featured wallets...')

  for (const wallet of wallets) {
    const now = BigInt(Date.now())
    await prisma.featuredWallet.upsert({
      where: { id: wallet.id },
      update: {
        name: wallet.name,
        logoUrl: wallet.logoUrl,
        downloadUrl: wallet.downloadUrl,
        enabled: wallet.enabled,
        priority: wallet.priority,
        updatedAt: now,
      },
      create: {
        id: wallet.id,
        name: wallet.name,
        logoUrl: wallet.logoUrl,
        downloadUrl: wallet.downloadUrl,
        enabled: wallet.enabled,
        priority: wallet.priority,
        createdAt: now,
        updatedAt: now,
      },
    })
    console.log(`  Upserted wallet: ${wallet.name}`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
