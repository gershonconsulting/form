'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, CircleDot, Circle, Send, Sparkles, ArrowRight, Download, AlertCircle, Pencil, Lock, Paperclip, FileText, ArrowLeft } from 'lucide-react';

// ============================================================================
// GERSHON CONSULTING — INTERACTIVE ONBOARDING FORM
// Gershon Welcome — served at welcome.gershon.ai (formerly form.gershonCRM.com)
// ============================================================================

const BRAND = {
  red: '#FE1B04',
  redDark: '#d11200',
  redLight: '#fff5f5',
  charcoal: '#1D1D1F',
  charcoalLight: '#4B4B50',
  cream: '#F9FAFB',
  paper: '#FFFFFF',
  rule: '#E5E7EB',
  ink: '#1D1D1F',
  muted: '#6E6E73',
};

// Build stamp — replaced at build time. NEXT_PUBLIC_BUILD_TIME is set in next.config.js
// so it's available in client components. Falls back to 'dev' for local development.
const BUILD_TIME =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_TIME) || 'dev';
const BUILD_LABEL = BUILD_TIME === 'dev'
  ? 'BUILD DEV'
  : `BUILD ${BUILD_TIME.replace('T', ' ').slice(0, 16).replace(/-/g, '‑')}`;

// Visible app version — bump on every UI change so previews are easy to tell apart.
const APP_VERSION = 'v0.4.7';

// Full field schema derived from the original Google Form
const SECTIONS = [
  {
    id: 'about_you',
    number: '01',
    title: 'About You',
    fields: [
      { id: 'companyName', label: 'Company Name', required: true },
      { id: 'firstName', label: 'First Name', required: true },
      { id: 'lastName', label: 'Last Name', required: true },
      { id: 'title', label: 'Title', required: true },
      { id: 'email', label: 'Email', required: true },
      { id: 'mobilePhone', label: 'Mobile Phone Number', required: true },
    ],
  },
  {
    id: 'business',
    number: '02',
    title: 'Your Business',
    fields: [
      { id: 'businessType', label: 'Type of business', required: true },
      { id: 'industry', label: 'Industry', required: true },
      { id: 'expectations', label: 'Expectations for this campaign', required: true, long: true },
      { id: 'productLinks', label: 'Product/service page links', required: false, long: true },
      { id: 'website', label: 'Website address', required: true },
    ],
  },
  {
    id: 'campaign',
    number: '03',
    title: 'Campaign Scope',
    fields: [
      { id: 'campaignDuration', label: 'How long do you plan to run this campaign', required: true, options: ['3 months (the bare minimum)', '6 months', '12 months', 'As long as we get good meetings', 'As long as we can afford it', 'Other'] },
    ],
  },
  {
    id: 'target',
    number: '04',
    title: 'Prospects',
    fields: [
      { id: 'targetDefinition', label: 'Prospect definition', required: true, long: true },
      { id: 'targetIndustries', label: 'Prospect industries', required: true },
      { id: 'targetTitles', label: 'Prospect job titles (ICP)', required: true },
      { id: 'initialTemplate', label: 'What you use today to pitch new prospects', required: true, long: true },
      { id: 'idealLinkedInLeads', label: '5 LinkedIn links of existing clients', required: true, long: true },
      { id: 'targetHeadcount', label: 'Prospect headcount range (min–max)', required: true },
      { id: 'targetRevenue', label: 'Prospect revenue range (min–max)', required: true },
    ],
  },
  {
    id: 'promote',
    number: '05',
    title: 'Social Networks (PROMOTE)',
    fields: [
      { id: 'top5Highlights', label: 'Top 5 things to highlight on social', required: true, long: true },
      { id: 'otherContent', label: 'Other content to include', required: false, long: true },
      { id: 'dontWantContent', label: 'Content you do NOT want', required: true, long: true },
      { id: 'twitterHashtags', label: 'Twitter hashtags to focus on', required: false },
      { id: 'competitorTwitterAccounts', label: 'Twitter accounts of top 10 competitors (500+ followers)', required: false, long: true },
      { id: 'googleKeywords', label: 'Google keywords to focus on', required: false, long: true },
      { id: 'photosLink', label: 'Dropbox/Drive link to photos', required: false },
      { id: 'royaltyFreeConsent', label: 'Consent to use royalty-free library photos', required: true, options: ['Yes, you have my approval', 'No, use only ours', 'Other'] },
      { id: 'linkedInPageAdmin', label: 'Added Olivier Attia as Admin of LinkedIn Page', required: true, options: ['Confirmed'] },
      { id: 'facebookPageAdmin', label: 'Added Olivier Attia as Admin of Facebook Page', required: false, options: ['Confirmed'] },
      { id: 'googleBusinessAdmin', label: 'Added Olivier Attia as Admin of Google Business', required: false, options: ['Confirmed'] },
      { id: 'twitterCredentials', label: 'Twitter login and password (optional, secured)', required: false },
    ],
  },
  {
    id: 'network',
    number: '06',
    title: 'LinkedIn Profile (NETWORK)',
    fields: [
      { id: 'companyLinkedIn', label: 'Company LinkedIn page', required: true },
      { id: 'personalLinkedIn', label: 'Personal LinkedIn page', required: true },
      { id: 'salesNavActive', label: 'Sales Navigator license activated', required: true, options: ['Yes'] },
      { id: 'calendlyLink', label: 'Calendly (or equivalent) link', required: true },
      { id: 'competitors', label: 'Top 5 competitors with websites and why', required: true, long: true },
    ],
  },
  {
    id: 'comments',
    number: '07',
    title: 'Comments',
    fields: [
      { id: 'additionalComments', label: 'Anything else important not addressed', required: false, long: true },
    ],
  },
  {
    id: 'timing',
    number: '08',
    title: 'Timing & Quote',
    fields: [
      { id: 'startDate', label: 'Starting campaign date (ideally first of upcoming month)', required: true, type: 'date' },
      { id: 'quoteReference', label: 'Reference of the validated quote you received', required: true, long: true },
    ],
  },
];


// Help text taken from the original Google Form, shown under each label.
// Turns URLs / domains / emails inside help text into links that open in a new tab.
const LINK_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|((?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|net|org|ai|ly|io|co)(?:\/[^\s),]*)?)/g;
function linkify(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    let token = m[0];
    const trail = token.match(/[.,;:!?]+$/);
    if (trail) token = token.slice(0, -trail[0].length);
    const start = m.index;
    if (start > last) out.push(text.slice(last, start));
    const isEmail = !!m[1];
    const href = isEmail ? `mailto:${token}` : (/^https?:\/\//i.test(token) ? token : `https://${token}`);
    out.push(
      <a key={start} href={href} target="_blank" rel="noopener noreferrer"
         style={{ color: BRAND.red, textDecoration: 'underline', textUnderlineOffset: 2 }}
         onClick={(e) => e.stopPropagation()}>
        {token}
      </a>
    );
    last = start + token.length;
    LINK_RE.lastIndex = last;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Renders a multi-line answer as a numbered list (1., 2., ...) — strips any numbering already typed.
function numberLines(text: string): string {
  const lines = text.split(/\n|;\s*/).map(l => l.replace(/^\s*(\d+[.)-]|[-•*])\s*/, '').trim()).filter(Boolean);
  return lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
}

const FIELD_HELP: Record<string, string> = {
  businessType: 'What type of business are you?',
  industry: 'What industry are you in?',
  expectations: 'Please give us an overview of your expectations for this campaign.',
  productLinks: 'If you are selling products or services on your website, please enter the link for each (one per line).',
  website: "If you don't have a website, where can customers contact you or learn more about your business?",
  campaignDuration: 'How long do you plan to run a marketing campaign in the US? One answer only.',
  targetDefinition: 'Tell us anything you know or assume about your target prospects. (Prospects are always located in the United States.)',
  targetIndustries: 'What are the industries we should focus on?',
  targetTitles: 'What is the Ideal Customer Profile of your targets?',
  initialTemplate: 'What are you using today to pitch new prospects?',
  idealLinkedInLeads: 'Please share the LinkedIn profile links of 5 of your existing clients (one per line). If you have more than 5, we take them too. The better the profiling, the better the result of the campaign.',
  targetHeadcount: 'Minimum and maximum number of employees working for the targeted companies.',
  targetRevenue: 'Minimum and maximum revenues of the targeted companies.',
  top5Highlights: 'Examples: product differentiation(s), pricing, sales, specials, what your clients like most about your product/service, and anything else that makes your business stand out.',
  otherContent: "Please list any other content you'd like to see on your social feeds.",
  dontWantContent: 'What type of content do you NOT want to see on your account?',
  twitterHashtags: 'What are the Twitter hashtags (#) your campaigns should focus on?',
  competitorTwitterAccounts: 'What are the Twitter accounts of your 10 biggest competitors? (With 500+ followers each.)',
  googleKeywords: 'What are the Google keywords your campaigns should focus on?',
  photosLink: 'Do you have photos to share with us via Dropbox or Google Drive? If so, please paste the link.',
  royaltyFreeConsent: 'If you have no photos, or a limited amount, please confirm that we can post photos from our own library of royalty-free, professionally taken images. One answer only.',
  linkedInPageAdmin: 'Please add Olivier Attia (linkedin.com/in/olivierattia) as Admin of your LinkedIn page.',
  facebookPageAdmin: 'Please add Olivier Attia (facebook.com/oattia) as Admin of your Facebook page.',
  googleBusinessAdmin: 'Please add Olivier Attia (oattia@gmail.com) as Admin of your Google Business page (google.com/business).',
  twitterCredentials: 'Twitter login and password. This form is secured.',
  companyLinkedIn: 'Your company LinkedIn page URL.',
  personalLinkedIn: "Social Selling campaigns are done on PEOPLE's profiles: the LinkedIn profile we will run the campaign on.",
  salesNavActive: 'For this campaign to be effective, the user whose network we accelerate needs a LinkedIn Sales Navigator license (business.linkedin.com/sales-navigator).',
  calendlyLink: 'Or another platform we can use to secure meetings on your behalf.',
  competitors: 'Who are your top 5 competitors? Number them 1 to 5, one per line: name, website link, and the reason why.',
  additionalComments: 'Anything you need us to know that could be important for this campaign, but not addressed yet.',
  startDate: 'Ideally the first of the upcoming month.',
  quoteReference: 'Please upload the quote we sent you, validated. If you need an updated version first, contact us ASAP. (If you received a Quote Special BlackFriday, this is where you use it.)',
};

const isOtherOption = (o: string) => o.toLowerCase() === 'other' || o.toLowerCase() === 'autre';

// Inline control for choice and date fields: rendered directly on the review
// screen (checkbox / radio / date), exactly like the original form, no edit click needed.
function InlineChoice({ f, value, onChange }: { f: any; value: any; onChange: (v: string) => void }) {
  const v = value === undefined || value === null ? '' : String(value);
  const opts: string[] | undefined = f.options;
  const box = (on: boolean) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: `1px solid ${on ? BRAND.red : BRAND.rule}`, background: on ? BRAND.redLight : BRAND.paper, cursor: 'pointer', fontSize: 14, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" } as React.CSSProperties);
  if (f.type === 'date') {
    return (
      <input type="date" value={v} onChange={(e) => onChange(e.target.value)} className="sans"
        style={{ border: `1px solid ${v ? BRAND.rule : BRAND.red}`, padding: '10px 12px', fontSize: 15, fontFamily: 'Inter', background: BRAND.paper, maxWidth: 240 }} />
    );
  }
  if (opts && opts.length === 1) {
    const on = v === opts[0];
    return (
      <label style={{ ...box(on), display: 'inline-flex' }}>
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? opts[0] : '')} style={{ accentColor: BRAND.red, width: 16, height: 16 }} />
        <span>{opts[0]}</span>
      </label>
    );
  }
  if (opts && f.multi) {
    const sel = v.split(/,\s*/).filter(Boolean);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {opts.map((o) => {
          const on = sel.includes(o);
          return (
            <label key={o} style={box(on)}>
              <input type="checkbox" checked={on} onChange={(e) => onChange((e.target.checked ? [...sel, o] : sel.filter((x) => x !== o)).join(', '))} style={{ accentColor: BRAND.red, width: 16, height: 16 }} />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
    );
  }
  if (opts) {
    const preset = opts.find((o) => !isOtherOption(o) && o === v);
    const otherOn = !!v && !preset;
    const otherText = otherOn ? v.replace(/^Other:?\s*/i, '') : '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {opts.map((o) => {
          const isOther = isOtherOption(o);
          const on = isOther ? otherOn : v === o;
          return (
            <label key={o} style={box(on)}>
              <input type="radio" name={`inline-${f.id}`} checked={on} onChange={() => onChange(isOther ? 'Other: ' : o)} style={{ accentColor: BRAND.red }} />
              <span>{o}</span>
              {isOther && on && (
                <input type="text" value={otherText} autoFocus placeholder="Please specify…" onChange={(e) => onChange('Other: ' + e.target.value)} onClick={(e) => e.preventDefault()}
                  className="sans" style={{ flex: 1, minWidth: 0, border: 'none', borderBottom: `1px solid ${BRAND.red}`, background: 'transparent', padding: '2px 4px', fontSize: 14 }} />
              )}
            </label>
          );
        })}
      </div>
    );
  }
  return null;
}
const isInlineField = (f: any) => f.type === 'date' || Array.isArray(f.options);

