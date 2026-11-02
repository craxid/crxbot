const fs = require('fs');
const os = require('os');
const path = require('path');
const { search, detail, episode, downloadVideo, fixLink } = require('../lib/otakudesu.js');

// antre pilihan user, pola sama kayak owner-unmute & konfirmasi gofile:
// prompt dikirim, terus balasan angka user ditangkap di handler.before.
// (di bot ini ga ada conn.awaitReply, jadi jgn dipake, yg bener ya pola ini)
// antreannya 2 tahap: pilih anime dulu (kalo hasil cari lebih dari 1), baru pilih episode.
let menunggu = {}

// kalo grupnya nyalain pesan sementara (disappearing messages), pesan2 bot
// dikasih kedaluwarsa yg sama (ephemeralExpiration, dalam detik) biar ikut
// kehapus otomatis ngikutin setelan grup. durasinya ada di metadata grup.
function opsiEfem(m, groupMetadata) {
  const dur = groupMetadata && groupMetadata.ephemeralDuration;
  return (String(m.chat).endsWith('@g.us') && dur) ? { ephemeralExpiration: dur } : {};
}

function pasangTimeout(kunci, m, opsi = {}) {
  return setTimeout(() => (m.reply('⏳ Waktu habis, pilihan dibatalkan.', null, opsi), delete menunggu[kunci]), 60 * 1000);
}

// tampilkan info + daftar episode satu anime dalam SATU pesan (caption gambar),
// jangan dipecah2 biar ga dikira spam sama whatsapp.
async function tampilkanEpisode(m, conn, kunci, animeUrl, groupMetadata) {
  const efem = opsiEfem(m, groupMetadata);
  const data = await detail(animeUrl);
  if (!data || !data.episodes.length) return m.reply("❌ Gagal mengambil data episode.", null, efem);

  const info = data.info || {};
  const genre = info['Genre'] || info['Genres'] || '-';
  const skor = info['Skor'] || info['Rating'] || '-';
  const totalEp = info['Total Episode'] || data.episodes.length;

  // bersihin daftar episode: buang entri batch & entri rentang penuh
  // (mis. "[BATCH]" dan "Episode 1 - 12 (End)") karena itu bukan episode
  // tunggal, halaman mereka ga ada playernya.
  // terus urutkan MENAIK dari episode 1: bawaan situsnya terbaru dulu,
  // user bacanya enakan dari awal.
  const noEp = (t) => {
    const kena = t.match(/Episode\s+(\d+)/i);
    return kena ? parseInt(kena[1]) : null;
  };
  const bersih = data.episodes.filter(ep => !/batch/i.test(ep.title) && !/Episode\s+\d+\s*[–—-]\s*\d+/i.test(ep.title));
  bersih.sort((a, b) => {
    const na = noEp(a.title), nb = noEp(b.title);
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return 0;
  });
  if (!bersih.length) return m.reply("❌ Daftar episode tidak ditemukan.", null, efem);

  // judul episode diringkas (buang pengulangan judul anime) biar caption muat
  const ringkas = (t) => {
    const kena = t.match(/(Episode\s+\d+.*|\[BATCH\].*|OVA.*|Special.*|Movie.*)$/i);
    return kena ? kena[1].replace(/\s*Subtitle Indonesia\s*$/i, '').trim() : t;
  };

  // tampilkan SEMUA episode dari episode 1. aturan user: bot ga ada batasnya,
  // jangan motong daftar pake alasan batas caption/pesan. masukin semua aja.
  const daftar = bersih;
  // tampilkan semua detail animenya kayak di situsnya (yg kosong diskip),
  // abis itu sinopsis, baru daftar episode.
  let caption = `*🎥 ${data.title}*\n\n`;
  const barisInfo = [
    ['Japanese', info['Japanese']],
    ['Skor', skor !== '-' ? skor : ''],
    ['Produser', info['Produser']],
    ['Tipe', info['Tipe']],
    ['Status', info['Status']],
    ['Total Episode', totalEp],
    ['Durasi', info['Durasi']],
    ['Tanggal Rilis', info['Tanggal Rilis']],
    ['Studio', info['Studio']],
    ['Genre', genre !== '-' ? genre : '']
  ];
  barisInfo.forEach(([k, v]) => { if (v) caption += `*${k}:* ${v}\n`; });
  caption += `\n`;
  if (data.synopsis) caption += `*Sinopsis:*\n${data.synopsis}\n\n`;
  caption += `*Pilih episode dengan membalas nomornya (1-${daftar.length}):*\n\n`;
  daftar.forEach((ep, i) => {
      caption += `*${i + 1}.* ${ringkas(ep.title)}\n`;
  });
  caption += `\nBerlaku 60 detik, ketik *batal* untuk membatalkan.`;

  await conn.sendMessage(m.chat, {
      image: { url: data.thumbnail },
      caption
  }, { quoted: m, ...efem });

  menunggu[kunci] = {
    tahap: 'episode',
    chat: m.chat,
    sender: m.sender,
    daftar,
    message: m,
    timeout: pasangTimeout(kunci, m, efem)
  };
}

