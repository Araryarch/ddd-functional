# Belajar DDD Tactical Patterns — Klinik Sehat

**TypeScript · Functional Programming · Clean Architecture**

Project ini adalah contoh implementasi **Domain-Driven Design (DDD) Tactical Patterns** di domain layer. Kode ditulis secara **functional** — immutable, pure functions, Result type.

```
npm start              # run demo 12 skenario
npx tsc --noEmit       # typecheck
```

---

## Struktur

```
src/domain/
├── types.ts                        # Result<T,E>, ID
├── value-objects/                  # self-validating, immutable, tanpa identity
│   ├── pasien.ts
│   └── janji.ts
├── entities/                       # punya identity (ID)
│   ├── pasien.ts
│   ├── dokter.ts
│   └── rekam-medis.ts
├── aggregates/                     # entry point cluster, jaga invariant bisnis
│   └── janji-root.ts
└── domain-services/                # logika lintas-aggregate
    ├── booking.ts
    ├── penjadwalan-ulang.ts
    └── pencatatan-rm.ts
```

---

## Value Object

Ciri: **tanpa identity**, **immutable**, **self-validating**.

Dua VO dengan nilai sama dianggap sama. Setiap factory function melakukan validasi bisnis.

### Contoh: `src/domain/value-objects/pasien.ts:3-8`

```typescript
export type PatientName = string & { readonly __brand: 'PatientName' }
export const PatientName = (input: string): Result<PatientName> => {
  const v = input.trim()
  if (!v) return fail('Nama pasien tidak boleh kosong')
  if (v.length > 100) return fail('Nama pasien maksimal 100 karakter')
  return ok(v as PatientName)
}
```

Ada **9 Value Objects** di project ini:

| VO | File | Baris |
|----|------|-------|
| `PatientName` | `value-objects/pasien.ts` | 3-8 |
| `Email` | `value-objects/pasien.ts` | 11-18 |
| `Phone` | `value-objects/pasien.ts` | 21-26 |
| `TglJanji` | `value-objects/janji.ts` | 3-8 |
| `Slot` | `value-objects/janji.ts` | 11-18 |
| `Alasan` | `value-objects/janji.ts` | 23-27 |
| `HitungReschedule` | `value-objects/janji.ts` | 30-35 |
| `Diagnosis` | `value-objects/janji.ts` | 38-42 |
| `StatusJanji` | `value-objects/janji.ts` | 45-62 |

`StatusJanji` adalah **state machine** yang direpresentasikan sebagai **discriminated union** — lihat `bolehTransisi:74` untuk aturan state transition.

---

## Entity

Ciri: **punya identity (ID)**, bisa berubah, dibandingkan pakai ID.

### Contoh: `src/domain/entities/pasien.ts:4-10`

```typescript
export type Pasien = Readonly<{
  id: ID
  nama: PatientName
  email: Email
  telepon: Phone
  aktif: boolean
}>
```

ID adalah **branded type** agar tidak tertukar antar entity:

```
export type ID = string & { readonly __brand: "ID" }
```

Entity → entity lain direferensi pakai `ID`, bukan object:

```
// aggregates/janji-root.ts:19-21
idPasien: ID    // ← bukan object Pasien
idDokter: ID    // ← bukan object Dokter
```

| Entity | File | Baris | Factory |
|--------|------|-------|---------|
| `Pasien` | `entities/pasien.ts` | 4-10 | `daftarPasien:16` |
| `Dokter` | `entities/dokter.ts` | 3-8 | `buatDokter:10` |
| `RekamMedis` | `entities/rekam-medis.ts` | 6-11 | `buatRM:14` |

---

## Aggregate Root

Ciri: **entry point cluster**, **jaga transactional boundary**, **referensi antar aggregate via ID**.

### Contoh: `src/domain/aggregates/janji-root.ts:18-26`

```typescript
export type Janji = Readonly<{
  id: ID
  idPasien: ID            // referensi ke aggregate Pasien
  idDokter: ID            // referensi ke aggregate Dokter
  tgl: TglJanji
  slot: Slot
  status: StatusJanji
  hitungReschedule: HitungReschedule
}>
```

Semua transisi status (business rules) melewati fungsi di aggregate root:

| Operasi | Baris | Guard clause (invariant yang dicek) |
|---------|-------|--------------------------------------|
| `buatJanji` | 28-50 | tgl future + slot valid + reschedule 0 |
| `konfirmasiJanji` | 52-59 | ST-008: harus H-1 |
| `mulaiJanji` | 61-66 | hanya dari Dikonfirmasi |
| `selesaiJanji` | 68-73 | hanya dari Dimulai |
| `batalJanji` | 75-83 | AC-06: wajib alasan, sebelum Dimulai |
| `noShowJanji` | 85-90 | AC-09: dari Dimulai |
| `jadwalUlangJanji` | 92-109 | AC-08: max 1x, hanya Terjadwal/Dikonfirmasi |

