import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const parsedSiteUrl = new URL(process.env.SITE_URL || "https://www.continentalagro.in");

if (parsedSiteUrl.protocol !== "https:" || parsedSiteUrl.username || parsedSiteUrl.password || parsedSiteUrl.pathname !== "/" || parsedSiteUrl.search || parsedSiteUrl.hash) {
  throw new Error("SITE_URL must be an HTTPS origin without credentials, path, query, or fragment.");
}
const siteUrl = parsedSiteUrl.origin;
const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID || "";
const turnstileSiteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY || "";
const searchConsoleToken = process.env.GOOGLE_SITE_VERIFICATION || "";

if (ga4MeasurementId && !/^G-[A-Z0-9]+$/i.test(ga4MeasurementId)) throw new Error("GA4_MEASUREMENT_ID must use the G-XXXXXXXX format.");
if (turnstileSiteKey && !/^[A-Za-z0-9_-]{10,}$/.test(turnstileSiteKey)) throw new Error("PUBLIC_TURNSTILE_SITE_KEY has an unexpected format.");
if (searchConsoleToken && !/^[A-Za-z0-9_-]+$/.test(searchConsoleToken)) throw new Error("GOOGLE_SITE_VERIFICATION has an unexpected format.");

const pages = {
  "index.html": {
    path: "/",
    hero: "plant-hero.jpg",
    title: "Continental Agro Tarai Seeds | Wheat Seed Manufacturer",
    description: "Wheat seed manufacturing and distribution from Pilibhit, Uttar Pradesh. Explore Continental Agro Tarai Seeds products, plant, quality approach, and dealer enquiries."
  },
  "about.html": {
    path: "/about",
    hero: "plant-front.jpg",
    title: "About Continental Agro Tarai Seeds | Pilibhit",
    description: "Learn about Continental Agro Tarai Seeds, its wheat seed focus, manufacturing base in Pilibhit, and plans for future seed categories."
  },
  "products.html": {
    path: "/products",
    hero: "wheat-field-sunrise.jpg",
    title: "Wheat Seed Varieties | Continental Agro Tarai Seeds",
    description: "Explore Continental Agro Tarai Seeds wheat portfolio, current seed pack information, and planned future crop categories."
  },
  "research.html": {
    path: "/research",
    hero: "seed-lab-quality.jpg",
    title: "Seed Research & Quality | Continental Agro Tarai Seeds",
    description: "Explore Continental Agro Tarai Seeds' practical approach to wheat variety information, seed handling, storage, quality, and field feedback."
  },
  "production.html": {
    path: "/production",
    hero: "warehouse-bags.jpg",
    title: "Seed Production & Facility | Continental Agro Tarai Seeds",
    description: "See the Continental Agro Tarai Seeds facility, storage, seed handling, and production information from Mohanpur Japti, Pilibhit."
  },
  "distribution.html": {
    path: "/distribution",
    hero: "plant-gate.jpg",
    title: "Seed Distribution & Dealer Enquiries | Continental Agro",
    description: "Connect with Continental Agro Tarai Seeds about dealer partnerships, wheat seed supply, wholesale distribution, and export enquiries."
  },
  "gallery.html": {
    path: "/gallery",
    hero: "plant-hero.jpg",
    title: "Plant & Warehouse Gallery | Continental Agro Tarai Seeds",
    description: "View photos of the Continental Agro Tarai Seeds manufacturing facility, seed storage, plant exterior, and wheat seed products."
  },
  "contact.html": {
    path: "/contact",
    hero: "plant-front.jpg",
    title: "Contact Continental Agro Tarai Seeds | Dealer Enquiry",
    description: "Contact Continental Agro Tarai Seeds for wheat seed, dealer, bulk supply, farmer, and international business enquiries."
  }
};