// One row of the "still missing" box: the answer can be given right there.
// Choice/date fields commit on click; text commits on Enter, blur or "Add".
// Once a value is committed the parent's missing list drops the row.
function MissingItemEditor({ f, onCommit, onUpload }: { f: any; onCommit: (v: string) => void; onUpload?: () => void }) {
  const [draft, setDraft] = useState<string>('');
  const [otherDraft, setOtherDraft] = useState<string | null>(null);
  const filled = (v: string) => v.replace(/^Other:\s*/i, '').trim() !== '';
  const commitText = () => { if (filled(draft)) onCommit(draft.trim()); };
  if (isInlineField(f)) {
    return (
      <div onBlur={(e) => { if (otherDraft !== null && !e.currentTarget.contains(e.relatedTarget as Node) && filled(otherDraft)) onCommit(otherDraft); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && otherDraft !== null && filled(otherDraft)) { e.preventDefault(); onCommit(otherDraft); } }}>
        <InlineChoice f={f} value={otherDraft ?? ''} onChange={(nv) => {
          if (/^Other:/i.test(nv)) setOtherDraft(nv);
          else { setOtherDraft(null); if (filled(nv)) onCommit(nv); }
        }} />
      </div>
    );
  }
  const long = Boolean(f.long) || f.id === 'competitors';
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: `1px solid ${BRAND.rule}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, background: BRAND.paper, fontFamily: 'inherit' };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {long ? (
        <textarea value={draft} rows={3} onChange={(e) => setDraft(e.target.value)} onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitText(); } }}
          placeholder={f.id === 'competitors' ? '1. \n2. \n3. \n4. \n5. ' : 'Type your answer…'} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      ) : (
        <input type={/email/i.test(f.id) ? 'email' : 'text'} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText(); } }}
          placeholder="Type your answer…" style={inputStyle} />
      )}
      <button type="button" className="btn-primary" onMouseDown={(e) => e.preventDefault()} onClick={commitText} disabled={!filled(draft)} style={{ padding: '8px 14px', fontSize: 12 }}>Add</button>
      {onUpload && <button type="button" className="btn-ghost" onClick={onUpload} style={{ padding: '8px 14px', fontSize: 12 }}>Upload file</button>}
    </div>
  );
}

function SignatureNameInput({ onCommit }: { onCommit: (v: string) => void }) {
  const [v, setV] = useState('');
  const commit = () => { if (v.trim().length >= 2) onCommit(v.trim()); };
  return (
    <input type="text" value={v} placeholder="Type your full name" onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      style={{ flex: 1, maxWidth: 320, border: `1px solid ${BRAND.rule}`, borderRadius: 8, padding: '6px 10px', fontSize: 14, background: BRAND.paper }} />
  );
}

// Acknowledgments required before signature
const ACKNOWLEDGMENTS = [
  { id: 'ack_3month', text: 'I acknowledge and understand that this project is launched for a minimum of 3 months.' },
  { id: 'ack_notice', text: 'I acknowledge and understand that after the initial 3 months, I can stop the campaign at any time with ONE-month notice.' },
  { id: 'ack_weekly', text: 'I acknowledge and understand that there will be a weekly update call at a scheduled fixed time to discuss and re-evaluate campaign results.' },
  { id: 'ack_payment', text: 'I acknowledge and understand that all invoices are due at the beginning of each month. A late payment fee of 2% per month will be applied to any invoice not paid by its due date.' },
];

// System prompt for the Claude conversation
const buildSystemPrompt = (capturedState = {}, sectionsDoneState = {}, researchSource = null) => {
  const sectionsDoc = SECTIONS.map(s => {
    const fieldLines = s.fields.map(f => {
      const opts = f.options ? ` [options: ${f.options.join(' | ')}${f.multi ? ' — multi-select' : ''}]` : '';
      const req = f.required ? ' (REQUIRED)' : ' (optional)';
      return `  - ${f.id}: ${f.label}${req}${opts}`;
    }).join('\n');
    return `SECTION ${s.number} — ${s.title} [id: ${s.id}]${s.optional ? ' (optional — skip if client does not want this service)' : ''}\n${fieldLines}`;
  }).join('\n\n');

  return `You are the onboarding assistant for GERSHON CONSULTING LLC, a B2B outbound sales consulting firm specializing in LinkedIn-based lead generation for non-US companies entering the American market. Founded by Olivier Attia, based in Delaware, 13 years in market.

Your job is to conduct a warm, consultative onboarding conversation with a brand new client. Think of yourself as a senior strategist doing intake — not a form filler. You capture everything needed to launch their US campaign.

CORE PRINCIPLE: RESEARCH FIRST, THEN CONFIRM
You have web_search available. Use it proactively. The goal is that the client confirms or corrects your research rather than typing from scratch. A great onboarding feels like: "I already looked you up, here's what I'm seeing, does this match?" — NOT "please fill out this long list."

When to search:
- As soon as you know the company name + website (typically after Section 01), IMMEDIATELY search the web. Pull their site, their LinkedIn company page, news mentions, industry context.
- When the client mentions a competitor by name, briefly search to confirm and enrich.
- When they describe their ICP vaguely, search for category benchmarks (typical headcount/revenue for firms matching their profile).

What to do with research findings:
- PRE-FILL suggestions for every field you reasonably can: business type, industry, website, product descriptions, likely target personas, likely competitor set, competitor Twitter handles, likely Google keywords, likely target industries, likely headcount/revenue ranges.
- Present suggestions explicitly, e.g. "Based on your site, it looks like you're a B2B SaaS in HR tech serving mid-market. Does that match how you'd describe yourselves, or should I adjust?"
- Never fabricate. If your search returns nothing useful for a field, say so and ask the client plainly.
- Only set capture for a field AFTER the client has confirmed or corrected your suggestion. Your own research is a draft, not a commitment.

VOICE & TONE
- Warm, confident, professional — the client is paying a premium for expertise
- Concise: 2–5 sentences per message. Never lecture.
- Consultative: if an answer is vague, probe once with a specific example. If still vague, accept it and move on.
- Use the client's own words (and your research findings) back to confirm understanding
- Batch related suggestions: when you've done research, you can present 2–3 related field suggestions in one message and capture them together on confirmation
- Refer to yourself as "the Gershon team" or "we", not as an AI

CONVERSATION FLOW
1. Start by warmly welcoming them, briefly explain this will take ~10–15 minutes and that you'll do research on their company to pre-fill answers where possible. Ask their Company Name to kick off Section 01.
2. Get the basic identity (Section 01) from the client directly — name, title, email, phone. Don't guess those.
3. Once you have the Company Name AND website (end of Section 02 or sooner), USE WEB_SEARCH to research. Pull site content, LinkedIn page, recent news.
4. From Section 03 onward, drive the conversation through SUGGESTIONS. "Here's what I'm seeing / here's what I'd suggest — confirm, or tell me what's off." Batch suggestions for related fields.
5. All services (PROMOTE, NETWORK, ENGAGE) are part of a single package — always cover sections 05 and 06 together.
6. When a section is fully captured, set "sectionComplete": true and include a short summary line in the message.
7. When ALL sections are done, set "readyForReview": true and tell the client "Great — one last step. We'll take you to the final review and signature screen."

SECTIONS

${sectionsDoc}

RESPONSE FORMAT — STRICT
Respond ONLY with valid JSON matching this schema. No markdown fences, no preamble, no code blocks. Just raw JSON:

