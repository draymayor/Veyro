/**
 * Masks an email (or username) so a leaderboard row never shows a full,
 * unmasked identifier for anyone but the viewer themself, e.g.
 * "ogunnubimayowa@gmail.com" -> "ogu***@****".
 */
export function maskIdentifier(identifier: string): string {
  const atIndex = identifier.indexOf("@");

  if (atIndex === -1) {
    const visible = identifier.slice(0, 3);
    return `${visible}***`;
  }

  const local = identifier.slice(0, atIndex);
  const visible = local.slice(0, 3);
  return `${visible}***@****`;
}
