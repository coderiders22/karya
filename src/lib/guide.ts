/**
 * Content of the in-app Guide (/guide). Plain data so it can be searched.
 * Text supports **bold** and `code`. A topic's `video` is a file in public/guide/videos
 * (recorded from the real app by scripts/record-guide-videos.mjs).
 */

export type GuideTopic = {
  id: string;
  title: string;
  /** One sentence: what it is and why you'd use it. */
  summary: string;
  /** How to use it, in order. */
  steps: string[];
  /** What happens as a result / what it does for you. */
  result?: string;
  video?: string;
  /** "Show me" button: a tour to replay, or a page to open. */
  action?: { label: string; tour?: "welcome" | "board"; href?: string };
  /** Only shown to admins. */
  admin?: boolean;
  /** About workspace-wide teams, which student accounts don't have. */
  teamsOnly?: boolean;
  keywords?: string;
};

export type GuideSection = { id: string; title: string; topics: GuideTopic[]; /** Only shown to student accounts. */ studentsOnly?: boolean };

export const GUIDE: GuideSection[] = [
  {
    id: "student", title: "For students", studentsOnly: true,
    topics: [
      {
        id: "student-start", title: "Start a project from a template",
        summary: "Major project, minor project, hackathon and more: a board with the usual steps already laid out.",
        steps: [
          "Open **Projects**, choose what you're working on, and give it a name.",
          "Add the deadline if you know it. Each step then gets a due date, worked back from the deadline.",
          "Click **Create board**. Change, delete or add steps whenever you like: it's your board.",
        ],
        result: "You get the right columns too. Major and minor projects have a **With guide** column for work waiting on your project guide's review.",
        keywords: "major minor project hackathon template final year research paper club fest event group assignment placement semester",
      },
      {
        id: "student-team", title: "Bring your team in",
        summary: "One link per project, so you can be on different teams with different people, even from other colleges.",
        steps: [
          "Open the project's **Team** page and click **Copy link** or **WhatsApp**.",
          "Teammates open the link. If they're new they create an account, and either way they land on your board.",
          "If the link gets out, click **New link**. The old one stops working and your team stays. The lead can also remove someone.",
        ],
        result: "Teammates can add and move tasks. Only the lead can change the project's settings or remove people.",
        keywords: "invite team teammates link join whatsapp group lead remove leave",
      },
      {
        id: "student-who", title: "See who's doing what",
        summary: "No surprises in the last week, and no arguments about who did the work.",
        steps: [
          "The project's **Team** page counts each person's tasks: to do, doing and done, with anything overdue flagged.",
          "It also tells you when tasks have nobody on them, so nothing falls through the gap.",
          "Assign a task from the board. Right-click a card, or open it and pick a person.",
        ],
        keywords: "contribution workload who did what assign split work free rider viva report commits",
      },
      {
        id: "student-report", title: "Contribution report for your viva",
        summary: "A printable record of who finished what, with comments, commits and pull requests.",
        steps: [
          "Open the project's **Team** page and click **Contribution report**.",
          "Click **Print or save as PDF**. Each person's finished tasks are listed with the date they were done.",
          "Commits and pull requests count for teammates who connected GitHub in Ruvano, matched by their GitHub username.",
        ],
        video: "student-report",
        keywords: "report viva guide pdf print contribution commits evidence",
      },
      {
        id: "student-deadlines", title: "Deadlines and your day",
        summary: "A countdown for every project, and all your tasks in one list.",
        steps: [
          "Each project shows a countdown at the top of its pages. Change the deadline in the project's **Settings**.",
          "**Today** lists every deadline, then your tasks across all projects, soonest first.",
          "Click **GitHub** in the project's menu to connect your repository. GitHub issues then become cards, and cards move as you open and merge pull requests: handy when a hackathon leaves no time to update a board.",
        ],
        keywords: "deadline countdown today due date overdue submission github",
      },
      {
        id: "student-solo", title: "Plan things on your own",
        summary: "Not everything is a group project.",
        steps: [
          "Start a **Semester plan** for exam prep, lab files and assignments, or **Placement prep** for your resume and practice.",
          "These are private until you share the link. Nobody can see a board unless they've joined it.",
        ],
        keywords: "semester exam prep placement resume personal private solo",
      },
    ],
  },
  {
    id: "start", title: "Getting started",
    topics: [
      {
        id: "tour", title: "Take the tour",
        summary: "A one-minute walkthrough that points at each part of Ruvano and says what it does.",
        steps: [
          "Click **Take the tour** below, or open your name at the bottom of the sidebar and choose **Take the tour**.",
          "Use **Next** or the `→` key to move on, `←` to go back, `Esc` to stop.",
          "Open any project's **Board** to get the board tour: cards, columns, filters and the sprint forecast.",
        ],
        action: { label: "Take the tour", tour: "welcome" },
        keywords: "help onboarding walkthrough intro",
      },
      {
        id: "first-project", title: "Create your first project",
        teamsOnly: true,
        summary: "A project holds one team's or product's work. Its short key numbers every issue, like WR-12.",
        steps: [
          "Go to **Projects** in the sidebar and fill in the **New project** form.",
          "Give it a name and a key of 2 to 10 letters or numbers, starting with a letter (for example `WEB` for Website).",
          "You land on its board with four columns: To Do, In Progress, In Review and Done. Change them any time in the project's **Settings**.",
        ],
        result: "Issues in this project are numbered WEB-1, WEB-2 and so on, and those keys work in search, links and GitHub.",
        action: { label: "Open projects", href: "/projects" },
        keywords: "new project key workflow columns",
      },
    ],
  },
  {
    id: "issues", title: "Issues",
    topics: [
      {
        id: "create", title: "Create an issue",
        summary: "The full form, for when you also want a description, estimate or due date. Type the title and pick people, labels and priority without leaving the keyboard.",
        steps: [
          "Click **New issue** at the top right of any project page, the **+** next to Search, or press `C` anywhere.",
          "Write the title. Type `@` and a menu of teammates appears; `#` shows your project's labels (or creates a new one); `!` picks the priority; `/` picks the type. Use `↑` `↓` and `Enter` to choose.",
          "Or set the same things with the colored buttons under the description: type, priority, assignee, estimate, due date, labels.",
          "Also understood in the title: `3pts` points, `due:fri` (or `due:tomorrow`, `due:+3d`, `due:25/12`), `^WR-4` parent. Created from a board, the issue goes into that board's running sprint; untick the sprint button to send it to the backlog.",
          "Press `Enter` to create it.",
        ],
        result: "Fast typists can skip the menus: `Checkout fails on Safari bug @sam !high #payments due:fri 3pts` creates a high-priority bug for Sam, labelled payments, due Friday, worth 3 points.",
        video: "create-issue",
        keywords: "new issue add task bug story smart parse syntax shortcut quick mention label priority assign colour color",
      },
      {
        id: "quick-add", title: "Quick add on the board and backlog",
        summary: "Add an issue straight into a column or sprint in one line, without opening a form.",
        steps: [
          "Click **Add an issue…** at the bottom of the board's first column, or under any sprint in the **Backlog**.",
          "Type the title. The same suggestions work: `@` teammates, `#` labels, `!` priority, `/` type.",
          "What you pick shows as colored chips under the box. Click × on a chip to undo it.",
          "Click **Add issue** (or press `Enter`). The box stays open for the next one; **Cancel** or `Esc` closes it.",
        ],
        result: "On the board the issue lands in the first column, inside the running sprint; in the backlog it goes into the section (sprint or backlog) you added it under.",
        video: "quick-add",
        keywords: "quick add inline add an issue board backlog fast chips mention label priority",
      },
      {
        id: "colors", title: "Labels, priorities and their colors",
        summary: "Colors carry meaning in Ruvano, so you can scan a board without reading every word.",
        steps: [
          "**Priority** reads like signal bars: the more bars filled, the higher it is. Three orange bars = High (do next), two amber = Medium (normal), one blue = Low (when there's time), none = Lowest (someday). A solid **red square with !** = Highest: drop everything.",
          "**Status**: grey for to do, blue for in progress, green for done.",
          "**Labels**: every label keeps its color everywhere (board, lists, side panel). **You choose the color**: in any label menu, click the colored dot next to a label and pick one of 12 colors. A new label opens the palette straight away.",
          "**Violet** tags on a card name its epic. **Red Blocked** means another issue is holding it up; an **amber** timer means it has waited too long.",
        ],
        keywords: "label labels tag color colour priority status meaning legend epic blocked icon signal bars",
      },
      {
        id: "manage-labels", title: "Manage labels",
        summary: "One page with every label in the workspace: how much each is used, its color, and clean-up tools.",
        steps: [
          "Open your name at the bottom of the sidebar and choose **Labels**, or click **Edit labels** at the bottom of any label menu.",
          "Click a color to recolor a label. It changes on every issue, for the whole team, straight away.",
          "Click the issue count to see every issue with that label.",
          "Admins can **rename** a label (pencil) or **delete** it (bin). Renaming updates every issue that has it; deleting removes it from issues but keeps the issues.",
        ],
        result: "Handy for tidying typos like “fronted” into “frontend”, so filters and reports stay accurate.",
        action: { label: "Open Labels", href: "/settings/labels" },
        keywords: "labels manage rename delete color colour tidy clean merge tag",
      },
      {
        id: "issue-page", title: "Work on an issue",
        summary: "Everything about one piece of work: description, comments, subtasks, links, files and history.",
        steps: [
          "Click any issue key or title to open it.",
          "On the right, **Status**, **Assignee**, **Priority**, **Type** and **Labels** are colored pickers: click one, type to search, or use `↑` `↓` and `Enter`. Changes show at once and save by themselves.",
          "Write the description in Markdown. In **comments**, type `@` and pick a teammate from the list (they get notified), then click **Comment** or press `⌘ Enter` (`Ctrl Enter` on Windows).",
          "Add **subtasks**, **link** issues (blocks / is blocked by / relates to / duplicates), and drop files into **Attachments** (up to 25 MB each).",
          "Click **Watch** to get notified about every change. **History** at the bottom shows who changed what.",
        ],
        result: "A blocked issue shows a red **Blocked** tag on the board until the issue blocking it is done.",
        keywords: "edit description comment mention reply subtask link blocks attachment file watch history markdown picker status assignee",
      },
      {
        id: "peek", title: "Side panel",
        summary: "Look at and update an issue without leaving the board or list you're on.",
        steps: [
          "Click a card on the board or a row in a list: the issue opens in a panel on the right.",
          "Change **status**, **assignee**, **priority**, **due date** and **labels** with the colored pickers at the top.",
          "Reply at the bottom: `@` brings up teammates to mention, and the **Comment** button posts it.",
          "Press `J` / `K` for the next or previous issue, `M` to assign it to yourself, `O` to open the full page, `Esc` to close.",
        ],
        result: "Triage a whole column in a minute, keyboard only.",
        video: "side-panel",
        keywords: "peek panel preview quick view triage sidebar comment mention picker labels",
      },
      {
        id: "delete", title: "Delete an issue",
        summary: "Remove an issue for good, with its comments, files and history.",
        steps: [
          "Open the issue in the side panel and click the bin icon at the top, or open the full page and click **Delete issue** at the bottom of the right column.",
          "Confirm in the dialog.",
        ],
        result: "It can't be undone. If the work is only finished, move it to Done instead so the record stays.",
        keywords: "remove trash bin",
      },
    ],
  },
  {
    id: "board", title: "Board",
    topics: [
      {
        id: "board-basics", title: "Move work across the board",
        summary: "Each column is a step in your workflow; a card's column is its status.",
        steps: [
          "Open a project and choose **Board**.",
          "Drag a card to another column to change its status. On a phone, press and hold the card, then drag.",
          "Right-click a card for quick actions: assign to me, change status or priority, copy link, copy a git branch command.",
          "Add a card with **Add an issue…** at the bottom of the first column (see **Quick add** above).",
        ],
        video: "board",
        action: { label: "Replay board tour", tour: "board" },
        keywords: "kanban drag drop status column card",
      },
      {
        id: "live-board", title: "The board updates by itself",
        summary: "Leave it open: what your team and GitHub change shows up without reloading.",
        steps: [
          "The green **Live** mark at the top of the board means it's watching for changes, every few seconds.",
          "To get the latest right now, click **Refresh**. If the project is connected to GitHub, the button is **Fetch from GitHub**.",
        ],
        result: "It only checks while the tab is open and you're using it, so an idle tab costs nothing.",
        keywords: "live refresh reload update realtime automatic fetch sync",
      },
      {
        id: "reality", title: "Reality check",
        summary: "Where the board and the real work disagree, shown above the board so nothing drifts quietly.",
        steps: [
          "Open the project's **Board**. If something doesn't match, a **Reality check** bar appears at the top. Click **Review**.",
          "**Done, but the pull request isn't merged**: the card was moved too early.",
          "**In progress, but no code activity**: no branch, commit or pull request for longer than the project's stuck limit.",
          "**Pull request waiting**: no update for 2 days. It may need a reviewer.",
          "**Shipped without a card**: a pull request merged without mentioning any card. Click **Add as done card** to put it on record, or **Ignore**.",
          "**Due soon, not started**: due within 2 days and still in To do.",
        ],
        result: "Every finding comes from what Ruvano has actually seen: dates, commits and pull requests. Connect GitHub for the code checks.",
        video: "reality",
        keywords: "reality check mismatch code commits pull request stale untracked drift honest board",
      },
      {
        id: "stuck", title: "Spot stuck work",
        summary: "Ruvano tells you which work is waiting, so problems come up before the sprint ends.",
        steps: [
          "Every card shows how long it has been in its current column. It turns amber when it passes the project's limit (3 days by default, change it in **Settings**).",
          "A red **Blocked** tag means another unfinished issue is holding it up.",
          "Click **Stuck only** above the board to show just blocked and stale work.",
          "Set a **work-in-progress limit** on a column in project **Settings**: the column turns red when it holds too many cards.",
        ],
        result: "Insights also names the column where work waits longest: your current bottleneck.",
        keywords: "stale blocked wip limit bottleneck aging time in column",
      },
      {
        id: "filters", title: "Filter the board",
        summary: "Show only what you need right now.",
        steps: [
          "Type in **Filter cards** to match titles and keys.",
          "Click teammates' avatars to show only their work (click **Me** for yours).",
          "Click a type (Story, Task, Bug, Subtask) to show only that type. **Clear** resets everything.",
        ],
        keywords: "filter search person avatar type",
      },
    ],
  },
  {
    id: "sprints", title: "Sprints and planning",
    topics: [
      {
        id: "plan-sprint", title: "Plan and start a sprint",
        summary: "A sprint is a fixed stretch of time (usually 1 to 2 weeks) with a set of work the team commits to.",
        steps: [
          "Open the project's **Backlog** and click **New sprint**.",
          "Move issues into it with the sprint picker on each row, or select many in **Issues** and use **Move to sprint**.",
          "Watch the commitment check: it warns when the sprint holds more points than your usual velocity.",
          "Click **Edit** on the sprint to give it a goal and an end date (two weeks from the start if you leave it), then click **Start sprint**.",
        ],
        result: "The board now shows only this sprint, with a live forecast at the top.",
        video: "sprint",
        keywords: "sprint backlog plan velocity commitment start scrum",
      },
      {
        id: "forecast", title: "Sprint forecast",
        summary: "Tells you mid-sprint whether the work will land, instead of finding out on the last day.",
        steps: [
          "Start a sprint and give issues story points.",
          "The bar at the top of the board compares time used with work done and estimates how much won't finish.",
        ],
        result: "If it says work won't land, cut scope or unblock work early.",
        keywords: "forecast burndown predict on track",
      },
      {
        id: "complete-sprint", title: "Complete a sprint",
        summary: "Close the sprint and decide what happens to unfinished work.",
        steps: [
          "On the board, click **Complete sprint**.",
          "Choose where open issues go: the backlog or the next planned sprint.",
        ],
        result: "Finished points count toward your velocity, which the commitment check and Insights use.",
        keywords: "finish end close sprint carry over",
      },
    ],
  },
  {
    id: "rituals", title: "Standups, roadmap and insights",
    topics: [
      {
        id: "standup", title: "Run the daily standup",
        summary: "Each person's done, in-progress, blocked and next work, built from the tracker. Nobody has to prepare.",
        steps: [
          "Open the project's **Standup**.",
          "Click **Run standup**: it shows one person at a time with a 2-minute timer.",
          "Use `→` or **Space** for the next person, `←` to go back, **End** to finish. **Shuffle order** changes who goes first.",
          "Type what each person says in their **Notes** box, and tick **Needs help to move forward** for blockers. Notes save by themselves.",
          "Click **Copy summary** and paste it in Slack, Teams, WhatsApp or email. Nobody has to write minutes.",
        ],
        result: "Blocked work is listed first, so the meeting spends its time on what needs help.",
        video: "standup",
        keywords: "standup daily scrum meeting timer presenter notes summary minutes blocker",
      },
      {
        id: "status-link", title: "Share status outside the team",
        summary: "A read-only page for managers, clients or your guide: what shipped this week, what's in progress, what's stuck.",
        steps: [
          "Open the project's **Standup** and click **Share status**, then **Create link**. Managers and the project lead can do this.",
          "Copy the link and send it. It opens without a login and can't change anything.",
          "Click **New link** to stop the old one working, or **Turn off** to stop sharing.",
        ],
        result: "It updates live from the board, so there's no weekly report to write.",
        video: "status-link",
        keywords: "status report share link stakeholder client manager weekly update read only public",
      },
      {
        id: "ai", title: "AI suggestions and summaries",
        teamsOnly: true,
        summary: "Optional help from AI. It only suggests and summarises; it never changes a card by itself.",
        steps: [
          "**Standup**: click **AI summary** for a few sentences written from the board and today's notes. Edit it if needed, then **Copy**.",
          "**Reality check**: on a pull request that shipped without a card, click **Find its card**. If AI finds a match, click **Link to** that card to put the pull request on it.",
          "**Status page**: an **In short** paragraph at the top, refreshed every few hours.",
          "Admins can switch AI off for the whole workspace on the **Team** page.",
        ],
        result: "Card titles, notes and pull request titles are sent to the AI provider (GLM on z.ai). Emails and passwords never are. Anything AI writes is marked, so people know to check it.",
        video: "ai",
        keywords: "ai artificial intelligence summary suggest glm match card automatic",
      },
      {
        id: "roadmap", title: "Roadmap",
        summary: "Every epic on a timeline with live progress from its child issues.",
        steps: [
          "Create an issue of type **Epic**. Give it a start and due date for an exact bar; without dates Ruvano estimates one.",
          "Link stories and tasks to it: `^WR-4` when creating, or the **Epic** field on the issue.",
          "Open **Roadmap** to see epics as bars that fill up as their work is done.",
        ],
        keywords: "roadmap epic timeline gantt plan quarter",
      },
      {
        id: "insights", title: "Insights",
        summary: "Charts that answer “are we on track, and where does work get stuck?”",
        steps: [
          "Open the project's **Insights**.",
          "**Burndown**: remaining work per day in the active sprint. **Velocity**: points finished per sprint. **Created vs resolved**: is the backlog growing? **Workload**: open issues per person. **Where work waits**: which column holds work longest. Plus cycle time from start to done.",
        ],
        keywords: "reports charts burndown velocity cycle time workload bottleneck metrics",
      },
    ],
  },
  {
    id: "find", title: "Search and bulk changes",
    topics: [
      {
        id: "search", title: "Search and jump",
        summary: "Get to any issue, project or page in a couple of keystrokes.",
        steps: [
          "Press `⌘K` (`Ctrl K` on Windows) or `/`.",
          "Type part of a title, a key like `WR-12`, or a page name, then press `Enter`.",
          "Use `G` then a letter to jump: `G W` Your work, `G B` Board, `G L` Backlog, `G S` Standup, `G I` All issues.",
        ],
        keywords: "command palette find jump navigate cmd k",
      },
      {
        id: "bulk", title: "Change many issues at once",
        summary: "Filter across projects, select issues and update them together.",
        steps: [
          "Open **All issues** (or a project's **Issues**) and set filters: status, assignee, type, priority, label, text.",
          "Tick rows, or press `X` on a row. A bar appears at the top.",
          "Set status, assignee, priority, sprint or add a label for all of them. Admins can also delete.",
          "Click **Save view** to keep the filter. Shared views appear in everyone's sidebar.",
        ],
        video: "search-bulk",
        keywords: "bulk edit select multiple filter saved view query list",
      },
    ],
  },
  {
    id: "notify", title: "Notifications",
    topics: [
      {
        id: "inbox", title: "Inbox and alerts",
        summary: "Know straight away when work is assigned to you or someone needs you.",
        steps: [
          "You're notified when you're **assigned** an issue, **@mentioned** in a comment or description, someone **comments** on an issue you watch, or its **status changes**.",
          "While Ruvano is open, a pop-up appears with an **Open** button, and a soft chime plays. The tab title shows the unread count.",
          "When you come back after being away, a summary shows what arrived.",
          "Open the bell at the top of the sidebar to see everything. Use the speaker button there to turn the sound off or on.",
        ],
        result: "You follow an issue automatically when you create it, are assigned it or comment on it.",
        keywords: "notification alert sound chime bell inbox assigned mention watch mute",
      },
    ],
  },
  {
    id: "connect", title: "GitHub, Jira and backups",
    topics: [
      {
        id: "github", title: "Connect GitHub",
        summary: "Branches, commits and pull requests show up on the issue, and statuses move by themselves.",
        steps: [
          "Open a project and click **GitHub** in its menu. Click **Connect GitHub**, allow Ruvano on GitHub, then pick the repository. Ruvano adds its webhook by itself (you need admin rights on the repository), and brings over the open issues.",
          "New issues on GitHub now appear as cards on the board within seconds. Closing one on GitHub closes its card, and reopening it brings the card back. **Fetch from GitHub** on the board gets them right away.",
          "Mention a card's key in a branch name, commit or PR title, for example `wr-12-fix-login`. Right-click a card and choose **Copy git branch command** to get a correctly named branch.",
          "To check it's working, click **Test connection** on the same page. **Your work** also shows each connected repository and when Ruvano last heard from it.",
        ],
        result: "Opening a PR moves the card to review; merging moves it to done. Moving a card to Done closes its GitHub issue, and moving it back reopens it (switch this off on the same page). Other edits stay in Ruvano. On a public repository anyone can open an issue, so you can turn issues off on the same page.",
        keywords: "github git pull request pr branch commit webhook automation connect oauth repository status working test",
      },
      {
        id: "jira", title: "Move to or from Jira",
        teamsOnly: true,
        summary: "Bring existing Jira projects in, or take a project back to Jira at any time.",
        steps: [
          "**Import**: in Jira, export your issues as **CSV (all fields)**. In Ruvano, open **Import & backup**, choose the file and a project.",
          "**Export**: in project **Settings**, click **Download Jira CSV**, then use Jira's CSV importer.",
        ],
        admin: true,
        action: { label: "Open Import & backup", href: "/settings/import" },
        keywords: "jira import export csv migrate move",
      },
      {
        id: "backup", title: "Back up your data",
        teamsOnly: true,
        summary: "Keep your own copy of everything.",
        steps: ["Open **Import & backup** and click **Download JSON backup**. Doing this weekly is a good habit."],
        admin: true,
        keywords: "backup export json download data",
      },
    ],
  },
  {
    id: "team", title: "Team and account",
    topics: [
      {
        id: "invite", title: "Invite your team",
        teamsOnly: true,
        summary: "Your workspace is private: people join through a link you send them.",
        steps: [
          "Open **Team** in the sidebar.",
          "Optionally type their email (the link then only works for that address), choose their role, and click **Create invite link**.",
          "Copy the link and send it on Slack, WhatsApp or email. It's valid for 7 days.",
          "They open it, choose a name and password, and they're in.",
        ],
        video: "invite",
        admin: true,
        keywords: "invite add member user team join",
      },
      {
        id: "roles", title: "Roles: who can do what",
        teamsOnly: true,
        summary: "Give each person the access they need. Change it any time from **Team**.",
        steps: [
          "**Viewer** can see everything but change nothing. Good for stakeholders.",
          "**Member** creates and edits issues, comments, and can start projects. Whoever leads a project can manage that project.",
          "**Manager** can also run any project: sprints, columns, GitHub, deleting issues.",
          "**Admin** can also run the workspace: people, roles, invites, import and backups.",
        ],
        keywords: "role permission access admin manager member viewer read only",
      },
      {
        id: "forgot", title: "Forgot your password",
        summary: "Request a reset link from the login page.",
        steps: [
          "On the login page, click **Forgot password?**, enter your email and send the request.",
          "A reset link reaches your email within 24 to 48 hours. Check your spam folder too.",
          "Open it and choose a new password. The link works once and expires after 48 hours.",
        ],
        result: "On a work team you don't have to wait: your admin can send you a link straight away from **Team**.",
        keywords: "forgot password reset login locked out email link",
      },
      {
        id: "reset", title: "Reset a teammate's password",
        teamsOnly: true,
        summary: "For when someone forgets their password.",
        steps: [
          "In **Team**, click the key icon next to their name.",
          "Send them the link. It works once and expires after 24 hours.",
        ],
        admin: true,
        keywords: "forgot password reset login",
      },
      {
        id: "profile", title: "Your profile and theme",
        summary: "Change your name, password and look.",
        steps: [
          "Click your name at the bottom of the sidebar.",
          "**Profile & password** to update details. Pick **Light**, **Dark** or **System** for the theme.",
        ],
        keywords: "profile password name dark mode light theme",
      },
    ],
  },
];

export const SHORTCUTS: [string, [string[], string][]][] = [
  ["Anywhere", [[["⌘", "K"], "Search and jump"], [["C"], "Create an issue"], [["/"], "Search"], [["?"], "All shortcuts"]]],
  ["Go to", [[["G", "W"], "Your work"], [["G", "P"], "Projects"], [["G", "I"], "All issues"], [["G", "B"], "Board"], [["G", "L"], "Backlog"], [["G", "S"], "Standup"]]],
  ["Side panel", [[["J"], "Next issue"], [["K"], "Previous issue"], [["M"], "Assign to me"], [["O"], "Open full page"], [["Esc"], "Close"]]],
  ["On an issue", [[["M"], "Assign to me"], [["E"], "Edit description"], [["W"], "Watch / unwatch"]]],
];
