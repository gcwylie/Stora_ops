import bcrypt from "bcryptjs";
import { loadOpsEnv } from "./load-env";

loadOpsEnv();

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = (arg("--email") || "").trim().toLowerCase();
  const name = arg("--name") || "";
  const password = arg("--password") || "";
  const role = (arg("--role") || "MANAGER").toUpperCase();
  const shop = arg("--shop") || "";
  if (!email || !name || !password || (role !== "ADMIN" && role !== "MANAGER")) {
    console.error('Usage: npm run user:create -- --email a@b.c --name "Ada" --password "…" --role MANAGER --shop SE88');
    process.exit(1);
  }
  if (role === "MANAGER" && shop !== "SE88" && shop !== "SIB2") {
    console.error("Managers need --shop SE88 or --shop SIB2.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Use a password of at least 8 characters.");
    process.exit(1);
  }
  const { prisma } = await import("../src/lib/db");
  const passwordHash = await bcrypt.hash(password, 10);
  const shopCode = role === "ADMIN" ? null : shop;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { name, passwordHash, role, shopCode } });
    console.log(`Updated ${email} (${role}${shopCode ? " " + shopCode : ""}).`);
  } else {
    await prisma.user.create({ data: { email, name, passwordHash, role, shopCode } });
    console.log(`Created ${email} (${role}${shopCode ? " " + shopCode : ""}).`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
