/**
 * seed-schools.ts
 *
 * Comprehensive seed script for the School directory.
 * Inserts ~300 real, well-known international schools across all regions.
 *
 * Features:
 * - Hardcoded JSON array of { name, city, country } entries
 * - Maps country names -> countryCode using COUNTRIES array
 * - Maps countryCode -> region using getRegionForCountryCode
 * - Detects missing city (when city === country case-insensitive, stores null)
 * - Generates unique slugs (appends -countrycode on collision)
 * - Uses bulkWrite with $setOnInsert (idempotent, won't overwrite claimed profiles)
 * - COUNTRY_ALIASES map for ISR naming variations
 *
 * Usage:
 *   npx tsx scripts/seed-schools.ts
 *
 * Safe to run multiple times - will not overwrite existing school data.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { School } from '../models/School'
import { COUNTRIES } from '../lib/countries'
import { getRegionForCountryCode } from '../lib/regions'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/international-teacher-jobs'

// ---------------------------------------------------------------------------
// COUNTRY_ALIASES — handles common ISR naming variations that don't exactly
// match the COUNTRIES array names. Keys are lowercase for case-insensitive lookup.
// ---------------------------------------------------------------------------
const COUNTRY_ALIASES: Record<string, string> = {
  'uae': 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',
  'korea': 'South Korea',
  'republic of korea': 'South Korea',
  'south korea': 'South Korea',
  'north korea': 'South Korea', // fallback — very few intl schools
  'p.r.c.': 'China',
  'peoples republic of china': 'China',
  "people's republic of china": 'China',
  'hong kong sar': 'Hong Kong',
  'hk': 'Hong Kong',
  'czech republic': 'Czech Republic',
  'czechia': 'Czech Republic',
  'ivory coast': 'Ivory Coast',
  "cote d'ivoire": 'Ivory Coast',
  'congo': 'Congo',
  'republic of congo': 'Congo',
  'drc': 'Democratic Republic of Congo',
  'dr congo': 'Democratic Republic of Congo',
  'democratic republic of the congo': 'Democratic Republic of Congo',
  'burma': 'Myanmar',
  'uk': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'scotland': 'United Kingdom',
  'wales': 'United Kingdom',
  'usa': 'United States',
  'us': 'United States',
  'america': 'United States',
  'united states of america': 'United States',
  'holland': 'Netherlands',
  'the netherlands': 'Netherlands',
  'vatican': 'Italy',
  'vatican city': 'Italy',
  'russian federation': 'Russia',
  'lao': 'Laos',
  'lao pdr': 'Laos',
  'macau': 'Hong Kong', // closest match in our COUNTRIES list
  'macao': 'Hong Kong',
  'eswatini': 'South Africa', // closest fallback
  'swaziland': 'South Africa',
  'timor-leste': 'Indonesia', // closest fallback
  'east timor': 'Indonesia',
  'palestine': 'Jordan', // closest regional fallback
  'west bank': 'Jordan',
  'brunei darussalam': 'Brunei',
  'trinidadandtobago': 'Trinidad and Tobago',
  'trinidad': 'Trinidad and Tobago',
}

// ---------------------------------------------------------------------------
// Build a lookup from lowercase country name -> country code
// ---------------------------------------------------------------------------
const countryNameToCode: Record<string, string> = {}
for (const c of COUNTRIES) {
  countryNameToCode[c.name.toLowerCase()] = c.code
}
// Merge aliases
for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
  const code = countryNameToCode[canonical.toLowerCase()]
  if (code) {
    countryNameToCode[alias.toLowerCase()] = code
  }
}

function resolveCountryCode(country: string): string | null {
  const key = country.toLowerCase().trim()
  return countryNameToCode[key] || null
}

function resolveCountryName(code: string): string {
  const entry = COUNTRIES.find(c => c.code === code)
  return entry ? entry.name : code
}

// ---------------------------------------------------------------------------
// Slug generation (mirrors lib/school-utils.ts generateSlug)
// ---------------------------------------------------------------------------
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// RAW SCHOOL DATA
// ~300 real, well-known international schools.
// Format: { name, city, country }
//
// To add more schools, simply append entries to this array.
// The script handles deduplication, slug collisions, and country resolution.
// ---------------------------------------------------------------------------
const RAW_SCHOOLS: { name: string; city: string; country: string }[] = [
  // =========================================================================
  // MIDDLE EAST — UAE
  // =========================================================================
  { name: 'American School of Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Dubai International Academy', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'GEMS World Academy Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Dubai College', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Jumeirah English Speaking School', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Dubai British School', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Nord Anglia International School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'GEMS Dubai American Academy', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Repton School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Kings School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'American Community School of Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Al Bateen Academy', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Brighton College Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Cranleigh Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'GEMS American Academy Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Raha International School', city: 'Abu Dhabi', country: 'United Arab Emirates' },

  // =========================================================================
  // MIDDLE EAST — Saudi Arabia
  // =========================================================================
  { name: 'American International School Riyadh', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'British International School Riyadh', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Riyadh Schools', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'American International School Jeddah', city: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'British International School Jeddah', city: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'Dhahran Ahliyya Schools', city: 'Dhahran', country: 'Saudi Arabia' },
  { name: 'ISG Dammam', city: 'Dammam', country: 'Saudi Arabia' },
  { name: 'King Faisal School', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Dar Jana International School', city: 'Jeddah', country: 'Saudi Arabia' },

  // =========================================================================
  // MIDDLE EAST — Qatar
  // =========================================================================
  { name: 'American School of Doha', city: 'Doha', country: 'Qatar' },
  { name: 'Doha College', city: 'Doha', country: 'Qatar' },
  { name: 'Qatar Academy Doha', city: 'Doha', country: 'Qatar' },
  { name: 'Park House English School', city: 'Doha', country: 'Qatar' },
  { name: 'ACS Doha International School', city: 'Doha', country: 'Qatar' },
  { name: 'Compass International School Doha', city: 'Doha', country: 'Qatar' },
  { name: 'Nord Anglia International School Al Khor', city: 'Al Khor', country: 'Qatar' },

  // =========================================================================
  // MIDDLE EAST — Kuwait
  // =========================================================================
  { name: 'American School of Kuwait', city: 'Hawally', country: 'Kuwait' },
  { name: 'Kuwait English School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'The English School Kuwait', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'Universal American School Kuwait', city: 'Hawally', country: 'Kuwait' },
  { name: 'Fawzia Sultan International School', city: 'Kuwait City', country: 'Kuwait' },

  // =========================================================================
  // MIDDLE EAST — Bahrain
  // =========================================================================
  { name: 'British School of Bahrain', city: 'Manama', country: 'Bahrain' },
  { name: 'St Christopher School Bahrain', city: 'Manama', country: 'Bahrain' },
  { name: 'Bahrain School', city: 'Manama', country: 'Bahrain' },
  { name: 'AMA International School', city: 'Manama', country: 'Bahrain' },

  // =========================================================================
  // MIDDLE EAST — Oman
  // =========================================================================
  { name: 'American British Academy', city: 'Muscat', country: 'Oman' },
  { name: 'British School Muscat', city: 'Muscat', country: 'Oman' },
  { name: 'ABA An IB World School', city: 'Muscat', country: 'Oman' },
  { name: 'The Sultan School', city: 'Muscat', country: 'Oman' },

  // =========================================================================
  // MIDDLE EAST — Jordan
  // =========================================================================
  { name: 'American Community School Amman', city: 'Amman', country: 'Jordan' },
  { name: 'Amman Baccalaureate School', city: 'Amman', country: 'Jordan' },
  { name: 'International Academy Amman', city: 'Amman', country: 'Jordan' },
  { name: 'Modern American School', city: 'Amman', country: 'Jordan' },
  { name: 'King Academy Amman', city: 'Amman', country: 'Jordan' },

  // =========================================================================
  // MIDDLE EAST — Lebanon & Israel
  // =========================================================================
  { name: 'American Community School Beirut', city: 'Beirut', country: 'Lebanon' },
  { name: 'International College Beirut', city: 'Beirut', country: 'Lebanon' },
  { name: 'Brummana High School', city: 'Brummana', country: 'Lebanon' },
  { name: 'Walworth Barbour American International School', city: 'Even Yehuda', country: 'Israel' },

  // =========================================================================
  // EAST ASIA — China
  // =========================================================================
  { name: 'Beijing International School', city: 'Beijing', country: 'China' },
  { name: 'International School of Beijing', city: 'Beijing', country: 'China' },
  { name: 'British School of Beijing', city: 'Beijing', country: 'China' },
  { name: 'Western Academy of Beijing', city: 'Beijing', country: 'China' },
  { name: 'Dulwich College Beijing', city: 'Beijing', country: 'China' },
  { name: 'Keystone Academy', city: 'Beijing', country: 'China' },
  { name: 'Shanghai American School', city: 'Shanghai', country: 'China' },
  { name: 'Concordia International School Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Shanghai Community International School', city: 'Shanghai', country: 'China' },
  { name: 'Dulwich College Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'British International School Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Yew Chung International School Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'American International School of Guangzhou', city: 'Guangzhou', country: 'China' },
  { name: 'Shenzhen College of International Education', city: 'Shenzhen', country: 'China' },
  { name: 'International School of Tianjin', city: 'Tianjin', country: 'China' },
  { name: 'Nanjing International School', city: 'Nanjing', country: 'China' },
  { name: 'QSI International School of Chengdu', city: 'Chengdu', country: 'China' },
  { name: 'Chengdu International School', city: 'Chengdu', country: 'China' },

  // =========================================================================
  // EAST ASIA — Hong Kong
  // =========================================================================
  { name: 'Hong Kong International School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Chinese International School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Canadian International School of Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Kellett School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'German Swiss International School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'South Island School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Discovery Bay International School', city: 'Hong Kong', country: 'Hong Kong' },

  // =========================================================================
  // EAST ASIA — Japan
  // =========================================================================
  { name: 'American School in Japan', city: 'Tokyo', country: 'Japan' },
  { name: 'International School of the Sacred Heart', city: 'Tokyo', country: 'Japan' },
  { name: 'Nishimachi International School', city: 'Tokyo', country: 'Japan' },
  { name: 'British School in Tokyo', city: 'Tokyo', country: 'Japan' },
  { name: 'St Mary International School', city: 'Tokyo', country: 'Japan' },
  { name: 'Yokohama International School', city: 'Yokohama', country: 'Japan' },
  { name: 'Canadian Academy', city: 'Kobe', country: 'Japan' },
  { name: 'Nagoya International School', city: 'Nagoya', country: 'Japan' },
  { name: 'Osaka International School', city: 'Osaka', country: 'Japan' },

  // =========================================================================
  // EAST ASIA — South Korea
  // =========================================================================
  { name: 'Seoul International School', city: 'Seoul', country: 'South Korea' },
  { name: 'Korea International School', city: 'Seoul', country: 'South Korea' },
  { name: 'Yongsan International School of Seoul', city: 'Seoul', country: 'South Korea' },
  { name: 'Dulwich College Seoul', city: 'Seoul', country: 'South Korea' },
  { name: 'Chadwick International', city: 'Songdo', country: 'South Korea' },
  { name: 'International School of Busan', city: 'Busan', country: 'South Korea' },

  // =========================================================================
  // EAST ASIA — Taiwan
  // =========================================================================
  { name: 'Taipei American School', city: 'Taipei', country: 'Taiwan' },
  { name: 'Taipei European School', city: 'Taipei', country: 'Taiwan' },
  { name: 'Morrison Academy Taichung', city: 'Taichung', country: 'Taiwan' },
  { name: 'Kaohsiung American School', city: 'Kaohsiung', country: 'Taiwan' },
  { name: 'Hsinchu International School', city: 'Hsinchu', country: 'Taiwan' },

  // =========================================================================
  // SOUTHEAST ASIA — Thailand
  // =========================================================================
  { name: 'International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'NIST International School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Bangkok Patana School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Ruamrudee International School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Harrow International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'Shrewsbury International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'St Andrews International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'KIS International School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Prem Tinsulanonda International School', city: 'Chiang Mai', country: 'Thailand' },
  { name: 'Chiang Mai International School', city: 'Chiang Mai', country: 'Thailand' },

  // =========================================================================
  // SOUTHEAST ASIA — Vietnam
  // =========================================================================
  { name: 'United Nations International School of Hanoi', city: 'Hanoi', country: 'Vietnam' },
  { name: 'British International School Hanoi', city: 'Hanoi', country: 'Vietnam' },
  { name: 'Hanoi International School', city: 'Hanoi', country: 'Vietnam' },
  { name: 'International School Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'Saigon South International School', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'British International School Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'European International School Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam' },

  // =========================================================================
  // SOUTHEAST ASIA — Malaysia
  // =========================================================================
  { name: 'International School of Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Garden International School', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Alice Smith School', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Mont Kiara International School', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Nexus International School', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Marlborough College Malaysia', city: 'Johor Bahru', country: 'Malaysia' },
  { name: 'Penang International School', city: 'Penang', country: 'Malaysia' },

  // =========================================================================
  // SOUTHEAST ASIA — Singapore
  // =========================================================================
  { name: 'Singapore American School', city: 'Singapore', country: 'Singapore' },
  { name: 'United World College of South East Asia', city: 'Singapore', country: 'Singapore' },
  { name: 'Tanglin Trust School', city: 'Singapore', country: 'Singapore' },
  { name: 'Canadian International School Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'Australian International School Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'Dover Court International School', city: 'Singapore', country: 'Singapore' },
  { name: 'Dulwich College Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'Stamford American International School', city: 'Singapore', country: 'Singapore' },

  // =========================================================================
  // SOUTHEAST ASIA — Indonesia
  // =========================================================================
  { name: 'Jakarta Intercultural School', city: 'Jakarta', country: 'Indonesia' },
  { name: 'British School Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { name: 'North Jakarta Intercultural School', city: 'Jakarta', country: 'Indonesia' },
  { name: 'Bandung International School', city: 'Bandung', country: 'Indonesia' },
  { name: 'Surabaya International School', city: 'Surabaya', country: 'Indonesia' },
  { name: 'Bali Island School', city: 'Bali', country: 'Indonesia' },
  { name: 'Green School Bali', city: 'Bali', country: 'Indonesia' },

  // =========================================================================
  // SOUTHEAST ASIA — Philippines
  // =========================================================================
  { name: 'International School Manila', city: 'Manila', country: 'Philippines' },
  { name: 'British School Manila', city: 'Manila', country: 'Philippines' },
  { name: 'Brent International School Manila', city: 'Manila', country: 'Philippines' },
  { name: 'Cebu International School', city: 'Cebu', country: 'Philippines' },

  // =========================================================================
  // SOUTHEAST ASIA — Cambodia
  // =========================================================================
  { name: 'International School of Phnom Penh', city: 'Phnom Penh', country: 'Cambodia' },
  { name: 'Canadian International School of Phnom Penh', city: 'Phnom Penh', country: 'Cambodia' },
  { name: 'Northbridge International School Cambodia', city: 'Phnom Penh', country: 'Cambodia' },

  // =========================================================================
  // SOUTH ASIA — India
  // =========================================================================
  { name: 'American Embassy School', city: 'New Delhi', country: 'India' },
  { name: 'American School of Bombay', city: 'Mumbai', country: 'India' },
  { name: 'Woodstock School', city: 'Mussoorie', country: 'India' },
  { name: 'Kodaikanal International School', city: 'Kodaikanal', country: 'India' },
  { name: 'Canadian International School Bangalore', city: 'Bangalore', country: 'India' },
  { name: 'Stonehill International School', city: 'Bangalore', country: 'India' },
  { name: 'Oberoi International School', city: 'Mumbai', country: 'India' },
  { name: 'Calcutta International School', city: 'Kolkata', country: 'India' },
  { name: 'Hyderabad International School', city: 'Hyderabad', country: 'India' },
  { name: 'Mercedes-Benz International School', city: 'Pune', country: 'India' },

  // =========================================================================
  // SOUTH ASIA — Pakistan
  // =========================================================================
  { name: 'International School of Islamabad', city: 'Islamabad', country: 'Pakistan' },
  { name: 'Karachi American School', city: 'Karachi', country: 'Pakistan' },
  { name: 'Lahore American School', city: 'Lahore', country: 'Pakistan' },
  { name: 'Aitchison College', city: 'Lahore', country: 'Pakistan' },

  // =========================================================================
  // SOUTH ASIA — Bangladesh & Sri Lanka
  // =========================================================================
  { name: 'American International School Dhaka', city: 'Dhaka', country: 'Bangladesh' },
  { name: 'International School Dhaka', city: 'Dhaka', country: 'Bangladesh' },
  { name: 'Colombo International School', city: 'Colombo', country: 'Sri Lanka' },
  { name: 'Overseas School of Colombo', city: 'Colombo', country: 'Sri Lanka' },
  { name: 'The British School in Colombo', city: 'Colombo', country: 'Sri Lanka' },

  // =========================================================================
  // SOUTH ASIA — Nepal
  // =========================================================================
  { name: 'Lincoln School Kathmandu', city: 'Kathmandu', country: 'Nepal' },
  { name: 'The British School Kathmandu', city: 'Kathmandu', country: 'Nepal' },

  // =========================================================================
  // EUROPE — United Kingdom
  // =========================================================================
  { name: 'International School of London', city: 'London', country: 'United Kingdom' },
  { name: 'ACS International School Cobham', city: 'Cobham', country: 'United Kingdom' },
  { name: 'ACS International School Hillingdon', city: 'London', country: 'United Kingdom' },
  { name: 'Southbank International School', city: 'London', country: 'United Kingdom' },
  { name: 'TASIS The American School in England', city: 'Thorpe', country: 'United Kingdom' },
  { name: 'Marymount International School London', city: 'London', country: 'United Kingdom' },

  // =========================================================================
  // EUROPE — Germany
  // =========================================================================
  { name: 'Berlin International School', city: 'Berlin', country: 'Germany' },
  { name: 'International School of Hamburg', city: 'Hamburg', country: 'Germany' },
  { name: 'Frankfurt International School', city: 'Frankfurt', country: 'Germany' },
  { name: 'International School of Dusseldorf', city: 'Dusseldorf', country: 'Germany' },
  { name: 'Munich International School', city: 'Munich', country: 'Germany' },
  { name: 'Bonn International School', city: 'Bonn', country: 'Germany' },
  { name: 'International School of Stuttgart', city: 'Stuttgart', country: 'Germany' },

  // =========================================================================
  // EUROPE — France
  // =========================================================================
  { name: 'American School of Paris', city: 'Paris', country: 'France' },
  { name: 'International School of Paris', city: 'Paris', country: 'France' },
  { name: 'British School of Paris', city: 'Paris', country: 'France' },
  { name: 'Mougins School', city: 'Mougins', country: 'France' },
  { name: 'International School of Nice', city: 'Nice', country: 'France' },
  { name: 'International School of Lyon', city: 'Lyon', country: 'France' },

  // =========================================================================
  // EUROPE — Spain
  // =========================================================================
  { name: 'American School of Madrid', city: 'Madrid', country: 'Spain' },
  { name: 'International School of Madrid', city: 'Madrid', country: 'Spain' },
  { name: 'American School of Barcelona', city: 'Barcelona', country: 'Spain' },
  { name: 'Benjamin Franklin International School', city: 'Barcelona', country: 'Spain' },
  { name: 'British School of Barcelona', city: 'Barcelona', country: 'Spain' },
  { name: 'International School San Patricio Toledo', city: 'Toledo', country: 'Spain' },

  // =========================================================================
  // EUROPE — Netherlands
  // =========================================================================
  { name: 'American School of The Hague', city: 'The Hague', country: 'Netherlands' },
  { name: 'International School of Amsterdam', city: 'Amsterdam', country: 'Netherlands' },
  { name: 'British School of Amsterdam', city: 'Amsterdam', country: 'Netherlands' },
  { name: 'International School Hilversum', city: 'Hilversum', country: 'Netherlands' },
  { name: 'Rotterdam International Secondary School', city: 'Rotterdam', country: 'Netherlands' },

  // =========================================================================
  // EUROPE — Switzerland
  // =========================================================================
  { name: 'International School of Geneva', city: 'Geneva', country: 'Switzerland' },
  { name: 'Zurich International School', city: 'Zurich', country: 'Switzerland' },
  { name: 'Leysin American School', city: 'Leysin', country: 'Switzerland' },
  { name: 'College du Leman', city: 'Geneva', country: 'Switzerland' },
  { name: 'Institut Le Rosey', city: 'Rolle', country: 'Switzerland' },
  { name: 'TASIS The American School in Switzerland', city: 'Montagnola', country: 'Switzerland' },
  { name: 'Institut Montana Zugerberg', city: 'Zug', country: 'Switzerland' },

  // =========================================================================
  // EUROPE — Italy & Others
  // =========================================================================
  { name: 'American Overseas School of Rome', city: 'Rome', country: 'Italy' },
  { name: 'International School of Milan', city: 'Milan', country: 'Italy' },
  { name: 'St Stephen School Rome', city: 'Rome', country: 'Italy' },
  { name: 'International School of Florence', city: 'Florence', country: 'Italy' },
  { name: 'Vienna International School', city: 'Vienna', country: 'Austria' },
  { name: 'American International School Vienna', city: 'Vienna', country: 'Austria' },
  { name: 'International School of Brussels', city: 'Brussels', country: 'Belgium' },
  { name: 'International School of Prague', city: 'Prague', country: 'Czech Republic' },
  { name: 'American Academy in Prague', city: 'Prague', country: 'Czech Republic' },
  { name: 'Budapest International School', city: 'Budapest', country: 'Hungary' },
  { name: 'American International School of Budapest', city: 'Budapest', country: 'Hungary' },
  { name: 'International School of Helsinki', city: 'Helsinki', country: 'Finland' },
  { name: 'Copenhagen International School', city: 'Copenhagen', country: 'Denmark' },
  { name: 'International School of Stockholm', city: 'Stockholm', country: 'Sweden' },
  { name: 'Oslo International School', city: 'Oslo', country: 'Norway' },
  { name: 'American School of Warsaw', city: 'Warsaw', country: 'Poland' },
  { name: 'British International School of Istanbul', city: 'Istanbul', country: 'Turkey' },
  { name: 'Istanbul International Community School', city: 'Istanbul', country: 'Turkey' },
  { name: 'American Robert College', city: 'Istanbul', country: 'Turkey' },
  { name: 'Pechersk School International Kyiv', city: 'Kyiv', country: 'Ukraine' },
  { name: 'Anglo-American School of Moscow', city: 'Moscow', country: 'Russia' },

  // =========================================================================
  // EUROPE — Portugal, Ireland, Greece, Luxembourg
  // =========================================================================
  { name: 'St Julian School Lisbon', city: 'Lisbon', country: 'Portugal' },
  { name: 'International School of the Algarve', city: 'Lagoa', country: 'Portugal' },
  { name: 'St Andrews College Dublin', city: 'Dublin', country: 'Ireland' },
  { name: 'American Community Schools Athens', city: 'Athens', country: 'Greece' },
  { name: 'International School of Luxembourg', city: 'Luxembourg', country: 'Luxembourg' },

  // =========================================================================
  // AFRICA — Egypt
  // =========================================================================
  { name: 'American International School in Egypt', city: 'Cairo', country: 'Egypt' },
  { name: 'Cairo American College', city: 'Cairo', country: 'Egypt' },
  { name: 'British International School Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'Schutz American School', city: 'Alexandria', country: 'Egypt' },
  { name: 'GEMS International School Cairo', city: 'Cairo', country: 'Egypt' },

  // =========================================================================
  // AFRICA — Kenya
  // =========================================================================
  { name: 'International School of Kenya', city: 'Nairobi', country: 'Kenya' },
  { name: 'Braeburn School', city: 'Nairobi', country: 'Kenya' },
  { name: 'Rosslyn Academy', city: 'Nairobi', country: 'Kenya' },
  { name: 'Peponi School', city: 'Nairobi', country: 'Kenya' },
  { name: 'Brookhouse School', city: 'Nairobi', country: 'Kenya' },
  { name: 'Kenton College Preparatory School', city: 'Nairobi', country: 'Kenya' },

  // =========================================================================
  // AFRICA — Nigeria
  // =========================================================================
  { name: 'American International School of Lagos', city: 'Lagos', country: 'Nigeria' },
  { name: 'British International School Lagos', city: 'Lagos', country: 'Nigeria' },
  { name: 'Lekki British International School', city: 'Lagos', country: 'Nigeria' },
  { name: 'American International School of Abuja', city: 'Abuja', country: 'Nigeria' },

  // =========================================================================
  // AFRICA — South Africa
  // =========================================================================
  { name: 'American International School of Johannesburg', city: 'Johannesburg', country: 'South Africa' },
  { name: 'International School of South Africa', city: 'Johannesburg', country: 'South Africa' },
  { name: 'Reddam House Constantia', city: 'Cape Town', country: 'South Africa' },
  { name: 'American International School of Cape Town', city: 'Cape Town', country: 'South Africa' },
  { name: 'Hilton College', city: 'Hilton', country: 'South Africa' },

  // =========================================================================
  // AFRICA — Ghana & Tanzania
  // =========================================================================
  { name: 'Ghana International School', city: 'Accra', country: 'Ghana' },
  { name: 'Lincoln Community School', city: 'Accra', country: 'Ghana' },
  { name: 'American International School Accra', city: 'Accra', country: 'Ghana' },
  { name: 'International School of Tanganyika', city: 'Dar es Salaam', country: 'Tanzania' },
  { name: 'International School Moshi', city: 'Moshi', country: 'Tanzania' },
  { name: 'Haven of Peace Academy', city: 'Dar es Salaam', country: 'Tanzania' },

  // =========================================================================
  // AFRICA — Morocco, Senegal, Uganda, Rwanda, Ethiopia
  // =========================================================================
  { name: 'American School of Tangier', city: 'Tangier', country: 'Morocco' },
  { name: 'Casablanca American School', city: 'Casablanca', country: 'Morocco' },
  { name: 'Rabat American School', city: 'Rabat', country: 'Morocco' },
  { name: 'International School of Dakar', city: 'Dakar', country: 'Senegal' },
  { name: 'Kampala International School Uganda', city: 'Kampala', country: 'Uganda' },
  { name: 'International School of Uganda', city: 'Kampala', country: 'Uganda' },
  { name: 'Green Hills Academy', city: 'Kigali', country: 'Rwanda' },
  { name: 'Kigali International Community School', city: 'Kigali', country: 'Rwanda' },
  { name: 'International Community School of Addis Ababa', city: 'Addis Ababa', country: 'Ethiopia' },
  { name: 'Sandford International School', city: 'Addis Ababa', country: 'Ethiopia' },

  // =========================================================================
  // CENTRAL & SOUTH AMERICA — Brazil
  // =========================================================================
  { name: 'Graded The American School of Sao Paulo', city: 'Sao Paulo', country: 'Brazil' },
  { name: 'Chapel School', city: 'Sao Paulo', country: 'Brazil' },
  { name: 'St Paul School Sao Paulo', city: 'Sao Paulo', country: 'Brazil' },
  { name: 'Escola Americana do Rio de Janeiro', city: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'American School of Brasilia', city: 'Brasilia', country: 'Brazil' },
  { name: 'Pan American School of Porto Alegre', city: 'Porto Alegre', country: 'Brazil' },

  // =========================================================================
  // CENTRAL & SOUTH AMERICA — Colombia
  // =========================================================================
  { name: 'Colegio Nueva Granada', city: 'Bogota', country: 'Colombia' },
  { name: 'Colegio Anglo Colombiano', city: 'Bogota', country: 'Colombia' },
  { name: 'Colegio Colombo Britanico', city: 'Cali', country: 'Colombia' },
  { name: 'Columbus School', city: 'Medellin', country: 'Colombia' },
  { name: 'Colegio Jorge Washington', city: 'Cartagena', country: 'Colombia' },

  // =========================================================================
  // CENTRAL & SOUTH AMERICA — Mexico
  // =========================================================================
  { name: 'American School Foundation', city: 'Mexico City', country: 'Mexico' },
  { name: 'The American School Foundation of Monterrey', city: 'Monterrey', country: 'Mexico' },
  { name: 'American School Foundation of Guadalajara', city: 'Guadalajara', country: 'Mexico' },
  { name: 'American School of Puerto Vallarta', city: 'Puerto Vallarta', country: 'Mexico' },
  { name: 'Colegio Americano de Tabasco', city: 'Villahermosa', country: 'Mexico' },

  // =========================================================================
  // CENTRAL & SOUTH AMERICA — Costa Rica, Panama, Peru, Chile, Argentina
  // =========================================================================
  { name: 'Country Day School Costa Rica', city: 'San Jose', country: 'Costa Rica' },
  { name: 'Lincoln School Costa Rica', city: 'San Jose', country: 'Costa Rica' },
  { name: 'International School of Panama', city: 'Panama City', country: 'Panama' },
  { name: 'Balboa Academy', city: 'Panama City', country: 'Panama' },
  { name: 'American School of Lima', city: 'Lima', country: 'Peru' },
  { name: 'Markham College', city: 'Lima', country: 'Peru' },
  { name: 'Nido de Aguilas', city: 'Santiago', country: 'Chile' },
  { name: 'Santiago College', city: 'Santiago', country: 'Chile' },
  { name: 'Lincoln American International School', city: 'Buenos Aires', country: 'Argentina' },
  { name: 'Asociacion Escuelas Lincoln', city: 'Buenos Aires', country: 'Argentina' },
  { name: 'Colegio Americano de Quito', city: 'Quito', country: 'Ecuador' },
  { name: 'Alliance Academy International', city: 'Quito', country: 'Ecuador' },
  { name: 'American School of Tegucigalpa', city: 'Tegucigalpa', country: 'Honduras' },
  { name: 'American Nicaraguan School', city: 'Managua', country: 'Nicaragua' },
  { name: 'American School of Guatemala', city: 'Guatemala City', country: 'Guatemala' },

  // =========================================================================
  // NORTH AMERICA — US (International schools) & Canada
  // =========================================================================
  { name: 'United Nations International School', city: 'New York', country: 'United States' },
  { name: 'Washington International School', city: 'Washington DC', country: 'United States' },
  { name: 'The International School of Minnesota', city: 'Minneapolis', country: 'United States' },
  { name: 'Atlanta International School', city: 'Atlanta', country: 'United States' },
  { name: 'Branksome Hall Asia Partner School', city: 'Toronto', country: 'Canada' },

  // =========================================================================
  // OCEANIA — Australia
  // =========================================================================
  { name: 'International Grammar School', city: 'Sydney', country: 'Australia' },
  { name: 'Redlands International School', city: 'Sydney', country: 'Australia' },
  { name: 'Mercedes College', city: 'Adelaide', country: 'Australia' },
  { name: 'International School of Western Australia', city: 'Perth', country: 'Australia' },

  // =========================================================================
  // OCEANIA — New Zealand
  // =========================================================================
  { name: 'Kristin School', city: 'Auckland', country: 'New Zealand' },
  { name: 'ACG International School', city: 'Auckland', country: 'New Zealand' },
  { name: 'International School of Wellington', city: 'Wellington', country: 'New Zealand' },

  // =========================================================================
  // CENTRAL ASIA — Kazakhstan, Georgia, Uzbekistan
  // =========================================================================
  { name: 'Haileybury Almaty', city: 'Almaty', country: 'Kazakhstan' },
  { name: 'QSI International School of Astana', city: 'Astana', country: 'Kazakhstan' },
  { name: 'International School of Georgia', city: 'Tbilisi', country: 'Georgia' },
  { name: 'British International School Tashkent', city: 'Tashkent', country: 'Uzbekistan' },
  { name: 'Tashkent International School', city: 'Tashkent', country: 'Uzbekistan' },

  // =========================================================================
  // CARIBBEAN
  // =========================================================================
  { name: 'American International School of Kingston', city: 'Kingston', country: 'Jamaica' },
  { name: 'International School of Port of Spain', city: 'Port of Spain', country: 'Trinidad and Tobago' },
  { name: 'Carol Morgan School', city: 'Santo Domingo', country: 'Dominican Republic' },

  // =========================================================================
  // ADDITIONAL — More schools for breadth
  // =========================================================================
  // Mongolia
  { name: 'International School of Ulaanbaatar', city: 'Ulaanbaatar', country: 'Mongolia' },

  // Myanmar
  { name: 'International School Yangon', city: 'Yangon', country: 'Myanmar' },
  { name: 'Yangon International School', city: 'Yangon', country: 'Myanmar' },

  // Laos
  { name: 'Vientiane International School', city: 'Vientiane', country: 'Laos' },

  // Brunei
  { name: 'International School Brunei', city: 'Bandar Seri Begawan', country: 'Brunei' },
  { name: 'Jerudong International School', city: 'Bandar Seri Begawan', country: 'Brunei' },

  // Cyprus
  { name: 'American International School in Cyprus', city: 'Nicosia', country: 'Cyprus' },

  // Romania
  { name: 'American International School of Bucharest', city: 'Bucharest', country: 'Romania' },

  // Cameroon
  { name: 'American School of Douala', city: 'Douala', country: 'Cameroon' },
  { name: 'American School of Yaounde', city: 'Yaounde', country: 'Cameroon' },

  // Mozambique
  { name: 'American International School of Mozambique', city: 'Maputo', country: 'Mozambique' },

  // Zambia
  { name: 'American International School of Lusaka', city: 'Lusaka', country: 'Zambia' },

  // Zimbabwe
  { name: 'Harare International School', city: 'Harare', country: 'Zimbabwe' },

  // Botswana
  { name: 'Maru a Pula School', city: 'Gaborone', country: 'Botswana' },

  // Madagascar
  { name: 'American School of Antananarivo', city: 'Antananarivo', country: 'Madagascar' },

  // Tunisia
  { name: 'American Cooperative School of Tunis', city: 'Tunis', country: 'Tunisia' },

  // Algeria
  { name: 'International School of Algiers', city: 'Algiers', country: 'Algeria' },

  // Iraq
  { name: 'International School of Erbil', city: 'Erbil', country: 'Iraq' },
  { name: 'American International School of Baghdad', city: 'Baghdad', country: 'Iraq' },

  // Additional UAE — Al Ain & Sharjah
  { name: 'Al Ain International School', city: 'Al Ain', country: 'United Arab Emirates' },
  { name: 'GEMS International School Al Khail', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'American School of Creative Science Sharjah', city: 'Sharjah', country: 'United Arab Emirates' },
  { name: 'Victoria International School of Sharjah', city: 'Sharjah', country: 'United Arab Emirates' },

  // Additional China
  { name: 'ISA Science City International School', city: 'Guangzhou', country: 'China' },
  { name: 'Canadian International School of Beijing', city: 'Beijing', country: 'China' },
  { name: 'Harrow International School Beijing', city: 'Beijing', country: 'China' },
  { name: 'Wellington College International Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Hangzhou International School', city: 'Hangzhou', country: 'China' },

  // Additional Singapore
  { name: 'Overseas Family School', city: 'Singapore', country: 'Singapore' },
  { name: 'Global Indian International School', city: 'Singapore', country: 'Singapore' },

  // Additional Thailand
  { name: 'Regent International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'American School of Bangkok', city: 'Bangkok', country: 'Thailand' },

  // Additional India
  { name: 'The Doon School', city: 'Dehradun', country: 'India' },
  { name: 'Pathways School Noida', city: 'Noida', country: 'India' },

  // Additional Japan
  { name: 'Aoba-Japan International School', city: 'Tokyo', country: 'Japan' },
  { name: 'Kyoto International School', city: 'Kyoto', country: 'Japan' },

  // Additional Europe
  { name: 'American School of Milan', city: 'Milan', country: 'Italy' },
  { name: 'International School of Toulouse', city: 'Toulouse', country: 'France' },
  { name: 'International School of Barcelona', city: 'Barcelona', country: 'Spain' },
  { name: 'British School of Brussels', city: 'Brussels', country: 'Belgium' },
  { name: 'The Hague International School', city: 'The Hague', country: 'Netherlands' },

  // Additional South America
  { name: 'American School of Rio de Janeiro', city: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Colegio Karl C. Parrish', city: 'Barranquilla', country: 'Colombia' },

  // Additional Africa
  { name: 'International School of Ouagadougou', city: 'Ouagadougou', country: 'Ivory Coast' },
  { name: 'Aga Khan Academy Mombasa', city: 'Mombasa', country: 'Kenya' },

  // =========================================================================
  // BATCH 2 — Additional International Schools
  // =========================================================================

  // --- UAE ---
  { name: 'Abu Dhabi Grammar School', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Abu Dhabi International School', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Advanced Generations Schools', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Al Ain English Speaking School', city: 'Al Ain', country: 'United Arab Emirates' },
  { name: 'Australian International School Sharjah', city: 'Sharjah', country: 'United Arab Emirates' },
  { name: 'British International School Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Clarion School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Deira International School', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Dubai American Academy', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Emirates International School Jumeirah', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Emirates International School Meadows', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'GEMS American Academy Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'GEMS International School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'GEMS World Academy Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'GEMS World Academy Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Horizon Private School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Institute of Applied Technology Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Khalifa School', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Lycée Français International Georges Pompidou', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Mirdif Private School', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'RAK Academy', city: 'Ras Al Khaimah', country: 'United Arab Emirates' },
  { name: 'RAK American Academy for Girls', city: 'Ras Al Khaimah', country: 'United Arab Emirates' },
  { name: 'Raffles International School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Regent International School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Repton School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Rowad Al Khaleej International Schools', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Swiss International Scientific School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'The British School Al Khubairat', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'The International School of Choueifat Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'The Sheikh Zayed Private Academy for Girls', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Universal American School Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Uptown School', city: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Victoria International School Sharjah', city: 'Sharjah', country: 'United Arab Emirates' },

  // --- Saudi Arabia ---
  { name: 'Advanced Learning Schools', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'American International School Riyadh', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'American International School of Jeddah', city: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'British International School Al Khobar', city: 'Al Khobar', country: 'Saudi Arabia' },
  { name: 'International Programs School Al Khobar', city: 'Al Khobar', country: 'Saudi Arabia' },
  { name: 'International Schools Group', city: 'Dhahran', country: 'Saudi Arabia' },
  { name: 'Jeddah Knowledge International School', city: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'Jeddah Private School', city: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'Kingdom Schools', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Knowledge Gate International School', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Riyadh Najed Schools', city: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Saudi Aramco Expatriate Schools', city: 'Dhahran', country: 'Saudi Arabia' },
  { name: 'The KAUST School', city: 'Thuwal', country: 'Saudi Arabia' },

  // --- Qatar ---
  { name: 'Awsaj Academy', city: 'Doha', country: 'Qatar' },
  { name: 'Dukhan English School', city: 'Dukhan', country: 'Qatar' },
  { name: 'Hayat Universal School Qatar', city: 'Doha', country: 'Qatar' },
  { name: 'International School London Qatar', city: 'Doha', country: 'Qatar' },
  { name: 'Mesaieed International School', city: 'Mesaieed', country: 'Qatar' },
  { name: 'Michael E. DeBakey High School Qatar', city: 'Doha', country: 'Qatar' },
  { name: 'Qatar Academy Al Khor', city: 'Al Khor', country: 'Qatar' },
  { name: 'Qatar Academy Al-Wakra', city: 'Al-Wakra', country: 'Qatar' },
  { name: 'Qatar Academy Msheireb', city: 'Doha', country: 'Qatar' },
  { name: 'Qatar Academy Sidra', city: 'Doha', country: 'Qatar' },
  { name: 'Qatar Leadership Academy', city: 'Doha', country: 'Qatar' },
  { name: 'Sherborne Qatar', city: 'Doha', country: 'Qatar' },
  { name: 'The English Modern School Doha', city: 'Doha', country: 'Qatar' },

  // --- Kuwait ---
  { name: 'Al-Bayan Bilingual School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'Al-Ibdaa International School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'American Creativity Academy', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'American International School of Kuwait', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'American United School of Kuwait', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'Dasman Bilingual School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'International Academy Kuwait', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'Kuwait American School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'Kuwait Bilingual School', city: 'Kuwait City', country: 'Kuwait' },
  { name: 'The American School of Kuwait', city: 'Kuwait City', country: 'Kuwait' },

  // --- Bahrain ---
  { name: 'Abdulrahman Kanoo International School', city: 'Manama', country: 'Bahrain' },
  { name: 'Al Hekma International School', city: 'Manama', country: 'Bahrain' },
  { name: 'American School of Bahrain', city: 'Manama', country: 'Bahrain' },
  { name: 'Bahrain Bayan School', city: 'Manama', country: 'Bahrain' },
  { name: 'Gulf English School', city: 'Manama', country: 'Bahrain' },
  { name: 'Ibn Khuldoon National School', city: 'Manama', country: 'Bahrain' },
  { name: 'Ocean of Light International Schools', city: 'Manama', country: 'Bahrain' },
  { name: 'Riffa Views International School', city: 'Riffa', country: 'Bahrain' },

  // --- Oman ---
  { name: 'Al Batinah International School', city: 'Sohar', country: 'Oman' },
  { name: 'Al Sahwa Schools', city: 'Muscat', country: 'Oman' },
  { name: 'Al-Oruba International Schools', city: 'Muscat', country: 'Oman' },
  { name: 'Azzan Bin Qais International School', city: 'Muscat', country: 'Oman' },
  { name: 'Muscat International School', city: 'Muscat', country: 'Oman' },
  { name: 'OurPlanet International School Muscat', city: 'Muscat', country: 'Oman' },
  { name: 'The International School of Choueifat Muscat', city: 'Muscat', country: 'Oman' },
  { name: "The Sultan's School", city: 'Muscat', country: 'Oman' },

  // --- Jordan ---
  { name: 'American Community School Amman', city: 'Amman', country: 'Jordan' },
  { name: "King's Academy", city: 'Madaba', country: 'Jordan' },
  { name: 'New English School Jordan', city: 'Amman', country: 'Jordan' },
  { name: 'The International Academy Amman', city: 'Amman', country: 'Jordan' },

  // --- Lebanon ---
  { name: 'International College Beirut', city: 'Beirut', country: 'Lebanon' },
  { name: 'Wellspring Learning Community Beirut', city: 'Beirut', country: 'Lebanon' },

  // --- Israel ---
  { name: 'Anglican International School Jerusalem', city: 'Jerusalem', country: 'Israel' },
  { name: 'Jerusalem American International School', city: 'Jerusalem', country: 'Israel' },

  // --- China ---
  { name: 'Affiliated High School of South China Normal University', city: 'Guangzhou', country: 'China' },
  { name: 'Avenues The World School Shenzhen', city: 'Shenzhen', country: 'China' },
  { name: 'BASIS Bilingual School Shenzhen', city: 'Shenzhen', country: 'China' },
  { name: 'BASIS International School Guangzhou', city: 'Guangzhou', country: 'China' },
  { name: 'Beanstalk International Bilingual School Beijing', city: 'Beijing', country: 'China' },
  { name: 'Beijing BISS International School', city: 'Beijing', country: 'China' },
  { name: 'Beijing City International School', city: 'Beijing', country: 'China' },
  { name: 'Beijing Huijia IB Private School', city: 'Beijing', country: 'China' },
  { name: 'Beijing International Bilingual Academy', city: 'Beijing', country: 'China' },
  { name: 'Beijing National Day School', city: 'Beijing', country: 'China' },
  { name: 'Canadian International School Beijing', city: 'Beijing', country: 'China' },
  { name: 'Canadian International School of Hefei', city: 'Hefei', country: 'China' },
  { name: 'Changchun American International School', city: 'Changchun', country: 'China' },
  { name: 'China World Academy', city: 'Beijing', country: 'China' },
  { name: 'Dalian American International School', city: 'Dalian', country: 'China' },
  { name: 'Dulwich College Shanghai Pudong', city: 'Shanghai', country: 'China' },
  { name: 'Dulwich College Shanghai Puxi', city: 'Shanghai', country: 'China' },
  { name: 'Dulwich College Suzhou', city: 'Suzhou', country: 'China' },
  { name: 'Dulwich International High School Zhuhai', city: 'Zhuhai', country: 'China' },
  { name: 'Guangdong Country Garden School', city: 'Guangzhou', country: 'China' },
  { name: 'Guangzhou International Primary School Baiyun', city: 'Guangzhou', country: 'China' },
  { name: 'Harrow International School Haikou', city: 'Haikou', country: 'China' },
  { name: 'Harrow International School Beijing', city: 'Beijing', country: 'China' },
  { name: 'HD Shanghai School', city: 'Shanghai', country: 'China' },
  { name: 'Hope International School Beijing', city: 'Beijing', country: 'China' },
  { name: 'Huamao Multicultural Education Academy', city: 'Guangzhou', country: 'China' },
  { name: 'Mission Hills International School', city: 'Shenzhen', country: 'China' },
  { name: 'Nanchang International School', city: 'Nanchang', country: 'China' },
  { name: 'Ningbo Huamao International School', city: 'Ningbo', country: 'China' },
  { name: 'Nord Anglia International School Shanghai Pudong', city: 'Shanghai', country: 'China' },
  { name: 'Nord Anglia School Beijing Fangshan', city: 'Beijing', country: 'China' },
  { name: 'Shanghai Qibao Dwight High School', city: 'Shanghai', country: 'China' },
  { name: 'Shanghai Shangde Experimental School', city: 'Shanghai', country: 'China' },
  { name: 'Shanghai Singapore International School', city: 'Shanghai', country: 'China' },
  { name: 'Shanghai United International School', city: 'Shanghai', country: 'China' },
  { name: 'Shekou International School', city: 'Shenzhen', country: 'China' },
  { name: 'Shen Wai International School', city: 'Shenzhen', country: 'China' },
  { name: 'Shenzhen Oasis International School', city: 'Shenzhen', country: 'China' },
  { name: 'Suzhou Singapore International School', city: 'Suzhou', country: 'China' },
  { name: 'Suzhou Yidun International School', city: 'Suzhou', country: 'China' },
  { name: 'The Affiliated High School of Peking University Dalton Academy', city: 'Beijing', country: 'China' },
  { name: 'Tsinghua International School', city: 'Beijing', country: 'China' },
  { name: 'United World College of Changshu China', city: 'Changshu', country: 'China' },
  { name: 'Utahloy International School Guangzhou', city: 'Guangzhou', country: 'China' },
  { name: 'Utahloy International School Zengcheng', city: 'Guangzhou', country: 'China' },
  { name: 'Wellington College International Tianjin', city: 'Tianjin', country: 'China' },
  { name: 'Western International School of Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Wuxi Taihu International School', city: 'Wuxi', country: 'China' },
  { name: "Xi'an Hanova International School", city: "Xi'an", country: 'China' },
  { name: 'Xiamen International School', city: 'Xiamen', country: 'China' },
  { name: 'Yew Chung International School of Beijing', city: 'Beijing', country: 'China' },
  { name: 'Yew Chung International School of Chongqing', city: 'Chongqing', country: 'China' },
  { name: 'Yew Chung International School of Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Yew Wah International Education School of Guangzhou', city: 'Guangzhou', country: 'China' },
  { name: 'YK Pao School Shanghai', city: 'Shanghai', country: 'China' },
  { name: 'Zhuhai International School', city: 'Zhuhai', country: 'China' },

  // --- Hong Kong ---
  { name: 'American International School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'American School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Carmel School Association', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Christian Alliance International School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Creative Secondary School', city: 'Hong Kong', country: 'Hong Kong' },
  { name: "Diocesan Boys' School", city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Discovery College', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'English Schools Foundation', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Hong Kong Academy', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'International Christian School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'International College Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Malvern College Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Renaissance College Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Singapore International School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Stamford American School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { name: "St. Stephen's College Hong Kong", city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'The Independent Schools Foundation Academy', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Victoria Educational Organisation', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Victoria Shanghai Academy', city: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Yew Chung International School Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },

  // --- Taiwan ---
  { name: 'I-Shou International School', city: 'Kaohsiung', country: 'Taiwan' },
  { name: 'Ivy Collegiate Academy', city: 'Taichung', country: 'Taiwan' },
  { name: 'Pacific American School', city: 'Hsinchu', country: 'Taiwan' },

  // --- South Korea ---
  { name: 'Asia Pacific International School', city: 'Seoul', country: 'South Korea' },
  { name: 'Branksome Hall Asia', city: 'Jeju', country: 'South Korea' },
  { name: 'Busan International Foreign School', city: 'Busan', country: 'South Korea' },
  { name: 'Chadwick International School Songdo', city: 'Incheon', country: 'South Korea' },
  { name: 'Dwight International School Seoul', city: 'Seoul', country: 'South Korea' },
  { name: 'Gyeonggi Suwon International School', city: 'Suwon', country: 'South Korea' },
  { name: 'Korea International School Jeju', city: 'Jeju', country: 'South Korea' },
  { name: 'Korea Kent Foreign School', city: 'Seoul', country: 'South Korea' },
  { name: 'North London Collegiate School Jeju', city: 'Jeju', country: 'South Korea' },
  { name: 'Seoul Foreign School', city: 'Seoul', country: 'South Korea' },
  { name: 'Taejon Christian International School', city: 'Daejeon', country: 'South Korea' },

  // --- Japan ---
  { name: 'Canadian International School Tokyo', city: 'Tokyo', country: 'Japan' },
  { name: 'Fukuoka International School', city: 'Fukuoka', country: 'Japan' },
  { name: 'Gunma Kokusai Academy', city: 'Ota', country: 'Japan' },
  { name: 'Hiroshima International School', city: 'Hiroshima', country: 'Japan' },
  { name: 'Hokkaido International School', city: 'Sapporo', country: 'Japan' },
  { name: 'International School of Asia Karuizawa', city: 'Karuizawa', country: 'Japan' },
  { name: 'International Secondary School Tokyo', city: 'Tokyo', country: 'Japan' },
  { name: 'K. International School Tokyo', city: 'Tokyo', country: 'Japan' },
  { name: 'Katoh Gakuen', city: 'Numazu', country: 'Japan' },
  { name: 'Marist Brothers International School', city: 'Kobe', country: 'Japan' },
  { name: 'Osaka International School of Kwansei Gakuin', city: 'Osaka', country: 'Japan' },
  { name: 'Osaka YMCA International School', city: 'Osaka', country: 'Japan' },
  { name: 'Saint Maur International School', city: 'Yokohama', country: 'Japan' },
  { name: 'Seisen International School', city: 'Tokyo', country: 'Japan' },
  { name: "St. Mary's International School Tokyo", city: 'Tokyo', country: 'Japan' },
  { name: 'Tamagawa Academy', city: 'Tokyo', country: 'Japan' },
  { name: 'Teikyo University Kani High School', city: 'Kani', country: 'Japan' },
  { name: 'Tokyo International Progressive School', city: 'Tokyo', country: 'Japan' },
  { name: 'Tokyo International School', city: 'Tokyo', country: 'Japan' },
  { name: 'UWC ISAK Japan', city: 'Karuizawa', country: 'Japan' },
  { name: 'Yoyogi International School', city: 'Tokyo', country: 'Japan' },

  // --- Indonesia ---
  { name: 'ACG School Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { name: 'Bali International School', city: 'Denpasar', country: 'Indonesia' },
  { name: 'Bandung Independent School', city: 'Bandung', country: 'Indonesia' },
  { name: 'Beacon Academy Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { name: 'Binus International School Simprug', city: 'Jakarta', country: 'Indonesia' },
  { name: 'British School Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { name: 'Canggu Community School', city: 'Canggu', country: 'Indonesia' },
  { name: 'Global Jaya School', city: 'Tangerang', country: 'Indonesia' },
  { name: 'Intercultural School of Bogor', city: 'Bogor', country: 'Indonesia' },
  { name: 'Medan Independent School', city: 'Medan', country: 'Indonesia' },
  { name: 'Mount Zaagkam School', city: 'Timika', country: 'Indonesia' },
  { name: 'Sekolah Ciputra', city: 'Surabaya', country: 'Indonesia' },
  { name: 'Singapore International School Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { name: 'Surabaya European School', city: 'Surabaya', country: 'Indonesia' },
  { name: 'Surabaya Intercultural School', city: 'Surabaya', country: 'Indonesia' },

  // --- Thailand ---
  { name: 'Berkeley International School Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'British International School Phuket', city: 'Phuket', country: 'Thailand' },
  { name: 'Concordian International School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Noblesse International School', city: 'Bangkok', country: 'Thailand' },
  { name: 'Singapore International School of Bangkok', city: 'Bangkok', country: 'Thailand' },
  { name: 'The Early Learning Centre International Bangkok', city: 'Bangkok', country: 'Thailand' },

  // --- Malaysia ---
  { name: 'IGB International School', city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: "Kolej Tuanku Ja'afar", city: 'Negeri Sembilan', country: 'Malaysia' },
  { name: "Mont'Kiara International School", city: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'The International School of Penang Uplands', city: 'Penang', country: 'Malaysia' },

  // --- Singapore ---
  { name: '3E International School', city: 'Singapore', country: 'Singapore' },
  { name: 'ACS International Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'Chatsworth International School Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'EtonHouse International School', city: 'Singapore', country: 'Singapore' },
  { name: 'GEMS World Academy Singapore', city: 'Singapore', country: 'Singapore' },
  { name: 'ISS International School', city: 'Singapore', country: 'Singapore' },
  { name: "St. Joseph's Institution International High School", city: 'Singapore', country: 'Singapore' },
  { name: 'United World College South East Asia', city: 'Singapore', country: 'Singapore' },

  // --- India ---
  { name: 'BD Somani International School', city: 'Mumbai', country: 'India' },
  { name: 'Canadian International School Bangalore', city: 'Bangalore', country: 'India' },
  { name: 'Dhirubhai Ambani International School', city: 'Mumbai', country: 'India' },
  { name: 'DSB International School', city: 'Mumbai', country: 'India' },
  { name: 'Ecole Mondiale World School', city: 'Mumbai', country: 'India' },
  { name: 'Foremarke School India', city: 'Gurugram', country: 'India' },
  { name: 'Genesis Global School', city: 'Noida', country: 'India' },
  { name: 'Heritage Xperiential Learning School', city: 'Gurugram', country: 'India' },
  { name: 'International School of Hyderabad', city: 'Hyderabad', country: 'India' },
  { name: 'International Village School Chennai', city: 'Chennai', country: 'India' },
  { name: 'JBCN International School Parel', city: 'Mumbai', country: 'India' },
  { name: 'Mahindra International School', city: 'Pune', country: 'India' },
  { name: 'Pathways World School', city: 'Gurugram', country: 'India' },
  { name: 'Singapore International School Mumbai', city: 'Mumbai', country: 'India' },
  { name: 'The Aga Khan Academy Hyderabad', city: 'Hyderabad', country: 'India' },
  { name: 'The British School New Delhi', city: 'New Delhi', country: 'India' },
  { name: 'The Heritage School Kolkata', city: 'Kolkata', country: 'India' },

  // --- Pakistan ---
  { name: 'British Overseas School Karachi', city: 'Karachi', country: 'Pakistan' },

  // --- Sri Lanka ---
  { name: 'The Overseas School of Colombo', city: 'Colombo', country: 'Sri Lanka' },

  // --- Laos ---
  { name: 'Australian International School of Laos', city: 'Vientiane', country: 'Laos' },
  { name: 'Kiettisack International School', city: 'Vientiane', country: 'Laos' },
  { name: 'Panyathip International School', city: 'Vientiane', country: 'Laos' },

  // --- Cambodia ---
  { name: 'Australian International School of Phnom Penh', city: 'Phnom Penh', country: 'Cambodia' },
  { name: 'The Liger Learning Center', city: 'Phnom Penh', country: 'Cambodia' },
  { name: 'Treehouse International School', city: 'Phnom Penh', country: 'Cambodia' },

  // --- Myanmar ---
  { name: 'Ayeyarwaddy International School', city: 'Yangon', country: 'Myanmar' },
  { name: 'International School of Myanmar', city: 'Yangon', country: 'Myanmar' },
  { name: 'Myanmar International School Yangon', city: 'Yangon', country: 'Myanmar' },
  { name: 'The International School Yangon', city: 'Yangon', country: 'Myanmar' },

  // --- Philippines ---
  { name: 'Alcanta International College', city: 'Manila', country: 'Philippines' },
  { name: 'German European School Manila', city: 'Manila', country: 'Philippines' },
  { name: 'Global Bilingual Academy School', city: 'Manila', country: 'Philippines' },

  // --- Brunei ---
  { name: 'CfBT Education Services Brunei', city: 'Bandar Seri Begawan', country: 'Brunei' },

  // --- Egypt ---
  { name: 'Cairo English School', city: 'Cairo', country: 'Egypt' },
  { name: 'Dover American International School Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'Ecole Oasis Internationale Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'El Alsson British and American International School', city: 'Cairo', country: 'Egypt' },
  { name: 'Hayah International Academy Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'Malvern College Egypt', city: 'Cairo', country: 'Egypt' },
  { name: 'Misr American College', city: 'Cairo', country: 'Egypt' },
  { name: 'Modern English School Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'Narmer American College', city: 'Cairo', country: 'Egypt' },
  { name: 'New Cairo British International School', city: 'Cairo', country: 'Egypt' },
  { name: 'Smart Village Schools Cairo', city: 'Cairo', country: 'Egypt' },
  { name: 'The British School Al Rehab', city: 'Cairo', country: 'Egypt' },
  { name: 'The Egyptian Language School', city: 'Cairo', country: 'Egypt' },

  // --- Morocco ---
  { name: 'American School of Marrakesh', city: 'Marrakesh', country: 'Morocco' },
  { name: 'George Washington Academy Casablanca', city: 'Casablanca', country: 'Morocco' },

  // --- Kenya ---
  { name: 'Aga Khan Academy Nairobi', city: 'Nairobi', country: 'Kenya' },

  // --- Ethiopia ---
  { name: 'Sandford International School Addis Ababa', city: 'Addis Ababa', country: 'Ethiopia' },

  // --- Nigeria ---
  { name: 'Surefoot International School Calabar', city: 'Calabar', country: 'Nigeria' },
  { name: 'The International School of IITA Ibadan', city: 'Ibadan', country: 'Nigeria' },

  // --- Angola ---
  { name: 'Luanda International School of Angola', city: 'Luanda', country: 'Angola' },

  // --- South Africa ---
  { name: 'Good Hope Country Day School', city: 'Cape Town', country: 'South Africa' },
  { name: 'Hout Bay International School', city: 'Cape Town', country: 'South Africa' },
  { name: 'The International School of Cape Town', city: 'Cape Town', country: 'South Africa' },

  // --- Rwanda ---
  { name: 'International School of Kigali', city: 'Kigali', country: 'Rwanda' },

  // --- Tanzania ---
  { name: 'Woodford International School', city: 'Dar es Salaam', country: 'Tanzania' },

  // --- Malawi ---
  { name: 'Bishop Mackenzie International School Lilongwe', city: 'Lilongwe', country: 'Malawi' },

  // --- Mozambique ---
  { name: 'Aga Khan Academy Maputo', city: 'Maputo', country: 'Mozambique' },

  // --- Lesotho ---
  { name: 'American International School of Lesotho', city: 'Maseru', country: 'Lesotho' },
  { name: 'Machabeng College International School of Lesotho', city: 'Maseru', country: 'Lesotho' },

  // --- Eritrea ---
  { name: 'Asmara International Community School', city: 'Asmara', country: 'Eritrea' },

  // --- Sudan ---
  { name: 'Khartoum American School', city: 'Khartoum', country: 'Sudan' },
  { name: 'Khartoum International Community School', city: 'Khartoum', country: 'Sudan' },
  { name: 'Unity High School Khartoum', city: 'Khartoum', country: 'Sudan' },

  // --- West Africa ---
  { name: 'American International School of Lome', city: 'Lomé', country: 'Togo' },
  { name: 'American International School of Niamey', city: 'Niamey', country: 'Niger' },
  { name: 'American International School of Bamako', city: 'Bamako', country: 'Mali' },
  { name: 'American International School Nouakchott', city: 'Nouakchott', country: 'Mauritania' },
  { name: 'International Community School of Abidjan', city: 'Abidjan', country: 'Côte d\'Ivoire' },

  // --- Iraq ---
  { name: 'Ihsan Dogramaci Bilkent Erbil College', city: 'Erbil', country: 'Iraq' },
  { name: 'International Maarif Schools Erbil', city: 'Erbil', country: 'Iraq' },

  // --- Turkey ---
  { name: 'Adana Gundogdu College', city: 'Adana', country: 'Turkey' },
  { name: 'Bilkent Erzurum Laboratory School', city: 'Erzurum', country: 'Turkey' },
  { name: 'Bilkent Laboratory and International School Ankara', city: 'Ankara', country: 'Turkey' },
  { name: 'Darussafaka Schools', city: 'Istanbul', country: 'Turkey' },
  { name: 'Enka Schools Istanbul', city: 'Istanbul', country: 'Turkey' },
  { name: 'Hisar School Istanbul', city: 'Istanbul', country: 'Turkey' },
  { name: 'Isikkent School', city: 'Izmir', country: 'Turkey' },
  { name: 'Istek Belde School', city: 'Istanbul', country: 'Turkey' },
  { name: 'MEF International School Izmir', city: 'Izmir', country: 'Turkey' },
  { name: 'Robert College of Istanbul', city: 'Istanbul', country: 'Turkey' },
  { name: 'SEV American College', city: 'Izmir', country: 'Turkey' },
  { name: 'Tarsus American College', city: 'Tarsus', country: 'Turkey' },
  { name: 'The Koc School', city: 'Istanbul', country: 'Turkey' },
  { name: 'Uskudar American Academy', city: 'Istanbul', country: 'Turkey' },

  // --- Kazakhstan ---
  { name: 'Haileybury Astana', city: 'Nur-Sultan', country: 'Kazakhstan' },
  { name: 'International School of Almaty', city: 'Almaty', country: 'Kazakhstan' },
  { name: 'Kazakhstan International School', city: 'Almaty', country: 'Kazakhstan' },
  { name: 'Miras International School Almaty', city: 'Almaty', country: 'Kazakhstan' },
  { name: 'Miras International School Nur-Sultan', city: 'Nur-Sultan', country: 'Kazakhstan' },
  { name: 'Nazarbayev Intellectual School Nur-Sultan', city: 'Nur-Sultan', country: 'Kazakhstan' },

  // --- Azerbaijan ---
  { name: 'Baku Modern International School', city: 'Baku', country: 'Azerbaijan' },
  { name: 'Baku-Oxford School', city: 'Baku', country: 'Azerbaijan' },
  { name: 'European School of Azerbaijan', city: 'Baku', country: 'Azerbaijan' },
  { name: 'The International School of Azerbaijan', city: 'Baku', country: 'Azerbaijan' },

  // --- Georgia ---
  { name: 'BGA International School Tbilisi', city: 'Tbilisi', country: 'Georgia' },
  { name: 'New School International School of Georgia', city: 'Tbilisi', country: 'Georgia' },

  // --- Ukraine ---
  { name: 'British International School Kyiv', city: 'Kyiv', country: 'Ukraine' },
  { name: 'Pechersk School International Kyiv', city: 'Kyiv', country: 'Ukraine' },

  // --- Russia ---
  { name: 'The Anglo-American School of Moscow', city: 'Moscow', country: 'Russia' },

  // --- Serbia ---
  { name: 'International School of Belgrade', city: 'Belgrade', country: 'Serbia' },

  // --- Baltic States ---
  { name: 'American International School of Vilnius', city: 'Vilnius', country: 'Lithuania' },
  { name: 'International School of Estonia', city: 'Tallinn', country: 'Estonia' },
  { name: 'International School of Latvia', city: 'Riga', country: 'Latvia' },
  { name: 'Vilnius International School', city: 'Vilnius', country: 'Lithuania' },

  // --- Bulgaria & Croatia ---
  { name: 'Anglo-American School of Sofia', city: 'Sofia', country: 'Bulgaria' },
  { name: 'American International School of Zagreb', city: 'Zagreb', country: 'Croatia' },
  { name: 'The American College of Sofia', city: 'Sofia', country: 'Bulgaria' },

  // --- Czech Republic ---
  { name: 'Park Lane International School Prague', city: 'Prague', country: 'Czech Republic' },

  // --- Germany ---
  { name: 'Bavarian International School', city: 'Munich', country: 'Germany' },
  { name: 'Berlin Brandenburg International School', city: 'Berlin', country: 'Germany' },
  { name: 'Berlin British School', city: 'Berlin', country: 'Germany' },
  { name: 'Dresden International School', city: 'Dresden', country: 'Germany' },
  { name: 'Franconian International School Erlangen', city: 'Erlangen', country: 'Germany' },
  { name: 'International School Hannover Region', city: 'Hannover', country: 'Germany' },
  { name: 'International School of Ulm', city: 'Ulm', country: 'Germany' },
  { name: 'International School Ruhr', city: 'Duisburg', country: 'Germany' },
  { name: 'ISF Internationale Schule Frankfurt-Rhein-Main', city: 'Frankfurt', country: 'Germany' },
  { name: 'John F. Kennedy School Berlin', city: 'Berlin', country: 'Germany' },
  { name: 'Kammer International Bilingual School Hannover', city: 'Hannover', country: 'Germany' },
  { name: 'Metropolitan School Frankfurt', city: 'Frankfurt', country: 'Germany' },
  { name: 'Munich International School', city: 'Munich', country: 'Germany' },
  { name: 'Schule Schloss Salem', city: 'Salem', country: 'Germany' },
  { name: 'Strothoff International School Frankfurt', city: 'Frankfurt', country: 'Germany' },
  { name: 'Thuringia International School Weimar', city: 'Weimar', country: 'Germany' },

  // --- France ---
  { name: 'Lycée International de Saint-Germain-en-Laye', city: 'Saint-Germain-en-Laye', country: 'France' },

  // --- Spain ---
  { name: 'American School of Bilbao', city: 'Bilbao', country: 'Spain' },
  { name: 'International College Spain', city: 'Madrid', country: 'Spain' },
  { name: 'SEK International Schools', city: 'Madrid', country: 'Spain' },
  { name: 'Sotogrande International School', city: 'Sotogrande', country: 'Spain' },

  // --- Portugal ---
  { name: 'Atlantic Education International Lisbon', city: 'Lisbon', country: 'Portugal' },
  { name: 'Carlucci American International School Lisbon', city: 'Lisbon', country: 'Portugal' },
  { name: 'Oporto British School', city: 'Porto', country: 'Portugal' },
  { name: "St. Dominic's International School Lisbon", city: 'Lisbon', country: 'Portugal' },

  // --- Italy ---
  { name: 'Ambrit International School Rome', city: 'Rome', country: 'Italy' },
  { name: 'International School in Genoa', city: 'Genoa', country: 'Italy' },
  { name: 'International School of Bologna', city: 'Bologna', country: 'Italy' },
  { name: 'International School of Trieste', city: 'Trieste', country: 'Italy' },
  { name: 'International School of Turin', city: 'Turin', country: 'Italy' },
  { name: 'Marymount International School Rome', city: 'Rome', country: 'Italy' },
  { name: 'Rome International School', city: 'Rome', country: 'Italy' },
  { name: "St. Stephen's School Rome", city: 'Rome', country: 'Italy' },
  { name: 'The Bilingual School of Monza', city: 'Monza', country: 'Italy' },

  // --- Switzerland ---
  { name: 'Gems World Academy Etoy', city: 'Etoy', country: 'Switzerland' },
  { name: 'Inter-Community School Zurich', city: 'Zurich', country: 'Switzerland' },
  { name: 'International School Basel', city: 'Basel', country: 'Switzerland' },
  { name: 'International School of Berne', city: 'Berne', country: 'Switzerland' },
  { name: 'International School of Lausanne', city: 'Lausanne', country: 'Switzerland' },
  { name: 'International School of Zug and Luzern', city: 'Zug', country: 'Switzerland' },
  { name: 'Leman International School Geneva', city: 'Geneva', country: 'Switzerland' },
  { name: 'Lyceum Alpinum Zuoz', city: 'Zuoz', country: 'Switzerland' },

  // --- Austria ---
  { name: 'American International School Vienna', city: 'Vienna', country: 'Austria' },
  { name: 'International School Carinthia', city: 'Klagenfurt', country: 'Austria' },
  { name: 'The American International School Salzburg', city: 'Salzburg', country: 'Austria' },

  // --- Hungary, Belgium, Netherlands ---
  { name: 'The British International School Budapest', city: 'Budapest', country: 'Hungary' },
  { name: "St. John's International School Brussels", city: 'Brussels', country: 'Belgium' },
  { name: 'American International School of Rotterdam', city: 'Rotterdam', country: 'Netherlands' },
  { name: 'The International School of The Hague', city: 'The Hague', country: 'Netherlands' },

  // --- Ireland, Denmark, Norway ---
  { name: 'SEK Dublin International School', city: 'Dublin', country: 'Ireland' },
  { name: 'Aarhus Academy for Global Education', city: 'Aarhus', country: 'Denmark' },
  { name: 'Aarhus International School', city: 'Aarhus', country: 'Denmark' },
  { name: 'Esbjerg International School', city: 'Esbjerg', country: 'Denmark' },
  { name: 'Kongsberg International School', city: 'Kongsberg', country: 'Norway' },
  { name: 'Skagerak International School', city: 'Sandefjord', country: 'Norway' },
  { name: 'Trondheim International School', city: 'Trondheim', country: 'Norway' },

  // --- Luxembourg, UK ---
  { name: 'St. George International School Luxembourg', city: 'Luxembourg City', country: 'Luxembourg' },
  { name: 'International School of Aberdeen', city: 'Aberdeen', country: 'United Kingdom' },

  // --- Mongolia ---
  { name: 'Orchlon School Ulaanbaatar', city: 'Ulaanbaatar', country: 'Mongolia' },

  // --- Mexico ---
  { name: 'American School of Durango', city: 'Durango', country: 'Mexico' },
  { name: 'Greengates School Mexico City', city: 'Mexico City', country: 'Mexico' },
  { name: 'Instituto San Roberto Monterrey', city: 'Monterrey', country: 'Mexico' },
  { name: 'Lancaster School Mexico City', city: 'Mexico City', country: 'Mexico' },
  { name: 'The American School Foundation Mexico City', city: 'Mexico City', country: 'Mexico' },

  // --- Colombia ---
  { name: 'Colegio Bolivar', city: 'Cali', country: 'Colombia' },
  { name: 'Colegio Granadino', city: 'Manizales', country: 'Colombia' },
  { name: 'Colegio Los Nogales', city: 'Bogotá', country: 'Colombia' },
  { name: 'Colegio Panamericano', city: 'Bucaramanga', country: 'Colombia' },
  { name: 'Fundacion Liceo Ingles Pereira', city: 'Pereira', country: 'Colombia' },
  { name: 'Gimnasio Colombo Britanico Bilingue Internacional', city: 'Medellín', country: 'Colombia' },
  { name: 'Knightsbridge Schools International Bogota', city: 'Bogotá', country: 'Colombia' },
  { name: 'Rochester School Bogota', city: 'Bogotá', country: 'Colombia' },
  { name: 'The Canadian School of Medellin', city: 'Medellín', country: 'Colombia' },
  { name: 'The Columbus School', city: 'Medellín', country: 'Colombia' },
  { name: 'The English School Bogota', city: 'Bogotá', country: 'Colombia' },

  // --- Ecuador ---
  { name: 'Academia Cotopaxi American International School', city: 'Quito', country: 'Ecuador' },
  { name: 'American School of Quito', city: 'Quito', country: 'Ecuador' },
  { name: 'Colegio Menor Guayaquil', city: 'Guayaquil', country: 'Ecuador' },
  { name: 'Unidad Educativa Alberto Einstein', city: 'Quito', country: 'Ecuador' },

  // --- El Salvador & Honduras ---
  { name: 'Academia Britanica Cuscatleca', city: 'Santa Tecla', country: 'El Salvador' },
  { name: 'Colegio Internacional de San Salvador', city: 'San Salvador', country: 'El Salvador' },
  { name: 'The American School of El Salvador', city: 'San Salvador', country: 'El Salvador' },
  { name: 'Alison Bixby Stone School Honduras', city: 'San Pedro Sula', country: 'Honduras' },
  { name: 'Escuela Internacional Sampedrana', city: 'San Pedro Sula', country: 'Honduras' },

  // --- Guatemala & Bolivia ---
  { name: 'Colegio Maya', city: 'Guatemala City', country: 'Guatemala' },
  { name: 'Santa Cruz Cooperative School', city: 'Santa Cruz', country: 'Bolivia' },

  // --- Peru ---
  { name: 'Colegio Franklin Roosevelt The American School of Lima', city: 'Lima', country: 'Peru' },
  { name: 'Newton College Lima', city: 'Lima', country: 'Peru' },

  // --- Brazil ---
  { name: 'American School of Belo Horizonte', city: 'Belo Horizonte', country: 'Brazil' },
  { name: 'American School of Recife', city: 'Recife', country: 'Brazil' },
  { name: 'Avenues The World School Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Chapel School Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Escola Americana de Campinas', city: 'Campinas', country: 'Brazil' },
  { name: 'Escola Beit Yaacov Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Escola Cidade Jardim Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Graded The American School Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Instituto Alberto Einstein Sao Paulo', city: 'São Paulo', country: 'Brazil' },
  { name: 'Pan American School of Bahia', city: 'Salvador', country: 'Brazil' },
  { name: 'Panamerican School of Porto Alegre', city: 'Porto Alegre', country: 'Brazil' },
  { name: 'St. Francis College Sao Paulo', city: 'São Paulo', country: 'Brazil' },

  // --- Costa Rica & Panama ---
  { name: 'Country Day School San Jose', city: 'San José', country: 'Costa Rica' },
  { name: 'Marian Baker School San Jose', city: 'San José', country: 'Costa Rica' },
  { name: 'Pan-American School Costa Rica', city: 'San José', country: 'Costa Rica' },
  { name: 'The International School of Panama', city: 'Panama City', country: 'Panama' },

  // --- Caribbean ---
  { name: 'American International School Kingston', city: 'Kingston', country: 'Jamaica' },
  { name: 'Cap Cana Heritage School', city: 'Punta Cana', country: 'Dominican Republic' },
  { name: 'International School of Sosua', city: 'Sosúa', country: 'Dominican Republic' },
  { name: 'The Codrington School International School of Barbados', city: 'Bridgetown', country: 'Barbados' },
  { name: 'Saltus Grammar School', city: 'Hamilton', country: 'Bermuda' },
  { name: "St. Michael's School Bermuda", city: 'Hamilton', country: 'Bermuda' },
  { name: 'Warwick Academy Bermuda', city: 'Hamilton', country: 'Bermuda' },

  // --- Pacific ---
  { name: 'International School Nadi', city: 'Nadi', country: 'Fiji' },
  { name: 'International School Suva', city: 'Suva', country: 'Fiji' },
  { name: 'Port Vila International School', city: 'Port Vila', country: 'Vanuatu' },

  // --- Cuba & Montenegro & Curaçao ---
  { name: 'International School Havana', city: 'Havana', country: 'Cuba' },
  { name: 'Knightsbridge Schools International Montenegro', city: 'Podgorica', country: 'Montenegro' },
  { name: 'International School of Curacao', city: 'Willemstad', country: 'Curaçao' },
]

// ---------------------------------------------------------------------------
// MAIN SEED FUNCTION
// ---------------------------------------------------------------------------
async function seedSchools() {
  console.log(`\n=== School Directory Seed Script ===\n`)
  console.log(`Total raw entries: ${RAW_SCHOOLS.length}`)

  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB\n')

  // -------------------------------------------------------------------------
  // 1. Resolve country codes + regions, detect missing city
  // -------------------------------------------------------------------------
  const resolved: {
    name: string
    city: string | null
    country: string
    countryCode: string
    region: string
  }[] = []

  const skipped: { name: string; country: string; reason: string }[] = []

  for (const raw of RAW_SCHOOLS) {
    const code = resolveCountryCode(raw.country)
    if (!code) {
      skipped.push({ name: raw.name, country: raw.country, reason: 'Unknown country' })
      continue
    }

    const region = getRegionForCountryCode(code)
    const country = resolveCountryName(code)

    // Detect missing city: if city name matches country name (case-insensitive), store null
    // This handles city-states like "Singapore, Singapore" or "Hong Kong, Hong Kong"
    const cityNorm = raw.city.trim().toLowerCase()
    const countryNorm = country.toLowerCase()
    const city = cityNorm === countryNorm ? null : raw.city.trim()

    resolved.push({ name: raw.name.trim(), city, country, countryCode: code, region })
  }

  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} entries (unknown country):`)
    for (const s of skipped) {
      console.log(`  - ${s.name} (${s.country})`)
    }
    console.log()
  }

  console.log(`Resolved ${resolved.length} schools across ${new Set(resolved.map(r => r.countryCode)).size} countries\n`)

  // -------------------------------------------------------------------------
  // 2. Generate unique slugs (append -countrycode on collision)
  // -------------------------------------------------------------------------
  const slugMap = new Map<string, number>()
  const withSlugs: (typeof resolved[number] & { slug: string })[] = []

  for (const school of resolved) {
    let slug = generateSlug(school.name)

    // Check for collision within this batch
    const existing = slugMap.get(slug)
    if (existing !== undefined) {
      // Append country code to make unique
      slug = `${slug}-${school.countryCode.toLowerCase()}`
      // Still a collision? (very unlikely) Append a counter
      if (slugMap.has(slug)) {
        let counter = 2
        while (slugMap.has(`${slug}-${counter}`)) counter++
        slug = `${slug}-${counter}`
      }
    }

    slugMap.set(slug, 1)
    withSlugs.push({ ...school, slug })
  }

  // -------------------------------------------------------------------------
  // 3. Build bulkWrite operations with $setOnInsert (idempotent)
  //    Uses slug as the unique key — won't overwrite claimed profiles.
  // -------------------------------------------------------------------------
  const operations = withSlugs.map(school => ({
    updateOne: {
      filter: { slug: school.slug },
      update: {
        $setOnInsert: {
          name: school.name,
          slug: school.slug,
          country: school.country,
          countryCode: school.countryCode,
          city: school.city,
          region: school.region,
          claimed: false,
          isVerified: false,
          profileCompleteness: 0,
          photos: [],
          curriculum: [],
          languages: [],
          accreditations: [],
          benefits: [],
        },
      },
      upsert: true,
    },
  }))

  console.log(`Executing bulkWrite with ${operations.length} upsert operations...`)

  const result = await School.bulkWrite(operations, { ordered: false })

  console.log(`\nResults:`)
  console.log(`  Inserted (new):  ${result.upsertedCount}`)
  console.log(`  Matched (existing, skipped): ${result.matchedCount}`)
  console.log(`  Modified: ${result.modifiedCount}`)

  // -------------------------------------------------------------------------
  // 4. Print summary stats
  // -------------------------------------------------------------------------
  const totalSchools = await School.countDocuments()
  const regionCounts = await School.aggregate([
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
  const countryCounts = await School.aggregate([
    { $group: { _id: '$countryCode', country: { $first: '$country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ])

  console.log(`\n=== Directory Stats ===`)
  console.log(`Total schools in DB: ${totalSchools}`)
  console.log(`\nBy region:`)
  for (const r of regionCounts) {
    console.log(`  ${r._id}: ${r.count}`)
  }
  console.log(`\nTop 15 countries:`)
  for (const c of countryCounts) {
    console.log(`  ${c.country} (${c._id}): ${c.count}`)
  }

  console.log(`\nSeed complete!\n`)

  await mongoose.disconnect()
}

seedSchools().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
