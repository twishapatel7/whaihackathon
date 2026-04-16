export type TopicKey =
  | "room_cleanliness"
  | "staff_friendliness"
  | "checkin_experience"
  | "wifi_quality"
  | "breakfast_or_dining"
  | "value_for_money"
  | "noise_levels";

export interface TopicGapState {
  covered: TopicKey[];
  remaining: TopicKey[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StructuredReview {
  call_id: string;
  hotel_name: string;
  overall_rating: number;
  sentiment: "positive" | "neutral" | "negative";
  topics: Record<
    TopicKey,
    {
      mentioned: boolean;
      sentiment: "positive" | "neutral" | "negative" | null;
      summary: string | null;
    }
  >;
  key_quotes: string[];
  would_recommend: boolean | null;
  transcript: ConversationTurn[];
  created_at: string;
}

export interface VapiLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
