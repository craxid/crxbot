let cp = require('child_process')
let { promisify } = require('util')
let exec = promisify(cp.exec).bind(cp)

let handler = async (m, { conn }) => {
  await conn.reply(m.chat, `_Please Wait..._`, m)
  let o
  try {
    o = await exec('python3 speed.py --share --secure')
  } catch (e) {
    o = e
  } finally {
    let { stdout, stderr } = o
    if (stdout.trim()) {
      // cari URL gambar hasil speedtest
      let urlMatch = stdout.match(/https?:\/\/\S+\.png/)
      if (urlMatch) {
        // kirim sebagai gambar
        await conn.sendMessage(m.chat, {
          image: { url: urlMatch[0] },
          caption: stdout
        }, { quoted: m })
      } else {
        // kalau tidak ada URL gambar, kirim teks biasa
        await conn.sendMessage(m.chat, {
          text: stdout
        }, { quoted: m })
      }
    }
    if (stderr.trim()) m.reply(stderr)
  }
}

handler.help = ['speedtest']
handler.tags = ['info']
handler.command = /^(speedtest|ookla)$/i
handler.premium = false

module.exports = handler