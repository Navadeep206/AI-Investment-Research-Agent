import analysisService from './services/analysisService.js';

async function main() {
  try {
    const id = 'cmqtodtrt0000bq1ug3khfydo';
    const record = await analysisService.getAnalysisById(id);
    console.log("=== API Response Structure (record) ===");
    console.log(JSON.stringify(record, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
