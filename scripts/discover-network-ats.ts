/**
 * Network-Level ATS Discovery Script
 *
 * Targets the largest international school networks/groups that likely
 * use enterprise ATS platforms (Workday, SmartRecruiters, iCIMS, Taleo).
 *
 * These large groups operate dozens of schools under one ATS tenant,
 * so one match = dozens of schools' jobs available.
 *
 * PUBLIC APIs used:
 *   Workday:         myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs  (POST)
 *   SmartRecruiters: api.smartrecruiters.com/v1/companies/{id}/postings (GET)
 *   Greenhouse:      boards-api.greenhouse.io/v1/boards/{slug}/jobs   (GET)
 *   Lever:           api.lever.co/v0/postings/{slug}?mode=json         (GET)
 *   Workable:        apply.workable.com/api/v3/accounts/{slug}/jobs    (POST)
 *
 * All are public APIs designed for job widget embeds — 100% legal to use.
 *
 * Run: npx tsx scripts/discover-network-ats.ts
 * Options:
 *   --dry-run     Print results without saving to DB
 *   --platform P  Only test: workday | smartrecruiters | greenhouse | lever | workable
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SchoolSchema = new mongoose.Schema({
  name: String, slug: String, country: String, countryCode: String,
  city: String, region: String,
  networkGroup: String,          // e.g., "GEMS Education", "Nord Anglia"
  atsPlatform: String, atsSlug: String, atsNetworkSlug: String, atsDiscoveredAt: Date,
}, { strict: false, timestamps: true })

const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const PLATFORM_FILTER = (() => { const i = args.indexOf('--platform'); return i !== -1 ? args[i + 1] : null })()

const DELAY_MS = 300
const TIMEOUT_MS = 10_000

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchJson(url: string, opts?: RequestInit): Promise<any | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...opts?.headers },
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ── Workday ───────────────────────────────────────────────────────────────────
// Workday public careers API used by job widgets on company career pages.
// Tenant = the subdomain of their Workday instance (e.g., "gems").
// Site = the career site ID (usually same as tenant or "External").
// WD number (1-5) varies by when the company joined Workday.
async function checkWorkday(tenant: string, site: string, wdNum = 1): Promise<{ count: number, jobs: any[] } | null> {
  const base = `https://${tenant}.wd${wdNum}.myworkdayjobs.com`
  const url = `${base}/wday/cxs/${tenant}/${site}/jobs`
  const data = await fetchJson(url, {
    method: 'POST',
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: '' }),
  })
  if (!data || typeof data.total !== 'number') return null
  return { count: data.total, jobs: data.jobPostings || [] }
}

// Try multiple WD instance numbers for a tenant
async function checkWorkdayAllInstances(tenant: string, site?: string): Promise<{ wdNum: number, count: number, jobs: any[], site: string } | null> {
  const sitesToTry = site ? [site] : [tenant, 'External', 'external', `${tenant}_External`, `${tenant}_external`]
  for (const wdN of [1, 2, 3, 4, 5]) {
    for (const s of sitesToTry) {
      const result = await checkWorkday(tenant, s, wdN)
      await delay(100)
      if (result !== null) {
        return { wdNum: wdN, count: result.count, jobs: result.jobs, site: s }
      }
    }
  }
  return null
}

// ── SmartRecruiters ───────────────────────────────────────────────────────────
// NOTE: SmartRecruiters returns HTTP 200 with empty content for ANY company identifier,
// including completely fictional ones. This means company existence cannot be verified
// via the postings API. We verify via a separate HEAD check on their public jobs page.
async function checkSmartRecruiters(companyId: string): Promise<{ count: number, jobs: any[] } | null> {
  // First: verify the company actually exists on SmartRecruiters by checking their
  // public jobs page. A real company will return a proper HTML page; a fake one redirects
  // to the SmartRecruiters homepage or returns an error page.
  try {
    const pageCtrl = new AbortController()
    const pageT = setTimeout(() => pageCtrl.abort(), TIMEOUT_MS)
    const pageRes = await fetch(`https://jobs.smartrecruiters.com/${encodeURIComponent(companyId)}`, {
      signal: pageCtrl.signal,
      headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    })
    clearTimeout(pageT)
    if (!pageRes.ok) return null
    const finalUrl = pageRes.url
    // If redirected to the SR homepage (not to a company page), it doesn't exist
    if (!finalUrl.includes(companyId.toLowerCase()) && !finalUrl.includes('/company/')) return null
    const html = await pageRes.text()
    if (!html.includes('smartrecruiters') || html.includes('Page not found')) return null
  } catch {
    return null
  }

  // Company exists — now fetch job postings
  const data = await fetchJson(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyId)}/postings?limit=100`
  )
  if (!data || !Array.isArray(data.content)) return null
  return { count: data.totalFound ?? data.content.length, jobs: data.content }
}

// ── Greenhouse ────────────────────────────────────────────────────────────────
async function checkGreenhouse(slug: string): Promise<{ count: number, jobs: any[] } | null> {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`)
  if (!data || !Array.isArray(data.jobs)) return null
  return { count: data.jobs.length, jobs: data.jobs }
}

// ── Lever ─────────────────────────────────────────────────────────────────────
async function checkLever(slug: string): Promise<{ count: number, jobs: any[] } | null> {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`)
  if (!Array.isArray(data)) return null
  return { count: data.length, jobs: data }
}

// ── Workable ──────────────────────────────────────────────────────────────────
async function checkWorkable(slug: string): Promise<{ count: number, jobs: any[] } | null> {
  const data = await fetchJson(
    `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(slug)}/jobs`,
    { method: 'POST', body: JSON.stringify({ query: '', location: [], department: [], worktype: [], remote: false }) }
  )
  if (!data || !Array.isArray(data.results)) return null
  return { count: data.results.length, jobs: data.results }
}

// ── Known school networks to test ─────────────────────────────────────────────
// Format: { name, platform, slugs/tenants to try, notes }
const NETWORK_TARGETS: Array<{
  networkName: string
  schoolCount: number    // approx number of schools in network
  tests: Array<{
    platform: 'workday' | 'smartrecruiters' | 'greenhouse' | 'lever' | 'workable'
    slug?: string        // for greenhouse/lever/workable/smartrecruiters
    tenant?: string      // for workday
    site?: string        // for workday (optional — will try common defaults)
  }>
}> = [
  // ── Major school groups (50+ schools each) ──────────────────────────────
  {
    networkName: 'GEMS Education',
    schoolCount: 60,
    tests: [
      { platform: 'workday', tenant: 'gems', site: 'GEMS' },
      { platform: 'workday', tenant: 'gemseducation' },
      { platform: 'smartrecruiters', slug: 'GEMSEducation' },
      { platform: 'greenhouse', slug: 'gems' },
      { platform: 'lever', slug: 'gems-education' },
    ],
  },
  {
    networkName: 'Nord Anglia Education',
    schoolCount: 80,
    tests: [
      { platform: 'workday', tenant: 'nordanglia' },
      { platform: 'workday', tenant: 'nord-anglia' },
      { platform: 'smartrecruiters', slug: 'NordAngliaEducation' },
      { platform: 'greenhouse', slug: 'nord-anglia-education' },
      { platform: 'lever', slug: 'nord-anglia-education' },
      { platform: 'lever', slug: 'nordanglia' },
    ],
  },
  {
    networkName: 'Cognita Schools',
    schoolCount: 100,
    tests: [
      { platform: 'workday', tenant: 'cognita' },
      { platform: 'smartrecruiters', slug: 'Cognita' },
      { platform: 'greenhouse', slug: 'cognita' },
      { platform: 'lever', slug: 'cognita' },
      { platform: 'workable', slug: 'cognita' },
    ],
  },
  {
    networkName: 'Inspired Education',
    schoolCount: 80,
    tests: [
      { platform: 'workday', tenant: 'inspirededucation' },
      { platform: 'smartrecruiters', slug: 'InspiredEducationGroup' },
      { platform: 'greenhouse', slug: 'inspired-education' },
      { platform: 'lever', slug: 'inspired-education' },
      { platform: 'workable', slug: 'inspired-education' },
    ],
  },
  {
    networkName: 'Dulwich College International',
    schoolCount: 11,
    tests: [
      { platform: 'workday', tenant: 'dulwich' },
      { platform: 'smartrecruiters', slug: 'DulwichCollegeInternational' },
      { platform: 'greenhouse', slug: 'dulwich-college-international' },
      { platform: 'greenhouse', slug: 'dulwich' },
      { platform: 'lever', slug: 'dulwich-college-international' },
    ],
  },
  {
    networkName: 'Harrow International Schools',
    schoolCount: 12,
    tests: [
      { platform: 'workday', tenant: 'harrow' },
      { platform: 'smartrecruiters', slug: 'HarrowInternational' },
      { platform: 'greenhouse', slug: 'harrow' },
      { platform: 'lever', slug: 'harrow-international' },
      { platform: 'workable', slug: 'harrow' },
    ],
  },
  {
    networkName: 'ISS (International Schools Services)',
    schoolCount: 200,  // ~200 partner schools
    tests: [
      { platform: 'workday', tenant: 'iss' },
      { platform: 'workday', tenant: 'issintl' },
      { platform: 'smartrecruiters', slug: 'InternationalSchoolsServices' },
      { platform: 'greenhouse', slug: 'iss' },
      { platform: 'lever', slug: 'iss' },
    ],
  },
  {
    networkName: 'Fieldwork Education (IPC)',
    schoolCount: 30,
    tests: [
      { platform: 'workday', tenant: 'fieldwork' },
      { platform: 'smartrecruiters', slug: 'FieldworkEducation' },
      { platform: 'greenhouse', slug: 'fieldwork-education' },
      { platform: 'lever', slug: 'fieldwork-education' },
    ],
  },
  {
    networkName: 'King\'s College Schools',
    schoolCount: 10,
    tests: [
      { platform: 'workday', tenant: 'kingsgroup' },
      { platform: 'smartrecruiters', slug: 'KingsGroup' },
      { platform: 'greenhouse', slug: 'kings-group' },
      { platform: 'lever', slug: 'kings-group' },
      { platform: 'workable', slug: 'kings-group' },
    ],
  },
  {
    networkName: 'The British School Group',
    schoolCount: 8,
    tests: [
      { platform: 'workday', tenant: 'britishschoolgroup' },
      { platform: 'smartrecruiters', slug: 'BritishSchoolGroup' },
      { platform: 'greenhouse', slug: 'british-school-group' },
      { platform: 'lever', slug: 'british-school-group' },
    ],
  },
  {
    networkName: 'Wellington College International',
    schoolCount: 10,
    tests: [
      { platform: 'workday', tenant: 'wellingtoncollegeinternational' },
      { platform: 'smartrecruiters', slug: 'WellingtonCollegeInternational' },
      { platform: 'greenhouse', slug: 'wellington-college' },
      { platform: 'lever', slug: 'wellington-college' },
    ],
  },
  {
    networkName: 'Repton School (International)',
    schoolCount: 8,
    tests: [
      { platform: 'smartrecruiters', slug: 'ReptonGroup' },
      { platform: 'greenhouse', slug: 'repton' },
      { platform: 'lever', slug: 'repton-school' },
      { platform: 'workable', slug: 'repton' },
    ],
  },
  {
    networkName: 'ACS International Schools',
    schoolCount: 4,
    tests: [
      { platform: 'workday', tenant: 'acsinternational' },
      { platform: 'smartrecruiters', slug: 'ACSInternationalSchools' },
      { platform: 'greenhouse', slug: 'acs-international' },
      { platform: 'lever', slug: 'acs-international' },
    ],
  },
  {
    networkName: 'Malvern College International',
    schoolCount: 8,
    tests: [
      { platform: 'smartrecruiters', slug: 'MalvernCollegeInternational' },
      { platform: 'greenhouse', slug: 'malvern-college' },
      { platform: 'lever', slug: 'malvern-college' },
      { platform: 'workable', slug: 'malvern-college' },
    ],
  },
  {
    networkName: 'SABIS International Schools',
    schoolCount: 70,
    tests: [
      { platform: 'workday', tenant: 'sabis' },
      { platform: 'smartrecruiters', slug: 'SABIS' },
      { platform: 'greenhouse', slug: 'sabis' },
      { platform: 'lever', slug: 'sabis' },
      { platform: 'workable', slug: 'sabis' },
    ],
  },
  {
    networkName: 'Taaleem (UAE)',
    schoolCount: 12,
    tests: [
      { platform: 'workday', tenant: 'taaleem' },
      { platform: 'smartrecruiters', slug: 'Taaleem' },
      { platform: 'greenhouse', slug: 'taaleem' },
      { platform: 'lever', slug: 'taaleem' },
      { platform: 'workable', slug: 'taaleem' },
    ],
  },
  {
    networkName: 'ADEC / Abu Dhabi Schools',
    schoolCount: 20,
    tests: [
      { platform: 'workday', tenant: 'adec' },
      { platform: 'smartrecruiters', slug: 'ADEC' },
      { platform: 'greenhouse', slug: 'adec' },
    ],
  },
  {
    networkName: 'Varkey Foundation / GEMS Legacy',
    schoolCount: 15,
    tests: [
      { platform: 'smartrecruiters', slug: 'VarkeyFoundation' },
      { platform: 'greenhouse', slug: 'varkey-foundation' },
      { platform: 'lever', slug: 'varkey-foundation' },
    ],
  },
  {
    networkName: 'CAT Global Schools',
    schoolCount: 20,
    tests: [
      { platform: 'workday', tenant: 'catglobal' },
      { platform: 'smartrecruiters', slug: 'CATGlobal' },
      { platform: 'greenhouse', slug: 'cat-schools' },
      { platform: 'lever', slug: 'cat-schools' },
    ],
  },
  {
    networkName: 'Maple Leaf Schools (Canada/China)',
    schoolCount: 25,
    tests: [
      { platform: 'workday', tenant: 'mapleleaf' },
      { platform: 'smartrecruiters', slug: 'MapleLeafSchools' },
      { platform: 'greenhouse', slug: 'maple-leaf' },
      { platform: 'lever', slug: 'maple-leaf-educational-systems' },
    ],
  },
  {
    networkName: 'Carfax Education',
    schoolCount: 8,
    tests: [
      { platform: 'greenhouse', slug: 'carfax' },
      { platform: 'lever', slug: 'carfax-education' },
      { platform: 'workable', slug: 'carfax-education' },
    ],
  },
  {
    networkName: 'Windmill International Schools',
    schoolCount: 15,
    tests: [
      { platform: 'greenhouse', slug: 'windmill' },
      { platform: 'lever', slug: 'windmill-education' },
      { platform: 'workable', slug: 'windmill' },
    ],
  },
  {
    networkName: 'Raha International School / ESOL',
    schoolCount: 10,
    tests: [
      { platform: 'workday', tenant: 'esol' },
      { platform: 'workday', tenant: 'esolgroup' },
      { platform: 'smartrecruiters', slug: 'ESOLGroup' },
      { platform: 'greenhouse', slug: 'esol-education' },
      { platform: 'lever', slug: 'esol-education' },
    ],
  },
  {
    networkName: 'Innoventures Education (UAE)',
    schoolCount: 8,
    tests: [
      { platform: 'workday', tenant: 'innoventures' },
      { platform: 'smartrecruiters', slug: 'InnoventuresEducation' },
      { platform: 'greenhouse', slug: 'innoventures' },
      { platform: 'lever', slug: 'innoventures' },
    ],
  },
  {
    networkName: 'The English College Group',
    schoolCount: 5,
    tests: [
      { platform: 'greenhouse', slug: 'english-college' },
      { platform: 'lever', slug: 'english-college' },
      { platform: 'workable', slug: 'english-college' },
    ],
  },
  {
    networkName: 'Bright Riders School (UAE)',
    schoolCount: 5,
    tests: [
      { platform: 'smartrecruiters', slug: 'BrightRidersSchool' },
      { platform: 'greenhouse', slug: 'bright-riders' },
      { platform: 'lever', slug: 'bright-riders' },
    ],
  },
  {
    networkName: 'International School of London Group',
    schoolCount: 4,
    tests: [
      { platform: 'greenhouse', slug: 'isl' },
      { platform: 'greenhouse', slug: 'isl-group' },
      { platform: 'lever', slug: 'isl-group' },
      { platform: 'workable', slug: 'isl-group' },
    ],
  },
  {
    networkName: 'ENGIE / Academie de Paris International',
    schoolCount: 5,
    tests: [
      { platform: 'lever', slug: 'academie-paris' },
      { platform: 'workable', slug: 'academie-paris' },
    ],
  },
  {
    networkName: 'Singapore American School',
    schoolCount: 1,
    tests: [
      { platform: 'greenhouse', slug: 'sas' },
      { platform: 'greenhouse', slug: 'singaporeamericanschool' },
    ],
  },
  {
    networkName: 'International School Manila',
    schoolCount: 1,
    tests: [
      { platform: 'greenhouse', slug: 'ism' },
    ],
  },
  {
    networkName: 'Northbridge International School Cambodia',
    schoolCount: 1,
    tests: [
      { platform: 'greenhouse', slug: 'nisc' },
    ],
  },
  {
    networkName: 'American Community School (Beirut)',
    schoolCount: 1,
    tests: [
      { platform: 'greenhouse', slug: 'acs-beirut' },
      { platform: 'lever', slug: 'acs-beirut' },
      { platform: 'workable', slug: 'acs-beirut' },
    ],
  },
  {
    networkName: 'Aga Khan Academies',
    schoolCount: 10,
    tests: [
      { platform: 'workday', tenant: 'agakhaneducation' },
      { platform: 'smartrecruiters', slug: 'AgaKhanAcademies' },
      { platform: 'greenhouse', slug: 'aga-khan-academies' },
      { platform: 'lever', slug: 'aga-khan-academies' },
    ],
  },
  {
    networkName: 'Deutsche Schulen Abroad',
    schoolCount: 20,
    tests: [
      { platform: 'smartrecruiters', slug: 'DeutscheSchule' },
      { platform: 'workable', slug: 'deutsche-schule' },
    ],
  },
  {
    networkName: 'Rawabi Holding (Saudi Arabia Schools)',
    schoolCount: 10,
    tests: [
      { platform: 'workday', tenant: 'rawabi' },
      { platform: 'smartrecruiters', slug: 'Rawabi' },
    ],
  },
  {
    networkName: 'BSME (British Schools Middle East)',
    schoolCount: 30,
    tests: [
      { platform: 'workday', tenant: 'bsme' },
      { platform: 'smartrecruiters', slug: 'BSME' },
      { platform: 'greenhouse', slug: 'bsme' },
    ],
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  console.log('Connected to MongoDB')
  console.log(`Testing ${NETWORK_TARGETS.length} school networks for ATS platforms...\n`)
  if (DRY_RUN) console.log('DRY RUN — results printed but not saved\n')

  const found: Array<{
    networkName: string
    platform: string
    slug: string
    jobCount: number
    details: string
  }> = []

  for (const network of NETWORK_TARGETS) {
    if (PLATFORM_FILTER && !network.tests.some(t => t.platform === PLATFORM_FILTER)) continue

    let discovered = false
    for (const test of network.tests) {
      if (PLATFORM_FILTER && test.platform !== PLATFORM_FILTER) continue

      let result: { count: number, jobs: any[], wdNum?: number, site?: string } | null = null
      let effectiveSlug = ''

      if (test.platform === 'workday') {
        const r = await checkWorkdayAllInstances(test.tenant!, test.site)
        if (r) {
          result = { count: r.count, jobs: r.jobs, wdNum: r.wdNum, site: r.site }
          effectiveSlug = `${test.tenant}/${r.site} (wd${r.wdNum})`
        }
        await delay(DELAY_MS)
      } else if (test.platform === 'smartrecruiters') {
        const r = await checkSmartRecruiters(test.slug!)
        if (r) { result = r; effectiveSlug = test.slug! }
        await delay(DELAY_MS)
      } else if (test.platform === 'greenhouse') {
        const r = await checkGreenhouse(test.slug!)
        if (r) { result = r; effectiveSlug = test.slug! }
        await delay(DELAY_MS)
      } else if (test.platform === 'lever') {
        const r = await checkLever(test.slug!)
        if (r) { result = r; effectiveSlug = test.slug! }
        await delay(DELAY_MS)
      } else if (test.platform === 'workable') {
        const r = await checkWorkable(test.slug!)
        if (r) { result = r; effectiveSlug = test.slug! }
        await delay(DELAY_MS)
      }

      if (result !== null) {
        const details = result.jobs.slice(0, 3).map((j: any) => {
          const title = j.title || j.name || j.text || j.postingTitle || '?'
          const location = j.location?.name || j.location || j.office?.location || '?'
          return `  • ${title} @ ${location}`
        }).join('\n')

        console.log(`✅ ${test.platform.toUpperCase().padEnd(16)} ${network.networkName}`)
        console.log(`   slug: ${effectiveSlug}  |  ${result.count} jobs`)
        if (details) console.log(details)
        console.log()

        found.push({
          networkName: network.networkName,
          platform: test.platform,
          slug: effectiveSlug,
          jobCount: result.count,
          details,
        })

        if (!DRY_RUN) {
          // Update all schools that belong to this network
          // (if networkGroup field is set on school documents)
          const updateRes = await School.updateMany(
            { networkGroup: network.networkName },
            {
              $set: {
                atsPlatform: test.platform,
                atsNetworkSlug: effectiveSlug,
                atsDiscoveredAt: new Date(),
              }
            }
          )
          if ((updateRes as any).modifiedCount > 0) {
            console.log(`   → Updated ${(updateRes as any).modifiedCount} schools in MongoDB`)
          }
        }

        discovered = true
        break
      }
    }

    if (!discovered) {
      process.stdout.write(`  ✗ ${network.networkName} — not found on any platform\n`)
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log('Network ATS Discovery Complete')
  console.log(`  Networks tested:  ${NETWORK_TARGETS.length}`)
  console.log(`  ATS platforms found: ${found.length}`)
  console.log()
  if (found.length > 0) {
    console.log('Found:')
    for (const f of found) {
      console.log(`  ${f.platform.padEnd(16)} ${f.networkName} — ${f.jobCount} jobs @ ${f.slug}`)
    }
  }
  console.log()
  console.log('Next step: Update ats-crawler.ts to pull jobs from discovered network accounts')

  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
