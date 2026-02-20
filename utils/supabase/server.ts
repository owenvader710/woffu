// utils/supabase/server.ts
// ❗ ปิดการใช้ใน Server Components ชั่วคราว
export function createClient() {
  throw new Error(
    "Do not use utils/supabase/server.ts in Server Components for now. Use /api/me instead."
  );
}
