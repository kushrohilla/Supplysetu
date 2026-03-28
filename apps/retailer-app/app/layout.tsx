import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retailer App",
  description: "Retailer ordering app for SupplySetu distributors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
