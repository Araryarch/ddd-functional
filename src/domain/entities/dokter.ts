import { ID } from "../types";

export type Dokter = Readonly<{
  id: ID;
  nama: string;
  spesialis: string;
  aktif: boolean;
}>;

export const buatDokter = (nama: string, spesialis: string): Dokter => {
  if (!nama.trim()) throw new Error("Nama dokter tidak boleh kosong");
  if (!spesialis.trim())
    throw new Error("Spesialisasi dokter tidak boleh kosong");
  return {
    id: ID(),
    nama: nama.trim(),
    spesialis: spesialis.trim(),
    aktif: true,
  };
};
