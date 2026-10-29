import { createHash } from "node:crypto";

const MAX_BODY_BYTES = 8 * 1024;
const allowedTypes = new Set([
  "Distribution partnership",
  "Bulk wheat seed supply",
  "Dealer / retailer enquiry",
  "International business enquiry",
  "Farmer product enquiry"
]);

export default async function contact(request, context) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

  if (request.method !== "POST") return reply(405, { success: false, message: "Use POST to submit an enquiry." });

  const siteUrl = process.env.SITE_URL || process.env.URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;
  if (!siteUrl || !supabaseUrl || !supabaseSecret || !turnstileSecret || !rateLimitSalt) {
    return reply(503, { success: false, message: "Enquiry submission is temporarily unavailable. Please call 1800 120 2845 or email Customerservices@continentalagro.com." });
  }

  let siteOrigin;
  let databaseOrigin;
  try {
    siteOrigin = new URL(siteUrl).origin;
    databaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    return reply(503, { success: false, message: "Enquiry submission is temporarily unavailable." });
  }

  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = new Set([
    siteOrigin,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL
  ].filter(Boolean).map((value) => {
    try { return new URL(value).origin; } catch { return ""; }
  }));
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) return reply(403, { success: false, message: "This enquiry could not be accepted." });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply(415, { success: false, message: "Please submit the enquiry using the website form." });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return reply(413, { success: false, message: "Please shorten your enquiry and try again." });

  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return reply(413, { success: false, message: "Please shorten your enquiry and try again." });
    payload = JSON.parse(raw);
  } catch {
    return reply(400, { success: false, message: "Please check the form and try again." });
  }

  const data = validatePayload(payload);
  if (!data) return reply(400, { success: false, message: "Please check each field and try again." });
  if (data.website) return reply(200, { success: true, message: "Thank you. Your enquiry has been received." });
  if (!Number.isFinite(data.formStartedAt) || Date.now() - data.formStartedAt < 2500 || Date.now() - data.formStartedAt > 4 * 60 * 60 * 1000) {
    return reply(400, { success: false, message: "Please reload the form and try again." });
  }

  const clientIp = context.ip || request.headers.get("x-nf-client-connection-ip");
  if (!clientIp || !/^[\d.:[\]a-fA-F%]+$/.test(clientIp)) return reply(429, { success: false, message: "Please wait a moment before trying again." });
  const ipHash = createHash("sha256").update(`${rateLimitSalt}:${clientIp}`).digest("hex");

  let challenge;
  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: turnstileSecret, response: data.turnstileToken, remoteip: clientIp }),
      signal: AbortSignal.timeout(8000)
    });
    if (!verification.ok) throw new Error("turnstile-request-failed");
    challenge = await verification.json();
  } catch {
    return reply(503, { success: false, message: "Spam protection could not be reached. Please try again shortly." });
  }

  const expectedHostname = new URL(requestOrigin).hostname;
  if (!challenge.success || challenge.hostname !== expectedHostname || challenge.action !== "contact") {
    return reply(400, { success: false, message: "Please complete the spam check and submit again." });
  }

  try {
    const rateResponse = await fetch(`${databaseOrigin}/rest/v1/rpc/consume_contact_rate_limit`, {
      method: "POST",
      headers: supabaseHeaders(supabaseSecret),
      body: JSON.stringify({ p_ip_hash: ipHash }),
      signal: AbortSignal.timeout(8000)
    });
    if (!rateResponse.ok) throw new Error("rate-limit-check-failed");
    if (await rateResponse.json() !== true) return reply(429, { success: false, message: "Too many enquiries from this connection. Please try again in a few minutes." });
  } catch {
    return reply(503, { success: false, message: "Enquiry submission is temporarily unavailable. Please call 1800 120 2845 or email Customerservices@continentalagro.com." });
  }

  try {
    const insertResponse = await fetch(`${databaseOrigin}/rest/v1/contact_inquiries`, {
      method: "POST",
      headers: { ...supabaseHeaders(supabaseSecret), Prefer: "return=minimal" },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        email: data.email,
        location: data.location,
        enquiry_type: data.enquiryType,
        message: data.message
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!insertResponse.ok) throw new Error("inquiry-insert-failed");
  } catch {
    return reply(503, { success: false, message: "We could not save your enquiry. Please try again or contact us by phone or email." });
  }

  return reply(201, { success: true, message: "Thank you. Your enquiry has been received. Our team will be in touch." });
}

export const config = { path: "/api/contact", method: "POST" };

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const get = (key) => typeof payload[key] === "string" ? payload[key].trim() : "";
  const data = {
    name: get("name"),
    phone: get("phone"),
    email: get("email"),
    location: get("location"),
    enquiryType: get("enquiryType"),
    message: get("message"),
    website: get("website"),
    turnstileToken: get("cf-turnstile-response"),
    formStartedAt: Number(get("formStartedAt"))
  };
  if (data.name.length < 2 || data.name.length > 100 || /[\u0000-\u001f<>]/.test(data.name)) return null;
  if (data.phone.length < 7 || data.phone.length > 32 || !/^[+()\d .-]+$/.test(data.phone)) return null;
  if (data.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(data.email)) return null;
  if (data.location.length < 2 || data.location.length > 120 || /[\u0000-\u001f<>]/.test(data.location)) return null;
  if (!allowedTypes.has(data.enquiryType)) return null;
  if (data.message.length < 10 || data.message.length > 3000 || /\u0000/.test(data.message)) return null;
  if (data.website.length > 200 || data.turnstileToken.length > 2048) return null;
  return data;
}

function supabaseHeaders(secret) {
  return {
    apikey: secret,
    "content-type": "application/json",
    "content-profile": "public",
    "accept-profile": "public"
  };
}
