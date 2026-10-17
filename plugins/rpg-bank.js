const fs = require('fs')
let handler = async (m, { conn, args, usedPrefix, command }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
  try {
    let target = m.mentionedJid[0] || m.sender;
    let user = global.db.data.users[target];
    if (!user) return m.reply('Pengguna tidak ditemukan');

    // Mengambil data user, tambahkan || 0 untuk mencegah error jika data belum ada
    let name = user.name || m.name;
    let exp = user.exp || 0;
    let limit = user.limit || 0;
    let balance = user.money || 0;
    let atm = user.bank || 0;
    let level = user.level || 0;
    let role = user.role || 'Warga Biasa';
    
    // Ini penambahan data hutang/pinjaman 
    let pinjaman = user.pinjaman || 0;

    let capt = `乂 *🏦 B A N K - U S E R 🏦* 乂\n\n`;
    capt += ` ◦ *👤 Nama* : ${name}\n`;
    capt += ` ◦ *⭐ Role* : ${role}\n`;
    capt += ` ◦ *✨ Exp* : ${exp.toLocaleString('id-ID')}\n`;
    capt += ` ◦ *📊 Limit* : ${limit.toLocaleString('id-ID')}\n`;
    capt += ` ◦ *📈 Level* : ${level.toLocaleString('id-ID')}\n`;
    capt += ` ◦ *💰 Saldo* : Rp. ${balance.toLocaleString('id-ID')}\n`;
    capt += ` ◦ *🏧 ATM* : Rp. ${atm.toLocaleString('id-ID')}\n`;
    capt += ` ◦ *💳 Hutang* : Rp. ${pinjaman.toLocaleString('id-ID')}\n\n`; // Menampilkan sisa hutang
    
    // Panduan command di bawah pesan
    capt += `> *${usedPrefix}atm <jumlah>* untuk menabung\n`;
    capt += `> *${usedPrefix}pull <jumlah>* untuk menarik uang\n`;
    capt += `> *${usedPrefix}pinjam <jumlah>* untuk meminjam uang\n`; // Info fitur pinjam
    capt += `> *${usedPrefix}bayar <jumlah>* untuk membayar hutang\n`;   // Info fitur bayar

    // Menggunakan m.reply sebagai pengganti
    m.reply(capt);

    /** 
    await conn.sendMessage(m.chat, {
      text: capt,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 9999,
isForwarded: true,
}
    }, { quoted: fkonn });
    **/

  } catch (e) {
    console.error(e);
    m.reply('Terjadi kesalahan, silakan coba lagi nanti.');
  }
}

handler.help = ['bank'];
handler.tags = ['rpg'];
handler.command = /^bank$/;
handler.group = true;

module.exports = handler;
