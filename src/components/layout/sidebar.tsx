"use client";

import { Calendar, CalendarCheck02, HomeLine, SearchLg, Settings01, CalendarHeart02 } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Minimal sidebar nav.
 *
 * UUI's full SidebarNavigation component (with collapse, sub-items, account
 * footer, etc.) lives in `components/application/app-navigation/*` and is
 * partly PRO. This is a hand-built version that uses UUI's design tokens
 * (text-primary, bg-secondary, hover states) so it sits cohesively next to
 * the rest of the system. Swap in UUI's nav later if you upgrade.
 */

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const primaryNav: NavItem[] = [
    { label: "Home", href: "/home", icon: HomeLine },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Events", href: "/events", icon: CalendarCheck02 },
];

const secondaryNav: NavItem[] = [{ label: "Settings", href: "/settings", icon: Settings01 }];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-secondary bg-primary md:flex">
            {/* Brand */}
            <div className="flex h-16 items-center gap-2 px-5 pt-3">
                <CalendarHeart02 className="size-7 text-brand-secondary"></CalendarHeart02>
                <span className="translate-y-px text-[15px] font-semibold leading-none tracking-tight text-primary">
                    CalendarAI
                </span>
            </div>

            {/* Search (visual only — wire up later) */}
            <div className="px-3 pt-3">
                <div className="flex h-9 items-center gap-2 rounded-lg border border-secondary bg-primary px-3 text-sm text-tertiary hover:bg-secondary">
                    <SearchLg className="size-4" />
                    <span>Search</span>
                    <kbd className="ml-auto rounded border border-secondary px-1.5 py-0.5 text-[10px] text-quaternary">⌘K</kbd>
                </div>
            </div>

            <NavSection items={primaryNav} pathname={pathname} />

            <div className="mt-auto">
                <NavSection items={secondaryNav} pathname={pathname} />

                {/* Account footer */}
                <div className="flex items-center gap-3 border-t border-secondary px-3 py-3">
                    <div className="size-8 rounded-full bg-utility-brand-100" />
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-primary">Elliott Escalante</span>
                        <span className="truncate text-[12px] text-tertiary">elliott@example.com</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function NavSection({ items, pathname }: { items: NavItem[]; pathname: string }) {
    return (
        <nav className="flex flex-col gap-0.5 px-3 py-1">
            {items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`flex h-9 items-center gap-2.5 rounded-md px-3 text-[13.5px] font-medium transition-colors ${
                            active ? "bg-secondary text-primary" : "text-secondary hover:bg-secondary hover:text-primary"
                        }`}
                    >
                        <Icon className={`size-4 ${active ? "text-brand-secondary" : "text-tertiary"}`} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
