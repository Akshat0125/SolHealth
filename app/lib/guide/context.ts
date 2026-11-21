"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSolhealth, EncryptionStatus } from "@/lib/solhealth-context";
import { CLUSTER } from "@/lib/config";

export interface GuideContextData {
  mounted: boolean;
  connected: boolean;
  connecting: boolean;
  address: string | null;
  shortAddress: string;
  balance: number;
  lowBalance: boolean;
  encryptionStatus: EncryptionStatus;
  isPublisher: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  cluster: string;
  programDeployed: boolean | null;
  activeRole: "patient" | "doctor" | "publisher" | "audit" | "home";
}

export interface NextStepResult {
  sentence: string;
  route?: string;
  label?: string;
}

export function deriveActiveRole(pathname: string | null): "patient" | "doctor" | "publisher" | "audit" | "home" {
  if (!pathname || pathname === "/") return "home";
  if (pathname.includes("/patient")) return "patient";
  if (pathname.includes("/doctor")) return "doctor";
  if (pathname.includes("/publisher")) return "publisher";
  if (pathname.includes("/audit")) return "audit";
  return "home";
}

/**
 * Determine the recommended next action mirroring SolHealth role checklists.
 */
export function getNextStep(ctx: Partial<GuideContextData>, currentPath?: string): NextStepResult {
  const role = deriveActiveRole(currentPath || null);

  // 1. Not connected
  if (!ctx.connected || !ctx.address) {
    return {
      sentence: "Connect your Solana wallet to get started with SolHealth.",
      route: "/",
      label: "Connect wallet",
    };
  }

  // 2. Low balance (< 0.002 SOL)
  if (ctx.lowBalance || (typeof ctx.balance === "number" && ctx.balance < 0.002)) {
    return {
      sentence: "Your wallet balance is low; request free Devnet SOL from the faucet to pay network fees.",
      route: "/publisher",
      label: "Check balance",
    };
  }

  // 3. Encryption session not ready
  if (ctx.encryptionStatus !== "ready") {
    return {
      sentence: "Activate your encryption session to securely encrypt or decrypt medical files in your browser.",
      route: role === "home" ? "/patient" : undefined,
      label: "Activate encryption",
    };
  }

  // 4. Role-specific next steps
  switch (role) {
    case "patient":
      return {
        sentence: "Upload and encrypt your first medical record in step 1, or share an existing record with a verified doctor.",
        route: "/patient",
        label: "Patient records",
      };
    case "doctor":
      if (!ctx.isDoctor) {
        return {
          sentence: "Your wallet is not verified as a doctor yet; share your address with the Publisher to get verified.",
          route: "/doctor",
          label: "Doctor license",
        };
      }
      return {
        sentence: "Inspect records shared with your doctor address, verify access on-chain, and decrypt them.",
        route: "/doctor",
        label: "Shared records",
      };
    case "publisher":
      return {
        sentence: "Verify licensed doctor addresses in step 2 to grant them credential access to the protocol.",
        route: "/publisher",
        label: "Doctor directory",
      };
    case "audit":
      return {
        sentence: "Filter protocol events by category or export the complete cryptographic timeline as a CSV file.",
        route: "/audit",
        label: "Audit log",
      };
    case "home":
    default:
      return {
        sentence: "Choose a role to continue: Patient to upload records, Doctor to review shared files, or Publisher to manage credentials.",
        route: "/patient",
        label: "Go to Patient",
      };
  }
}

/**
 * Read-only adapter hook over existing SolHealth state.
 */
export function useGuideContext(): GuideContextData {
  const solhealth = useSolhealth();
  const pathname = usePathname();

  return useMemo(() => {
    const address = solhealth.publicKey ? solhealth.publicKey.toBase58() : null;
    const activeRole = deriveActiveRole(pathname);

    return {
      mounted: solhealth.mounted,
      connected: solhealth.connected,
      connecting: solhealth.connecting,
      address,
      shortAddress: solhealth.shortAddress || (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ""),
      balance: solhealth.balance,
      lowBalance: solhealth.lowBalance,
      encryptionStatus: solhealth.encryptionStatus,
      isPublisher: solhealth.isPublisher,
      isDoctor: solhealth.isDoctor,
      isPatient: solhealth.isPatient,
      cluster: CLUSTER,
      programDeployed: solhealth.programDeployed,
      activeRole,
    };
  }, [solhealth, pathname]);
}
