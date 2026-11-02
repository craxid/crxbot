let handler = async (m, { conn, isOwner }) => {
    // sekarang dua hal ini pisah: grup di-mute, akun pribadi di-ban
    let chats = Object.entries(global.db.data.chats).filter(([id, c]) => id.endsWith('g.us') && c.mute)
    let users = Object.entries(global.db.data.users).filter(user => user[1].banned)

    // getName itu async, wajib di-await (kemarin tampilnya [object Promise])
    let nama = async jid => {
        try { return (await conn.getName(jid)) || 'Unknown' } catch (e) { return 'Unknown' }
    }
    let barisChat = []
    for (let i = 0; i < chats.length; i++) {
        let jid = chats[i][0]
        barisChat.push(`├ ${i + 1}. ${await nama(jid)}\n├ ${jid}`)
    }
    let barisUser = []
    for (let i = 0; i < users.length; i++) {
        let jid = users[i][0]
        barisUser.push(`├ ${i + 1}. ${await nama(jid)}\n├ ${isOwner ? '@' + jid.split('@')[0] : jid}`)
    }

    let caption = `
┌〔 Daftar Grup Ter-mute 〕
├ Total : ${chats.length} Grup${barisChat.length ? '\n' + barisChat.join('\n') : ''}
└────

┌〔 Daftar Pengguna Terbanned 〕
├ Total : ${users.length} Pengguna${barisUser.length ? '\n' + barisUser.join('\n') : ''}
└────
`.trim()
    conn.reply(m.chat, caption, m, { contextInfo: { mentionedJid: conn.parseMention(caption) } })
}
handler.help = ['bannedlist']
handler.tags = ['info']
handler.command = /^(listban(ned)?|ban(ned)?list|daftarban(ned)?)$/i
handler.owner = false
module.exports = handler
