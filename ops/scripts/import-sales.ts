import fs from "fs";
import { loadOpsEnv } from "./load-env";

loadOpsEnv();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run import:sales -- /path/to/sales-days.json");
    process.exit(1);
  }
  const { prisma } = await import("../src/lib/db");
  const { importSalesJson } = await import("../src/lib/persist");
  const result = await importSalesJson(prisma, JSON.parse(fs.readFileSync(file, "utf8")));
  console.log(`Imported ${result.days} days and ${result.periods} period rows. Östermalm → SIB2, St Eriksgatan (vasastan) → SE88. Other sites ignored.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
