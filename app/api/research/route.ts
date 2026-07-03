import { NextRequest, NextResponse } from "next/server";
import {
  callAnthropic,
  extractJsonObject,
  extractText,
} from "@/lib/anthropic";

// REQUIRED on Cloudflare Pages — without this the build fails with a runtime mismatch.
export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const url = body?.url;
  const linkedInUrl = body?.linkedInUrl; // optional

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // ONE research pass that hits BOTH the company website and the person's
  // LinkedIn profile (when supplied), and returns a JSON capture across every
  // field in the Gershon onboarding schema. We instruct the model to extract
  // ONLY what it's confident about — empty strings are fine, fabrication is not.
  const prompt = `A new client is starting the Gershon Consulting onboarding for a US lead-generation campaign.

Their company website: ${url}
${linkedInUrl ? `The contact's personal LinkedIn profile: ${linkedInUrl}` : "No personal LinkedIn URL was provided."}

Use web_search aggressively. Do AT LEAST these searches:
1. The company homepage + About / Products / Customers pages
2. The company LinkedIn page (search "site:linkedin.com/company [company name]")
3. ${linkedInUrl ? `The contact's personal LinkedIn profile at ${linkedInUrl} — pull their name, current title, current company, headline, recent posts, geographic location` : `If you can identify the company's founder/CEO from the website, search their personal LinkedIn`}
4. Recent news mentions (last 6 months)
5. Top 3–5 competitors and their websites

Then return a SINGLE JSON object filling in as MANY of the fields below as you can with HIGH CONFIDENCE. For fields you cannot confidently fill, return an empty string "" — DO NOT fabricate. Strip any <cite ...> tags or [1] / [2-14] markers from your values.

For multi-value fields (targetIndustries, targetTitles, top5Highlights, productLinks, googleKeywords, competitorTwitterAccounts, competitors), return comma-separated or newline-separated strings — the UI will display them as-is and the user will edit if needed.

Schema (return EXACTLY this shape — empty string for unknown):

{
  "summary": "2-3 sentence internal description of what this company does",
  "capture": {
    "companyName": "",
    "firstName": "",
    "lastName": "",
    "title": "",
    "email": "",
    "mobilePhone": "",
    "businessType": "",
    "industry": "",
    "expectations": "",
    "productLinks": "",
    "website": "${url}",
    "campaignDuration": "6 months",
    "campaignServices": "All three: ENGAGE + PROMOTE + NETWORK",
    "meetingsPerMonth": "10 qualified meetings/month",
    "targetDefinition": "",
    "targetGeography": "United States",
    "targetIndustries": "",
    "targetTitles": "",
    "targetHeadcount": "",
    "targetRevenue": "",
    "top5Highlights": "",
    "otherContent": "",
    "dontWantContent": "",
    "twitterHashtags": "",
    "competitorTwitterAccounts": "",
    "googleKeywords": "",
    "photosLink": "",
    "royaltyFreeConsent": "",
    "linkedInPageAdmin": "",
    "facebookPageAdmin": "",
    "googleBusinessAdmin": "",
    "twitterCredentials": "",
    "companyLinkedIn": "",
    "personalLinkedIn": "${linkedInUrl || ""}",
    "salesNavActive": "",
    "linalysisActive": "",
    "calendlyLink": "",
    "ssiScores": "",
    "competitors": "",
    "additionalComments": "",
    "startDate": "",
    "quoteReference": ""
  }
}

Notes:
- campaignDuration / campaignServices / meetingsPerMonth — pre-fill the standard Gershon defaults as shown above.
- targetGeography defaults to "United States" since Gershon serves non-US clients entering the US market.
- companyName + website should be filled from the homepage.
- If the LinkedIn URL is provided, fill firstName/lastName/title from that profile.
- companyLinkedIn = the company's LinkedIn page URL.
- personalLinkedIn = the contact's profile URL (already provided).
- top5Highlights = the 5 most compelling differentiators the company should highlight on social, drawn from their site/positioning copy.
- competitors = newline-separated list, format: "Name (url) — one line why they're a competitor"
- targetTitles, targetIndustries, googleKeywords = comma-separated lists.
- Leave the admin / activation / consent / acknowledgment-style fields empty — user has to do those actions themselves.

Return ONLY the JSON object. No markdown, no preamble.`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    const response = await callAnthropic(
      {
        max_tokens: 6000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      },
      apiKey,
    );

    const text = extractText(response);
    const parsed =
      extractJsonObject<{ summary: string; capture: Record<string, string> }>(
        text,
      ) ?? { summary: "", capture: {} };

    // Defensive: strip any <cite> tags / [N-M] markers that leaked into values.
    const cleanCapture: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.capture || {})) {
      if (typeof v === "string") {
        cleanCapture[k] = v
          .replace(/<\/?cite[^>]*>/gi, "")
          .replace(/\[\d+(?:-\d+)?\]/g, "")
          .trim();
      } else if (Array.isArray(v)) {
        cleanCapture[k] = v.join(", ");
      } else if (v != null) {
        cleanCapture[k] = String(v);
      } else {
        cleanCapture[k] = "";
      }
    }

    return NextResponse.json({
      summary: parsed.summary || "",
      capture: cleanCapture,
    });
  } catch (e: any) {
    console.error("Research error:", e?.message || e);
    // Fail soft so the UI can let the client fill manually.
    return NextResponse.json({ summary: "", capture: {} });
  }
}
