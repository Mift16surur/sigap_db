import fs from "fs";
import path from "path";

/**
 * Script Verifikasi Data Seeding SIGAP
 */
export async function verifySeed() {
  const seedDir = path.join(__dirname);
  const results: Record<string, { ok: boolean; count: number; errors: string[] }> = {};

  const files = [{ file: "bed.json", idKey: "bed_id" }];

  for (const item of files) {
    const fullPath = path.join(seedDir, item.file);
    const errors: string[] = [];

    if (!fs.existsSync(fullPath)) {
      results[item.file] = { ok: false, count: 0, errors: [`File ${item.file} tidak ditemukan`] };
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      if (!Array.isArray(data)) {
        errors.push(`Format file ${item.file} bukan array JSON valid`);
      } else {
        const idSet = new Set<string>();
        data.forEach((entry, idx) => {
          const id = entry[item.idKey];
          if (!id) {
            errors.push(`Baris ke-${idx} tidak memiliki kunci unik '${item.idKey}'`);
          } else if (idSet.has(id)) {
            errors.push(`Duplikasi ID terdeteksi: ${id}`);
          } else {
            idSet.add(id);
          }
        });
        results[item.file] = { ok: errors.length === 0, count: data.length, errors };
      }
    } catch (e: any) {
      errors.push(`JSON Parse Error: ${e.message}`);
      results[item.file] = { ok: false, count: 0, errors };
    }
  }

  return results;
}

if (require.main === module) {
  verifySeed().then((r) => {
    console.log("🔍 Hasil Verifikasi Seed JSON SIGAP:");
    console.dir(r, { depth: null });
  });
}
