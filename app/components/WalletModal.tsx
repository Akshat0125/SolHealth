"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useSolhealth } from "@/lib/solhealth-context";
import { GlassButton } from "./GlassButton";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeWalletModal}
    >
      <div
        className="w-full max-w-[420px] rounded-[28px] bg-[#fffdf6]/95 border border-[rgba(255,255,255,0.9)] shadow-[0_24px_50px_rgba(27,31,42,0.18)] p-6 space-y-5"
        style={{ backdropFilter: "blur(20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(27,31,42,0.08)]">
          <div>
            <h3
              id="wallet-modal-title"
              className="font-headline font-bold text-lg text-[#1b1f2a]"
            >
              Connect a Wallet
            </h3>
            <p className="text-xs text-[#6b7280]">
              Select your Solana wallet to enter SolHealth
            </p>
          </div>
          <button
            data-ui="btn"
            onClick={closeWalletModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#1b1f2a] hover:bg-black/5 transition-colors"
            aria-label="Close modal"
          >
            ✕
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
                className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] bg-white border border-[rgba(27,31,42,0.08)] shadow-xs hover:border-[#f9c933] hover:bg-[#fff9e6] transition-all group"
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
                  <span className="font-headline font-bold text-sm text-[#1b1f2a] group-hover:text-[#8a5a00]">
                    {w.adapter.name}
                  </span>
                </div>
                <span data-ui="pill" className="text-xs font-mono font-medium text-[#17803d] bg-[#e3f6e9] px-2 py-0.5 rounded-full status-pill status-pill-ok">
                  Detected
                </span>
              </button>
            ))
          ) : (
            <div className="p-5 text-center rounded-[20px] bg-[#fff8d6] border border-[#fde293] space-y-3">
              <p className="text-sm font-medium text-[#8a5a00]">
                No installed Solana wallets detected.
              </p>
              <a
                data-ui="btn"
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f9c933] text-[#1b1f2a] font-headline font-bold text-xs shadow-xs hover:bg-[#ebd052] transition-colors"
              >
                Install Phantom ↗
              </a>
            </div>
          )}

          {/* Other wallets that may be installed via browser store */}
          {otherWallets.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase text-[#6b7280] px-2 pb-1.5">
                More Wallets
              </div>
              <div className="space-y-1.5">
                {otherWallets.slice(0, 4).map((w) => (
                  <button
                    key={w.adapter.name}
                    type="button"
                    onClick={() => selectWallet(w.adapter.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-[16px] bg-white/70 border border-[rgba(27,31,42,0.06)] hover:bg-white transition-all text-xs"
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
                      <span className="font-medium text-[#1b1f2a]">
                        {w.adapter.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6b7280]">Connect</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[rgba(27,31,42,0.06)] flex items-center justify-between text-xs text-[#6b7280]">
          <span>Wallet Standard auto-discovery</span>
          <button
            type="button"
            onClick={closeWalletModal}
            className="hover:text-[#1b1f2a] font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
