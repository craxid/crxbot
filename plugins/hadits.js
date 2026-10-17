/**
 * Jangan hapus ini
 * Dibuat oleh CraXID Project
 * web: https://crax.my.id
**/

const fetch = require('node-fetch')

function stripHtmlTags(str) {
  return str.replace(/<\/?[^>]+(>|$)/g, "")
}

let handler = async (m, { conn, args, usedPrefix, command}) => {
  try {
    if (!(args[0] && args[1])) {
      return m.reply(`📚 Contoh:\n${usedPrefix + command} muslim 42\nUntuk menampilkan hadits nomor 42 dari kitab Shahih Muslim
      
Tersedia:
- abu-daud (Abu Daud)
- ahmad (Ahmad)
- bukhari (Bukhari)
- darimi (Darimi)
- ibnu-majah (Ibnu Majah)
- malik (Malik)
- muslim (Muslim)
- nasai (Nasai)
- tirmidzi (Tirmidzi)`)
}

    let kitab = args[0].toLowerCase()
    let nomor = parseInt(args[1])
    if (isNaN(nomor) || nomor < 1) {
      return m.reply(`⚠️ Nomor hadits tidak valid.`)
}

    // Gunakan range 42-42 untuk ambil hadits ke-42
    let res = await fetch(`https://api.hadith.gading.dev/books/${kitab}?range=${nomor}-${nomor}`)
    if (!res.ok) {
      return m.reply('❌ Gagal mengambil data dari server. Pastikan nama kitab dan nomor hadits benar.')
}

    let data = await res.json()
    if (!data || !data.data || !data.data.hadiths || data.data.hadiths.length === 0) {
      return m.reply('⚠️ Hadits tidak ditemukan.')
}

    let hadits = data.data.hadiths[0]

    let teks = `
📚 *Kitab Hadits: ${data.data.name}*
🔢 *Nomor Hadits: ${hadits.number}*

📝 *Arab:*
${hadits.arab}

📖 *Terjemahan:*
${stripHtmlTags(hadits.id)}

━━━━━━━━━━━━━━━

${global.wm}
`.trim()

    await m.reply(teks)
} catch (err) {
    console.error(err)
    m.reply('🚫 Terjadi kesalahan saat memproses permintaan. Coba lagi nanti atau hubungi admin jika masalah berlanjut.')
}
}

handler.help = ['hadits <kitab> <nomor>']
handler.tags = ['internet', 'agama']
handler.command = /^hadits$/i

module.exports = handler
