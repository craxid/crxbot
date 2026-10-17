let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender];
  let cooldown = 3600000; // 1 jam

  if (new Date - user.lastberburu > cooldown) {
    let hasil = [];
    let hewan = [
      { nama: 'banteng', emoji: '🐂' },
      { nama: 'harimau', emoji: '🐅' },
      { nama: 'gajah', emoji: '🐘' },
      { nama: 'kambing', emoji: '🐐' },
      { nama: 'panda', emoji: '🐼' },
      { nama: 'buaya', emoji: '🐊' },
      { nama: 'kerbau', emoji: '🐃' },
      { nama: 'sapi', emoji: '🐮' },
      { nama: 'monyet', emoji: '🐒' },
      { nama: 'babihutan', emoji: '🐗' },
      { nama: 'babi', emoji: '🐖' },
      { nama: 'ayam', emoji: '🐓' },
    ];

    for (let i = 0; i < hewan.length; i++) {
      let jumlah = Math.floor(Math.random() * 10);
      hasil.push(`${hewan[i].emoji} ${hewan[i].nama} = [ ${jumlah} ]`);
      user[hewan[i].nama] += jumlah;
    }

    let hsl = ` • *Hasil Berburu*\n${hasil.join('\n')}`;
    setTimeout(() => {
      m.reply(hsl);
    }, 11000);

    setTimeout(() => {
      m.reply('Mendapatkan sasaran! 🎯');
    }, 10000);

    setTimeout(() => {
      m.reply('Sedang mencari mangsa... 🔍');
    }, 0);

    user.lastberburu = new Date * 1;
  } else {
    let timers = clockString(cooldown - (new Date - user.lastberburu));
    m.reply(`\nSepertinya kamu Sudah kecapean, Silahkan Istirahat dulu sekitar *${timers}* Untuk bisa melanjutkan berburu. 😴`);
  }
}

handler.help = ['berburu'];
handler.tags = ['rpg'];
handler.command = /^(berburu|hunt)$/i;
handler.group = true;

module.exports = handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}