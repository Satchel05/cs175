"use client";

import { Calendar, CalendarCheck02, CalendarHeart02 } from "@untitledui/icons";
import Link from "next/link";

const navItems = [
    { label: "Calendar", href: "/calendar", icon: Calendar, description: "View and manage your schedule" },
    { label: "Events", href: "/events", icon: CalendarCheck02, description: "Browse and track your events" },
];

export function HomeScreen() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-primary px-6">
            {/* Logo + Title */}
            <div className="flex flex-col items-center gap-5">
                <CalendarHeart02 className="size-20 text-brand-secondary" />
                <h1 className="text-5xl font-bold tracking-tight text-primary">CalendarAI</h1>
                <p className="text-lg text-tertiary">Your intelligent scheduling assistant</p>
            </div>

            {/* Nav Cards */}
            <div className="grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
                {navItems.map(({ label, href, icon: Icon, description }) => (
                    <Link
                        key={href}
                        href={href}
                        className="group flex flex-col items-center gap-5 rounded-2xl border border-secondary bg-primary p-10 text-center transition duration-100 ease-linear hover:bg-secondary hover:border-primary"
                    >
                        <div className="flex size-16 items-center justify-center rounded-xl bg-brand-secondary/10 transition duration-100 ease-linear group-hover:bg-brand-secondary/20">
                            <Icon className="size-8 text-brand-secondary" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xl font-semibold text-primary">{label}</span>
                            <span className="text-base text-tertiary">{description}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
