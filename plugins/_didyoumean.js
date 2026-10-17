// Thanks To Kasan
let didyoumean = require('didyoumean')
let similarity = require('similarity')
let handler = m => m

handler.before = function (m, { match, usedPrefix, text, args }) {
  if ((usedPrefix = (match[0] || '')[0])) {
    let noPrefix = m.text.replace(usedPrefix, '').trim()
    let args = noPrefix.trim().split` `.slice(1)
    let alias = Object.values(global.plugins).filter(v => v.help && !v.disabled).map(v => v.help).flat(1)
    if (alias.includes(noPrefix)) return
    let mean = didyoumean(noPrefix, alias)
    let sim = similarity(noPrefix, mean)
    let som = sim * 100
    let teks = `• Halo Kak ${m.pushName}, apakah Kamu sedang mencari *${usedPrefix + mean}*?\n\n◦ Nama menu: *${usedPrefix + mean}*\n◦ Kemiripan: *${parseInt(som)}%*`
    if (mean) setTimeout(() => {
      this.sendMessage(m.chat, {
        text: teks,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
        }
      }, { quoted: m })
    }, 2000) // delay 2 detik
  }
}

module.exports = handler