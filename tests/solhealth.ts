import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solhealth } from "../target/types/solhealth";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("solhealth", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solhealth as Program<Solhealth>;

  const authority = (provider.wallet as anchor.Wallet).payer;
  const doctor = Keypair.generate();
  const patient = Keypair.generate();
  const nonAuthority = Keypair.generate();

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const getCredentialPda = (doc: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("cred"), doc.toBuffer()],
      program.programId
    )[0];

  const getRecordPda = (pat: PublicKey, recId: anchor.BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("rec"), pat.toBuffer(), recId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

  const getAccessPda = (rec: PublicKey, doc: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("acc"), rec.toBuffer(), doc.toBuffer()],
      program.programId
    )[0];

  async function fundAccount(pubkey: PublicKey, amountSol = 2) {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: pubkey,
        lamports: amountSol * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);
  }

  before(async () => {
    await fundAccount(doctor.publicKey);
    await fundAccount(patient.publicKey);
    await fundAccount(nonAuthority.publicKey);
  });

  it("happy path: config, credential, record, grant, access", async () => {
    // 1. Initialize config if not already initialized
    let configAccount = await program.account.config.fetchNullable(configPda);
    if (!configAccount) {
      await program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      configAccount = await program.account.config.fetch(configPda);
    }
    expect(configAccount.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );

    // 2. Issue credential to doctor
    const credPda = getCredentialPda(doctor.publicKey);
    await program.methods
      .issueCredential(doctor.publicKey)
      .accounts({
        config: configPda,
        credential: credPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const credAccount = await program.account.credential.fetch(credPda);
    expect(credAccount.doctor.toBase58()).to.equal(doctor.publicKey.toBase58());
    expect(credAccount.issuer.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(credAccount.active).to.be.true;

    // 3. Register medical record by patient
    const recordId = new anchor.BN(1001);
    const recPda = getRecordPda(patient.publicKey, recordId);
    const cid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const fileHash = Array.from(Buffer.alloc(32, 7));
    const wrappedKey = Buffer.from("patient-wrapped-symmetric-key-data");

    await program.methods
      .registerRecord(recordId, cid, fileHash, wrappedKey)
      .accounts({
        record: recPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    const recordAccount = await program.account.record.fetch(recPda);
    expect(recordAccount.patient.toBase58()).to.equal(
      patient.publicKey.toBase58()
    );
    expect(recordAccount.recordId.toNumber()).to.equal(1001);
    expect(recordAccount.cid).to.equal(cid);
    expect(Buffer.from(recordAccount.fileHash)).to.deep.equal(
      Buffer.from(fileHash)
    );
    expect(Buffer.from(recordAccount.wrappedKey)).to.deep.equal(wrappedKey);

    // 4. Grant access to doctor for 100 seconds
    const accPda = getAccessPda(recPda, doctor.publicKey);
    const docWrappedKey = Buffer.from("doctor-wrapped-symmetric-key-data");
    const durationSecs = new anchor.BN(100);

    await program.methods
      .grantAccess(doctor.publicKey, durationSecs, docWrappedKey)
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    const accessAccount = await program.account.access.fetch(accPda);
    expect(accessAccount.record.toBase58()).to.equal(recPda.toBase58());
    expect(accessAccount.doctor.toBase58()).to.equal(
      doctor.publicKey.toBase58()
    );
    expect(Buffer.from(accessAccount.wrappedKey)).to.deep.equal(docWrappedKey);
    expect(accessAccount.revoked).to.be.false;

    // 5. Doctor accesses record
    await program.methods
      .accessRecord()
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        doctor: doctor.publicKey,
      })
      .signers([doctor])
      .rpc();
  });

  it("non-authority cannot issue credential", async () => {
    const anotherDoctor = Keypair.generate();
    const credPda = getCredentialPda(anotherDoctor.publicKey);

    try {
      await program.methods
        .issueCredential(anotherDoctor.publicKey)
        .accounts({
          config: configPda,
          credential: credPda,
          authority: nonAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonAuthority])
        .rpc();
      expect.fail("Should have failed with Unauthorized");
    } catch (err: any) {
      expect(err.toString()).to.satisfy(
        (msg: string) =>
          msg.includes("Unauthorized") ||
          msg.includes("Error Code: Unauthorized") ||
          msg.includes("6000") ||
          msg.includes("ConstraintHasOne")
      );
    }
  });

  it("access fails after revoke", async () => {
    const recordId = new anchor.BN(2002);
    const recPda = getRecordPda(patient.publicKey, recordId);
    const credPda = getCredentialPda(doctor.publicKey);
    const accPda = getAccessPda(recPda, doctor.publicKey);

    // Register record
    await program.methods
      .registerRecord(
        recordId,
        "QmRevokeTestCid",
        Array.from(Buffer.alloc(32, 1)),
        Buffer.from("key-data")
      )
      .accounts({
        record: recPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    // Grant access
    await program.methods
      .grantAccess(
        doctor.publicKey,
        new anchor.BN(60),
        Buffer.from("doc-key-data")
      )
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    // Doctor can access initially
    await program.methods
      .accessRecord()
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        doctor: doctor.publicKey,
      })
      .signers([doctor])
      .rpc();

    // Patient revokes access
    await program.methods
      .revokeAccess()
      .accounts({
        record: recPda,
        access: accPda,
        patient: patient.publicKey,
      })
      .signers([patient])
      .rpc();

    const accessAccount = await program.account.access.fetch(accPda);
    expect(accessAccount.revoked).to.be.true;

    // Doctor access should now fail with AccessRevoked
    try {
      await program.methods
        .accessRecord()
        .accounts({
          record: recPda,
          credential: credPda,
          access: accPda,
          doctor: doctor.publicKey,
        })
        .signers([doctor])
        .rpc();
      expect.fail("Should have failed with AccessRevoked");
    } catch (err: any) {
      expect(err.toString()).to.satisfy(
        (msg: string) =>
          msg.includes("AccessRevoked") ||
          msg.includes("Access has been revoked") ||
          msg.includes("6002")
      );
    }

    // Patient re-grants access (testing init_if_needed)
    await program.methods
      .grantAccess(
        doctor.publicKey,
        new anchor.BN(60),
        Buffer.from("regranted-key")
      )
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    // Doctor can access again
    await program.methods
      .accessRecord()
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        doctor: doctor.publicKey,
      })
      .signers([doctor])
      .rpc();
  });

  it("access fails after expiry (grant 2s, wait 3s)", async () => {
    const recordId = new anchor.BN(3003);
    const recPda = getRecordPda(patient.publicKey, recordId);
    const credPda = getCredentialPda(doctor.publicKey);
    const accPda = getAccessPda(recPda, doctor.publicKey);

    // Register record
    await program.methods
      .registerRecord(
        recordId,
        "QmExpiryTestCid",
        Array.from(Buffer.alloc(32, 2)),
        Buffer.from("key-data-expiry")
      )
      .accounts({
        record: recPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    // Grant access for 2 seconds
    await program.methods
      .grantAccess(
        doctor.publicKey,
        new anchor.BN(2),
        Buffer.from("doc-key-expiry")
      )
      .accounts({
        record: recPda,
        credential: credPda,
        access: accPda,
        patient: patient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    // Wait 3 seconds for access to expire
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Doctor access should now fail with AccessExpired
    try {
      await program.methods
        .accessRecord()
        .accounts({
          record: recPda,
          credential: credPda,
          access: accPda,
          doctor: doctor.publicKey,
        })
        .signers([doctor])
        .rpc();
      expect.fail("Should have failed with AccessExpired");
    } catch (err: any) {
      expect(err.toString()).to.satisfy(
        (msg: string) =>
          msg.includes("AccessExpired") ||
          msg.includes("Access has expired") ||
          msg.includes("6003")
      );
    }
  });
});
