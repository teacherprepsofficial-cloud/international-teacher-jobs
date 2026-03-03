import * as crypto from 'crypto'
import { CrawledJob } from './types'
import { getRegionForCountryCode } from '@/lib/regions'

// Country name → ISO code mapping for common international school locations
const COUNTRY_CODE_MAP: Record<string, string> = {
  'united arab emirates': 'AE', 'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
  'saudi arabia': 'SA', 'qatar': 'QA', 'bahrain': 'BH', 'oman': 'OM', 'kuwait': 'KW',
  'china': 'CN', 'hong kong': 'HK', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'thailand': 'TH', 'vietnam': 'VN', 'malaysia': 'MY', 'singapore': 'SG',
  'indonesia': 'ID', 'philippines': 'PH', 'taiwan': 'TW', 'india': 'IN',
  'egypt': 'EG', 'morocco': 'MA', 'nigeria': 'NG', 'kenya': 'KE', 'south africa': 'ZA',
  'ghana': 'GH', 'tanzania': 'TZ', 'ethiopia': 'ET', 'uganda': 'UG', 'rwanda': 'RW',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
  'germany': 'DE', 'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'netherlands': 'NL',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'portugal': 'PT', 'ireland': 'IE',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI', 'poland': 'PL',
  'czech republic': 'CZ', 'czechia': 'CZ', 'hungary': 'HU', 'romania': 'RO',
  'greece': 'GR', 'turkey': 'TR', 'russia': 'RU',
  'united states': 'US', 'usa': 'US', 'canada': 'CA', 'mexico': 'MX',
  'brazil': 'BR', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
  'australia': 'AU', 'new zealand': 'NZ',
  'cambodia': 'KH', 'myanmar': 'MM', 'laos': 'LA', 'brunei': 'BN',
  'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK', 'nepal': 'NP',
  'jordan': 'JO', 'lebanon': 'LB', 'iraq': 'IQ', 'iran': 'IR', 'israel': 'IL',
  'luxembourg': 'LU', 'monaco': 'MC', 'malta': 'MT', 'cyprus': 'CY',
  'georgia': 'GE', 'armenia': 'AM', 'azerbaijan': 'AZ', 'uzbekistan': 'UZ', 'kazakhstan': 'KZ',
  'costa rica': 'CR', 'panama': 'PA', 'ecuador': 'EC', 'uruguay': 'UY', 'paraguay': 'PY',
  'bolivia': 'BO', 'venezuela': 'VE', 'guatemala': 'GT', 'honduras': 'HN',
  'el salvador': 'SV', 'nicaragua': 'NI', 'dominican republic': 'DO', 'jamaica': 'JM',
  'trinidad and tobago': 'TT', 'puerto rico': 'PR', 'cuba': 'CU', 'haiti': 'HT',
  'senegal': 'SN', 'ivory coast': 'CI', 'cameroon': 'CM', 'mozambique': 'MZ',
  'zambia': 'ZM', 'zimbabwe': 'ZW', 'botswana': 'BW', 'namibia': 'NA', 'madagascar': 'MG',
  'mauritius': 'MU', 'angola': 'AO', 'democratic republic of congo': 'CD', 'congo': 'CG',
  'tunisia': 'TN', 'algeria': 'DZ', 'libya': 'LY', 'sudan': 'SD',
  'mongolia': 'MN', 'fiji': 'FJ', 'papua new guinea': 'PG',
}

