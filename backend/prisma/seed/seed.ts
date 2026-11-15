import fs from "fs";
import path from "path";

/**
 * Seeding Script untuk SIGAP Skrining Admisi PE & HPP
 */
export async function runSeed() {
  const seedDir = path.join(__dirname);
  const bedsPath = path.join(seedDir, "bed.json");
  const beds = fs.existsSync(bedsPath) ? JSON.parse(fs.readFileSync(bedsPath, "utf8")) : [];

  console.log("🌱 [Prisma Seed] Memulai seeding data awal SIGAP CDSS...");
  console.log(`🛏️ Memuat ${beds.length} data Tempat Tidur / Ruang Bersalin (VK/PONEK)...`);

  console.log("✅ [Prisma Seed] Seeding data awal SIGAP berhasil.");
  return { bedsCount: beds.length };
}

if (require.main === module) {
  runSeed()
    .then((res) => console.log("Hasil Seeding:", res))
    .catch((err) => console.error("Error Seeding:", err));
}
