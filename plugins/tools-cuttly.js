let fetch = require('node-fetch')

// API resmi cutt.ly, key diambil dari dashboard akun cuttly
// diisi di config.js: global.cuttly

let handler = async (m, { text, usedPrefix, command }) => {
  if (!global.cuttly) throw 'API key Cuttly belum diisi di config.js'
  if (!text) throw `Linknya mana?\n> ${usedPrefix + command} https://google.com`

  let [url, alias] = text.trim().split(/\s+/)

  try {
    let u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) throw 0
  } catch (e) {
    throw 'Itu bukan URL yang valid.\nContoh: ' + usedPrefix + command + ' https://google.com'
  }

  let apiUrl = 'https://cutt.ly/api/api.php?key=' + encodeURIComponent(global.cuttly) +
    '&short=' + encodeURIComponent(url)
  if (alias) apiUrl += '&name=' + encodeURIComponent(alias)

  let res = await fetch(apiUrl)
  let json = await res.json()
  let data = json.url || {}

  // status 7 = sukses, lainnya = error
  if (data.status != 7) {
    let errMsg = {
      1: 'Link ini sudah pernah diperpendek.',
      2: 'URL-nya tidak valid menurut Cuttly.',
      3: 'Alias sudah dipakai orang lain.',
      4: 'API key Cuttly salah, cek config.js.',
      5: 'URL mengandung karakter yang tidak diizinkan.',
      6: 'Domain URL diblokir Cuttly.'
    }[data.status] || 'Gagal bikin shortlink Cuttly, coba lagi nanti.'
    throw errMsg
  }

  m.reply(`🔗 *Cuttly*\n\n${url}\n⬇\n${data.shortLink}` + (alias ? `\n\nAlias: ${alias}` : ''))
}

handler.help = ['cuttly <link> [alias]']
handler.tags = ['shortlink']
handler.command = /^cuttly$/i

module.exports = handler
