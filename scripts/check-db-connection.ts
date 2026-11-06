import "dotenv/config";
import { prisma } from "../src/core/database/prisma";

try {
  await prisma.$queryRaw`SELECT 1 AS connection_check`;
  console.info("Prisma Client connected to the test database.");
} catch (error) {
  console.error("Prisma Client could not connect to the test database.", error);

  if (error instanceof Error && "cause" in error) {
    console.error("Underlying database driver cause:", error.cause);
  }

  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
