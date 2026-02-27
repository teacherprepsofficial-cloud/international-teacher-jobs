/**
 * Update the 4 crawled job postings with full detailed descriptions.
 * Matches by contentHash and updates the description field.
 *
 * Usage: npx tsx scripts/update-crawled-jobs.ts
 */

import mongoose from 'mongoose'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

const JobPostingSchema = new mongoose.Schema({
  position: String,
  schoolName: String,
  description: String,
  contentHash: String,
  salary: String,
})
const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', JobPostingSchema)

function computeContentHash(position: string, schoolName: string, sourceUrl: string): string {
  const input = `${position.trim().toLowerCase()}|${schoolName.trim().toLowerCase()}|${sourceUrl.trim().toLowerCase()}`
  return crypto.createHash('sha256').update(input).digest('hex')
}

interface Update {
  position: string
  schoolName: string
  applicationUrl: string
  description: string
  salary?: string
}

const UPDATES: Update[] = [
  // 1. The Steward School — Middle School Mathematics Teacher
  {
    position: 'Middle School Mathematics Teacher',
    schoolName: 'The Steward School',
    applicationUrl: 'https://www.stewardschool.org/our-school/employment-opportunities',
    salary: 'Commensurate with experience and education + comprehensive benefits',
    description: `The Steward School in Richmond, Virginia is hiring a full-time, benefited Middle School Mathematics Teacher beginning August 2026.

POSITION OVERVIEW
Teach five sections of Math 6 and/or Math 6.5 (Introduction to Pre-Algebra) to sixth-grade students. The Steward School is a JK-12 independent school on a 126-acre campus serving students in the greater Richmond area. Named a Top Workplace by the Richmond Times-Dispatch for ten consecutive years.

RESPONSIBILITIES
• Build meaningful relationships with students and provide an empowering, student-centered learning environment that is equitable, inclusive, respectful, and supportive
• Design and deliver instruction that develops critical thinking skills with effective technology integration
• Collaborate with grade-level and department colleagues on curriculum and instruction
• Maintain thorough curriculum documentation and records
• Implement differentiated instruction to meet the needs of diverse learners
• Advise a student group
• Complete other duties as assigned by division leadership

REQUIRED QUALIFICATIONS
• Bachelor's degree with a major concentration in Mathematics and/or Education

PREFERRED QUALIFICATIONS
• Master's degree and/or Commonwealth of Virginia teaching certification
• Middle school mathematics teaching experience
• Proficiency with Google Educational apps and interactive whiteboards
• Growth mindset and enthusiasm for ongoing professional development and academic excellence
• Coaching or club sponsorship experience
• Strong communication and collaboration abilities
• Curriculum design and assessment skills for diverse learners

COMPENSATION & BENEFITS
• Salary commensurate with experience and education
• Health and dental coverage (school-paid premiums)
• Life insurance matching employee salary
• Short-term and long-term disability coverage
• AFLAC supplemental insurance options
• 403(b) retirement plan with school contributions
• Professional development funding and conference grants
• Tuition remission for employee children (JK-12)
• Fitness center access
• Complimentary after-school childcare until 6:00 PM
• Paid leave and vacation

APPLICATION DEADLINE: April 28, 2026
APPLICATION INSTRUCTIONS: Submit resume and cover letter through the online employment application, referencing the position title. No calls or visits, please.
HR CONTACT: Kelly Lester, HR Coordinator — (804) 740-3394`,
  },

  // 2. Aarhus International School — EAL Teacher
  {
    position: 'PYP4-8 English as an Additional Language (EAL) Teacher',
    schoolName: 'Aarhus International School',
    applicationUrl: 'https://ais-aarhus.com/work-with-us/',
    description: `Aarhus International School (AIS) is hiring a PYP4-8 English as an Additional Language (EAL) Teacher for the 2026-2027 academic year.

ABOUT THE SCHOOL
AIS is an IB World School and private day school for students of expatriate and Danish families, offering an English-language programme of studies in Aarhus, Denmark. The school offers three IB programmes:
• Early Years Programme (PYP 1-3) — Ages 3-6
• Primary Years Programme (PYP 4-8) — Ages 6-10
• Middle Years Programme (MYP 1-5) — Ages 11-16

The school recently completed the "Project One Campus" construction project with brand-new facilities. AIS maintains partnerships with the municipality, industry, and other educational institutions.

POSITION OVERVIEW
The EAL Teacher will support multilingual learners across PYP grades 4-8 (ages 6-10), helping students develop English language proficiency within the IB Primary Years Programme framework.

KEY REQUIREMENTS
• Experience supporting multilingual learners in an international school setting
• Strong knowledge of EAL pedagogy and differentiation strategies
• Familiarity with the IB Primary Years Programme
• Experience working with diverse, international student populations

CURRICULUM: IB Primary Years Programme (PYP)
LANGUAGES OF INSTRUCTION: English (primary), with Danish A and home language support programmes available

COMPENSATION
Salary determined by the Danish Collective Agreement established by Privatskoleforening (Danish Private Schools Association). AIS is an equal opportunity employer.

SAFEGUARDING
AIS is committed to safeguarding the welfare of children and young people. All new staff undergo thorough pre-employment screening.

APPLICATION REQUIREMENTS
Submit a single document containing:
• CV with three professional references (including current/most recent employer and supervisors who can verify qualifications and experience)
• Cover letter
• Desired position and department

Data handling: All applicant data is securely stored and accessible only to relevant personnel. Data is deleted after 6 months.

CONTACT
Aarhus International School
Dalgas Avenue 12, 8000 Aarhus C, Denmark
+45 86 72 60 60
administration@ais-aarhus.dk`,
  },

  // 3. Colegio Nueva Granada — Physics Teacher
  {
    position: 'Physics Teacher (Secondary, Ages 12-18)',
    schoolName: 'Colegio Nueva Granada',
    applicationUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000008aKQDMA2',
    description: `Colegio Nueva Granada (CNG) in Bogota, Colombia is seeking a Physics Teacher for secondary students ages 12-18, beginning August 2026.

ABOUT THE SCHOOL
Colegio Nueva Granada is one of Latin America's top international schools, offering a K4-12 accredited U.S./Colombian college-preparatory program. CNG is accredited by Cognia (formerly AdvancED) and the Colombian Ministry of Education.

CURRICULUM & ACADEMICS
• U.S. college-preparatory curriculum with 20+ Honors/Pre-AP classes and 25 Advanced Placement (AP) courses
• Dual diploma program: U.S. High School Diploma and Colombian Bachillerato Diploma
• All academic instruction in English, except Colombian social studies and Spanish language
• Comprehensive social-emotional support programs

POSITION OVERVIEW
Teach physics to secondary students (ages 12-18) within CNG's rigorous college-preparatory science program. The ideal candidate will engage students through inquiry-based learning, laboratory investigations, and real-world applications of physics concepts.

KEY REQUIREMENTS
• Strong background in physics instruction at the secondary level
• Experience with AP Physics curriculum preferred
• Ability to deliver instruction in English
• Experience in international or multicultural school settings preferred
• Familiarity with U.S. college-preparatory standards

LOCATION
Bogota, Colombia — one of South America's most dynamic capital cities, with a vibrant expatriate community and year-round spring-like climate at 8,660 feet elevation.

POSTED VIA: ISS (International Schools Services) EDU Platform`,
  },

  // 4. Vision International School — Home Economics Teacher
  {
    position: 'Home Economics Teacher (Primary, Ages 6-11)',
    schoolName: 'Vision International School',
    applicationUrl: 'https://eduplatform.iss.edu/s/external-job?job=a1JQm000009eICLMA2',
    description: `Vision International School (VIS) in Doha, Qatar is seeking a Home Economics Teacher for primary students ages 6-11.

ABOUT THE SCHOOL
Vision International School is an American-curriculum school in Doha, Qatar serving grades 1-12. The school is accredited by the New England Association of Schools and Colleges (NEASC) and is a member of the Council for International Schools (CIS) and the Middle States Association for Schools and Colleges.

CURRICULUM & ACADEMICS
• American curriculum based on Common Core, AERO (American Education Reaches Out), and Next Generation Science Standards (NGSS)
• Grade structure: Early Childhood, Elementary (Grades 1-5), Middle School (Grades 6-8), High School (Grades 9-12)
• Additional required subjects: Arabic language, Qatari History, and Islamic Studies
• Instruction primarily in English

POSITION OVERVIEW
Teach home economics to primary/elementary students (ages 6-11, Grades 1-5). Create engaging, hands-on learning experiences covering practical life skills, nutrition, food preparation, textiles, and household management appropriate for young learners.

KEY REQUIREMENTS
• Experience teaching home economics or family and consumer sciences at the primary/elementary level
• Ability to design age-appropriate, hands-on activities and projects
• Experience in an international school setting preferred
• Familiarity with American curriculum standards preferred

LOCATION
Doha, Qatar — a rapidly growing, tax-free international hub in the Middle East. International teaching positions in Qatar typically include competitive salary packages with benefits such as housing allowance, annual airfare, and medical insurance.

POSTED VIA: ISS (International Schools Services) EDU Platform`,
  },
]

async function main() {
  await mongoose.connect(MONGODB_URI!)
  console.log('Connected to MongoDB\n')

  let updated = 0

  for (const u of UPDATES) {
    const contentHash = computeContentHash(u.position, u.schoolName, u.applicationUrl)

    const result = await JobPosting.updateOne(
      { contentHash },
      {
        $set: {
          description: u.description,
          ...(u.salary ? { salary: u.salary } : {}),
        },
      }
    )

    if (result.modifiedCount > 0) {
      console.log(`UPDATED: ${u.position} at ${u.schoolName}`)
      updated++
    } else if (result.matchedCount > 0) {
      console.log(`NO CHANGE: ${u.position} at ${u.schoolName}`)
    } else {
      console.log(`NOT FOUND: ${u.position} at ${u.schoolName}`)
    }
  }

  console.log(`\nDone: ${updated} updated`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
