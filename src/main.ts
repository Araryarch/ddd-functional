import { daftarPasien, suspendPasien } from './domain/entities/pasien'
import { buatDokter } from './domain/entities/dokter'
import { bookingJanji } from './domain/domain-services/booking'
import { jadwalUlang } from './domain/domain-services/penjadwalan-ulang'
import { catatRM } from './domain/domain-services/pencatatan-rm'
import { konfirmasiJanji, mulaiJanji, selesaiJanji, batalJanji, noShowJanji } from './domain/aggregates/janji-root'
import { isOk, isFail } from './domain/types'

const lusa = new Date()
lusa.setDate(lusa.getDate() + 2)

const main = () => {
  console.log('=== Sistem Janji Temu Klinik ===\n')

  // 1. Daftar pasien
  const pasien = daftarPasien('Andi Pratama', 'andi@mail.com', '08123456789')
  if (isFail(pasien)) { console.log('❌ Gagal daftar:', pasien.error); return }
  console.log('✅ Pasien terdaftar:', pasien.value.nama)

  // 2. Buat dokter
  const dokter = buatDokter('Dr. Sari', 'Spesialis Mata')
  console.log('✅ Dokter:', dokter.nama)

  // 3. Booking janji (besok)
  const besok = new Date()
  besok.setDate(besok.getDate() + 1)
  const janji = bookingJanji(pasien.value, dokter, [], besok, 480, 540)
  if (isFail(janji)) { console.log('❌ Booking gagal:', janji.error); return }
  console.log('✅ Janji dibuat — status:', janji.value.status._tag)

  // 4. Konfirmasi
  const konfirmasi = konfirmasiJanji(janji.value)
  if (isFail(konfirmasi)) { console.log('❌ Konfirmasi gagal:', konfirmasi.error); return }
  console.log('✅ Janji dikonfirmasi — status:', konfirmasi.value.status._tag)

  // 5. Mulai konsultasi
  const mulai = mulaiJanji(konfirmasi.value)
  if (isFail(mulai)) { console.log('❌ Mulai gagal:', mulai.error); return }
  console.log('✅ Konsultasi dimulai — status:', mulai.value.status._tag)

  // 6. Selesai
  const selesai = selesaiJanji(mulai.value)
  if (isFail(selesai)) { console.log('❌ Selesai gagal:', selesai.error); return }
  console.log('✅ Konsultasi selesai — status:', selesai.value.status._tag)

  // 7. Catat rekam medis
  const rm = catatRM(selesai.value, ['Miopia ringan', 'Astigmatisme'], 'Diberikan resep kacamata')
  if (isFail(rm)) { console.log('❌ RM gagal:', rm.error); return }
  console.log('✅ Rekam medis:', rm.value.diagnoses.join(', '))

  // 8. Batal
  const janji2 = bookingJanji(pasien.value, dokter, [], besok, 540, 600)
  if (isFail(janji2)) { console.log('❌ Booking 2 gagal:', janji2.error); return }
  const batal = batalJanji(janji2.value, 'Pasien sedang sakit')
  if (isFail(batal)) { console.log('❌ Batal gagal:', batal.error); return }
  const alasanBatal = batal.value.status as { _tag: 'Batal'; alasan: string }
  console.log('✅ Janji dibatalkan — alasan:', alasanBatal.alasan)

  // 9. Reschedule
  const janji3 = bookingJanji(pasien.value, dokter, [], besok, 600, 660)
  if (isFail(janji3)) { console.log('❌ Booking 3 gagal:', janji3.error); return }
  const ulang = jadwalUlang(janji3.value, [], lusa, 480, 540)
  if (isFail(ulang)) { console.log('❌ Reschedule gagal:', ulang.error); return }
  console.log('✅ Janji dijadwalkan ulang — tgl:', ulang.value.tgl.toDateString())

  // 10. Gagal booking pasien non-aktif
  const nonAktif = suspendPasien(pasien.value)
  const gagal = bookingJanji(nonAktif, dokter, [], lusa, 660, 720)
  if (isFail(gagal)) console.log('❌ (expected) Pasien non-aktif ditolak:', gagal.error)

  // 11. Gagal reschedule 2x (hitungReschedule sudah 1)
  const lusa3 = new Date()
  lusa3.setDate(lusa3.getDate() + 3)
  const ulang1 = jadwalUlang(ulang.value, [], lusa3, 540, 600)
  if (isFail(ulang1)) console.log('❌ (expected) Reschedule 2x ditolak:', ulang1.error)

  // 12. NoShow
  const janji4 = bookingJanji(pasien.value, dokter, [], lusa, 660, 720)
  if (isFail(janji4)) { console.log('❌ Booking 4 gagal:', janji4.error); return }
  const kf = konfirmasiJanji(janji4.value)
  if (isFail(kf)) { console.log('❌ Konfirmasi 4 gagal:', kf.error); return }
  const ml = mulaiJanji(kf.value)
  if (isFail(ml)) { console.log('❌ Mulai 4 gagal:', ml.error); return }
  const ns = noShowJanji(ml.value)
  if (isFail(ns)) { console.log('❌ NoShow gagal:', ns.error); return }
  console.log('✅ NoShow — status:', ns.value.status._tag)

  console.log('\n✅ Semua skenario selesai!')
}

main()
