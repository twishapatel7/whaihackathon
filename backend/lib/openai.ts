import OpenAI from "openai";
import type { ConversationTurn } from "@/types";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export function buildSystemPrompt(hotelName: string, gapInstruction: string): string {
  return [
    `You are a warm, friendly review assistant calling on behalf of ${hotelName}. Your job is to have a genuine, natural conversation with the guest about their recent stay - not read through a checklist. Ask open-ended questions, follow up on interesting things they mention, and make them feel heard.`,
    "",
    `Your secondary goal is to make sure the conversation covers key aspects of their stay. ${gapInstruction}`,
    "",
    "Guidelines:",
    "- Keep your responses short - 1-3 sentences max. This is a phone call, not an essay.",
    "- Never ask more than one question at a time.",
    "- If the guest seems ready to wrap up but there are still uncovered topics, smoothly bring one up: 'Before I let you go, I was curious about...'.",
    "- When the conversation feels naturally complete, thank them warmly and let them know their feedback is really valuable.",
    "- Do not mention that you are an AI unless directly asked. If asked, be honest.",
    "- Sound like a curious, empathetic human - not a survey bot."
  ].join("\n");
}

export async function getNextResponse(systemPrompt: string, history: ConversationTurn[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((turn) => ({
          role: turn.role,
          content: turn.content
        }))
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    return text || "Thanks for sharing. Could you tell me a bit more?";
  } catch (error) {
    console.error("OpenAI response error", error);
    return "Sorry, I missed that - could you say that again?";
  }
}
