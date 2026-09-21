// 10 career fields. Each ships ready-to-use summary templates (2–3 lines each),
// full bullet templates, suggested skills and project ideas — so anyone can
// finish in ~10 minutes without staring at a blank page.

export interface Field {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  roles: string[];
  skills: string[];
  summaryExample: string;
  summaryTemplates: string[];
  bulletExample: string[];
  bulletTemplates: string[];
  projectIdeas: string[];
}

// Offered in every field, as requested
export const COMMON_SKILLS = ['Communication', 'Decision Making'];

export const FIELDS: Field[] = [
  {
    id: 'it',
    label: 'IT & Software',
    icon: '💻',
    tagline: 'Developers, DevOps, QA, support — skills-first layout',
    roles: ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'QA Engineer'],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Docker', 'Git', 'REST APIs', 'CI/CD'],
    summaryExample:
      'Software engineer with 4 years of experience building web applications in React and Node.js. Worked on products used by 30,000+ monthly users, cut page load time by 40%, and mentored two junior developers. Comfortable owning features from design discussion to production release.',
    summaryTemplates: [
      'Software engineer with [X] years of experience building web applications in [React / TypeScript / Node.js]. At [company] I owned the [module/dashboard] used by [number]+ monthly users and cut its load time from [X]s to [Y]s. Comfortable taking a feature from a rough discussion to a stable production release.',
      'Developer with [X] years focused on [frontend / backend] work across [industry] products. Recently shipped [feature/project], which reduced [support tickets / build time / errors] by [number]%. I write tested, maintainable code and communicate clearly with designers and QA.',
      '[X] years in software development, mainly with [technologies]. Known for debugging hard issues quickly and for keeping documentation honest and up to date. Looking for a [role] position where I can own features end to end.',
    ],
    bulletExample: [
      'Rebuilt the billing dashboard in React and cut average page load from 4.2s to 2.5s',
      'Wrote 220+ unit and integration tests, taking release regressions from ~6 per month to under 1',
      'Moved deployment to GitHub Actions with Docker, reducing release time from 45 min to 8 min',
    ],
    bulletTemplates: [
      'Built the [feature/module] in [technology], now used by [number] users in daily work',
      'Improved page load time from [X]s to [Y]s by splitting bundles and caching API responses',
      'Added [number] unit and integration tests, which reduced release bugs by [number]%',
      'Automated the [build/deployment] process with [tool], saving the team around [X] hours every week',
      'Worked with designers and QA to ship [feature] on schedule across web and mobile',
      'Fixed long-standing [type] issues and brought support tickets down from [X] to [Y] per week',
    ],
    projectIdeas: ['Open-source contribution', 'Internal tool you built', 'API or service you designed'],
  },
  {
    id: 'data',
    label: 'Data & AI',
    icon: '📊',
    tagline: 'Analysts, data engineers, ML — evidence and numbers up front',
    roles: ['Data Analyst', 'Data Scientist', 'Data Engineer', 'ML Engineer', 'Business Intelligence Analyst'],
    skills: ['SQL', 'Python', 'Pandas', 'Power BI', 'Tableau', 'Excel', 'dbt', 'Airflow', 'Machine Learning', 'Statistics', 'BigQuery', 'ETL'],
    summaryExample:
      'Data analyst with 3 years of experience turning messy business data into decisions. Built the weekly sales reporting pipeline used by 4 teams, found a pricing gap worth ₹18L annually, and trained 12 teammates on SQL basics.',
    summaryTemplates: [
      'Data analyst with [X] years of experience in SQL, Python and [Power BI / Tableau]. At [company] I automated the weekly [sales/ops] report for [number] teams, saving about [X] hours of manual work every week. I enjoy finding the one number that changes a decision.',
      'Analyst with [X] years across reporting, dashboards and forecasting. My [pricing/cost] analysis found ₹[amount] of annual leakage, and the dashboards I built are now used by [number] people across the business. Explaining findings to non-technical teams is a strength.',
      'Data professional with [X] years in the [industry] sector, hands-on with [SQL / Python / tool]. Built the [pipeline/report] that became the single source of truth for [team], and documented it so anyone can maintain it. Looking for a role where analysis directly shapes business calls.',
    ],
    bulletExample: [
      'Automated the weekly revenue report with Python and Airflow, saving the team 15 hours a week',
      'Built churn prediction model in scikit-learn that flagged 68% of at-risk accounts a month early',
      'Redesigned the marketing funnel dashboard in Power BI, adopted by 40+ stakeholders',
    ],
    bulletTemplates: [
      'Automated the [weekly/monthly] [report] using Python and Airflow, saving the team [X] hours a week',
      'Built the [name] dashboard in Power BI, now the primary weekly view for [number] teams',
      'Identified a [pricing / cost / leakage] gap in the data worth ₹[amount] per year',
      'Reduced report preparation time from [X] hours to [Y] by restructuring the underlying SQL queries',
      'Forecasted [sales/demand] for the quarter and landed within [number]% of actuals',
      'Trained [number] teammates on SQL and reporting basics over [time period]',
    ],
    projectIdeas: ['Kaggle or analysis write-up', 'Dashboard you built', 'Data pipeline you own'],
  },
  {
    id: 'marketing',
    label: 'Marketing & Growth',
    icon: '📣',
    tagline: 'Performance, content, brand — campaign results that show scale',
    roles: ['Digital Marketing Executive', 'Performance Marketer', 'Content Marketing Manager', 'SEO Specialist', 'Growth Manager'],
    skills: ['Google Ads', 'Meta Ads', 'SEO', 'Google Analytics', 'Email Marketing', 'Content Strategy', 'CRM', 'Copywriting', 'Marketing Automation', 'A/B Testing'],
    summaryExample:
      'Digital marketer with 4 years of experience across paid media and SEO. Managed a monthly ad budget of ₹8L with a 4.2x ROAS, grew organic traffic from 12k to 55k visits a month, and ran email flows that add 11% of store revenue.',
    summaryTemplates: [
      'Digital marketer with [X] years across Google Ads, Meta and SEO. Managed a monthly budget of ₹[amount] and held ROAS above [number]x for [time period]. I plan campaigns, run them, and report the numbers myself — no gap between strategy and execution.',
      'Performance marketer with [X] years in paid media for [industry] brands. Grew monthly leads from [X] to [Y] while cutting cost per lead by [number]%. Comfortable owning the full funnel from click to conversion, and sharing weekly reports without being chased.',
      'Content and SEO specialist with [X] years of experience. Grew organic traffic from [X] to [Y] monthly visits in [time period] through keyword clusters and steady publishing. A strong writer who is equally comfortable in analytics.',
    ],
    bulletExample: [
      'Ran Google and Meta campaigns on an ₹8L monthly budget and held ROAS above 4x for six straight quarters',
      'Grew organic traffic from 12k to 55k monthly visits in 10 months through content clusters and technical fixes',
      'Launched abandoned-cart email flow that recovered 7% of lost carts within 60 days',
    ],
    bulletTemplates: [
      'Managed ₹[amount]/month in [Google / Meta] ads and maintained a ROAS above [number]x',
      'Grew organic traffic from [X] to [Y] monthly visits in [time period] through content and technical SEO',
      'Launched the [campaign / email flow] that added [number]% to [revenue / signups] within 60 days',
      'Improved ad CTR from [X]% to [Y]% by rewriting creatives and testing [number] variants',
      'Published [number] pieces of content a month and grew newsletter subscribers from [X] to [Y]',
      'Coordinated with design and sales to launch [campaign] across [number] channels on schedule',
    ],
    projectIdeas: ['Campaign case study', 'Brand or community you grew', 'Content engine you built'],
  },
  {
    id: 'sales',
    label: 'Sales & Business Dev',
    icon: '🤝',
    tagline: 'Quotas, pipeline, key accounts — put the number on the line',
    roles: ['Sales Executive', 'Business Development Manager', 'Account Manager', 'Inside Sales Specialist', 'Sales Engineer'],
    skills: ['Lead Generation', 'CRM (HubSpot/Salesforce)', 'Negotiation', 'Cold Calling', 'Pipeline Management', 'Key Account Management', 'Demo & Pitching', 'Territory Planning'],
    summaryExample:
      'Sales professional with 5 years in B2B software sales. Closed ₹2.4Cr in new business last year at 118% of quota, built a 140-account pipeline from scratch in a new territory, and hold the region record for fastest enterprise close (21 days).',
    summaryTemplates: [
      'Sales professional with [X] years in [B2B / B2C] sales for [product type]. Closed ₹[amount] in new business last year at [number]% of quota. I build pipeline through referrals and disciplined follow-up, not just cold lists.',
      'Business development manager with [X] years opening and growing new accounts. Built the [territory] pipeline from zero to [number] active accounts in [time period]. Known for honest forecasting and renewals above [number]%.',
      'Account manager handling [number] key accounts worth ₹[amount] annually. Retained [number]% of clients through proactive service and quarterly reviews. Looking to bring the same care to a larger portfolio.',
    ],
    bulletExample: [
      'Closed ₹2.4Cr in new business in FY25, finishing at 118% of quota',
      'Built a 140-account pipeline in the West territory within two quarters using LinkedIn outreach and referrals',
      'Renewed 92% of accounts by value in 2024, the highest retention on a 6-person team',
    ],
    bulletTemplates: [
      'Closed ₹[amount] in new business in [period], finishing at [number]% of quota',
      'Added [number] new accounts in the [territory] through referrals and structured follow-ups',
      'Renewed [number]% of accounts by value with proactive quarterly reviews',
      'Shortened the average sales cycle from [X] to [Y] days by introducing a demo-first process',
      'Handled [number] client meetings and demos per week with a [number]% conversion rate',
      'Recovered [number]% of at-risk accounts by reworking pricing and service terms',
    ],
    projectIdeas: ['Biggest deal you closed', 'New market you opened', 'Sales process you improved'],
  },
  {
    id: 'finance',
    label: 'Finance & Accounting',
    icon: '🧮',
    tagline: 'Analysts, accountants, audit — accuracy and compliance',
    roles: ['Financial Analyst', 'Accountant', 'Audit Associate', 'Tax Consultant', 'FP&A Analyst'],
    skills: ['Financial Modeling', 'Excel (Advanced)', 'Tally', 'SAP', 'Budgeting', 'Forecasting', 'GST & TDS', 'Reconciliation', 'Financial Reporting', 'Variance Analysis'],
    summaryExample:
      'Finance professional with 4 years across FP&A and statutory reporting. Own the monthly close for a ₹60Cr business, cut reporting turnaround from 8 days to 3, and caught billing errors that recovered ₹22L in one fiscal year.',
    summaryTemplates: [
      'Finance professional with [X] years across accounting, MIS and statutory compliance. I manage the monthly close for a ₹[amount] business and consistently finish [number] days before deadline. Tally, SAP and advanced Excel are my daily tools.',
      'FP&A analyst with [X] years in budgeting and variance analysis. Built the annual budget model used by [number] departments, and my reporting pack goes to the leadership team every month. Accuracy and deadlines come first.',
      'Accountant with [X] years handling ledgers, GST and TDS for a [industry] business. Recovered ₹[amount] by catching duplicate vendor invoices during internal review. Comfortable supporting audits with clean, complete documentation.',
    ],
    bulletExample: [
      'Shortened the monthly close from 8 working days to 3 by rebuilding the reconciliation checklist',
      'Built the annual budgeting model used by 5 departments, covering ₹60Cr of spend',
      'Identified duplicate vendor invoices during internal audit and recovered ₹22L',
    ],
    bulletTemplates: [
      'Managed the monthly close for a ₹[amount] business, finishing [number] days before deadline',
      'Reconciled [number] vendor and bank accounts with zero open items at year end',
      'Filed GST and TDS returns for [number] entities on time across all periods',
      'Reduced report preparation time from [X] to [Y] days by rebuilding the MIS workbook',
      'Recovered ₹[amount] by identifying duplicate and incorrect vendor invoices',
      'Supported the statutory audit with complete schedules and no adverse observations',
    ],
    projectIdeas: ['Process you automated', 'Audit or compliance win', 'Model or report you own'],
  },
  {
    id: 'hr',
    label: 'HR & People',
    icon: '🧑‍💼',
    tagline: 'Recruiting, HR ops, L&D — hiring speed and retention',
    roles: ['HR Executive', 'Talent Acquisition Specialist', 'HR Business Partner', 'Payroll Specialist', 'L&D Coordinator'],
    skills: ['Recruitment', 'Onboarding', 'HRMS (Keka/greytHR)', 'Payroll Processing', 'Employee Engagement', 'Compliance (PF/ESI)', 'Interviewing', 'Performance Management'],
    summaryExample:
      'HR professional with 4 years of experience in recruitment and operations. Closed 85+ roles across engineering and sales in the last two years, cut average time-to-hire from 42 to 26 days, and run onboarding that holds 90-day retention at 96%.',
    summaryTemplates: [
      'HR professional with [X] years across recruitment, onboarding and payroll. Closed [number] roles in the last [time period] and brought average time-to-hire down from [X] to [Y] days. People trust me with their issues, and I keep data confidential.',
      'Talent acquisition specialist with [X] years hiring for [tech / sales / operations] teams. Sourced, screened and closed [number]+ positions with a 90-day retention rate of [number]%. Candidates get a clear answer at every step, and hiring managers get weekly updates.',
      'HR executive with [X] years in operations-heavy environments. Process payroll for [number] employees without missed cycles and run engagement programs people actually attend. Organised, approachable, and careful with records.',
    ],
    bulletExample: [
      'Closed 85+ openings in two years across engineering, sales, and support',
      'Cut time-to-hire from 42 to 26 days by introducing structured screening and same-week feedback',
      'Redesigned onboarding with a buddy system; 90-day retention improved from 84% to 96%',
    ],
    bulletTemplates: [
      'Closed [number] openings in [time period] across [departments], all within budget',
      'Cut average time-to-hire from [X] to [Y] days with structured screening and faster feedback',
      'Processed payroll for [number] employees every month with zero missed cycles',
      'Improved 90-day retention from [X]% to [Y]% by introducing a buddy onboarding program',
      'Ran [number] engagement activities with [number]% participation across the company',
      'Kept PF, ESI and compliance filings for [number] staff current through every inspection',
    ],
    projectIdeas: ['Hiring drive you led', 'Policy you introduced', 'Engagement program'],
  },
  {
    id: 'design',
    label: 'Design & Creative',
    icon: '🎨',
    tagline: 'UI/UX, graphic, product design — portfolio link is the star',
    roles: ['UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Visual Designer', 'Motion Designer'],
    skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'Adobe Illustrator', 'Photoshop', 'Typography', 'Usability Testing', 'After Effects'],
    summaryExample:
      'Product designer with 4 years of experience across fintech and e-commerce apps. Built the design system used by 3 product teams, improved checkout completion by 18% after a usability-led redesign, and ship weekly in close pairing with engineers.',
    summaryTemplates: [
      'Product designer with [X] years across [fintech / e-commerce] apps. My redesign of the [flow/screen] lifted completion by [number]%, based on [number] usability sessions. I work close to engineers and ship weekly. Portfolio: [link]',
      'UI/UX designer with [X] years turning complex flows into simple screens. Built a [number]-component design system in Figma that cut design time for new screens roughly in half. Typography and accessibility matter to me as much as looks.',
      'Graphic and visual designer with [X] years for [industry] brands. Designed campaigns with CTR running [number]% above account average, and handle everything from concept to final files. Quick, reliable, and easy to brief.',
    ],
    bulletExample: [
      'Redesigned checkout after 14 usability sessions and lifted completion from 61% to 79%',
      'Built a 120-component design system in Figma that cut new-screen design time roughly in half',
      'Designed campaign creatives that ran across Meta and Google with CTR 30% above account average',
    ],
    bulletTemplates: [
      'Redesigned the [screen / flow] after [number] usability sessions and lifted completion by [number]%',
      'Built a [number]-component design system in Figma, cutting new-screen design time by half',
      'Designed [number] campaign creatives that ran at [number]% CTR above account average',
      'Turned research findings into [number] concrete product changes within one quarter',
      'Delivered [project] from brief to handoff in [X] weeks, with zero visual bugs at launch',
      'Standardised handoff notes, reducing design-to-dev clarification rounds by [number]%',
    ],
    projectIdeas: ['Case study with before/after', 'Design system you built', 'Client or brand work'],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    icon: '🩺',
    tagline: 'Nursing, pharmacy, admin, allied health — care and compliance',
    roles: ['Staff Nurse', 'Pharmacist', 'Lab Technician', 'Hospital Administrator', 'Physiotherapist', 'Clinical Research Associate'],
    skills: ['Patient Care', 'EMR Systems', 'Medication Administration', 'Triage', 'Infection Control', 'Documentation', 'BLS/ACLS Certified', 'Sample Collection'],
    summaryExample:
      'Registered nurse with 5 years in a 300-bed multispecialty hospital. Managed a daily caseload of 18+ patients in the ICU, trained 10 new hires on EMR documentation, and helped the unit pass NABH audit with zero documentation errors.',
    summaryTemplates: [
      'Registered nurse with [X] years in a [number]-bed multispecialty hospital. Managed a daily caseload of [number]+ patients in the [unit] with zero medication errors over [time period]. Calm under pressure, and careful with documentation.',
      '[Role] with [X] years of clinical experience in [specialty]. Trained [number] new staff on [system / protocol] ahead of the [NABH] audit, which we passed without documentation findings. Patient communication is a genuine strength.',
      'Healthcare professional with [X] years across [department / unit]. Coordinated discharge planning that reduced average length of stay by [number] days. Certified in [BLS / ACLS], comfortable with EMR systems and shift rotations.',
    ],
    bulletExample: [
      'Managed a daily caseload of 18+ ICU patients with a medication error rate of zero over 3 years',
      'Trained 10 new staff on EMR documentation standards before the NABH audit',
      'Coordinated discharge planning that brought average length of stay down by 1.2 days',
    ],
    bulletTemplates: [
      'Managed a daily caseload of [number]+ patients in the [unit] with zero medication errors',
      'Trained [number] new staff on EMR documentation ahead of the [NABH] audit',
      'Coordinated discharge planning that brought average length of stay down by [number] days',
      'Maintained 100% documentation compliance across [number] cases during internal review',
      'Handled [number] sample collections per shift with a rejection rate under [number]%',
      'Counselled patients and families on care plans, improving follow-up visits by [number]%',
    ],
    projectIdeas: ['Quality initiative', 'Training you delivered', 'Audit or accreditation work'],
  },
  {
    id: 'education',
    label: 'Education & Training',
    icon: '🎓',
    tagline: 'Teachers, trainers, academic coordination — outcomes and scale',
    roles: ['Teacher', 'Academic Coordinator', 'Corporate Trainer', 'Instructional Designer', 'EdTech Content Developer'],
    skills: ['Curriculum Design', 'Classroom Management', 'Lesson Planning', 'Assessment Design', 'Google Classroom', 'Training Delivery', 'Content Development'],
    summaryExample:
      'Educator with 6 years of experience across school and EdTech settings. Teach 120+ students a year with a consistent 92% pass rate, built the Class 10 science question bank used by 4 schools, and mentor 3 new teachers each term.',
    summaryTemplates: [
      'Educator with [X] years teaching [subject] to [grade / audience]. Held a [number]% pass rate for [time period] and built a question bank now used by [number] schools. I plan lessons around where students actually struggle, not where the syllabus assumes they are.',
      'Teacher and academic coordinator with [X] years. Designed the [subject] curriculum adopted across [number] classes, and my remedial program moved [number] students above grade level in one term. Parents get honest, regular updates.',
      'Corporate trainer with [X] years delivering [topic] programs. Completed [number] training hours last year with an average feedback score of [number]/5. I measure success by what people apply at work, not by attendance sheets.',
    ],
    bulletExample: [
      'Taught science to 120+ students a year and held a 92% board-exam pass rate for four years',
      'Built a 1,200-question assessment bank adopted by 4 partner schools',
      'Ran a remedial program that moved 28 struggling students above grade level in one term',
    ],
    bulletTemplates: [
      'Taught [subject] to [number]+ students a year and held a [number]% pass rate for [time period]',
      'Built a [number]-question assessment bank adopted by [number] partner schools',
      'Moved [number] struggling students above grade level through a one-term remedial program',
      'Delivered [number] training hours last year with an average feedback score of [number]/5',
      'Mentored [number] new teachers each term on lesson planning and classroom handling',
      'Improved the class average from [X]% to [Y]% by restructuring the [topic] unit',
    ],
    projectIdeas: ['Curriculum you authored', 'Program that improved results', 'Training you delivered'],
  },
  {
    id: 'operations',
    label: 'Operations & Admin',
    icon: '⚙️',
    tagline: 'Supply chain, admin, project coordination — cost and time wins',
    roles: ['Operations Executive', 'Supply Chain Analyst', 'Project Coordinator', 'Office Manager', 'Procurement Specialist'],
    skills: ['Process Improvement', 'Vendor Management', 'Inventory Control', 'ERP (SAP/Oracle)', 'Logistics Coordination', 'Reporting', 'MS Excel', 'Lean Basics'],
    summaryExample:
      'Operations professional with 5 years across logistics and vendor management. Run daily dispatch for a 12,000 sq ft warehouse with 99.2% on-time rate, renegotiated transporter contracts saving ₹9L a year, and lead a 14-person shift team.',
    summaryTemplates: [
      'Operations professional with [X] years across logistics and vendor management. Run daily dispatch of [number]+ shipments at a [number]% on-time rate, and saved ₹[amount] a year by renegotiating transporter contracts. I lead a team of [number].',
      'Operations executive with [X] years in [industry]. Introduced a barcode-based stock audit that cut mismatches from [X]% to [Y]%, and manage inventory of [number] SKUs. Comfortable with ERP systems and peak-season pressure.',
      'Project coordinator with [X] years supporting [type] projects. Delivered [number] projects on schedule by tracking dependencies weekly and escalating early. Vendors, internal teams and clients all get clear, timely updates.',
    ],
    bulletExample: [
      'Held on-time dispatch at 99.2% across 1,400+ monthly shipments',
      'Renegotiated transporter contracts and cut logistics cost by ₹9L annually',
      'Introduced a barcode-based stock audit cycle, shrinking mismatch cases from 3% to 0.4%',
    ],
    bulletTemplates: [
      'Held on-time dispatch at [number]% across [number]+ monthly shipments',
      'Renegotiated transporter contracts and cut logistics cost by ₹[amount] annually',
      'Reduced stock mismatches from [X]% to [Y]% with a barcode-based audit cycle',
      'Managed inventory of [number] SKUs with [number]% count accuracy',
      'Led a team of [number] across [number] shifts with zero safety incidents',
      'Coordinated [number] vendor deliveries per month with no production stoppages',
    ],
    projectIdeas: ['Process you improved', 'Cost-saving negotiation', 'System you implemented'],
  },
];

export const fieldById = (id: string): Field => FIELDS.find((f) => f.id === id) ?? FIELDS[0];
