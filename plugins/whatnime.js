const fetch = require('node-fetch');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { fromBuffer } = require('file-type');

const uploadFile = async (buffer) => {
  const { mime, ext } = await fromBuffer(buffer) || {
    mime: 'application/octet-stream',
    ext: 'bin'
  };

  const ugu = async (buf) => {
    const form = new FormData();
    form.append('files[]', buf, 'tmp.' + ext);

    const up = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 10; Mobile)'
      }
    });

    const res = await up.json();
    return res.files?.[0]?.url;
  };

  const tele = async (buf) => {
    const form = new FormData();
    form.append('file', buf, 'tmp.' + ext);

    const res = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: form
    });

    const img = await res.json();
    return 'https://telegra.ph' + img[0].src;
  };

  try {
    if (mime.startsWith('image/')) {
      return await ugu(buffer).catch(() => tele(buffer));
    }
    return await ugu(buffer);
  } catch {
    throw new Error('Semua layanan uploader gagal.');
  }
};

let handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';

  if (!/image|video/g.test(mime) || /webp/g.test(mime)) {
    return m.reply(
      `Kirim gambar dengan caption *${usedPrefix + command}* atau tag gambar yang sudah dikirim`
    );
  }

  try {
    await conn.reply(
      m.chat, wait,
      m
    );

    const media = await q.download?.();
    if (!media) throw 'Gagal mendownload media';

    const uploaded = await uploadFile(media);

    const apiRes = await fetch(
      `https://whatnime.onrender.com/api/whatanime?url=${encodeURIComponent(uploaded)}`
    );

    const json = await apiRes.json();

    if (!json.status) {
      throw json.message || 'Data tidak ditemukan';
    }

    const data = json.result;

    const caption = `
${global.htki} *Anime Scene Finder* ${global.htka}
${global.gz} *Source:* ${data.title}
${global.gz} *Similarity:* ${data.similarity}
${global.gz} *Episode:* ${data.episode || 'N/A'}
${global.gz} *Timestamp:* ${data.timestamp}
${global.sb}

©CraXID Bot`;

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const uid = Date.now();

    const inputFile = path.join(tmpDir, `${uid}.webm`);
    const outputFile = path.join(tmpDir, `${uid}.mp4`);

    const video = await axios({
      method: 'GET',
      url: data.videoPreview,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(inputFile);

      video.data.pipe(writer);

      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .save(outputFile)
        .on('end', resolve)
        .on('error', reject);
    });

    await conn.sendPresenceUpdate('recording', m.chat);

    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(outputFile),
        caption,
        mimetype: 'video/mp4'
      },
      { quoted: m }
    );

    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch {}

  } catch (e) {
    console.error(e);
    m.reply(`Error: ${e.message || e}`);
  }
};

handler.help = ['whatanime', 'whatnime'];
handler.command = ['whatanime', 'whatnime'];
handler.tags = ['internet'];
handler.limit = 3;
handler.premium = false;
handler.register = true;

module.exports = handler;