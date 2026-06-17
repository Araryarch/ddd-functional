import { Result, ok, fail, isOk, isFail, ID } from "../types";
import { Diagnosis } from "../value-objects/janji";

export type RekamMedis = Readonly<{
  id: ID;
  idJanji: ID;
  diagnoses: ReadonlyArray<Diagnosis>;
  catatan: string;
}>;

export const buatRM = (
  idJanji: ID,
  diagnoses: string[],
  catatan: string,
): Result<RekamMedis> => {
  if (!diagnoses.length) return fail("Minimal 1 diagnosis");
  const ds = diagnoses.map(Diagnosis);
  const gagal = ds.find(isFail);
  if (gagal) return gagal;
  return ok({
    id: ID(),
    idJanji,
    diagnoses: ds.filter(isOk).map((r) => r.value),
    catatan: catatan.trim(),
  });
};
