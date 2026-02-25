import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const mongoose = await import('mongoose')
  const { runStaleCheck } = await import('../lib/job-crawler/stale-checker')

  console.log('\n=== Stale Check ===\n')

  try {
    const result = await runStaleCheck()

    console.log('\n=== Results ===')
    console.log(`Checked: ${result.totalChecked}`)
    console.log(`Still live: ${result.stillLive}`)
    console.log(`Taken down: ${result.markedTakenDown}`)
    console.log(`Failed (pending): ${result.failedChecks}`)
    console.log(`Errors: ${result.errors.length}`)
    console.log(`Duration: ${result.durationMs}ms`)

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.forEach(e => console.log(`  ${e}`))
    }
  } catch (err) {
    console.error('Stale check failed:', err)
  }

  await mongoose.default.disconnect()
}

main()
