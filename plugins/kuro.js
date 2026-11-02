const fs = require('fs');
const os = require('os');
const path = require('path');
const { search, detail, episode, downloadVideo } = require('../lib/kuronime.js');

// plugin kuronime, strukturnya meniru otaku (otakudesu) persis:
// antre pilihan user 2 tahap (pilih anime, terus pilih episode) yg
// balasannya ditangkap handler.before lewat map antrean.
// (di bot ini ga ada conn.awaitReply, jadi jgn dipake, yg bener ya pola ini)
let menunggu = {}

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

  // urutkan MENAIK dari episode 1: bawaan situsnya terbaru dulu.
  // entri yg ga ada nomor episodenya (OVA/special/dll) ditaruh di akhir.
  const noEp = (t) => {
    const kena = t.match(/Episode\s+(\d+)/i);
    return kena ? parseInt(kena[1]) : null;
  };
  const bersih = [...data.episodes];
  bersih.sort((a, b) => {
    const na = noEp(a.title), nb = noEp(b.title);
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return 0;
  });
  if (!bersih.length) return m.reply("❌ Daftar episode tidak ditemukan.", null, efem);

  const d = data.detail || {};
  const daftar = bersih;

  // tampilkan semua detail animenya kayak di situsnya (yg kosong diskip),
  // abis itu sinopsis, baru daftar episode. aturan user: bot ga ada batasnya,
  // jangan motong daftar pake alasan batas caption/pesan. masukin semua aja.
  let caption = `*🎥 ${data.title}*\n\n`;
  const barisInfo = [
    ['Judul Lain', d.judul && d.judul !== data.title ? d.judul : ''],
    ['Skor', d.skor],
    ['Status', d.status],
    ['Studio', d.studio],
    ['Tayang', d.tayang],
    ['Season', d.season],
    ['Tipe', d.tipe],
    ['Durasi', d.durasi],
    ['Total Episode', d.totalEpisode || daftar.length],
    ['Genre', d.genre && d.genre.length ? d.genre.join(', ') : '']
  ];
  barisInfo.forEach(([k, v]) => { if (v) caption += `*${k}:* ${v}\n`; });
  caption += `\n`;
  if (data.synopsis) caption += `*Sinopsis:*\n${data.synopsis}\n\n`;
  caption += `*Pilih episode dengan membalas nomornya (1-${daftar.length}):*\n\n`;
  daftar.forEach((ep, i) => {
      caption += `*${i + 1}.* ${ep.title}\n`;
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
    animeTitle: data.title,
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

    // urutkan dari season paling awal, sama kayak otaku
    const nomorSeason = (judul) => {
      const kena = judul.match(/Season\s*(\d+)/i);
      return kena ? parseInt(kena[1]) : 1;
    };
    results.sort((a, b) => nomorSeason(a.title) - nomorSeason(b.title));

    if (results.length === 1) return await tampilkanEpisode(m, conn, kunci, results[0].link, groupMetadata);

    // semua hasil ditampilkan, jangan dipotong (aturan user)
    const daftar = results;
    let teks = `🔍 *Hasil pencarian: ${text}*\n\n`;
    daftar.forEach((r, i) => {
      teks += `*${i + 1}.* ${r.title}\n`;
      const meta = [r.rating ? `⭐ ${r.rating}` : '', r.type || ''].filter(Boolean).join(' | ');
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
  if (!n || n < 1 || n > data.daftar.length) return;

  clearTimeout(data.timeout);
  delete menunggu[kunci];

  // tahap 1: user milih anime -> lanjut ke daftar episode anime itu
  if (data.tahap === 'anime') {
    const pilihan = data.daftar[n - 1];
    try {
      await tampilkanEpisode(m, conn, kunci, pilihan.link, groupMetadata);
    } catch (err) {
      console.error('Error Before Kuro (anime):', err);
      await m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
    }
    return true;
  }

  // tahap 2: user milih episode -> kirim videonya
  const targetEp = data.daftar[n - 1];
  const judulEp = `${data.animeTitle} ${targetEp.title}`;
  await m.reply(`⏳ Mengambil video untuk ${judulEp}...`, null, efem);

  try {
    const epDetail = await episode(targetEp.link);
    if (!epDetail) {
      await m.reply("❌ Gagal mengambil data video.", null, efem);
      return true;
    }

    // utamakan kirim file videonya langsung kayak otaku.
    // kalo gagal/terlalu besar, baru kasih link.
    let alasanGagal = '';
    if (epDetail.mirrors && epDetail.mirrors.length) {
      const tmp = path.join(os.tmpdir(), `kuro-${Date.now()}-${Math.floor(Math.random() * 9999)}.mp4`);
      try {
        const out = await downloadVideo(epDetail, tmp, { maxBytes: 500 * 1024 * 1024 });
        let caption = `*🎥 ${judulEp}*\n\n📺 Server: ${out.server}\n💾 Ukuran: ${(out.size / 1048576).toFixed(1)} MB`;
        // link download semua kualitas digabung ke caption videonya sekalian
        if (epDetail.downloads.length) {
          caption += `\n\n*📥 Link Download*\n`;
          epDetail.downloads.forEach(row => {
            caption += `\n*${row.resolution}*\n`;
            row.links.forEach(l => { caption += `~> ${l.provider}: ${l.url}\n`; });
          });
        }
        await conn.sendFile(m.chat, out.path, `${judulEp}.mp4`, caption, m, false, efem);
        return true;
      } catch (e) {
        alasanGagal = e.message;
      } finally {
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
      }
    }

    let resultMsg = `*📺 ${judulEp}*\n\n`;
    if (alasanGagal) resultMsg += `⚠️ Video tidak bisa dikirim langsung: ${alasanGagal}\n\n`;
    if (epDetail.downloads.length) {
      resultMsg += `*📥 Download:*\n`;
      epDetail.downloads.forEach(row => {
        resultMsg += `\n*${row.resolution}*\n`;
        row.links.forEach(l => { resultMsg += `~> ${l.provider}: ${l.url}\n`; });
      });
    } else if (epDetail.mirrors && epDetail.mirrors.length) {
      resultMsg += `*🔗 Streaming:*\n`;
      epDetail.mirrors.forEach(mr => { resultMsg += `~> ${mr.server} ${mr.quality}: ${mr.url}\n`; });
    } else {
      resultMsg += `Link streaming & download tidak ditemukan di halaman episode ini.`;
    }

    await conn.sendMessage(m.chat, { text: resultMsg }, { quoted: m, ...efem });
  } catch (err) {
    console.error('Error Before Kuro:', err);
    await m.reply(`❌ Terjadi kesalahan: ${err.message || err}`, null, efem);
  }
  return true;
};

handler.command = ['kuro', 'kuronime'];
handler.help = ['kuro <judul>'];
handler.tags = ['anime'];
handler.register = true;
handler.limit = true;

module.exports = handler;
