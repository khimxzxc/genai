import prisma from './src/db.js';
async function clean() {
  const result = await prisma.submission.deleteMany({});
  console.log(`Deleted ${result.count} submissions.`);
}
clean().catch(console.error).finally(() => process.exit(0));
