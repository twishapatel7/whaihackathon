import { openai } from "@/lib/openai";
import type { ConversationTurn, TopicKey } from "@/types";

export const REQUIRED_TOPICS: TopicKey[] = [
  "room_cleanliness",
  "staff_friendliness",
  "checkin_experience",
  "wifi_quality",
  "breakfast_or_dining",
  "value_for_money",
  "noise_levels"
];

const TOPIC_LABELS: Record<TopicKey, string> = {
  room_cleanliness: "room cleanliness",
  staff_friendliness: "staff friendliness",
  checkin_experience: "check-in experience",
  wifi_quality: "Wi-Fi quality",
  breakfast_or_dining: "breakfast or dining",
  value_for_money: "value for money",
  noise_levels: "noise levels"
};

export async function checkCoveredTopics(
  transcript: ConversationTurn[],
  allTopics: TopicKey[]
): Promise<TopicKey[]> {
  if (!transcript.length) return [];

  const userOnly = transcript
    .filter((t) => t.role === "user")
    .map((t) => t.content)
    .join("\n");

  if (!userOnly.trim()) return [];

  try {
    const prompt = [
      "Return ONLY a JSON array of topic keys that are meaningfully covered by the USER.",
      "Use only keys from this list:",
      JSON.stringify(allTopics),
      "Do not include keys only mentioned by assistant.",
      "Transcript:",
      userOnly
    ].join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      temperature: 0,
      messages: [
        { role: "system", content: "You are a strict JSON classifier." },
        { role: "user", content: prompt }
      ]
    });

    const raw = res.choices?.[0]?.message?.content?.trim() || "";

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((k): k is TopicKey => allTopics.includes(k as TopicKey));
  } catch (error) {
    console.error("checkCoveredTopics failed", error);
    return [];
  }
}

export function getRemainingTopics(covered: TopicKey[], all: TopicKey[]): TopicKey[] {
  const set = new Set(covered);
  return all.filter((topic) => !set.has(topic));
}

export function formatGapInstruction(remaining: TopicKey[]): string {
  if (!remaining.length) return "";

  const labels = remaining.map((topic) => TOPIC_LABELS[topic]).join(", ");
  return `Topics not yet discussed that you should naturally bring up before ending: ${labels}. Don't ask about all of them at once - weave them in one at a time as the conversation flows naturally.`;
}
