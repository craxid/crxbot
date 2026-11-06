const search = require("yt-search");
const fetch = require('node-fetch');

const handler = async (m, { conn, text, usedPrefix}) => {
  if (!text) throw 'Masukkan judul atau link YouTube!';

  try {
    const video = await cariVideo(text);

    if (!video) throw 'Video/Audio tidak ditemukan!';
    if (video.seconds >= 3600) return conn.reply(m.chat, 'Durasi tidak boleh melebihi 1 jam!', m);

    await m.reply(wait);

    const thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

    const views = formatViews(video.views);

    const caption = `*${global.htki} YouTube Play ${global.htka}*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Channel:* ${video.author.name}\n*Uploaded:* ${video.ago}\n*Views:* ${views}\n*URL:* ${video.url}\n*Description:* ${video.description}\n\n_File sedang dikirim..._`;

    const caption2 = `*${global.htki} YouTube Play ${global.htka}*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Channel:* ${video.author.name}\n*Uploaded:* ${video.ago}\n*Views:* ${views}\n*URL:* ${video.url}\n*Description:* ${video.description}`;

    // MENGIRIM GAMBAR BESERTA CAPTION
    conn.sendPresenceUpdate('composing', m.chat);
    await conn.sendMessage(m.chat, {
      image: { url: thumbnailUrl },
      caption: caption,
      contextInfo: {
        forwardingScore: 9999,
        isForwarded: true
      }
    }, { quoted: m });

    // audionya diunduh beneran lewat resa (api.myl.pp.ua) lalu dikirim
    // sebagai buffer; link googlevideo langsung ga bisa dipakai krn
    // keikat IP server yg minta, dari IP lain ditolak 403
    let audioBuffer;
    try {
      const res = await fetch(`https://api.myl.pp.ua/api/yt-download?id=${video.videoId}&format=mp3`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      audioBuffer = await res.buffer();
    } catch (e) {
      return conn.reply(m.chat, 'Audio buat video ini lagi ga bisa diambil, coba lagi nanti ya.', m);
    }

    // MENGIRIM AUDIO
    conn.sendPresenceUpdate('recording', m.chat);
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      caption: caption2, // Catatan: WhatsApp biasanya mengabaikan caption pada audio biasa (kecuali format document)
      mimetype: 'audio/mpeg',
      fileName: `${global.kki} CraXID Bot ${global.kka} ${video.title}.mp3`
    }, { quoted: m });

  } catch (e) {
    m.reply(`Ada yang eror nih: ${e.message || e}`);
  }
};

handler.command = handler.help = ['play', 'song', 'ds'];
handler.tags = ['downloader'];
handler.exp = 0;
handler.limit = true;
handler.premium = false;
handler.register = true;

module.exports = handler;

// yt-search kadang balikin 0 hasil buat susunan kata tertentu padahal
// videonya ada; coba varian susunan katanya dulu sebelum nyerah
async function cariVideo(teks) {
  const kata = teks.trim().split(/\s+/);
  const varian = [teks];
  if (kata.length >= 3) {
    varian.push(kata.slice(0, -1).join(' '));
    varian.push([kata[kata.length - 1], ...kata.slice(0, -1)].join(' '));
    varian.push(kata.slice(1).join(' '));
  }
  for (const q of [...new Set(varian)]) {
    try {
      const r = await search(q);
      if (r.videos && r.videos[0]) return r.videos[0];
    } catch {}
  }
  return null;
}

function formatViews(views) {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  else if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  else return views.toString();
}
