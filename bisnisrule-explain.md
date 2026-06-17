# Klinik Sehat — Anotasi Business Rules

Setiap aturan dari `bisnisrule.md` diberi label pattern dan alasan kenapa di situ.

---

## 1. Pendaftaran Pasien

```
Pasien mau daftar harus kasih:
```

### Nama lengkap (gak boleh kosong, maksimal 100 karakter soalnya form kita pendek)

**[Value Object] `PatientName`**

Validasi cuma tentang 1 nilai (string). Gak perlu identity, gak perlu tau data lain. "Andi" tetaplah "Andi" di mana pun.

Kenapa bukan Entity? → Nama gak butuh ID. Dua nama "Andi" ya sama.
Kenapa bukan Aggregate? → Gak perlu koordinasi field lain.
Kenapa bukan Domain Service? → Validasi sederhana, gak butuh data aggregate lain.

---

### Email (yang bener format email, nanti sekalian buat notifikasi)

**[Value Object] `Email`**

Sama: validasi format string. Self-contained.

---

### No HP (pake Indo aja, +62 atau 08, 10-15 digit)

**[Value Object] `Phone`**

Sama: validasi format + length.

---

### Kalo semua valid, barulah pasien dianggap terdaftar. Kalo ada yg salah ya ditolak.

**[Entity] `Pasien.daftarPasien`**

Yang dihasilkan adalah **entity** — punya `id: ID`. Factory function `daftarPasien` nge-validasi VO-VO dulu, baru bikin Pasien dengan ID.

Kenapa bukan Aggregate Root? → Pasien adalah aggregate root sendiri (cluster-nya isi data diri pasien), tapi pendaftaran itu operasi pembuatan entity, bukan invariant bisnis yang perlu boundary.

---

## 2. Booking Janji

```
Pasien milih:
```

### Dokter mana

**[Parameter input]** `idDokter: ID`

Janji pegang ID Dokter (referensi via ID, bukan object).

---

### Tanggal (gak boleh hari ini atau kemarin, harus H+1 ke depan)

**[Value Object] `TglJanji`**

Validasi 1 nilai: tanggal > hari ini. Gak perlu tau entity lain.

---

### Jam (praktek cuma 08.00-17.00, tiap janji 1 jam)

**[Value Object] `Slot`**

Validasi range jam + urutan (mulai < selesai). Gak perlu identity.

---

### Yang dicek sistem pas booking:

### Pasiennya statusnya aktif? Jangan sampai yg udah di-suspended bisa booking

**[Domain Service] `bookingJanji` baris 15**

Butuh data `Pasien` (entity). Tapi ini cuma 1 dari beberapa cek. Karena digabung sama cek-cek lain yang melibatkan aggregate beda, jadi bagian dari Domain Service.

Kalo rules ini berdiri sendiri, bisa aja di `Pasien` method. Tapi karena ini bagian dari flow booking, ditaruh di service.

---

### Dokter praktek gak hari itu? (kalo lagi cuti ya jangan)

**[Domain Service] `bookingJanji` baris 16**

Butuh data `Dokter` (entity beda).

---

### Dokter maksimal nerima 10 pasien per hari (kasihan nanti kualahan)

**[Domain Service] `bookingJanji` baris 26**

Butuh `Janji[]` (aggregate beda) yang difilter per dokter per tanggal.

Kenapa bukan di Aggregate Root Janji? → Karena perlu tau **semua** janji milik dokter itu, bukan cuma 1 janji. Aggregate cuma pegang 1 janji.
Kenapa bukan Entity Dokter? → Dokter gak boleh nyimpen list janji (nanti jadi reference yang terlalu besar).

---

### Jangan sampe tabrakan sama janji lain di jam yg sama — baik untuk pasien maupun dokter

**[Domain Service] `bookingJanji` baris 30-42**

Dua cek:
- Tabrakan dengan janji dokter lain → `janjiDokter.some(...)`
- Tabrakan dengan janji pasien sendiri → `janjiPasien.some(...)`

Butuh `Janji[]` dari aggregate beda.

---

### Kalo lolos semua, status janjinya "Terjadwal" dan pasien dikasih tau jadwalnya.

**[Aggregate Root] `buatJanji`**

Produk akhir adalah aggregate `Janji` dengan status `StTerjadwal`. Ini root karena dia entry point cluster: id, idPasien, idDokter, tgl, slot, status, hitungReschedule.

---

## 3. Konfirmasi

### Pasien bisa konfirmasi janji. Tapi konfirmasi minimal H-1, jadi kalo janji besok dan hari ini dikonfirmasi ya oke. Kalo janji lusa masih bisa nunggu.

**[Aggregate Root] `konfirmasiJanji`**

Dua invariant dalam 1 aggregate:
1. `bolehTransisi(j.status, "Dikonfirmasi")` — state machine
2. `bolehKonfirmasi(j.tgl)` — minimal H-1

Kenapa di Aggregate Root? → Butuh **2 field** dari aggregate yang sama (`status` dan `tgl`). Harus konsisten dalam 1 transaksi. Kalo `status` boleh ke Dikonfirmasi tapi `tgl` belum H-1, tolak semua.

Kenapa bukan Domain Service? → Gak perlu data dari aggregate lain. Cuma urusan internal Janji.

---

### Setelah dikonfirmasi, status berubah "Dikonfirmasi".

