import type { SupportCategory, SupportStatus } from "@/lib/support/types";

export interface AdminSupportThreadListItem {
  user_id: string;
  display_name: string | null;
  email: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  last_message_body: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportMessage {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminSupportThreadDetail {
  user_id: string;
  display_name: string | null;
  email: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
  messages: AdminSupportMessage[];
}

export const SUPPORT_STATUS_OPTIONS: { value: SupportStatus; label: string }[] =
  [
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
  ];
