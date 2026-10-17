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
    throw 'Masukkan jumlah limit yang ingin ditambahkan pada pengguna. Contoh: .addlimit @user 1000';
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
    throw 'Tag pengguna yang ingin ditambahkan limitnya. Contoh: .addlimit @user 1000';
  }

  let pointsToAdd = parseInt(text.split(' ')[1]);
  if (isNaN(pointsToAdd)) {
    throw 'Jumlah limit yang dimasukkan harus berupa angka. Contoh: .addlimit @user 1000';
  }

  let users = global.db.data.users;
  if (!users[mentionedJid]) {
    users[mentionedJid] = {
      money: 0,
      exp: 0,
      lastclaim: 0
    };
  }

  users[mentionedJid].limit += pointsToAdd;

  conn.reply(m.chat, `Berhasil menambahkan ${pointsToAdd} Limit untuk @${mentionedJid.split('@')[0]}.`, m, {
    mentions: [mentionedJid]
  });
};

handler.help = ['addlimit @user <jumlah limit>'];
handler.tags = ['owner'];
handler.command = /^addlimit$/i;
handler.owner = true;

module.exports = handler;