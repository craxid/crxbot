let fs = require('fs')
let fetch = require('node-fetch')

handler = async (m, { conn, text, participants }) => {
  try {
    const name = m.quoted.name
    const namanya = m.quoted.sender.split('@')[0]

    const fkonn = {
      key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        ...(m.chat ? { remoteJid: 'status@broadcast' } : {})
      },
      message: {
        contactMessage: {
          displayName: m.quoted.name,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${namanya}:${namanya}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      }
    }

    const tegs = m.quoted ? m.quoted.text : text
    await conn.sendPresenceUpdate('composing', m.chat)

    setTimeout(() => {
      conn.sendMessage(m.chat, {
        text: tegs,
        mentions: participants.map(a => a.id)
      }, { quoted: fkonn })
    }, 5000)
  } catch (e) {
    console.error(e)
    throw `Balas pesannya!`
  }
}

handler.help = ['hidetag2 <pesan>']
handler.tags = ['group']
handler.command = /^(hidetag2)$/i
handler.botAdmin = true
handler.group = true
handler.admin = true

module.exports = handler