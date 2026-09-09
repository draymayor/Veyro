export type AdminScoutApplicationStatus = "pending" | "approved" | "rejected";

export interface ScoutPlatformEntry {
  platform: string;
  handle: string;
}

export interface AdminScoutApplicationListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  full_name: string | null;
  status: AdminScoutApplicationStatus;
  applied_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  platforms: ScoutPlatformEntry[];
  other_platform: string | null;
  other_handle: string | null;
  motivation: string | null;
  can_commit: boolean | null;
  commitment_note: string | null;
}
