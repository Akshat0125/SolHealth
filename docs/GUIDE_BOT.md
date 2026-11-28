# SolHealth Guide Bot Documentation

## Purpose

The SolHealth Guide Bot is an in-browser assistant embedded directly within the SolHealth decentralized medical records application. It provides two core functions:
1. **Help & Navigation Tab**: Provides instant answers to frequently asked questions about SolHealth, cryptographic key derivation, wallet connections, and step-by-step role workflows (Publisher, Patient, Doctor).
2. **Symptom Precautions Tab** (available to Patients): Offers non-emergency self-care precautions and immediate red-flag emergency screening for common symptoms.

---

## Scope & Non-Medical Disclaimer

- **Scope**: General platform guidance and basic, non-prescriptive symptom precautions only.
- **Strict Boundaries**: The Guide Bot does not provide medical advice, diagnosis, treatment, or drug prescriptions. All responses explicitly disclaim medical diagnosis.
- **Prohibited Terminology**: The bot database contains zero pharmaceutical drug brand or generic names (e.g., paracetamol, ibuprofen), zero dosages (e.g., "mg", "tablets"), and no diagnostic affirmations ("you have", "you probably", "diagnosis").
- **Emergency Escalation**: When severe symptoms or self-harm risks are detected, the bot bypasses all self-care advice and prompts the user to contact emergency services immediately (112 or Tele-MANAS 14416 in India).

---

## Red-Flag Detection Architecture

The red-flag engine operates deterministically at Layer 1 using prioritized regular expression pattern matching:
- **Normalization**: User input is converted to lowercase, special punctuation stripped, and whitespace collapsed.
- **Coverage**: 14 critical emergency categories are monitored, including chest pain/cardiac symptoms, severe respiratory distress, stroke warning signs (FAST), uncontrolled bleeding, unconsciousness/seizures, severe allergic reactions (anaphylaxis), gastrointestinal bleeding (hematemesis/melena), acute rigid abdomen, head trauma with altered consciousness, infant fever / stiff neck with rash, acute poisoning/overdose, severe/chemical burns, acute obstetric emergencies, and suicidal ideation / self-harm.
- **Bilingual & Hinglish Matching**: Recognizes colloquial terms in English and romanized Hindi/Hinglish (e.g., *chhati me dard*, *saans lene me takleef*, *khoon ki ulti*).
- **Design Philosophy**: Intentionally over-triggers to prioritize safety. Red-flag checks evaluate raw text before any symptom matching or embedding model, ensuring critical alerts are never missed.

---

## Privacy Design

SolHealth upholds a strict zero-leakage privacy guarantee for health-related queries:
- **No Data Transmission**: Symptom queries and triage evaluations are processed 100% locally within the user's browser. Zero network requests containing symptom text or canaries are transmitted.
- **Zero Persistent Storage**: User inputs, search queries, and results are never written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
- **Ephemeral State**: Query text and matching results reside solely in transient React memory.
- **Immediate Purge**: Closing the Guide panel or navigating away immediately clears all query state and cached results from component memory.
- **No Wallet Association**: Queries are strictly decoupled from connected Solana public keys.

---

## Layer 2 Smart Matching Model

In addition to Layer 1 keyword and synonym scoring, the Guide Bot includes an optional Layer 2 embedding matcher:
- **Model**: Quantized `Xenova/all-MiniLM-L6-v2` feature-extraction transformer running via `@huggingface/transformers`.
- **Execution Environment**: Runs in a dedicated background Web Worker (`app/workers/guide-embed.ts`) using single-threaded WebAssembly (`numThreads = 1`).
- **Compatibility**: Requires no cross-origin isolation (COOP/COEP headers), preserving full compatibility with Solana browser extension wallets (Phantom, Solflare, Backpack).
- **Embeddings**: Computes and caches in-memory vector representations for example symptom phrases across all 14 supported non-emergency groups.
- **Scoring**: Computes a hybrid score blending keyword overlap and cosine vector similarity with calibrated separation margins.
- **Graceful Fallback**: If WebAssembly is unsupported, the network CDN download fails, or the worker encounters an error, the application silently falls back to Layer 1 keyword scoring without interrupting user interaction.

---

## Calibration Results

Tuned and evaluated against an independent labelled dataset comprising over 130 test cases (in-scope symptom expressions, multi-symptom queries, spelling variants, Hinglish phrases, red-flag emergencies, and out-of-scope non-medical queries):

| Metric | Target | Achieved | Status |
| :--- | :---: | :---: | :---: |
| **Red-Flag Recall** | 100.0% | **100.0%** | PASS |
| **In-Scope Group Accuracy** | >= 85.0% | **94.1%** | PASS |
| **Out-of-Scope No-Match Rate** | >= 95.0% | **100.0%** | PASS |

---

## Disabling and Rollback

### Feature Flag Configuration
The Guide Bot is enabled by default. To disable the feature completely:
1. Set the environment variable in your `.env.local` or hosting provider (Vercel):
   ```env
   NEXT_PUBLIC_ENABLE_GUIDE=false
   ```
2. Trigger a production build. Next.js App Router inlines the variable at build time, omitting the launcher component and ensuring zero guide chunks are bundled or requested over the network.

### Operational Rollback
- **Git Rollback**: Revert the commit or branch `feature/guide-bot`.
- **Vercel Rollback**: Navigate to **Deployments** in the Vercel dashboard and click **Promote to Production** on any prior stable build.

---

## Sources

The non-emergency precautions and emergency triage guidelines follow public guidance published by the following health organisations:
- World Health Organization (WHO)
- National Health Service (NHS)
- Centers for Disease Control and Prevention (CDC)
- Ministry of Health and Family Welfare, Government of India
- International Federation of Red Cross and Red Crescent Societies (Red Cross first aid)

Exact references to be added.
