# Karya

**Karya** (Sanskrit for “work”) is a self-hosted issue tracker that keeps itself up to date. Free, unlimited users, and it can move projects to or from Jira.

**What makes it different**
- **GitHub automation:** mention `WEB-12` in a branch, commit or PR title. The PR shows on the issue, opening it moves the issue to review, and merging it moves it to done.
- **Standup mode:** each person's finished, in-progress, blocked and next work, generated from the tracker, with a timed presenter mode.
- **Sprint forecast:** compares time used with work done and says mid-sprint how much won't land. The backlog warns when a planned sprint is over your usual velocity.
- **Stuck-work detection:** cards show time in column, stale and blocked work is flagged, columns have WIP limits, and Insights names your current bottleneck.
- **One-line create:** `Checkout fails on Safari bug @sam !high #payments due:fri 3pts` fills in every field.
- **Keyboard first:** ⌘K, `C`, `M`, `E`, `J`/`K`, `G` then `B`/`L`/`S`… Press `?` in the app for the full list.

**Everything else you expect**
- Projects with keys (`WEB-12`), each with its own color, lead and workflow columns
- Issue types Epic / Story / Task / Bug / Subtask, with priorities, story points, labels, start and due dates
- Drag-and-drop board, backlog, and sprints (start, complete, carry unfinished work over)
- Roadmap: every epic on a timeline with live progress
- Issue pages with inline editing, markdown, comments with @mentions, subtasks, linked issues (blocks / relates / duplicates), file attachments, watchers and full history

**Find & report**
- Cross-project search with filters, bulk edit (status, assignee, priority, sprint, labels, delete) and saved filters you can share with the team
- Reports: sprint burndown, velocity, created vs resolved, workload
- "Your work" dashboard and in-app notifications (assigned, mentioned, commented, status changes)
- ⌘K command palette, `C` to create, dark mode
- **Built-in guide:** a guided tour on first login, and a Guide page that explains every feature step by step, with short videos recorded from the real app (`scripts/record-guide-videos.mjs` re-records them)

**Student teams**
- Choose "I'm a student" at sign-up: your home screen and tools follow
- Start a board from a template (major project, minor project, hackathon, research paper, club event and more), with the usual steps dated back from your deadline
- Teammates join a project with one link, even from other colleges, and a project's Team page shows who's doing what
- A live countdown to every deadline, and all your tasks across projects in one list

**Team & data**
- Free sign-up: every team or student gets a private workspace of their own
- Forgot password: people request a link, and the site owner creates and emails it from an owner-only page
- Invite links, Viewer/Member/Manager/Admin roles, profile and password settings
- **Import from Jira** (Jira's "Export CSV (all fields)") and **export to Jira** (Project settings → Download Jira CSV)
- One-click JSON backup for admins

## Free hosting on Vercel + Neon

No credit card needed. Follow [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md): about 15 minutes, all in the browser.

## Self-hosting with Docker

Requires Docker on your server.

```bash
cp .env.example .env
# edit .env: set AUTH_SECRET (openssl rand -base64 32), APP_URL and POSTGRES_PASSWORD
docker compose up -d --build
```

Open `APP_URL` and click **Create a free workspace**. You become its admin. Then invite teammates from **Team**.

Database migrations run automatically on every start. Data lives in the `db-data` Docker volume and uploaded files in the `uploads` volume. Back it up with:

```bash
docker compose exec db pg_dump -U trackr trackr > backup.sql
```

To turn on the GitHub integration, set `GITHUB_WEBHOOK_SECRET` in `.env`, then follow **Project settings → GitHub**.

For HTTPS, put the app behind a reverse proxy such as Caddy, nginx or Traefik, and set `APP_URL` to the `https://` address.

### Without Docker

Requires Node 20+ and Postgres 14+. Set `DATABASE_URL`, `AUTH_SECRET` and `APP_URL` in `.env`, then:

```bash
npm ci
npx prisma migrate deploy
npm run build && npm start
```

## Development

```bash
npm install
npx prisma migrate dev
npm run dev
```
