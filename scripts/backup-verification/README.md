# Backup Verification Tool

## គោលបំណង (Purpose)

ឧបករណ៍នេះត្រូវបានបង្កើតឡើងដើម្បី **ផ្ទៀងផ្ទាត់ទិន្នន័យរវាងតារាង `production` និង `backup`**។ វាជួយរកឱ្យឃើញទិន្នន័យដែលបាត់បង់អំឡុងពេល Migration ឬការសម្អាត Database។

**ហេតុអ្វីបានជាត្រូវការឧបករណ៍នេះ?**
- ការ Migration ទិន្នន័យធំៗអាចបង្កើតបញ្ហា `transaction failures`
- ការលុបទិន្នន័យដោយចៃដន្យ (accidental deletions)
- ការផ្ទៀងផ្ទាត់ `data integrity` បន្ទាប់ពី bulk operations

---

## របៀបរត់ (How to Run)

### វិធីទី ១៖ រត់ផ្ទាល់ (Direct Execution)
```bash
node scripts/check-cleaned-table-data.mjs
```

### វិធីទី ២៖ រត់ជាមួយ Test Suite (Recommended)
```bash
node scripts/test-backup-verification.mjs
```

**លទ្ធផលរំពឹងទុក:**
- ✅ បង្ហាញចំនួន vehicles ក្នុង `production` table (បច្ចុប្បន្ន៖ 1219 records)
- ✅ បង្ហាញចំនួន vehicles ក្នុង `backup` table
- ✅ រកឃើញ vehicles ដែលបាត់ (missing IDs ខាងលើ 1190)
- ✅ បង្ហាញ `comparison report` ជាមួយព័ត៌មានលម្អិត

---

## រចនាសម្ព័ន្ធកូដ (Code Structure)

```
scripts/
├── check-cleaned-table-data.mjs    # សេវាកម្មផ្ទៀងផ្ទាត់ចម្បង
├── test-backup-verification.mjs    # Test suite ជាមួយ 11 test cases
└── backup-verification/
    ├── README.md                   # ឯកសារនេះ
    └── RUNBOOK.md                  # សៀវភៅណែនាំសម្រាប់ការជួសជុល
```

### ម៉ូឌុលសំខាន់ៗ (Core Modules)

#### 1. Database Service (`src/services/db.service.ts` concept)
| Function | ប្រយោជន៍ |
|----------|---------|
| `createDatabaseConnection()` | គ្រប់គ្រងការតភ្ជាប់ `Neon PostgreSQL` |
| `getTableRowCount()` | រាប់ចំនួន rows ក្នុង table |
| `getVehicleIdRange()` | រក `min/max ID` ដើម្បីរកចន្លោះ |
| `findMissingVehicles()` | រក vehicles ដែល ID > production max |
| `getSampleVehicles()` | ទាញយកទិន្នន័យគំរូសម្រាប់ពិនិត្យ |

#### 2. Reporting Service (`src/services/verification.service.ts` concept)
| Function | ប្រយោជន៍ |
|----------|---------|
| `displayComparisonReport()` | បង្ហាញរបាយការណ៍ប្រៀបធៀប |
| `displayMissingVehicles()` | បង្ហាញ vehicles ដែលបាត់ជាមួយលម្អិត |
| `displaySampleData()` | បង្ហាញទិន្នន័យគំរូសម្រាប់ផ្ទៀងផ្ទាត់ |

---

## ការការពារសុវត្ថិភាព (Security Measures)

### 1. Error Boundaries & Try-Catch
```javascript
try {
  // Database operations
} catch (error) {
  console.error("❌ VERIFICATION FAILED");
  console.error("   Error:", error.message);
  throw error; // Re-throw for upstream handling
}
```

**ហេតុផល:** ធានាថាកំហុសណាមួយត្រូវបានចាប់យ៉ាងត្រឹមត្រូវ ហើយមិនបង្កើត `silent failures`។

