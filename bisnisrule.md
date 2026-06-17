# Klinik Sehat — Catatan Meeting Requirements

**Tanggal:** 10 Juni 2026
**Peserta:** Bu Sari (Dokter/PIC), Mas Andi (Tim IT)
**Tujuan:** Aplikasi janji temu online

---

## Latar Belakang

Klinik mau buka layanan janji temu online. Selama ini pasien telepon atau datang langsung, antreannya kacau. Dokter juga gak bisa ngatur jadwal. Pengennya pasien bisa daftar janji dari HP, dokter tau jadwal harian, gak ada double booking.

---

## Alur Bisnis

### 1. Pendaftaran Pasien
Pasien mau daftar harus kasih:
- Nama lengkap (gak boleh kosong, maksimal 100 karakter soalnya form kita pendek)
- Email (yang bener format email, nanti sekalian buat notifikasi)
- No HP (pake Indo aja, +62 atau 08, 10-15 digit)

Kalo semua valid, barulah pasien dianggap terdaftar. Kalo ada yg salah ya ditolak.

### 2. Booking Janji
Pasien milih:
- Dokter mana
- Tanggal (gak boleh hari ini atau kemarin, harus H+1 ke depan)
- Jam (praktek cuma 08.00-17.00, tiap janji 1 jam)

Yang dicek sistem pas booking:
- Pasiennya statusnya aktif? Jangan sampai yg udah di-suspended bisa booking
- Dokter praktek gak hari itu? (kalo lagi cuti ya jangan)
- Dokter maksimal nerima 10 pasien per hari (kasihan nanti kualahan)
- Jangan sampe tabrakan sama janji lain di jam yg sama — baik untuk pasien maupun dokter

Kalo lolos semua, status janjinya "Terjadwal" dan pasien dikasih tau jadwalnya.

### 3. Konfirmasi
Pasien bisa konfirmasi janji. Tapi konfirmasi minimal H-1, jadi kalo janji besok dan hari ini dikonfirmasi ya oke. Kalo janji lusa masih bisa nunggu. Setelah dikonfirmasi, status berubah "Dikonfirmasi".

### 4. Konsultasi
Pasien dateng, dokter mulai konsultasi. Status "Dimulai". Nanti kalo udah kelar, status "Selesai". Setelah selesai, dokter catat diagnosa dan catatan medis — minimal 1 diagnosa, kalo nol berarti gak periksa kan?

### 5. No-Show
Kalo pasien udah dipanggil (status Dimulai) tapi 15 menit gak muncul, sistem otomatis ubah status jadi "NoShow". Dokter gak usah nunggu.

### 6. Pembatalan
Pasien bisa batalkan janji kapan aja asal belum Dimulai. Kalo udah Dimulai ya mau gak mau harus dilanjut. Waktu batal wajib isi alasan — minimal jangan kosong. Nanti slotnya kebuka buat pasien lain.

### 7. Reschedule
Pasien boleh ubah jadwal maksimal 1 kali. Alasannya biar gak semena-mena mindahin terus. Yang boleh diubah tanggalnya sama jamnya aja, dokternya tetep. Syarat:
- Cuma 1× (kalo udah pernah reschedule ya udah gak boleh lagi)
- Status harus "Terjadwal" atau "Dikonfirmasi" (kalo udah Dimulai ya gak boleh)
- Tanggal baru harus future
- Slot baru harus available (jangan tabrakan)
- Abis reschedule, statusnya balik ke "Terjadwal" lagi biar dikonfirmasi ulang

---

## Notes Tambahan

- Nanti pasien bisa liat riwayat janji yg udah selesai
- Dokter pengennya ada notifikasi kalo ada janji baru atau batal
- Mungkin nanti bakal ada fitur reschedule dari pihak klinik (dokter gak bisa praktek mendadak gitu), tapi belum dibahas detail
- Untuk tahap 1 ini, kita fokus dulu ke alur inti di atas. Report dan notifikasi nyusul.
- Kode unik/resi gak perlu dulu. Cukup pake ID.

---

## Istilah di Klinik

| Istilah | Arti |
|---------|------|
| Janji temu | appointment, booking |
| Pasien | ya pasien, patient |
| Dokter | ya dokter |
| Terjadwal | udah dibooking tapi belum dikonfirmasi |
| Dikonfirmasi | udah di-OK sama sistem/pasien |
| Dimulai | dokter udah mulai periksa |
| Selesai | udah kelar periksa |
| Batal | dibatalkan |
| NoShow | pasien gak dateng |
| Diagnosa | hasil pemeriksaan, minimal 1 |
| Reschedule | ubah jadwal |
