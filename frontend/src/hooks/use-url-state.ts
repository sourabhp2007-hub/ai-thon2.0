"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Merges changes into the current query string. URL state keeps filters,
 * open drawers and tabs shareable and makes Back close a drawer.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefWith = useCallback(
    (changes: Record<string, string | null>, path = pathname) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      return `${path}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams],
  );

  const update = useCallback(
    (changes: Record<string, string | null>, opts: { push?: boolean } = {}) => {
      const href = hrefWith(changes);
      if (opts.push) router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [hrefWith, router],
  );

  return { searchParams, hrefWith, update };
}
