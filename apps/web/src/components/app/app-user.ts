export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  /** Set once the user uploads a real photo via the Profile page. */
  profileImageUrl: string | null;
}
