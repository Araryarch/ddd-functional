import { Result, ok, fail } from "../types";

export type TglJanji = Date & { readonly __brand: "TglJanji" };
export const TglJanji = (d: Date): Result<TglJanji> => {
  const today = new Date(new Date().toDateString());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target <= today) return fail("Tanggal janji harus di masa depan");
  return ok(target as TglJanji);
};

export type Slot = Readonly<{ mulai: number; selesai: number }>;
const JAM_BUKA = 480;
const JAM_TUTUP = 1020;
export const Slot = (mulai: number, selesai: number): Result<Slot> => {
  if (mulai < JAM_BUKA) return fail("Jam praktik mulai 08:00");
  if (selesai > JAM_TUTUP) return fail("Jam praktik selesai 17:00");
  if (mulai >= selesai) return fail("Mulai harus sebelum selesai");
  return ok({ mulai, selesai });
};
export const slotTumpuk = (a: Slot, b: Slot): boolean =>
  a.mulai < b.selesai && b.mulai < a.selesai;

export type Alasan = string & { readonly __brand: "Alasan" };
export const Alasan = (input: string): Result<Alasan> => {
  const v = input.trim();
  if (!v) return fail("Alasan tidak boleh kosong");
  return ok(v as Alasan);
};

export type HitungReschedule = number & {
  readonly __brand: "HitungReschedule";
};
export const HitungReschedule = (n: number): Result<HitungReschedule> => {
  if (!Number.isInteger(n) || n < 0) return fail("Reschedule count invalid");
  if (n > 1) return fail("Reschedule maksimal 1 kali");
  return ok(n as HitungReschedule);
};

export type Diagnosis = string & { readonly __brand: "Diagnosis" };
export const Diagnosis = (input: string): Result<Diagnosis> => {
  const v = input.trim();
  if (!v) return fail("Diagnosis tidak boleh kosong");
  return ok(v as Diagnosis);
};

export type StatusJanji =
  | { readonly _tag: "Terjadwal" }
  | { readonly _tag: "Dikonfirmasi" }
  | { readonly _tag: "Dimulai" }
  | { readonly _tag: "Selesai" }
  | { readonly _tag: "Batal"; readonly alasan: string }
  | { readonly _tag: "NoShow" };

export const StTerjadwal: StatusJanji = { _tag: "Terjadwal" };
export const StDikonfirmasi: StatusJanji = { _tag: "Dikonfirmasi" };
export const StDimulai: StatusJanji = { _tag: "Dimulai" };
export const StSelesai: StatusJanji = { _tag: "Selesai" };
export const StBatal = (a: string): StatusJanji => ({
  _tag: "Batal",
  alasan: a,
});
export const StNoShow: StatusJanji = { _tag: "NoShow" };

export const bolehTransisi = (kini: StatusJanji, tujuan: string): boolean => {
  const m: Record<string, ReadonlyArray<string>> = {
    Terjadwal: ["Dikonfirmasi", "Batal"],
    Dikonfirmasi: ["Dimulai", "Batal", "Terjadwal"],
    Dimulai: ["Selesai", "NoShow"],
    Selesai: [],
    Batal: [],
    NoShow: [],
  };
  return (m[kini._tag] ?? []).includes(tujuan);
};

export const bolehKonfirmasi = (tgl: TglJanji): boolean => {
  const diff = tgl.getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / 86400000) >= 1;
};
