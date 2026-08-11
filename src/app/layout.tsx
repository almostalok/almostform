import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Experience Forms — Interactive Forms MVP",
  description: "Create interactive forms, publish them, collect responses, and evaluate hiring applications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
