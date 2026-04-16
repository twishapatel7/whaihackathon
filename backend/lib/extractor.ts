import { openai } from "@/lib/openai";
import { REQUIRED_TOPICS } from "@/lib/gap-tracker";
import type { ConversationTurn, StructuredReview, TopicKey } from "@/types";

function emptyTopics(): StructuredReview["topics"] {
  return REQUIRED_TOPICS.reduce((acc, key) => {
    acc[key] = { mentioned: false, sentiment: null, summary: null };
    return acc;
  }, {} as Record<TopicKey, { mentioned: boolean; sentiment: "positive" | "neutral" | "negative" | null; summary: string | null }>);
}

export async function extractStructuredReview(
  callId: string,
  hotelName: string,
  transcript: ConversationTurn[]
): Promise<StructuredReview> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
      temperature: 0.1,
      messages: [
        { role: "system", content: "Return only valid JSON. No markdown." },
        {
          role: "user",
          content: `Given this call transcript, return a JSON object with keys: hotel_name, overall_rating (1-5), sentiment (positive|neutral|negative), topics (object with keys ${REQUIRED_TOPICS.join(", ")}; each has mentioned:boolean, sentiment:positive|neutral|negative|null, summary:string|null), key_quotes (max 3 user quotes), would_recommend (boolean|null). Transcript: ${JSON.stringify(transcript)}`
        }
      ]
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "";

    const parsed = JSON.parse(raw) as Omit<StructuredReview, "call_id" | "created_at" | "transcript">;

    return {
      call_id: callId,
      hotel_name: parsed.hotel_name || hotelName,
      overall_rating: Math.min(5, Math.max(1, Number(parsed.overall_rating) || 3)),
      sentiment: parsed.sentiment || "neutral",
      topics: parsed.topics || emptyTopics(),
      key_quotes: Array.isArray(parsed.key_quotes) ? parsed.key_quotes.slice(0, 3) : [],
      would_recommend: typeof parsed.would_recommend === "boolean" ? parsed.would_recommend : null,
      transcript,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error("extractStructuredReview failed", error);

    return {
      call_id: callId,
      hotel_name: hotelName,
      overall_rating: 3,
      sentiment: "neutral",
      topics: emptyTopics(),
      key_quotes: [],
      would_recommend: null,
      transcript,
      created_at: new Date().toISOString()
    };
  }
}
