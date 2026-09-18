import { JetBrains_Mono, Lato, Syncopate } from "next/font/google";
import type { FC, ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Toaster } from "sonner";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "700"],
});
const syncopate = Syncopate({
  variable: "--font-syncopate",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
});

interface Props {
  children: ReactNode;
}

export const Document: FC<Props> = ({ children }) => (
  <html
    lang="en"
    className={cn(lato.variable, syncopate.variable, jetbrainsMono.variable, "h-full antialiased")}
  >
    <body className="flex min-h-full flex-col font-sans text-foreground">
      {children}
      <Toaster position="bottom-right" closeButton richColors />
    </body>
  </html>
);
