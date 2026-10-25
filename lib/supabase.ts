import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-supabase")
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Uploads a receipt image to Supabase Storage bucket `receipts`,
 * or falls back to a Data URL if Supabase is running in local demo mode.
 */
export async function uploadReceiptImage(
  file: File,
  patientId: string
): Promise<string> {
  if (supabase && isSupabaseConfigured) {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${patientId}/${Date.now()}-receipt.${ext}`;
    const { error } = await supabase.storage
      .from("receipts")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (!error) {
      const { data } = supabase.storage.from("receipts").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  }

  // Fallback to base64 Data URL so receipt preview works immediately in browser
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
