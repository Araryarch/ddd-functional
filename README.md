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

### Kenapa tanpa identity?

> "Nama Andi" tetaplah "Nama Andi" di mana pun — gak perlu tracking ID.

Kalo `PatientName("Andi")` dan `PatientName("Andi")` lain, dua duanya ya nama yang sama. Gak ada bedanya. Ngasih ID ke sesuatu yang dibedakan cuma dari nilainya itu **redundan** dan bikin kode tambah ribet.

### Kenapa immutable?

> "Nama Andi" kalo diganti jadi "Budi" bukan lagi nama yang sama — itu nama baru.

Daripada mutasi object (yang rawan bug karena reference sharing), kita **buat baru** tiap kali nilai berubah. Ini selaras sama konsep matematis: `2 + 3 = 5` — nilai 2 dan 3 gak berubah, yang ada hasil baru.

### Kenapa self-validating?

> Nama pasien gak boleh kosong → aturan itu **milik** PatientName, bukan milik si pemakai.

Kalo validasi diserahkan ke pemakai, tiap kali ada kode baru yang pake `PatientName`, validasinya harus diulang. Lama-lama bocor. Makanya VO validasi **diri sendiri** di factory function, pake `Result<T,E>`.

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

Ciri: **identity immutable, atribut mutable**, **dibandingkan pakai ID**.

### Kenapa identity immutable?

> `id: ID` — identity adalah **satu-satunya yang gak pernah berubah**. Kalo ID berubah, itu bukan pasien yang sama lagi.

Di kode: `id` pake `ID` (branded type). Gak ada fungsi `gantiId()` — memang sengaja gak dibuat.

Lihat `entities/pasien.ts:4-10`:
```
id: ID               ← IMMUTABLE — gak bisa diganti seumur hidup
nama: PatientName    ← bisa berubah
email: Email         ← bisa berubah
telepon: Phone       ← bisa berubah
aktif: boolean       ← bisa berubah
```

> **Catatan:** pake `Readonly<{...}>` aja, bukan `Object.freeze()`. Karena kode ini functional — tiap "ubah" selalu return object baru, bukan mutasi object lama. `Readonly` ngasih **compile-time protection** (kebaca pas ngetik). `Object.freeze()` cuma nambah overhead runtime tanpa manfaat karena kode gak pernah mutasi. Tapi kalo ada developer lain yang ngerjain dan dikhawatirkan sembarangan mutasi, `Object.freeze()` bisa ditambahin lapisan ke-2.

### Kenapa atribut bisa berubah?

> Pasien ganti nomor HP, tapi tetep pasien yang sama.

Atribut non-ID bisa berubah sepanjang siklus hidup. Tapi perubahannya lewat **fungsi explicit** (bukan setter): `suspendPasien(p)` return object baru dengan `aktif: false`. Immutable secara object, mutable secara semantik.

### Kenapa dibandingkan pakai ID?

> Kalo ada dua object Pasien dengan data sama, belum tentu pasien yang sama — bisa jadi dua pasien beda yang kebetulan namanya sama.

Perbandingan Entity pake ID (`a.id === b.id`), bukan pake nilai. Dua object Pasien dengan field identik tapi ID beda ya berarti dua pasien berbeda.

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

### Kenapa entry point cluster?

> Setiap operasi janji (booking, konfirmasi, batal) harus lewat sini — gak boleh ada yang ubah status janji di luar.

Aggregate root adalah **gerbang satu-satunya** ke dalam cluster. Kalo ada kode lain yang langsung mutasi `status` tanpa lewat `konfirmasiJanji()`, aturan bisnis bisa dilewati. Semua akses harus melalui root.

### Kenapa jaga transactional boundary?

> "Booking gagal karena slot tabrakan" — kalo slot udah terisi, seluruh janji gagal. Gak boleh ada janji setengah jadi.

Dalam 1 transaksi, aggregate root harus menjamin semua invariant di dalam cluster konsisten. Kalo ada satu aturan yang dilanggar, **semua** perubahan ditolak (return `fail`), bukan cuma sebagian.

### Kenapa referensi via ID, bukan object?

> `Janji` pegang `idPasien: ID`, bukan `pasien: Pasien`.

Alasannya:
1. **Boundary disiplin** — aggregate cuma tanggung jawab sama data di cluster-nya sendiri. Data Pasien urusan aggregate Pasien.
2. **Performance** — kalo pegang object, loading Janji berarti ikut loading Pasien, loading Dokter, loading... ujung-ujungnya load seluruh database.
3. **Consistency** — data Pasien bisa berubah tanpa pengaruh Janji. Kalo Janji pegang reference ke object, bisa stale.

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

Ciri: **stateless**, **melibatkan multiple aggregate**.

### Kenapa perlu Domain Service? Kenapa gak taruh di Entity aja?

> Booking perlu cek: Pasien aktif? Dokter aktif? Slot tabrakan? Maks 10/hari?

Aturan ini melibatkan **4 hal berbeda**: Pasien, Dokter, `Janji[]` (milik dokter), `Janji[]` (milik pasien). Kalo validate di Entity Janji, Janji harus tau data Pasien & Dokter — itu melanggar dependency. Kalo taruh di Pasien, Pasien harus tau data Janji — juga melanggar.

Domain Service adalah **fungsi stateless** yang jadi "wasit": dia terima data dari berbagai aggregate, validasi, lalu delegasi pembentukan Janji ke aggregate root (`buatJanji`).

### Kenapa stateless?

> `bookingJanji(...)` gasuka nyimpen state. Dia terima input → proses → return hasil. Panggil 2x dengan argumen sama → hasilnya sama.

Kalo domain service punya state, dia jadi "setengah entity" — bikin bingung siapa yang tanggung jawab apa. State domain adalah milik Entity dan Aggregate Root.

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
