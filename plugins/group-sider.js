let handler = async (m, {
    conn,
    text,
    groupMetadata
}) => {
    await conn.sendPresenceUpdate('composing', m.chat)
    
    // 7 Hari dalam milidetik
    let lama = 86400000 * 7 
    let now = new Date().getTime()
    
    let participants = groupMetadata.participants
    let pesan = text || "Harap aktif di grup karena akan ada pembersihan member setiap saat"
    
    let sider = []

    for (let user of participants) {
        // Abaikan Admin & SuperAdmin agar tidak ikut terdeteksi
        if (user.admin || user.isSuperAdmin) continue
        
        let userData = global.db.data.users[user.id]
        
        // Kriteria Sider:
        // 1. Data user tidak ada di database (Belum pernah chat sama sekali)
        // 2. ATAU lastseen sudah lebih dari 7 hari yang lalu
        let isInactive = !userData || (now - userData.lastseen > lama)
        
        if (isInactive) {
            sider.push(user.id)
        }
    }

    if (sider.length == 0) return conn.reply(m.chat, `*Tidak ada member yang pasif selama 7 hari terakhir.*`, m)

    let total = sider.length
    let sum = participants.length
    
    let str = `*${total}/${sum}* anggota grup *${await conn.getName(m.chat)}* pasif selama 7 hari:\n\n_“${pesan}”_\n\n*DAFTAR SIDER:*\n`
    str += sider.map(v => {
        let lastSeen = global.db.data.users[v]?.lastseen
        let info = !global.db.data.users[v] ? ' (Belum pernah aktif)' : ' (' + msToDate(now - lastSeen) + ')'
        return `  ○ @${v.split('@')[0]}${info}`
    }).join('\n')

    conn.reply(m.chat, str, m, {
        contextInfo: {
            mentionedJid: sider
        }
    })
}

handler.help = ['gcsider']
handler.tags = ['group']
handler.command = /^(gcsider)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true
module.exports = handler

function msToDate(ms) {
    let d = Math.floor(ms / 86400000)
    let h = Math.floor(ms / 3600000) % 24
    if (d === 0 && h === 0) return "Baru Saja"
    return `${d} Hari ${h} Jam`
}