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
