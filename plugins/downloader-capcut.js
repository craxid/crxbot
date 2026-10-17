const axios = require('axios');

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args.length) {
    throw `Masukkan URL!\n\nContoh:\n${usedPrefix + command} https://www.capcut.com/t/ZSmm1R7Sd/`;
  }

  // Harus hanya 1 argumen
  if (args.length !== 1) {
    throw `Format salah!\n\nGunakan hanya satu URL CapCut.\n\nContoh:\n${usedPrefix + command} https://www.capcut.com/t/ZSmm1R7Sd/`;
  }

  let url;

  try {
    url = new URL(args[0]);

    // Validasi protocol
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error();
    }

    // Validasi domain CapCut
    if (!/(^|\.)capcut\.com$/i.test(url.hostname)) {
      throw new Error();
    }
  } catch {
    throw 'URL Tidak Valid! Harap masukkan link CapCut yang benar.';
  }

  m.reply(wait);

  try {
    const apiUrl = `https://api.siputzx.my.id/api/d/capcut?url=${encodeURIComponent(url.href)}`;

    const response = await axios.get(apiUrl);
    const res = response.data;

    if (!res.status || !res.data) {
      throw 'Gagal mengambil data dari API. Pastikan link valid.';
    }

    const {
      title = 'Tanpa Judul',
      originalVideoUrl,
      authorName = 'Unknown'
    } = res.data;

    if (!originalVideoUrl) {
      throw 'Video tidak ditemukan.';
    }

    const message =
      `🎬 *CapCut Downloader*\n\n` +
      `• *Judul:* ${title.trim()}\n` +
      `• *Author:* ${authorName}\n\n`;

    await conn.sendFile(
      m.chat,
      originalVideoUrl,
      'capcut.mp4',
      message,
      m
    );

  } catch (error) {
    console.error(error);

    m.reply(
      `Terjadi Kesalahan: ${
        error?.response?.data?.message ||
        error?.message ||
        'API sedang bermasalah.'
      }`
    );
  }
};

handler.help = ['capcut', 'cc', 'capcutdl', 'ccdl'];
handler.tags = ['downloader'];
handler.command = /^(capcut|cc|capcutdl|ccdl)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;