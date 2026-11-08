import type { Priority, StatusCategory } from "@prisma/client";

/**
 * What a student project starts with: the right columns and the steps people usually forget.
 * `at` is how far through the time until the deadline a step should be done (0 to 1), so the same
 * template works for a hackathon that ends on Sunday and a major project due in six months.
 */
type Task = { title: string; at: number; note?: string; priority?: Priority };

export type Template = {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  deadlineLabel: string;
  /** Usually one person: skip the "invite your team" step after creating it. */
  solo?: boolean;
  columns: [string, StatusCategory][];
  tasks: Task[];
};

const WITH_GUIDE: Template["columns"] = [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["With guide", "IN_PROGRESS"], ["Done", "DONE"]];

export const TEMPLATES: Template[] = [
  {
    id: "major", label: "Major project", hint: "Final-year project, from topic to viva",
    placeholder: "Smart attendance system", deadlineLabel: "Final submission", columns: WITH_GUIDE,
    tasks: [
      { title: "Finalise the topic and get your guide's approval", at: 0.05, priority: "HIGH", note: "Write down the problem, why it matters and what you'll build. Get sign-off before going further." },
      { title: "Write the synopsis", at: 0.1, note: "Problem statement, objectives, scope, proposed method and tools." },
      { title: "Literature survey", at: 0.2, note: "Read existing work, note what it misses, and keep the references for your report." },
      { title: "Requirements and design", at: 0.3, note: "SRS, architecture and database design." },
      { title: "Set up the repository and split the work", at: 0.35, note: "Connect GitHub in project settings, and assign each module to someone." },
      { title: "Mid-term review and demo", at: 0.5, priority: "HIGH", note: "Show what works so far and note your guide's feedback here." },
      { title: "Finish building the core features", at: 0.7 },
      { title: "Test and fix bugs", at: 0.8 },
      { title: "Write the project report", at: 0.88, note: "Follow your department's format. Keep screenshots and results as you go." },
      { title: "Make the presentation and rehearse", at: 0.94, note: "Everyone should be able to explain the whole project, not only their part." },
      { title: "Final submission and viva", at: 1, priority: "HIGHEST" },
    ],
  },
  {
    id: "minor", label: "Minor project", hint: "Semester project with a demo at the end",
    placeholder: "Library management app", deadlineLabel: "Final submission", columns: WITH_GUIDE,
    tasks: [
      { title: "Finalise the topic and get your guide's approval", at: 0.1, priority: "HIGH" },
      { title: "List the features and split the work", at: 0.2, note: "Decide what's a must-have and what's only nice to have." },
      { title: "Build the core features", at: 0.6 },
      { title: "Test and fix bugs", at: 0.75 },
      { title: "Write the report", at: 0.88 },
      { title: "Presentation and viva", at: 1, priority: "HIGHEST" },
    ],
  },
  {
    id: "hackathon", label: "Hackathon", hint: "Fast team sprint with a hard deadline",
    placeholder: "Smart India Hackathon", deadlineLabel: "Submission deadline",
    columns: [["To do", "TODO"], ["Building", "IN_PROGRESS"], ["Testing", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [
      { title: "Register the team and read the rules", at: 0.02, priority: "HIGH", note: "Check team size, what's allowed, judging criteria and what you must submit." },
      { title: "Pick the problem statement and lock the idea", at: 0.1, priority: "HIGH" },
      { title: "Split the work and set up the repository", at: 0.15, note: "Connect GitHub in project settings so cards move as you push." },
      { title: "Build a working demo", at: 0.65, note: "One flow that works end to end beats five half-done features." },
      { title: "Deploy it so judges can open it", at: 0.75 },
      { title: "Make the pitch deck", at: 0.85, note: "Problem, solution, demo, tech used, impact, team." },
      { title: "Record the demo video", at: 0.92 },
      { title: "Submit before the deadline", at: 1, priority: "HIGHEST", note: "Submit early. Portals slow down in the last few minutes." },
    ],
  },
  {
    id: "research", label: "Research paper", hint: "From literature review to submission",
    placeholder: "Survey of federated learning", deadlineLabel: "Submission deadline",
    columns: [["To do", "TODO"], ["Writing", "IN_PROGRESS"], ["With guide", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [
      { title: "Choose the topic and target conference or journal", at: 0.05, priority: "HIGH", note: "Check its format, page limit and deadline." },
      { title: "Literature review", at: 0.3 },
      { title: "Run experiments or collect data", at: 0.55 },
      { title: "Write the first draft", at: 0.75 },
      { title: "Review with your guide and co-authors", at: 0.87 },
      { title: "Check plagiarism, format and submit", at: 1, priority: "HIGHEST" },
    ],
  },
  {
    id: "event", label: "Club or fest event", hint: "Permissions, sponsors, publicity, the day itself",
    placeholder: "TechFest 2026", deadlineLabel: "Event date",
    columns: [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["Waiting on others", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [
      { title: "Fix the date, venue and budget", at: 0.1, priority: "HIGH" },
      { title: "Get permissions from the college", at: 0.2, priority: "HIGH" },
      { title: "Reach out to sponsors", at: 0.4 },
      { title: "Publicity and registrations", at: 0.6 },
      { title: "Confirm speakers, judges and prizes", at: 0.75 },
      { title: "Final run-through", at: 0.95 },
      { title: "Event day", at: 1, priority: "HIGHEST" },
    ],
  },
  {
    id: "group", label: "Group assignment", hint: "Split it up and submit on time",
    placeholder: "DBMS case study", deadlineLabel: "Due date",
    columns: [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["Review", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [
      { title: "Split the work between everyone", at: 0.1, priority: "HIGH" },
      { title: "Finish each part", at: 0.7 },
      { title: "Combine and review together", at: 0.9 },
      { title: "Submit", at: 1, priority: "HIGHEST" },
    ],
  },
  {
    id: "placement", label: "Placement prep", hint: "Resume, practice and interviews", solo: true,
    placeholder: "Placement prep", deadlineLabel: "Placement season starts",
    columns: [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [
      { title: "Update your resume", at: 0.05, priority: "HIGH" },
      { title: "Shortlist companies and note their rounds", at: 0.1 },
      { title: "Daily coding practice", at: 0.6 },
      { title: "Revise core subjects: OS, DBMS, networks", at: 0.7 },
      { title: "Be ready to explain your projects", at: 0.8 },
      { title: "Mock interviews", at: 0.9 },
    ],
  },
  {
    id: "semester", label: "Semester plan", hint: "Your own list: exam prep, lab files, assignments", solo: true,
    placeholder: "Semester 5", deadlineLabel: "Exams start",
    columns: [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["Revising", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [],
  },
  {
    id: "blank", label: "Something else", hint: "An empty board",
    placeholder: "College app", deadlineLabel: "Deadline",
    columns: [["To do", "TODO"], ["Doing", "IN_PROGRESS"], ["Done", "DONE"]],
    tasks: [],
  },
];

export const templateById = (id: string | null | undefined) => TEMPLATES.find((t) => t.id === id);

/** The three students reach for most: shown first on an empty Today. */
export const MAIN_TEMPLATES = ["major", "minor", "hackathon"];

/** Project keys show up in branch names, so make them readable. "Smart India Hackathon" gives SIH. */
export function keyFromName(name: string) {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^[0-9]+/, "");
  const initials = clean(name.split(/\s+/).map((word) => word[0] ?? "").join(""));
  const key = initials.length >= 2 ? initials : clean(name).slice(0, 4);
  return key.length >= 2 ? key.slice(0, 8) : "TEAM";
}
