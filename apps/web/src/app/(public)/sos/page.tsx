import type { Metadata } from "next";
import { SosNotice } from "../../../features/sos/sos-notice";
import { SosTracker } from "../../../features/sos/sos-tracker";

export const metadata: Metadata = { title: "ติดตามคำขอ SOS | FloodAid", referrer: "no-referrer" };

export default function SosTrackingPage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-7 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">ติดตามคำขอ SOS</h1>
      <SosNotice />
      <SosTracker />
    </main>
  );
}
