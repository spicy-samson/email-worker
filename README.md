# my-workflow

Cloudflare Worker with an **email sending workflow** (Resend).

## Setup

1. **Secrets** (required for sending):

   ```bash
   npx wrangler secret put RESEND_API_KEY   # from https://resend.com
   npx wrangler secret put RESEND_FROM      # e.g. onboarding@yourdomain.com
   ```

   For local dev, create `.dev.vars` in the project root:

   ```
   RESEND_API_KEY=re_xxxx
   RESEND_FROM=onboarding@resend.dev
   RESEND_BCC=your@email.com   # optional: get a BCC copy of every send (requires verified domain)
   ```

2. **Types** (after changing bindings):

   ```bash
   npx wrangler types
   ```

## Run

```bash
npx wrangler dev
```

Start an email workflow:

```bash
curl -X POST http://localhost:8787/ \
  -H "Content-Type: application/json" \
  -d '{"to":"paulinoedselgrageda.samson@bicol-u.edu.ph","subject":"Hi, i love you!","html":"<p>Hello</p>"}'
```

Optional: pass `"from"` in the JSON to override `RESEND_FROM`. Pass `"bcc": "you@example.com"` (or an array) to BCC on that send. **Note:** Resend only supports BCC when using a verified domain (not `onboarding@resend.dev`).

## Deploy

```bash
npx wrangler deploy
```
