"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTrackerData } from "@/features/tracker/tracker-provider";

const navigation = [
  { href: "/", label: "Build Tracker", icon: "tracker" },
  { href: "/inventory", label: "Weapons", icon: "weapons" },
  { href: "/matrix", label: "Matrix Planner", icon: "matrix" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function NavigationIcon({ icon }: { icon: (typeof navigation)[number]["icon"] }) {
  const common = {
    className: "h-[18px] w-[18px] shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.75,
    viewBox: "0 0 24 24",
  };

  if (icon === "tracker") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M4 5.5h16M4 12h16M4 18.5h16" />
        <path d="M7 3v5M15 9.5v5M10 16v5" />
      </svg>
    );
  }

  if (icon === "weapons") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m4 20 5.5-5.5M14 4l6 6-8.5 4.5-2-2Z" />
        <path d="m7.5 16.5-2-2" />
      </svg>
    );
  }

  if (icon === "matrix") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="m8.3 8.3 2.6 7.2M15.7 8.3l-2.6 7.2M8.5 7h7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/characters/");
  }

  return pathname === href;
}

function NavigationLinks({
  pathname,
  horizontal = false,
}: {
  pathname: string;
  horizontal?: boolean;
}) {
  return (
    <nav aria-label="Primary" className={horizontal ? "flex gap-1" : "grid gap-1"}>
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25 ${
              active
                ? "bg-app-raised text-app-fg"
                : "text-app-muted-subtle hover:bg-app-surface hover:text-app-fg"
            }`}
            href={item.href}
            key={item.href}
          >
            <NavigationIcon icon={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-app-border/60 px-5 py-4 text-center text-xs text-app-muted-dim">
      <span>made by makan</span>
      <span className="mx-2">/</span>
      <a
        className="font-medium text-app-muted-subtle transition-colors hover:text-app-fg"
        href="https://github.com/makandz/wuwa-tracker"
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { storageLoaded, welcomeSeen } = useTrackerData();
  const showProductShell = storageLoaded && welcomeSeen;

  if (!showProductShell) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-app-border/80 bg-app-subtle md:flex">
        <div className="border-b border-app-border/70 px-5 py-5">
          <Link
            className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
            href="/"
          >
            <div className="text-base font-semibold text-app-fg">WuWa Tracker</div>
            <div className="mt-0.5 text-xs text-app-muted-dim">Build planning</div>
          </Link>
        </div>

        <div className="grid flex-1 content-start gap-5 px-3 py-4">
          <Link
            aria-current={pathname === "/add" ? "page" : undefined}
            className={`flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25 ${
              pathname === "/add"
                ? "border-app-accent bg-app-accent-soft text-app-fg"
                : "border-app-accent-strong bg-app-accent-strong text-app-bg hover:bg-app-accent"
            }`}
            href="/add"
          >
            Add Character
          </Link>
          <NavigationLinks pathname={pathname} />
        </div>

        <div className="border-t border-app-border/70 px-5 py-4 text-xs leading-5 text-app-muted-dim">
          Data stays in this browser.
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:pl-[232px]">
        <div className="sticky top-0 z-30 border-b border-app-border/80 bg-app-subtle md:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link className="font-semibold text-app-fg" href="/">
              WuWa Tracker
            </Link>
            <Link
              className="rounded-md border border-app-accent-strong bg-app-accent-strong px-3 py-2 text-xs font-semibold text-app-bg"
              href="/add"
            >
              Add Character
            </Link>
          </div>
          <div className="overflow-x-auto px-3 pb-2">
            <div className="min-w-max">
              <NavigationLinks horizontal pathname={pathname} />
            </div>
          </div>
        </div>

        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
