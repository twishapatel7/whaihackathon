import { NextResponse } from "next/server";
import { z } from "zod";
import { vapi } from "@/lib/vapi";
import { getAssistantVoice } from "@/lib/vapi-voice";

const bodySchema = z.object({
  phoneNumber: z.string().min(7),
  hotelName: z.string().min(2)
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const mockMode = process.env.VOICE_MOCK_MODE === "true";
    
    console.log(`[OUTBOUND] Creating call with gap-aware assistant`);

    if (mockMode) {
      return NextResponse.json({
        callId: `mock_call_${crypto.randomUUID()}`,
        mocked: true
      }, {
        headers: corsHeaders,
      });
    }

    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json(
        {
          error: "Missing Vapi configuration. Set VAPI_API_KEY and VAPI_PHONE_NUMBER_ID or enable VOICE_MOCK_MODE=true."
        },
        { 
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Public HTTPS URL where Vapi can reach YOUR backend (ngrok, etc.). Required for custom LLM.
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
    if (!baseUrl || !baseUrl.startsWith("https://")) {
      return NextResponse.json(
        {
          error:
            "Set NEXT_PUBLIC_BASE_URL to your public https URL (e.g. ngrok) so Vapi can call /api/vapi/llm"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[OUTBOUND] Creating call with custom LLM at ${baseUrl}/api/vapi/llm`);

    // Custom LLM: every turn hits YOUR server → uses OPENAI_API_KEY in .env (not Vapi dashboard OpenAI).
    const response = await vapi.calls.create({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: body.phoneNumber
      },
      assistant: {
        firstMessage: `Hi! I'm calling on behalf of ${body.hotelName} to hear about your recent stay. Do you have a couple of minutes to chat?`,
        metadata: {
          hotelName: body.hotelName
        },
        model: {
          provider: "custom-llm",
          url: `${baseUrl}/api/vapi/llm`,
          model: "gpt-4o-mini"
        },
        voice: getAssistantVoice()
      }
    });

    const callId = "results" in response ? response.results?.[0]?.id : response.id;
    console.log(`[OUTBOUND] Call created: ${callId}`);
    console.log(`[OUTBOUND] Full response:`, JSON.stringify(response, null, 2));
    return NextResponse.json({ callId: callId || null }, {
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error("[OUTBOUND] ERROR creating call:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      body: error?.body,
    });

    // Vapi validation errors (e.g. bad phone format) come back as 400 — surface them directly
    const vapiMessages: string[] = error?.body?.message;
    if (Array.isArray(vapiMessages) && vapiMessages.length > 0) {
      return NextResponse.json({
        error: vapiMessages[0]
      }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      error: error?.message || "Failed to start call"
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
