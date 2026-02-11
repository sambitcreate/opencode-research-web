import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Query Platform - OpenCode Powered",
  description: "AI-powered research and query platform leveraging OpenCode for intelligent web search and data visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
