import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
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
  metadataBase: new URL("https://sol-health-two.vercel.app"),
  title: "SolHealth: Confidential Medical Vault on Solana",
  description:
    "A patient-sovereign medical vault designed for executives, public officials and service members. Client-side AES-256-GCM encryption, IPFS ciphertext storage, and an immutable audit trail on Solana.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SolHealth: Confidential Medical Vault on Solana",
    description:
      "A patient-sovereign medical vault designed for executives, public officials and service members. Encrypted locally, pinned on IPFS, and governed by on-chain hashes and access rules.",
    url: "https://sol-health-two.vercel.app",
    siteName: "SolHealth",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "SolHealth Shield Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SolHealth: Confidential Medical Vault on Solana",
    description:
      "A patient-sovereign medical vault designed for executives, public officials and service members. Encrypted in your browser, governed on Solana.",
    images: ["/logo.png"],
  },
  other: {
    "color-scheme": "light",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
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
      className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#1E293B] font-body selection:bg-[#E6FBF8] selection:text-[#065F6B]"
      >
        <Providers>
          <Navbar />
          <main className="flex-1 w-full flex flex-col pt-20 md:pt-24">
            {children}
          </main>
          <WalletModal />
          {isGuideEnabled && <GuideLauncher />}
          <footer className="border-t border-[#DCEEF2] bg-[#FFFFFF] py-8 px-4 sm:px-6 lg:px-8 mt-auto">
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#64748B]">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#040B1A] flex items-center justify-center p-1.5 shadow-sm shrink-0">
                  <Image
                    src="/logo.png"
                    alt="SolHealth Shield"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-headline font-extrabold text-sm text-[#040B1A] tracking-tight">
                    SolHealth
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    Confidential medical vault
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-wrap items-center justify-center gap-5 font-headline font-semibold text-xs text-[#1E293B]">
                <Link href="/" className="hover:text-[#00B8D9] transition-colors">Home</Link>
                <Link href="/publisher" className="hover:text-[#00B8D9] transition-colors">Publisher</Link>
                <Link href="/patient" className="hover:text-[#00B8D9] transition-colors">Patient</Link>
                <Link href="/doctor" className="hover:text-[#00B8D9] transition-colors">Doctor</Link>
                <Link href="/audit" className="hover:text-[#00B8D9] transition-colors">Audit</Link>
                <Link href="/#contact" className="hover:text-[#00B8D9] transition-colors">Contact</Link>
              </div>

              {/* Network notice */}
              <div className="font-mono text-[11px] text-[#64748B] text-center md:text-right">
                Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"} · Hashes &amp; access rules only
              </div>
            </div>

            {/* Prototype Disclaimer */}
            <div className="max-w-[1200px] mx-auto mt-6 pt-4 border-t border-[#DCEEF2] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11.5px] font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14D9C4] animate-pulse" />
                <span>Prototype running on Solana Devnet. Test network, no real money. Do not upload real medical data.</span>
              </div>
              <div className="text-[10.5px] text-[#94A3B8]">
                Not certified for regulated or classified data.
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
