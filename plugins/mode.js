// mode.js — versi fix tombol untuk Baileys terbaru
// Tombol lama (buttonsMessage) sudah dimatikan WhatsApp, diganti interactiveMessage + nativeFlowMessage (quick_reply).
// Pola ini sama seperti yang dipakai plugins/rpg-kerja.js (single_select) — sudah terbukti jalan di Baileys 7.0.0-rc12.
// Cara pakai: timpa plugins/mode.js dengan file ini, lalu restart bot.
// Saat tombol ditekan, bot menerima teks id-nya ('.menu' / '.stats') seperti user mengetik command biasa.

let handler = async (m, { conn }) => {
  let wm = global.wm
  let _uptime = process.uptime() * 1000
  let aptem = clockString(_uptime)
  let users = Object.keys(global.db.data.users).length
  let bannedUsers = Object.entries(global.db.data.users).filter(user => user[1].banned).length
  let stats = Object.entries(db.data.stats).length
  let dbArg = global.opts && global.opts.db || ''
  let dbType = /mongodb/i.test(dbArg) ? 'MongoDB Atlas' : /https?:\/\//.test(dbArg) ? 'Cloud DB' : 'Lokal (JSON)'

  let tegs = `*🤖 INFO BOT* 
  
*Mode:* ${global.opts['self'] ? '🔒 Self' : '🌐 Publik'}
*⏰ Aktif Sejak:* ${aptem} 
*👥 Pengguna Terdaftar:* ${users} 
*🚫 Pengguna Terbanned:* ${bannedUsers}
*📈 Fitur Sering Digunakan:* ${stats}
*Database:* ${dbType}

_🔧 Jika bot tidak ada balasan maka bot sedang maintenance._`.trim()

  let musik = `./fek.xml`

  // Tombol quick_reply gaya baru (nativeFlowMessage)
  let buttons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Menu 📚', id: '.menu' })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Statistik 📊', id: '.stats' })
    }
  ]

  let interactiveMsg = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          body: {
            text: '👇 *Pilih tombol di bawah:*',
          },
          footer: {
            text: wm,
          },
          header: {
            title: '',
            subtitle: '',
            hasMediaAttachment: false
          },
          nativeFlowMessage: {
            buttons: buttons,
          },
          contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
          },
        },
      },
    },
  }

  setTimeout(() => {
    conn.sendPresenceUpdate('recording', m.chat)
    conn.sendMessage(m.chat, {
      document: { url: musik },
      caption: tegs,
      fileName: `🤖 CraXID Bot 🤖`,
      fileLength: 1024000000000000,
      mimetype: 'application/vnd.ms-powerpoint',
      contextInfo: {
        forwardingScore: 9999,
        isForwarded: true,
      }
    }, { quoted: m }).then(() => {
      // kirim tombol setelah dokumen terkirim
      conn.relayMessage(m.chat, interactiveMsg, {})
    })
  }, 3000)
}

handler.help = ['mode']
handler.tags = ['main']
handler.customPrefix = /^(mode|tes|test|bot)$/i
handler.command = new RegExp
handler.limit = false

module.exports = handler

function clockString(ms) {
  let days = Math.floor(ms / (24 * 60 * 60 * 1000));
  let daysms = ms % (24 * 60 * 60 * 1000);
  let hours = Math.floor((daysms) / (60 * 60 * 1000));
  let hoursms = ms % (60 * 60 * 1000);
  let minutes = Math.floor((hoursms) / (60 * 1000));
  let minutesms = ms % (60 * 1000);
  let sec = Math.floor((minutesms) / (1000));

  hours = hours.toString().padStart(2, '0');
  minutes = minutes.toString().padStart(2, '0');
  sec = sec.toString().padStart(2, '0');

  return `${days} Hari ${hours}:${minutes}:${sec}`;
}