import { getCalls } from "@/lib/supabase";
import type { StructuredReview } from "@/types";

export const dynamic = "force-dynamic";

type CallRow = {
  id: string;
  hotel_name: string;
  phone_number: string | null;
  created_at: string;
  transcript: unknown;
  structured_review: StructuredReview | null;
};

function getRatingClass(rating: number) {
  if (rating >= 4) return "text-green-600";
  if (rating === 3) return "text-yellow-600";
  return "text-red-600";
}

export default async function AdminPage() {
  let calls: CallRow[] = [];
  try {
    calls = await getCalls();
  } catch (error) {
    console.error("Admin page failed to load calls", error);
    calls = [];
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <h1 className="text-3xl font-semibold mb-6">Completed Reviews</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left">
            <tr>
              <th className="p-3">Date/time</th>
              <th className="p-3">Hotel name</th>
              <th className="p-3">Phone number</th>
              <th className="p-3">Overall rating</th>
              <th className="p-3">Sentiment</th>
              <th className="p-3">Would recommend</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => {
              const structured: Partial<StructuredReview> = call.structured_review ?? {};
              return (
                <tr key={call.id} className="border-t border-slate-800 align-top">
                  <td className="p-3">{new Date(call.created_at).toLocaleString()}</td>
                  <td className="p-3">{call.hotel_name}</td>
                  <td className="p-3">{call.phone_number || "Unknown"}</td>
                  <td className={`p-3 font-medium ${getRatingClass(structured.overall_rating || 3)}`}>
                    {structured.overall_rating ?? "N/A"}
                  </td>
                  <td className="p-3">{structured.sentiment || "neutral"}</td>
                  <td className="p-3">
                    {structured.would_recommend === null
                      ? "Unknown"
                      : structured.would_recommend
                        ? "Yes"
                        : "No"}
                    <details className="mt-2 text-xs text-slate-300">
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            transcript: call.transcript,
                            topics: structured.topics
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
