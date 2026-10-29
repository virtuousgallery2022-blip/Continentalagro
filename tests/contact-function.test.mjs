import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import contact from "../netlify/functions/contact.mjs";

const keys = ["SITE_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "TURNSTILE_SECRET_KEY", "RATE_LIMIT_SALT"];
const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function configureEnvironment() {
  process.env.SITE_URL = "https://www.continentalagro.in";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-only-secret";
  process.env.TURNSTILE_SECRET_KEY = "test-only-turnstile-secret";
  process.env.RATE_LIMIT_SALT = "test-only-rate-salt";
}

function validPayload(overrides = {}) {
  return {
    name: "Asha Kumar",
    phone: "+91 98765 43210",
    email: "asha@example.com",
    location: "Pilibhit, India",
    enquiryType: "Distribution partnership",
    message: "I would like to discuss distribution in my region.",
    website: "",
    formStartedAt: String(Date.now() - 4000),
    "cf-turnstile-response": "test-turnstile-token",
    ...overrides
  };
}

function request(payload, origin = "https://www.continentalagro.in") {
  return new Request("https://www.continentalagro.in/api/contact", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

afterEach(() => {
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
});

test("rejects unsupported methods", async () => {
  const response = await contact(new Request("https://www.continentalagro.in/api/contact"), { ip: "203.0.113.2" });
  assert.equal(response.status, 405);
});

test("fails closed when production secrets are missing", async () => {
  for (const key of keys) delete process.env[key];
  const response = await contact(request(validPayload()), { ip: "203.0.113.2" });
  assert.equal(response.status, 503);
});

test("rejects a cross-origin submission", async () => {
  configureEnvironment();
  const response = await contact(request(validPayload(), "https://attacker.example"), { ip: "203.0.113.2" });
  assert.equal(response.status, 403);
});

test("rejects invalid field values before contacting external services", async () => {
  configureEnvironment();
  globalThis.fetch = async () => assert.fail("Invalid input must not call external services");
  const response = await contact(request(validPayload({ email: "not-an-email" })), { ip: "203.0.113.2" });
  assert.equal(response.status, 400);
});

test("returns a quiet success for honeypot submissions without storing them", async () => {
  configureEnvironment();
  globalThis.fetch = async () => assert.fail("Honeypot submissions must not call external services");
  const response = await contact(request(validPayload({ website: "bot filled this" })), { ip: "203.0.113.2" });
  assert.equal(response.status, 200);
});

test("does not consume a visitor rate limit for an invalid spam token", async () => {
  configureEnvironment();
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return Response.json({ success: false });
  };
  const response = await contact(request(validPayload()), { ip: "203.0.113.2" });
  assert.equal(response.status, 400);
  assert.equal(called, 1);
});

test("validates spam token and stores a successful enquiry", async () => {
  configureEnvironment();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("consume_contact_rate_limit")) return Response.json(true);
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "www.continentalagro.in", action: "contact" });
    }
    return new Response(null, { status: 201 });
  };

  const response = await contact(request(validPayload()), { ip: "203.0.113.2" });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.success, true);
  assert.equal(calls.length, 3);
  const inserted = JSON.parse(calls[2].options.body);
  assert.equal(inserted.email, "asha@example.com");
  assert.equal(inserted.enquiry_type, "Distribution partnership");
  assert.equal("website" in inserted, false);
  assert.equal("cf-turnstile-response" in inserted, false);
  assert.equal(calls[2].options.headers.apikey, "test-only-secret");
  assert.equal("authorization" in calls[2].options.headers, false);
});
