import express from 'express';
import axios from 'axios';
import prisma from './config/prisma.js';
import app from './app.js';

// Set Mock Mode
process.env.MOCK_LLM = 'true';

const PORT = 5999;
const BASE_URL = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runTests = async () => {
  console.log("=========================================");
  console.log("STARTING HARDENING INTEGRATION TESTING");
  console.log("=========================================");

  // 1. Start express server on dynamic test port
  const server = app.listen(PORT, async () => {
    console.log(`Test server booted successfully on port ${PORT}`);

    try {
      // Clean up previous test analyses for "NVIDIA"
      await prisma.analysis.deleteMany({
        where: {
          company: {
            equals: "NVIDIA",
            mode: "insensitive"
          }
        }
      });

      // --- TEST 1: Health Endpoint Telemetry Upgrade ---
      console.log("\n--- TEST 1: UPGRADED HEALTH ENDPOINT ---");
      const healthRes = await axios.get(`${BASE_URL}/api/system/health`);
      console.log("Health Response Status:", healthRes.status);
      console.log("Health Payload:", JSON.stringify(healthRes.data, null, 2));

      if (
        healthRes.data.success !== true ||
        !healthRes.data.requestId ||
        !healthRes.data.timestamp ||
        healthRes.data.data.system !== 'healthy' ||
        healthRes.data.data.version !== '1.0.0' ||
        typeof healthRes.data.data.uptime !== 'string' ||
        typeof healthRes.data.data.activeRequests !== 'number'
      ) {
        throw new Error("Health endpoint telemetry validation failed.");
      }
      console.log("✓ TEST 1 PASSED");

      // --- TEST 2: Fresh Analysis Generation & Tracing & Metrics & Calibration ---
      console.log("\n--- TEST 2: FRESH ANALYSIS GENERATION ---");
      const analysisRes1 = await axios.post(`${BASE_URL}/api/analyze`, {
        company: "NVIDIA",
        sessionId: "session-test-123"
      });

      console.log("Analysis 1 Response Status:", analysisRes1.status);
      console.log("Analysis 1 Envelope keys:", Object.keys(analysisRes1.data));
      console.log("Analysis 1 Data Source:", analysisRes1.data.data.dataSource);
      console.log("Analysis 1 RequestId:", analysisRes1.data.requestId);

      const a1 = analysisRes1.data.data;
      
      // Verify requestId structure
      const requestIdFormat = /^REQ-\d{8}-[A-Z0-9]{4}$/;
      if (!requestIdFormat.test(analysisRes1.data.requestId)) {
        throw new Error(`RequestId "${analysisRes1.data.requestId}" does not match required format REQ-YYYYMMDD-XXXX.`);
      }

      // Verify Database row was saved with metrics and breakdown
      const dbRow = await prisma.analysis.findUnique({
        where: { id: a1.analysisId }
      });

      console.log("DB Row Found:", !!dbRow);
      console.log("DB Saved RequestId:", dbRow.requestId);
      console.log("DB Saved Confidence Breakdown:", JSON.stringify(dbRow.confidenceBreakdown));
      console.log("DB Saved Agent Metrics:", JSON.stringify(dbRow.agentMetrics));

      if (dbRow.requestId !== analysisRes1.data.requestId) {
        throw new Error("DB RequestId mismatch.");
      }
      if (!dbRow.confidenceBreakdown || typeof dbRow.confidenceBreakdown.agentAgreement !== 'number') {
        throw new Error("Confidence breakdown not saved to database.");
      }
      if (!dbRow.agentMetrics || typeof dbRow.agentMetrics.totalMs !== 'number') {
        throw new Error("Agent metrics not saved to database.");
      }
      console.log("✓ TEST 2 PASSED");

      // --- TEST 3: Cache Hit Verification (Immediate query) ---
      console.log("\n--- TEST 3: CACHE HIT VERIFICATION ---");
      const analysisRes2 = await axios.post(`${BASE_URL}/api/analyze`, {
        company: "NVIDIA",
        sessionId: "session-test-123"
      });
      console.log("Analysis 2 Data Source:", analysisRes2.data.data.dataSource);
      console.log("Analysis 2 Cache Reason:", analysisRes2.data.data.cacheReason);
      if (analysisRes2.data.data.dataSource !== "CACHE") {
        throw new Error(`Expected CACHE hit, got: ${analysisRes2.data.data.dataSource}`);
      }
      console.log("✓ TEST 3 PASSED");

      // --- TEST 4: Material Event Cache Invalidation & EVENT_REFRESH ---
      console.log("\n--- TEST 4: MATERIAL EVENT CACHE INVALIDATION ---");
      // Simulate that the analysis was generated 2 minutes ago
      // The mock events are set to be published 30 seconds ago, which will be newer!
      await prisma.analysis.update({
        where: { id: a1.analysisId },
        data: {
          createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
        }
      });

      const analysisRes3 = await axios.post(`${BASE_URL}/api/analyze`, {
        company: "NVIDIA",
        sessionId: "session-test-123"
      });

      console.log("Analysis 3 Data Source:", analysisRes3.data.data.dataSource);
      console.log("Analysis 3 Cache Reason:", analysisRes3.data.data.cacheReason);

      const dbRow3 = await prisma.analysis.findUnique({
        where: { id: analysisRes3.data.data.analysisId }
      });
      console.log("DB Saved Material Event Count:", dbRow3.materialEventCount);
      console.log("DB Saved Last Material Event At:", dbRow3.lastMaterialEventAt);

      if (analysisRes3.data.data.dataSource !== "EVENT_REFRESH") {
        throw new Error(`Expected EVENT_REFRESH, got: ${analysisRes3.data.data.dataSource}`);
      }
      if (dbRow3.materialEventCount <= 0 || !dbRow3.lastMaterialEventAt) {
        throw new Error("Material event details not populated in database on EVENT_REFRESH.");
      }
      console.log("✓ TEST 4 PASSED");

      // --- TEST 5: Rate Limiting Enforcement ---
      console.log("\n--- TEST 5: RATE LIMITING ENFORCEMENT ---");
      console.log("Spamming protected endpoint /api/analyze to trigger rate limiter...");
      
      let rateLimitHit = false;
      let limitResponse = null;

      // Send 25 requests in parallel (limit is 20 requests per 15 minutes)
      const requests = Array.from({ length: 25 }).map(() => {
        return axios.post(`${BASE_URL}/api/analyze`, {
          company: "NVIDIA",
          sessionId: "session-test-123"
        }).catch(err => err.response);
      });

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r ? r.status : null);
      console.log("Spam Request Status Codes:", statuses);

      const rateLimitResponse = responses.find(r => r && r.status === 429);
      if (rateLimitResponse) {
        rateLimitHit = true;
        limitResponse = rateLimitResponse.data;
      }

      console.log("Rate Limit Hit Status:", rateLimitHit);
      if (rateLimitHit) {
        console.log("Rate Limit Payload:", JSON.stringify(limitResponse, null, 2));
        if (
          limitResponse.success !== false ||
          !limitResponse.requestId ||
          !limitResponse.timestamp ||
          limitResponse.error.status !== 429
        ) {
          throw new Error("Rate limit JSON response validation failed.");
        }
      } else {
        throw new Error("Rate limiter did not block requests. Expected at least one 429 status code.");
      }
      console.log("✓ TEST 5 PASSED");

      console.log("\n=========================================");
      console.log("ALL HARDENING SPRINT INTEGRATION TESTS PASSED!");
      console.log("=========================================");

    } catch (err) {
      console.error("\n❌ TESTS FAILED:", err.stack || err.message);
      if (err.response) {
        console.error("Failure Response Body:", JSON.stringify(err.response.data, null, 2));
      }
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log("Test server shut down.");
        process.exit();
      });
    }
  });
};

runTests();
