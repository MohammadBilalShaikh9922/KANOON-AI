# KANOON AI — Phase 1

Premium navy-and-gold starter website for an Indian legal-information platform.

## What is included
- Responsive home page
- Demo legal assistant (clearly labelled, not connected to a real AI)
- Directory of official Indian legal resources
- Generic document review checklist (does not upload/store document text)
- General letter draft generator
- Sign-in preview (not connected to authentication)
- About, disclaimer and privacy pages
- Cloudflare Workers static-assets configuration

## Important limitations
This is a UI and interaction prototype. It does **not** provide verified legal advice, use an AI model, authenticate users, save chat history, or store files. Do not enter confidential personal information. The demo responses are not verified legal advice.

## Deploy with GitHub + Cloudflare Workers

1. Create a GitHub repository named `kanoon-ai`.
2. Upload the contents of this folder to the repository root. The root should contain `package.json`, `wrangler.jsonc`, `src/`, `public/`, and this README.
3. In Cloudflare, open **Workers & Pages** and choose **Create application** / **Connect to Git** (labels may vary).
4. Connect GitHub and select `kanoon-ai`.
5. Configure the build/deploy:
   - Build command: leave blank
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/` or repository root
6. Save and deploy. Cloudflare should install the `wrangler` dev dependency from `package.json` and publish the static assets using `wrangler.jsonc`.
7. Test the provided `workers.dev` URL on desktop and mobile.

If the dashboard offers a framework preset that inserts a build command, remove it for this static-assets starter.

## Supabase later
Create a Supabase project when ready to add real authentication and user-owned data. Use the official Next.js/Supabase guide if moving to a Next.js app: https://supabase.com/docs/guides/auth/quickstarts/nextjs

Do not commit secret keys. A Supabase publishable key may be used in a client only with appropriate Row Level Security policies. Never expose a service-role key or an AI provider secret in browser code.

## Suggested next milestones
1. Connect Supabase authentication securely.
2. Add a server-side AI endpoint and enforce request limits.
3. Retrieve legal text from authoritative sources and show citations.
4. Add secure, opt-in document processing and deletion controls.
5. Test accessibility, security, legal accuracy and privacy before public launch.