const handler = async (m, { conn, text, usedPrefix, command, groupMetadata }) => {
  const efem = opsiEfem(m, groupMetadata);
  if (!text) return m.reply(`❌ Masukkan judul anime!\n\n*Contoh:*\n${usedPrefix + command} komi-san`, null, efem);

  const kunci = m.chat + '|' + m.sender;
  if (menunggu[kunci]) return m.reply('Masih ada pilihan yang menunggu. Balas *nomornya* untuk memilih, atau ketik *batal*.', null, efem);

  try {
    const results = await search(text);
    if (!results.length) return m.reply(`❌ Anime "${text}" tidak ditemukan.`, null, efem);

    // urutkan dari season paling awal. hasil cari di situsnya tampil dari yg
    // terbaru, jadi season 2 bisa nongol di atas season 1 (kebalik buat dipilih).
    // judul tanpa tulisan Season dianggap season 1.
    const nomorSeason = (judul) => {
      const kena = judul.match(/Season\s*(\d+)/i);
      return kena ? parseInt(kena[1]) : 1;
    };
    results.sort((a, b) => nomorSeason(a.title) - nomorSeason(b.title));

    // hasil cuma 1, langsung masuk daftar episode aja
    if (results.length === 1) return await tampilkanEpisode(m, conn, kunci, results[0].link, groupMetadata);

    // hasil banyak: kasih daftar anime (termasuk season2nya kalo ada),
    // user pilih nomornya dulu, abis itu baru daftar episode.
    // semua hasil ditampilkan, jangan dipotong (aturan user: bot ga ada batasnya)
    const daftar = results;
    let teks = `🔍 *Hasil pencarian: ${text}*\n\n`;
    daftar.forEach((r, i) => {
      teks += `*${i + 1}.* ${r.title}\n`;
      const meta = [r.rating ? `⭐ ${r.rating}` : '', r.status || ''].filter(Boolean).join(' | ');
      if (meta) teks += `${meta}\n`;
      teks += `\n`;
    });
    teks += `Balas *nomornya* untuk memilih anime. Berlaku 60 detik, ketik *batal* untuk membatalkan.`;
    await m.reply(teks, null, efem);

    menunggu[kunci] = {
      tahap: 'anime',
      chat: m.chat,
      sender: m.sender,
      daftar,
      message: m,
      timeout: pasangTimeout(kunci, m, efem)
    };
  } catch (err) {
    console.error('Error Handler:', err);
    m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
  }
};

// tangkap balasan nomor dari user (nomor anime atau nomor episode, tergantung tahap antreannya)
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
  if (!n || n < 1 || n > data.daftar.length) return; // bukan nomor yg valid, abaikan aja

  clearTimeout(data.timeout);
  delete menunggu[kunci];

  // tahap 1: user milih anime dari daftar pencarian -> lanjut ke daftar episode anime itu
  if (data.tahap === 'anime') {
    const pilihan = data.daftar[n - 1];
    try {
      await tampilkanEpisode(m, conn, kunci, pilihan.link, groupMetadata);
    } catch (err) {
      console.error('Error Before Otaku (anime):', err);
      await m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
    }
    return true;
  }

  // tahap 2: user milih episode -> kirim videonya
  const targetEp = data.daftar[n - 1];
  await m.reply(`⏳ Mengambil video untuk ${targetEp.title}...`, null, efem);

  try {
    const epDetail = await episode(targetEp.link);
    // link download masih dibungkus redirector desustream, buka dulu
    // biar yg sampai ke user link provider aslinya
    await fixLink(epDetail.downloads);
    if (!epDetail) {
      await m.reply("❌ Gagal mengambil data video.", null, efem);
      return true;
    }

    // utamakan kirim file videonya langsung (dari server mirror, paling stabil odstream),
    // persis kayak nekopoi. kalo gagal/terlalu besar, baru kasih link.
    let alasanGagal = '';
    if (epDetail.embed || (epDetail.mirrors && epDetail.mirrors.length)) {
      const tmp = path.join(os.tmpdir(), `otaku-${Date.now()}-${Math.floor(Math.random() * 9999)}.mp4`);
      try {
        const out = await downloadVideo(epDetail, tmp, { maxBytes: 500 * 1024 * 1024 });
        let caption = `*🎥 ${targetEp.title}*\n\n📺 Server: ${out.server}\n💾 Ukuran: ${(out.size / 1048576).toFixed(1)} MB`;
        // link download semua kualitas digabung ke caption videonya sekalian,
        // jangan dikirim sebagai pesan terpisah (kata user)
        if (epDetail.downloads.length) {
          caption += `\n\n*📥 Link Download*\n`;
          epDetail.downloads.forEach(row => {
            caption += `\n*${row.resolution}*\n`;
            row.links.forEach(l => { caption += `~> ${l.provider}: ${l.url}\n`; });
          });
        }
        await conn.sendFile(m.chat, out.path, `${targetEp.title}.mp4`, caption, m, false, efem);
        return true;
      } catch (e) {
        alasanGagal = e.message;
      } finally {
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
      }
    }

    let resultMsg = `*📺 ${targetEp.title}*\n\n`;
    if (alasanGagal) resultMsg += `⚠️ Video tidak bisa dikirim langsung: ${alasanGagal}\n\n`;
    if (epDetail.embed) resultMsg += `*🔗 Streaming:* ${epDetail.embed}\n\n`;
    if (epDetail.downloads.length) {
      resultMsg += `*📥 Download:*\n`;
      epDetail.downloads.forEach(row => {
        resultMsg += `\n*${row.resolution}*\n`;
        row.links.forEach(l => { resultMsg += `~> ${l.provider}: ${l.url}\n`; });
      });
    } else if (!epDetail.embed) {
      resultMsg += `Link streaming & download tidak ditemukan di halaman episode ini.`;
    }

    await conn.sendMessage(m.chat, { text: resultMsg }, { quoted: m, ...efem });
  } catch (err) {
    console.error('Error Before Otaku:', err);
    await m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
  }
  return true;
};

handler.command = ['otaku', 'nonton'];
handler.help = ['otaku <judul>'];
handler.tags = ['anime'];
handler.register = true;
handler.limit = true;

module.exports = handler;
