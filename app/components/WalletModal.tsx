"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useSolhealth } from "@/lib/solhealth-context";
import { X, ExternalLink } from "lucide-react";

export function WalletModal() {
  const { isWalletModalOpen, closeWalletModal, wallets, selectWallet } =
    useSolhealth();

  // Close on Escape key
  useEffect(() => {
    if (!isWalletModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeWalletModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWalletModalOpen, closeWalletModal]);

  if (!isWalletModalOpen) return null;

  const installedWallets = wallets.filter(
    (w) => w.readyState === "Installed" || w.readyState === "Loadable"
  );
  const otherWallets = wallets.filter(
    (w) => w.readyState !== "Installed" && w.readyState !== "Loadable"
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#040B1A]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeWalletModal}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-[#FFFFFF] border border-[#DCEEF2] shadow-[0_24px_50px_rgba(4,11,26,0.18)] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#DCEEF2]">
          <div>
            <h3
              id="wallet-modal-title"
              className="font-headline font-bold text-lg text-[#040B1A]"
            >
              Connect a Wallet
            </h3>
            <p className="text-xs text-[#64748B]">
              Select your Solana wallet to access SolHealth
            </p>
          </div>
          <button
            data-ui="btn"
            onClick={closeWalletModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#040B1A] hover:bg-[#F7FBFC] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallets list */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {installedWallets.length > 0 ? (
            installedWallets.map((w) => (
              <button
                key={w.adapter.name}
                type="button"
                onClick={() => selectWallet(w.adapter.name)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#FFFFFF] border border-[#DCEEF2] shadow-xs hover:border-[#00B8D9] hover:bg-[#F7FBFC] transition-all group"
              >
                <div className="flex items-center gap-3">
                  {w.adapter.icon && (
                    <Image
                      src={w.adapter.icon}
                      alt={w.adapter.name}
                      width={28}
                      height={28}
                      className="rounded-full"
                      unoptimized
                    />
                  )}
                  <span className="font-headline font-bold text-sm text-[#040B1A] group-hover:text-[#075985]">
                    {w.adapter.name}
                  </span>
                </div>
                <span data-ui="pill" className="status-pill status-pill-ok">
                  Detected
                </span>
              </button>
            ))
          ) : (
            <div className="p-5 text-center rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] space-y-3">
              <p className="text-sm font-medium text-[#075985]">
                No installed Solana wallets detected.
              </p>
              <a
                data-ui="btn"
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-btn glass-btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <span>Install Phantom</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Other wallets that may be loadable via wallet standard */}
          {otherWallets.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase text-[#64748B] px-2 pb-1.5">
                More Wallets
              </div>
              <div className="space-y-1.5">
                {otherWallets.slice(0, 4).map((w) => (
                  <button
                    key={w.adapter.name}
                    type="button"
                    onClick={() => selectWallet(w.adapter.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] hover:bg-white hover:border-[#9CE0F5] transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {w.adapter.icon && (
                        <Image
                          src={w.adapter.icon}
                          alt={w.adapter.name}
                          width={22}
                          height={22}
                          className="rounded-full"
                          unoptimized
                        />
                      )}
                      <span className="font-medium text-[#040B1A]">
                        {w.adapter.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] font-headline font-semibold">Connect</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#DCEEF2] flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-mono text-[11px]">Wallet Standard auto-discovery</span>
          <button
            type="button"
            onClick={closeWalletModal}
            className="hover:text-[#040B1A] font-headline font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}