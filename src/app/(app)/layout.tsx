import { Sidebar } from "@/components/layout/sidebar";
import { CalendarEventsProvider } from "@/providers/calendar-events-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <CalendarEventsProvider>
            <div className="flex h-screen bg-secondary">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </CalendarEventsProvider>
    );
}
