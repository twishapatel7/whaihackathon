import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { fetchCalls, type CallRecord } from "@/src/lib/api";

function sentimentColor(sentiment: string): string {
  if (sentiment === "positive") return "#166534";
  if (sentiment === "negative") return "#991b1b";
  return "#854d0e";
}

function ratingColor(rating: number): string {
  if (rating >= 4) return "#166534";
  if (rating === 3) return "#854d0e";
  return "#991b1b";
}

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRecord[]>([]);

  useEffect(() => {
    fetchCalls()
      .then(setCalls)
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Completed Reviews</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={calls}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.hotel}>{item.hotel_name}</Text>
                <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
                <Text style={styles.meta}>Phone: {item.phone_number || "Unknown"}</Text>
                <Text style={{ color: ratingColor(item.structured_review?.overall_rating || 3) }}>
                  Rating: {item.structured_review?.overall_rating || "N/A"}
                </Text>
                <Text style={{ color: sentimentColor(item.structured_review?.sentiment || "neutral") }}>
                  Sentiment: {item.structured_review?.sentiment || "neutral"}
                </Text>
                <Text style={styles.meta}>
                  Recommend: {item.structured_review?.would_recommend === null ? "Unknown" : item.structured_review?.would_recommend ? "Yes" : "No"}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text>No calls yet.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0f172a" },
  container: { flex: 1, padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  hotel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#cbd5e1", marginTop: 4 }
});
