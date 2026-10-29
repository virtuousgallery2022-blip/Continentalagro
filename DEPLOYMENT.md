# Continental Agro Tarai Seeds: production setup

## Project and deployment target

This folder is a buildless HTML, CSS, and browser JavaScript site. It has eight pages and an assets directory. The separate repository-root `package.json` and Next.js app belong to another website and are not used by this deploy. The repository-root `netlify.toml` sets this folder as Netlify's base directory, builds the pages into `dist/`, and deploys the contact function.

The canonical origin defaults to `https://www.continentalagro.in`, which is the company website printed in the supplied seed-pack image. Confirm that this domain is owned and will be the production hostname before launch. The displayed footer hours (Mon-Sat, 9:30 AM-6:00 PM) were adopted from the requested visual reference and must be confirmed by the company.

## Supabase setup

1. Create or select the production Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/202610260001_contact_inquiries.sql`.
3. In the Table Editor, verify `public.contact_inquiries` has RLS enabled and no client policies. The migration grants column-limited insert access to `service_role`; browser roles receive no table access. The private rate-limit table is inaccessible to browser roles.
4. Copy the project URL and a new-format Supabase secret key (`sb_secret_...`) for the server function. The function sends it only in the `apikey` header. Never use a publishable key for this server insert and never put the secret in HTML, JavaScript, or a `PUBLIC_` variable.

The migration stores name, phone, email, location, enquiry type, message, and creation time. It stores no raw IP address. After successful spam verification, rate limits use a salted hash, with a limit of five attempts per 15-minute window.

## Spam protection

1. Create a Cloudflare Turnstile widget for the final production hostname, such as `www.continentalagro.in`.
2. Add that hostname in the widget's hostname restrictions.
3. Copy its public site key and private secret. The site key is embedded in the generated contact page; the secret is used only by the Netlify function.
4. The function calls Turnstile Siteverify and checks success, hostname, and the `contact` action before inserting. Missing configuration fails closed.

## Netlify deployment

1. Push the repository to a Git provider and create a Netlify site from that repository.
2. Keep the base directory as `continental-agro-tarai-seeds`. The checked-in root `netlify.toml` sets the build command to `node scripts/build.mjs`, publish directory to `dist`, and function directory to `netlify/functions`.
3. Add environment variables in **Site configuration → Environment variables**. Set `SITE_URL` to the verified production origin and make it available to both Builds and Functions. Set the other public build values for Builds, and restrict secrets to the Functions scope where Netlify plan settings permit.
4. Run the Supabase migration and create the Turnstile widget before enabling the form. A deploy with no Turnstile site key intentionally renders the form as unavailable; the API also refuses submissions if any server secret is missing.
5. Deploy a preview first. Check `/`, `/contact`, `/robots.txt`, and `/sitemap.xml`. Use separate staging Supabase and Turnstile credentials for a preview enquiry, and allow the preview hostname in that staging Turnstile widget. Verify the test row appears in the staging database. Then promote/deploy the production branch.
6. Attach `www.continentalagro.in` (or the verified canonical domain) in Netlify's domain settings and configure DNS using the records Netlify provides. Enable HTTPS before submitting the sitemap to search engines.

The build can be checked locally with `node scripts/build.mjs`. It reads public build values, writes generated files to `dist/`, and does not require a real credential to run. Run the API tests with `node --test tests/contact-function.test.mjs`.

## Environment variables

`.env.example` documents names and blank values only. The build script does not read local env files; configure values in Netlify. Do not commit actual credentials. A local `.env` under this folder is ignored by its `.gitignore`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `SITE_URL` | Build and Functions | Verified HTTPS canonical origin; currently defaults in the build to the supplied `www.continentalagro.in` address. |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build | Public Cloudflare Turnstile widget key. |
| `TURNSTILE_SECRET_KEY` | Functions only | Private key used for server-side Turnstile verification. |
| `SUPABASE_URL` | Functions only | Supabase project URL. |
| `SUPABASE_SECRET_KEY` | Functions only | Private Supabase key used by the function to write inquiries and call the rate-limit RPC. |
| `RATE_LIMIT_SALT` | Functions only | Random private value used to hash client IP addresses before rate-limit storage. Use a long random value and keep it stable across deploys. |
| `GA4_MEASUREMENT_ID` | Build | Optional public GA4 measurement ID, in `G-...` format. Analytics code is omitted unless this is valid. |
| `GOOGLE_SITE_VERIFICATION` | Build | Optional token copied from Search Console's HTML-tag verification method. |

Netlify Functions receive environment values configured through the Netlify UI/CLI/API, not values declared only in `netlify.toml`. After changing a value, trigger a new deploy.

## Google Analytics and Search Console

For GA4, create a GA4 property and web data stream for the production domain, then copy its measurement ID into `GA4_MEASUREMENT_ID` as a Build value. Deploy and confirm page views in GA4 Realtime. The measurement ID is public by design; no service credential is needed.

For Search Console, add the verified production URL prefix, select the HTML-tag method, and copy only the token value into `GOOGLE_SITE_VERIFICATION` as a Build value. Deploy, return to Search Console, and complete verification. Submit `https://www.continentalagro.in/sitemap.xml` after confirming that exact canonical domain. DNS verification is also available if preferred; no verification has been performed by this project.

## Before launch

- Confirm domain ownership and the canonical `www` or non-`www` choice.
- Confirm footer working hours with the company.
- Configure real Supabase, Turnstile, and Netlify values in their dashboards; this source tree contains none.
- Review the company's approved privacy notice and data-retention process for contact details and analytics.
- Confirm the enquiries table receives a test row and that no anonymous/authenticated table read or write works.
