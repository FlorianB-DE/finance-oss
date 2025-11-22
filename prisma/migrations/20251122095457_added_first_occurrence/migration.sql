-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonthlyExpense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "firstOccurrence" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MonthlyExpense" ("active", "amount", "createdAt", "dayOfMonth", "id", "name", "updatedAt") SELECT "active", "amount", "createdAt", "dayOfMonth", "id", "name", "updatedAt" FROM "MonthlyExpense";
DROP TABLE "MonthlyExpense";
ALTER TABLE "new_MonthlyExpense" RENAME TO "MonthlyExpense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
