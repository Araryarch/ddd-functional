import { Result, fail, isFail } from "../types";
import { Slot, slotTumpuk } from "../value-objects/janji";
import { Janji, jadwalUlangJanji } from "../aggregates/janji-root";

export const jadwalUlang = (
  janji: Janji,
  semuaJanji: ReadonlyArray<Janji>,
  tglBaru: Date,
  mulai: number,
  selesai: number,
): Result<Janji> => {
  const slotBaru = Slot(mulai, selesai);
  if (isFail(slotBaru)) return slotBaru;

  const lain = semuaJanji.filter(
    (j) =>
      j.id !== janji.id &&
      j.idDokter === janji.idDokter &&
      j.tgl.getTime() ===
        new Date(
          tglBaru.getFullYear(),
          tglBaru.getMonth(),
          tglBaru.getDate(),
        ).getTime() &&
      j.status._tag !== "Batal" &&
      j.status._tag !== "NoShow",
  );
  if (lain.some((j) => slotTumpuk(j.slot, slotBaru.value)))
    return fail("Slot baru sudah dibooking");

  return jadwalUlangJanji(janji, tglBaru, mulai, selesai);
};
