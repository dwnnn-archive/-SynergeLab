export const COOKIE_NAME = "__Host-synergelab_session";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_AVATAR_BYTES = 128 * 1024;
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function digest(value) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function readToken(request) {
  const cookie = (request.headers.get("Cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1) || "";
  return /^[a-f0-9]{64}$/.test(token) ? token : "";
}
export function sessionCookie(token, maxAge = SESSION_MS / 1000) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
export function credentials(env) {
  const values = [env.AUTH_PASSWORD_BOM, env.AUTH_PASSWORD_DAEWON];
  if (
    values.some(
      (value) =>
        typeof value !== "string" || value.length < 4 || value.length > 128,
    ) ||
    values[0] === values[1]
  )
    return null;
  return values;
}
export async function matchPassword(password, values) {
  const hashes = await Promise.all([password, ...values].map(digest));
  const matches = hashes.slice(1).map((hash) => {
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++)
      mismatch |= hash.charCodeAt(i) ^ hashes[0].charCodeAt(i);
    return mismatch === 0;
  });
  return matches.indexOf(true);
}
export function validAvatar(value) {
  if (value === null) return true;
  if (typeof value !== "string" || value.length > MAX_AVATAR_BYTES * 1.4)
    return false;
  const match = value.match(
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) return false;
  let bytes;
  try {
    bytes = atob(match[2]);
  } catch {
    return false;
  }
  if (bytes.length > MAX_AVATAR_BYTES || bytes.length < 12) return false;
  if (match[1] === "png") return bytes.startsWith("\x89PNG\r\n\x1a\n");
  if (match[1] === "jpeg") return bytes.startsWith("\xff\xd8\xff");
  return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
}