Lihat `bolehTransisi` di `value-objects/janji.ts:64-73` untuk aturan state machine secara lengkap.

---

## Domain Service

Ciri: **stateless**, **melibatkan multiple aggregate**, operasi bisnis yang gak cocok di Entity/VO.

### Contoh: `src/domain/domain-services/booking.ts:7-45`

```typescript
export const bookingJanji = (
  pasien: Pasien,            // entity
  dokter: Dokter,            // entity
  semuaJanji: ReadonlyArray<Janji>,  // aggregate root
  tgl: Date, mulai: number, selesai: number,
): Result<Janji> => {
  if (!pasien.aktif) return fail('Pasien tidak aktif')       // baris 15
  if (!dokter.aktif) return fail('Dokter tidak aktif')       // baris 16
  // ... validasi kapasitas 10/hari, overlap, double booking
  return buatJanji(pasien.id, dokter.id, tgl, mulai, selesai) // delegasi ke aggregate
}
```

| Service | File | Baris | Melibatkan |
|---------|------|-------|------------|
| `bookingJanji` | `domain-services/booking.ts` | 7-45 | Pasien + Dokter + Janji[] |
| `jadwalUlang` | `domain-services/penjadwalan-ulang.ts` | 7-30 | Janji + Janji[] |
| `catatRM` | `domain-services/pencatatan-rm.ts` | 5-13 | Janji + RekamMedis |

---

## Workflow: Dari Meeting Notes ke Kode

Buka **`bisnisrule.md`** — itu catatan meeting asli. Bahasa domain expert (Bu Sari), belum di-structure.

Ini adalah **tutorial langkah demi langkah** cara developer berpikir waktu menterjemahkan catatan mentah ke kode DDD. Buka `bisnisrule.md` di tab sebelah, ikuti step di bawah.

---

### Step 1 — Baca sekali, tangkap alur besarnya

Baca `bisnisrule.md` tanpa mikir kode dulu. Cari **cerita bisnis**-nya:

> Ada klinik. Pasien daftar → booking janji → konfirmasi → datang periksa → selesai.
> Atau bisa batal, no-show, reschedule.

Ini akan jadi **aggregate** utama kita. Core domain-nya adalah **Janji Temu** (appointment).

---

### Step 2 — Cari "noun dengan aturan", itu Value Object

Baca lagi, kali ini garisbawahi kata benda yang punya aturan:

| Di catatan | Aturan | Jadi VO |
|------------|--------|---------|
| "Nama lengkap, gak boleh kosong, max 100" | validasi format & length | `PatientName` |
| "Email yang bener format email" | regex | `Email` |
| "No HP +62 atau 08, 10-15 digit" | regex | `Phone` |
| "Tanggal harus H+1 ke depan" | tgl > hari ini | `TglJanji` |
| "Jam 08.00-17.00, tiap janji 1 jam" | range + urutan | `Slot` |
| "Waktu batal wajib isi alasan" | gak boleh kosong | `Alasan` |
| "Reschedule maksimal 1 kali" | angka dengan batas | `HitungReschedule` |
| "Diagnosa minimal 1" | gak boleh kosong | `Diagnosis` |

Ciri khas VO: **nilai** (bukan identity), **self-validating** (pake `Result<T,E>`), **immutable**.

**Output:** file `value-objects/pasien.ts` dan `value-objects/janji.ts`.

---

### Step 3 — Cari "status yang berubah-ubah", itu State Machine

"Terjadwal → Dikonfirmasi → Dimulai → Selesai" plus Batal dan NoShow.
Ini **6 state** dengan aturan transisi:

```
Terjadwal  → Dikonfirmasi | Batal | Terjadwal (reschedule)
Dikonfirmasi → Dimulai | Batal | Terjadwal (reschedule)
Dimulai → Selesai | NoShow
Selesai → (terminal)
Batal → (terminal)
NoShow → (terminal)
```

Pilih representasi: **discriminated union** dengan `_tag` sebagai discriminant.
Bikin fungsi `bolehTransisi(from, to)` untuk guard.

**Output:** `StatusJanji` di `value-objects/janji.ts`.

---

### Step 4 — Cari "noun yang perlu dilacak", itu Entity

Entity = sesuatu yang punya **identity** (bisa berubah nilainya tapi tetap dianggap sama).

| Di catatan | Kenapa Entity? |
|------------|---------------|
| **Pasien** | Didaftarkan, bisa di-suspend, punya riwayat janji |
| **Dokter** | Punya jadwal, bisa cuti/non-aktif |
| **RekamMedis** | Catatan per janji, perlu dilacak per pasien |

**Ciri:** ada `id: ID`, tipe `Readonly<{...}>`, perubahannya lewat fungsi yang return object baru.

**Output:** file `entities/pasien.ts`, `entities/dokter.ts`, `entities/rekam-medis.ts`.

