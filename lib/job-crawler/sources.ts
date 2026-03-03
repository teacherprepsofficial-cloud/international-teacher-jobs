import { JobSource } from './types'

export const JOB_SOURCES: JobSource[] = [
  {
    id: 'tes-international',
    name: 'TES International',
    baseUrl: 'https://www.tes.com',
    searchUrl: 'https://www.tes.com/jobs/search?keywords=&location=Worldwide&radius=0&jobType=International&sort=date',
    parserType: 'tes',
    maxPages: 10,
  },
  {
    id: 'seekteachers',
    name: 'SeekTeachers',
    baseUrl: 'https://www.seekteachers.com',
    searchUrl: 'https://www.seekteachers.com/jobs.asp',
    parserType: 'seekteachers',
    maxPages: 15,
  },
  {
    id: 'tieonline',
    name: 'TIE Online',
    baseUrl: 'https://www.tieonline.com',
    searchUrl: 'https://www.tieonline.com/region.cfm?subject=&region=0',
    parserType: 'tieonline',
    maxPages: 1,
  },
  {
    id: 'isj',
    name: 'International School Jobs',
    baseUrl: 'https://www.internationalschooljobs.com',
    searchUrl: 'https://www.internationalschooljobs.com/feed.xml',
    parserType: 'isj-feed',
    maxPages: 1,
  },
]
