import { Result, fail, isFail } from "../types";
import { Slot, slotTumpuk } from "../value-objects/janji";
import { Pasien } from "../entities/pasien";
import { Dokter } from "../entities/dokter";
import { Janji, buatJanji } from "../aggregates/janji-root";

export const bookingJanji = (
  pasien: Pasien,
  dokter: Dokter,
  semuaJanji: ReadonlyArray<Janji>,
  tgl: Date,
  mulai: number,
  selesai: number,
): Result<Janji> => {
  if (!pasien.aktif) return fail("Pasien tidak aktif");
  if (!dokter.aktif) return fail("Dokter tidak aktif");

  const tglTarget = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate());
  const janjiDokter = semuaJanji.filter(
    (j) =>
      j.idDokter === dokter.id &&
      j.tgl.getTime() === tglTarget.getTime() &&
      j.status._tag !== "Batal" &&
      j.status._tag !== "NoShow",
  );
  if (janjiDokter.length >= 10) return fail("Dokter penuh (maks 10/hari)");

  const slotUsulan = Slot(mulai, selesai);
  if (isFail(slotUsulan)) return slotUsulan;
  if (janjiDokter.some((j) => slotTumpuk(j.slot, slotUsulan.value)))
    return fail("Slot sudah dibooking");

  const janjiPasien = semuaJanji.filter(
    (j) =>
      j.idPasien === pasien.id &&
      j.tgl.getTime() === tglTarget.getTime() &&
      (j.status._tag === "Terjadwal" ||
        j.status._tag === "Dikonfirmasi" ||
        j.status._tag === "Dimulai"),
  );
  if (janjiPasien.some((j) => slotTumpuk(j.slot, slotUsulan.value)))
    return fail("Pasien sudah punya janji di jam ini");

  return buatJanji(pasien.id, dokter.id, tgl, mulai, selesai);
};
