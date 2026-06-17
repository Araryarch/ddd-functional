import { Result, ok, isFail, ID } from "../types";
import { PatientName, Email, Phone } from "../value-objects/pasien";

export type Pasien = Readonly<{
  id: ID;
  nama: PatientName;
  email: Email;
  telepon: Phone;
  aktif: boolean;
}>;

export const daftarPasien = (
  nama: string,
  email: string,
  telp: string,
): Result<Pasien> => {
  const n = PatientName(nama);
  if (isFail(n)) return n;
  const e = Email(email);
  if (isFail(e)) return e;
  const t = Phone(telp);
  if (isFail(t)) return t;
  return ok({
    id: ID(),
    nama: n.value,
    email: e.value,
    telepon: t.value,
    aktif: true,
  });
};

export const suspendPasien = (p: Pasien): Pasien => ({ ...p, aktif: false });
