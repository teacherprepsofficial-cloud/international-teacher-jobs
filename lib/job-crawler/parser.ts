import * as crypto from 'crypto'
import { CrawledJob } from './types'

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
