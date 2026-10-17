/* 
Script By Reelly XD
  � YT: 
  � IG: 
Buy Script? 
  � WA: +62 857-0436-85323
  � TELE: t.me/rely_xd
  � Github: github.com/ReellyXD
*/


const { MessageType } = require('@adiwajshing/baileys');

let handler = async (m, { conn, text }) => {
  if (!text) {
    throw 'Masukkan jumlah money yang ingin ditambahkan pada pengguna. Contoh: .addmoney @user 1000';
  }
    
 	conn.chatRead(m.chat)
	conn.sendMessage(m.chat, {
		react: {
			text: '🕒',
			key: m.key,
		}
	})

  let mentionedJid = m.mentionedJid[0];
  if (!mentionedJid) {
    throw 'Tag pengguna yang ingin ditambahkan moneynya. Contoh: .addmoney @user 1000';
  }

  let pointsToAdd = parseInt(text.split(' ')[1]);
  if (isNaN(pointsToAdd)) {
    throw 'Jumlah money yang dimasukkan harus berupa angka. Contoh: .addmoney @user 1000';
  }

  let users = global.db.data.users;
  if (!users[mentionedJid]) {
    users[mentionedJid] = {
      money: 0,
      exp: 0,
      lastclaim: 0
    };
  }

  users[mentionedJid].money += pointsToAdd;

  conn.reply(m.chat, `Berhasil menambahkan ${pointsToAdd} Money untuk @${mentionedJid.split('@')[0]}.`, m, {
    mentions: [mentionedJid]
  });
};

handler.help = ['addmoney @user <jumlah money>'];
handler.tags = ['owner'];
handler.command = /^addmoney$/i;
handler.owner = true;

module.exports = handler;