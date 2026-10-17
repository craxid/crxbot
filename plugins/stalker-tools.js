const fetch = require('node-fetch');

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  if (command == 'ffstalk') {
    // kode ffstalk disini
  }

  if (command == 'mlstalk') {
    if (!text || !text.includes('|')) throw `Contoh: ${usedPrefix + command} 1443144682|16033`;
    let [userId, zoneId] = text.split('|');
    try {
      let ml = await fetch(`https://api.ryzendesu.vip/api/stalk/mobile-legends?userId=${userId}&zoneId=${zoneId}`).then(res => res.json());
      if (ml.success) {
        let tegsml = `*Mobile Legends Stalk*\n\n`;
        tegsml += `*Username:* ${ml.username}\n`;
        tegsml += `*Region:* ${ml.region}\n`;
        tegsml += `*User ID:* ${userId}\n`;
        tegsml += `*Zone ID:* ${zoneId}\n`;
        await m.reply(`${tegsml}`);
      } else {
        throw `*Error:* Gagal melakukan stalk Mobile Legends`;
      }
    } catch (e) {
      console.log(e);
      throw `*Error:* ${eror}`;
    }
  }

  if (command == 'supersusstalk') {
    // kode supersusstalk disini
  }

  if (command == 'npmstalk') {
    // kode npmstalk disini
  }

  if (command == 'repostalk') {
    // kode repostalk disini
  }
}

handler.command = handler.help = ['ffstalk', 'supersusstalk', 'npmstalk', 'repostalk']
handler.tags = ['stalk']
handler.limit = true

module.exports = handler