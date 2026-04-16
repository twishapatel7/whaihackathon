import { openai, buildSystemPrompt } from "@/lib/openai";
import { getCachedGapsForProperty } from "@/lib/gap-detector";
import { FALLBACK_PROPERTY_ID } from "@/lib/constants";
import type { ConversationTurn } from "@/types";

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

function toConversationTurns(messages: Array<{ role?: string; content?: unknown }>): ConversationTurn[] {
  return (messages || [])
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => ({ role: m.role as "assistant" | "user", content: normalizeContent(m.content) }))
    .filter((m) => m.content.length > 0);
}

function sseChunk(id: string, delta: Record<string, unknown>, finishReason: string | null = null): string {
  const chunk = {
    id,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  const line = `data: ${JSON.stringify(chunk)}\n\n`;
  console.log("[LLM/stream] chunk:", line.trim());
  return line;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log(`[LLM] ========== REQUEST RECEIVED @ ${new Date().toISOString()} ==========`);

  const SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = await req.json();
    console.log("[LLM] Body parsed at", Date.now() - startTime, "ms");
    console.log("[LLM] Request body:", JSON.stringify(body, null, 2));

    const hotelName =
      body?.metadata?.hotelName ||
      body?.call?.assistant?.metadata?.hotelName ||
      process.env.NEXT_PUBLIC_HOTEL_NAME ||
      "Grand Plaza Hotel";

    // ── MOCK MODE ──────────────────────────────────────────────────────────────
    if (process.env.LLM_MOCK_MODE === "true") {
      const rawMessages = body?.messages ?? [];
      const messages = toConversationTurns(rawMessages);
      const hasUser = messages.some((m) => m.role === "user");
      const text =
        messages.length === 0 || !hasUser
          ? `Hi! I'm calling about your stay at ${hotelName}. How did everything go overall?`
          : "Thanks for sharing that — what stood out most about your room or the service?";

      const id = "chatcmpl-mock";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseChunk(id, { role: "assistant" })));
          controller.enqueue(new TextEncoder().encode(sseChunk(id, { content: text })));
          controller.enqueue(new TextEncoder().encode(sseChunk(id, {}, "stop")));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: SSE_HEADERS });
    }

    // ── GAPS + MESSAGES ────────────────────────────────────────────────────────
    const propertyId = process.env.PROPERTY_ID || FALLBACK_PROPERTY_ID;
    const gaps = await getCachedGapsForProperty(propertyId);
    console.log("[LLM] Gaps loaded at", Date.now() - startTime, "ms");

    const gapInstruction =
      gaps.length > 0
        ? `Naturally explore these experience areas when relevant (not as a rigid checklist): ${gaps
            .slice(0, 6)
            .map((g) => `${g.icon} ${g.topic}`)
            .join("; ")}.`
        : "";

    const rawMessages = body?.messages ?? [];
    console.log(`[LLM] Received ${rawMessages.length} messages`);

    const messages = toConversationTurns(rawMessages);
    console.log(`[LLM] After filtering: ${messages.length} valid messages`);

    const hasUser = messages.some((m) => m.role === "user");

    // ── NO USER TURN YET → opening line ───────────────────────────────────────
    if (messages.length === 0 || !hasUser) {
      console.log("[LLM] No user content yet — streaming opening line");
      const fallbackText = `Hi! I'm calling about your stay at ${hotelName}. How did everything go overall?`;
      const id = "chatcmpl-fallback";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseChunk(id, { role: "assistant" })));
          controller.enqueue(new TextEncoder().encode(sseChunk(id, { content: fallbackText })));
          controller.enqueue(new TextEncoder().encode(sseChunk(id, {}, "stop")));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: SSE_HEADERS });
    }

    // ── REAL OPENAI STREAMING CALL ─────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(hotelName, gapInstruction);
    console.log("[LLM] Calling OpenAI (streaming) at", Date.now() - startTime, "ms");

    const openaiStream = await openai.chat.completions.create({
      model: body?.model || "gpt-4o-mini",
      max_tokens: body?.max_tokens || 200,
      temperature: body?.temperature !== undefined ? body.temperature : 0.4,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((turn) => ({ role: turn.role, content: turn.content })),
      ],
    });

    console.log("[LLM] OpenAI stream started at", Date.now() - startTime, "ms");

    // Pipe OpenAI chunks → SSE response
    const encoder = new TextEncoder();
    let fullText = "";
    let chatId = "chatcmpl-stream";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send role delta first so Vapi knows the stream is alive immediately
          controller.enqueue(encoder.encode(sseChunk(chatId, { role: "assistant" })));

          for await (const chunk of openaiStream) {
            chatId = chunk.id || chatId;
            const delta = chunk.choices?.[0]?.delta;
            const finishReason = chunk.choices?.[0]?.finish_reason ?? null;

            if (delta?.content) {
              fullText += delta.content;
              controller.enqueue(encoder.encode(sseChunk(chatId, { content: delta.content }, finishReason)));
            } else if (finishReason === "stop") {
              controller.enqueue(encoder.encode(sseChunk(chatId, {}, "stop")));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          const elapsed = Date.now() - startTime;
          console.log(`[LLM] Stream complete at ${elapsed} ms — full response: "${fullText}"`);
        } catch (err) {
          console.error("[LLM] Stream error:", err);
          // Send a fallback chunk so Vapi doesn't hang
          const errText = "Sorry, I had a moment there. Could you say that again?";
          controller.enqueue(encoder.encode(sseChunk(chatId, { content: errText }, "stop")));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { status: 200, headers: SSE_HEADERS });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[LLM] ERROR at ${elapsed} ms:`, error);

    // Streaming fallback even on outer errors
    const encoder = new TextEncoder();
    const errText = "Sorry, I had a moment there. Could you say that again?";
    const id = "chatcmpl-error";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseChunk(id, { role: "assistant" })));
        controller.enqueue(encoder.encode(sseChunk(id, { content: errText }, "stop")));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: SSE_HEADERS });
  }
}
