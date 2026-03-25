import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distributor Admin",
  description: "Operational shell for distributor workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