// UK cities, regions, and postcodes that TES lists without "United Kingdom"
const UK_LOCATIONS = new Set([
  'london', 'manchester', 'birmingham', 'leeds', 'liverpool', 'bristol', 'sheffield',
  'newcastle', 'nottingham', 'leicester', 'coventry', 'bradford', 'cardiff', 'edinburgh',
  'glasgow', 'belfast', 'oxford', 'cambridge', 'brighton', 'reading', 'southampton',
  'portsmouth', 'plymouth', 'derby', 'wolverhampton', 'bath', 'york', 'exeter', 'norwich',
  'canterbury', 'chester', 'winchester', 'durham', 'salisbury', 'lincoln', 'carlisle',
  'worcester', 'hereford', 'gloucester', 'peterborough', 'lancaster', 'st albans',
  // London boroughs and areas
  'shoreditch', 'islington', 'hackney', 'camden', 'westminster', 'kensington', 'chelsea',
  'fulham', 'hammersmith', 'brixton', 'peckham', 'dalston', 'stratford', 'greenwich',
  'lewisham', 'croydon', 'wimbledon', 'richmond', 'ealing', 'harrow', 'barnet',
  'enfield', 'walthamstow', 'tottenham', 'finsbury', 'bermondsey', 'southwark',
  'lambeth', 'wandsworth', 'merton', 'bromley', 'bexley', 'havering', 'redbridge',
  // Counties and regions
  'surrey', 'kent', 'essex', 'sussex', 'hampshire', 'berkshire', 'buckinghamshire',
  'hertfordshire', 'bedfordshire', 'oxfordshire', 'wiltshire', 'dorset', 'devon',
  'cornwall', 'somerset', 'norfolk', 'suffolk', 'cambridgeshire', 'lincolnshire',
  'yorkshire', 'lancashire', 'cheshire', 'staffordshire', 'warwickshire', 'shropshire',
  'derbyshire', 'leicestershire', 'northamptonshire', 'nottinghamshire', 'rutland',
  'cumbria', 'northumberland', 'tyne and wear', 'west midlands', 'east midlands',
  'merseyside', 'greater manchester', 'south yorkshire', 'west yorkshire',
  'bury', 'bolton', 'rochdale', 'oldham', 'stockport', 'wigan', 'salford',
  'oxted',
])

function isUkLocation(text: string): boolean {
  const lower = text.toLowerCase().trim()
  // Direct match
  if (UK_LOCATIONS.has(lower)) return true
  // UK postcode pattern (e.g., "TN14 6AE", "SW1A 1AA")
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(lower)) return true
  return false
}

function resolveCountryCode(location: string): { city: string; country: string; countryCode: string } {
  // TES displayLocation is often "City, Country" or just "Country"
  const parts = location.split(',').map(p => p.trim())

  let city = 'Unknown'
  let country = 'Unknown'
  let countryCode = 'XX'

  if (parts.length >= 2) {
    city = parts[0]
    country = parts[parts.length - 1]
  } else if (parts.length === 1) {
    country = parts[0]
    city = parts[0]
  }

  // Try to match country to code
  const countryLower = country.toLowerCase()
  if (COUNTRY_CODE_MAP[countryLower]) {
    countryCode = COUNTRY_CODE_MAP[countryLower]
  } else {
    // Try matching against all keys as substring
    for (const [key, code] of Object.entries(COUNTRY_CODE_MAP)) {
      if (countryLower.includes(key) || key.includes(countryLower)) {
        countryCode = code
        break
      }
    }
  }

  // If still unresolved, check if the location looks like a UK city/region/postcode
  if (countryCode === 'XX') {
    for (const part of parts) {
      if (isUkLocation(part)) {
        countryCode = 'GB'
        country = 'United Kingdom'
        city = parts[0]
        break
      }
    }
  }

  return { city, country, countryCode }
}

