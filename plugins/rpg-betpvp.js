const items = [ 'money', 'diamond', 'emas' ]
let handler = async (m, { conn, args, usedPrefix, command }) => {
    conn.judipvp = conn.judipvp ? conn.judipvp : {}
    if (Object.values(conn.judipvp).find(room => room.id.startsWith('judipvp') && [room.p, room.p2].includes(m.sender))) throw '❌ Selesaikan dulu judipvp kamu yang masih berjalan.'
    if (Object.values(conn.judipvp).find(room => room.id.startsWith('judipvp') && [room.p, room.p2].includes(m.mentionedJid[0]))) throw '❌ Orang yang kamu tantang sedang main judipvp dengan orang lain. Tunggu sampai selesai dulu.'
    let musuh = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
    let user = global.db.data.users
    let item = items.filter(v => v in user[m.sender] && typeof user[m.sender][v] == 'number')
    let type = (args[0] || '').toLowerCase()
    let count = (args[1] && number(parseInt(args[1])) ? Math.max(parseInt(args[1]), 1): /all/i.test(args[1]) ? Math.floor(parseInt(user[type])): 1) * 1
    let id = 'judipvp_' + new Date() * 1
    // tutorialnya dibikin jelas sekalian
    let tutorial = `🎲 *Cara main judipvp:*\n\n${usedPrefix + command} <item> <jumlah> <tag lawan>\n\nContoh:\n${usedPrefix + command} money 10000 @lawan\n\nItem yang bisa dipertaruhkan:\n• money\n• diamond\n• emas\n\nLawan harus jawab *Y* untuk terima atau *N* untuk tolak dalam 60 detik.`
    if (!item.includes(type)) return m.reply(`❌ Item tidak valid.\n\n${tutorial}`)
    if (!count || !musuh) return m.reply(tutorial)
    if (user[m.sender][type] < count) return m.reply(`❌ ${type} kamu tidak cukup untuk taruhan ${count} ${type}.`)
    conn.judipvp[id] = {
        chat: await conn.reply(m.chat, `🎲 *TANTANGAN JUDI PVP*\n\n@${m.sender.split('@')[0]} menantang @${musuh.split('@')[0]}!\n💰 Taruhan: ${count} ${type}\n\n@${musuh.split('@')[0]}, kamu terima tantangannya?\nKetik *Y* untuk terima, *N* untuk tolak.\n⏰ Waktu 60 detik.`, m, {
            contextInfo: { mentionedJid: [m.sender, musuh] } 
        }),
        id: id,
        p: m.sender,
        p2: musuh,
        type: type,
        status: 'wait',
        taruhan: count,
        waktu: setTimeout(() => {
            if (conn.judipvp[id]) conn.reply(m.chat, '⏰ Waktu habis, tantangan judipvp dibatalkan.', m)
            delete conn.judipvp[id]
        }, 60000)
    }
}
handler.help = ['judipvp <type> <count> <tag>']
handler.tags = ['rpg']
handler.command = /^(judipvp)$/i
handler.register = true
handler.group = true
module.exports = handler

function number(x = 0) {
    x = parseInt(x)
    return !isNaN(x) && typeof x == 'number'
}
