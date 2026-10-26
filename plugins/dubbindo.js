const { scrapeSearch, scrapeVideo, daftarLinkDownload, adaKredensial } = require('../lib/dubbindo.js');

// plugin dubbindo (dubbing indonesia), port dari provider CloudStream
// DubbindoProvider. modelnya DOWNLOADER mode link kayak plugin
// downloader lain: bot cuma menampilkan link downloadnya, BUKAN
// mengunduh & mengirim file videonya. alurnya cari -> user balas
// nomor -> bot tampilkan detail + semua link download video itu.
// satu tahap antrean aja, soalnya di situs ini hasil pencarian
// isinya video itu sendiri, ga ada daftar episode.
//
// catatan: video baru di situsnya kena subscribe wall. kalo
// global.dubbindoUser & global.dubbindoPass di config.js diisi, lib-nya
// login + subscribe channel otomatis. kalo kosong, yg kebuka cuma
// video publik (biasanya upload lama).
let menunggu = {}

function opsiEfem(m, groupMetadata) {
  const dur = groupMetadata && groupMetadata.ephemeralDuration;
  return (String(m.chat).endsWith('@g.us') && dur) ? { ephemeralExpiration: dur } : {};
}

function pasangTimeout(kunci, m, opsi = {}) {
  return setTimeout(() => (m.reply('⏳ Waktu habis, pilihan dibatalkan.', null, opsi), delete menunggu[kunci]), 60 * 1000);
}

// tampilkan detail + link download satu video dalam satu pesan
async function tampilkanLink(m, conn, pilihan, efem) {
  await m.reply(`⏳ Mengambil link download *${pilihan.title}*...`, null, efem);

  const data = await scrapeVideo(pilihan.link);
  if (!data) return m.reply('❌ Gagal mengambil data video.', null, efem);

  if (data.inQueue) {
    return m.reply(`⏳ *${data.title}*\n\nVideo ini sedang dalam antrian pemrosesan di situsnya. Coba lagi beberapa menit/jam lagi.\n\n🔗 ${data.url}`, null, efem);
  }

  // halaman artikel: isinya link video eksternal, tampilkan apa adanya
  if (data.articleLinks && data.articleLinks.length) {
    let teks = `*🎥 ${data.title}*\n\n`;
    if (data.description) teks += `${data.description}\n\n`;
    teks += `*🔗 Link Video:*\n`;
    data.articleLinks.forEach(u => { teks += `~> ${u}\n`; });
    return conn.sendMessage(m.chat, { text: teks }, { quoted: m, ...efem });
  }

  if (!data.sources.length) {
    let teks = `❌ *${data.title}*\n\nLink download tidak ditemukan di halaman ini.`;
    if (data.kenaWall) {
      teks += `\n\nKemungkinan video ini kena *subscribe wall*:`;
      teks += adaKredensial()
        ? `\nlogin sudah dicoba tapi playernya tetap belum kebuka (channel belum ke-subscribe / sesi ditolak situsnya).`
        : `\nplugin belum punya akun untuk login. Isi *global.dubbindoUser* dan *global.dubbindoPass* di config.js biar wall-nya bisa dibuka otomatis.`;
    }
    teks += `\n\n🔗 Halaman: ${data.url}`;
    return m.reply(teks, null, efem);
  }

  const links = await daftarLinkDownload(data);

  let teks = `*🎥 ${data.title}*\n`;
  const info = [];
  if (data.episodeInfo && (data.episodeInfo.season || data.episodeInfo.episode)) {
    info.push([
      data.episodeInfo.season ? `Season ${data.episodeInfo.season}` : '',
      data.episodeInfo.episode ? `Episode ${data.episodeInfo.episode}` : ''
    ].filter(Boolean).join(' '));
  }
  if (pilihan.duration) info.push(`Durasi ${pilihan.duration}`);
  if (data.year) info.push(`Tahun ${data.year}`);
  if (info.length) teks += `\n${info.join(' | ')}\n`;
  if (data.tags && data.tags.length) teks += `\n🏷️ ${data.tags.join(', ')}\n`;
  if (data.description) teks += `\n${data.description}\n`;

  // semua link download ditampilkan, jangan dipotong (aturan user)
  teks += `\n*📥 Link Download:*\n`;
  links.forEach(l => {
    teks += `~> ${l.res ? l.res + 'p: ' : ''}${l.url}\n`;
  });
  teks += `\n🔗 Halaman: ${data.url}`;

  await conn.sendMessage(m.chat, { text: teks }, { quoted: m, ...efem });
}

const handler = async (m, { conn, text, usedPrefix, command, groupMetadata }) => {
  const efem = opsiEfem(m, groupMetadata);
  if (!text) return m.reply(`❌ Masukkan judulnya!\n\n*Contoh:*\n${usedPrefix + command} naruto shippuden`, null, efem);

  const kunci = m.chat + '|' + m.sender;
  if (menunggu[kunci]) return m.reply('Masih ada pilihan yang menunggu. Balas *nomornya* untuk memilih, atau ketik *batal*.', null, efem);

  try {
    const results = await scrapeSearch(text);
    if (!results.length) return m.reply(`❌ Video "${text}" tidak ditemukan.`, null, efem);

    if (results.length === 1) return await tampilkanLink(m, conn, results[0], efem);

    // semua hasil ditampilkan, jangan dipotong (aturan user)
    const daftar = results;
    let teks = `🔍 *Hasil pencarian: ${text}*\n\n`;
    daftar.forEach((r, i) => {
      teks += `*${i + 1}.* ${r.title}\n`;
      const meta = [r.duration ? `⏱️ ${r.duration}` : '', r.views ? `👁️ ${r.views}` : ''].filter(Boolean).join(' | ');
      if (meta) teks += `${meta}\n`;
      teks += `\n`;
    });
    teks += `Balas *nomornya* untuk melihat link downloadnya. Berlaku 60 detik, ketik *batal* untuk membatalkan.`;
    await m.reply(teks, null, efem);

    menunggu[kunci] = {
      chat: m.chat,
      sender: m.sender,
      daftar,
      message: m,
      timeout: pasangTimeout(kunci, m, efem)
    };
  } catch (err) {
    console.error('Error Handler Dubbindo:', err);
    m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
  }
};

// tangkap balasan nomor dari user, langsung tampilkan link-nya
handler.before = async (m, { conn, groupMetadata }) => {
  if (m.isBaileys) return;
  const kunci = m.chat + '|' + m.sender;
  const data = menunggu[kunci];
  if (!data) return;
  if (!m.text) return;
  if (m.id === data.message.id) return;
  const efem = opsiEfem(m, groupMetadata);

  const jawab = m.text.trim();
  if (/^batal$/i.test(jawab)) {
    clearTimeout(data.timeout);
    delete menunggu[kunci];
    await m.reply('✅ Pilihan dibatalkan.', null, efem);
    return true;
  }

  const n = parseInt(jawab);
  if (!n || n < 1 || n > data.daftar.length) return;

  clearTimeout(data.timeout);
  delete menunggu[kunci];

  try {
    await tampilkanLink(m, conn, data.daftar[n - 1], efem);
  } catch (err) {
    console.error('Error Before Dubbindo:', err);
    await m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
  }
  return true;
};

handler.command = ['dubbindo', 'dubindo'];
handler.help = ['dubbindo <judul>'];
handler.tags = ['anime'];
handler.register = true;
handler.limit = true;

module.exports = handler;
