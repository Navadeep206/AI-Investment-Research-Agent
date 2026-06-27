import prisma from './config/prisma.js';

async function main() {
  try {
    const records = await prisma.analysis.findMany();
    console.log(`Total records: ${records.length}`);
    const nonZero = records.filter(r => r.evidenceQualityScore > 0);
    console.log(`Records with evidenceQualityScore > 0: ${nonZero.length}`);
    nonZero.forEach(r => {
      console.log(`  ID: ${r.id} | Company: ${r.company} | score: ${r.evidenceQualityScore}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
