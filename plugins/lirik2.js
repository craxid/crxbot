const fetch = require('node-fetch');

let handler = async (m, { conn, text }) => {
  if (!text) throw 'Judul lagu apa yang mau dicari?';

  try {
    // Fetch data langsung ke API Popcat
    let res = await fetch(`https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(text)}`);
    let json = await res.json();

    // Validasi respons jika terjadi error atau lirik tidak ditemukan
    if (json.error || !json.message) {
        throw 'Lirik tidak ditemukan atau API sedang bermasalah.';
    }

    // Destrukturisasi data dari json.message
    let { 
      title, 
      artist, 
      lyrics, 
      image,
      url
    } = json.message;

    // Menyusun format pesan balasan
    let pesan = `
*── 「 LYRICS SEARCH 」 ──*

📌 *Title:* ${title}
👤 *Artist:* ${artist}
🔗 *Source:* ${url}

---

${lyrics}

---
`.trim();

    // Jika ada gambar cover (image), kirim dengan gambar. Jika tidak, kirim teks saja.
    if (image) {
      let imgRes = await fetch(image);
      let buffer = await imgRes.buffer();
      await conn.sendFile(m.chat, buffer, 'thumbnail.jpg', pesan, m);
    } else {
      await conn.reply(m.chat, pesan, m);
    }

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `*── 「 ERROR LOG 」 ──*\n\n${String(e)}`, m);
  }
};

handler.help = ['lirik2 <judul lagu>'];
handler.tags = ['internet'];
handler.command = /^(lirik2|lyrics2)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;
