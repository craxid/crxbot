let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner}) => {
  let isEnable = /true|enable|(turn)?on|1/i.test(command)
  let chat = global.db.data.chats[m.chat]
  let user = global.db.data.users[m.sender]
  let type = (args[0] || '').toLowerCase()
  let isAll = false
  let isUser = false

  // Validasi admin grup
  const requireAdmin = () => {
    if (!m.isGroup ||!(isAdmin || isOwner)) {
      global.dfail('admin', m, conn)
      throw false
}
}

  switch (type) {
    case 'welcome':
    case 'detect':
    case 'antidelete':
    case 'autodelvn':
    case 'antilink':
    case 'antisticker':
    case 'autosticker':
    case 'antitoxic':
    case 'antitaggc':
    case 'viewonce':
      requireAdmin()
      if (type === 'antidelete') chat.antidelete = isEnable
      else if (type === 'autosticker') chat.autosticker = isEnable
      else if (type === 'antitoxic') chat.antitoxic = isEnable
      else chat[type] = isEnable
      break

    case 'document':
      chat.useDocument = isEnable
      break

    case 'autolevelup':
      isUser = true
      user.autolevelup = isEnable
      break

    case 'antitagstatus':
    case 'antitaggc':
  isAll = false
  if (!m.isGroup) {
    if (!isOwner) {
      global.dfail('group', m, conn)
      throw false
    }
  } else if (!isAdmin) {
    global.dfail('admin', m, conn)
    throw false
  }
  chat.antiTagStatus = isEnable
  break


    case 'public':
    case 'restrict':
    case 'nyimak':
    case 'autoread':
    case 'pconly':
    case 'gconly':
    case 'swonly':
      isAll = true
      if (!isROwner) {
        global.dfail('rowner', m, conn)
        throw false
}
      global.opts[type] = isEnable
      break

    case 'mycontact':
    case 'mycontacts':
    case 'whitelistcontact':
    case 'whitelistcontacts':
    case 'whitelistmycontact':
    case 'whitelistmycontacts':
      if (!isOwner) {
        global.dfail('owner', m, conn)
        throw false
}
      conn.callWhitelistMode = isEnable
      break

    default:
      if (!type) return m.reply(`⚠️ Harap tentukan fitur yang ingin diaktifkan atau dinonaktifkan.\n\nContoh:\n${usedPrefix}enable welcome\n${usedPrefix}disable antitoxic`)
      return m.reply(`
📋 *Daftar fitur yang bisa diatur:*
• welcome
• detect
• antidelete
• autodelvn
• antitoxic
• antitaggc
• antisticker
• autosticker
• autolevelup
• document
• public
• restrict
• nyimak
• autoread
• pconly
• gconly
• swonly
• whitelistmycontacts

Contoh penggunaan:
${usedPrefix}enable welcome
${usedPrefix}disable antitoxic
`.trim())
}

  m.reply(`✅ Fitur *${type}* telah ${isEnable? 'diaktifkan': 'dinonaktifkan'} ${isAll? 'untuk seluruh bot': isUser? 'untuk kamu': 'untuk grup ini'}.`)
}

handler.help = ['enable <fitur>', 'disable <fitur>']
handler.tags = ['group', 'owner']
handler.command = /^((en|dis)able|(tru|fals)e|(turn)?o(n|ff)|[01])$/i

module.exports = handler