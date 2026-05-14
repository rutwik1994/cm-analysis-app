import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { question, context } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  const systemPrompt = `You are a procurement analytics assistant for HelloFresh Strategic Procurement.
You have access to spend data from the procurement dashboard. Your job is to help category managers and senior leaders understand spend patterns, supplier risk, and budget performance.

Guidelines:
- Be concise and direct — bullet points preferred over long paragraphs
- Always cite specific numbers from the data when answering
- Flag any suppliers with high utilisation (≥80%) as "at risk"
- When referencing spend, use EUR (€) formatting
- If a question can't be answered from the provided data, say so clearly rather than guessing
- Keep responses focused — 3-5 sentences or bullet points max unless more detail is specifically asked for`;

  const userMessage = `Here is the current spend data context (filtered view from the dashboard):

${context}

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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Chat API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
