# Backup Strategy Documentation

## Overview
This document describes the backup strategy for the EmeraldCash VMS application, including database backups, image backups, and disaster recovery procedures.

---

## Current Backup Implementation

### 1. Database Backup (Neon)

| Feature | Status | Method |
|---------|--------|--------|
| Point-in-time Recovery | ✅ | Neon Console |
| Automated Exports | ❌ | Not implemented |
| Backup Table Creation | ✅ | `npm run backup:create` with explicit confirmation |
| Verification Script | ✅ | `npm run backup:verify` |
| Restore Script | ✅ | `restore-vehicles-from-csv.mjs` |

**Neon Project Details:**
- Store project and branch identifiers in the team password manager or deployment runbook.
- Do not commit Neon credentials, branch URLs, or connection strings.

**To restore from Neon:**
1. Go to Neon Console → Branch → Restore
2. Select point-in-time or create new branch
3. Update DATABASE_URL in environment

### 2. Backup Table Strategy

The project uses a dual-table strategy for vehicle data:

| Table | Purpose | Row Count |
|-------|---------|-----------|
| `vehicles` | Production table | Current production vehicle records |
| `cleaned_vehicles_for_google_sheets` | Backup/Archive | Must exist before production release |

**Configuration:**
```bash
BACKUP_TABLE_NAME=cleaned_vehicles_for_google_sheets
PRODUCTION_TABLE_NAME=vehicles
EXPECTED_MAX_VEHICLE_ID=1222
ACTUAL_MAX_VEHICLE_ID=1190
```

**Release note:** If `npm run backup:verify` fails with `relation
"cleaned_vehicles_for_google_sheets" does not exist`, create the backup table or
point `BACKUP_TABLE_NAME` at the approved production backup table before release.

### 3. Image Backup (Cloudinary)

| Feature | Status |
|---------|--------|
| Primary Storage | ✅ Cloudinary CDN |
| Folder Organization | ✅ By vehicle category |
| Automatic Backups | ✅ Cloudinary managed |

**Cloudinary Folders:**
- CarsVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce555092908976deefcf5144e334d91fa5
- MotorcyclesVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce5550c3538940f637816b763306aeb17b
- TukTuksVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce55505300960c23aff469967deea2277

---

## Backup Scripts

### Verification Script
**File:** `scripts/check-cleaned-table-data.mjs`

Run verification to check backup integrity:
```bash
npm run backup:verify
```

Create the backup table from the current `vehicles` table:

```powershell
$env:CONFIRM_CREATE_BACKUP_TABLE="true"; npm run backup:create
```

This command is intentionally guarded because it writes to the connected
database. Verify `DATABASE_URL` points to the intended environment before
running it.

**Functions exported:**
- `createDatabaseConnection(databaseUrl)` - Create Neon connection
- `getTableRowCount(sqlQuery, tableName)` - Get row count
- `getVehicleIdRange(sqlQuery, tableName)` - Get ID range
- `findMissingVehicles(sqlQuery, backupTableName, productionMaxId)` - Find missing records
- `getSampleVehicles(sqlQuery, tableName, sampleSize)` - Get sample data
- `displayComparisonReport(...)` - Display comparison
- `displayMissingVehicles(missingVehicles)` - Show missing vehicles
- `displaySampleData(sampleVehicles)` - Show sample data
- `runBackupVerification()` - Main orchestrator

### Test Suite
**File:** `scripts/test-backup-verification.mjs`

Run tests to verify all functions:
```bash
node scripts/test-backup-verification.mjs
```

### Restore Script
**File:** `scripts/restore-vehicles-from-csv.mjs`

Restore vehicles from CSV backup:
```bash
node scripts/restore-vehicles-from-csv.mjs
```

**Restore Options:**
1. Skip restoration (keep existing data)
2. Truncate and restore (replace with CSV data)
3. Append (add CSV data to existing)

---

## Disaster Recovery Procedures

### Scenario 1: Database Failure

1. **Check Neon Status:** https://neon.tech/status
2. **Restore from Neon:**
   - Go to Neon Console → Branches
   - Select branch → Restore
   - Choose point-in-time or create new branch
3. **Update DATABASE_URL** in environment
4. **Verify data:** Run `npm run backup:verify`

### Scenario 2: Accidental Data Deletion

1. **Run verification:** `npm run backup:verify`
2. **Check missing vehicles:** Review the discrepancy report
3. **Restore from backup table:**
   - Use the restore script: `node scripts/restore-vehicles-from-csv.mjs`
   - Or manually copy from backup table using SQL:
   ```sql
   INSERT INTO vehicles
   SELECT * FROM cleaned_vehicles_for_google_sheets
   WHERE id > (SELECT MAX(id) FROM vehicles);
   ```

### Scenario 3: Image Loss

1. **Cloudinary handles redundancy** - Images are backed up automatically
2. **To verify images:**
   ```bash
   node scripts/upload-vehicle-images.mjs list
   ```
3. **Re-upload if needed:** Use Cloudinary console or script

### Scenario 4: Full Application Loss

1. **Deploy from Vercel:**
   - Connect GitHub repository
   - Configure environment variables
   - Deploy

2. **Restore database:**
   - Use Neon point-in-time restore
   - Or run restore script with CSV backup

3. **Restore images:**
   - Images are on Cloudinary (ensure API keys configured)

---

## Scheduled Backups (Recommended)

### Current Status

| Task | Frequency | Status |
|------|-----------|--------|
| Database Export | Manual | ❌ Not implemented |
| CSV Backup | Manual | ❌ Not implemented |
| Vehicle Sync | Daily | ✅ Cron job exists |

### Recommended Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup-db",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

Create `/app/api/cron/backup-db/route.ts` to export database to CSV.

---

## Environment Variables

Required for backup operations:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon connection string |
| `BACKUP_TABLE_NAME` | Vehicle backup table used by `npm run backup:verify` |
| `CONFIRM_CREATE_BACKUP_TABLE` | Must be `true` to run `npm run backup:create` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CRON_SECRET` | Secret for cron auth (optional) |

---

## Security Considerations

1. **Credentials in Scripts:** Scripts must read `DATABASE_URL` from the environment. Never commit a database URL.

2. **GitIgnore:** Verify `.env.local` and credentials are in `.gitignore` (✅ confirmed).

3. **Access Control:** Limit database access to trusted IPs in Neon console.

---

## Last Verified

Date: 2026-05-23
Status: Backup verification script uses environment-provided credentials and
loads `.env` locally. Run `npm run backup:verify` with `DATABASE_URL` set before
release. If the backup table is missing, run the guarded `npm run backup:create`
command after confirming the target database.

---

## Contact

For backup-related issues:
- Check verification output: `npm run backup:verify`
- Review test results: `node scripts/test-backup-verification.mjs`
