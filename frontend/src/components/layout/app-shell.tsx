"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GlobalSearch } from "@/components/navigation/global-search";
import { Wordmark } from "@/components/navigation/logo";
import { isActive, PRIMARY_NAV, SETTINGS_NAV, type NavItem } from "@/components/navigation/nav-items";
import { Tooltip } from "@/components/ui/tooltip";
import { BackgroundJobsWatcher } from "@/components/verification/background-jobs";
import type { SearchEntry } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const COLLAPSE_KEY = "li-sidebar-collapsed";

function SidebarLink({ item, collapsed, pathname, onNavigate }: { item: NavItem; collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  const active = isActive(item, pathname);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
        active ? "bg-white/10 font-medium text-white" : "text-white/55 hover:bg-white/5 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon className="size-[18px] shrink-0" aria-hidden />
      {!collapsed && item.label}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function SidebarBody({ collapsed, pathname, demo, onNavigate }: { collapsed: boolean; pathname: string; demo: boolean; onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} onNavigate={onNavigate} />
        ))}
        <div className="my-3 border-t border-white/10" role="separator" />
        <SidebarLink item={SETTINGS_NAV} collapsed={collapsed} pathname={pathname} onNavigate={onNavigate} />
      </nav>
      {demo && !collapsed && (
        <div className="px-3 pb-2">
          <Link
            href="/settings#data"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-[#c4b5fd] hover:bg-accent/15"
          >
            <span className="size-1.5 rounded-full bg-[#a78bfa]" aria-hidden />
            Demo workspace
          </Link>
        </div>
      )}
    </>
  );
}

/** Workspace frame: sidebar (desktop), top bar, bottom bar (mobile). */
export function AppShell({ children, searchIndex, demo, notifyOnComplete }: { children: ReactNode; searchIndex: SearchEntry[]; demo: boolean; notifyOnComplete: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      // Restore a per-viewer convenience preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-[90] rounded-md bg-primary px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-black py-4 transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Link href="/dashboard" className={cn("mb-6 flex px-4", collapsed && "justify-center px-0")} aria-label="AI Legal Integrity — Dashboard">
          <Wordmark collapsed={collapsed} />
        </Link>
        <SidebarBody collapsed={collapsed} pathname={pathname} demo={demo} />
        <div className={cn("px-3", collapsed && "flex justify-center")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn("flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-white/55 hover:bg-white/5 hover:text-white", collapsed && "px-2.5")}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
            {collapsed ? <span className="sr-only">Expand sidebar</span> : "Collapse sidebar"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-black/80 px-4 backdrop-blur-md md:px-6">
          <RadixDialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <RadixDialog.Trigger asChild>
              <button type="button" aria-label="Open menu" className="-ml-1 rounded-md p-1.5 text-ink hover:bg-white/8 lg:hidden">
                <Menu className="size-5" aria-hidden />
              </button>
            </RadixDialog.Trigger>
            <RadixDialog.Portal>
              <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 lg:hidden" />
              <RadixDialog.Content
                aria-describedby={undefined}
                className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-black py-4 motion-safe:animate-[sheet-left_200ms_ease-out] lg:hidden"
              >
                <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
                <div className="mb-6 flex items-center justify-between px-4">
                  <Wordmark />
                  <RadixDialog.Close aria-label="Close menu" className="rounded-md p-1 text-white/70 hover:text-white">
                    <X className="size-5" aria-hidden />
                  </RadixDialog.Close>
                </div>
                <SidebarBody collapsed={false} pathname={pathname} demo={demo} onNavigate={() => setMenuOpen(false)} />
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>

          <div className="flex min-w-0 flex-1">
            <GlobalSearch index={searchIndex} />
          </div>
          <Tooltip content="Demo user">
            <span
              tabIndex={0}
              aria-label="Demo user"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white"
            >
              DU
            </span>
          </Tooltip>
        </header>

        <BackgroundJobsWatcher enabled={notifyOnComplete} />
        <main id="main" className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-black/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-4">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[11px]", active ? "font-medium text-white" : "text-subtle")}
                  >
                    <item.icon className="size-5" aria-hidden />
                    {item.mobileLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
