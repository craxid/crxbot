let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    let user = global.db.data.users[m.sender]
    
    // Inisialisasi data
    user.pinjaman = user.pinjaman || 0
    user.lastpinjam = user.lastpinjam || 0
    user.money = user.money || 0
    user.level = user.level || 1

    // KONFIGURASI PAYLATER
    let limit = 50000 + (user.level * 10000) // Limit bertahap sesuai level
    let persenBunga = 5 // Bunga 5%
    
    // MENGHITUNG SISA LIMIT
    let sisaLimit = limit - user.pinjaman
    if (sisaLimit < 0) sisaLimit = 0 // Mencegah sisa limit jadi minus jika kena bunga

    let count = args[0]

    // Jika limit sudah habis / hutang menumpuk
    if (sisaLimit <= 0) return m.reply(`⛔ *LIMIT HABIS!*\n\nKamu sudah mencapai batas maksimal pinjaman.\nSilakan lunasi hutangmu sebesar *Rp. ${user.pinjaman.toLocaleString('id-ID')}* terlebih dahulu dengan mengetik *${usedPrefix}bayar* agar limit kembali tersedia.`)

    // Validasi input awal (menampilkan sisa limit)
    if (!count) return m.reply(`Masukkan nominal uang yang ingin dipinjam!\n\n💳 *Limitmu (Level ${user.level}):* Rp. ${limit.toLocaleString('id-ID')}\n📉 *Sisa Limitmu Saat Ini:* Rp. ${sisaLimit.toLocaleString('id-ID')}\n📊 *Bunga Pinjaman:* ${persenBunga}%\n\n*Contoh penggunaan:*\n${usedPrefix + command} 10000`)
    if (isNaN(count)) return m.reply('Nominal pinjaman harus berupa angka!')
    
    let nominal = parseInt(count)

    // Validasi nominal pinjaman terhadap sisa limit
    if (nominal < 1000) return m.reply('Minimal meminjam uang adalah *1.000*!')
    if (nominal > sisaLimit) return m.reply(`Nominal terlalu besar! Sisa limit yang bisa kamu pinjam saat ini hanya *Rp. ${sisaLimit.toLocaleString('id-ID')}*.\n\n_Tingkatkan levelmu atau lunasi hutang sebelumnya untuk menambah limit!_`)
    
    // Cek cooldown (Cooldown saya set 5 Menit = 300000 ms agar bisa minjam berkali-kali asal limit ada)
    let __timers = (new Date - user.lastpinjam)
    let _timers = (300000 - __timers) 
    let timers = clockString(_timers)

    if (new Date - user.lastpinjam > 300000) {
      
      // SISTEM PERHITUNGAN BUNGA
      let biayaBunga = Math.floor(nominal * (persenBunga / 100))
      let totalHutang = nominal + biayaBunga

      // Proses penambahan uang dan hutang
      user.money += nominal
      user.pinjaman += totalHutang 
      user.lastpinjam = new Date * 1
      
      // Hitung ulang sisa limit setelah dipinjam
      let sisaLimitBaru = limit - user.pinjaman
      if (sisaLimitBaru < 0) sisaLimitBaru = 0

      let caption = `🎉 *PINJAMAN KAMU BERHASIL* 🎉\n\n`
      caption += `Berhasil meminjam uang dari Bank\n\n`
      caption += `💵 *Nominal Pinjaman:* Rp. ${nominal.toLocaleString('id-ID')}\n`
      caption += `📈 *Bunga (${persenBunga}%):* Rp. ${biayaBunga.toLocaleString('id-ID')}\n`
      caption += `💳 *Total Hutang Baru:* Rp. ${user.pinjaman.toLocaleString('id-ID')}\n`
      caption += `💰 *Uang Kamu Sekarang:* Rp. ${user.money.toLocaleString('id-ID')}\n\n`
      caption += `📉 *SISA LIMIT:* Rp. ${sisaLimitBaru.toLocaleString('id-ID')}\n\n`
      caption += `_Catatan: Segera lunasi hutangmu dengan mengetik *${usedPrefix}bayar*_`
      
      m.reply(caption)
    } else {
      m.reply(`Tunggu sebentar! Kamu baru saja meminjam uang.\nTunggu selama *${timers}* lagi untuk menggunakan fitur paylater.`)
    }
  } catch (e) {
    throw `${e}`
  }
}

handler.help = ['pinjam <nominal>', 'paylater <nominal>']
handler.tags = ['game']
handler.command = /^(pinjam|paylater|ngutang)$/i
handler.premium = false
handler.register = true
handler.group = false

module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}