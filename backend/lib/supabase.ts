import { createClient } from "@supabase/supabase-js";
import type { ConversationTurn, StructuredReview } from "@/types";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL and a key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)"
    );
  }

  return createClient(url, key);
}

export async function saveCall(
  vapiCallId: string,
  hotelName: string,
  transcript: ConversationTurn[],
  structuredReview: StructuredReview,
  phoneNumber?: string
) {
  const supabase = getSupabase();
  const { error } = await supabase.from("calls").upsert(
    {
      vapi_call_id: vapiCallId,
      hotel_name: hotelName,
      phone_number: phoneNumber || null,
      status: "completed",
      transcript,
      structured_review: structuredReview
    },
    { onConflict: "vapi_call_id" }
  );

  if (error) throw error;
}

export async function getCalls() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCall(vapiCallId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("vapi_call_id", vapiCallId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
