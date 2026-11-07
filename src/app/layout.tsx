import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

// Every page reads the database, so never pre-render at build time (no DB is available during docker build).
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a1a18" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0b" },
  ],
};

export const metadata: Metadata = { title: { default: "Karya", template: "%s · Karya" }, description: "Issue tracking for software teams" };

// Applies the saved theme ("light" | "dark" | "system") before first paint, and follows the OS when on "system".
const themeScript = `try{var m=matchMedia('(prefers-color-scheme: dark)');var a=function(){var t=localStorage.getItem('theme')||'system';document.documentElement.classList.toggle('dark',t==='dark'||(t==='system'&&m.matches))};a();m.addEventListener('change',a)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextTopLoader color="#17a383" height={2} showSpinner={false} shadow="0 0 8px #17a383" />
        {children}
        <Toaster position="bottom-right" toastOptions={{ className: "!rounded-lg !text-[13px] !font-sans !shadow-lg" }} />
      </body>
    </html>
  );
}
