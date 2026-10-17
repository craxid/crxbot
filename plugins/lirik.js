const fetch = require('node-fetch');

let handler = async (m, { conn, text }) => {
  if (!text) throw 'Judul lagu apa yang mau dicari?';

  const apiKeys = ["Bell409","Trial-BmijiUPygRD8XIwk"];
  const baseUrl = "https://api.termai.cc/api/search/lyrics";
  
  let success = false;
  let json;

  try {
    // Mencoba apikey satu per satu
    for (let key of apiKeys) {
      try {
        let res = await fetch(`${baseUrl}?query=${encodeURIComponent(text)}&key=${key}`);
        json = await res.json();
        if (json.status && json.data) {
          success = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!success || !json?.data) throw 'Lirik tidak ditemukan atau API sedang bermasalah.';

    let { 
      track_name, 
      artist_name, 
      album_name, 
      lyrics, 
      album_coverart_500x500 
    } = json.data;

    let pesan = `
*── 「 LYRICS SEARCH 」 ──*

📌 *Title:* ${track_name}
👤 *Artist:* ${artist_name}
💿 *Album:* ${album_name}

---

${lyrics}

---
`.trim();

    // Jika ada cover album, kirim dengan gambar. Jika tidak, kirim teks saja.
    if (album_coverart_500x500) {
      let imgRes = await fetch(album_coverart_500x500);
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

handler.help = ['lirik <judul lagu>'];
handler.tags = ['internet'];
handler.command = /^(lirik|lyrics)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;
