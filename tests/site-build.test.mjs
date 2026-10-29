import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const pageNames = ["index", "about", "products", "research", "production", "distribution", "gallery", "contact"];

test("all generated pages have crawlable metadata and one main heading", async () => {
  for (const pageName of pageNames) {
    const html = await readFile(path.join(output, `${pageName}.html`), "utf8");
    assert.match(html, /<title>[^<]+<\/title>/i, `${pageName} title`);
    assert.match(html, /<meta name="description" content="[^"]+"\s*\/>/i, `${pageName} description`);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.continentalagro\.in[^\"]*"\s*\/>/i, `${pageName} canonical`);
    assert.match(html, /<meta property="og:title" content="[^"]+"\s*\/>/i, `${pageName} Open Graph title`);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${pageName} has exactly one h1`);
    assert.doesNotMatch(html, /SEO_METADATA|TURNSTILE_SCRIPT|BUSINESS_SCHEMA|__TURNSTILE|__GA4/);
    for (const image of html.matchAll(/<img\b([^>]*)>/gi)) {
      assert.match(image[1], /\balt="[^"]*"/i, `${pageName} image has alt text`);
    }
  }
});

test("generated sitemap and robots rules expose only clean site routes", async () => {
  const sitemap = await readFile(path.join(output, "sitemap.xml"), "utf8");
  const robots = await readFile(path.join(output, "robots.txt"), "utf8");
  assert.equal((sitemap.match(/<url>/g) || []).length, 8);
  assert.match(sitemap, /https:\/\/www\.continentalagro\.in\/contact/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/www\.continentalagro\.in\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
});

test("public build contains only the deployable website", async () => {
  const files = await readdir(output);
  assert.ok(!files.includes("DEPLOYMENT.md"));
  assert.ok(!files.includes("netlify.toml"));
  assert.ok(files.includes("robots.txt"));
  assert.ok(files.includes("sitemap.xml"));
  const assets = await readdir(path.join(output, "assets"));
  assert.ok(!assets.includes("wheat-field-sunrise.png"));
  assert.ok(!assets.includes("seed-lab-quality.png"));
});
