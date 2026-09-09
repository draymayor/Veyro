export type AdminScoutDayStatus =
  "in_progress" | "pending_review" | "approved" | "rejected";

export interface AdminScoutDayListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  status: AdminScoutDayStatus;
  opened_at: string;
  closed_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payout_amount_usd: number | null;
  link_count: number;
}

export type ScoutLinkStatus = "pending" | "approved" | "rejected";

export interface AdminScoutLink {
  id: string;
  url: string;
  platform: string | null;
  focus_tag: "recruit_scouts" | "recruit_users" | null;
  submitted_at: string;
  link_status: ScoutLinkStatus;
  rejection_reason: string | null;
}

export interface AdminScoutDayDetail {
  id: string;
  user_id: string;
  user_display_name: string | null;
  status: AdminScoutDayStatus;
  opened_at: string;
  closed_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payout_amount_usd: number | null;
  links: AdminScoutLink[];
}
