import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TrackerProvider } from "./_tracker/tracker-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wuthering Waves Build Tracker",
  description: "Track Wuthering Waves character builds, echo stats, roles, and completion.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0d1218",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-app-bg text-app-fg">
        <TrackerProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <footer className="border-t border-app-border/60 px-4 py-4 text-center text-sm text-app-muted-subtle sm:px-6 lg:px-8">
              <span>made by makan</span>
              <span className="mx-2 text-app-muted-dim">/</span>
              <a
                className="font-medium text-app-accent transition hover:text-app-accent-hover"
                href="https://github.com/makandz/wuwa-tracker"
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </footer>
          </div>
        </TrackerProvider>
      </body>
    </html>
  );
}