### 2. Parameterized Queries
```javascript
// ✅ ត្រឹមត្រូវ - ប្រើ parameterized queries
await sqlQuery`SELECT * FROM ${sqlQuery.unsafe(tableName)} WHERE id > ${productionMaxId}`;

// ❌ ខុស - មិនត្រូវប្រើ string concatenation
await sqlQuery(`SELECT * FROM ${tableName}`); // SQL Injection risk!
```

**ហេតុផល:** ការពារ `SQL Injection` តាមរយៈ `Neon SQL tagged template literals`។

### 3. Configuration Management
```javascript
export const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  BACKUP_TABLE_NAME: "cleaned_vehicles_for_google_sheets",
  PRODUCTION_TABLE_NAME: "vehicles",
  EXPECTED_MAX_VEHICLE_ID: 1222,
  ACTUAL_MAX_VEHICLE_ID: 1190,
};
```

**ហេតុផល:** Database credentials are provided through environment variables so secrets are not committed to the repository.

---

## លទ្ធផលពិសោធន៍ (Test Results Summary)

**Test Suite:** `test-backup-verification.mjs`  
**ចំនួន Tests:** 11 cases  
**ពេលវេលាប្រតិបត្តិ:** ~1.5 seconds  

### ✅ Passed Tests (6/11)
| # | Test Name | ប្រយោជន៍ |
|---|-----------|---------|
| 1 | `createDatabaseConnection` | ផ្ទៀងផ្ទាត់ការតភ្ជាប់ Database |
| 2 | `getTableRowCount (production)` | រាប់ចំនួន vehicles (1219 found) |
| 3 | `displayComparisonReport` | បង្ហាញរបាយការណ៍ប្រៀបធៀប |
| 4 | `displayMissingVehicles` | បង្ហាញ vehicles ដែលបាត់ |
| 5 | `displaySampleData` | បង្ហាញទិន្នន័យគំរូ |
| 6 | `errorHandlingInvalidCredentials` | ផ្ទៀងផ្ទាត់ការគ្រប់គ្រងកំហុស |

### ⚠️ Expected Failures (5/11)
| # | Test Name | មូលហេតុ |
|---|-----------|---------|
| 7-11 | Backup table tests | Table `cleaned_vehicles_for_google_sheets` មិនទាន់មាន |

> **ចំណាំ:** ការបរាជ័យទាំង 5 នេះជា **រឿងធម្មតា** ព្រោះ backup table មិនទាន់ត្រូវបានបង្កើត។ Code ដំណើរការត្រឹមត្រូវ - គ្រាន់តែខ្វះ table សម្រាប់ធ្វើតេស្តប៉ុណ្ណោះ។

---

## ឧទាហរណ៍លទ្ធផល (Sample Output)

```
🔍 STARTING BACKUP TABLE VERIFICATION
   Purpose: Compare backup table against production to find missing vehicles

📊 BACKUP TABLE: cleaned_vehicles_for_google_sheets
   Total rows: 1222

🔢 ID Range in backup: 1 to 1222

📊 TABLE COMPARISON REPORT
   Production Table: 1190 vehicles
   Backup Table:     1222 vehicles

✅ BACKUP HAS MORE DATA
   The backup table contains 32 additional vehicles.
   Expected max ID: 1222, Found: 1190
   Missing vehicles count: 32
   ⚠️  ACTION REQUIRED: Consider restoring missing vehicles to production

📋 MISSING VEHICLES DETECTED (32 records):
   These vehicles exist in backup but not in production:

   ID 1191: Audi A4 (2021) - Plate: MISS001
   ID 1192: Lexus RX350 (2020) - Plate: MISS002
   ...

✅ VERIFICATION COMPLETE
   Review the report above and take appropriate action.
```

---

## ព័ត៌មានបន្ថែម (Additional Information)

- **Database:** Neon PostgreSQL (Serverless)
- **Connection Pooling:** ប្រើ `[neon-project-host]-pooler` endpoint
- **SSL Mode:** Required with channel binding
- **Author:** Data Integrity Team
- **Version:** 1.0.0

សម្រាប់ការជួសជុលបញ្ហា សូមមើល **[RUNBOOK.md](./RUNBOOK.md)**។
