import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16 bg-[#FFFFFF]">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#E8F7FC] opacity-60 rounded-full blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#E6FBF8] opacity-50 rounded-full blur-[120px]"
      />

      <div className="relative z-10 max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] shadow-sm">
        {/* Logo / Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#040B1A] flex items-center justify-center p-2.5 shadow-sm">
            <Image
              src="/logo.png"
              alt="SolHealth Shield"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F7FC] border border-[#9CE0F5] font-mono text-xs font-bold text-[#075985]">
            <Search className="w-3.5 h-3.5" />
            <span>404 · Page Not Found</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#040B1A] tracking-tight">
            Record or route not found
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            The page, medical vault route, or record identifier you requested does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-dark-pill w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/patient"
            className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white hover:bg-[#F7FBFC] border border-[#DCEEF2] hover:border-[#9CE0F5] text-xs font-headline font-bold text-[#075985] transition-colors"
          >
            Open Patient Vault
          </Link>
        </div>
      </div>
    </div>
  );
}
