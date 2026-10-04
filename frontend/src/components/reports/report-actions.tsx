"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ERROR, SUCCESS } from "@/lib/domain/copy";
import { startVerification } from "@/lib/services";
import type { DocumentType } from "@/lib/types/domain";

/** Restarts a failed verification as a new job (D-21: restart from the beginning). */
export function RetryVerificationButton({
  name,
  documentType,
  inputKind,
  label = "Retry",
  variant = "secondary",
  size = "sm",
}: {
  name: string;
  documentType: DocumentType;
  inputKind: "file" | "text";
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      const { jobId } = await startVerification({ name, documentType, inputKind, checkLegalStatus: true });
      toast({ message: SUCCESS.started });
      router.push(`/verify/${jobId}`);
    } catch {
      toast({ message: ERROR.start, tone: "error" });
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={retry} disabled={busy}>
      {label}
    </Button>
  );
}
