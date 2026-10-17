let handler = async (m, { command, text}) => {
  let txt = m.quoted?.text || text || m.text
  if (!txt) return m.reply('⚠️ Tidak ada teks yang bisa diproses.')

  if (/^encode$/i.test(command)) {
    try {
      let encoded = Buffer.from(txt, 'utf-8').toString('base64')
      m.reply(`${encoded}`)
} catch (e) {
      m.reply('❌ Gagal mengenkripsi teks.')
}
}

  if (/^decode$/i.test(command)) {
    try {
      let decoded = Buffer.from(txt, 'base64').toString('utf-8')
      m.reply(`${decoded}`)
} catch (e) {
      m.reply('❌ Gagal mendekripsi. Pastikan format Base64 valid.')
}
}
}

handler.help = ['encode', 'decode']
handler.tags = ['tools']
handler.command = /^(encode|decode)$/i

module.exports = handler