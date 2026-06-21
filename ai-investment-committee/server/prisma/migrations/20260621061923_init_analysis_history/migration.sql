-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "industry" TEXT,
    "marketCap" TEXT,
    "overallScore" INTEGER,
    "recommendation" TEXT,
    "confidence" INTEGER,
    "sourcesUsed" INTEGER,
    "evidenceQualityScore" INTEGER,
    "research" JSONB NOT NULL,
    "scorecard" JSONB NOT NULL,
    "challenge" JSONB NOT NULL,
    "finalDecision" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);
