import { redirect } from "next/navigation";

/**
 * No standalone home dashboard yet — redirect to the calendar.
 * Replace this once you build a real home view.
 */
export default function HomePage() {
  redirect("/calendar");
}
