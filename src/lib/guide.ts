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
  keywords?: string;
};

export type GuideSection = { id: string; title: string; topics: GuideTopic[] };

export const GUIDE: GuideSection[] = [
  {
    id: "start", title: "Getting started",
    topics: [
      {
        id: "tour", title: "Take the tour",
        summary: "A one-minute walkthrough that points at each part of Karya and says what it does.",
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
        summary: "Colors carry meaning in Karya, so you can scan a board without reading every word.",
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
        id: "stuck", title: "Spot stuck work",
        summary: "Karya tells you which work is waiting, so problems come up before the sprint ends.",
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
        ],
        result: "Blocked work is listed first, so the meeting spends its time on what needs help.",
        video: "standup",
        keywords: "standup daily scrum meeting timer presenter",
      },
      {
        id: "roadmap", title: "Roadmap",
        summary: "Every epic on a timeline with live progress from its child issues.",
        steps: [
          "Create an issue of type **Epic**. Give it a start and due date for an exact bar; without dates Karya estimates one.",
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
          "While Karya is open, a pop-up appears with an **Open** button, and a soft chime plays. The tab title shows the unread count.",
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
          "In project **Settings → GitHub**, click **Connect GitHub**, allow Karya on GitHub, then pick the repository. Karya adds its webhook by itself (you need admin rights on the repository).",
          "Mention the issue key in a branch name, commit or PR title, for example `wr-12-fix-login`.",
          "Right-click a card and choose **Copy git branch command** to get a correctly named branch.",
        ],
        result: "Opening a PR moves the issue to review; merging moves it to done. **Disconnect** in the same place removes the webhook again.",
        keywords: "github git pull request pr branch commit webhook automation connect oauth repository",
      },
      {
        id: "jira", title: "Move to or from Jira",
        summary: "Bring existing Jira projects in, or take a project back to Jira at any time.",
        steps: [
          "**Import**: in Jira, export your issues as **CSV (all fields)**. In Karya, open **Import & backup**, choose the file and a project.",
          "**Export**: in project **Settings**, click **Download Jira CSV**, then use Jira's CSV importer.",
        ],
        admin: true,
        action: { label: "Open Import & backup", href: "/settings/import" },
        keywords: "jira import export csv migrate move",
      },
      {
        id: "backup", title: "Back up your data",
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
        summary: "Karya has no public sign-up: people join through a link you send them.",
        steps: [
          "Open **Team** in the sidebar.",
          "Optionally type their email (the link then only works for that address), choose **Member** or **Admin**, and click **Create invite link**.",
          "Copy the link and send it on Slack, WhatsApp or email. It's valid for 7 days.",
          "They open it, choose a name and password, and they're in.",
        ],
        result: "Admins can invite people, change roles, import from Jira and download backups. Members do everything else.",
        video: "invite",
        admin: true,
        keywords: "invite add member user team role admin signup join",
      },
      {
        id: "reset", title: "Reset a teammate's password",
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
