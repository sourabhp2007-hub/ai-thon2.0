import { ErrorState } from "@/components/feedback/states";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <ErrorState
        title="Page not found"
        body="The page you’re looking for doesn’t exist or has moved."
        action={<ButtonLink href="/dashboard">Go to Dashboard</ButtonLink>}
      />
    </div>
  );
}
