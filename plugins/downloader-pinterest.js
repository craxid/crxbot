const fetch = require('node-fetch');

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `Contoh: ${usedPrefix + command} nene kusanagi`;

  const baseUrl = "https://api.siputzx.my.id/api/s/pinterest";
  
  try {
    // Memanggil API dengan parameter type=image
    let res = await fetch(`${baseUrl}?type=image&query=${encodeURIComponent(text)}`);
    
    if (!res.ok) throw 'Sistem API sedang bermasalah.';
    
    let json = await res.json();
    if (!json.status || !json.data || json.data.length === 0) {
      throw 'Gambar tidak ditemukan.';
    }

    // Mengambil satu hasil secara acak dari list data
    let results = json.data;
    let item = results[Math.floor(Math.random() * results.length)];
    let imageUrl = item.image_url;
    let title = item.grid_title || 'Pinterest Result';

    // Mengunduh gambar sebagai buffer agar tidak terkirim sebagai file .bin
    let imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw 'Gagal mengunduh gambar dari Pinterest.';
    let buffer = await imgRes.buffer();

    await conn.sendFile(m.chat, buffer, 'pin.jpg', `
*── 「 PINTEREST 」 ──*

*Title:* ${title}
*Query:* ${text}
*Source:* ${item.pin}
`.trim(), m);

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `*── 「ERROR」 ──*\n\n${String(e)}`, m);
  }
};

handler.help = ['pinterest', 'pin'];
handler.tags = ['internet'];
handler.command = /^(pin|pinterest)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;