import { NextResponse } from "next/server";
import { extractStructuredReview } from "@/lib/extractor";
import { saveCall } from "@/lib/supabase";
import type { ConversationTurn } from "@/types";
import { getAssistantVoice } from "@/lib/vapi-voice";

function normalizeTranscript(messages: Array<{ role?: string; content?: string }>): ConversationTurn[] {
  return (messages || [])
    .filter((m) => (m.role === "assistant" || m.role === "user") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "assistant" | "user", content: m.content as string }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = body?.message?.type || body?.type;
    console.log(`[Vapi Webhook] Event type: ${event}`);
    console.log(`[Vapi Webhook] Request received at ${new Date().toISOString()}`);

    if (event === "assistant-request") {
      const requestUrl = new URL(req.url);
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`).replace(
        /\/$/,
        ""
      );
      const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME || "Grand Plaza Hotel";

      // Conversation behavior and gap topics are applied in /api/vapi/llm (custom-llm).

      return NextResponse.json({
        assistant: {
          firstMessage: `Hi! Thanks for taking the time to speak with me. I'd love to hear about your recent stay. What was your favorite part?`,
          metadata: {
            hotelName
          },
          model: {
            provider: "custom-llm",
            url: `${baseUrl}/api/vapi/llm`,
            model: "gpt-4o-mini"
          },
          voice: getAssistantVoice()
        }
      });
    }

    if (event === "end-of-call-report") {
      const callId = body?.call?.id || body?.call?.callId || crypto.randomUUID();
      const transcript = normalizeTranscript(body?.transcript || body?.messages || []);
      const hotelName =
        body?.metadata?.hotelName ||
        body?.call?.assistant?.metadata?.hotelName ||
        process.env.NEXT_PUBLIC_HOTEL_NAME ||
        "Grand Plaza Hotel";
      const phoneNumber = body?.customer?.number || body?.phoneNumber;

      console.log(`[Webhook] End of call: ${callId}, transcript length: ${transcript.length}`);

      try {
        const structured = await extractStructuredReview(String(callId), hotelName, transcript);
        await saveCall(String(callId), hotelName, transcript, structured, phoneNumber);
      } catch (persistErr) {
        console.error("[Webhook] save/extract failed (still ack Vapi):", persistErr);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("Webhook handling failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
