export const REGIONS = [
  { value: 'middle-east', label: 'Middle East' },
  { value: 'east-asia', label: 'East Asia' },
  { value: 'southeast-asia', label: 'Southeast Asia' },
  { value: 'south-asia', label: 'South Asia' },
  { value: 'central-asia', label: 'Central Asia' },
  { value: 'europe', label: 'Europe' },
  { value: 'africa', label: 'Africa' },
  { value: 'north-america', label: 'North America' },
  { value: 'central-south-america', label: 'Central & South America' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'oceania', label: 'Oceania' },
]

// Map country codes to regions
const COUNTRY_TO_REGION: Record<string, string> = {
  // Middle East
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', BH: 'middle-east',
  OM: 'middle-east', KW: 'middle-east', JO: 'middle-east', LB: 'middle-east',
  IQ: 'middle-east', IR: 'middle-east', IL: 'middle-east',
  // East Asia
  CN: 'east-asia', HK: 'east-asia', JP: 'east-asia', KR: 'east-asia',
  TW: 'east-asia', MN: 'east-asia',
  // Southeast Asia
  TH: 'southeast-asia', VN: 'southeast-asia', MY: 'southeast-asia', SG: 'southeast-asia',
  ID: 'southeast-asia', PH: 'southeast-asia', KH: 'southeast-asia', MM: 'southeast-asia',
  LA: 'southeast-asia', BN: 'southeast-asia',
  // South Asia
  IN: 'south-asia', PK: 'south-asia', BD: 'south-asia', LK: 'south-asia', NP: 'south-asia',
  // Central Asia
  KZ: 'central-asia', UZ: 'central-asia', GE: 'central-asia', AM: 'central-asia', AZ: 'central-asia',
  // Europe
  GB: 'europe', DE: 'europe', FR: 'europe', ES: 'europe', IT: 'europe', NL: 'europe',
  CH: 'europe', AT: 'europe', BE: 'europe', PT: 'europe', IE: 'europe', SE: 'europe',
  NO: 'europe', DK: 'europe', FI: 'europe', PL: 'europe', CZ: 'europe', HU: 'europe',
  RO: 'europe', GR: 'europe', TR: 'europe', RU: 'europe', UA: 'europe', SK: 'europe',
  BG: 'europe', LU: 'europe', CY: 'europe', MT: 'europe', MC: 'europe', AL: 'europe',
  // Africa
  EG: 'africa', MA: 'africa', NG: 'africa', KE: 'africa', ZA: 'africa', GH: 'africa',
  TZ: 'africa', ET: 'africa', UG: 'africa', RW: 'africa', SN: 'africa', CI: 'africa',
  CM: 'africa', MZ: 'africa', ZM: 'africa', ZW: 'africa', BW: 'africa', NA: 'africa',
  MG: 'africa', MU: 'africa', AO: 'africa', CD: 'africa', CG: 'africa', TN: 'africa',
  DZ: 'africa', LY: 'africa', SD: 'africa',
  // North America
  US: 'north-america', CA: 'north-america', MX: 'north-america',
  // Central & South America
  BR: 'central-south-america', AR: 'central-south-america', CL: 'central-south-america',
  CO: 'central-south-america', PE: 'central-south-america', CR: 'central-south-america',
  PA: 'central-south-america', EC: 'central-south-america', UY: 'central-south-america',
  PY: 'central-south-america', BO: 'central-south-america', VE: 'central-south-america',
  GT: 'central-south-america', HN: 'central-south-america', SV: 'central-south-america',
  NI: 'central-south-america',
  // Caribbean
  JM: 'caribbean', TT: 'caribbean', DO: 'caribbean', CU: 'caribbean',
  HT: 'caribbean', PR: 'caribbean',
  // Oceania
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PG: 'oceania', FK: 'oceania',
}

export function getRegionForCountryCode(countryCode: string): string {
  return COUNTRY_TO_REGION[countryCode] || 'europe'
}

export function getRegionsForFilter() {
  return REGIONS
}
