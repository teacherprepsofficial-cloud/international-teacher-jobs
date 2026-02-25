import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const mongoose = await import('mongoose')
  const { runCrawl } = await import('../lib/job-crawler/crawler')

  const maxPages = process.argv.includes('--backfill') ? 50 : 10

  console.log(`\n=== Job Crawler ===`)
  console.log(`Max pages per source: ${maxPages}`)
  console.log(`CRAWLER_ADMIN_ID: ${process.env.CRAWLER_ADMIN_ID || 'NOT SET'}\n`)

  if (!process.env.CRAWLER_ADMIN_ID) {
    console.error('ERROR: CRAWLER_ADMIN_ID not set. Run this first:')
    console.error('  npx tsx scripts/create-crawler-admin.ts')
    process.exit(1)
  }

  try {
    const results = await runCrawl(maxPages)

    console.log('\n=== Results ===')
    for (const r of results) {
      console.log(`${r.source}: ${r.jobsNew} new, ${r.jobsSkipped} skipped, ${r.errors.length} errors (${r.durationMs}ms)`)
      if (r.errors.length > 0) {
        r.errors.forEach(e => console.log(`  ERROR: ${e}`))
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0)
    const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0)
    console.log(`\nTotal: ${totalNew} new jobs added, ${totalFound} found`)
  } catch (err) {
    console.error('Crawl failed:', err)
  }

  await mongoose.default.disconnect()
}

main()
