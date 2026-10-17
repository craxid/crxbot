const fetch = require('node-fetch')
const { XMLParser} = require('fast-xml-parser')

let handler = async (m, { conn, args, usedPrefix, command}) => {
  try {
    if (!(args[0] && args[1] && args[2])) {
      return m.reply(`📖 Contoh:\n${usedPrefix + command} Yohanes 3 16`)
}

    let kitab = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase()
    let pasal = parseInt(args[1])
    let ayat = parseInt(args[2])
    if (isNaN(pasal) || isNaN(ayat)) {
      return m.reply(`⚠️ Nomor pasal atau ayat tidak valid.`)
}

    let query = `${kitab} ${pasal}:${ayat}`
    let url = `https://alkitab.sabda.org/api/passage.php?passage=${encodeURIComponent(query)}&xml=1`
    let res = await fetch(url)
    if (!res.ok) return m.reply(`❌ Gagal ambil data dari server. Status: ${res.status}`)

    let xml = await res.text()
    const parser = new XMLParser()
    let data

    try {
      data = parser.parse(xml)
} catch (e) {
      return m.reply(`🚫 Gagal parsing XML:\n${e.message}`)
}

    let verses = data?.bible?.book?.chapter?.verses?.verse
    let teks = null

    if (Array.isArray(verses)) {
      let target = verses.find(v => parseInt(v.number) === ayat)
      teks = target?.text
} else if (parseInt(verses?.number) === ayat) {
      teks = verses.text
}

    if (!teks) {
      console.log('XML mentah:', xml)
      return m.reply(`⚠️ Ayat tidak ditemukan.\nQuery: ${query}`)
}

    let caption = `
📖 *${kitab} ${pasal}:${ayat}* (Terjemahan Baru)

📝 *Isi Ayat:*
${teks.trim()}

━━━━━━━━━━━━━━━

${global.wm}
`.trim()

    await m.reply(caption)
} catch (err) {
    console.error('Kesalahan umum:', err)
    m.reply(`🚫 Terjadi kesalahan:\n${err.message}`)
}
}

handler.help = ['alkitab <kitab> <pasal> <ayat>']
handler.tags = ['internet','agama']
handler.command = /^alkitab$/i

module.exports = handler