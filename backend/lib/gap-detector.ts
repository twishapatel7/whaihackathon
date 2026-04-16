import { openai } from "@/lib/openai";

export interface Gap {
  id: string;
  topic: string;
  icon: string;
  urgency: "High" | "Moderate";
  question: string;
  answerOptions: Array<{ value: string; label: string }>;
  score: number;
}

const GAP_FALLBACKS: Record<string, Gap> = {
  pet_policy: {
    id: "pet_policy",
    topic: "Pet Policy",
    icon: "🐾",
    urgency: "High",
    question: "Does this property allow pets?",
    answerOptions: [
      { value: "yes_all", label: "Yes, all pets welcome" },
      { value: "yes_small", label: "Yes, small pets only" },
      { value: "no", label: "No pets allowed" },
      { value: "unknown", label: "I'm not sure" }
    ],
    score: 0.8
  },
  accessibility: {
    id: "accessibility",
    topic: "Accessibility",
    icon: "♿",
    urgency: "High",
    question: "How accessible is this property for guests with mobility needs?",
    answerOptions: [
      { value: "fully", label: "Fully accessible" },
      { value: "partial", label: "Partially accessible" },
      { value: "not", label: "Not accessible" },
      { value: "unknown", label: "I didn't notice" }
    ],
    score: 0.75
  },
  parking: {
    id: "parking",
    topic: "Parking",
    icon: "🚗",
    urgency: "High",
    question: "Was parking available and convenient at this property?",
    answerOptions: [
      { value: "yes_free", label: "Yes, free parking" },
      { value: "yes_paid", label: "Yes, but it had a fee" },
      { value: "difficult", label: "Difficult to find/access" },
      { value: "no", label: "Not available" }
    ],
    score: 0.7
  },
  wifi_quality: {
    id: "wifi_quality",
    topic: "WiFi Quality",
    icon: "📶",
    urgency: "Moderate",
    question: "How was the WiFi quality during your stay?",
    answerOptions: [
      { value: "excellent", label: "Excellent and reliable" },
      { value: "good", label: "Good, occasional drops" },
      { value: "poor", label: "Frequently disconnected" },
      { value: "unavailable", label: "Wasn't available" }
    ],
    score: 0.65
  }
};

let gapCache: { propertyId: string; gaps: Gap[]; time: number } | null = null;
const GAP_CACHE_TTL_MS = 3600000;

/**
 * Same as fetchGapsForProperty but caches per property for 1h (webhook + custom LLM share this).
 */
export async function getCachedGapsForProperty(propertyId: string): Promise<Gap[]> {
  const now = Date.now();
  if (
    gapCache &&
    gapCache.propertyId === propertyId &&
    now - gapCache.time < GAP_CACHE_TTL_MS
  ) {
    console.log("[Gap Detector] Using cached gaps");
    return gapCache.gaps;
  }

  console.log("[Gap Detector] Fetching fresh gaps for assistant");
  const gaps = await fetchGapsForProperty(propertyId);
  gapCache = { propertyId, gaps, time: now };
  return gaps;
}

/**
 * Fetch gaps from the Python gap detection service
 * Falls back to hardcoded gaps if service is unavailable
 */
export async function fetchGapsForProperty(propertyId: string): Promise<Gap[]> {
  const gapServiceUrl = process.env.GAP_DETECTION_SERVICE_URL || "http://localhost:8000";

  try {
    console.log(`[Gap Detector] Fetching gaps from ${gapServiceUrl}/gaps/${propertyId}`);
    
    const response = await fetch(`${gapServiceUrl}/gaps/${propertyId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.warn(`[Gap Detector] Service returned ${response.status}, using fallbacks`);
      return Object.values(GAP_FALLBACKS);
    }

    const gaps: Gap[] = await response.json();
    console.log(`[Gap Detector] Fetched ${gaps.length} gaps from service`);
    return gaps;
  } catch (error) {
    console.warn(`[Gap Detector] Service error: ${error}. Using fallbacks.`);
    return Object.values(GAP_FALLBACKS);
  }
}

/**
 * Generate a natural question for a gap topic using OpenAI
 * Falls back to a simple template if OpenAI is unavailable
 */
export async function generateGapQuestion(
  gapTopic: string,
  gapId: string,
  fallbackQuestion: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: "You are a friendly guest experience assistant generating natural follow-up questions."
        },
        {
          role: "user",
          content: `Based on the guest's mention of "${gapTopic}", generate ONE natural follow-up question 
to learn more details. Keep it short (1-2 sentences) and conversational for a phone call.

Just return the question text, nothing else.`
        }
      ]
    });

    const question = completion.choices[0]?.message?.content?.trim();
    return question || fallbackQuestion;
  } catch (error) {
    console.warn(`[Gap Detector] OpenAI error: ${error}. Using fallback question.`);
    return fallbackQuestion;
  }
}

/**
 * Build a system prompt that includes uncovered gap topics
 * Guides the bot to naturally ask about missing information
 */
export function buildGapAwareSystemPrompt(
  basePrompt: string,
  gaps: Gap[],
  coveredTopics: string[] = []
): string {
  const uncoveredGaps = gaps.filter(g => !coveredTopics.includes(g.id));

  if (uncoveredGaps.length === 0) {
    return basePrompt;
  }

  const gapTopics = uncoveredGaps
    .slice(0, 3)  // Focus on top 3 gaps
    .map(g => `${g.icon} ${g.topic}: "${g.question}"`)
    .join("\n");

  const gapGuide = `

IMPORTANT — Naturally weave these topics into the conversation (don't ask all at once):
${gapTopics}

Guide: If the guest mentions any of these topics, ask a clarifying follow-up. 
If not mentioned, gently bring up 1-2 of them naturally before wrapping up: 
"Before I let you go, I was curious about..." 

Make it feel like a genuine conversation, not a checklist.`;

  return basePrompt + gapGuide;
}
