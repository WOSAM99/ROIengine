import Link from "next/link";
import { BarChart3, MessageSquare, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  companyName: string;
  userEmail: string;
  children: React.ReactNode;
  activePath?: string;
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/uploads", label: "Uploads", icon: Upload },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ companyName, userEmail, children, activePath }: AppShellProps) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="from-card/95 via-card/80 to-background/60 sticky top-0 z-30 border-b border-black/5 bg-gradient-to-b backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6 sm:gap-8">
            <Link href="/dashboard" className="flex items-baseline gap-2">
              <span className="text-gradient-primary font-mono text-base font-bold tracking-tight">
                ROI
              </span>
              <span className="text-muted-foreground hidden text-[11px] tracking-wider uppercase sm:inline">
                Dashboard
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const isActive = activePath ? activePath.startsWith(item.href) : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150",
                      isActive
                        ? "text-accent-700 from-accent-100 to-accent-50 ring-accent-200/60 bg-gradient-to-r ring-1"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden max-w-[180px] min-w-0 text-right text-xs leading-tight sm:block">
              <div className="truncate font-semibold">{companyName}</div>
              <div className="text-muted-foreground truncate">{userEmail}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8 lg:py-10">
        {children}
      </main>

      <nav className="bg-card/90 fixed inset-x-0 bottom-0 z-30 flex border-t border-black/5 backdrop-blur-md md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activePath ? activePath.startsWith(item.href) : false;
          return (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] tracking-wider uppercase transition-colors duration-150",
                isActive ? "text-accent-700" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-colors",
                  isActive &&
                    "from-accent-100 to-accent-50 ring-accent-200/60 bg-gradient-to-r ring-1",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
