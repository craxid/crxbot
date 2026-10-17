const { videy } = require('../lib/resapi.js')

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0]

  if (!url || !/^https?:\/\/(www\.)?videy\.co\/\S+/.test(url)) {
    return m.reply(`Format salah.\nGunakan perintah:\n*${usedPrefix + command} <link videy.co>*`)
  }

  m.reply(wait)

  try {
    const { videoUrl } = await videy(url)

    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      caption: `Videy Downloader\n${global.wm || ''}`
    }, { quoted: m })

  } catch (err) {
    console.error('Download error:', err)
    m.reply('Terjadi kesalahan saat mengambil video. Coba lagi nanti.')
  }
}

handler.command = ['videy']
handler.help = ['videy <link videy.co>']
handler.tags = ['downloader']
handler.limit = true
handler.premium = true
handler.register = true

module.exports = handler
