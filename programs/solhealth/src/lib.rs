// Anchor version: 1.0.0
use anchor_lang::prelude::*;

declare_id!("6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe");

#[program]
pub mod solhealth {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn issue_credential(ctx: Context<IssueCredential>, doctor: Pubkey) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        let authority = &ctx.accounts.authority;
        let clock = Clock::get()?;

        credential.doctor = doctor;
        credential.issuer = authority.key();
        credential.active = true;
        credential.issued_at = clock.unix_timestamp;
        credential.bump = ctx.bumps.credential;

        emit!(CredentialIssued {
            doctor,
            issuer: authority.key(),
            timestamp: credential.issued_at,
        });

        Ok(())
    }

    pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        let clock = Clock::get()?;

        credential.active = false;

        emit!(CredentialRevoked {
            doctor: credential.doctor,
            authority: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn register_record(
        ctx: Context<RegisterRecord>,
        record_id: u64,
        cid: String,
        file_hash: [u8; 32],
        wrapped_key: Vec<u8>,
    ) -> Result<()> {
        require!(cid.len() <= 64, SolHealthError::CidTooLong);
        require!(wrapped_key.len() <= 128, SolHealthError::KeyTooLong);

        let record = &mut ctx.accounts.record;
        let patient = &ctx.accounts.patient;
        let clock = Clock::get()?;

        record.patient = patient.key();
        record.record_id = record_id;
        record.cid = cid;
        record.file_hash = file_hash;
        record.wrapped_key = wrapped_key;
        record.created_at = clock.unix_timestamp;
        record.bump = ctx.bumps.record;

        emit!(RecordRegistered {
            patient: patient.key(),
            record: record.key(),
            record_id,
            timestamp: record.created_at,
        });

        Ok(())
    }

    pub fn grant_access(
        ctx: Context<GrantAccess>,
        doctor: Pubkey,
        duration_secs: i64,
        wrapped_key: Vec<u8>,
    ) -> Result<()> {
        require!(wrapped_key.len() <= 128, SolHealthError::KeyTooLong);
        require!(ctx.accounts.credential.active, SolHealthError::CredentialInactive);

        let access = &mut ctx.accounts.access;
        let record = &ctx.accounts.record;
        let patient = &ctx.accounts.patient;
        let clock = Clock::get()?;

        access.record = record.key();
        access.doctor = doctor;
        access.wrapped_key = wrapped_key;
        access.expiry = clock.unix_timestamp.saturating_add(duration_secs);
        access.revoked = false;
        access.bump = ctx.bumps.access;

        emit!(AccessGranted {
            record: record.key(),
            patient: patient.key(),
            doctor,
            expiry: access.expiry,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
        let access = &mut ctx.accounts.access;
        let record = &ctx.accounts.record;
        let patient = &ctx.accounts.patient;
        let clock = Clock::get()?;

        access.revoked = true;

        emit!(AccessRevoked {
            record: record.key(),
            patient: patient.key(),
            doctor: access.doctor,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn access_record(ctx: Context<AccessRecord>) -> Result<()> {
        require!(ctx.accounts.credential.active, SolHealthError::CredentialInactive);
        require!(!ctx.accounts.access.revoked, SolHealthError::AccessRevoked);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp < ctx.accounts.access.expiry, SolHealthError::AccessExpired);

        emit!(RecordAccessed {
            record: ctx.accounts.record.key(),
            doctor: ctx.accounts.doctor.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// -----------------------------------------------------------------------------
// Account Contexts
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doctor: Pubkey)]
pub struct IssueCredential<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ SolHealthError::Unauthorized,
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        space = 8 + Credential::INIT_SPACE,
        seeds = [b"cred", doctor.as_ref()],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ SolHealthError::Unauthorized,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"cred", credential.doctor.as_ref()],
        bump = credential.bump,
    )]
    pub credential: Account<'info, Credential>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(record_id: u64, cid: String, file_hash: [u8; 32], wrapped_key: Vec<u8>)]
pub struct RegisterRecord<'info> {
    #[account(
        init,
        payer = patient,
        space = 8 + Record::INIT_SPACE,
        seeds = [b"rec", patient.key().as_ref(), &record_id.to_le_bytes()],
        bump
    )]
    pub record: Account<'info, Record>,
    #[account(mut)]
    pub patient: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doctor: Pubkey, duration_secs: i64, wrapped_key: Vec<u8>)]
