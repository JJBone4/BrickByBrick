import { PGlite } from '@electric-sql/pglite'

const db = new PGlite('./local.db')

await db.exec(`
  CREATE TABLE IF NOT EXISTS "CollectionItem" (
    "id" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP,
    "notes" TEXT,
    "conditionTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
  );

  CREATE TABLE IF NOT EXISTS "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "qtySold" INTEGER NOT NULL,
    "totalLots" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
  );

  CREATE TABLE IF NOT EXISTS "CachedItem" (
    "itemNo" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryName" TEXT,
    "lastFetched" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired" BOOLEAN,
    "retiredCheckedAt" TIMESTAMP,
    CONSTRAINT "CachedItem_pkey" PRIMARY KEY ("itemNo","itemType")
  );

  CREATE TABLE IF NOT EXISTS "PriceSale" (
    "id" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dateOrdered" TIMESTAMP NOT NULL,
    "sellerCountry" TEXT,
    "buyerCountry" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSale_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "PriceSale_itemNo_itemType_condition_dateOrdered_unitPrice_quantity_key"
    ON "PriceSale"("itemNo", "itemType", "condition", "dateOrdered", "unitPrice", "quantity");

  CREATE INDEX IF NOT EXISTS "PriceSale_itemNo_itemType_condition_dateOrdered_idx"
    ON "PriceSale"("itemNo", "itemType", "condition", "dateOrdered");

  CREATE INDEX IF NOT EXISTS "CollectionItem_itemNo_itemType_idx"
    ON "CollectionItem"("itemNo", "itemType");

  CREATE INDEX IF NOT EXISTS "PriceSnapshot_idx"
    ON "PriceSnapshot"("itemNo", "itemType", "condition", "capturedAt");
`)

await db.close()
console.log('Local database created at ./local.db')
