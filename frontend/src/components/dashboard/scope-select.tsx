"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";

/** "Showing:" selector for the dashboard overview scope (D-02). */
export function ScopeSelect({ options, value }: { options: { value: string; label: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="overview-scope" className="text-[13px] text-muted">
        Showing:
      </label>
      <Select
        id="overview-scope"
        value={value}
        className="h-8 w-auto max-w-[min(26rem,70vw)] text-[13px]"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === "all") params.delete("scope");
          else params.set("scope", e.target.value);
          params.delete("status");
          router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
