import "@/styles/globals.css";
import { CalendarEventsProvider } from "@/providers/calendar-events-provider";

export const metadata = {
  title: "Calendar App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CalendarEventsProvider>{children}</CalendarEventsProvider>
      </body>
    </html>
  );
}
