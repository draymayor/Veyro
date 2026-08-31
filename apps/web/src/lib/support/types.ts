/** Mirrors public.support_threads.category (docs/database-schema.md). */
export type SupportCategory =
  "trades" | "wallet" | "account" | "referrals" | "other";

/** Mirrors public.support_threads.status (docs/database-schema.md). */
export type SupportStatus = "open" | "resolved";

/** Mirrors public.support_messages (docs/database-schema.md). */
export interface SupportMessage {
  id: string;
  userId: string;
  sender: "user" | "admin";
  body: string;
  readAt: string | null;
  createdAt: string;
}

/** Mirrors public.support_threads (docs/database-schema.md). */
export interface SupportThread {
  userId: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
}
