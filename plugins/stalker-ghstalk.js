const fetch = require('node-fetch')

let handler = async (m, { text, usedPrefix, command}) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
  if (!text) throw `Contoh penggunaan:\n${usedPrefix + command} craxid`

  const username = text.trim()
  const url = `https://api.github.com/users/${username}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw 'Pengguna tidak ditemukan atau terjadi kesalahan.'

    const data = await res.json()

    const str = `
👤 *GitHub User Info*
• 🆔 Username: ${data.login}
• 🧬 ID: ${data.id}
• 🔗 Node ID: ${data.node_id}
• 📛 Nama: ${data.name || '-'}
• 📝 Bio: ${data.bio || '-'}
• 🐦 Twitter: ${data.twitter_username || '-'}
• 🏢 Company: ${data.company || '-'}
• 📍 Lokasi: ${data.location || '-'}
• 🌐 Blog: ${data.blog || '-'}
• 📦 Repo Publik: ${data.public_repos}
• 📄 Gist Publik: ${data.public_gists}
• 👥 Followers: ${data.followers}
• 🧑‍🤝‍🧑 Following: ${data.following}
• 🕒 Dibuat: ${new Date(data.created_at).toLocaleDateString('id-ID')}
• 🔄 Terakhir Update: ${new Date(data.updated_at).toLocaleDateString('id-ID')}
• 🔖 Tipe Akun: ${data.type}
• 🔓 View Type: ${data.user_view_type || '-'}
• 🛡️ Site Admin: ${data.site_admin? 'Ya': 'Tidak'}
    `.trim()

    const musik = data.html_url // dijadikan URL dokumen dummy
    const name = data.name || data.login
    const level = `${data.public_repos} repos`
    const pp = data.avatar_url

    setTimeout(() => {
      conn.sendMessage(m.chat, { react: { text: '✅', key: m.key}})
      conn.sendPresenceUpdate('recording', m.chat)
      conn.sendMessage(m.chat, {
        document: { url: musik},
        caption: str,
        fileName: `CraXID Bot 🤖`,
        fileLength: 1024000000000000,
        mimetype: 'application/vnd.ms-powerpoint',
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          }
}, { quoted: fkonn })
}, 3000)

} catch (err) {
    console.error(err)
    throw 'Gagal mengambil data GitHub. Pastikan username benar.'
}
}

handler.command = handler.help = ['ghstalk','githubstalk']
handler.tags = ['tools']
handler.limit = true
handler.register = true
module.exports = handler
