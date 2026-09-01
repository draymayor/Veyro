// Shared design tokens for transactional emails, mirroring
// docs/design-principles.md. Kept as plain values (not Tailwind) since
// these render through @react-email/components, not the web app's
// Tailwind config.
export const emailTheme = {
  primary: '#E8674A',
  background: '#FAF7F2',
  ink: '#1C1B29',
  success: '#0ECB81',
  error: '#C24E3D',
  muted: '#6B6A78',
  border: '#EDE7DE',
  fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export const SUPPORT_EMAIL = 'support@veyro.best';

// Served from apps/web/public/veyro_logos/veyro-mark.png via the production
// domain - email clients fetch images remotely, they can't reference a
// local Next.js public path, so this has to be an absolute, publicly
// reachable URL rather than a bundled asset.
export const LOGO_URL = 'https://veyro.best/veyro_logos/veyro-mark.png';
