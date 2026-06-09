/**
 * Returns true when the client IP is allowed. Empty allowlist means no restriction.
 */
export function isClientIpAllowed(
  clientIp: string | undefined,
  allowedIps: string[] | null | undefined,
): boolean {
  if (!allowedIps?.length) {
    return true;
  }

  const ip = (clientIp ?? '').trim();
  if (!ip) {
    return false;
  }

  return allowedIps.some((rule) => {
    const normalized = rule?.trim();
    if (!normalized) {
      return false;
    }
    return normalized === ip;
  });
}
