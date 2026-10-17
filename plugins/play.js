const search = require("yt-search");
const fetch = require('node-fetch');

const handler = async (m, { conn, text, usedPrefix}) => {
  if (!text) throw 'Masukkan judul atau link YouTube!';

  try {
    const searchResult = await search(text);
    const video = searchResult.videos[0];

    if (!video) throw 'Video/Audio tidak ditemukan!';
    if (video.seconds >= 3600) return conn.reply(m.chat, 'Durasi tidak boleh melebihi 1 jam!', m);

    await m.reply(wait);

    const response = await fetch(`https://api.termai.cc/api/downloader/youtube?type=mp3&url=${encodeURIComponent(video.url)}&key=Bell409`);
    const data = await response.json();
    
    const audioUrl = (data.data.downloads.find(dl => dl.format_id == 140) || data.data.downloads[0]).dlink;

    const thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

    const views = formatViews(video.views);

    const caption = `*${global.htki} YouTube Play ${global.htka}*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Channel:* ${video.author.name}\n*Uploaded:* ${video.ago}\n*Views:* ${views}\n*URL:* ${video.url}\n*Description:* ${video.description}\n\n_File sedang dikirim..._`;

    const caption2 = `*${global.htki} YouTube Play ${global.htka}*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Channel:* ${video.author.name}\n*Uploaded:* ${video.ago}\n*Views:* ${views}\n*URL:* ${video.url}\n*Description:* ${video.description}`;

    // MENGIRIM GAMBAR BESERTA CAPTION
    setTimeout(() => {
      conn.sendPresenceUpdate('composing', m.chat);
      conn.sendMessage(m.chat, {
        image: { url: thumbnailUrl },
        caption: caption,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true
        }
      }, { quoted: m });
    }, 2000);

    // MENGIRIM AUDIO
    setTimeout(() => {
      conn.sendPresenceUpdate('recording', m.chat);
      conn.sendMessage(m.chat, {
        audio: { url: audioUrl },
        caption: caption2, // Catatan: WhatsApp biasanya mengabaikan caption pada audio biasa (kecuali format document)
        mimetype: 'audio/mpeg',
        fileName: `${global.kki} CraXID Bot ${global.kka} ${video.title}.mp3`
      }, { quoted: m });
    }, 5000);

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

function formatViews(views) {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  else if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  else return views.toString();
}
