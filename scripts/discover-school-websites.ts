/**
 * School Website Discovery Script
 *
 * For each school in our directory that lacks a website URL, this script
 * probes candidate domain names and career-page paths to discover:
 *   1. The school's primary website domain
 *   2. Their careers/jobs page URL
 *   3. What ATS (if any) powers their career page (Workday, iCIMS, Taleo, etc.)
 *
 * METHOD: HTTP HEAD probes on generated domain candidates.
 * - No web scraping of content (until stage 2)
 * - Only public pages are tested
 * - Rate-limited and polite (concurrent but capped)
 *
 * Stores results in School.website and School.careerPageUrl fields.
 *
 * Run: npx tsx scripts/discover-school-websites.ts
 * Options:
 *   --dry-run      Print without saving
 *   --limit N      Process first N schools
 *   --offset N     Skip first N schools (for resuming)
 *   --country XX   Only process schools in this country code
 *   --concurrency N  Parallel probes (default 15, max 30)
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SchoolSchema = new mongoose.Schema({
  name: String, slug: String, country: String, countryCode: String,
  city: String, region: String,
  website: String, careerPageUrl: String, atsDetected: String,
  atsPlatform: String, atsSlug: String,
  websiteDiscoveredAt: Date,
}, { strict: false, timestamps: true })

const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : 0 })()
const OFFSET = (() => { const i = args.indexOf('--offset'); return i !== -1 ? parseInt(args[i + 1]) : 0 })()
const COUNTRY_FILTER = (() => { const i = args.indexOf('--country'); return i !== -1 ? args[i + 1].toUpperCase() : null })()
const CONCURRENCY = (() => { const i = args.indexOf('--concurrency'); return i !== -1 ? Math.min(parseInt(args[i + 1]), 30) : 15 })()

const HEAD_TIMEOUT_MS = 5_000   // enough time for slow school servers
const GET_TIMEOUT_MS = 8_000    // page fetch can be slower
const OUTER_CONCURRENCY = 4     // 4 schools at a time — validated stable at this level

// ── Country code → primary TLD(s) ─────────────────────────────────────────────
const COUNTRY_TLD: Record<string, string[]> = {
  AE: ['ae', 'sch.ae'],
  AF: ['af'],
  AR: ['edu.ar', 'com.ar'],
  AU: ['edu.au', 'com.au'],
  AT: ['at', 'ac.at'],
  AZ: ['az'],
  BD: ['edu.bd'],
  BE: ['be'],
  BG: ['bg'],
  BH: ['bh', 'edu.bh'],
  BO: ['edu.bo'],
  BR: ['com.br', 'org.br'],
  BN: ['edu.bn'],
  CA: ['ca'],
  CH: ['ch'],
  CL: ['edu.cl', 'cl'],
  CN: ['cn', 'com.cn'],
  CO: ['edu.co', 'co'],
  CR: ['ed.cr'],
  CY: ['ac.cy', 'cy'],
  CZ: ['cz'],
  DE: ['de'],
  DK: ['dk'],
  EC: ['edu.ec'],
  EG: ['edu.eg'],
  ES: ['es', 'edu.es'],
  ET: ['edu.et'],
  FI: ['fi'],
  FR: ['fr'],
  GB: ['co.uk', 'sch.uk', 'ac.uk', 'org.uk'],
  GE: ['ge'],
  GH: ['edu.gh', 'com.gh'],
  GR: ['gr'],
  GT: ['edu.gt'],
  HK: ['edu.hk', 'hk', 'com.hk'],
  HU: ['hu'],
  ID: ['sch.id', 'com.id'],
  IN: ['edu.in', 'ac.in', 'com.in'],
  IQ: ['edu.iq'],
  IR: ['ac.ir'],
  IS: ['is'],
  IL: ['ac.il', 'com.il'],
  IT: ['it', 'edu.it'],
  JO: ['edu.jo', 'jo'],
  JP: ['ed.jp', 'ac.jp', 'jp'],
  KE: ['ac.ke', 'co.ke'],
  KG: ['edu.kg'],
  KH: ['edu.kh'],
  KR: ['ac.kr', 'kr'],
  KW: ['edu.kw'],
  KZ: ['edu.kz'],
  LB: ['edu.lb', 'lb'],
  LK: ['ac.lk'],
  MA: ['ac.ma', 'com.ma'],
  MX: ['edu.mx', 'mx', 'com.mx'],
  MY: ['edu.my', 'my'],
  NG: ['edu.ng', 'com.ng'],
  NL: ['nl'],
  NO: ['no'],
  NZ: ['school.nz', 'ac.nz', 'nz'],
  OM: ['edu.om'],
  PA: ['edu.pa'],
  PE: ['edu.pe'],
  PH: ['edu.ph', 'com.ph'],
  PK: ['edu.pk', 'com.pk'],
  PL: ['edu.pl', 'pl'],
  PT: ['pt'],
  QA: ['edu.qa', 'com.qa'],
  RO: ['ro'],
  RS: ['edu.rs'],
  RW: ['ac.rw'],
  SA: ['edu.sa', 'com.sa'],
  SE: ['se'],
  SG: ['edu.sg', 'sg', 'com.sg'],
  TH: ['ac.th', 'co.th'],
  TN: ['rnu.tn'],
  TR: ['edu.tr', 'k12.tr'],
  TW: ['edu.tw'],
  TZ: ['ac.tz', 'co.tz'],
  UA: ['ua', 'edu.ua'],
  US: ['edu', 'org', 'com'],
  UZ: ['edu.uz'],
  VN: ['edu.vn'],
  ZA: ['ac.za', 'com.za', 'edu.za'],
  ZM: ['ac.zm'],
  ZW: ['ac.zw'],
}

const COMMON_TLDS = ['org', 'edu', 'com', 'net', 'int', 'school']

// ── Slug generation (minimal, for domain guessing) ────────────────────────────
function toSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function toJoined(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function generateDomainCandidates(name: string, countryCode: string, city?: string): string[] {
  // Strip common words that schools omit from domain names
  const stripped = name
    .toLowerCase()
    .replace(/\b(international|school|academy|college|institute|university|the|of|in|at|for|and|a|an)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const strippedSlug = toSlug(stripped)
  const strippedJoined = toJoined(stripped)
  const fullSlug = toSlug(name)
  const fullJoined = toJoined(name)

  // Acronym from original full name (3+ words)
  const words = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean)
  const acronym = words.length >= 3 ? words.map(w => w[0]).join('') : null

  // City slug for combinations
  const citySlug = city ? toSlug(city.replace(/[^a-z0-9\s]/g, '')) : ''
  const cityJoined = city ? toJoined(city) : ''

  // Build base slugs to try as domain roots
  const bases = new Set<string>([
    fullSlug,
    fullJoined,
    strippedSlug,
    strippedJoined,
  ])
  if (acronym) bases.add(acronym)
  if (citySlug && acronym) { bases.add(`${acronym}-${citySlug}`); bases.add(`${acronym}${cityJoined}`) }
  if (strippedSlug && citySlug) bases.add(`${strippedSlug}-${citySlug}`)

  // Filter garbage (single chars, purely numeric, too long)
  const filteredBases = [...bases].filter(b => b.length >= 3 && b.length <= 40 && !/^\d+$/.test(b))

  // Only take the top 3 country TLDs (most edu-specific first) and top 3 common TLDs
  const countryTlds = (COUNTRY_TLD[countryCode] ?? []).slice(0, 3)
  const topCommonTlds = ['org', 'edu', 'com']

  const candidates: string[] = []

  for (const base of filteredBases) {
    // Country-specific TLDs first (most authoritative)
    for (const tld of countryTlds) {
      candidates.push(`${base}.${tld}`)
    }
    // Universal TLDs
    for (const tld of topCommonTlds) {
      if (!countryTlds.some(ct => ct === tld)) {
        candidates.push(`${base}.${tld}`)
      }
    }
    // Also try .school TLD (modern, used by some intl schools)
    candidates.push(`${base}.school`)
  }

  // Deduplicate preserving order
  return [...new Set(candidates)]
}

// ── Career page path patterns (in priority order) ─────────────────────────────
const CAREER_PATHS = [
  '/careers',
  '/jobs',
  '/employment',
  '/vacancies',
  '/job-openings',
  '/work-with-us',
  '/working-with-us',
  '/join-us',
  '/join-our-team',
  '/opportunities',
  '/career-opportunities',
  '/teaching-positions',
  '/staff-vacancies',
  '/recruitment',
  '/hr',
  '/about/careers',
  '/about/employment',
  '/about/jobs',
  '/about/vacancies',
  '/about-us/careers',
  '/about-us/jobs',
  '/pages/careers',
  '/pages/employment',
]

// ── ATS detection signatures in career page HTML ──────────────────────────────
const ATS_SIGNATURES: Array<{ name: string; patterns: RegExp[] }> = [
  {
    name: 'workday',
    patterns: [/myworkdayjobs\.com/i, /wd\d+\.myworkdayjobs/i, /workday\.com\/wday/i],
  },
  {
    name: 'icims',
    patterns: [/icims\.com/i, /careers\.icims\.com/i],
  },
  {
    name: 'taleo',
    patterns: [/taleo\.net/i, /oraclecloudhcm\.com/i, /talent\.oracle/i],
  },
  {
    name: 'successfactors',
    patterns: [/successfactors\.com/i, /sap\.com.*careers/i],
  },
  {
    name: 'bamboohr',
    patterns: [/bamboohr\.com/i],
  },
  {
    name: 'jobvite',
    patterns: [/jobvite\.com/i],
  },
  {
    name: 'recruitee',
    patterns: [/recruitee\.com/i],
  },
  {
    name: 'greenhouse',
    patterns: [/boards\.greenhouse\.io/i, /greenhouse\.io\/embed/i],
  },
  {
    name: 'lever',
    patterns: [/jobs\.lever\.co/i, /lever\.co\/embed/i],
  },
  {
    name: 'workable',
    patterns: [/apply\.workable\.com/i, /workable\.com\/embed/i],
  },
  {
    name: 'pageup',
    patterns: [/pageuppeople\.com/i, /pageup\.com/i],
  },
  {
    name: 'smartrecruiters',
    patterns: [/smartrecruiters\.com\/embed/i, /jobs\.smartrecruiters\.com/i],
  },
  {
    name: 'teamtailor',
    patterns: [/teamtailor\.com/i, /jobs\.teamtailor/i],
  },
  {
    name: 'breezy',
    patterns: [/breezy\.hr/i],
  },
  {
    name: 'jazz',
    patterns: [/resumatorcdn\.com/i, /applytojob\.com/i],
  },
  {
    name: 'rippling',
    patterns: [/rippling\.com\/job/i],
  },
  {
    name: 'comeet',
    patterns: [/comeet\.co/i],
  },
  {
    name: 'frontline',
    patterns: [/frontlineeducation\.com/i, /applitrack\.com/i, /edjoin\.org/i],
  },
  {
    name: 'veracross',
    patterns: [/veracross\.com/i],
  },
  {
    name: 'schoolspring',
    patterns: [/schoolspring\.com/i],
  },
]

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function headUrl(url: string): Promise<{ ok: boolean; redirectUrl?: string }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchoolDirectoryBot/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(t)
    const redirectUrl = res.url !== url ? res.url : undefined
    return { ok: res.ok || res.status === 405, redirectUrl }  // 405 = method not allowed but server exists
  } catch {
    return { ok: false }
  }
}

async function getHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), GET_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SchoolDirectoryBot/1.0)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function detectAts(html: string): string | null {
  for (const sig of ATS_SIGNATURES) {
    if (sig.patterns.some(p => p.test(html))) {
      return sig.name
    }
  }
  return null
}

function hasJobContent(html: string): boolean {
  const lower = html.toLowerCase()
  const jobKeywords = ['job', 'position', 'vacancy', 'vacancies', 'career', 'employment', 'hiring', 'teacher', 'faculty']
  return jobKeywords.filter(k => lower.includes(k)).length >= 3
}

// ── Concurrent probe helper ───────────────────────────────────────────────────
async function probeDomainsWithLimit<T>(
  tasks: (() => Promise<T | null>)[],
  concurrency: number
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(tasks.length).fill(null)
  let index = 0
  async function worker() {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Verify a domain is actually the school (not a tourism/city site) ─────────
function isSchoolDomain(html: string, schoolName: string): boolean {
  const lower = html.toLowerCase()
  // Must contain school-related keywords
  const hasSchoolKeywords = ['school', 'academy', 'college', 'students', 'teachers',
    'curriculum', 'admissions', 'faculty', 'campus', 'education'].some(k => lower.includes(k))
  if (!hasSchoolKeywords) return false

  // At least one significant word from the school name should appear
  const significantWords = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['international', 'school', 'academy', 'college',
      'institute', 'the', 'for', 'and'].includes(w))
  return significantWords.length === 0 || significantWords.some(w => lower.includes(w))
}

// ── Main discovery ─────────────────────────────────────────────────────────────
async function discoverWebsite(school: any): Promise<{
  website: string
  careerPageUrl: string | null
  atsDetected: string | null
} | null> {
  const candidates = generateDomainCandidates(
    school.name as string,
    school.countryCode as string,
    school.city as string | undefined
  )

  // Stage 1: find live domains (concurrent HEAD probes)
  const domainTasks = candidates.map(c => async () => {
    const url = `https://www.${c}`
    const r = await headUrl(url)
    if (r.ok) return url
    const bare = `https://${c}`
    const r2 = await headUrl(bare)
    if (r2.ok) return bare
    return null
  })

  const domainResults = await probeDomainsWithLimit(domainTasks, CONCURRENCY)
  const liveDomains = domainResults.filter((r): r is string => r !== null)

  // Stage 1b: verify each candidate domain is actually the school
  // Educational TLDs (ac.*, edu.*, sch.*) are trusted without homepage fetch.
  // Generic TLDs (.org, .com, .net) require a school-keyword check.
  const TRUSTED_EDU_TLDS = ['ac.', 'edu.', 'sch.', '.edu', 'k12.', '.school']
  const isTrustedEduDomain = (url: string) =>
    TRUSTED_EDU_TLDS.some(t => url.replace(/^https?:\/\/(www\.)?/, '').includes(t))

  let foundDomain: string | null = null
  for (const domain of liveDomains) {
    if (isTrustedEduDomain(domain)) {
      // Educational TLD — trust it directly, no need to scrape
      foundDomain = domain
      break
    }
    // Generic TLD — fetch homepage and verify it's a school
    const html = await getHtml(domain)
    if (html && isSchoolDomain(html, school.name as string)) {
      foundDomain = domain
      break
    }
  }

  if (!foundDomain) return null

  // Stage 2: find career page on this domain
  const careerTasks = CAREER_PATHS.map(path => async () => {
    const url = `${foundDomain}${path}`
    const r = await headUrl(url)
    if (!r.ok) return null
    return r.redirectUrl ?? url
  })
  const careerResults = await probeDomainsWithLimit(careerTasks, 5)
  const careerPageUrl = careerResults.find(r => r !== null) ?? null

  // Stage 3: if career page found, detect ATS
  let atsDetected: string | null = null
  if (careerPageUrl) {
    const html = await getHtml(careerPageUrl)
    if (html) {
      atsDetected = detectAts(html)
      // If no career page was found but homepage has job content, use homepage
      if (!atsDetected) {
        const homepageHtml = await getHtml(foundDomain)
        if (homepageHtml) {
          atsDetected = detectAts(homepageHtml)
        }
      }
    }
  }

  return {
    website: foundDomain,
    careerPageUrl,
    atsDetected,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  console.log('Connected to MongoDB')

  const query: any = { website: { $exists: false } }
  if (COUNTRY_FILTER) query.countryCode = COUNTRY_FILTER

  let schools = await School.find(query).lean()
  if (OFFSET > 0) schools = schools.slice(OFFSET)
  if (LIMIT > 0) schools = schools.slice(0, LIMIT)

  console.log(`Discovering websites for ${schools.length} schools (concurrency: ${CONCURRENCY})...`)
  if (DRY_RUN) console.log('DRY RUN — no changes saved\n')
  else console.log()

  let found = 0
  let foundWithCareer = 0
  let foundWithAts = 0
  let processed = 0

  // Process schools in parallel batches for speed
  async function processSchool(school: any, idx: number) {
    const progress = `[${OFFSET + idx + 1}/${OFFSET + schools.length}]`
    const result = await discoverWebsite(school)

    if (result) {
      found++
      if (result.careerPageUrl) foundWithCareer++
      if (result.atsDetected) foundWithAts++

      const atsTag = result.atsDetected ? ` → ATS: ${result.atsDetected.toUpperCase()}` : ''
      const careerTag = result.careerPageUrl ? ` 🎯 ${result.careerPageUrl}` : ''
      console.log(`✅ ${progress} ${school.name}`)
      console.log(`   ${result.website}${careerTag}${atsTag}`)

      if (!DRY_RUN) {
        await School.updateOne(
          { _id: school._id },
          {
            $set: {
              website: result.website,
              ...(result.careerPageUrl ? { careerPageUrl: result.careerPageUrl } : {}),
              ...(result.atsDetected ? { atsDetected: result.atsDetected } : {}),
              websiteDiscoveredAt: new Date(),
            }
          }
        )
      }
    }

    processed++
    if (processed % 50 === 0) {
      console.log(`  … ${processed}/${schools.length} schools checked, ${found} found so far`)
    }
  }

  // Run OUTER_CONCURRENCY schools at a time
  let batchIdx = 0
  while (batchIdx < schools.length) {
    const batch = schools.slice(batchIdx, batchIdx + OUTER_CONCURRENCY)
    await Promise.all(batch.map((school, i) => processSchool(school, batchIdx + i)))
    batchIdx += OUTER_CONCURRENCY
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log('Website Discovery Complete')
  console.log(`  Schools checked:      ${schools.length}`)
  console.log(`  Websites found:       ${found} (${Math.round(found / schools.length * 100)}%)`)
  console.log(`  With career page:     ${foundWithCareer}`)
  console.log(`  With ATS detected:    ${foundWithAts}`)

  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