const publicValues = {
  "__SITE_URL__": siteUrl,
  "__GA4_MEASUREMENT_ID__": ga4MeasurementId,
  "__GOOGLE_SITE_VERIFICATION__": searchConsoleToken,
  "__TURNSTILE_SITE_KEY__": escapeAttribute(turnstileSiteKey)
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (["dist", "netlify", "scripts", "supabase", "tests", "DEPLOYMENT.md", "README.md", "netlify.toml"].includes(entry.name) || entry.name.startsWith(".")) continue;
  const source = path.join(root, entry.name);
  const destination = path.join(output, entry.name);
  if (entry.isDirectory()) {
    if (entry.name === "assets") {
      const usedAssets = new Set([
        "brand-mark-clean.png", "brand-logo-wide.png", "continental-front-pack.jpg",
        "plant-front.jpg", "plant-gate.jpg", "plant-hero.jpg", "seed-lab-quality.jpg",
        "warehouse-bags.jpg", "warehouse-interior.jpg", "wheat-field-sunrise.jpg"
      ]);
      await mkdir(destination, { recursive: true });
      for (const asset of await readdir(source, { withFileTypes: true })) {
        if (asset.isFile() && usedAssets.has(asset.name)) await cp(path.join(source, asset.name), path.join(destination, asset.name));
      }
      continue;
    }
    await cp(source, destination, { recursive: true });
    continue;
  }
  if (entry.name.endsWith(".html") || entry.name.endsWith(".js")) {
    let content = await readFile(source, "utf8");
    for (const [token, value] of Object.entries(publicValues)) content = content.replaceAll(token, value);

    if (entry.name.endsWith(".html")) {
      const metadata = pages[entry.name];
      if (!metadata) continue;
      const canonical = `${siteUrl}${metadata.path}`;
      const seo = [
        `<link rel="canonical" href="${canonical}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:locale" content="en_IN" />`,
        `<meta property="og:site_name" content="Continental Agro Tarai Seeds" />`,
        `<meta property="og:title" content="${metadata.title}" />`,
        `<meta property="og:description" content="${metadata.description}" />`,
        `<meta property="og:url" content="${canonical}" />`,
        `<meta property="og:image" content="${siteUrl}/assets/plant-front.jpg" />`,
        `<meta property="og:image:alt" content="Continental Agro Tarai Seeds manufacturing facility in Pilibhit" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${metadata.title}" />`,
        `<meta name="twitter:description" content="${metadata.description}" />`,
        `<meta name="twitter:image" content="${siteUrl}/assets/plant-front.jpg" />`,
        searchConsoleToken
          ? `<meta name="google-site-verification" content="${escapeAttribute(searchConsoleToken)}" />`
          : ""
      ].filter(Boolean).join("\n    ");
      content = content.replace(/<title>[\s\S]*?<\/title>/i, `<title>${metadata.title}</title>`)
        .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${metadata.description}" />`);
      content = content.replace("<!-- SEO_METADATA -->", seo);
      content = content.replace("</head>", `    <link rel="preload" as="image" href="${siteUrl}/assets/${metadata.hero}" fetchpriority="high" />\n  </head>`);

      if (entry.name === "contact.html" && turnstileSiteKey) {
        content = content.replace("<!-- TURNSTILE_SCRIPT -->", '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>');
      } else if (entry.name === "contact.html") {
        content = content.replace("<!-- TURNSTILE_SCRIPT -->", "")
          .replace(/<div class="cf-turnstile"[^>]*><\/div>/, '<p class="form-protection-note">Online form protection is not configured yet. Please call <a href="tel:18001202845">1800 120 2845</a> or email <a href="mailto:Customerservices@continentalagro.com">Customerservices@continentalagro.com</a>.</p>')
          .replace('<button class="btn primary form-submit" type="submit">Send Enquiry</button>', '<button class="btn primary form-submit" type="submit" disabled>Online form unavailable</button>');
      } else {
        content = content.replace("<!-- TURNSTILE_SCRIPT -->", "");
      }

      if (entry.name === "index.html") {
        const businessSchema = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Continental Agro Tarai Seeds",
          url: siteUrl,
          logo: `${siteUrl}/assets/brand-logo-wide.png`,
          slogan: "उन्नति का बीज",
          email: "Customerservices@continentalagro.com",
          telephone: "+91-1800-120-2845",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Mohanpur Japti, Puranpur",
            addressLocality: "Pilibhit",
            addressRegion: "Uttar Pradesh",
            postalCode: "262122",
            addressCountry: "IN"
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+91-1800-120-2845",
            email: "Customerservices@continentalagro.com",
            contactType: "customer service",
            areaServed: "IN",
            availableLanguage: ["English", "Hindi"]
          }
        };
        content = content.replace("<!-- BUSINESS_SCHEMA -->", `<script type="application/ld+json">${JSON.stringify(businessSchema).replaceAll("<", "\\u003c")}</script>`);
      } else {
        content = content.replace("<!-- BUSINESS_SCHEMA -->", "");
      }

    }

    content = content.replaceAll("about.html", "/about")
      .replaceAll("products.html#future", "/products#future")
      .replaceAll("products.html", "/products")
      .replaceAll("research.html", "/research")
      .replaceAll("production.html", "/production")
      .replaceAll("distribution.html", "/distribution")
      .replaceAll("gallery.html", "/gallery")
      .replaceAll("contact.html", "/contact");

    if (entry.name.endsWith(".html")) {
      content = content.replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, (tag, attributes) => {
        const isBrandOrLoader = /brand-mark-clean\.png|brand-logo-wide\.png/.test(attributes);
        const loading = isBrandOrLoader ? "eager" : "lazy";
        const priority = /brand-mark-clean\.png/.test(attributes) ? ' fetchpriority="high"' : "";
        return `<img loading="${loading}" decoding="async"${priority}${attributes}>`;
      });
    }

    await writeFile(destination, content);
    continue;
  }
  await cp(source, destination);
}

const routes = Object.values(pages).map((page) => page.path);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(output, "sitemap.xml"), sitemap);
await writeFile(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /.netlify/\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`);

console.log(`Built ${Object.keys(pages).length} pages for ${siteUrl} into dist/`);

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
