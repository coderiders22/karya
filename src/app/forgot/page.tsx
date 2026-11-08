import Link from "next/link";
import { AuthCard } from "@/components/AuthForm";
import { ForgotForm } from "@/components/PasswordRequests";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={<>On a work team? Your admin can send you a link straight away from the Team page. <Link href="/login" className="font-medium text-brand hover:underline">Back to log in</Link></>}
    >
      <ForgotForm />
    </AuthCard>
  );
}
