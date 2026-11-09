import type { Metadata } from "next";
import "./globals.css";

// Local offline font definitions avoiding remote network fetches during isolated builds
const inter = {
  variable: "[--font-inter:Inter,system-ui,sans-serif]",
};

const jetbrainsMono = {
  variable: "[--font-mono:'JetBrains_Mono',monospace]",
};

export const metadata: Metadata = {
  title: "PhoneIndex | Compare Smarter. Choose Confidently.",
  description:
    "Compare smartphones with structured specifications, evidence records, four editorial perspectives, and dynamic Living Scores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("phoneindex_theme");var p=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="dark"||(!s&&p)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans antialiased selection:bg-sky-500/20 selection:text-sky-900">
        {children}
      </body>
    </html>
  );
}
