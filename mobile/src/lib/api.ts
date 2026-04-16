export interface CallRecord {
  id: string;
  hotel_name: string;
  phone_number: string | null;
  created_at: string;
  structured_review: {
    overall_rating: number;
    sentiment: "positive" | "neutral" | "negative";
    would_recommend: boolean | null;
    transcript: Array<{ role: "user" | "assistant"; content: string }>;
    topics: Record<string, { mentioned: boolean; sentiment: string | null; summary: string | null }>;
  };
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";

export async function fetchCalls(): Promise<CallRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/calls`, {
    method: "GET"
  });

  if (!res.ok) return [];
  const body = await res.json();
  return body.calls || [];
}
