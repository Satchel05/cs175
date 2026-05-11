import "@/styles/globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata = {
  title: "Calendar App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-secondary">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
