let handler = async (m, { conn, command, usedPrefix, args}) => {
  let type = (args[0] || '').toLowerCase()
  let count = args[1] &&!isNaN(args[1])? Math.max(parseInt(args[1]), 1): 1
  let user = global.db.data.users[m.sender]

  const recipes = {
    ayambakar: { bahan: 'ayam', jumlah: 2},
    ayamgoreng: { bahan: 'ayam', jumlah: 2},
    oporayam: { bahan: 'ayam', jumlah: 2},
    gulaiayam: { bahan: 'ayam', jumlah: 2},
    rendang: { bahan: 'sapi', jumlah: 2},
    steak: { bahan: 'sapi', jumlah: 2},
    babipanggang: { bahan: 'babi', jumlah: 2},
    ikanbakar: { bahan: 'ikan', jumlah: 2},
    lelebakar: { bahan: 'lele', jumlah: 2},
    nilabakar: { bahan: 'nila', jumlah: 2},
    bawalbakar: { bahan: 'bawal', jumlah: 2},
    udangbakar: { bahan: 'udang', jumlah: 2},
    pausbakar: { bahan: 'paus', jumlah: 2},
    kepitingbakar: { bahan: 'kepiting', jumlah: 2}
}

  const menu = `「 *C O O K I N G* 」\n\n` + Object.entries(recipes).map(([name, r]) =>
    `▧ ${name} 🍽️\n〉Need ${r.jumlah} ${r.bahan} & 1 Coal`).join('\n') + `\n\n• *Contoh:* ${usedPrefix + command} ayambakar 2`

  try {
    if (/masak|cook/i.test(command)) {
      if (!recipes[type]) return conn.reply(m.chat, menu, m)

      const { bahan, jumlah} = recipes[type]
      if (user[bahan]>= jumlah * count && user.coal>= count) {
        user[bahan] -= jumlah * count
        user.coal -= count
        user[type] = (user[type] || 0) + count
        conn.reply(m.chat, `✅ Sukses memasak ${count} ${type}`, m)
} else {
        conn.reply(m.chat, `❌ Bahan tidak cukup untuk memasak *${type}*\n\nButuh ${jumlah} ${bahan} dan 1 coal per item`, m)
}
}
} catch (e) {
    conn.reply(m.chat, `⚠️ Sepertinya ada error, coba laporkan ke owner`, m)
    console.error(e)
}
}

handler.help = ['masak <masakan> <jumlah>']
handler.tags = ['rpg']
handler.command = /^(masak|cook)$/i
handler.group = true
handler.register = true
module.exports = handler