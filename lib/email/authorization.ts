import { timingSafeEqual } from "node:crypto";

export function authorizedEmailDispatch(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header || header.length > 1024) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
