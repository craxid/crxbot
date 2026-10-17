/**
 * Jangan hapus ini
 * Dibuat oleh CraXID Project
 * web: https://crax.my.id
 *
 * FIX: audio qori tidak bisa diputar di WhatsApp.
 * - Konversi ffmpeg ke opus (audio/opus, ptt:false) dihapus,
 *   karena WhatsApp tidak bisa memutar opus non-PTT dengan benar.
 * - MP3 dikirim langsung dari URL dengan mimetype 'audio/mpeg'.
 * - Fallback yang dulu pakai 'audio/mp4' untuk file .mp3 juga diperbaiki.
**/

const fetch = require('node-fetch')

function stripHtmlTags(str) {
  if (!str) return ""
  return str.replace(/<\/?[^>]+(>|$)/g, "")
}

// Fungsi jeda agar pesan dikirim berurutan (tidak acak/spam)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!(args[0] && args[1])) {
      return m.reply(`📖 Contoh Penggunaan:\n${usedPrefix + command} 2 255\nUntuk menampilkan Surah Al-Baqarah ayat 255\n\nAtau ketik:\n${usedPrefix + command} 114 all\nUntuk menampilkan seluruh ayat Surah An-Nas`)
    }

    let surah = parseInt(args[0])
    let isAll = args[1].toLowerCase() === 'all'
    let ayat = isAll ? 'all' : parseInt(args[1])

    if (isNaN(surah) || surah < 1 || surah > 114) {
      return m.reply(`⚠️ Nomor surah tidak valid (1-114).`)
    }
    if (!isAll && (isNaN(ayat) || ayat < 1)) {
      return m.reply(`⚠️ Nomor ayat tidak valid.`)
    }

    // 1. Ambil data Detail Surah
    let resAyat = await fetch(`https://equran.id/api/v2/surat/${surah}`)
    if (!resAyat.ok) return m.reply('❌ Gagal mengambil data dari server.')
    let jsonAyat = await resAyat.json()
    let data = jsonAyat.data

    // Header informasi surah saja (tanpa deskripsi)
    let headerInfo = `📖 *${data.namaLatin}* (${data.nama})
🔢 Nomor Surah: ${data.nomor}
📍 Tempat Turun: ${data.tempatTurun}
🧮 Jumlah Ayat: ${data.jumlahAyat}
📜 Arti: ${data.arti}

━━━━━━━━━━━━━━━\n\n`

    // LIMIT karakter per pesan WA (aman di angka 3500)
    const MAX_LEN = 3500 

    if (isAll) {
      // ==========================================
      // MODE TAMPILKAN SEMUA AYAT
      // ==========================================
      let currentMsg = headerInfo

      // Loop semua ayat
      for (let a of data.ayat) {
        let ayatText = `📌 *Ayat ${a.nomorAyat}:*\n${a.teksArab}\n\n📝 *Latin:*\n${a.teksLatin}\n\n📚 *Terjemahan:*\n${a.teksIndonesia}\n\n━━━━━━━━━━━━━━━\n\n`
        
        // Jika teks yang dikumpulkan sudah melebihi limit, kirim dulu
        if (currentMsg.length + ayatText.length > MAX_LEN) {
          await m.reply(currentMsg.trim())
          await delay(1500) // Jeda 1.5 detik
          currentMsg = "" // Reset variabel
        }
        currentMsg += ayatText
      }

      // Deskripsi Surah untuk diletakkan di paling bawah
      let footerText = `📝 *Deskripsi Surah:*\n${stripHtmlTags(data.deskripsi)}\n\n${global.wm || 'Quran Bot'}`

      // Cek apakah gabungan sisa ayat + deskripsi melebihi limit
      if (currentMsg.length + footerText.length > MAX_LEN) {
        if (currentMsg.trim().length > 0) {
          await m.reply(currentMsg.trim())
          await delay(1500)
        }
        await m.reply(footerText) // Kirim deskripsi sebagai pesan terpisah di akhir
      } else {
        await m.reply((currentMsg + footerText).trim())
      }

      // Kirim Audio Full 1 Surah (MP3 langsung, mimetype audio/mpeg)
      let audioUrlFull = data.audioFull['06'] // Misyari Rasyid (Full Surah)
      if (audioUrlFull) {
        try {
          await conn.sendFile(
            m.chat,
            audioUrlFull,
            'full_surah.mp3',
            `🔊 Audio Full Surah *${data.namaLatin}*`,
            m,
            { mimetype: 'audio/mpeg' }
          )
        } catch (e) {
          console.error("Gagal mengirim audio full surah:", e)
          m.reply('⚠️ Gagal mengirim audio full surah.')
        }
      }

    } else {
      // ==========================================
      // MODE TAMPILKAN 1 AYAT (DENGAN TAFSIR)
      // ==========================================
      let ayatData = data.ayat.find(a => a.nomorAyat === ayat)
      if (!ayatData) {
        return m.reply(`⚠️ Ayat ${ayat} tidak ditemukan. Surah ${data.namaLatin} hanya punya ${data.jumlahAyat} ayat.`)
      }

      // Ambil data Tafsir
      let tafsirText = "Tafsir tidak tersedia untuk ayat ini."
      try {
        let resTafsir = await fetch(`https://equran.id/api/v2/tafsir/${surah}`)
        if (resTafsir.ok) {
          let jsonTafsir = await resTafsir.json()
          let tafsirData = jsonTafsir.data.tafsir.find(t => t.ayat === ayat)
          if (tafsirData) tafsirText = tafsirData.teks
        }
      } catch (e) {
        console.log("Gagal mengambil tafsir")
      }

      // Menyusun Full Teks (Header -> Ayat -> Tafsir -> Deskripsi Surah)
      let bodyText = `📌 *Ayat ${ayatData.nomorAyat}:*\n${ayatData.teksArab}\n\n📝 *Latin:*\n${ayatData.teksLatin}\n\n📚 *Terjemahan:*\n${ayatData.teksIndonesia}\n\n━━━━━━━━━━━━━━━\n\n📖 *Tafsir Ayat:*\n${tafsirText}\n\n━━━━━━━━━━━━━━━\n\n📝 *Deskripsi Surah:*\n${stripHtmlTags(data.deskripsi)}\n\n━━━━━━━━━━━━━━━\n\n${global.wm || 'Quran Bot'}`

      let fullMessage = headerInfo + bodyText

      // Pemecah pesan jika gabungan informasi, ayat, tafsir, dan deskripsi sangat panjang
      if (fullMessage.length > MAX_LEN) {
        for (let i = 0; i < fullMessage.length; i += MAX_LEN) {
          await m.reply(fullMessage.substring(i, i + MAX_LEN))
          await delay(1000)
        }
      } else {
        await m.reply(fullMessage)
      }
      
      // Kirim Audio Spesifik Ayat (MP3 langsung, mimetype audio/mpeg)
      let audioUrl = ayatData.audio['06'] // (1 Ayat)
      if (audioUrl) {
        try {
          await conn.sendFile(
            m.chat,
            audioUrl,
            'ayat.mp3',
            `🔊 Audio Surah *${data.namaLatin}* Ayat ${ayat}`,
            m,
            { mimetype: 'audio/mpeg' }
          )
        } catch (e) {
          console.error("Gagal mengirim audio ayat:", e)
          m.reply('⚠️ Gagal mengirim audio ayat.')
        }
      }
    }

  } catch (err) {
    console.error(err)
    m.reply('🚫 Terjadi kesalahan sistem saat memproses data.')
  }
}

handler.help = ['quran <surah> <ayat/all>']
handler.tags = ['internet', 'agama']
handler.command = /^quran$/i

module.exports = handler