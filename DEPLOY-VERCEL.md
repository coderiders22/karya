# Deploy Ruvano on Vercel + Neon (free, no credit card)

| Piece | Service | What it holds |
|---|---|---|
| App (pages + server code) | **Vercel** Hobby | Ruvano itself |
| Database | **Neon** Postgres (free) | Projects, issues, comments, users |
| Attachments | **Vercel Blob** (free tier) | Uploaded images, PDFs, files |

Takes about 15 minutes. You need a GitHub account.

## 1. Put the code on GitHub
Create a **private** repository and push this folder to it. `.env`, `uploads/` and `node_modules/` are already ignored, so no secrets or local files go up.

## 2. Create the Vercel project
1. Go to **vercel.com** and sign up with GitHub. Choose the **Hobby** plan, which needs no card.
2. Click **Add New → Project** and import the repository.
3. Open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | A long random string. Generate one with `openssl rand -base64 32` |
4. Click **Deploy**. The build finishes, but the site can't be used yet because it has no database. That's expected.

## 3. Add the database (Neon)
1. In the project, open **Storage → Create Database → Neon**.
2. Region: **Singapore (ap-southeast-1)**. The app also runs in Singapore (`vercel.json` sets `sin1`), so the two stay close.
3. Connect it to the project, for all environments.

This sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) automatically.

## 4. Add file storage (Vercel Blob)
1. Open **Storage → Create → Blob**. If it asks for access, choose **Public**.
2. Connect it to the project.

This sets `BLOB_READ_WRITE_TOKEN`. Ruvano detects it and starts uploading attachments to Blob.

## 5. Redeploy and create your workspace
1. Open **Deployments**, click **⋯** on the latest deployment, then **Redeploy**. This build creates all the database tables.
2. Open `https://<your-project>.vercel.app/signup` and create your workspace. Whoever creates a workspace is its admin, and each workspace is private.
3. Add your team from **Team**. Invite links use the Vercel address automatically.

The very first account on a new site becomes the **site owner**. Only that account sees **Password requests**, where you answer "Forgot password?" requests: create a link there and email it to the person by hand within 24 to 48 hours. Ruvano sends no email itself.

Done. Every push to the main branch now redeploys on its own, and database changes are applied during the build.

## Optional settings
| Variable | When you need it |
|---|---|
| `GITHUB_WEBHOOK_SECRET` | To use the GitHub integration. See **Project settings → GitHub** in Ruvano. |
| `APP_URL` | Only if you add your own domain, e.g. `https://ruvano.yourcompany.com` |
| `ZHIPUAI_API_KEY` | Optional. Turns on AI suggestions and summaries (GLM on z.ai). Without it, AI buttons don't appear. |

## Limits to know (free plans)
- **Neon:** 0.5 GB of data, enough for tens of thousands of issues. After about 5 minutes with no use the database sleeps, so the next click takes about a second longer.
- **Attachments:** up to 25 MB each. Files get long random links that are only shown to signed-in members, but anyone who has a link can open that file.
- **Jira CSV import:** up to 4 MB per file. For bigger Jira projects, export a date range at a time.
- **Vercel Hobby is for non-commercial use.** It's fine for a demo or trial. For long-term company use, upgrade to Vercel Pro or move to your own server (below).

## Backups
- **Settings → Import & backup → Download JSON backup** in Ruvano saves a copy of all data (admins only).
- Neon also keeps a short point-in-time history, which you can restore from Neon's dashboard.

## Moving to your own server later
The Docker setup (`docker compose up -d --build`, see README) still works. To move:
1. Copy the data with `pg_dump` from Neon and `psql` into the new database.
2. Keep `BLOB_READ_WRITE_TOKEN` set on the new server. Attachments uploaded on Vercel stay in Blob and keep opening; without the token, new uploads are saved on the server's disk.
