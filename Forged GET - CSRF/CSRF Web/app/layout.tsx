import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Account Security Lab",
  description: "A local CSRF Variant 1 demonstration and mitigation lab.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
