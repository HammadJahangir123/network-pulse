/** Validates an IPv4 address and requires it to be in a private LAN range. */
export function validatePrivateIp(value: string): string | null {
  const ip = value.trim();
  if (!ip) return "Local IP is required";
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
    return "Enter a valid IP address, e.g. 172.30.10.25";
  }
  if (parts.some((p) => p.length > 1 && p.startsWith("0"))) {
    return "IP address parts must not have leading zeros";
  }
  const [a, b] = parts.map(Number) as [number, number, number, number];
  const isPrivate =
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  if (!isPrivate) {
    return "Must be a private LAN address (172.16–31.x.x, 10.x.x.x or 192.168.x.x)";
  }
  return null;
}
