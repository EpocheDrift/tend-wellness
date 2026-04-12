import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tend",
  description: "Tend demo app scaffold",
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