{
  "message": "Your conversational message to the client (plain text, no markdown syntax like ** or _)",
  "capture": { "fieldId1": "value", "fieldId2": "value" },
  "currentSection": "section_id",
  "sectionComplete": false,
  "readyForReview": false
}

RULES
- "message": what the client sees. Plain, human, no markdown.
- "capture": ONLY include fields captured in this turn. If you captured nothing, use {}.
- "currentSection": the section id you are currently working on.
- "sectionComplete": true ONLY when all required fields in the current section have values.
- "readyForReview": true ONLY when every section is complete and you're handing off to the signature screen.
- Never ask for fields from sections out of order.
- Never capture a field from a value you invented — capture only what the client actually said.
- For option-based fields, normalize the client's answer to one of the allowed options.

CURRENT STATE
${researchSource ? `Upfront research was done on the client's website before the conversation started:
- URL: ${researchSource.url}
- Research summary: ${researchSource.summary || '(summary not available)'}

The fields below were PRE-FILLED from that research. Your job is to confirm each one with the client in a tight, friendly way — ONE line per field, e.g. "I've got you as a B2B SaaS in HR tech — does that land?" Do NOT re-ask from scratch. If the client confirms, leave the value as-is (it's already captured). If they correct, re-capture with the corrected value.` : 'No upfront research was done. Start from Section 01 as normal.'}

