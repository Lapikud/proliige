import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { FC } from "react";
import { Document } from "~/components/document";
import { Navbar } from "~/components/navbar";
import { site } from "~/config/site";
import { env } from "~/env.config";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.fullName,
    title: site.name,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    title: site.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: site.colors.ink,
  colorScheme: "light",
};

const RootLayout: FC<LayoutProps<"/">> = ({ children }) => (
  <Document>
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-white"
    >
      Skip to content
    </a>
    <Navbar />
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      {children}
    </main>
  </Document>
);

export default RootLayout;
