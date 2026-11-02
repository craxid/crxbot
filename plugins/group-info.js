let handler = async (m, { conn, participants, groupMetadata, text }) => {

    const getGroupAdmins = (participants) => {
        admins = []
        for (let i of participants) {
            i.isAdmin ? admins.push(i.jid) : ''
        }
        return admins
    }

    // ambil foto profil grup (nama fungsi di baileys 7.x: profilePictureUrl)
    let pp = null
    try {
        pp = await conn.profilePictureUrl(m.chat)
    } catch (e) {
        // grup tidak punya foto, nanti kirim teks saja
    }
    try {
        let { isBanned, welcome, detect, sWelcome, sBye, sPromote, sDemote, antiLink, expired, descUpdate, stiker } = global.db.data.chats[m.chat]
        const groupAdmins = getGroupAdmins(participants)
        let listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.split`@`[0]}`).join('\n')

        if (text) return m.reply(msToDate(expired - new Date() * 1))

        let caption = `*Informasi Grup*\n
*ID:* 
${groupMetadata.id}
*Nama:* 
${groupMetadata.subject}
*Deskripsi:* 
${groupMetadata.desc}
*Total Anggota:*
${participants.length} Anggota
*Pembuat Grup:* 
@${m.chat.split`-`[0]}
*Admin Grup:*
${listAdmin}
*Pengaturan Bot:*
${antiLink ? '✅' : '❌'} Anti Link
${global.db.data.chats[m.chat].delete ? '❌' : '✅'} Anti Delete
${isBanned ? '✅' : '❌'} Banned
${descUpdate ? '✅' : '❌'} Deskprisi
${detect ? '✅' : '❌'} Detect
${stiker ? '✅' : '❌'} Stiker
${welcome ? '✅' : '❌'} Welcome
*Pengaturan Pesan Bot:*
Welcome: ${sWelcome}
Bye: ${sBye}
Promote: ${sPromote}
Demote: ${sDemote}
*Tersisa:*
${msToDate(expired - new Date() * 1)}
`.trim()
        let mentionedJid = groupAdmins.concat([`${m.chat.split`-`[0]}@s.whatsapp.net`])
        // kalau ada foto grup kirim dengan gambar, kalau tidak kirim teks saja
        if (pp) {
            await conn.sendFile(m.key.remoteJid, pp, 'pp.jpg', caption, m, 0, { contextInfo: { mentionedJid } })
        } else {
            await conn.sendMessage(m.key.remoteJid, { text: caption, mentions: mentionedJid }, { quoted: m })
        }
    } catch (e) {
        console.error('infogrup error:', e)
        await m.reply('❌ Gagal mengambil info grup.')
    }
}
handler.help = ['infogrup']
handler.tags = ['group']
handler.command = /^(gro?upinfo|info(gro?up|gc))$/i

handler.group = true

module.exports = handler

function msToDate(ms) {
    temp = ms
    days = Math.floor(ms / (24 * 60 * 60 * 1000));
    daysms = ms % (24 * 60 * 60 * 1000);
    hours = Math.floor((daysms) / (60 * 60 * 1000));
    hoursms = ms % (60 * 60 * 1000);
    minutes = Math.floor((hoursms) / (60 * 1000));
    minutesms = ms % (60 * 1000);
    sec = Math.floor((minutesms) / (1000));
    return days + " hari " + hours + " jam " + minutes + " menit";
    // +minutes+":"+sec;
}
