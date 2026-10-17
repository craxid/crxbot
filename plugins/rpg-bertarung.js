global.fightConfirmation = {}

let handler = async (m, { conn, args, usedPrefix, command}) => {
  let sender = m.sender
  let opponent = m.mentionedJid[0]

  if (!opponent ||!global.db.data.users[opponent]) {
    return m.reply(`📌 *Contoh:* ${usedPrefix + command} @user`)
}

  if (global.fightConfirmation[opponent]) {
    return m.reply('⚔️ Target sedang dalam proses konfirmasi tantangan lain.')
}

  let user = global.db.data.users[sender]
  let target = global.db.data.users[opponent]

  if (user.money < 10000) return m.reply('💸 Uangmu tidak cukup untuk bertarung!')
  if (target.money < 10000) return m.reply('💸 Lawanmu tidak punya cukup uang untuk bertarung!')

  let betAmount = Math.floor(Math.random() * (1000000 - 10000 + 1)) + 10000
  let senderName = await conn.getName(sender)
  let opponentName = await conn.getName(opponent)

  let pesanAwal = await conn.sendMessage(m.chat, {
    text: `⚔️ Hai @${opponent.split('@')[0]}, ${senderName} menantangmu bertarung!\n\n💰 Taruhan: Rp ${betAmount.toLocaleString('id-ID')}\n\nKetik *ya* untuk menerima atau *tidak* untuk menolak. (60 detik)`,
    mentions: [opponent]
}, { quoted: m})

  global.fightConfirmation[opponent] = {
    from: sender,
    betAmount,
    chat: m.chat,
    msg: pesanAwal.key,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, { text: '⏳ Waktu habis. Tantangan dibatalkan.'}, { quoted: m})
      delete global.fightConfirmation[opponent]
}, 60 * 1000)
}
}

handler.before = async function (m, { conn}) {
  let confirm = global.fightConfirmation[m.sender]
  if (!confirm ||!m.text) return

  let { from, betAmount, chat, timeout, msg} = confirm
  let user = global.db.data.users[from]
  let target = global.db.data.users[m.sender]
  let senderName = await conn.getName(from)
  let opponentName = await conn.getName(m.sender)

  if (/^tidak$/i.test(m.text)) {
    clearTimeout(timeout)
    delete global.fightConfirmation[m.sender]
    return conn.sendMessage(chat, {
      text: `❌ ${opponentName} menolak tantangan dari ${senderName}.`,
      mentions: [from, m.sender]
}, { quoted: m})
}

  if (/^ya$/i.test(m.text)) {
    clearTimeout(timeout)
    delete global.fightConfirmation[m.sender]

    if (user.money < betAmount || target.money < betAmount) {
      return conn.sendMessage(chat, {
        text: '💸 Salah satu pemain tidak memiliki cukup uang untuk bertarung.',
        mentions: [from, m.sender]
}, { quoted: m})
}

    // Progress pertarungan
    await conn.sendMessage(chat, {
      edit: msg,
      text: `⚔️ Pertarungan dimulai antara @${from.split('@')[0]} dan @${m.sender.split('@')[0]}...\n\n⏳ Memuat arena...`,
      mentions: [from, m.sender]
})

    await delay(1500)
    await conn.sendMessage(chat, {
      edit: msg,
      text: `🔥 @${from.split('@')[0]} melancarkan serangan!\n🛡️ @${m.sender.split('@')[0]} bertahan...\n\n⚡ Pertarungan memanas!`,
      mentions: [from, m.sender]
})

    await delay(1500)
    let result = Math.random()>= 0.5
    let winner = result? from: m.sender
    let loser = result? m.sender: from

    global.db.data.users[winner].money += betAmount
    global.db.data.users[loser].money -= betAmount
    global.db.data.users[from].lastWar = new Date()

    let alasanMenang = pickRandom([
      'kamu menang karena jurus rahasia dan mendapatkan',
      'seranganmu mematikan, kamu mendapatkan',
      'kamu menang telak dan mendapatkan'
    ])
    let alasanKalah = pickRandom([
      'kamu kalah karena terlalu lemah dan kehilangan',

'pertahananmu hancur total, kamu kehilangan',
      'kamu kalah telak dan kehilangan'
    ])

    let hasil = `❏ *F I G H T*\n\n@${from.split('@')[0]} vs @${m.sender.split('@')[0]}\n\n`
    hasil += result
? `🏆 @${from.split('@')[0]} menang! ${alasanMenang} +Rp ${betAmount.toLocaleString('id-ID')}`
: `💀 @${from.split('@')[0]} kalah! ${alasanKalah} -Rp ${betAmount.toLocaleString('id-ID')}`

    await conn.sendMessage(chat, {
      edit: msg,
      text: hasil,
      mentions: [from, m.sender]
})
}
}

handler.help = ['bertarung _@user_ ']
handler.tags = ['rpg']
handler.command = /^bertarung$/i
handler.group = true

module.exports = handler

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}