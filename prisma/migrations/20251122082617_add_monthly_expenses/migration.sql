-- CreateTable
CREATE TABLE "MonthlyExpense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "personName" TEXT,
    "companyName" TEXT,
    "legalStatus" TEXT,
    "defaultTaxRate" DECIMAL,
    "vatId" TEXT,
    "taxNumber" TEXT,
    "wirtschaftsIdentNr" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "emailFrom" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "emailSignature" TEXT,
    "lastInvoiceCounter" INTEGER NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT,
    "startingBalance" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("bic", "city", "companyName", "country", "createdAt", "defaultTaxRate", "emailFrom", "emailSignature", "iban", "id", "invoicePrefix", "lastInvoiceCounter", "legalStatus", "personName", "postalCode", "smtpHost", "smtpPassword", "smtpPort", "smtpUser", "street", "taxNumber", "updatedAt", "vatId", "wirtschaftsIdentNr") SELECT "bic", "city", "companyName", "country", "createdAt", "defaultTaxRate", "emailFrom", "emailSignature", "iban", "id", "invoicePrefix", "lastInvoiceCounter", "legalStatus", "personName", "postalCode", "smtpHost", "smtpPassword", "smtpPort", "smtpUser", "street", "taxNumber", "updatedAt", "vatId", "wirtschaftsIdentNr" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
