let fetch = require("node-fetch");
let btchDownloader = require("btch-downloader");

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `Masukan URL Twitter/X!\n\ncontoh:\n${usedPrefix + command} https://twitter.com/gofoodindonesia/status/1229369819511709697`;
  
  // Validasi URL hanya Twitter/X
  const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i;
  if (!twitterRegex.test(args[0])) {
    throw `URL tidak valid! Hanya mendukung link dari Twitter/X (twitter.com atau x.com)`;
  }

  m.reply(wait);

  try {
    const result = await btchDownloader.twitter(args[0]);
    const { title, url, creator } = result;

                                       
    let videoUrl = url.find(v => v.hd) ? url.find(v => v.hd).hd : url.find(v => v.sd).sd;

    if (videoUrl) {
      conn.sendFile(m.chat, videoUrl, 'twitter.mp4', `*Twitter Downloader*\n\n*Creator*: ${creator}\n*Judul*: ${title}`, m);
    } else {
      throw 'Tidak ada URL video yang ditemukan!';
    }
  } catch (e) {
    console.error(e);
    throw `*Gagal mengunduh video Twitter/X!*`;
  }
};

handler.command = handler.help = ['twitter', 'twitdl', 'twitterdl', 'xdl'];
handler.tags = ['downloader'];
handler.limit = true;
handler.group = false;
handler.premium = false;
handler.owner = false;
handler.admin = false;
handler.botAdmin = false;
handler.fail = null;
handler.private = false;

module.exports = handler;