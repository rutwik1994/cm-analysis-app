import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Lives per-serverless-instance. Good enough to stop one tester from
// hammering the API in a tight loop; won't catch coordinated abuse across
// regions but that is not the threat model for an internal demo.
const RATE_WINDOW_MS = 60_000;     // 60 seconds
const RATE_MAX_REQ   = 20;          // 20 requests per IP per minute
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  // light periodic cleanup
  if (hits.size > 200) {
    for (const [k, v] of hits) if (v.length === 0 || now - v[v.length - 1] > RATE_WINDOW_MS) hits.delete(k);
  }
  return arr.length > RATE_MAX_REQ;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "You're sending questions a bit too fast — please wait a moment and try again." },
      { status: 429 },
    );
  }

  let payload: { question?: string; context?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { question, context } = payload;

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  if (question.length > 2000) {
    return NextResponse.json({ error: "Question is too long — please keep it under 2000 characters." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI service is not configured. Contact the app owner." }, { status: 500 });
  }

  const systemPrompt = `You are a procurement analytics assistant for HelloFresh Strategic Procurement.
You have access to spend data from the procurement dashboard including supplier names, categories, markets, spend figures, budget utilisation, and category manager ownership.

Guidelines:
- Be concise and direct — bullet points preferred over long paragraphs
- Always cite specific numbers from the data when answering
- Flag any suppliers with high utilisation (>=80%) as "at risk"
- When referencing spend, use EUR (€) formatting
- If a question can't be answered from the provided data, say so clearly rather than guessing
- Keep responses focused — 3-5 sentences or bullet points max unless more detail is specifically asked for
- The context includes a "Category Manager" column — always use it to answer ownership questions. Never tell the user to cross-reference manually if the data is already present
- When listing suppliers with issues, always include the category manager responsible so the user knows who to follow up with`;

  const userMessage = `Here is the current spend data context (filtered view from the dashboard):

${context || "(no context provided)"}

Question: ${question}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ answer: text });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("Chat API error:", raw);

    // Map common errors to user-friendly messages — never leak raw API errors to the UI.
    let friendly = "Something went wrong while contacting the AI. Please try again in a moment.";
    if (/rate.?limit|429/i.test(raw))                friendly = "The AI service is busy right now. Please wait a few seconds and try again.";
    else if (/timeout|aborted|ECONNRESET/i.test(raw)) friendly = "The AI took too long to respond. Please try a shorter question or try again.";
    else if (/auth|401|403/i.test(raw))               friendly = "AI service authentication failed. Please contact the app owner.";

    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
