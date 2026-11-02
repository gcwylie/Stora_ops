import fs from "fs";
import { loadOpsEnv } from "./load-env";

loadOpsEnv();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run import:rates -- /path/to/staff-rates.json");
    process.exit(1);
  }
  const { prisma } = await import("../src/lib/db");
  const { importRatesJson } = await import("../src/lib/persist");
  const result = await importRatesJson(prisma, JSON.parse(fs.readFileSync(file, "utf8")));
  console.log(`Rates saved. Hourly overrides matched: ${result.hourly}. Salary flags: ${result.salary}. Names that are not already on the roster are skipped.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
