const axios = require('axios');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// ==========================================
// WAJIB DIISI! (Kalau kosong bakal kena error)
const TOKEN_SAYA = global.gtctkn;
const KUNCI_AKHIR = global.gtckey;
// ==========================================

const _x = 'a72c9287558ee38d8dbeef1d247501e5:2b8b832995bd50686257c29f869571e4d81901751823fd7159cc535c4cc76f826ea56b0cf162d1a98fc2670c9657c41efce3faf20ebc9ccf74e0ea027d14a6da99d06fe106bb0358be0ca6001f60cf17cc1a108ee6aa02379cf8c01b3481704062c373f8ed9542ced8e1afdd73eadd5d4e4945ab7cf55668a8fb2cd5788ba2873c4aa651e08bc2528870816ab0cb0f3ede497e645650f49d0bb1c7f88417cc1338ad879ac5b3bbbc745d7c6c86c8ad7ce75c3be615599351e45f1a51f1a8f335dc4e8fc96067f815b3f2559021c475a66cebf650befe31ba709ef7a66b001667';
const _k = 'autoftbot69';

function _buka() {
  const b = _x.split(':');
  const iv = Buffer.from(b[0], 'hex');
  const kunci = crypto.createHash('sha256').update(_k).digest();
  const d = crypto.createDecipheriv('aes-256-cbc', kunci, iv);
  let r = d.update(b[1], 'hex', 'utf8');
  r += d.final('utf8');
  return JSON.parse(r);
}
const _cfg = _buka();
const BASE_URL = _cfg.u.split('/search')[0];

function enkripsiData(teks, kunci) {
  return CryptoJS.AES.encrypt(teks, CryptoJS.enc.Hex.parse(kunci), { mode: CryptoJS.mode.ECB }).toString();
}

function dekripsiData(teksEnkripsi, kunci) {
  return CryptoJS.AES.decrypt(teksEnkripsi, CryptoJS.enc.Hex.parse(kunci), { mode: CryptoJS.mode.ECB }).toString(CryptoJS.enc.Utf8);
}

function buatTandaTangan(waktu, isiBody) {
  return CryptoJS.HmacSHA256(`${waktu}-${isiBody}`, CryptoJS.enc.Hex.parse(_cfg.h)).toString(CryptoJS.enc.Base64);
}

function formatNomorHP(nomor) {
  nomor = nomor.replace(/[\s\-()]/g, '');
  if (nomor.startsWith('0')) return '+62' + nomor.slice(1);
  if (nomor.startsWith('62')) return '+' + nomor;
  if (!nomor.startsWith('+')) return '+62' + nomor;
  return nomor;
}

function headerUntuk(waktu, body) {
  return {
    'Content-Type': 'application/json',
    'X-Os': 'android 9',
    'X-Mobile-Service': 'GMS',
    'X-App-Version': '5.6.2',
    'X-Client-Device-Id': _cfg.d,
    'X-Lang': 'in_ID',
    'X-Token': TOKEN_SAYA,
    'X-Req-Timestamp': waktu,
    'X-Encrypted': '1',
    'X-Network-Country': 'id',
    'X-Country-Code': 'id',
    'X-Req-Signature': buatTandaTangan(waktu, body),
  };
}

// satu pintu buat semua panggilan ke server GetContact.
// kalo server lagi minta validasi (errorCode 403004), error-nya dilempar
// dengan kode CAPTCHA plus gambar tantangannya, biar handler bisa nerusin
// gambarnya ke user dan user yang jawab sendiri.
async function panggilApi(path, payload) {
  const waktu = Date.now().toString();
  const body = JSON.stringify(payload);
  const res = await axios.post(BASE_URL + path, { data: enkripsiData(body, KUNCI_AKHIR) }, {
    headers: headerUntuk(waktu, body),
    timeout: 20000,
    validateStatus: () => true,
  });

  let hasil;
  try {
    hasil = JSON.parse(dekripsiData(res.data.data, KUNCI_AKHIR));
  } catch (e) {
    throw new Error('Respons GetContact tidak bisa dibaca');
  }

  const meta = hasil.meta || {};
  if (meta.errorCode === '403004') {
    const err = new Error(meta.errorMessage || 'Validasi pengguna diperlukan.');
    err.kode = 'CAPTCHA';
    err.gambar = hasil.result && hasil.result.image;
    throw err;
  }
  if (meta.httpStatusCode === 404) return { tidakDitemukan: true, hasil };
  if (meta.errorMessage) throw new Error(meta.errorMessage);
  if (res.status >= 400) throw new Error(`Request ditolak (Status: ${res.status})`);
  return { hasil };
}

// kirim kode captcha yang dijawab user. kalo kodenya salah, server bales
// 403004 lagi plus gambar baru (di panggilApi udah jadi error CAPTCHA).
async function verifyKode(kode) {
  return panggilApi('/verify-code', { validationCode: kode, token: TOKEN_SAYA });
}

