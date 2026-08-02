import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
// Bundle KaTeX styles locally (instead of a CDN) so math stays styled even
// when the packaged desktop app is offline.
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "GradeBoost — AI Study Tutor",
    template: "%s · GradeBoost",
  },
  description:
    "GradeBoost is your AI study tutor: chat with an AI that knows your textbook, upload sources, generate flashcards and quizzes, and ace your next exam.",
  applicationName: "GradeBoost",
  icons: {
    icon: "/studyapplogo.png",
    apple: "/studyapplogo.png",
  },
  openGraph: {
    title: "GradeBoost — AI Study Tutor",
    description: "Chat with an AI tutor that knows your textbook, then drill with flashcards and quizzes.",
    type: "website",
    images: ["/studyapplogo.png"],
  },
  twitter: {
    card: "summary",
    title: "GradeBoost — AI Study Tutor",
    description: "Chat with an AI tutor that knows your textbook, then drill with flashcards and quizzes.",
    images: ["/studyapplogo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="antialiased" style={{ fontFamily: "var(--font-inter)" }}>
        {children}
      </body>
    </html>
  );
}
