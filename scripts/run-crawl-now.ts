import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { runCrawl } from '../lib/job-crawler/crawler'

async function main() {
  console.log('Starting crawl...')
  const result = await runCrawl()
  
  console.log('\n====== Crawl Results ======')
  for (const r of result) {
    console.log(`\n[${r.source}]`)
    console.log(`  Jobs found: ${r.jobsFound}`)
    console.log(`  Jobs saved: ${r.jobsSaved}`)
    if (r.errors?.length) console.log(`  Errors: ${r.errors.slice(0, 3).join('\n  ')}`)
  }
}

main().catch(console.error)
