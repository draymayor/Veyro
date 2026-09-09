import type { SupportCategory, SupportStatus } from "@/lib/support/types";

export interface AdminSupportThreadListItem {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  has_unread: boolean;
  last_message_body: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportMessage {
  id: string;
  thread_id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminSupportThreadDetail {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
  messages: AdminSupportMessage[];
}

export const SUPPORT_STATUS_OPTIONS: { value: SupportStatus; label: string }[] =
  [
    { value: "open", label: "Ongoing" },
    { value: "resolved", label: "Resolved" },
  ];
