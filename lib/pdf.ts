import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface FormResponses {
  [key: string]: string | string[] | undefined;
}

const SECTIONS = [
  { title: '01 — About You', fields: [
    { id: 'companyName', label: 'Company Name' },
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'title', label: 'Title' },
    { id: 'email', label: 'Email' },
    { id: 'mobilePhone', label: 'Mobile Phone' },
  ]},
  { title: '02 — Your Business', fields: [
    { id: 'businessType', label: 'Business Type' },
    { id: 'industry', label: 'Industry' },
    { id: 'website', label: 'Website' },
    { id: 'expectations', label: 'Expectations' },
    { id: 'productLinks', label: 'Product/Service Links' },
  ]},
  { title: '03 — Campaign Scope', fields: [
    { id: 'campaignDuration', label: 'Campaign Duration' },
    { id: 'campaignServices', label: 'Services Selected' },
    { id: 'meetingsPerMonth', label: 'Monthly Meetings Goal' },
  ]},
  { title: '04 — Target Market', fields: [
    { id: 'targetDefinition', label: 'Ideal Target Customer' },
    { id: 'targetGeography', label: 'Geographic Focus' },
    { id: 'targetIndustries', label: 'Target Industries' },
    { id: 'targetTitles', label: 'Target Job Titles' },
    { id: 'targetHeadcount', label: 'Target Company Headcount' },
    { id: 'targetRevenue', label: 'Target Revenue Range' },
  ]},
  { title: '05 — Social Networks (PROMOTE)', fields: [
    { id: 'top5Highlights', label: 'Top 5 Highlights' },
    { id: 'dontWantContent', label: 'Content NOT Wanted' },
    { id: 'googleKeywords', label: 'Google Keywords' },
  ]},
  { title: '06 — LinkedIn Profile (NETWORK)', fields: [
    { id: 'companyLinkedIn', label: 'Company LinkedIn' },
    { id: 'personalLinkedIn', label: 'Personal LinkedIn' },
    { id: 'calendlyLink', label: 'Calendly Link' },
    { id: 'competitors', label: 'Top Competitors' },
  ]},
  { title: '07 — Comments', fields: [
    { id: 'additionalComments', label: 'Additional Comments' },
  ]},
  { title: '08 — Timing & Quote', fields: [
    { id: 'startDate', label: 'Campaign Start Date' },
    { id: 'quoteReference', label: 'Quote Reference' },
  ]},
];

function getValue(responses: FormResponses, id: string): string {
  const val = responses[id];
  if (!val) return '—';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

export async function generateOnboardingPDF(responses: FormResponses): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  const colors = {
    navy: rgb(0.05, 0.1, 0.3),
    gold: rgb(0.8, 0.6, 0.1),
    gray: rgb(0.5, 0.5, 0.5),
    lightGray: rgb(0.95, 0.95, 0.95),
    black: rgb(0, 0, 0),
    white: rgb(1, 1, 1),
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const checkNewPage = (neededHeight: number) => {
    if (y - neededHeight < margin + 30) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts: { font?: typeof boldFont; size?: number; color?: ReturnType<typeof rgb>; maxWidth?: number }
  ) => {
    const font = opts.font ?? regularFont;
    const size = opts.size ?? 10;
    const color = opts.color ?? colors.black;
    const maxWidth = opts.maxWidth ?? contentWidth;

    // Simple word wrap
    const words = text.split(' ');
    let line = '';
    let currentY = yPos;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= size + 3;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= size + 3;
    }
    return yPos - currentY; // return height used
  };

  // ─── Cover / Header ───────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: pageHeight - 100, width: pageWidth, height: 100, color: colors.navy });
  page.drawText('GERSHON CONSULTING', { x: margin, y: pageHeight - 45, size: 18, font: boldFont, color: colors.white });
  page.drawText('Onboarding Summary', { x: margin, y: pageHeight - 68, size: 12, font: regularFont, color: colors.gold });

  const clientName = `${getValue(responses, 'firstName')} ${getValue(responses, 'lastName')}`;
  const company = getValue(responses, 'companyName');
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  page.drawText(`Client: ${clientName} — ${company}`, { x: margin, y: pageHeight - 88, size: 9, font: regularFont, color: rgb(0.8, 0.8, 0.8) });

  y = pageHeight - 120;

  page.drawText(`Submitted: ${date}`, { x: margin, y, size: 9, font: regularFont, color: colors.gray });
  y -= 25;

  // ─── Sections ─────────────────────────────────────────────────────
  for (const section of SECTIONS) {
    // Check if any field in section has data
    const hasData = section.fields.some(f => responses[f.id] && responses[f.id] !== '');
    if (!hasData) continue;

    checkNewPage(40);

    // Section header
    page.drawRectangle({ x: margin, y: y - 18, width: contentWidth, height: 22, color: colors.navy });
    page.drawText(section.title, { x: margin + 8, y: y - 12, size: 10, font: boldFont, color: colors.white });
    y -= 30;

    for (const field of section.fields) {
      const value = getValue(responses, field.id);
      if (value === '—' && !['companyName', 'firstName', 'email'].includes(field.id)) continue;

      checkNewPage(30);

      // Label
      page.drawText(field.label, { x: margin, y, size: 8, font: boldFont, color: colors.navy });
      y -= 13;

      // Value (with word wrap)
      const heightUsed = drawText(value, margin + 8, y, { size: 9, color: colors.black, maxWidth: contentWidth - 8 });
      y -= Math.max(heightUsed, 12) + 5;

      // Divider
      page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.3, color: colors.lightGray });
      y -= 8;
    }

    y -= 10;
  }

  // ─── Footer on all pages ──────────────────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`Page ${i + 1} of ${pages.length}  |  Confidential — Gershon Consulting`, {
      x: margin,
      y: 20,
      size: 7,
      font: regularFont,
      color: colors.gray,
    });
  });

  return pdfDoc.save();
}