pub struct GrantAccess<'info> {
    #[account(
        seeds = [b"rec", record.patient.as_ref(), &record.record_id.to_le_bytes()],
        bump = record.bump,
        has_one = patient @ SolHealthError::Unauthorized,
    )]
    pub record: Account<'info, Record>,
    #[account(
        seeds = [b"cred", doctor.as_ref()],
        bump = credential.bump,
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        init_if_needed,
        payer = patient,
        space = 8 + Access::INIT_SPACE,
        seeds = [b"acc", record.key().as_ref(), doctor.as_ref()],
        bump
    )]
    pub access: Account<'info, Access>,
    #[account(mut)]
    pub patient: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(
        seeds = [b"rec", record.patient.as_ref(), &record.record_id.to_le_bytes()],
        bump = record.bump,
        has_one = patient @ SolHealthError::Unauthorized,
    )]
    pub record: Account<'info, Record>,
    #[account(
        mut,
        seeds = [b"acc", record.key().as_ref(), access.doctor.as_ref()],
        bump = access.bump,
        has_one = record,
    )]
    pub access: Account<'info, Access>,
    pub patient: Signer<'info>,
}

#[derive(Accounts)]
pub struct AccessRecord<'info> {
    #[account(
        seeds = [b"rec", record.patient.as_ref(), &record.record_id.to_le_bytes()],
        bump = record.bump,
    )]
    pub record: Account<'info, Record>,
    #[account(
        seeds = [b"cred", doctor.key().as_ref()],
        bump = credential.bump,
        has_one = doctor,
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        seeds = [b"acc", record.key().as_ref(), doctor.key().as_ref()],
        bump = access.bump,
        has_one = record,
        has_one = doctor,
    )]
    pub access: Account<'info, Access>,
    pub doctor: Signer<'info>,
}

// -----------------------------------------------------------------------------
// State Accounts
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Credential {
    pub doctor: Pubkey,
    pub issuer: Pubkey,
    pub active: bool,
    pub issued_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Record {
    pub patient: Pubkey,
    pub record_id: u64,
    #[max_len(64)]
    pub cid: String,
    pub file_hash: [u8; 32],
    #[max_len(128)]
    pub wrapped_key: Vec<u8>,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Access {
    pub record: Pubkey,
    pub doctor: Pubkey,
    #[max_len(128)]
    pub wrapped_key: Vec<u8>,
    pub expiry: i64,
    pub revoked: bool,
    pub bump: u8,
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

#[event]
pub struct CredentialIssued {
    pub doctor: Pubkey,
    pub issuer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CredentialRevoked {
    pub doctor: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RecordRegistered {
    pub patient: Pubkey,
    pub record: Pubkey,
    pub record_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct AccessGranted {
    pub record: Pubkey,
    pub patient: Pubkey,
    pub doctor: Pubkey,
    pub expiry: i64,
    pub timestamp: i64,
}

#[event]
pub struct AccessRevoked {
    pub record: Pubkey,
    pub patient: Pubkey,
    pub doctor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RecordAccessed {
    pub record: Pubkey,
    pub doctor: Pubkey,
    pub timestamp: i64,
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

#[error_code]
pub enum SolHealthError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Doctor credential is inactive")]
    CredentialInactive,
    #[msg("Access has been revoked")]
    AccessRevoked,
    #[msg("Access has expired")]
    AccessExpired,
    #[msg("CID exceeds maximum length of 64")]
    CidTooLong,
    #[msg("Key exceeds maximum length of 128")]
    KeyTooLong,
}