function categorizePosition(title: string): 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff' {
  const lower = title.toLowerCase()

  // Admin/leadership roles
  if (/\b(head\s*(of\s*school)?|principal|director|dean|coordinator|head\s*teacher|deputy\s*head|vice\s*principal|assistant\s*head|leader)\b/.test(lower)) {
    return 'admin'
  }

  // Support staff
  if (/\b(librarian|counselor|counsellor|nurse|receptionist|secretary|assistant|aide|technician|it\s*support|maintenance)\b/.test(lower)) {
    return 'support-staff'
  }

  // Elementary / Primary
  if (/\b(elementary|primary|early\s*years|eyfs|kindergarten|pre-?k|nursery|ks1|key\s*stage\s*1|year\s*[1-6]\b|grade\s*[1-5]\b|infant)\b/.test(lower)) {
    return 'elementary'
  }

  // Middle school
  if (/\b(middle\s*school|ks2|ks3|key\s*stage\s*[23]|year\s*[7-9]\b|grade\s*[6-8]\b|junior)\b/.test(lower)) {
    return 'middle-school'
  }

  // High school / Secondary
  if (/\b(secondary|high\s*school|ks4|ks5|key\s*stage\s*[45]|sixth\s*form|a[\s-]*level|ib|igcse|year\s*1[0-3]\b|grade\s*(9|10|11|12)\b|senior)\b/.test(lower)) {
    return 'high-school'
  }

  // Default — if title mentions "teacher" without grade level hints, default to high-school
  // since many international postings are secondary level
  return 'high-school'
}

function mapContractType(contractTypes: string[], contractTerms: string[]): 'Full-time' | 'Part-time' | 'Contract' {
  const types = (contractTypes || []).map(t => t.toLowerCase())
  const terms = (contractTerms || []).map(t => t.toLowerCase())

  if (types.includes('part time') || types.includes('part-time')) {
    return 'Part-time'
  }
  if (terms.includes('fixed term') || terms.includes('casual') || terms.includes('temporary')) {
    return 'Contract'
  }
  return 'Full-time'
}

