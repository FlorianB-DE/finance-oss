-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "overrideInvoiceStartNumber" INTEGER NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT,
    "invoiceTemplatePath" TEXT,
    "startingBalance" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("bic", "city", "companyName", "country", "createdAt", "defaultTaxRate", "emailFrom", "emailSignature", "iban", "id", "invoicePrefix", "legalStatus", "overrideInvoiceStartNumber", "personName", "postalCode", "smtpHost", "smtpPassword", "smtpPort", "smtpUser", "startingBalance", "street", "taxNumber", "updatedAt", "vatId", "wirtschaftsIdentNr") SELECT "bic", "city", "companyName", "country", "createdAt", "defaultTaxRate", "emailFrom", "emailSignature", "iban", "id", "invoicePrefix", "legalStatus", "overrideInvoiceStartNumber", "personName", "postalCode", "smtpHost", "smtpPassword", "smtpPort", "smtpUser", "startingBalance", "street", "taxNumber", "updatedAt", "vatId", "wirtschaftsIdentNr" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
