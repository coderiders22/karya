# Ruvano

**Plan. Track. Build. Deliver.** One platform. Every step forward.

**Ruvano** (Ru for rhythm, Va for value, No for what's next) is a self-hosted issue tracker that keeps itself up to date. Free, unlimited users, and it can move projects to or from Jira.

**What makes it different**
- **Reality Check:** the board checks itself against GitHub. It flags cards marked done while their pull request is open, work in progress with no commits, pull requests waiting for review, and merged work with no card (add it as a done card in one click).
- **GitHub automation:** mention `WEB-12` in a branch, commit or PR title. The PR shows on the issue, opening it moves the issue to review, and merging it moves it to done.
- **Standup mode:** each person's finished, in-progress, blocked and next work, generated from the tracker, with a timed presenter mode, notes and blockers per person, and a summary to copy into chat.
- **Share status:** a read-only status link for managers or clients, with no login: what shipped this week, what's in progress, what's stuck.
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
- A printable contribution report: who finished what, with comments, commits and pull requests

**GitHub**
- Connect a repo in one click from the project's menu. New GitHub issues become cards, and pull requests move them
- Boards update by themselves as your team and GitHub make changes, with a manual fetch button too

**Team & data**
- Free sign-up: every team or student gets a private workspace of their own
- Forgot password: people request a link, and the site owner creates and emails it from an owner-only page
- Invite links, Viewer/Member/Manager/Admin roles, profile and password settings
- **Import from Jira** (Jira's "Export CSV (all fields)") and **export to Jira** (Project settings → Download Jira CSV)
- One-click JSON backup for admins

**AI (optional)**
- Set `ZHIPUAI_API_KEY` (GLM on z.ai, `glm-4.5-flash` by default) to turn it on. Without it, no AI buttons appear.
- **Find its card:** suggests which card a merged pull request with no card belongs to. One click links it.
- **AI summary** on Standup, and an **In short** paragraph on the status page, refreshed every few hours.
- AI only suggests and summarises; it never changes cards by itself, and everything it writes is marked. Card titles, notes and pull request titles are sent to the provider, never emails or passwords. Admins can switch AI off on the Team page.

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
