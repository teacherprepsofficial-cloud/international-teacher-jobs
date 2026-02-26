import { JobSource } from './types'

export const JOB_SOURCES: JobSource[] = [
  {
    id: 'tes-international',
    name: 'TES International',
    baseUrl: 'https://www.tes.com',
    searchUrl: 'https://www.tes.com/jobs/search?keywords=&location=Worldwide&radius=0&jobType=International',
    parserType: 'tes',
    maxPages: 10,
  },
  {
    id: 'tie-online',
    name: 'TIE Online – The International Educator',
    baseUrl: 'https://www.tieonline.com',
    searchUrl: 'https://www.tieonline.com/international-teaching-jobs',
    parserType: 'tie-online',
    maxPages: 15,
  },
]
