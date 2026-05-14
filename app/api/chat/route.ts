import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { question, context } = await req.json();

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "No question provided" }), { status: 400 });
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

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
