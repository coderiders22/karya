import { redirect } from "next/navigation";

/** First-run setup became sign-up: anyone can now create their own workspace. */
export default function SetupPage() {
  redirect("/signup");
}
