let ro = 50000;
let handler = async (m, { conn, usedPrefix, command }) => {
  let time = global.db.data.users[m.sender].lastrob + 900000;
  if (new Date - global.db.data.users[m.sender].lastrob < 900000) throw `Tunggu *${msToTime(time - new Date())}* untuk kembali merampok`;
  
  let who;
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  else who = m.chat;
  if (!who) throw `Tag seseorang untuk dirampok`;
  
  // Cek apakah target adalah owner atau nomor bot
  let nomorTarget = who.split`@`[0];
  if (global.owner.includes(nomorTarget)) throw `Gak bisa ngerampok owner njir`;
  if ([ '6283155936234', '6285183199976', '6285974335844' ].includes(nomorTarget)) throw `Gak bisa ngerampok nomor bot njir`;
  
  if (!(who in global.db.data.users)) throw `Pengguna tidak ada di database`;
  let users = global.db.data.users[who];
  let rob = Math.floor(Math.random() * ro);
  if (users.money < rob) {
    let penalti = Math.floor(rob * 0.5); // Penalti 50% dari jumlah yang ingin dirampok
    global.db.data.users[m.sender].money -= penalti;
    global.db.data.users[who].money += penalti; // Penalti diberikan ke target
    return m.reply(`Si @${who.split`@`[0]} hanya punya Rp ${users.money.toLocaleString('id-ID')}, tidak cukup untuk dirampok (Rp ${rob.toLocaleString('id-ID')}) 

Kamu kena penalti Rp ${penalti.toLocaleString('id-ID')} 
Uang akan diberikan ke @${who.split`@`[0]}`, null, { mentions: [who, m.sender] });
  }
  global.db.data.users[m.sender].money += rob;
  global.db.data.users[who].money -= rob;
  await conn.sendPresenceUpdate('recording', m.chat);
  // pakai @nomor biar ke-tag beneran (mentions saja tanpa @ di teks gak jadi tag)
  let tegs = `@${m.sender.split('@')[0]} berhasil merampok uang sebesar *Rp ${rob.toLocaleString('id-ID')}* dari @${who.split('@')[0]}`;
  conn.sendMessage(m.chat, { 
    text: tegs, 
    mentions: [m.sender, who], 
    contextInfo: { 
    } 
  }, { quoted: m });
  global.db.data.users[m.sender].lastrob = new Date * 1;
}

handler.help = ['rampok'];
handler.tags = ['game'];
handler.group = true;
handler.command = ['rampok', 'rob'];
module.exports = handler;

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
    days = Math.floor(duration / (1000 * 60 * 60 * 24));
  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;
  let waktu = '';
  if (days > 0) waktu += `${days} Hari `;
  waktu += `${hours} Jam ${minutes} Menit ${seconds} Detik`;
  return waktu;
}