async function cariNomor(nomorHP) {
  if (!TOKEN_SAYA || !KUNCI_AKHIR) {
    throw new Error('TOKEN_SAYA dan KUNCI_AKHIR belum diisi di dalam config.js!');
  }

  const nomor = formatNomorHP(nomorHP);

  // 1. TEMBUS ENDPOINT PROFIL (/search)
  const { hasil, tidakDitemukan } = await panggilApi('/search', {
    countryCode: 'id', phoneNumber: nomor, source: 'search', token: TOKEN_SAYA
  });

  if (tidakDitemukan) {
    const kuota = hasil.result?.subscriptionInfo?.usage?.search || {};
    return { nomor, nama: null, jumlahTag: 0, badge: null, spam: 'aman', sisaKuota: kuota.remainingCount, batasKuota: kuota.limit, tags: [], tidakDitemukan: true };
  }

  const profil = hasil.result?.profile || {};
  const kuota = hasil.result?.subscriptionInfo?.usage?.search || {};
  let daftarTag = [];

  // 2. TEMBUS ENDPOINT TAG (/number-detail)
  if (profil.tagCount > 0) {
    try {
      const detail = await panggilApi('/number-detail', {
        countryCode: 'id', phoneNumber: nomor, source: 'details', token: TOKEN_SAYA
      });
      const tags = detail.hasil?.result?.tags;
      if (Array.isArray(tags)) daftarTag = tags.map(t => t.name || t.tag);
    } catch (errTags) {
      // kalo server minta validasi, jangan ditelan: handler perlu gambarnya
      // buat diterusin ke user.
      if (errTags.kode === 'CAPTCHA') throw errTags;
      // error lain abaikan diam-diam, profilnya tetap dikirim
    }
  }

  return {
    nomor: profil.phoneNumber || nomor,
    nama: profil.displayName || null,
    jumlahTag: profil.tagCount || 0,
    badge: hasil.result?.badge || null,
    spam: hasil.result?.spamInfo?.degree || 'aman',
    sisaKuota: kuota.remainingCount,
    batasKuota: kuota.limit,
    tags: daftarTag
  };
}

// ==========================================
// HANDLER BOT
// ==========================================
// antrean validasi captcha: kuncinya chat|sender (pola yang sama kayak
// otaku). isinya nomor yang lagi dicari + sisa kesempatan jawab.
let menunggu = {};

function opsiEfem(m, groupMetadata) {
  const dur = groupMetadata && groupMetadata.ephemeralDuration;
  return (String(m.chat).endsWith('@g.us') && dur) ? { ephemeralExpiration: dur } : {};
}

function kirimHasil(m, conn, hasil, groupMetadata) {
  let caption = `*${global.htki || '≡'} GetContact Search ${global.htka || '≡'}*\n\n`;
  caption += `*Nomor:* ${hasil.nomor}\n`;
  caption += `*Nama:* ${hasil.nama || '-'}\n`;
  caption += `*Jumlah Tag:* ${hasil.jumlahTag}\n`;

  if (hasil.tags && hasil.tags.length > 0) {
    caption += `*Daftar Tag:*\n`;
    hasil.tags.forEach((tag, index) => {
      caption += `${index + 1}. ${tag}\n`;
    });
  }

  caption += `*Badge:* ${hasil.badge || '-'}\n`;
  caption += `*Spam:* ${hasil.spam}\n`;
  caption += `*Sisa Kuota:* ${hasil.sisaKuota}/${hasil.batasKuota}\n\n`;
  caption += `_© CraXID Project_`;

  const efem = opsiEfem(m, groupMetadata);
  setTimeout(() => {
    conn.sendPresenceUpdate('composing', m.chat);
    conn.sendMessage(m.chat, { text: caption }, { quoted: m, ...efem });
  }, 1500);
}

