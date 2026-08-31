/**
 * Single choke point for where a successful auth flow sends the user
 * before they land on /home (see the four call sites: login, verify-email,
 * select-country, and the Google OAuth callback route). Keeping it here
 * instead of hardcoding "/welcome" at each site means a future bypass for
 * automated testing only needs to change in one place.
 */
export const POST_AUTH_ENTRY_PATH = "/welcome";

/**
 * Where an admin identity lands after authenticating, and the single
 * redirect target every admin-routing check points at (login, the Google
 * OAuth callback, and the consumer app layout's per-request guard). Per
 * docs/context.md's Admin Authentication Architecture: admin uses the
 * exact same /login page as every consumer user, this constant is only
 * ever reached by a post-auth is_admin check, never a route anyone can
 * navigate to directly to gain access.
 */
export const ADMIN_ENTRY_PATH = "/admin/dashboard";
