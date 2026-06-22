import fs from 'fs';
import path from 'path';
import axios from 'axios';
import prisma from './config/prisma.js';
import app from './app.js';

// Run in mock mode
process.env.MOCK_LLM = 'true';

const PORT = 6001;
const BASE_URL = `http://localhost:${PORT}`;

const runVerification = async () => {
  console.log("=========================================");
  console.log("VERIFYING COMPARATIVE PDF GENERATION");
  console.log("=========================================");

  // Boot server
  const server = app.listen(PORT, async () => {
    console.log(`Verification server booted on port ${PORT}`);

    try {
      // 1. Check if we have some existing analyses in DB
      const analyses = await prisma.analysis.findMany({ take: 2 });
      console.log(`Found ${analyses.length} existing analysis records in database.`);
      
      let compA = 'NVIDIA';
      let compB = 'AMD';
      if (analyses.length >= 2) {
        compA = analyses[0].company;
        compB = analyses[1].company;
      }
      console.log(`Using comparison targets: "${compA}" and "${compB}"`);

      // 2. Fetch Comparison PDF
      console.log("Requesting side-by-side comparison PDF...");
      const response = await axios.get(`${BASE_URL}/api/report/compare`, {
        params: { companyA: compA, companyB: compB },
        responseType: 'arraybuffer'
      });

      console.log("Response Status:", response.status);
      console.log("Response Headers:", response.headers['content-type']);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (response.headers['content-type'] !== 'application/pdf') {
        throw new Error(`Expected content-type application/pdf, got ${response.headers['content-type']}`);
      }

      // 3. Write PDF to local verification file
      const outputPath = path.join(process.cwd(), 'comparison_test_output.pdf');
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ Comparative PDF written successfully to: ${outputPath}`);

      const stats = fs.statSync(outputPath);
      console.log(`PDF File Size: ${stats.size} bytes`);
      if (stats.size < 1000) {
        throw new Error("Generated PDF is suspiciously small (corrupted or empty).");
      }

      console.log("✓ VERIFICATION COMPLETED SUCCESSFULLY");
      process.exit(0);
    } catch (err) {
      console.error("❌ Verification failed:", err.message);
      if (err.response) {
        console.error("Server Response Error:", err.response.data ? Buffer.from(err.response.data).toString() : 'No body');
      }
      process.exit(1);
    } finally {
      server.close();
    }
  });
};

runVerification();