---

### Step 5 — Cari "cluster yang jaga invariant bisnis", itu Aggregate Root

Janji Temu adalah **aggregate root** karena:

- Dia entry point: semua operasi (booking, konfirmasi, batal, dll) lewat sini
- Dia jaga **transactional boundary**: kalo ada pelanggaran aturan, seluruh operasi gagal
- Business rules yang dicek di sini: state transition, boleh reschedule, batas waktu konfirmasi

```
Janji cluster:
├── id: ID
├── idPasien: ID              ← referensi ke aggregate lain (bukan object)
├── idDokter: ID              ← referensi ke aggregate lain
├── tgl: TglJanji             ← VO
├── slot: Slot                ← VO
├── status: StatusJanji       ← VO (state machine)
└── hitungReschedule: number  ← VO
```

**Prinsip:** aggregate root cuma pegang **ID** entity lain, bukan object-nya.

**Output:** `aggregates/janji-root.ts` — fungsi `buatJanji`, `konfirmasiJanji`, `mulaiJanji`, `selesaiJanji`, `batalJanji`, `noShowJanji`, `jadwalUlangJanji`.

---

### Step 6 — Cari "aturan yang melibatkan banyak entity", itu Domain Service

Domain Service = fungsi stateless yang **butuh data dari beberapa aggregate**.

Dari catatan:

| Aturan | Butuh data dari | Jadi service |
|--------|----------------|--------------|
| "Pasien aktif? Dokter aktif? Slot tabrakan? Maks 10/hari?" | Pasien + Dokter + Janji[] | `booking.ts` |
| "Slot baru available? Udah pernah reschedule?" | Janji + Janji[] | `penjadwalan-ulang.ts` |
| "Cuma boleh catat kalo Selesai" | Janji + RekamMedis | `pencatatan-rm.ts` |

**Output:** file `domain-services/booking.ts`, `penjadwalan-ulang.ts`, `pencatatan-rm.ts`.

---

### Step 7 — Compare dengan kode yang ada

Buka tiap file di `src/domain/`, cocokin:

| Aturan di `bisnisrule.md` | Implementasi |
|---------------------------|-------------|
| "Nama gak boleh kosong, max 100" | `value-objects/pasien.ts:4-8` |
| "Tanggal harus future" | `value-objects/janji.ts:7` |
| "Jam 08.00-17.00" | `value-objects/janji.ts:12-13` |
| "Pasien suspended gabisa booking" | `domain-services/booking.ts:15` |
| "Dokter max 10/hari" | `domain-services/booking.ts:26` |
| "Gak boleh tabrakan slot" | `domain-services/booking.ts:31` |
| "Konfirmasi minimal H-1" | `aggregates/janji-root.ts:55` (`bolehKonfirmasi`) |
| "Batal wajib alasan, sebelum Dimulai" | `aggregates/janji-root.ts:78-80` |
| "Reschedule max 1x, status Terjadwal/Dikonfirmasi" | `aggregates/janji-root.ts:96-99` |
| "Selesai baru boleh catat RM" | `domain-services/pencatatan-rm.ts:8` |

---

### Step 8 — Cek apakah ada aturan yang terlewat

Baca ulang `bisnisrule.md`. Tiap kalimat validasi harus ada di kode.
Kalo ada yang kurang, itu PR (atau bug).

Contoh aturan yang **belum** diimplementasi (sengaja ditinggal karena di luar scope domain layer):
- "Sistem otomatis ubah status jadi NoShow kalo 15 menit" → butuh scheduler
- "Notifikasi pasien" → butuh email/SMS gateway
- "Laporan" → butuh read model

---

## Aturan Dependency

```
domain-services → aggregates → entities → value-objects → types
```

Layer kanan **TIDAK Boleh** import layer kiri. Cek sendiri — buka tiap file, liat importnya.

---

## Running Demo

```bash
npm start
```

Output 12 skenario — ✅ sukses, ❌ expected error (business rule menolak seperti seharusnya).

| Skenario | Hasil | Melibatkan |
|----------|-------|-----------|
| Registrasi pasien | ✅ | `entities/pasien.ts:12` |
| Booking → Konfirmasi → Mulai → Selesai | ✅ | `aggregates/janji-root.ts:28,52,61,68` |
| Batal dengan alasan | ✅ | `aggregates/janji-root.ts:75` |
| Reschedule 1x | ✅ | `aggregates/janji-root.ts:92` |
| NoShow | ✅ | `aggregates/janji-root.ts:85` |
| Catat rekam medis | ✅ | `domain-services/pencatatan-rm.ts:5` |
| Pasien non-aktif ditolak booking | ❌ (ditolak) | `domain-services/booking.ts:15` |
| Reschedule 2x ditolak | ❌ (ditolak) | `aggregates/janji-root.ts:96` |

---

## Referensi

- [Domain-Driven Design (Eric Evans)](https://domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
