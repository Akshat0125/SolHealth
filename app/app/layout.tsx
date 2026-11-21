import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "@/lib/polyfills";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { WalletModal } from "@/components/WalletModal";
import { GuideLauncher } from "@/components/guide/GuideLauncher";
import { CLUSTER } from "@/lib/config";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SolHealth - Sovereign Medical Records",
  description: "Client-side encrypted health records on Solana and IPFS",
  other: {
    "color-scheme": "light",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9c933",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isGuideEnabled = process.env.NEXT_PUBLIC_ENABLE_GUIDE !== "false";

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#fffdf6] text-[#1b1f2a]"
      >
        <Providers>
          <Navbar />
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>
          <WalletModal />
          {isGuideEnabled && <GuideLauncher />}
          <footer className="border-t border-[rgba(27,31,42,0.06)] bg-[#ffffff]/60 backdrop-blur-md py-6 px-4 mt-auto">
            <div className="max-w-[1200px] mx-auto text-center font-mono text-xs text-[#6b7280]">
              Running on Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}. Test network, no real money.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
