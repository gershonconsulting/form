'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, CircleDot, Circle, Send, Sparkles, ArrowRight, Download, AlertCircle, Pencil, Lock } from 'lucide-react';

// ============================================================================
// GERSHON CONSULTING — INTERACTIVE ONBOARDING FORM
// Prototype for form.gershonCRM.com
// ============================================================================

const BRAND = {
  red: '#CC3333',
  redDark: '#A82828',
  redLight: '#F5E0E0',
  charcoal: '#2a2a2a',
  charcoalLight: '#3d3d3d',
  cream: '#FAF8F5',
  paper: '#FFFFFF',
  rule: '#E8E4DE',
  ink: '#1A1A1A',
  muted: '#8A857E',
};

const BUILD_TIME =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_TIME) || 'dev';
const BUILD_LABEL = BUILD_TIME === 'dev'
  ? 'BUILD DEV'
  : `BUILD ${BUILD_TIME.replace('T', ' ').slice(0, 16).replace(/-/g, '\u2011')}`;

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
    title: 'Target Market',
    fields: [
      { id: 'targetDefinition', label: 'Target prospect definition', required: true, long: true },
      { id: 'targetLocations', label: 'Target locations', required: true },
      { id: 'targetIndustries', label: 'Target industries', required: true },
      { id: 'targetTitles', label: 'Target job titles (ICP)', required: true },
      { id: 'initialTemplate', label: 'What you use today to pitch new prospects', required: true, long: true },
      { id: 'idealLinkedInLeads', label: '5 LinkedIn links of ideal leads', required: true, long: true },
      { id: 'targetHeadcount', label: 'Target headcount range (min–max)', required: true },
      { id: 'targetRevenue', label: 'Target revenue range (min–max)', required: true },
    ],
  },
  {
    id: 'promote',
    number: '05',
    title: 'Social Networks (PROMOTE)',
    optional: true,
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
    optional: true,
    fields: [
      { id: 'companyLinkedIn', label: 'Company LinkedIn page', required: true },
      { id: 'personalLinkedIn', label: 'Personal LinkedIn page', required: true },
      { id: 'salesNavActive', label: 'Sales Navigator license activated', required: true, options: ['Yes'] },
      { id: 'linalysisActive', label: 'Linalysis account activated', required: true, options: ['Yes'] },
      { id: 'calendlyLink', label: 'Calendly (or equivalent) link', required: true },
      { id: 'ssiScores', label: 'Social Selling Index — SSI / SSI Network / SSI Industry', required: false },
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
      { id: 'startDate', label: 'Starting campaign date (ideally first of upcoming month)', required: true },
      { id: 'quoteReference', label: 'Reference of the validated quote you received', required: true, long: true },
    ],
  },
];

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
5. For SECTION 03 (campaign), if the client does NOT select PROMOTE or NETWORK, skip the corresponding section (05 or 06) — their "sectionComplete" should still fire for those sections with empty capture.
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
  // Save progress to localStorage on every responses change
  useEffect(() => {
    if (!sessionId || Object.keys(responses).length === 0) return;
    try {
      localStorage.setItem(`gershon_session_${sessionId}`, JSON.stringify({
        responses, messages, currentSection, sectionsDone, researchSource, savedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }, [responses, messages, currentSection, sectionsDone]);

  // Restore progress if session exists in localStorage
  const [showResume, setShowResume] = useState<{savedAt: string} | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    try {
      const saved = localStorage.getItem(`gershon_session_${sessionId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.responses && Object.keys(parsed.responses).length > 0 && phase === 'url_intake') {
        setShowResume({ savedAt: parsed.savedAt });
        // Pre-load the data so it's ready if they resume
        window.__gershonSaved = parsed;
      }
    } catch (_) {}
  }, [sessionId]);

  const resumeSession = () => {
    const saved = (window as any).__gershonSaved;
    if (!saved) return;
    setResponses(saved.responses || {});
    setMessages(saved.messages || []);
    setCurrentSection(saved.currentSection || 'about_you');
    setSectionsDone(saved.sectionsDone || {});
    setResearchSource(saved.researchSource || null);
    setShowResume(null);
    setPhase('conversation');
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Review / signature state
  const [editingField, setEditingField] = useState(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [acknowledgments, setAcknowledgments] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (phase === 'conversation' && !isLoading) inputRef.current?.focus();
  }, [phase, isLoading]);

  // Kick off the conversation (skip research path)
  const startConversation = async () => {
    setPhase('conversation');
    // All clients get the full package — pre-capture this
    setResponses(prev => ({ ...prev, services: ['Social Content Creation (PROMOTE)', 'Social Selling (NETWORK)', 'Lead Generation Emailing (ENGAGE)'] }));
    await callClaude([]);
  };

  // Run upfront website research and pre-fill fields
  const researchAndStart = async (url) => {
    setPhase('researching');
    setError(null);

    try {
      setResearchStatus(`Visiting ${new URL(url.startsWith('http') ? url : 'https://' + url).hostname}…`);

      const researchPrompt = `A new client is starting the Gershon Consulting onboarding for a US lead-generation campaign. Their website is: ${url}

Use web_search to research this company. Pull their homepage content, any "About" / "Products" / "Pricing" / "Customers" pages you can, their LinkedIn company page, recent news. Then return a single JSON object with what you learned — ONLY fields you're confident about based on the site. If a field is a guess or you can't find it, leave it out.

Return this JSON schema (omit any field you can't fill with reasonable confidence):

{
  "summary": "2-3 sentence description of what this company does, for internal reference",
  "capture": {
    "companyName": "…",
    "website": "…",
    "businessType": "B2B | B2C | B2B2C | marketplace | agency | etc",
    "industry": "specific sub-industry, e.g. 'B2B SaaS — HR tech' not just 'software'",
    "productLinks": "URLs to main product/service pages, comma-separated",
    "targetDefinition": "best-guess description of their ideal customer profile based on site copy (testimonials, case studies, who they pitch to)",
    "targetIndustries": "likely target industries for US outreach",
    "targetTitles": "likely target buyer personas / job titles",
    "top5Highlights": "5 differentiators worth highlighting on social, drawn from their site copy — newline-separated",
    "googleKeywords": "likely Google keywords their category ranks for — comma-separated",
    "competitors": "3-5 known competitors with website + one line on why each is a competitor",
    "competitorTwitterAccounts": "Twitter handles of competitors if you can find them, comma-separated"
  }
}

Return ONLY the JSON object. No markdown fences. No preamble. No commentary after.`;

      setResearchStatus('Analyzing company website and positioning…');

      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const parsed = await res.json();

      setResearchStatus('Drafting your onboarding…');

      const capture = parsed.capture || {};
      setResponses(prev => ({ ...prev, services: ['Social Content Creation (PROMOTE)', 'Social Selling (NETWORK)', 'Lead Generation Emailing (ENGAGE)'], ...capture, website: capture.website || url }));
      setResearchSource({
        url,
        summary: parsed.summary || '',
        searchedAt: new Date().toISOString(),
        capturedFields: Object.keys(capture),
      });

      // All clients get the full package — pre-capture this
      const fullCapture = { services: ['Social Content Creation (PROMOTE)', 'Social Selling (NETWORK)', 'Lead Generation Emailing (ENGAGE)'], ...capture, website: capture.website || url };
      // Hand off to conversation — the assistant will see the pre-fills and confirm them
      setPhase('conversation');
      await callClaudeWithContext([], { ...responses, ...fullCapture }, sectionsDone, {
        url,
        summary: parsed.summary || '',
        searchedAt: new Date().toISOString(),
        capturedFields: Object.keys(capture),
      });
    } catch (e) {
      console.error(e);
      setError('We couldn\'t complete the research. You can still continue manually.');
      setPhase('url_intake');
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
      setMessages(prev => [...prev, { role: 'assistant', content: parsed.message, ts: Date.now() }]);
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

      setMessages(prev => [...prev, { role: 'assistant', content: parsed.message, ts: Date.now() }]);

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

  const sendOptionMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const history = newMessages.map(m => ({
      role: m.role,
      content: m.role === 'assistant'
        ? JSON.stringify({ message: m.content, capture: {}, currentSection, sectionComplete: false, readyForReview: false })
        : m.content,
    }));
    await callClaude(history);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const jumpToReview = () => setPhase('review');

  const allAcknowledged = ACKNOWLEDGMENTS.every(a => acknowledgments[a.id]);
  const canSign = allAcknowledged && termsAccepted && signatureName.trim().length >= 2 && signatureDate;

  const sign = async () => {
    if (!canSign) return;
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses,
          acknowledgments,
          termsAccepted,
          signature: { name: signatureName, date: signatureDate },
          conversationTranscript: messages,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setPhase('signed');
    } catch (e) {
      console.error('Submit error:', e);
      setError('Submission failed. Please try again.');
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

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div style={{ minHeight: '100vh', background: BRAND.cream, color: BRAND.ink, fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .serif { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; letter-spacing: -0.01em; }
        .sans { font-family: 'Inter', sans-serif; }

        @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
        .dot { width: 6px; height: 6px; background: ${BRAND.charcoal}; border-radius: 50%; display: inline-block; animation: dotPulse 1.4s infinite ease-in-out; }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .msg-in { animation: slideIn 0.3s ease-out; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.5s ease-out; }

        .btn-primary { background: ${BRAND.red}; color: white; border: none; padding: 12px 24px; font-weight: 500; font-size: 14px; cursor: pointer; transition: background 0.15s; letter-spacing: 0.02em; }
        .btn-primary:hover:not(:disabled) { background: ${BRAND.redDark}; }
        .btn-primary:disabled { background: #CFC9C1; cursor: not-allowed; }

        .btn-ghost { background: transparent; color: ${BRAND.charcoal}; border: 1px solid ${BRAND.rule}; padding: 10px 20px; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: ${BRAND.charcoal}; }

        input:focus, textarea:focus { outline: none; border-color: ${BRAND.red}; }

        .scroll-area::-webkit-scrollbar { width: 6px; }
        .scroll-area::-webkit-scrollbar-track { background: transparent; }
        .scroll-area::-webkit-scrollbar-thumb { background: ${BRAND.rule}; border-radius: 3px; }
        .scroll-area::-webkit-scrollbar-thumb:hover { background: ${BRAND.muted}; }

        .tick-line { background: linear-gradient(90deg, ${BRAND.red} 0%, ${BRAND.red} 40px, ${BRAND.rule} 40px, ${BRAND.rule} 100%); }
      `}</style>

      {/* ============ HEADER ============ */}
      <header style={{ borderBottom: `1px solid ${BRAND.rule}`, background: BRAND.paper, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 32, height: 32, background: BRAND.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="serif" style={{ color: 'white', fontSize: 18, fontWeight: 600, fontStyle: 'italic' }}>G</span>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Gershon Consulting</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 500, color: BRAND.ink, marginTop: 1 }}>Client Onboarding</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={12} color={BRAND.muted} />
            <span className="mono" style={{ fontSize: 10, color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Secured · Binding</span>
            <span className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.12em', marginLeft: 14, paddingLeft: 14, borderLeft: `1px solid ${BRAND.rule}`, fontWeight: 600 }} title={`Full build timestamp: ${BUILD_TIME}`}>{BUILD_LABEL}</span>
          </div>
        </div>
      </header>

      {/* ============ PHASE: URL INTAKE ============ */}
      {phase === 'url_intake' && (
        <UrlIntakeScreen onAnalyze={researchAndStart} onSkip={startConversation} error={error} showResume={showResume} onResume={resumeSession} />
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
          sendOptionMessage={sendOptionMessage}
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
          backToChat={() => setPhase('conversation')}
        />
      )}

      {/* ============ PHASE: SIGNED ============ */}
      {phase === 'signed' && (
        <SignedScreen responses={responses} signatureName={signatureName} signatureDate={signatureDate} exportJSON={exportJSON} />
      )}
    </div>
  );
}

// ============================================================================
// URL Intake Screen — first step, gathers website for research
// ============================================================================

function UrlIntakeScreen({ onAnalyze, onSkip, error, showResume, onResume }) {
  const [url, setUrl] = useState('');
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

  const handleAnalyze = () => {
    setTouched(true);
    if (!isValid) return;
    const finalUrl = normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl;
    onAnalyze(finalUrl);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 32px' }}>
      <div style={{ maxWidth: 720 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 28 }}>
          — Onboarding Intake · Est. 10–15 min
        </div>
        {showResume && (
          <div style={{ marginBottom: 32, padding: '16px 20px', background: BRAND.paper, border: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: BRAND.red, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                Saved session found
              </div>
              <div style={{ fontSize: 13, color: BRAND.charcoalLight }}>
                You have an incomplete intake saved from {new Date(showResume.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Pick up where you left off?
              </div>
            </div>
            <button className="btn-primary" onClick={onResume} style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontSize: 13 }}>
              Resume →
            </button>
          </div>
        )}
        <h1 className="serif" style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 400, color: BRAND.ink, margin: 0, letterSpacing: '-0.02em' }}>
          Let's start with <span style={{ fontStyle: 'italic', color: BRAND.red }}>your website.</span>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 28 }}>
          Paste your URL and we'll do the homework first — reading your homepage, product pages, and positioning before the intake starts. You'll spend the conversation confirming and refining what we found, not typing from scratch.
        </p>

        <div style={{ marginTop: 40 }}>
          <label className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Your company website
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${touched && !isValid ? BRAND.red : BRAND.rule}`, background: BRAND.paper, transition: 'border 0.15s' }}>
            <span className="mono" style={{ padding: '16px 14px 16px 18px', fontSize: 13, color: BRAND.muted, borderRight: `1px solid ${BRAND.rule}`, display: 'flex', alignItems: 'center' }}>
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
                border: 'none',
                padding: '16px 18px',
                fontSize: 17,
                fontFamily: 'Inter, sans-serif',
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

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            className="btn-primary"
            onClick={handleAnalyze}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', fontSize: 14 }}
          >
            Analyze &amp; begin intake <ArrowRight size={16} />
          </button>
          <button
            onClick={onSkip}
            className="mono"
            style={{ background: 'none', border: 'none', color: BRAND.muted, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            No website — start manually
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
              { num: '04', title: 'Target Market', bullets: ['Likely ICP', 'Industries', 'Job titles'] },
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
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

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
        This typically takes 20–40 seconds. Sit tight — when we're done, the intake will already know who you are.
      </p>

      <div style={{ marginTop: 56, background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: 28 }}>
        {lines.map((line, i) => {
          const done = tick > i;
          const active = tick === i;
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

      {status && (
        <div className="mono" style={{ marginTop: 20, fontSize: 11, color: BRAND.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {status}
        </div>
      )}
    </div>
  );
}


// ============================================================================
// Conversation View
// ============================================================================

function ConversationView({ messages, input, setInput, sendMessage, sendOptionMessage, handleKey, sessionId = null, isLoading, error, currentSection, sectionsDone, responses, inputRef, messagesEndRef, jumpToReview, researchSource }) {
  const currentSectionObj = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];
  const totalSections = SECTIONS.length;
  const completedCount = Object.values(sectionsDone).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalSections) * 100);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px 260px', gap: 20, minHeight: 'calc(100vh - 72px)' }}>

      {/* CHAT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', background: BRAND.paper, border: `1px solid ${BRAND.rule}`, minHeight: 0 }}>

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
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              isLast={i === messages.length - 1}
              onOptionClick={!isLoading ? sendOptionMessage : null}
            />
          ))}
          {isLoading && (
            <div className="msg-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar />
              <div style={{ background: BRAND.cream, padding: '14px 18px', maxWidth: '85%' }}>
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
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.5,
                minHeight: 44,
                maxHeight: 160,
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
            <span className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.1em' }}>
              ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
            </span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <SaveProgressButton responses={responses} messages={messages} currentSection={currentSection} sectionsDone={sectionsDone} researchSource={researchSource} />
              {Object.keys(responses).length >= 4 && (
                <button onClick={jumpToReview} className="mono" style={{ fontSize: 10, color: BRAND.red, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Skip to review →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <ProgressPanel currentSection={currentSection} sectionsDone={sectionsDone} />
      <CapturedPanel responses={responses} />
    </div>
  );
}


// ============================================================================
// Option parsing — detect choices in AI messages and render as buttons
// ============================================================================

function parseOptions(text: string): string[] | null {
  // Pattern 1: "Your options are: A, B, C, or D"
  const optMatch = text.match(/(?:options are|choices are|your options)[:\s]+([^?!\n]{10,}[?!]?)\s*$/im);
  if (optMatch) {
    const raw = optMatch[1].replace(/[?!]$/, '').trim();
    const parts = raw
      .split(/,\s*/)
      .map(s => s.replace(/^(?:or|and)\s+/i, '').trim())
      .filter(s => s.length > 0 && s.length < 100);
    if (parts.length >= 2 && parts.length <= 8) return parts;
  }

  // Pattern 2: Numbered list (1. ..., 2. ...)
  const lines = text.split('\n');
  const numbered = lines.filter(l => /^\s*\d+\.\s+\S/.test(l));
  if (numbered.length >= 2 && numbered.length <= 8) {
    return numbered.map(l => l.replace(/^\s*\d+\.\s+/, '').trim()).filter(Boolean);
  }

  // Pattern 3: Bullet list (-, •, ·, *)
  const bulleted = lines.filter(l => /^\s*[-•·*]\s+\S/.test(l));
  if (bulleted.length >= 2 && bulleted.length <= 8) {
    return bulleted.map(l => l.replace(/^\s*[-•·*]\s+/, '').trim()).filter(Boolean);
  }

  // Pattern 4: Yes/No confirmation questions — broad detection
  const yesNoTriggers = [
    /does that (?:match|sound right|look right|seem right|ring true|work)\??/i,
    /is that (?:correct|right|accurate|good)\??/i,
    /(?:if so|if that(?:'s| is) right)/i,
    /\bare you ([A-Z][a-z]+)/i,           // sentence-initial or mid-sentence "Are you X?"
    /\bare (?:these|those) (?:the )?(?:correct|right|best|accurate|good)/i,
    /\bis (?:this|that) (?:you|correct|right|accurate|the best|the right)/i,
    /(?:confirm|confirming) (?:that|your|you)/i,
    /does that (?:land|match|work) for you\??/i,
    /\bcan you confirm\b/i,
    /\bdo(?:es)? (?:this|that|these|those) sound\b/i,
    /\bwould (?:that|this|these|those) be\b/i,
    /\bshall we\b/i,
    /\b(?:would|do) you (?:prefer|want to)/i,
    /(?:correct|update|change), or/i,
    /\bsound good\b/i,
    /\bgot it\??/i,
    /\bmake sense\??/i,
  ];
  if (yesNoTriggers.some(r => r.test(text))) {
    return ['Yes, correct', 'No, let me correct that', 'Other'];
  }

  return null;
}

function MessageBubble({ role, content, onOptionClick = null, isLast = false }) {
  const isAssistant = role === 'assistant';
  return (
    <div className="msg-in" style={{ display: 'flex', gap: 12, flexDirection: isAssistant ? 'row' : 'row-reverse', alignItems: 'flex-start' }}>
      {isAssistant ? <Avatar /> : <UserAvatar />}
      <div style={{ maxWidth: '88%' }}>
        <div style={{
          background: isAssistant ? BRAND.cream : BRAND.ink,
          color: isAssistant ? BRAND.ink : 'white',
          padding: '14px 18px',
          fontSize: 14.5,
          lineHeight: 1.55,
          borderLeft: isAssistant ? `2px solid ${BRAND.red}` : 'none',
        }}>
          {(() => {
            const parsedOpts = isAssistant && isLast && onOptionClick ? parseOptions(content) : null;
            const lines = content.split('\n');
            const optSet = new Set((parsedOpts || []).map(o => o.trim()));
            const visibleLines = parsedOpts
              ? lines.filter(l => {
                  const t = l.trim();
                  if (!t) return true;
                  if (/^\s*\d+\.\s+/.test(l)) return false;
                  if (/^\s*[-•·*]\s+/.test(l)) return false;
                  if (optSet.has(t)) return false;
                  return true;
                })
              : lines;
            const stripCitations = (s) => s
              .replace(/<cite[^>]*>([^<]*)<\/cite>/g, '$1')
              .replace(/\[\d+(?:-\d+(?:,\d+(?:-\d+)?)*)?\]/g, '');
            const urlRe = /(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/g;
            return visibleLines.map((line, i) => {
              const cleaned = stripCitations(line);
              const parts = cleaned.split(urlRe);
              return (
                <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }}>
                  {parts.map((p, j) => {
                    if (p.match(/^https?:\/\//)) {
                      return <a key={j} href={p} target="_blank" rel="noopener noreferrer" style={{ color: BRAND.red, textDecoration: 'underline', textUnderlineOffset: 2 }}>{p}</a>;
                    }
                    // Parse markdown **bold** segments
                    const boldRe = /\*\*([^*]+?)\*\*/g;
                    const segs = [];
                    let last = 0; let m;
                    while ((m = boldRe.exec(p)) !== null) {
                      if (m.index > last) segs.push({ text: p.slice(last, m.index), bold: false });
                      segs.push({ text: m[1], bold: true });
                      last = m.index + m[0].length;
                    }
                    if (last < p.length) segs.push({ text: p.slice(last), bold: false });
                    if (segs.length === 0) return <span key={j}>{p}</span>;
                    return <span key={j}>{segs.map((s, k) => s.bold
                      ? <strong key={k} className="serif" style={{ fontSize: '1.05em', color: BRAND.red, fontWeight: 600 }}>{s.text}</strong>
                      : <span key={k}>{s.text}</span>
                    )}</span>;
                  })}
                </div>
              );
            });
          })()}
        </div>
        {isAssistant && isLast && onOptionClick && (() => {
          const opts = parseOptions(content);
          if (!opts) return null;
          return (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {opts.map((opt, i) => (
                <OptionButton key={i} label={opt} onClick={() => onOptionClick(opt)} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


function OptionButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? BRAND.red : 'transparent',
        border: `1px solid ${BRAND.red}`,
        color: hovered ? 'white' : BRAND.red,
        padding: '7px 16px',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        letterSpacing: '0.01em',
        transition: 'all 0.15s',
        lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  );
}


function SaveProgressButton({ responses, messages, currentSection, sectionsDone, researchSource }) {
  const [saved, setSaved] = React.useState(false);
  const sessionId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('s') : null;
  if (!sessionId || Object.keys(responses).length === 0) return null;

  const handleSave = () => {
    try {
      localStorage.setItem(`gershon_session_${sessionId}`, JSON.stringify({
        responses, messages, currentSection, sectionsDone, researchSource, savedAt: new Date().toISOString()
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) {}
  };

  return (
    <button
      onClick={handleSave}
      className="mono"
      style={{ fontSize: 10, color: saved ? BRAND.red : BRAND.muted, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}
    >
      {saved ? '✓ Saved' : 'Save progress'}
    </button>
  );
}

function Avatar() {
  return (
    <div style={{ width: 32, height: 32, background: BRAND.red, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <span className="serif" style={{ color: 'white', fontSize: 15, fontWeight: 600, fontStyle: 'italic' }}>G</span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 32, height: 32, background: BRAND.ink, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <span className="mono" style={{ color: 'white', fontSize: 11, fontWeight: 500 }}>YOU</span>
    </div>
  );
}

// ============================================================================
// Sidebar — progress + captured data
// ============================================================================

function ProgressPanel({ currentSection, sectionsDone }) {
  const completedCount = Object.values(sectionsDone).filter(Boolean).length;
  const totalSections = SECTIONS.length;
  const progressPct = Math.round((completedCount / totalSections) * 100);
  return (
    <aside style={{ position: 'sticky', top: 88, alignSelf: 'start', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
      <div style={{ background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: '18px 20px' }}>
        <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Progress</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 32, fontWeight: 500, color: BRAND.red, lineHeight: 1 }}>{progressPct}%</div>
          <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.1em' }}>{completedCount} of {totalSections}</div>
        </div>
        <div style={{ marginBottom: 16, width: '100%', height: 3, background: BRAND.rule, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPct}%`, background: BRAND.red, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(s => {
            const done = sectionsDone[s.id];
            const isCurrent = currentSection === s.id;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BRAND.rule}`, opacity: done || isCurrent ? 1 : 0.5 }}>
                <div style={{ flexShrink: 0 }}>
                  {done ? <Check size={13} color={BRAND.red} strokeWidth={2.5} /> : isCurrent ? <CircleDot size={13} color={BRAND.red} /> : <Circle size={13} color={BRAND.muted} />}
                </div>
                <div className="mono" style={{ fontSize: 9, color: BRAND.muted, letterSpacing: '0.1em', width: 18 }}>{s.number}</div>
                <div className="serif" style={{ fontSize: 12, color: isCurrent ? BRAND.red : BRAND.ink, fontStyle: isCurrent ? 'italic' : 'normal', fontWeight: isCurrent ? 500 : 400 }}>{s.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function CapturedPanel({ responses }) {
  return (
    <aside style={{ position: 'sticky', top: 88, alignSelf: 'start', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
      <div style={{ background: BRAND.paper, border: `1px solid ${BRAND.rule}`, padding: '18px 20px' }}>
        <div className="mono" style={{ fontSize: 10, color: BRAND.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Captured</div>
        {Object.keys(responses).length === 0 ? (
          <div style={{ fontSize: 12, color: BRAND.muted, fontStyle: 'italic' }}>Your answers will appear here as we go.</div>
        ) : (
          <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(responses).map(([key, value]) => {
              const fieldDef = findFieldDef(key);
              return (
                <div key={key}>
                  <div className="mono" style={{ fontSize: 9, color: BRAND.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{fieldDef?.label || key}</div>
                  <div style={{ fontSize: 12, color: BRAND.ink, marginTop: 3, lineHeight: 1.4 }}>{Array.isArray(value) ? value.join(', ') : String(value)}</div>
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

function ReviewScreen({ responses, setResponses, editingField, setEditingField, editBuffer, setEditBuffer, acknowledgments, setAcknowledgments, termsAccepted, setTermsAccepted, signatureName, setSignatureName, signatureDate, setSignatureDate, canSign, sign, backToChat }) {

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

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: BRAND.red, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          — Final Step · Review &amp; Sign
        </div>
        <h1 className="serif" style={{ fontSize: 44, fontWeight: 400, color: BRAND.ink, margin: '16px 0 0', letterSpacing: '-0.02em' }}>
          Review everything, <span style={{ fontStyle: 'italic', color: BRAND.red }}>then sign.</span>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: BRAND.charcoalLight, marginTop: 16, maxWidth: 640 }}>
          Take a moment to check the captured answers below. Click any field to edit. When you're ready, acknowledge the terms and sign to make this intake binding.
        </p>
        <button onClick={backToChat} className="btn-ghost" style={{ marginTop: 24 }}>← Back to conversation</button>
      </div>

      {/* Captured data sections */}
      {SECTIONS.map(section => {
        const sectionFields = section.fields.filter(f => responses[f.id] !== undefined && responses[f.id] !== '');
        if (sectionFields.length === 0) return null;

        return (
          <div key={section.id} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${BRAND.red}` }}>
              <div className="mono" style={{ fontSize: 11, color: BRAND.red, letterSpacing: '0.2em' }}>{section.number}</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{section.title}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sectionFields.map(f => {
                const value = responses[f.id];
                const isEditing = editingField === f.id;
                return (
                  <div key={f.id} style={{ padding: '16px 0', borderBottom: `1px solid ${BRAND.rule}`, display: 'grid', gridTemplateColumns: '240px 1fr auto', gap: 20, alignItems: 'flex-start' }}>
                    <div className="mono" style={{ fontSize: 11, color: BRAND.muted, letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: 4 }}>
                      {f.label}
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        rows={f.long ? 4 : 1}
                        autoFocus
                        className="sans"
                        style={{ border: `1px solid ${BRAND.red}`, padding: '8px 12px', fontSize: 14, fontFamily: 'Inter', resize: 'vertical', lineHeight: 1.5 }}
                      />
                    ) : (
                      <div className="serif" style={{ fontSize: 15.5, color: BRAND.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </div>
                    )}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveEdit} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                        <button onClick={cancelEdit} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.muted, padding: 4 }}>
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Acknowledgments */}
      <div style={{ marginTop: 64, padding: 32, background: BRAND.paper, border: `1px solid ${BRAND.rule}` }}>
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
      <div style={{ marginTop: 32, padding: 32, background: BRAND.ink, color: 'white' }}>
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
                fontFamily: 'Fraunces, serif',
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
                fontFamily: 'JetBrains Mono, monospace',
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
      </div>
    </div>
  );
}

// ============================================================================
// Signed / Thank you screen
// ============================================================================

function SignedScreen({ responses, signatureName, signatureDate, exportJSON }) {
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

      <div style={{ marginTop: 40, padding: 24, background: BRAND.paper, border: `1px solid ${BRAND.rule}` }}>
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

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={exportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Download size={14} /> Download intake (JSON)
        </button>
        <button className="btn-ghost" onClick={() => window.location.reload()}>
          Start another
        </button>
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
