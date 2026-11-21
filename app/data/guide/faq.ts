export type GuideRole = "patient" | "doctor" | "publisher" | "all";

export interface FaqEntry {
  id: string;
  roles: GuideRole[];
  question: string;
  keywords: string[];
  answer: string;
  nextAction?: {
    label: string;
    route?: string;
  };
}

export const FAQ_ENTRIES: FaqEntry[] = [
  // 1. What SolHealth is
  {
    id: "what_is_solhealth",
    roles: ["all"],
    question: "What is SolHealth?",
    keywords: ["solhealth", "about", "overview", "what is this", "protocol", "platform"],
    answer:
      "SolHealth is a decentralized medical records protocol on Solana. Patients encrypt medical records in their browser with AES-256-GCM, upload them to IPFS, and grant time-bound access to verified doctors. A Publisher manages doctor credentials on-chain.",
    nextAction: { label: "Go to Home", route: "/" },
  },

  // 2. What Devnet and test SOL are
  {
    id: "devnet_and_test_sol",
    roles: ["all"],
    question: "What is Solana Devnet and test SOL?",
    keywords: ["devnet", "test sol", "fake money", "real money", "network", "cost"],
    answer:
      "SolHealth runs on Solana Devnet, an official testing network. Test SOL has no real financial value and is used to pay tiny transaction and rent fees. You never spend real money while exploring SolHealth.",
    nextAction: { label: "View Home", route: "/" },
  },

  // 3. Which wallets work and how to install one
  {
    id: "wallets_supported",
    roles: ["all"],
    question: "Which wallets can I use with SolHealth?",
    keywords: ["wallet", "phantom", "solflare", "install", "extension", "browser wallet"],
    answer:
      "SolHealth supports popular Solana browser wallets including Phantom and Solflare. Install the extension in Chrome, Brave, or Firefox, create a new wallet, and keep your recovery phrase secret.",
    nextAction: { label: "Connect wallet", route: "/" },
  },

  // 4. Enabling Testnet Mode in Phantom and choosing Solana Devnet
  {
    id: "phantom_testnet_mode",
    roles: ["all"],
    question: "How do I switch Phantom to Solana Devnet?",
    keywords: ["phantom", "testnet mode", "devnet setting", "switch network", "developer settings"],
    answer:
      "In Phantom, open Settings, select Developer Settings, and turn on Testnet Mode. Then change the network to Solana Devnet. This connects your wallet to the Devnet test network.",
  },

  // 5. Getting free Devnet SOL and why balance can show 0
  {
    id: "faucet_and_zero_balance",
    roles: ["all"],
    question: "How do I get free Devnet SOL, and why does my balance show 0?",
    keywords: ["faucet", "free sol", "airdrop", "zero balance", "balance 0", "sol"],
    answer:
      "Get free test SOL from the Solana Devnet faucet. If your balance shows 0, verify that your wallet is set to Devnet rather than Mainnet, and confirm that your connected account matches your funded address.",
    nextAction: { label: "Publisher page", route: "/publisher" },
  },

  // 6. Connecting a wallet
  {
    id: "connect_wallet",
    roles: ["all"],
    question: "How do I connect my wallet to SolHealth?",
    keywords: ["connect", "connect wallet", "login", "authenticate"],
    answer:
      "Click the Connect wallet button in the navigation bar. Choose your installed wallet from the list and approve the connection request in the pop-up window.",
    nextAction: { label: "Connect wallet", route: "/" },
  },

  // 7. What "Activate encryption" does
  {
    id: "activate_encryption",
    roles: ["patient", "doctor", "all"],
    question: "What does Activate encryption do?",
    keywords: ["activate encryption", "encryption session", "signature", "x25519", "key derivation"],
    answer:
      "Activate encryption asks for one free wallet signature to derive a local private X25519 encryption key, followed by a transaction publishing your public encryption key on-chain so others can share files with you securely.",
    nextAction: { label: "Patient portal", route: "/patient" },
  },

  // 8. What happens if wallet cannot sign messages
  {
    id: "cannot_sign_messages",
    roles: ["all"],
    question: "What happens if my wallet cannot sign messages?",
    keywords: ["sign message", "hardware wallet", "ledger", "signature failed", "signing error"],
    answer:
      "Some hardware wallets or older extensions do not support off-chain message signing. To use SolHealth encryption, use a standard software wallet account in Phantom or Solflare that supports message signatures.",
  },

  // 9. Patient: uploading a record
  {
    id: "patient_upload_record",
    roles: ["patient", "all"],
    question: "How do I upload and encrypt a record as a patient?",
    keywords: ["upload", "add record", "file size", "encrypt file", "ipfs", "4mb", "cid"],
    answer:
      "In step 1 on the Patient page, choose a medical file under 4 MB. SolHealth encrypts it with AES-256-GCM in your browser, pins the ciphertext to IPFS, and registers the hash on Solana.",
    nextAction: { label: "Add a record", route: "/patient" },
  },

  // 10. Patient: sharing with a doctor
  {
    id: "patient_share_doctor",
    roles: ["patient", "all"],
    question: "How do I share a record with a doctor?",
    keywords: ["share", "doctor", "grant access", "permission", "verified doctor"],
    answer:
      "Click Share on your record in step 2. Enter the verified doctor wallet address and choose a validity period in minutes. The doctor must be verified by the Publisher and have activated encryption.",
    nextAction: { label: "Your records", route: "/patient" },
  },

  // 11. Patient: choosing duration
  {
    id: "patient_duration",
    roles: ["patient", "all"],
    question: "How does the access duration work?",
    keywords: ["duration", "expiry", "time-bound", "minutes", "expiration"],
    answer:
      "When sharing, you specify how long access lasts in minutes. The smart contract enforces this deadline on-chain. Once expired, the doctor can no longer fetch the decryption key.",
    nextAction: { label: "Manage records", route: "/patient" },
  },

  // 12. Patient: stopping sharing
  {
    id: "patient_stop_sharing",
    roles: ["patient", "all"],
    question: "Can I stop sharing a record before it expires?",
    keywords: ["revoke", "stop sharing", "cancel access", "permission revoke"],
    answer:
      "Yes. Under active access grants, click Stop sharing to revoke access immediately on Solana. Remember that files or previews the doctor already opened while authorized cannot be erased from their device.",
    nextAction: { label: "Review access", route: "/patient" },
  },

  // 13. Patient: checking file integrity
  {
    id: "patient_check_integrity",
    roles: ["patient", "all"],
    question: "How do I verify the integrity of my medical record?",
    keywords: ["check integrity", "tamper", "verify file", "hash match", "sha256"],
    answer:
      "Click Check integrity on any record card. SolHealth downloads the encrypted file from IPFS, recalculates the SHA-256 checksum, and confirms whether it matches the registered cryptographic hash on-chain.",
    nextAction: { label: "Check records", route: "/patient" },
  },

  // 14. Doctor: why not verified
  {
    id: "doctor_not_verified",
    roles: ["doctor", "all"],
    question: "Why does my doctor credential show Not verified?",
    keywords: ["doctor", "not verified", "credential", "license", "publisher verification"],
    answer:
      "Doctor wallets require on-chain verification by the Publisher before accessing patient records. Copy your wallet address and share it with the Publisher to issue your medical credential.",
    nextAction: { label: "Doctor portal", route: "/doctor" },
  },

  // 15. Doctor: activating encryption
  {
    id: "doctor_activate_encryption",
    roles: ["doctor", "all"],
    question: "Why must a doctor activate encryption?",
    keywords: ["doctor encryption", "public key", "decrypt record", "x25519"],
    answer:
      "Doctors publish an X25519 public key on Solana so patients can wrap record encryption keys specifically for them. Without this key published, patients cannot grant you record access.",
    nextAction: { label: "Doctor portal", route: "/doctor" },
  },

  // 16. Doctor: opening a record
  {
    id: "doctor_open_record",
    roles: ["doctor", "all"],
    question: "How does a doctor open and inspect a shared record?",
    keywords: ["open record", "doctor view", "decrypt", "record viewer"],
    answer:
      "In step 2 of the Doctor portal, find records shared with your address. Click Open record to verify your on-chain permission, unwrap the symmetric key, and decrypt the medical file in your browser.",
    nextAction: { label: "Doctor records", route: "/doctor" },
  },

  // 17. Doctor: why Access denied
  {
    id: "doctor_access_denied",
    roles: ["doctor", "all"],
    question: "Why do I see Access denied when opening a record?",
    keywords: ["access denied", "doctor error", "expired", "revoked access"],
    answer:
      "Access denied occurs if your permission has expired, the patient revoked access, or the Publisher revoked your credential. Contact the patient to request a fresh grant.",
    nextAction: { label: "Doctor portal", route: "/doctor" },
  },

  // 18. Publisher: setting up the registry
  {
    id: "publisher_setup_registry",
    roles: ["publisher", "all"],
    question: "How do I set up the SolHealth registry as Publisher?",
    keywords: ["publisher", "setup registry", "initialize", "authority"],
    answer:
      "On the Publisher page, the first connected wallet can initialize the protocol config account. That wallet becomes the Publisher authority responsible for approving doctor credentials.",
    nextAction: { label: "Publisher page", route: "/publisher" },
  },

  // 19. Publisher: verifying a doctor
  {
    id: "publisher_verify_doctor",
    roles: ["publisher", "all"],
    question: "How does the Publisher verify a doctor?",
    keywords: ["verify doctor", "issue credential", "publisher action", "add doctor"],
    answer:
      "In step 2 on the Publisher page, paste the doctor's Solana wallet address and click Verify doctor. This records an active medical credential on the Solana blockchain.",
    nextAction: { label: "Verify doctor", route: "/publisher" },
  },

  // 20. Publisher: removing a doctor
  {
    id: "publisher_revoke_doctor",
    roles: ["publisher", "all"],
    question: "How does the Publisher revoke a doctor's credential?",
    keywords: ["revoke doctor", "remove doctor", "deactivate credential", "publisher"],
    answer:
      "In step 3 of the Publisher page, view the verified doctors list. Click Revoke beside any doctor to mark their on-chain credential inactive, preventing further record access.",
    nextAction: { label: "Doctor directory", route: "/publisher" },
  },

  // 21. Audit page and CSV export
  {
    id: "audit_page_logs",
    roles: ["all"],
    question: "What is the Audit page and how do I export logs?",
    keywords: ["audit", "logs", "csv", "export", "timeline", "history", "compliance"],
    answer:
      "The Audit page displays a verifiable timeline of protocol events: credential issuance, record registration, and access grants. Click Export log to download the audit trail as a CSV file.",
    nextAction: { label: "Audit page", route: "/audit" },
  },

  // 22. Transaction not confirmed in 30 seconds
  {
    id: "tx_timeout_retry",
    roles: ["all"],
    question: "What should I do if a transaction is not confirmed in 30 seconds?",
    keywords: ["timeout", "30 seconds", "confirmation timeout", "retry", "explorer"],
    answer:
      "Solana Devnet RPC nodes occasionally take longer to confirm blocks. Check your signature on Solana Explorer to see if it landed. If not, click Retry or submit the action again.",
  },

  // 23. Is my data private
  {
    id: "data_privacy",
    roles: ["all"],
    question: "Is my medical data private on SolHealth?",
    keywords: ["privacy", "confidential", "security", "aes-256", "ipfs encryption"],
    answer:
      "Yes. Medical files are encrypted in your browser before leaving your computer. IPFS stores only ciphertext, and private keys never leave browser memory. Only authorized recipients can decrypt.",
  },

  // 24. What if I lose my wallet
  {
    id: "lose_wallet",
    roles: ["all"],
    question: "What happens if I lose access to my wallet?",
    keywords: ["lost wallet", "lost seed phrase", "recovery", "backup"],
    answer:
      "Because encryption keys are derived from your wallet signature and no server stores copies, losing your wallet means your encrypted files cannot be decrypted. Always safeguard your seed phrase.",
  },

  // 25. Why Phantom shows a warning on a new site
  {
    id: "phantom_warning",
    roles: ["all"],
    question: "Why does Phantom show a warning when connecting?",
    keywords: ["phantom warning", "scam warning", "unverified site", "new dApp"],
    answer:
      "Phantom displays caution notices for newly deployed domains that have not yet undergone automated registry indexing. SolHealth source code is open and runs strictly client-side.",
  },

  // 26. What the Guide bot can and cannot do
  {
    id: "guide_bot_scope",
    roles: ["all"],
    question: "What can the Guide bot do?",
    keywords: ["guide bot", "scope", "medical advice", "help bot", "assistant"],
    answer:
      "The Guide bot provides walkthrough assistance for SolHealth features and general non-emergency wellness precautions. It does not provide clinical care, prescriptions, or emergency services.",
  },

  // 27. Publisher role overview
  {
    id: "publisher_role_overview",
    roles: ["publisher", "all"],
    question: "What is the Publisher role?",
    keywords: ["publisher role", "admin", "authority", "role publisher"],
    answer:
      "The Publisher is the trusted health authority who initializes the protocol and verifies licensed doctors on-chain. Only doctors approved by the Publisher can access patient records.",
    nextAction: { label: "Publisher portal", route: "/publisher" },
  },

  // 28. Patient role overview
  {
    id: "patient_role_overview",
    roles: ["patient", "all"],
    question: "What is the Patient role?",
    keywords: ["patient role", "patient features", "my records"],
    answer:
      "Patients own their medical records. They encrypt files in the browser, upload them to decentralized storage, and grant or revoke time-bound access for verified doctors.",
    nextAction: { label: "Patient portal", route: "/patient" },
  },

  // 29. Doctor role overview
  {
    id: "doctor_role_overview",
    roles: ["doctor", "all"],
    question: "What is the Doctor role?",
    keywords: ["doctor role", "physician", "clinic"],
    answer:
      "Doctors obtain on-chain verification from the Publisher, publish an encryption key, and view records shared with them by patients during active permission windows.",
    nextAction: { label: "Doctor portal", route: "/doctor" },
  },

  // 30. General fallback entry
  {
    id: "generic_fallback",
    roles: ["all"],
    question: "How do I get started with SolHealth?",
    keywords: ["help", "start", "guide", "support", "how to"],
    answer:
      "Start by connecting your wallet at the top right. Then choose your role: Patient to upload records, Doctor to view shared files, or Publisher to manage doctor credentials.",
    nextAction: { label: "Get started", route: "/" },
  },
];
