// Trik import agar fungsi terbaca di berbagai tipe bot (ESM/CJS)
const _gplay = require('google-play-scraper')
const gplay = _gplay.default || _gplay 

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const query = (text || args.join(' ')).trim()

  if (!query) {
    throw `✳️ Masukkan nama aplikasi yang ingin dicari!\n\n*Contoh:* ${usedPrefix + command} WhatsApp`
  }

  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    // 1. Mencari aplikasi berdasarkan kata kunci
    const searchRes = await gplay.search({
      term: query,
      num: 1, 
      country: 'id', // Set region Indonesia
      lang: 'id'     // Set bahasa Indonesia
    })

    if (!searchRes || !searchRes.length) {
      throw new Error('Aplikasi tidak ditemukan.')
    }

    const appId = searchRes[0].appId

    // 2. Mengambil detail lengkap aplikasi berdasarkan appId-nya
    const appDetail = await gplay.app({ appId: appId, country: 'id', lang: 'id' })

    // 3. Membersihkan deskripsi dari tag HTML
    const cleanDescription = (appDetail.description || '').replace(/<[^>]*>?/gm, '').trim()

    let caption = `
*📱 ANDROID APP DETAIL*

*🔖 Nama:* ${appDetail.title || '-'}
*🆔 App ID:* ${appDetail.appId || '-'}
*👨‍💻 Developer:* ${appDetail.developer || '-'}
*⭐ Rating:* ${appDetail.scoreText || '-'}
*⬇️ Total Download:* ${appDetail.installs || '-'}
*💵 Harga:* ${appDetail.priceText || 'Gratis'}
*🗂️ Kategori:* ${appDetail.genre || '-'}
*🔄 Terakhir Update:* ${appDetail.updated ? new Date(appDetail.updated).toLocaleDateString('id-ID') : '-'}
*🔗 Link PlayStore:* ${appDetail.url || '-'}

*📝 Deskripsi Singkat:*
${cleanDescription.substring(0, 1000)}...
`.trim()

    // 4. Mengirim hasil
    await conn.sendFile(
      m.chat,
      appDetail.icon,
      'icon.jpg',
      caption,
      m
    )

  } catch (err) {
    console.error(err)
    throw `*ERROR:* Aplikasi yang kamu cari tidak ditemukan atau terjadi masalah saat mengambil data.\n\n${err}`
  }
}

handler.help = ['playstore <nama app>']
handler.tags = ['tools', 'internet']
handler.command = ['playstore', 'ps', 'app', 'apk']
handler.premium = false
handler.limit = true

module.exports = handler