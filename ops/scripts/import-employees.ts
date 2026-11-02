import fs from "fs";
import { loadOpsEnv } from "./load-env";

loadOpsEnv();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run import:employees -- /path/to/employees.json");
    process.exit(1);
  }
  const { prisma } = await import("../src/lib/db");
  const { importEmployeesJson } = await import("../src/lib/persist");
  const result = await importEmployeesJson(prisma, JSON.parse(fs.readFileSync(file, "utf8")));
  console.log(`Employees: ${result.updated} updated, ${result.created} created. A name→id map only fills Caspeco ids. New names are created as FOH with shop UNASSIGNED until you set them on Staff.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
