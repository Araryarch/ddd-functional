import { Result, fail } from "../types";
import { Janji } from "../aggregates/janji-root";
import { RekamMedis, buatRM } from "../entities/rekam-medis";

export const catatRM = (
  janji: Janji,
  diagnoses: string[],
  catatan: string,
): Result<RekamMedis> => {
  if (janji.status._tag !== "Selesai")
    return fail("Rekam medis hanya setelah Selesai");
  return buatRM(janji.id, diagnoses, catatan);
};
