-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shopCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "homeShopCode" TEXT NOT NULL,
    "alsoShopCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "salary" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DOUBLE PRECISION,
    "caspecoEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "fohAvg" DOUBLE PRECISION NOT NULL DEFAULT 153,
    "kitchenAvg" DOUBLE PRECISION NOT NULL DEFAULT 153,
    "bakeryAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetFohPct" DOUBLE PRECISION NOT NULL DEFAULT 21,
    "semesterPct" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "agaPct" DOUBLE PRECISION NOT NULL DEFAULT 31.42,
    "yearlyTargetPct" DOUBLE PRECISION NOT NULL DEFAULT 10,

    CONSTRAINT "LabourSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleShift" (
    "id" TEXT NOT NULL,
    "shopCode" TEXT NOT NULL,
    "weekMonday" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ScheduleShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesDay" (
    "date" DATE NOT NULL,
    "shopCode" TEXT NOT NULL,
    "exclOre" INTEGER NOT NULL,
    "inclOre" INTEGER NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "SalesDay_pkey" PRIMARY KEY ("date","shopCode")
);

-- CreateTable
CREATE TABLE "SalesPeriod" (
    "id" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "shopCode" TEXT NOT NULL,
    "exclOre" INTEGER NOT NULL,
    "inclOre" INTEGER NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "SalesPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCostMonth" (
    "month" TEXT NOT NULL,
    "shopCode" TEXT NOT NULL,
    "costKr" INTEGER NOT NULL,

    CONSTRAINT "StaffCostMonth_pkey" PRIMARY KEY ("month","shopCode")
);

-- CreateTable
CREATE TABLE "CatalogueItem" (
    "n" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "sites" TEXT[],
    "orderUnit" TEXT NOT NULL,
    "primaryUnit" TEXT NOT NULL,
    "primaryToBase" DOUBLE PRECISION,
    "baseUnit" TEXT,
    "perPiece" DOUBLE PRECISION,
    "priceSek" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "alts" JSONB NOT NULL,

    CONSTRAINT "CatalogueItem_pkey" PRIMARY KEY ("n")
);

-- CreateTable
CREATE TABLE "CategoryLimit" (
    "category" TEXT NOT NULL,
    "kg" DOUBLE PRECISION,
    "litres" DOUBLE PRECISION,
    "pcs" DOUBLE PRECISION,
    "units" DOUBLE PRECISION,
    "valueCap" DOUBLE PRECISION,

    CONSTRAINT "CategoryLimit_pkey" PRIMARY KEY ("category")
);

-- CreateTable
CREATE TABLE "StockSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maxUnits" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "valueCap" DOUBLE PRECISION NOT NULL DEFAULT 20000,
    "countOverdueDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "StockSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "shopCode" TEXT NOT NULL,
    "countDate" DATE NOT NULL,
    "countedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLine" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "itemN" INTEGER NOT NULL,
    "qty" DOUBLE PRECISION,
    "altQty" DOUBLE PRECISION,
    "altUnit" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "ack" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StockLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaspecoQueue" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaspecoQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ScheduleShift_weekMonday_idx" ON "ScheduleShift"("weekMonday");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleShift_shopCode_weekMonday_employeeId_dayIndex_key" ON "ScheduleShift"("shopCode", "weekMonday", "employeeId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPeriod_fromDate_toDate_shopCode_key" ON "SalesPeriod"("fromDate", "toDate", "shopCode");

-- CreateIndex
CREATE INDEX "StockCount_shopCode_countDate_idx" ON "StockCount"("shopCode", "countDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockLine_countId_itemN_key" ON "StockLine"("countId", "itemN");

-- AddForeignKey
ALTER TABLE "ScheduleShift" ADD CONSTRAINT "ScheduleShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLine" ADD CONSTRAINT "StockLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLine" ADD CONSTRAINT "StockLine_itemN_fkey" FOREIGN KEY ("itemN") REFERENCES "CatalogueItem"("n") ON DELETE RESTRICT ON UPDATE CASCADE;
