const fetch = require('node-fetch');

// Daftar aksi yang tersedia
const actions = [
  'bully','cuddle','cry','hug','awoo','kiss','pat','smug','bonk','yeet',
  'blush','smile','wave','highfive','handhold','nom','bite','glomp',
  'slap','kill','happy','wink','poke','dance','cringe'
];

// Konfigurasi batas penggunaan
const usageMap = new Map(); // userId => [timestamps]
const MAX_USAGE = 3;
const TIME_WINDOW = 5 * 60 * 1000; // 5 menit dalam milidetik

var handler = async (m, { conn, args, usedPrefix, command}) => {
  const action = args[0]?.toLowerCase();
  const userId = m.sender;
  const now = Date.now();

  // Cek dan update penggunaan
  if (!usageMap.has(userId)) usageMap.set(userId, []);
  const timestamps = usageMap.get(userId).filter(ts => now - ts < TIME_WINDOW);

  if (timestamps.length>= MAX_USAGE) {
    return m.reply('⏳ Kamu hanya bisa menggunakan perintah ini maksimal 3 kali dalam 5 menit. Silakan coba lagi nanti.');
}

  timestamps.push(now);
  usageMap.set(userId, timestamps);

  // Jika tidak ada argumen, kirim tombol interaktif
  if (!action) {
    return await conn.sendMessage(m.chat, {
      text: 'Pilih aksi anime yang ingin kamu kirim:',
      footer: 'CraXID Bot',
      buttons: [
        { buttonId: `${usedPrefix}${command} hug`, buttonText: { displayText: '🤗 Hug'}, type: 1},
        { buttonId: `${usedPrefix}${command} kiss`, buttonText: { displayText: '😘 Kiss'}, type: 1},
        { buttonId: `${usedPrefix}${command} anime`, buttonText: { displayText: '🎌 Anime'}, type: 1}
      ],
      headerType: 1
}, { quoted: m});
}

  // Khusus untuk 'anime' dari pic.re
  if (action === 'anime') {
    try {
      m.reply('_Mengambil gambar anime..._');
      const res = await fetch('https://pic.re/image');
      const buffer = await res.buffer();
      await conn.sendFile(m.chat, buffer, 'anime.jpg', `Random anime\n©CraXID Bot`, m);
} catch (e) {
      console.error(e);
      return m.reply('❌ Gagal mengambil gambar dari pic.re');
}
    return;
}

  // Validasi aksi dari waifu.pics
  if (!actions.includes(action)) {
    return m.reply(`*${action}* tidak tersedia.\nGunakan salah satu dari:\n${actions.join(', ')}, anime`);
}

  // Ambil media dari waifu.pics
  try {
    m.reply('_Mengambil media..._');
    const res = await fetch(`https://api.waifu.im/sfw/${action}`);
    const json = await res.json();
    const mediaUrl = json.url;

    // Kirim media sebagai pesan biasa (gambar atau video)
    if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.gif')) {
      await conn.sendMessage(m.chat, {
        video: { url: mediaUrl},
        caption: `Aksi: *${action}*\n©CraXID Bot`
}, { quoted: m});
} else {
      await conn.sendMessage(m.chat, {
        image: { url: mediaUrl},
        caption: `Aksi: *${action}*\n©CraXID Bot`
}, { quoted: m});
}
} catch (e) {
    console.error(e);
    return m.reply(`❌ Terjadi kesalahan saat mengambil\n\n${e}`);
}
};

handler.command = ['random'];
handler.help = ['random <pilihan>'];
handler.tags = ['image'];
handler.limit = true;

module.exports = handler;