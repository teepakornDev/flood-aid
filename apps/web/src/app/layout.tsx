import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FloodAid",
  description: "สถานะการเชื่อมต่อระบบ FloodAid",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