export function computeContentHash(position: string, schoolName: string, sourceUrl: string): string {
  const input = `${position.trim().toLowerCase()}|${schoolName.trim().toLowerCase()}|${sourceUrl.trim().toLowerCase()}`
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function parseTesNextData(html: string, baseUrl: string): CrawledJob[] {
  const jobs: CrawledJob[] = []

  // Extract __NEXT_DATA__ JSON from the page
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i)
  if (!nextDataMatch) {
    console.log('[TES Parser] No __NEXT_DATA__ found in page')
    return jobs
  }

  let nextData: any
  try {
    nextData = JSON.parse(nextDataMatch[1])
  } catch (e) {
    console.error('[TES Parser] Failed to parse __NEXT_DATA__ JSON:', e)
    return jobs
  }

  // Navigate to the jobs array inside trpcState
  // Path: props.pageProps.trpcState.json.queries[0].state.data.jobs
  const queries = nextData?.props?.pageProps?.trpcState?.json?.queries
  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    console.log('[TES Parser] No queries found in trpcState')
    return jobs
  }

  // Find the query that contains jobs data
  let jobsArray: any[] = []
  for (const query of queries) {
    const data = query?.state?.data
    if (data?.jobs && Array.isArray(data.jobs)) {
      jobsArray = data.jobs
      break
    }
  }

  if (jobsArray.length === 0) {
    console.log('[TES Parser] No jobs array found in queries')
    return jobs
  }

  for (const raw of jobsArray) {
    try {
      const title = raw.title?.trim()
      const employer = raw.employer?.name?.trim()
      const canonicalUrl = raw.canonicalUrl

      if (!title || !employer || !canonicalUrl) continue

      const sourceUrl = `${baseUrl}${canonicalUrl}`
      const location = raw.displayLocation || ''
      const { city, country, countryCode } = resolveCountryCode(location)

      const description = raw.shortDescription?.trim() || ''
      const salary = raw.salary?.description?.trim() || raw.salary?.range?.trim() || undefined
      const contractType = mapContractType(raw.contractTypes || [], raw.contractTerms || [])
      const positionCategory = categorizePosition(title)

      // Try to extract start date
      let startDate: string | undefined
      if (raw.advert?.startDate) {
        try {
          startDate = new Date(raw.advert.startDate).toISOString().split('T')[0]
        } catch { /* ignore invalid dates */ }
      }

      const contentHash = computeContentHash(title, employer, sourceUrl)

      jobs.push({
        position: title,
        schoolName: employer,
        city,
        country,
        countryCode,
        region: getRegionForCountryCode(countryCode),
        description,
        sourceUrl,
        sourceKey: `tes-${raw.id}`,
        salary,
        contractType,
        startDate: startDate || 'TBD',
        positionCategory,
      })
    } catch (err) {
      console.error('[TES Parser] Error parsing job entry:', err)
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// SeekTeachers parser
// seekteachers.com — international school job board with server-rendered HTML
// Each job card has: title in <span style="font-size: 24px">, location text,
// link to /job-detail.asp?job_id=NNNNN, start date, salary
// ---------------------------------------------------------------------------
export function parseSeekTeachersHtml(html: string, baseUrl: string): CrawledJob[] {
  const jobs: CrawledJob[] = []

  // Match each job listing block: starts with titlebar-listing, contains job link
  // Pattern: find all job-detail links with their surrounding context
  const jobBlockRegex = /<a\s+href="[^"]*job-detail\.asp\?job_id=(\d+)"[^>]*>\s*<span[^>]*style="font-size:\s*24px[^"]*"[^>]*>([\s\S]*?)<\/span>([\s\S]*?)<\/a>/gi

  let match
  while ((match = jobBlockRegex.exec(html)) !== null) {
    try {
      const jobId = match[1]
      const titleRaw = match[2].replace(/<[^>]+>/g, '').trim()
      const locationRaw = match[3].replace(/<[^>]+>/g, '').replace(/\s*-\s*New this week\s*/i, '').trim()

      if (!titleRaw || !jobId) continue

      // Parse title — often "Position - City - Start Date"
      const position = titleRaw

      // Parse location — format: "Permanent Post in City, Country, Region"
      let contractType: 'Full-time' | 'Part-time' | 'Contract' = 'Full-time'
      let locationStr = locationRaw
      const postMatch = locationRaw.match(/^(Permanent Post|Fixed Term|Contract|Part Time|Temporary)\s+in\s+(.+)$/i)
      if (postMatch) {
        const postType = postMatch[1].toLowerCase()
        if (postType.includes('fixed') || postType.includes('contract') || postType.includes('temporary')) {
          contractType = 'Contract'
        } else if (postType.includes('part')) {
          contractType = 'Part-time'
        }
        locationStr = postMatch[2]
      }

      // Location is "City, Country, Region" — take city and country
      const locParts = locationStr.split(',').map(p => p.trim())
      const city = locParts[0] || 'Unknown'
      const country = locParts.length >= 2 ? locParts[1] : locParts[0]
      const { countryCode } = resolveCountryCode(country)

      const sourceUrl = `${baseUrl}/job-detail.asp?job_id=${jobId}`

      // Try to find description, start date, and salary after this job block
      let startDate: string | undefined
      let salary: string | undefined
      let description = ''
      const afterBlock = html.slice(match.index + match[0].length, match.index + match[0].length + 2000)

      // Extract description from the margin-top div
      const descMatch = afterBlock.match(/<div\s+class="margin-top">([\s\S]*?)<\/div>/i)
      if (descMatch) {
        description = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
      }

      const startDateMatch = afterBlock.match(/Start Date:<\/span>\s*<b>(.*?)<\/b>/i)
      if (startDateMatch) {
        startDate = startDateMatch[1].trim()
      }

      const salaryMatch = afterBlock.match(/<span><b>(.*?)<\/b>\s*<\/span>/i)
      if (salaryMatch) {
        const salaryText = salaryMatch[1].trim()
        if (salaryText && !salaryText.includes('negotiable')) {
          salary = salaryText
        }
      }

      jobs.push({
        position,
        schoolName: 'SeekTeachers Listing',
        city,
        country,
        countryCode: countryCode !== 'XX' ? countryCode : 'XX',
        region: getRegionForCountryCode(countryCode),
        description,
        sourceUrl,
        sourceKey: `seekteachers-${jobId}`,
        salary,
        contractType,
        startDate: startDate || 'TBD',
        positionCategory: categorizePosition(position),
      })
    } catch (err) {
      console.error('[SeekTeachers Parser] Error parsing job entry:', err)
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// TIE Online parser
// tieonline.com — "The International Educator" job board (ColdFusion)
// HTML structure: <li><a href="/job_ad_details.cfm?JobID=NNNNN">Title (Country)</a></li>
// ---------------------------------------------------------------------------
export function parseTieOnlineHtml(html: string, baseUrl: string): CrawledJob[] {
  const jobs: CrawledJob[] = []

  // Match all job links: /job_ad_details.cfm?JobID=NNNNN
  const jobLinkRegex = /<a\s+href="\/job_ad_details\.cfm\?JobID=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi

  const seen = new Set<string>() // dedupe within page (same job can appear in sidebar + main)
  let match
  while ((match = jobLinkRegex.exec(html)) !== null) {
    try {
      const jobId = match[1]
      if (seen.has(jobId)) continue
      seen.add(jobId)

      const rawText = match[2].replace(/<[^>]+>/g, '').trim()
      if (!rawText) continue

      // Parse "Position Title (Country)" format
      const titleCountryMatch = rawText.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
      let position: string
      let country: string

      if (titleCountryMatch) {
        position = titleCountryMatch[1].trim()
        country = titleCountryMatch[2].trim()
      } else {
        position = rawText
        country = 'Unknown'
      }

      if (!position) continue

      const { countryCode } = resolveCountryCode(country)
      const sourceUrl = `${baseUrl}/job_ad_details.cfm?JobID=${jobId}`

      jobs.push({
        position,
        schoolName: 'TIE Online Listing',
        city: country, // TIE only shows country, not city
        country,
        countryCode: countryCode !== 'XX' ? countryCode : 'XX',
        region: getRegionForCountryCode(countryCode),
        description: '',
        sourceUrl,
        sourceKey: `tie-${jobId}`,
        contractType: 'Full-time',
        positionCategory: categorizePosition(position),
      })
    } catch (err) {
      console.error('[TIE Parser] Error parsing job entry:', err)
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// International School Jobs (ISJ) XML feed parser
// internationalschooljobs.com — provides a /feed.xml with structured job data
// Each <job> has: title, referencenumber, company, city, country, description
// ---------------------------------------------------------------------------
export function parseIsjFeedXml(xml: string, baseUrl: string): CrawledJob[] {
  const jobs: CrawledJob[] = []

  // Match each <job>...</job> block
  const jobBlockRegex = /<job>([\s\S]*?)<\/job>/gi

  let match
  while ((match = jobBlockRegex.exec(xml)) !== null) {
    try {
      const block = match[1]

      const extract = (tag: string): string => {
        const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'is'))
        return m ? m[1].trim() : ''
      }

      const title = extract('title')
      const refNum = extract('referencenumber')
      const company = extract('company')
      const city = extract('city')
      const country = extract('country')
      const descHtml = extract('description')

      if (!title || !refNum) continue

      const { countryCode } = resolveCountryCode(country || city)

      // Strip HTML from description, keep first 500 chars
      const description = descHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500)

      const sourceUrl = `${baseUrl}/jobs/${refNum}`

      jobs.push({
        position: title,
        schoolName: company || 'International School Jobs Listing',
        city: city || 'Unknown',
        country: country || 'Unknown',
        countryCode: countryCode !== 'XX' ? countryCode : 'XX',
        region: getRegionForCountryCode(countryCode),
        description,
        sourceUrl,
        sourceKey: `isj-${refNum}`,
        contractType: 'Full-time',
        positionCategory: categorizePosition(title),
      })
    } catch (err) {
      console.error('[ISJ Parser] Error parsing job entry:', err)
    }
  }

  return jobs
}
