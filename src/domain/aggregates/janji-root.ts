import { Result, ok, fail, isFail, ID } from "../types";
import {
  TglJanji,
  Slot,
  HitungReschedule,
  Alasan,
  StatusJanji,
  StTerjadwal,
  StDikonfirmasi,
  StDimulai,
  StSelesai,
  StBatal,
  StNoShow,
  bolehTransisi,
  bolehKonfirmasi,
} from "../value-objects/janji";

export type Janji = Readonly<{
  id: ID;
  idPasien: ID;
  idDokter: ID;
  tgl: TglJanji;
  slot: Slot;
  status: StatusJanji;
  hitungReschedule: HitungReschedule;
}>;

export const buatJanji = (
  idPasien: ID,
  idDokter: ID,
  tgl: Date,
  mulai: number,
  selesai: number,
): Result<Janji> => {
  const t = TglJanji(tgl);
  if (isFail(t)) return t;
  const s = Slot(mulai, selesai);
  if (isFail(s)) return s;
  const hr = HitungReschedule(0);
  if (isFail(hr)) return hr;
  return ok({
    id: ID(),
    idPasien,
    idDokter,
    tgl: t.value,
    slot: s.value,
    status: StTerjadwal,
    hitungReschedule: hr.value,
  });
};

export const konfirmasiJanji = (j: Janji): Result<Janji> => {
  if (!bolehTransisi(j.status, "Dikonfirmasi"))
    return fail(`Tidak bisa konfirmasi dari ${j.status._tag}`);
  if (!bolehKonfirmasi(j.tgl)) return fail("Konfirmasi minimal H-1");
  return ok({ ...j, status: StDikonfirmasi });
};

export const mulaiJanji = (j: Janji): Result<Janji> => {
  if (!bolehTransisi(j.status, "Dimulai"))
    return fail(`Tidak bisa mulai dari ${j.status._tag}`);
  return ok({ ...j, status: StDimulai });
};

export const selesaiJanji = (j: Janji): Result<Janji> => {
  if (!bolehTransisi(j.status, "Selesai"))
    return fail(`Tidak bisa selesai dari ${j.status._tag}`);
  return ok({ ...j, status: StSelesai });
};

export const batalJanji = (j: Janji, alasan: string): Result<Janji> => {
  if (!bolehTransisi(j.status, "Batal"))
    return fail(`Tidak bisa batal dari ${j.status._tag}`);
  const a = Alasan(alasan);
  if (isFail(a)) return a;
  return ok({ ...j, status: StBatal(a.value) });
};

export const noShowJanji = (j: Janji): Result<Janji> => {
  if (!bolehTransisi(j.status, "NoShow"))
    return fail(`NoShow tidak valid dari ${j.status._tag}`);
  return ok({ ...j, status: StNoShow });
};

export const jadwalUlangJanji = (
  j: Janji,
  tglBaru: Date,
  mulai: number,
  selesai: number,
): Result<Janji> => {
  if (j.status._tag !== "Terjadwal" && j.status._tag !== "Dikonfirmasi")
    return fail(`Tidak bisa reschedule dari ${j.status._tag}`);
  if (j.hitungReschedule >= 1) return fail("Reschedule maksimal 1 kali");

  const t = TglJanji(tglBaru);
  if (isFail(t)) return t;
  const s = Slot(mulai, selesai);
  if (isFail(s)) return s;
  const hr = HitungReschedule(j.hitungReschedule + 1);
  if (isFail(hr)) return hr;

  return ok({
    ...j,
    tgl: t.value,
    slot: s.value,
    status: StTerjadwal,
    hitungReschedule: hr.value,
  });
};