Already captured fields (do NOT re-ask these — confirm quickly if pre-filled, else move on):
${Object.keys(capturedState).length > 0 ? Object.entries(capturedState).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n') : '(none yet — start from section 01)'}

Sections already completed: ${Object.keys(sectionsDoneState).filter(k => sectionsDoneState[k]).join(', ') || '(none)'}`;
};

// ============================================================================
// Main App
// ============================================================================

export default function GershonOnboarding() {
  const [phase, setPhase] = useState('url_intake'); // 'url_intake' | 'researching' | 'conversation' | 'review' | 'signed'
  const [messages, setMessages] = useState([]);
  const [responses, setResponses] = useState({});
  const [currentSection, setCurrentSection] = useState('about_you');
  const [sectionsDone, setSectionsDone] = useState({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [researchSource, setResearchSource] = useState(null); // { url, summary, searchedAt }
  const [researchStatus, setResearchStatus] = useState('');
  // sessionId is set in useEffect on first client mount, NOT in useState initializer.
  // Reason: window.history.replaceState() during render is a forbidden side effect that
  // triggers React error #329 ("Unknown root exit status") — concurrent React aborts
  // hydration, leaving the page as static HTML with no event handlers attached.
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (sessionId) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const existing = url.searchParams.get('s');
    if (existing) {
      setSessionId(existing);
    } else {
      const newId = crypto.randomUUID();
      url.searchParams.set('s', newId);
      window.history.replaceState({}, '', url.toString());
      setSessionId(newId);
    }
  }, [sessionId]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Review / signature state
  const [editingField, setEditingField] = useState(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [acknowledgments, setAcknowledgments] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  // Start empty and fill on the client: computing "today" during render gives the
  // server and the browser different values (timezone / day boundary) → hydration mismatch.
  const [signatureDate, setSignatureDate] = useState('');
  useEffect(() => {
    setSignatureDate((d) => d || new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (phase === 'conversation' && !isLoading) inputRef.current?.focus();
  }, [phase, isLoading]);

  // Kick off the OLD conversation (only used when ?mode=chat is in the URL).
  const startConversation = async () => {
    setPhase('conversation');
    await callClaude([]);
  };

  // "Skip research, fill manually" → go straight to the empty review form so the
  // user can fill it in without research. This is the new manual-fill path.
  const startManualReview = () => {
    setSectionsDone({ about_you: true, business: true, campaign: true, target: true, promote: true, network: true, comments: true, timing: true });
    setPhase('review');
  };

  // Allow `?mode=chat` to force the old conversational flow for power-users / debugging.
  const forceChatMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'chat';

  // Run upfront website + LinkedIn research, pre-fill fields, jump STRAIGHT to review.
  // The old conversational phase is bypassed: the user reviews/edits the pre-filled
  // form once and signs. Conversation mode is still reachable via /?mode=chat for
  // manual fallback if the user wants it.
  const researchAndStart = async (url, linkedInUrl) => {
    setPhase('researching');
    setError(null);

    try {
      setResearchStatus(`Visiting ${new URL(url.startsWith('http') ? url : 'https://' + url).hostname}…`);

      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, linkedInUrl: linkedInUrl || undefined }),
      });

      setResearchStatus(linkedInUrl ? 'Reading your LinkedIn profile…' : 'Analyzing company website and positioning…');
      const parsed = await res.json();

      setResearchStatus('Pre-filling your intake form…');

      // Strip empty strings from the capture so the review UI can show
      // "needs your input" vs "✓ pre-filled" accurately.
      const rawCapture = parsed.capture || {};
      const capture: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawCapture)) {
        if (typeof v === 'string' && v.trim() !== '') capture[k] = v.trim();
        else if (Array.isArray(v) && v.length > 0) capture[k] = (v as any[]).join(', ');
      }
      if (!capture.website) capture.website = url;
      if (linkedInUrl && !capture.personalLinkedIn) capture.personalLinkedIn = linkedInUrl;

      setResponses(prev => ({ ...prev, ...capture }));
      setResearchSource({
        url,
        linkedInUrl: linkedInUrl || null,
        summary: parsed.summary || '',
        searchedAt: new Date().toISOString(),
        capturedFields: Object.keys(capture),
      });

      // Mark every section as "done" optimistically — the review screen will surface
      // any required fields that are still blank so the user can't sign incomplete.
      setSectionsDone({ about_you: true, business: true, campaign: true, target: true, promote: true, network: true, comments: true, timing: true });

      // Skip conversation entirely.
      setPhase('review');
    } catch (e) {
      console.error(e);
      setError("We couldn't complete the research. You can still fill out the form manually.");
      // Even on research failure, drop the user into the review screen with a blank form.
      if (url) setResponses(prev => ({ ...prev, website: url }));
      if (linkedInUrl) setResponses(prev => ({ ...prev, personalLinkedIn: linkedInUrl }));
      setPhase('review');
    }
  };

  // Variant of callClaude that takes explicit context (avoids stale state race)
  const callClaudeWithContext = async (history, captured, sectionsDoneArg, researchArg) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          captured: captured || responses,
          sectionsDone: sectionsDoneArg || sectionsDone,
          researchSource: researchArg || researchSource,
        }),
      });
      const parsed = await res.json();

      if (parsed.capture && Object.keys(parsed.capture).length > 0) {
        setResponses(prev => ({ ...prev, ...parsed.capture }));
      }
      if (parsed.currentSection) setCurrentSection(parsed.currentSection);
      if (parsed.sectionComplete && parsed.currentSection) {
        setSectionsDone(prev => ({ ...prev, [parsed.currentSection]: true }));
      }
      setMessages(prev => [...prev, { role: 'assistant', content: parsed.message, options: Array.isArray(parsed.options) ? parsed.options : [], ts: Date.now() }]);
      if (parsed.readyForReview) setTimeout(() => setPhase('review'), 1200);
    } catch (e) {
      console.error(e);
      setError('We hit a connection issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const callClaude = async (history) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          captured: responses,
          sectionsDone,
          researchSource,
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: any;
      try { parsed = JSON.parse(cleaned || JSON.stringify(data)); }
      catch (_e) { parsed = { message: data.message || cleaned, capture: {}, currentSection, sectionComplete: false, readyForReview: false }; }

      // Apply captured fields
      if (parsed.capture && Object.keys(parsed.capture).length > 0) {
        setResponses(prev => ({ ...prev, ...parsed.capture }));
      }
      if (parsed.currentSection) {
        setCurrentSection(parsed.currentSection);
      }
      if (parsed.sectionComplete && parsed.currentSection) {
        setSectionsDone(prev => ({ ...prev, [parsed.currentSection]: true }));
      }

      setMessages(prev => [...prev, { role: 'assistant', content: parsed.message, options: Array.isArray(parsed.options) ? parsed.options : [], ts: Date.now() }]);

      if (parsed.readyForReview) {
        setTimeout(() => setPhase('review'), 1200);
      }
    } catch (e) {
      console.error(e);
      setError('We hit a connection issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send an option (button-click answer) as the user's next reply. Bypasses the input box.
  const sendOption = async (option) => {
    if (isLoading) return;
    const userMsg = { role: 'user', content: option, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const history = newMessages.map(m => ({
      role: m.role,
      content: m.role === 'assistant'
        ? JSON.stringify({ message: m.content, options: m.options || [], capture: {}, currentSection, sectionComplete: false, readyForReview: false })
        : m.content,
    }));
    await callClaude(history);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user', content: input.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Build API conversation history — alternating user/assistant text only
    const history = newMessages.map(m => ({
      role: m.role,
      content: m.role === 'assistant'
        ? JSON.stringify({ message: m.content, capture: {}, currentSection, sectionComplete: false, readyForReview: false })
        : m.content,
    }));
    await callClaude(history);
  };

  // Quote file — read in the browser as base64, hold in state, send inline at submit.
  // No separate /api/upload roundtrip: the file rides along with the JSON payload to
  // /api/submit and lands as a native Airtable attachment on the created record.
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [pendingQuoteFile, setPendingQuoteFile] = useState<{
    filename: string;
    contentType: string;
    base64: string;
    size: number;
  } | null>(null);
  const MAX_QUOTE_BYTES = 15 * 1024 * 1024; // 15 MB
  const uploadQuoteFile = async (file: File) => {
    if (!file || isLoading) return;
    setError(null);
    if (file.size > MAX_QUOTE_BYTES) {
      setError(`File too large (max 15 MB). Yours is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }
    setUploadingFile(file.name);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          // Strip "data:<mime>;base64," prefix — Airtable wants raw base64.
          const idx = dataUrl.indexOf(',');
          resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      setPendingQuoteFile({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        base64,
        size: file.size,
      });
      const captureValue = `Attached: ${file.name} (${(file.size / 1024).toFixed(0)} KB) — will be uploaded on submit`;
      setResponses(prev => ({ ...prev, quoteReference: captureValue }));
    } catch (e: any) {
      console.error('Read error', e);
      setError(e?.message || 'Could not read your file. You can also type the quote reference (e.g. QU0011) instead.');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const jumpToReview = () => setPhase('review');

  const allAcknowledged = ACKNOWLEDGMENTS.every(a => acknowledgments[a.id]);
  // Compute whether all REQUIRED schema fields have a non-empty value. Sign is
  // blocked until they're all filled — the review screen shows which are missing.
  const allRequiredFieldsFilled = SECTIONS.every(s =>
    s.fields.filter(f => f.required).every(f => {
      const v = responses[f.id];
      return v !== undefined && v !== null && String(v).replace(/^Other:\s*$/i, '').trim() !== '';
    })
  );
  const canSign = allAcknowledged && termsAccepted && signatureName.trim().length >= 2 && signatureDate && allRequiredFieldsFilled;

  const sign = async () => {
    if (!canSign) return;
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses: { ...responses, targetLocations: 'United States' },
          acknowledgments,
          termsAccepted,
          signature: { name: signatureName, date: signatureDate },
          conversationTranscript: messages,
          quoteFile: pendingQuoteFile
            ? {
                base64: pendingQuoteFile.base64,
                filename: pendingQuoteFile.filename,
                contentType: pendingQuoteFile.contentType,
              }
            : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed');
      }
      setPhase('signed');
    } catch (e: any) {
      console.error('Submit error:', e);
      setError(e?.message || 'Submission failed. Please try again.');
    }
  };

  const exportJSON = () => {
    const payload = {
      submittedAt: new Date().toISOString(),
      responses,
      acknowledgments,
      termsAccepted,
      signature: { name: signatureName, date: signatureDate },
      conversationTranscript: messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gershon-onboarding-${(responses.companyName || 'client').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Beautiful printable PDF — opens a styled summary in a new tab and triggers print dialog.
  // Browser "Save as PDF" gives the user a brand-aligned PDF without a heavy client-side lib.
  const exportPDF = () => {
    const escape = (s: any) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const companyName = responses.companyName || 'Client';
    const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const sectionsHtml = SECTIONS.map(section => {
      const sectionFields = section.fields.filter(f => responses[f.id] !== undefined && responses[f.id] !== '');
      if (sectionFields.length === 0) return '';
      const rows = sectionFields.map(f => {
        const value = responses[f.id];
        const display = Array.isArray(value) ? value.join(', ') : String(value);
        return `<tr>
            <td class="lbl">${escape(f.label)}</td>
            <td class="val">${escape(display).replace(/\n/g, '<br/>')}</td>
          </tr>`;
      }).join('');
      return `<section class="sec">
        <div class="sec-head">
          <span class="sec-num">${section.number}</span>
          <span class="sec-title">${escape(section.title)}</span>
        </div>
        <table class="kv"><tbody>${rows}</tbody></table>
      </section>`;
    }).join('');

    const ackHtml = ACKNOWLEDGMENTS.map(a => `
      <li class="${acknowledgments[a.id] ? 'ack-yes' : 'ack-no'}">
        <span class="ack-mark">${acknowledgments[a.id] ? '✓' : '·'}</span>
        ${escape(a.text)}
      </li>`).join('');

    const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Gershon Welcome · ${escape(companyName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1d1f; margin: 0; padding: 32px; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #FE1B04; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark { width: 36px; height: 36px; border-radius: 9px; background: #FE1B04; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .brand-name { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6E6E73; font-family: 'SF Mono', Menlo, monospace; }
  .brand-title { font-size: 19px; font-weight: 500; color: #1A1A1A; margin-top: 2px; }
  .meta { text-align: right; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #6E6E73; font-family: 'SF Mono', Menlo, monospace; line-height: 1.7; }
  .meta strong { color: #1A1A1A; font-weight: 500; }
  h1 { font-size: 30px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.03em; }
  h1 em { color: #FE1B04; font-style: normal; }
  .lead { font-size: 12px; color: #555; margin: 8px 0 28px; }
  .sec { margin-bottom: 22px; page-break-inside: avoid; }
  .sec-head { display: flex; align-items: baseline; gap: 12px; border-bottom: 1.5px solid #FE1B04; padding-bottom: 6px; margin-bottom: 10px; }
  .sec-num { font-family: 'SF Mono', Menlo, monospace; font-size: 10px; letter-spacing: 0.2em; color: #FE1B04; }
  .sec-title { font-size: 16px; font-weight: 700; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 7px 0; border-bottom: 1px solid #E5E7EB; vertical-align: top; font-size: 11.5px; line-height: 1.5; }
  table.kv td.lbl { width: 38%; font-family: 'SF Mono', Menlo, monospace; font-size: 9.5px; color: #6E6E73; letterspacing: 0.06em; text-transform: uppercase; padding-right: 16px; padding-top: 9px; }
  table.kv td.val { color: #1A1A1A; }
  .ack { margin-top: 26px; padding: 18px 22px; border: 1px solid #FE1B04; background: #fff5f5; border-radius: 10px; page-break-inside: avoid; }
  .ack h2 { font-size: 14px; margin: 0 0 12px; font-weight: 600; letter-spacing: 0.04em; }
  .ack ul { list-style: none; padding: 0; margin: 0; }
  .ack li { padding: 6px 0; font-size: 11.5px; line-height: 1.5; display: flex; gap: 10px; align-items: flex-start; }
  .ack-mark { display: inline-block; width: 16px; height: 16px; border-radius: 2px; background: #FE1B04; color: #fff; font-size: 11px; text-align: center; line-height: 16px; flex-shrink: 0; }
  .ack-no .ack-mark { background: #DDD; color: #999; }
  .sig { margin-top: 24px; padding: 22px 24px; background: #1A1A1A; color: #fff; page-break-inside: avoid; }
  .sig-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: end; }
  .sig-label { font-family: 'SF Mono', Menlo, monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
  .sig-name { font-style: italic; font-size: 26px; border-bottom: 2px solid #FE1B04; padding-bottom: 4px; }
  .sig-date { font-family: 'SF Mono', Menlo, monospace; font-size: 14px; border-bottom: 2px solid #FE1B04; padding-bottom: 6px; }
  .sig-foot { margin-top: 16px; font-family: 'SF Mono', Menlo, monospace; font-size: 9px; letter-spacing: 0.1em; color: #999; text-transform: uppercase; }
  .foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E5E7EB; font-family: 'SF Mono', Menlo, monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #6E6E73; text-align: center; }
  .print-bar { position: fixed; top: 12px; right: 12px; background: #FE1B04; color: #fff; padding: 10px 18px; font-family: Inter, sans-serif; font-size: 13px; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  @media print { .print-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <button class="print-bar" onclick="window.print()">Save as PDF · Print</button>
  <div class="head">
    <div class="brand">
      <div class="brand-mark"><span style="font-weight:800">G</span></div>
      <div>
        <div class="brand-name">Gershon Consulting</div>
        <div class="brand-title">Gershon Welcome</div>
      </div>
    </div>
    <div class="meta">
      <div>Generated · <strong>${escape(dateLabel)}</strong></div>
      <div>Company · <strong>${escape(companyName)}</strong></div>
      <div>Status · <strong>${termsAccepted ? 'Signed &amp; Binding' : 'Draft'}</strong></div>
    </div>
  </div>

  <h1>Onboarding summary for <em>${escape(companyName)}</em></h1>
  <p class="lead">All answers captured during the conversational intake on welcome.gershon.ai. This document is the authoritative reference for the campaign launch.</p>

  ${sectionsHtml}

  <div class="ack">
    <h2>Section 09 · Understandings &amp; Acknowledgments</h2>
    <ul>${ackHtml}</ul>
  </div>

  <div class="sig">
    <div style="font-family:'SF Mono',Menlo,monospace; font-size:10px; letter-spacing:0.2em; color:#FE1B04; text-transform:uppercase;">— Section 10 · Signature</div>
    <div style="font-size:18px; margin: 6px 0 18px; font-weight: 500;">Terms of Service Accepted: ${termsAccepted ? 'Yes' : 'No'}</div>
    <div class="sig-grid">
      <div>
        <div class="sig-label">Signed by</div>
        <div class="sig-name">${escape(signatureName)}</div>
      </div>
      <div>
        <div class="sig-label">Date</div>
        <div class="sig-date">${escape(signatureDate)}</div>
      </div>
    </div>
    <div class="sig-foot">By signing, this intake is binding on the project.</div>
  </div>

  <div class="foot">Gershon Consulting LLC · Delaware · Est. 2013 · welcome.gershon.ai</div>

  <script>setTimeout(function(){ window.print(); }, 350);</script>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to download the PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div style={{ minHeight: '100vh', background: BRAND.cream, color: BRAND.ink, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* dangerouslySetInnerHTML: a plain {`...`} child gets its quotes HTML-escaped on SSR
          (' -> &#x27;), which broke the CSS and caused React hydration errors #418/#423/#425.
          Fonts are now loaded with <link> in app/layout.tsx instead of @import here. */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .serif, .mono, .sans, input, textarea, button, select { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
        /* Unified Gershon design (Linalysis master): bold sans headings, no italics, pill buttons */
        .serif:not(input) { font-weight: 700 !important; font-style: normal !important; letter-spacing: -0.015em; }
        h1.serif { font-weight: 800 !important; letter-spacing: -0.035em !important; }
        h1 span { font-style: normal !important; }
        .mono { font-weight: 600; }

        @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
        .dot { width: 6px; height: 6px; background: ${BRAND.charcoal}; border-radius: 50%; display: inline-block; animation: dotPulse 1.4s infinite ease-in-out; }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .msg-in { animation: slideIn 0.3s ease-out; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.5s ease-out; }

        .btn-primary { background: ${BRAND.red}; color: white; border: none; padding: 12px 24px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.15s; border-radius: 999px; }
        .btn-primary:hover:not(:disabled) { background: ${BRAND.redDark}; }
        .btn-primary:disabled { background: #D1D5DB; cursor: not-allowed; }

        .btn-ghost { background: transparent; color: ${BRAND.charcoal}; border: 1px solid ${BRAND.rule}; padding: 10px 20px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.15s; border-radius: 999px; }
        .btn-ghost:hover { border-color: ${BRAND.charcoal}; }

        input:focus, textarea:focus { outline: none; border-color: ${BRAND.red}; }
        input[type=checkbox], input[type=radio] { accent-color: ${BRAND.red}; }
        @keyframes missingNudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
        .missing-arrow { animation: missingNudge 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .missing-arrow { animation: none; } }

        .scroll-area::-webkit-scrollbar { width: 6px; }
        .scroll-area::-webkit-scrollbar-track { background: transparent; }
        .scroll-area::-webkit-scrollbar-thumb { background: ${BRAND.rule}; border-radius: 3px; }
        .scroll-area::-webkit-scrollbar-thumb:hover { background: ${BRAND.muted}; }

        /* Phone: review rows stack (label on top) instead of a 260px label column */
        @media (max-width: 640px) {
          .review-row { grid-template-columns: minmax(0, 1fr) auto !important; gap: 8px 12px !important; }
          .review-row > :first-child { grid-column: 1 / -1; }
          .review-row > * { min-width: 0; overflow-wrap: anywhere; }
        }

        .tick-line { background: linear-gradient(90deg, ${BRAND.red} 0%, ${BRAND.red} 40px, ${BRAND.rule} 40px, ${BRAND.rule} 100%); }
      ` }} />

      {/* ============ HEADER ============ */}
      <header style={{ borderBottom: `1px solid ${BRAND.rule}`, background: BRAND.paper, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: BRAND.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="serif" style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>G</span>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Gershon Consulting</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 500, color: BRAND.ink, marginTop: 1 }}>Welcome</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={12} color={BRAND.muted} />
            <span className="mono" style={{ fontSize: 10, color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Secured · Binding</span>
            <span className="mono" style={{ fontSize: 9, color: BRAND.muted, letterSpacing: '0.1em', marginLeft: 12, paddingLeft: 12, borderLeft: `1px solid ${BRAND.rule}`, opacity: 0.7 }} title={`Build: ${BUILD_TIME}`}>{APP_VERSION} · {BUILD_LABEL}</span>
          </div>
        </div>
      </header>

      {/* ============ PHASE: URL INTAKE ============ */}
      {phase === 'url_intake' && (
        <UrlIntakeScreen onAnalyze={researchAndStart} onSkip={forceChatMode ? startConversation : startManualReview} error={error} />
      )}

      {/* ============ PHASE: RESEARCHING ============ */}
      {phase === 'researching' && (
        <ResearchingScreen status={researchStatus} />
      )}

      {/* ============ PHASE: CONVERSATION ============ */}
      {phase === 'conversation' && (
        <ConversationView
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          sendOption={sendOption}
          handleKey={handleKey}
          isLoading={isLoading}
          error={error}
          currentSection={currentSection}
          sectionsDone={sectionsDone}
          responses={responses}
          inputRef={inputRef}
          messagesEndRef={messagesEndRef}
          jumpToReview={jumpToReview}
          researchSource={researchSource}
          uploadQuoteFile={uploadQuoteFile}
          uploadingFile={uploadingFile}
        />
      )}

      {/* ============ PHASE: REVIEW ============ */}
      {phase === 'review' && (
        <ReviewScreen
          responses={responses}
          setResponses={setResponses}
          editingField={editingField}
          setEditingField={setEditingField}
          editBuffer={editBuffer}
          setEditBuffer={setEditBuffer}
          acknowledgments={acknowledgments}
          setAcknowledgments={setAcknowledgments}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          signatureName={signatureName}
          setSignatureName={setSignatureName}
          signatureDate={signatureDate}
          setSignatureDate={setSignatureDate}
          canSign={canSign}
          sign={sign}
          researchSource={researchSource}
          uploadQuoteFile={uploadQuoteFile}
          uploadingFile={uploadingFile}
          backToChat={() => setPhase('url_intake')}
        />
      )}

      {/* ============ PHASE: SIGNED ============ */}
      {phase === 'signed' && (
        <SignedScreen responses={responses} signatureName={signatureName} signatureDate={signatureDate} exportJSON={exportJSON} exportPDF={exportPDF} />
      )}
    </div>
  );
}

// ============================================================================
// URL Intake Screen — first step, gathers website for research
// ============================================================================

function UrlIntakeScreen({ onAnalyze, onSkip, error }) {
  const [url, setUrl] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const normalizedUrl = url.trim();
  const isValid = (() => {
    if (!normalizedUrl) return false;
    try {
      const test = normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl;
      const u = new URL(test);
      return u.hostname.includes('.') && u.hostname.length > 3;
    } catch (_e) { return false; }
  })();

  const normalizedLinkedIn = linkedInUrl.trim();
  const linkedInValid = (() => {
    if (!normalizedLinkedIn) return true; // optional
    const t = normalizedLinkedIn.toLowerCase();
    return t.includes('linkedin.com/in/') || t.includes('linkedin.com/pub/');
  })();

  const handleAnalyze = () => {
    setTouched(true);
    if (!isValid || !linkedInValid) return;
    const finalUrl = normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl;
    const finalLi = normalizedLinkedIn
      ? (normalizedLinkedIn.startsWith('http') ? normalizedLinkedIn : 'https://' + normalizedLinkedIn)
      : '';
    onAnalyze(finalUrl, finalLi);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 32px' }}>
      <div style={{ maxWidth: 720 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 28 }}>
          — Welcome · ~3 min
        </div>
        <h1 className="serif" style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 400, color: BRAND.ink, margin: 0, letterSpacing: '-0.02em' }}>
          We do the homework. <span style={{ fontStyle: 'italic', color: BRAND.red }}>You just review.</span>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 28 }}>
          Drop your company URL (and optionally your LinkedIn profile). We'll research your business, your positioning, and your likely prospects — then hand you a fully pre-filled intake. Edit anything that's off, sign at the bottom, done.
        </p>

        <div style={{ marginTop: 40 }}>
          <label className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Your company website <span style={{ color: BRAND.red }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${touched && !isValid ? BRAND.red : BRAND.rule}`, background: BRAND.paper, transition: 'border 0.15s', borderRadius: 12 }}>
            <span className="mono" style={{ padding: '16px 14px 16px 18px', fontSize: 13, color: BRAND.muted, borderRight: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              https://
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value.replace(/^https?:\/\//, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="yourcompany.com"
              autoFocus
              className="sans"
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                border: 'none',
                padding: '16px 18px',
                fontSize: 17,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: BRAND.ink,
                background: 'transparent',
              }}
            />
          </div>
          {touched && !isValid && (
            <div className="mono" style={{ fontSize: 11, color: BRAND.red, marginTop: 8, letterSpacing: '0.05em' }}>
              Please enter a valid website address.
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <label className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Your LinkedIn profile <span style={{ color: BRAND.muted, fontWeight: 400 }}>(optional, big quality boost)</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${touched && !linkedInValid ? BRAND.red : BRAND.rule}`, background: BRAND.paper, transition: 'border 0.15s', borderRadius: 12 }}>
            <span className="mono" style={{ padding: '16px 14px 16px 18px', fontSize: 13, color: BRAND.muted, borderRight: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              linkedin.com/in/
            </span>
            <input
              type="text"
              value={linkedInUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
              onChange={(e) => {
                const raw = e.target.value;
                setLinkedInUrl(raw.includes('linkedin.com/in/') ? raw : `linkedin.com/in/${raw}`);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="your-handle"
              className="sans"
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                border: 'none',
                padding: '16px 18px',
                fontSize: 17,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: BRAND.ink,
                background: 'transparent',
              }}
            />
          </div>
          {touched && !linkedInValid && (
            <div className="mono" style={{ fontSize: 11, color: BRAND.red, marginTop: 8, letterSpacing: '0.05em' }}>
              Use a linkedin.com/in/ profile URL or leave blank.
            </div>
          )}
        </div>

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            className="btn-primary"
            onClick={handleAnalyze}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', fontSize: 14 }}
          >
            Pre-fill my intake <ArrowRight size={16} />
          </button>
          <button
            onClick={onSkip}
            className="mono"
            style={{ background: 'none', border: 'none', color: BRAND.muted, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            Skip research, fill manually
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 20, background: BRAND.redLight, color: BRAND.redDark, padding: '12px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* What we'll pre-fill */}
        <div style={{ marginTop: 72, borderTop: `1px solid ${BRAND.rule}`, paddingTop: 32 }}>
          <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
            What we'll pull from your site
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {[
              { num: '02', title: 'Your Business', bullets: ['Business type', 'Industry', 'Product/service links'] },
              { num: '04', title: 'Prospects', bullets: ['Likely ICP', 'Industries', 'Job titles'] },
              { num: '05', title: 'Social Highlights', bullets: ['Top 5 differentiators', 'Google keywords'] },
              { num: '06', title: 'Competition', bullets: ['Top 5 competitors', 'Competitor Twitter handles'] },
            ].map(item => (
              <div key={item.num} style={{ borderLeft: `2px solid ${BRAND.red}`, paddingLeft: 16 }}>
                <div className="mono" style={{ fontSize: 10, color: BRAND.red, letterSpacing: '0.15em' }}>SECTION {item.num}</div>
                <div className="serif" style={{ fontSize: 17, color: BRAND.ink, marginTop: 4, fontStyle: 'italic' }}>{item.title}</div>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
                  {item.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 13, color: BRAND.charcoalLight, padding: '3px 0' }}>— {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, fontSize: 13, color: BRAND.muted, fontStyle: 'italic' }}>
            Personal info, campaign scope, timing, and signature are still captured directly from you — nothing sensitive is ever guessed.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Researching Screen — shown while web search runs
// ============================================================================

function ResearchingScreen({ status }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Steps advance every ~6s; the last step keeps spinning until the research returns.
  const step = Math.min(Math.floor(tick / 6), 4);

  const lines = [
    'Visiting your homepage',
    'Reading product &amp; positioning copy',
    'Scanning LinkedIn presence',
    'Identifying likely competitors',
    'Drafting section suggestions',
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '120px 32px' }}>
      <div className="mono" style={{ fontSize: 11, color: BRAND.red, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 28 }}>
        — Research in progress
      </div>
      <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.1, fontWeight: 400, color: BRAND.ink, margin: 0, letterSpacing: '-0.02em' }}>
        We're doing <span style={{ fontStyle: 'italic', color: BRAND.red }}>the homework</span> for you.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 24 }}>
        This typically takes 30–60 seconds. Sit tight — when we're done, the intake will already know who you are.
      </p>

      <div style={{ marginTop: 56, background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: 28, borderRadius: 12 }}>
        {lines.map((line, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < lines.length - 1 ? `1px solid ${BRAND.rule}` : 'none' }}>
              <div style={{ width: 14, flexShrink: 0 }}>
                {done ? <Check size={14} color={BRAND.red} strokeWidth={2.5} /> : active ? <span className="dot"></span> : <Circle size={12} color={BRAND.rule} />}
              </div>
              <div style={{ fontSize: 14, color: done ? BRAND.ink : active ? BRAND.charcoalLight : BRAND.muted, opacity: done || active ? 1 : 0.5, transition: 'all 0.3s' }}
                dangerouslySetInnerHTML={{ __html: line }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, height: 3, background: BRAND.rule, position: 'relative', overflow: 'hidden' }}>
        <div className="gx-indeterminate" style={{ position: 'absolute', top: 0, height: '100%', width: '35%', background: BRAND.red }} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes gxSlide { 0% { left: -35%; } 100% { left: 100%; } } .gx-indeterminate { animation: gxSlide 1.4s ease-in-out infinite; }` }} />
      <div className="mono" style={{ marginTop: 14, fontSize: 11, color: BRAND.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span>{step >= 4 ? 'Still working — assembling your pre-filled intake…' : (status || 'Working…')}</span>
        <span>{tick}s elapsed</span>
      </div>
    </div>
  );
}


// ============================================================================
// Conversation View
// ============================================================================

function ConversationView({ messages, input, setInput, sendMessage, sendOption, handleKey, isLoading, error, currentSection, sectionsDone, responses, inputRef, messagesEndRef, jumpToReview, researchSource, uploadQuoteFile, uploadingFile }) {
  const showQuoteUpload = currentSection === 'timing' && !responses.quoteReference;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentSectionObj = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];
  const totalSections = SECTIONS.length;
  const completedCount = Object.values(sectionsDone).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalSections) * 100);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, minHeight: 'calc(100vh - 72px)' }}>

      {/* CHAT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', background: BRAND.paper, border: `1px solid ${BRAND.rule}`, minHeight: 0, borderRadius: 12 }}>

        {/* Research banner — only shown if upfront research happened */}
        {researchSource && (
          <div style={{ padding: '12px 32px', background: BRAND.cream, borderBottom: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={12} color={BRAND.red} />
            <span className="mono" style={{ fontSize: 10, color: BRAND.charcoalLight, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Pre-filled from {new URL(researchSource.url).hostname} · {researchSource.capturedFields?.length || 0} fields
            </span>
          </div>
        )}

        {/* Section header */}
        <div style={{ padding: '24px 32px 20px', borderBottom: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: BRAND.red, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Section {currentSectionObj.number}
            </div>
            <div className="serif" style={{ fontSize: 22, color: BRAND.ink, marginTop: 4, fontWeight: 500 }}>
              {currentSectionObj.title}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em' }}>
              {completedCount} OF {totalSections} DONE · {progressPct}%
            </div>
            <div style={{ marginTop: 8, width: 140, height: 2, background: BRAND.rule, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPct}%`, background: BRAND.red, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => {
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1 && !isLoading;
            return (
              <div key={i}>
                <MessageBubble role={m.role} content={m.content} />
                {isLastAssistant && Array.isArray(m.options) && m.options.length > 0 && (
                  <div style={{ marginTop: 12, marginLeft: 44, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {m.options.map((opt, j) => (
                      <button
                        key={j}
                        onClick={() => sendOption(opt)}
                        disabled={isLoading}
                        style={{
                          background: BRAND.paper,
                          color: BRAND.ink,
                          border: `1px solid ${BRAND.rule}`,
                          padding: '10px 16px',
                          fontSize: 13.5,
                          lineHeight: 1.4,
                          cursor: 'pointer',
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          textAlign: 'left',
                          maxWidth: 480,
                          transition: 'all 0.15s',
                          borderRadius: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = BRAND.cream; e.currentTarget.style.borderColor = BRAND.red; e.currentTarget.style.color = BRAND.red; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = BRAND.paper; e.currentTarget.style.borderColor = BRAND.rule; e.currentTarget.style.color = BRAND.ink; }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="msg-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar />
              <div style={{ background: BRAND.cream, padding: '14px 18px', maxWidth: '75%' }}>
                <span className="dot"></span><span className="dot" style={{ marginLeft: 4 }}></span><span className="dot" style={{ marginLeft: 4 }}></span>
              </div>
            </div>
          )}
          {error && (
            <div style={{ background: BRAND.redLight, color: BRAND.redDark, padding: '12px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: `1px solid ${BRAND.rule}`, padding: '20px 32px', background: BRAND.paper }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your answer…"
              disabled={isLoading}
              rows={1}
              className="sans"
              style={{
                flex: 1,
                border: `1px solid ${BRAND.rule}`,
                padding: '12px 16px',
                fontSize: 14,
                resize: 'none',
                background: BRAND.paper,
                color: BRAND.ink,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                lineHeight: 1.5,
                minHeight: 44,
                maxHeight: 160,
                borderRadius: 12,
              }}
            />
            <button
              className="btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{ height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Send size={14} />
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.1em' }}>
                ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
              </span>
              {showQuoteUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.doc,.xlsx,.xls,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadQuoteFile(f);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!uploadingFile || isLoading}
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: uploadingFile ? BRAND.muted : BRAND.red,
                      background: 'none',
                      border: `1px solid ${BRAND.red}`,
                      padding: '4px 10px',
                      cursor: uploadingFile ? 'wait' : 'pointer',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Attach your validated quote (PDF, image, DOCX, up to 15 MB)"
                  >
                    {uploadingFile ? (
                      <><span className="dot"></span> Uploading {uploadingFile.slice(0, 18)}{uploadingFile.length > 18 ? '…' : ''}</>
                    ) : (
                      <><Paperclip size={11} /> Attach quote file</>
                    )}
                  </button>
                </>
              )}
            </div>
            {Object.keys(responses).length >= 4 && (
              <button onClick={jumpToReview} className="mono" style={{ fontSize: 10, color: BRAND.red, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Skip to review →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <Sidebar currentSection={currentSection} sectionsDone={sectionsDone} responses={responses} />
    </div>
  );
}

function MessageBubble({ role, content }) {
  const isAssistant = role === 'assistant';
  return (
    <div className="msg-in" style={{ display: 'flex', gap: 12, flexDirection: isAssistant ? 'row' : 'row-reverse', alignItems: 'flex-start' }}>
      {isAssistant ? <Avatar /> : <UserAvatar />}
      <div style={{
        background: isAssistant ? BRAND.cream : BRAND.ink,
        color: isAssistant ? BRAND.ink : 'white',
        padding: '14px 18px',
        maxWidth: '78%',
        fontSize: 14.5,
        lineHeight: 1.55,
        borderLeft: isAssistant ? `2px solid ${BRAND.red}` : 'none',
      }}>
        {content.split('\n').map((line, i) => (
          <div key={i} style={{ marginTop: i > 0 ? 8 : 0 }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div style={{ width: 32, height: 32, background: BRAND.red, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <span className="serif" style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>G</span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: 9, background: BRAND.ink, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <span className="mono" style={{ color: 'white', fontSize: 11, fontWeight: 500 }}>YOU</span>
    </div>
  );
}

// ============================================================================
// Sidebar — progress + captured data
// ============================================================================

function Sidebar({ currentSection, sectionsDone, responses }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Progress */}
      <div style={{ background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: '22px 24px', borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18 }}>
          Progress
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(s => {
            const done = sectionsDone[s.id];
            const isCurrent = currentSection === s.id;
            return (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px solid ${BRAND.rule}`,
                opacity: done || isCurrent ? 1 : 0.5,
              }}>
                <div style={{ flexShrink: 0 }}>
                  {done ? <Check size={14} color={BRAND.red} strokeWidth={2.5} /> : isCurrent ? <CircleDot size={14} color={BRAND.red} /> : <Circle size={14} color={BRAND.muted} />}
                </div>
                <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.1em', width: 20 }}>
                  {s.number}
                </div>
                <div className="serif" style={{ fontSize: 13, color: isCurrent ? BRAND.red : BRAND.ink, fontStyle: isCurrent ? 'italic' : 'normal', fontWeight: isCurrent ? 500 : 400 }}>
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Captured so far */}
      <div style={{ background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: '22px 24px', flex: 1, minHeight: 0, borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18 }}>
          Captured
        </div>
        {Object.keys(responses).length === 0 ? (
          <div style={{ fontSize: 13, color: BRAND.muted, fontStyle: 'italic' }}>
            Your answers will appear here as we go.
          </div>
        ) : (
          <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 480, overflowY: 'auto' }}>
            {Object.entries(responses).map(([key, value]) => {
              const fieldDef = findFieldDef(key);
              return (
                <div key={key}>
                  <div className="mono" style={{ fontSize: 9, color: BRAND.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {fieldDef?.label || key}
                  </div>
                  <div style={{ fontSize: 13, color: BRAND.ink, marginTop: 4, lineHeight: 1.4 }}>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function findFieldDef(fieldId) {
  for (const s of SECTIONS) {
    const f = s.fields.find(x => x.id === fieldId);
    if (f) return f;
  }
  return null;
}

// ============================================================================
// Review Screen
// ============================================================================

function ReviewScreen({ responses, setResponses, editingField, setEditingField, editBuffer, setEditBuffer, acknowledgments, setAcknowledgments, termsAccepted, setTermsAccepted, signatureName, setSignatureName, signatureDate, setSignatureDate, canSign, sign, backToChat, researchSource, uploadQuoteFile, uploadingFile }) {

  const startEdit = (fieldId) => {
    setEditingField(fieldId);
    setEditBuffer(responses[fieldId] || '');
  };
  const saveEdit = () => {
    setResponses(prev => ({ ...prev, [editingField]: editBuffer }));
    setEditingField(null);
    setEditBuffer('');
  };
  const cancelEdit = () => {
    setEditingField(null);
    setEditBuffer('');
  };

  // Compute completion stats for the progress strip at the top.
  const allFields = SECTIONS.flatMap(s => s.fields.map(f => ({ ...f, sectionId: s.id, sectionNumber: s.number })));
  const requiredFields = allFields.filter(f => f.required);
  const filledRequired = requiredFields.filter(f => {
    const v = responses[f.id];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;
  const filledAny = allFields.filter(f => {
    const v = responses[f.id];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;
  const totalFields = allFields.length;
  const pct = Math.round((filledAny / totalFields) * 100);
  const requiredMissing = requiredFields.length - filledRequired;
  const allRequiredFilled = requiredMissing === 0;

  // Everything still blocking "Sign & submit", listed under the button.
  const isBlank = (v: any) => v === undefined || v === null || String(v).replace(/^Other:\s*$/i, '').trim() === '';
  const missingFieldItems = requiredFields.filter(f => isBlank(responses[f.id]));
  const missingAckCount = ACKNOWLEDGMENTS.filter(a => !acknowledgments[a.id]).length;
  const missingOther: string[] = [];
  if (missingAckCount > 0) missingOther.push(`${missingAckCount} acknowledgment${missingAckCount > 1 ? 's' : ''} to check`);
  if (!termsAccepted) missingOther.push('Accept the Terms of Service');
  if (signatureName.trim().length < 2) missingOther.push('Type your full name as signature');
  if (!signatureDate) missingOther.push('Signature date');
  const scrollToField = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(`field-${id}`) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Quote file upload — hidden file input lives at the review level.
  const quoteFileRef = useRef<HTMLInputElement | null>(null);

  // Sort SECTIONS: render in spec order. SECTIONS comes from outer scope.
  // For each field, decide its visual state.
  const fieldStatus = (f: any) => {
    const v = responses[f.id];
    const has = v !== undefined && v !== null && String(v).trim() !== '';
    if (!has) return f.required ? 'missing-required' : 'missing-optional';
    const fromResearch = researchSource && Array.isArray(researchSource.capturedFields) && researchSource.capturedFields.includes(f.id);
    return fromResearch ? 'prefilled' : 'filled';
  };

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          — {researchSource ? 'Pre-filled from research · Edit & Sign' : 'Manual intake · Fill & Sign'}
        </div>
        <h1 className="serif" style={{ fontSize: 44, fontWeight: 400, color: BRAND.ink, margin: '16px 0 0', letterSpacing: '-0.02em' }}>
          {researchSource ? (
            <>Here's what we found. <span style={{ fontStyle: 'italic', color: BRAND.red }}>Edit anything that's off.</span></>
          ) : (
            <>Fill in your intake, <span style={{ fontStyle: 'italic', color: BRAND.red }}>then sign.</span></>
          )}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 16, maxWidth: 720 }}>
          {researchSource ? (
            <>We did the homework on <strong>{(() => { try { return new URL(researchSource.url).hostname; } catch { return researchSource.url; } })()}</strong>{researchSource.linkedInUrl ? <> and <strong>your LinkedIn profile</strong></> : null}. Click any field to edit. Fields we couldn't pre-fill are marked <span style={{ color: BRAND.red }}>"needs your input"</span>. Acknowledge the terms at the bottom and sign to finish.</>
          ) : (
            <>Click any field to fill it in. Required fields are marked with a red dot. Acknowledge the terms at the bottom and sign to finish.</>
          )}
        </p>
        <button onClick={backToChat} className="btn-ghost" style={{ marginTop: 20 }}>← Start over</button>
      </div>

      {/* Progress strip */}
      <div style={{ marginBottom: 36, padding: 18, background: BRAND.paper, border: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', gap: 24, borderRadius: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: BRAND.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {filledAny} of {totalFields} fields filled
            </span>
            <span className="mono" style={{ fontSize: 11, color: allRequiredFilled ? BRAND.red : BRAND.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {allRequiredFilled ? '✓ All required complete' : `${requiredMissing} required missing`}
            </span>
          </div>
          <div style={{ height: 3, background: BRAND.rule, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: BRAND.red, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>

      {/* All-fields, all-sections view */}
      {SECTIONS.map(section => {
        return (
          <div key={section.id} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${BRAND.red}` }}>
              <div className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.2em' }}>{section.number}</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{section.title}</div>
              {section.optional && (
                <div className="mono" style={{ fontSize: 9, color: BRAND.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>(optional service)</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {section.fields.map(f => {
                const value = responses[f.id];
                const isEditing = editingField === f.id;
                const status = fieldStatus(f);
                const hasValue = status === 'prefilled' || status === 'filled';

                return (
                  <div key={f.id} id={`field-${f.id}`} className="review-row" style={{
                    padding: '16px 0',
                    borderBottom: `1px solid ${BRAND.rule}`,
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr auto',
                    gap: 20,
                    alignItems: 'flex-start',
                    background: status === 'missing-required' ? 'rgba(254, 27, 4, 0.03)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                      {f.required && <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasValue ? BRAND.red : '#D9C8C8', display: 'inline-block', flexShrink: 0 }} title={f.required ? 'Required' : ''} />}
                      <div>
                        <div className="mono" style={{ fontSize: 11, color: BRAND.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {f.label}
                        </div>
                        {FIELD_HELP[f.id] && (
                          <div className="sans" style={{ fontSize: 12, color: BRAND.charcoalLight, lineHeight: 1.45, marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>
                            {linkify(FIELD_HELP[f.id])}
                          </div>
                        )}
                      </div>
                    </div>
                    {isInlineField(f) ? (
                      <InlineChoice f={f} value={value} onChange={(nv) => setResponses(prev => ({ ...prev, [f.id]: nv }))} />
                    ) : isEditing ? (
                      (() => {
                        const opts = (f as any).options as string[] | undefined;
                        const isMulti = Boolean((f as any).multi);
                        const fType = (f as any).type as string | undefined;
                        const isLong = Boolean((f as any).long);
                        // Date picker
                        if (fType === 'date' || f.id === 'startDate') {
                          return (
                            <input
                              type="date"
                              value={editBuffer || ''}
                              onChange={(e) => setEditBuffer(e.target.value)}
                              autoFocus
                              className="sans"
                              style={{ border: `1px solid ${BRAND.red}`, padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', lineHeight: 1.5 }}
                            />
                          );
                        }
                        // Single-option checkbox (Confirmed / YES)
                        if (opts && opts.length === 1) {
                          const only = opts[0];
                          const checked = String(editBuffer || '') === only;
                          return (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${checked ? BRAND.red : BRAND.rule}`, background: checked ? BRAND.redLight : 'transparent', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setEditBuffer(e.target.checked ? only : '')}
                                autoFocus
                                style={{ accentColor: BRAND.red, width: 16, height: 16, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 14 }}>{only}</span>
                            </label>
                          );
                        }
                        // Multi-select checkbox list
                        if (opts && isMulti) {
                          const selected = String(editBuffer || '').split(/,\s*/).filter(Boolean);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {opts.map((opt) => {
                                const on = selected.includes(opt);
                                return (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${on ? BRAND.red : BRAND.rule}`, background: on ? BRAND.redLight : 'transparent', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={(e) => {
                                        const next = e.target.checked ? [...selected, opt] : selected.filter((x) => x !== opt);
                                        setEditBuffer(next.join(', '));
                                      }}
                                      style={{ accentColor: BRAND.red, width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 14 }}>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        }
                        // Single-choice radio list (with Other + free text)
                        if (opts && opts.length > 1) {
                          const hasOther = opts.some((o) => o.toLowerCase() === 'other' || o.toLowerCase() === 'autre');
                          const presetMatch = opts.find((o) => String(editBuffer || '') === o);
                          const isOther = !!editBuffer && !presetMatch;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {opts.map((opt) => {
                                const isOtherOpt = opt.toLowerCase() === 'other' || opt.toLowerCase() === 'autre';
                                const on = isOtherOpt ? isOther : String(editBuffer || '') === opt;
                                return (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${on ? BRAND.red : BRAND.rule}`, background: on ? BRAND.redLight : 'transparent', cursor: 'pointer' }}>
                                    <input
                                      type="radio"
                                      name={`opt-${f.id}`}
                                      checked={on}
                                      onChange={() => {
                                        if (isOtherOpt) {
                                          setEditBuffer(presetMatch ? '' : (editBuffer || ''));
                                        } else {
                                          setEditBuffer(opt);
                                        }
                                      }}
                                      style={{ accentColor: BRAND.red, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 14 }}>{opt}</span>
                                  </label>
                                );
                              })}
                              {hasOther && isOther && (
                                <input
                                  type="text"
                                  value={editBuffer}
                                  onChange={(e) => setEditBuffer(e.target.value)}
                                  placeholder="Please specify…"
                                  autoFocus
                                  className="sans"
                                  style={{ marginLeft: 28, border: `1px solid ${BRAND.red}`, padding: '8px 12px', fontSize: 14, fontFamily: 'Inter' }}
                                />
                              )}
                            </div>
                          );
                        }
                        // Long textarea
                        if (isLong) {
                          return (
                            <textarea
                              value={editBuffer}
                              onChange={(e) => setEditBuffer(e.target.value)}
                              rows={f.id === 'competitors' ? 6 : 4}
                              placeholder={f.id === 'competitors' ? '1. \n2. \n3. \n4. \n5. ' : undefined}
                              autoFocus
                              className="sans"
                              style={{ border: `1px solid ${BRAND.red}`, padding: '8px 12px', fontSize: 14, fontFamily: 'Inter', resize: 'vertical', lineHeight: 1.5 }}
                            />
                          );
                        }
                        // Plain short text
                        return (
                          <input
                            type="text"
                            value={editBuffer}
                            onChange={(e) => setEditBuffer(e.target.value)}
                            autoFocus
                            className="sans"
                            style={{ border: `1px solid ${BRAND.red}`, padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', lineHeight: 1.5 }}
                          />
                        );
                      })()
                    ) : (
                      <div className="serif" style={{ fontSize: 15.5, color: BRAND.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 24 }}>
                        {f.id === 'quoteReference' && typeof value === 'string' && value.includes('http') ? (
                          (() => {
                            const m = value.match(/(https?:\/\/\S+)/);
                            const url = m ? m[1] : '';
                            const name = value.replace(/Uploaded quote:\s*/, '').replace(/ — https?:\/\/\S+/, '');
                            return url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: BRAND.red, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
                                <FileText size={14} /> {name || 'View quote file'}
                              </a>
                            ) : <>{String(value)}</>;
                          })()
                        ) : hasValue ? (
                          <>
                            {f.id === 'competitors' ? numberLines(Array.isArray(value) ? value.join('\n') : String(value)) : (Array.isArray(value) ? value.join(', ') : String(value))}
                            {status === 'prefilled' && (
                              <span className="mono" style={{ marginLeft: 10, padding: '2px 6px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: BRAND.cream, color: BRAND.red, border: `1px solid ${BRAND.redLight}`, verticalAlign: 'middle' }}>
                                ✓ from research
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: status === 'missing-required' ? BRAND.red : BRAND.muted, fontStyle: 'italic', fontSize: 14 }}>
                            {status === 'missing-required' ? 'Needs your input' : 'Optional — click to add'}
                          </span>
                        )}
                      </div>
                    )}
                    {isEditing && !isInlineField(f) ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveEdit} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                        <button onClick={cancelEdit} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {status === 'missing-required' && (
                          <span className="missing-arrow" role="img" aria-label="Required information missing" title="Required: please fill this in"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 26, borderRadius: 8, background: BRAND.red, color: '#fff', boxShadow: '0 0 0 2px #E5E7EB, 0 1px 3px rgba(0,0,0,0.15)', flexShrink: 0 }}>
                            <ArrowLeft size={18} strokeWidth={3} />
                          </span>
                        )}
                        {f.id === 'quoteReference' && (
                          <>
                            <input
                              ref={quoteFileRef}
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.docx,.doc,.xlsx,.xls,.txt"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadQuoteFile(file);
                                if (quoteFileRef.current) quoteFileRef.current.value = '';
                              }}
                            />
                            <button
                              onClick={() => quoteFileRef.current?.click()}
                              disabled={!!uploadingFile}
                              className="mono"
                              style={{
                                fontSize: 10,
                                color: uploadingFile ? BRAND.muted : BRAND.red,
                                background: 'none',
                                border: `1px solid ${BRAND.red}`,
                                padding: '4px 10px',
                                cursor: uploadingFile ? 'wait' : 'pointer',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                              title="Upload your validated quote (PDF, image, DOCX, up to 15 MB)"
                            >
                              {uploadingFile ? (
                                <><span className="dot"></span> Uploading…</>
                              ) : (
                                <><Paperclip size={10} /> Upload</>
                              )}
                            </button>
                          </>
                        )}
                        {!isInlineField(f) && (
                          <button onClick={() => startEdit(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.muted, padding: 4 }} title="Edit">
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Acknowledgments */}
      <div style={{ marginTop: 64, padding: 32, background: BRAND.paper, border: `1px solid ${BRAND.rule}`, borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          — Section 09
        </div>
        <div className="serif" style={{ fontSize: 26, fontWeight: 500, marginTop: 8, marginBottom: 24 }}>
          Understandings &amp; Acknowledgments
        </div>
        <p style={{ fontSize: 14, color: BRAND.charcoalLight, marginBottom: 24, lineHeight: 1.6 }}>
          Please confirm each of the following by checking the box. All four are required before signature.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ACKNOWLEDGMENTS.map(ack => (
            <label key={ack.id} style={{ display: 'flex', gap: 14, cursor: 'pointer', padding: '14px 16px', border: `1px solid ${acknowledgments[ack.id] ? BRAND.red : BRAND.rule}`, background: acknowledgments[ack.id] ? BRAND.redLight : 'transparent', transition: 'all 0.15s' }}>
              <input
                type="checkbox"
                checked={!!acknowledgments[ack.id]}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, [ack.id]: e.target.checked }))}
                style={{ marginTop: 3, accentColor: BRAND.red, width: 16, height: 16, cursor: 'pointer' }}
              />
              <div style={{ fontSize: 14, lineHeight: 1.5, color: BRAND.ink }}>{ack.text}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Terms of Service + Signature */}
      <div style={{ marginTop: 32, padding: 32, background: BRAND.ink, color: 'white', borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          — Section 10
        </div>
        <div className="serif" style={{ fontSize: 26, fontWeight: 500, marginTop: 8, marginBottom: 20 }}>
          Terms of Service &amp; Signature
        </div>

        <label style={{ display: 'flex', gap: 14, cursor: 'pointer', padding: '14px 0', borderBottom: `1px solid ${BRAND.charcoalLight}`, marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginTop: 3, accentColor: BRAND.red, width: 16, height: 16, cursor: 'pointer' }}
          />
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            I agree to Gershon Consulting's Terms of Service, available at{' '}
            <a href="https://www.gershonconsulting.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" style={{ color: BRAND.red, textDecoration: 'underline' }}>
              gershonconsulting.com/terms-and-conditions
            </a>.
          </div>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 8 }}>
          <div>
            <label className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Type your full name to sign
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Your full legal name"
              className="serif"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${BRAND.red}`,
                padding: '10px 0',
                fontSize: 28,
                fontStyle: 'italic',
                color: 'white',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              }}
            />
          </div>
          <div>
            <label className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Date
            </label>
            <input
              type="date"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              className="mono"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${BRAND.red}`,
                padding: '10px 0',
                fontSize: 16,
                color: 'white',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.1em' }}>
            BY SIGNING, THIS INTAKE BECOMES BINDING ON THE PROJECT
          </div>
          <button
            className="btn-primary"
            onClick={sign}
            disabled={!canSign}
            style={{ padding: '14px 32px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            Sign &amp; submit <ArrowRight size={16} />
          </button>
        </div>
        {!canSign && (missingFieldItems.length > 0 || missingOther.length > 0) && (
          <div className="missing-panel" role="status" aria-live="polite" style={{ marginTop: 16, border: `1px solid ${BRAND.red}`, borderRadius: 12, background: BRAND.redLight, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: BRAND.red, marginBottom: 10 }}>
              <AlertCircle size={16} /> To complete the form, still missing ({missingFieldItems.length + missingAckCount + missingOther.length - (missingAckCount > 0 ? 1 : 0)}):
            </div>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {missingFieldItems.map(f => {
                const sec = SECTIONS.find(sx => sx.fields.some(ff => ff.id === f.id));
                return (
                  <li key={f.id} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" onClick={() => scrollToField(f.id)} title="Show this question in the form"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BRAND.ink, fontSize: 14, textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <ArrowLeft size={14} color={BRAND.red} strokeWidth={3} />
                      <span>{sec ? `${sec.number} · ${sec.title} — ` : ''}<span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{f.label}</span></span>
                    </button>
                    <div style={{ paddingLeft: 22 }}>
                      <MissingItemEditor f={f} onCommit={(nv) => setResponses(prev => ({ ...prev, [f.id]: nv }))}
                        onUpload={f.id === 'quoteReference' ? () => quoteFileRef.current?.click() : undefined} />
                    </div>
                  </li>
                );
              })}
              {ACKNOWLEDGMENTS.filter(a => !acknowledgments[a.id]).map(a => (
                <li key={a.id} className="fade-in">
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: BRAND.ink, cursor: 'pointer' }}>
                    <input type="checkbox" checked={false} onChange={() => setAcknowledgments(prev => ({ ...prev, [a.id]: true }))} style={{ accentColor: BRAND.red, width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
                    <span>{a.text}</span>
                  </label>
                </li>
              ))}
              {!termsAccepted && (
                <li className="fade-in">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: BRAND.ink, cursor: 'pointer' }}>
                    <input type="checkbox" checked={false} onChange={() => setTermsAccepted(true)} style={{ accentColor: BRAND.red, width: 16, height: 16 }} />
                    <span>I accept the <a href="https://www.gershonconsulting.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" style={{ color: BRAND.red, textDecoration: 'underline' }}>Terms of Service</a></span>
                  </label>
                </li>
              )}
              {signatureName.trim().length < 2 && (
                <li className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: BRAND.ink }}>
                  <ArrowLeft size={14} color={BRAND.red} strokeWidth={3} /> Signature (full name)
                  <SignatureNameInput onCommit={setSignatureName} />
                </li>
              )}
              {!signatureDate && (
                <li className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: BRAND.ink }}>
                  <ArrowLeft size={14} color={BRAND.red} strokeWidth={3} /> Signature date
                  <input type="date" onChange={(e) => e.target.value && setSignatureDate(e.target.value)}
                    style={{ border: `1px solid ${BRAND.rule}`, borderRadius: 8, padding: '6px 10px', fontSize: 14, background: BRAND.paper }} />
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Signed / Thank you screen
// ============================================================================

function SignedScreen({ responses, signatureName, signatureDate, exportJSON, exportPDF }) {
  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '80px 32px', textAlign: 'left' }}>
      <div style={{ width: 56, height: 56, background: BRAND.red, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <Check size={28} color="white" strokeWidth={2.5} />
      </div>
      <div className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        — Intake complete
      </div>
      <h1 className="serif" style={{ fontSize: 48, lineHeight: 1.1, fontWeight: 400, margin: '16px 0 0', letterSpacing: '-0.02em' }}>
        Thank you, <span style={{ fontStyle: 'italic', color: BRAND.red }}>{(responses.firstName || signatureName.split(' ')[0] || 'there')}</span>.
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 24 }}>
        We've received your onboarding intake for <strong>{responses.companyName || 'your company'}</strong> and it is now binding on this project. A Gershon team member will be in touch within one business day to confirm kickoff and schedule the first weekly update call.
      </p>

      <div style={{ marginTop: 40, padding: 24, background: BRAND.paper, border: `1px solid ${BRAND.rule}`, borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Signed by</div>
            <div className="serif" style={{ fontSize: 18, fontStyle: 'italic', color: BRAND.ink, marginTop: 4 }}>{signatureName}</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Date</div>
            <div className="mono" style={{ fontSize: 15, color: BRAND.ink, marginTop: 6 }}>{signatureDate}</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Company</div>
            <div style={{ fontSize: 15, color: BRAND.ink, marginTop: 6 }}>{responses.companyName || '—'}</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Start date</div>
            <div style={{ fontSize: 15, color: BRAND.ink, marginTop: 6 }}>{responses.startDate || '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={exportPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Download size={14} /> Download intake (PDF)
        </button>
        <button className="btn-ghost" onClick={exportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Download size={12} /> JSON copy
        </button>
        <button className="btn-ghost" onClick={() => window.location.reload()}>
          Start another
        </button>
      </div>

      <div style={{ marginTop: 32, padding: 20, background: BRAND.cream, border: `1px solid ${BRAND.rule}`, fontSize: 13.5, lineHeight: 1.6, color: BRAND.charcoalLight }}>
        <div className="mono" style={{ fontSize: 10, color: BRAND.red, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>What happens next</div>
        <div>1. We've stored your intake securely on Gershon's side and a copy was emailed to the Gershon team.</div>
        <div>2. You'll get a reply within one business day to confirm kickoff and schedule the first weekly update call.</div>
        <div>3. Save the PDF above for your records — it's the binding reference for the campaign.</div>
      </div>

      <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkles size={12} color={BRAND.red} />
        <span className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.15em' }}>
          GERSHON CONSULTING LLC · DELAWARE · EST. 2013
        </span>
      </div>
    </div>
  );
}
