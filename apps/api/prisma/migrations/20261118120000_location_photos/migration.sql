-- CreateTable
CREATE TABLE "LocationPhoto" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "caption" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationPhoto_locationId_sortOrder_idx" ON "LocationPhoto"("locationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "LocationPhoto" ADD CONSTRAINT "LocationPhoto_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
