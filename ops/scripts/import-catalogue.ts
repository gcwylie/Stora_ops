import fs from "fs";
import { loadOpsEnv } from "./load-env";

loadOpsEnv();

async function main() {
  const file = process.argv[2];
  const replace = process.argv.includes("--replace");
  if (!file) {
    console.error("Usage: npm run import:catalogue -- /path/to/stock-catalogue.json [--replace]");
    process.exit(1);
  }
  const { prisma } = await import("../src/lib/db");
  const { importCatalogueJson } = await import("../src/lib/persist");
  const result = await importCatalogueJson(prisma, JSON.parse(fs.readFileSync(file, "utf8")), replace);
  console.log(`Catalogue: ${result.items} bakery items, ${result.skipped} skipped (including Gast Café / RAD57). Removed ${result.removed} unused items.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
