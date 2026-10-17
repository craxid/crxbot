const axios = require('axios')
const cheerio = require('cheerio')

let handler = async (m, { conn, args, text, usedPrefix, command}) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
  if (!text) throw `✳️ Masukan Username Instagram\n\n📌Contoh: ${usedPrefix + command} dede_klender`
  try {
    let url = `https://www.instagram.com/${text}/`
    let { data} = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}
})

    const $ = cheerio.load(data)
    const scriptTag = $('script[type="application/ld+json"]').html()
    if (!scriptTag) throw '❌ Gagal mengambil data. Akun mungkin private atau tidak ditemukan.'

    const profile = JSON.parse(scriptTag)

    let teks = `┌──「 *STALKING*
▢ *🔖 Name:* ${profile.name}
▢ *🔖 Username:* ${text}
▢ *📌 Bio:* ${profile.description}
▢ *🔗 Link:* https://instagram.com/${text}
└────────────`

    return conn.sendMessage(m.chat, {
      text: teks,
      contextInfo: {
        forwardingScore: 1000,
        isForwarded: true,
        }
}, { quoted: fkonn })

} catch (err) {
    console.error(err)
    m.reply(`❌ Terjadi kesalahan atau akun tidak dapat diakses.\n\n${err}`)
}
}

handler.help = ['igstalk']
handler.tags = ['internet']
handler.command = ['igstalk', 'stalkig']

module.exports = handler
