import { NextRequest, NextResponse } from "next/server";
import {
  callAnthropic,
  extractJsonObject,
  extractText,
} from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/prompts";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { history, captured, sectionsDone, researchSource } = payload || {};

  if (!Array.isArray(history)) {
    return NextResponse.json(
      { error: "history must be an array" },
      { status: 400 },
    );
  }

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
        max_tokens: 1500,
        system: buildSystemPrompt(
          captured || {},
          sectionsDone || [],
          researchSource || "",
        ),
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages:
          history.length === 0
            ? [{ role: "user", content: "Please begin the onboarding." }]
            : history,
      },
      apiKey,
    );

    const text = extractText(response);
    const parsed = extractJsonObject<{
      message: string;
      options?: string[];
      capture?: Record<string, string>;
      currentSection?: string;
      sectionComplete?: boolean;
      readyForReview?: boolean;
    }>(text) ?? {
      message: text,
      options: [],
      capture: {},
      sectionComplete: false,
      readyForReview: false,
    };

    // Defensive cleanup: if the model accidentally put step instructions into the
    // options array for confirmation-only fields (Q28 LinkedIn admin, Q34 Sales Nav,
    // Q35 Linalysis, Facebook/Google admin variants), strip them down to just the
    // Confirmed / Not-done-yet buttons. We detect this by:
    //   (a) any option > 60 chars (step text is long, real options are short)
    //   (b) any option that starts with "Click ", "Go to ", "Search for ", "Select ",
    //       "Complete ", "Set " — common imperative step verbs.
    if (Array.isArray(parsed.options) && parsed.options.length > 0) {
      const looksLikeStep = (s: string) =>
        s.length > 60 ||
        /^(Click|Go to|Search for|Select|Complete|Set |Open |Visit |Navigate)\b/i.test(s);
      const stepCount = parsed.options.filter(looksLikeStep).length;
      if (stepCount >= 2) {
        // Most options look like steps — collapse to a Confirmed button.
        parsed.options = ["Confirmed", "Not done yet"];
      }
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("Chat error:", e?.message || e);
    return NextResponse.json(
      {
        message: "Sorry, we hit a connection issue. Please try again.",
        capture: {},
        sectionComplete: false,
        readyForReview: false,
      },
      { status: 200 },
    );
  }
}
