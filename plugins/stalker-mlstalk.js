const fetch = require('node-fetch')
const cheerio = require('cheerio')

let handler = async (m, { text, usedPrefix, command}) => {
  if (!text) throw `Contoh penggunaan:\n${usedPrefix + command} 12345678 1234`

  const [user_id, zone_id] = text.trim().split(' ')
  if (!user_id ||!zone_id) throw 'Format salah. Gunakan: user_id zone_id'

  const url = 'https://pizzoshop.com/mlchecker/check'
  const payload = `user_id=${user_id}&zone_id=${zone_id}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
},
      body: payload
})

    const html = await res.text()
    const $ = cheerio.load(html)

    const nickname = $('th:contains("Nickname")').next().text().trim()
    const region = $('th:contains("Region ID")').next().text().trim()
    const login = $('th:contains("Last Login from")').next().text().trim()
    const created = $('th:contains("Created data date")').next().text().trim()

    if (!nickname) throw 'Akun tidak ditemukan atau data kosong.'

    const str = `
🎮 *MLBB Stalker*
• 🆔 User ID: ${user_id}
• 🌐 Zone ID: ${zone_id}
• 🧑 Nickname: ${nickname}
• 🗺️ Region: ${region}
• 🕒 Last Login: ${login}
• 📅 Data Created: ${created}
    `.trim()

    const dummyDoc = 'https://pizzoshop.com/assets/images/pizzologo.png'

    setTimeout(() => {
      conn.sendMessage(m.chat, { react: { text: '✅', key: m.key}})
      conn.sendPresenceUpdate('recording', m.chat)
      conn.sendMessage(m.chat, {
        document: { url: dummyDoc},
        caption: str,
        fileName: `MLBB Stalker 🤖`,
        fileLength: 1024000000000000,
        mimetype: 'application/vnd.ms-powerpoint',
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
}
}, { quoted: m})
}, 3000)

} catch (err) {
    console.error(err)
    throw '❌ Gagal mengambil data MLBB. Pastikan ID benar atau coba lagi nanti.'
}
}

handler.command = handler.help = ['mlstalk','stalkml']
handler.tags = ['tools']
handler.limit = true
handler.register = true
module.exports = handler