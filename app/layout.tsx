import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueForm - Custom Tailoring",
  description: "Custom tailoring, perfectly fitted for you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
