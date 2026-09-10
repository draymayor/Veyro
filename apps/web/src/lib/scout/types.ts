export interface ScoutCurrentDay {
  id: string;
  openedAt: string;
  closesAt: string;
  linkCount: number;
  approvedLinkCount: number;
}

export type ScoutDayStatus = "pending_review" | "approved" | "rejected";

export interface ScoutPastDayLink {
  id: string;
  url: string;
  platform: string | null;
  focus_tag: "recruit_scouts" | "recruit_users" | null;
  link_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
}

export interface ScoutPastDay {
  id: string;
  status: ScoutDayStatus;
  opened_at: string;
  closed_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payout_amount_usd: number | null;
  links: ScoutPastDayLink[];
}

export interface ScoutDashboard {
  minLinksPerDay: number;
  dailyRateUsd: number;
  approvedDays: number;
  requiredDays: number;
  pendingDays: number;
  maxPendingDays: number;
  blocked: boolean;
  currentDay: ScoutCurrentDay | null;
  pastDays: ScoutPastDay[];
}