// kirim gambar captcha ke user dan catat antreannya. user tinggal bales
// teks kodenya di chat yang sama, nanti ditangkap handler.before.
// tantangan = urutan tantangan captcha dalam satu pencarian ini (satu
// pencarian bisa ditantang server berkali-kali krn validasi cuma berlaku
// per panggilan); dibatasi biar ga muter selamanya.
async function mulaiCaptcha(m, conn, nomor, gambar, sisa, groupMetadata, tantangan = 1) {
  const kunci = m.chat + '|' + m.sender;
  if (menunggu[kunci]) clearTimeout(menunggu[kunci].timeout);
  const efem = opsiEfem(m, groupMetadata);

  const data = { nomor, sisa, tantangan, messageId: null, timeout: null };
  data.timeout = setTimeout(() => {
    delete menunggu[kunci];
    m.reply('⏳ Waktu validasi habis, pencarian dibatalkan. Ulangi lagi perintahnya ya.', null, efem).catch(() => {});
  }, 3 * 60 * 1000);
  menunggu[kunci] = data;

  const buf = Buffer.from(String(gambar || '').replace(/\\\//g, '/'), 'base64');
  const terkirim = await conn.sendMessage(m.chat, {
    image: buf,
    caption: `🔐 Server GetContact minta validasi dulu.\n\nBalas dengan *kode yang ada di gambar ini* (cukup teks kodenya aja).\nKesempatan: ${sisa} kali. Ketik *batal* kalo nggak jadi.`
  }, { quoted: m, ...efem });
  if (terkirim && terkirim.key) data.messageId = terkirim.key.id;
}

const handler = async (m, { conn, text, usedPrefix, groupMetadata }) => {
  if (!text) throw `Masukkan nomor yang ingin dicari!\nContoh: ${usedPrefix || '.'}getcontact 081234567890`;

  try {
    await m.reply(wait);

    const hasil = await cariNomor(text);

    if (hasil.tidakDitemukan) {
        return m.reply(`*Nomor:* ${hasil.nomor}\n*Status:* Tidak ditemukan`);
    }

    kirimHasil(m, conn, hasil, groupMetadata);
  } catch (e) {
    if (e.kode === 'CAPTCHA' && e.gambar) {
      return mulaiCaptcha(m, conn, text, e.gambar, 3, groupMetadata);
    }
    m.reply(`Ada yang eror nih: ${e.message || e}`);
  }
};

// tangkap jawaban kode captcha dari user yang lagi nunggu validasi
handler.before = async (m, { conn, groupMetadata }) => {
  if (m.isBaileys) return;
  const kunci = m.chat + '|' + m.sender;
  const data = menunggu[kunci];
  if (!data) return;
  if (!m.text) return;
  if (data.messageId && m.id === data.messageId) return;
  const efem = opsiEfem(m, groupMetadata);

  const jawab = m.text.trim();
  if (/^batal$/i.test(jawab)) {
    clearTimeout(data.timeout);
    delete menunggu[kunci];
    await m.reply('✅ Validasi dibatalkan.', null, efem);
    return true;
  }
  // pesan yang diawali prefix perintah jangan dianggap kode
  if (/^[.!#/]/.test(jawab)) return;
  const kode = jawab.replace(/\s+/g, '');
  if (!/^[a-zA-Z0-9]{3,8}$/.test(kode)) return; // bukan bentuk kode, abaikan aja

  clearTimeout(data.timeout);
  delete menunggu[kunci];

  try {
    await verifyKode(kode);
  } catch (e) {
    if (e.kode === 'CAPTCHA') {
      // kode salah: server ngasih gambar baru, terusin lagi ke user
      const sisa = data.sisa - 1;
      if (sisa > 0 && e.gambar) {
        // tampilin alasan asli dari server biar jelas penolakannya krn apa
        await m.reply(`❌ Kode ditolak server: ${e.message || 'tidak valid'}. Ini gambar barunya.`, null, efem);
        await mulaiCaptcha(m, conn, data.nomor, e.gambar, sisa, groupMetadata, data.tantangan || 1);
      } else {
        await m.reply(`❌ Kode ditolak server: ${e.message || 'tidak valid'}, dan kesempatan habis. Ulangi lagi perintah getkontaknya ya.`, null, efem);
      }
    } else {
      await m.reply(`❌ Validasi gagal: ${e.message || e}`, null, efem);
    }
    return true;
  }

  await m.reply('✅ Validasi berhasil, mencari ulang nomornya...', null, efem);
  try {
    const hasil = await cariNomor(data.nomor);
    if (hasil.tidakDitemukan) {
      await m.reply(`*Nomor:* ${hasil.nomor}\n*Status:* Tidak ditemukan`, null, efem);
      return true;
    }
    kirimHasil(m, conn, hasil, groupMetadata);
  } catch (e) {
    if (e.kode === 'CAPTCHA' && e.gambar) {
      // validasi barusan lolos tapi panggilan berikutnya ditantang lagi
      // (validasi GetContact cuma berlaku per panggilan). lanjutkan sesi
      // yang sama: kesempatan ga dipotong dan ga di-reset, cuma jumlah
      // tantangannya yang dibatasi biar ga muter selamanya.
      const tantanganBaru = (data.tantangan || 1) + 1;
      if (tantanganBaru > 3) {
        await m.reply('❌ Server GetContact lagi minta validasi terus-terusan, pencarian dihentikan dulu. Coba lagi nanti ya.', null, efem);
      } else {
        await m.reply('🔐 Server minta validasi sekali lagi buat lanjut ambil datanya, ini gambar barunya.', null, efem);
        await mulaiCaptcha(m, conn, data.nomor, e.gambar, data.sisa, groupMetadata, tantanganBaru);
      }
    } else {
      await m.reply(`Ada yang eror nih: ${e.message || e}`, null, efem);
    }
  }
  return true;
};

handler.command = handler.help = ['getcontact', 'getkontak'];
handler.tags = ['tools'];
handler.exp = 0;
handler.limit = true;
handler.premium = true;
handler.register = true;

module.exports = handler;