**[Aggregate Root] Output state: `StDikonfirmasi`**

---

## 4. Konsultasi

### Pasien dateng, dokter mulai konsultasi. Status "Dimulai".

**[Aggregate Root] `mulaiJanji`**

Transisi state internal. Cuma butuh cek `bolehTransisi(j.status, "Dimulai")`.

---

### Nanti kalo udah kelar, status "Selesai".

**[Aggregate Root] `selesaiJanji`**

Transisi state internal. Cuma butuh cek `bolehTransisi(j.status, "Selesai")`.

---

### Setelah selesai, dokter catat diagnosa dan catatan medis — minimal 1 diagnosa, kalo nol berarti gak periksa kan?

Campuran:

**[Domain Service] `catatRM` baris 10** → Cek `status._tag !== "Selesai"`. Butuh data dari aggregate Janji.

**[Entity] `RekamMedis.buatRM` baris 16** → Validasi `diagnoses.length`. Ini factory entity.

**[Value Object] `Diagnosis`** → Tiap item di array `diagnoses` divalidasi sebagai VO (`trim`, `!v`).

---

## 5. No-Show

### Kalo pasien udah dipanggil (status Dimulai) tapi 15 menit gak muncul, sistem otomatis ubah status jadi "NoShow".

**[Aggregate Root] `noShowJanji`** — transisi state dari Dimulai.

**Catatan:** "15 menit" gak diimplementasi di domain layer karena butuh scheduler (application layer). Domain cegah transisi invalid aja: cuma dari Dimulai.

---

## 6. Pembatalan

### Pasien bisa batalkan janji kapan aja asal belum Dimulai. Kalo udah Dimulai ya mau gak mau harus dilanjut.

**[Aggregate Root] `batalJanji`** — cek `bolehTransisi(j.status, "Batal")`.

---

### Waktu batal wajib isi alasan — minimal jangan kosong.

**[Value Object] `Alasan`** — validasi `trim()`, `!v`.

Tapi pemeriksaannya dipanggil di **[Aggregate Root]** `batalJanji` baris 74. Alasan adalah VO yang dipake **di dalam** aggregate.

---

### Nanti slotnya kebuka buat pasien lain.

Ini efek samping, bukan invariant. Domain layer gak ngurus ini — application layer nanti yang ngasih tahu sistem bahwa slot udah available.

---

## 7. Reschedule

### Pasien boleh ubah jadwal maksimal 1 kali. Alasannya biar gak semena-mena mindahin terus.

Campuran:

**[Value Object] `HitungReschedule`** — counter dengan batas (`n > 1`).

**[Aggregate Root] `jadwalUlangJanji` baris 93** — cek `hitungReschedule >= 1`.

Kenapa ceknya di Aggregate Root, bukan VO doang? → Karena rule "max 1x" butuh tau **sudah berapa kali** (dari field aggregate) DAN **status sekarang** (juga field aggregate). VO cuma validasi nilai counter-nya aja.

---

### Yang boleh diubah tanggalnya sama jamnya aja, dokternya tetep.

**[Aggregate Root]** Dokter gak berubah — field `idDokter` di-retain.

---

### Syarat:

### Cuma 1× (kalo udah pernah reschedule ya udah gak boleh lagi)

**[Aggregate Root] `jadwalUlangJanji` baris 93** — `hitungReschedule >= 1`.

---

### Status harus "Terjadwal" atau "Dikonfirmasi" (kalo udah Dimulai ya gak boleh)

**[Aggregate Root] `jadwalUlangJanji` baris 91** — `status._tag !== "Terjadwal" && ...`

---

### Tanggal baru harus future

**[Value Object] `TglJanji`** — VO yang sama dipake ulang.

---

### Slot baru harus available (jangan tabrakan)

**[Domain Service] `jadwalUlang` baris 28** — butuh `Janji[]` untuk cek tabrakan.

---

### Abis reschedule, statusnya balik ke "Terjadwal" lagi biar dikonfirmasi ulang

**[Aggregate Root] `jadwalUlangJanji` baris 106** — `status: StTerjadwal`.

---

## Notes Tambahan

### Nanti pasien bisa liat riwayat janji yg udah selesai

→ **Application layer / Read model.** Domain layer cuma nyediain data.

### Dokter pengennya ada notifikasi kalo ada janji baru atau batal

→ **Application layer.** Event bisa dipublish dari domain, tapi handler notifikasi di luar.

### Mungkin nanti bakal ada fitur reschedule dari pihak klinik

→ Belum diimplementasi. Nanti butuh domain service baru atau perluas `jadwalUlangJanji`.

### Untuk tahap 1 ini, kita fokus dulu ke alur inti di atas.

→ Scope domain layer yang sudah dibuat.

### Kode unik/resi gak perlu dulu. Cukup pake ID.

→ `ID` di `types.ts` — branded string dari `crypto.randomUUID()`.

---

## Istilah di Klinik

| Istilah       | Pattern     |
|---------------|-------------|
| Janji temu    | Aggregate   |
| Pasien        | Entity      |
| Dokter        | Entity      |
| Terjadwal     | VO (state)  |
| Dikonfirmasi  | VO (state)  |
| Dimulai       | VO (state)  |
| Selesai       | VO (state)  |
| Batal         | VO (state)  |
| NoShow        | VO (state)  |
| Diagnosa      | VO          |
| Reschedule    | Use case    |
