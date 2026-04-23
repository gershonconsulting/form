// SECTIONS schema — mirrors what's in GershonOnboarding.tsx
const SECTIONS = [
  { id: 'about_you', number: '01', title: 'About You', fields: [
    { id: 'companyName', label: 'Company Name', required: true },
    { id: 'firstName', label: 'First Name', required: true },
    { id: 'lastName', label: 'Last Name', required: true },
    { id: 'title', label: 'Title', required: true },
    { id: 'email', label: 'Email', required: true },
    { id: 'mobilePhone', label: 'Mobile Phone Number', required: true },
  ]},
  { id: 'business', number: '02', title: 'Your Business', fields: [
    { id: 'businessType', label: 'Type of business', required: true },
    { id: 'industry', label: 'Industry', required: true },
    { id: 'expectations', label: 'Expectations for this campaign', required: true, long: true },
    { id: 'productLinks', label: 'Product/service page links', required: false, long: true },
    { id: 'website', label: 'Website address', required: true },
  ]},
  { id: 'campaign', number: '03', title: 'Campaign Scope', fields: [
    { id: 'campaignDuration', label: 'How long do you plan to run this campaign', required: true, options: ['3 months (the bare minimum)', '6 months', '12 months', 'As long as we get good meetings', 'As long as it is profitable'] },
    { id: 'campaignServices', label: 'Which services are you interested in', required: true, options: ['ENGAGE — Prospecting + LinkedIn outreach (DMs)', 'PROMOTE — Social media management', 'NETWORK — LinkedIn profile + Sales Nav optimization', 'ENGAGE + PROMOTE', 'ENGAGE + NETWORK', 'PROMOTE + NETWORK', 'All three: ENGAGE + PROMOTE + NETWORK'], multi: true },
    { id: 'meetingsPerMonth', label: 'Monthly meetings goal', required: true },
  ]},
  { id: 'target', number: '04', title: 'Target Market (ENGAGE)', fields: [
    { id: 'targetDefinition', label: 'Define your ideal target customer', required: true, long: true },
    { id: 'targetGeography', label: 'Geographic focus', required: true },
    { id: 'targetIndustries', label: 'Target industries', required: true, long: true },
    { id: 'targetTitles', label: 'Target job titles / decision-makers', required: true, long: true },
    { id: 'targetHeadcount', label: 'Target company headcount range', required: true },
    { id: 'targetRevenue', label: 'Target revenue range (min-max)', required: true },
  ]},
  { id: 'promote', number: '05', title: 'Social Networks (PROMOTE)', optional: true, fields: [
    { id: 'top5Highlights', label: 'Top 5 things to highlight on social', required: true, long: true },
    { id: 'otherContent', label: 'Other content to include', required: false, long: true },
    { id: 'dontWantContent', label: 'Content you do NOT want', required: true, long: true },
    { id: 'twitterHashtags', label: 'Twitter hashtags to focus on', required: false },
    { id: 'competitorTwitterAccounts', label: 'Twitter accounts of top 10 competitors', required: false, long: true },
    { id: 'googleKeywords', label: 'Google keywords to focus on', required: false, long: true },
    { id: 'photosLink', label: 'Dropbox/Drive link to photos', required: false },
    { id: 'royaltyFreeConsent', label: 'Consent to use royalty-free library photos', required: true, options: ['Yes, you have my approval', 'No, use only ours', 'Other'] },
    { id: 'linkedInPageAdmin', label: 'Added Olivier Attia as Admin of LinkedIn Page', required: true, options: ['Confirmed'] },
    { id: 'facebookPageAdmin', label: 'Added Olivier Attia as Admin of Facebook Page', required: false, options: ['Confirmed'] },
    { id: 'googleBusinessAdmin', label: 'Added Olivier Attia as Admin of Google Business', required: false, options: ['Confirmed'] },
    { id: 'twitterCredentials', label: 'Twitter login and password (optional)', required: false },
  ]},
  { id: 'network', number: '06', title: 'LinkedIn Profile (NETWORK)', optional: true, fields: [
    { id: 'companyLinkedIn', label: 'Company LinkedIn page', required: true },
    { id: 'personalLinkedIn', label: 'Personal LinkedIn page', required: true },
    { id: 'salesNavActive', label: 'Sales Navigator license activated', required: true, options: ['Yes'] },
    { id: 'linalysisActive', label: 'Linalysis account activated', required: true, options: ['Yes'] },
    { id: 'calendlyLink', label: 'Calendly (or equivalent) link', required: true },
    { id: 'ssiScores', label: 'Social Selling Index scores', required: false },
    { id: 'competitors', label: 'Top 5 competitors with websites and why', required: true, long: true },
  ]},
  { id: 'comments', number: '07', title: 'Comments', fields: [
    { id: 'additionalComments', label: 'Anything else important', required: false, long: true },
  ]},
  { id: 'timing', number: '08', title: 'Timing & Quote', fields: [
    { id: 'startDate', label: 'Starting campaign date', required: true },
    { id: 'quoteReference', label: 'Reference of the validated quote', required: true, long: true },
  ]},
];

export function buildSystemPrompt(
  capturedState: Record<string, any> = {},
  sectionsDoneState: Record<string, boolean> = {},
  researchSource: any = null
): string {
  const sectionsDoc = SECTIONS.map(s => {
    const fieldLines = s.fields.map(f => {
      const opts = (f as any).options ? ` [options: ${(f as any).options.join(' | ')}${(f as any).multi ? ' — multi-select' : ''}]` : '';
      const req = f.required ? ' (REQUIRED)' : ' (optional)';
      return `  - ${f.id}: ${f.label}${req}${opts}`;
    }).join('\n');
    return `SECTION ${s.number} — ${s.title} [id: ${s.id}]${(s as any).optional ? ' (optional)' : ''}\n${fieldLines}`;
  }).join('\n\n');

  return `You are the onboarding assistant for GERSHON CONSULTING LLC, a B2B outbound sales consulting firm specializing in LinkedIn-based lead generation for non-US companies entering the American market.

Your job is to conduct a warm, consultative onboarding conversation. Think of yourself as a senior strategist doing intake — not a form filler.

CORE PRINCIPLE: Research first, then confirm. Use web_search proactively. Pre-fill suggestions for every field you reasonably can, then let the client confirm or correct.

VOICE & TONE: Warm, confident, professional. Concise: 2-5 sentences per message. Refer to yourself as "the Gershon team" or "we".

RESPONSE FORMAT — STRICT: Respond ONLY with valid JSON:
{
  "message": "conversational message (plain text, no markdown)",
  "capture": { "fieldId": "value" },
  "currentSection": "section_id",
  "sectionComplete": false,
  "readyForReview": false
}

SECTIONS:\n${sectionsDoc}

CURRENT STATE:
${researchSource ? `Upfront research was done on ${researchSource.url}: ${researchSource.summary || ''}\nPRE-FILLED fields: confirm each quickly with the client.` : 'No upfront research. Start from Section 01.'}

Already captured:
${Object.keys(capturedState).length > 0 ? Object.entries(capturedState).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n') : '(none yet)'}

Sections completed: ${Object.keys(sectionsDoneState).filter(k => sectionsDoneState[k]).join(', ') || '(none)'}`;
}
