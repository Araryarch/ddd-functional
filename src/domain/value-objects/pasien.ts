import { Result, ok, fail } from "../types";

export type PatientName = string & { readonly __brand: "PatientName" };
export const PatientName = (input: string): Result<PatientName> => {
  const v = input.trim();
  if (!v) return fail("Nama pasien tidak boleh kosong");
  if (v.length > 100) return fail("Nama pasien maksimal 100 karakter");
  return ok(v as PatientName);
};

export type Email = string & { readonly __brand: "Email" };
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const Email = (input: string): Result<Email> => {
  const v = input.trim().toLowerCase();
  if (!v) return fail("Email tidak boleh kosong");
  if (v.length > 254) return fail("Email terlalu panjang");
  if (!RE_EMAIL.test(v)) return fail("Format email tidak valid");
  return ok(v as Email);
};

export type Phone = string & { readonly __brand: "Phone" };
const RE_PHONE = /^(?:\+62|08)\d{8,13}$/;
export const Phone = (input: string): Result<Phone> => {
  const v = input.trim().replace(/[\s-]/g, "");
  if (!RE_PHONE.test(v)) return fail("Nomor telepon harus +62/08, 10-15 digit");
  return ok(v as Phone);
};
