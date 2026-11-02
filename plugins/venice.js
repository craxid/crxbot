const fs = require('fs');
const fetch = require('node-fetch');

// Sekarang lewat 9Router lokal di VPS ini, key ambil dari config (global.ninrut)
const ROUTER_URL = 'http://127.0.0.1:20128/v1/chat/completions';
const sesiFolder = 'sesi';

if (!fs.existsSync(sesiFolder)) fs.mkdirSync(sesiFolder);

const MAX_HISTORY_LENGTH = 8; // Dikurangi agar context tidak berat
const MAX_TOKENS_LIMIT = 2048; // Dibatasi agar tidak kepanjangan di WA

// Fungsi jeda/delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callRouterAPI(messages) {
  const res = await fetch(ROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${global.ninrut}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "bzl/gemini-3.1-pro-preview",
      messages,
      max_tokens: MAX_TOKENS_LIMIT
    }),
    timeout: 120000
  });

  if (!res.ok) {
    let pesan = `API Error: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error?.message) pesan = j.error.message;
    } catch (e) {}
    throw new Error(pesan);
  }
  return await res.json();
}

const handler = async (m, { text, conn }) => {
  try {
    if (!global.ninrut) throw new Error('API key tidak ditemukan.');
    const inputChat = text || m.quoted?.text;
    if (!inputChat) return;

    const who = m.quoted?.sender || m.sender;
    const sesiFile = `${sesiFolder}/${who}-venice.txt`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    let riwayatPercakapan = [];
    if (fs.existsSync(sesiFile)) {
      try {
        const raw = fs.readFileSync(sesiFile, 'utf8');
        riwayatPercakapan = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      } catch (e) { riwayatPercakapan = []; }
    }

    riwayatPercakapan.push({ role: "user", content: inputChat });
    riwayatPercakapan = riwayatPercakapan.slice(-(MAX_HISTORY_LENGTH * 8));

    let namaUser = m.name
    let owner = global.numberowner
    const messages = [
      {
        role: "system",
        content: `Menggunakan bahasa indonesia yang profesional, tidak mendukung dan membenci penyimpangan seksual/gender, tidak mendukung LGBT dan turunannya, tidak mendukung pendudukan Israel terhadap palestina, tidak mendukung tindakan dan pemerintahan prabowo gibran. user: ${namaUser}, Ownermu adalah @${owner} ia adalah owner dari bot ini, website bot: https://crax.my.id/bot email owner: ${global.mail}`
      },
      ...riwayatPercakapan
    ];

    let data = await callRouterAPI(messages);
    let hasil = (data?.choices?.[0]?.message?.content || '').trim();

    if (!hasil) throw new Error("Gagal mendapatkan respon.");

    // Simpan & Kirim
    riwayatPercakapan.push({ role: "assistant", content: hasil });
    fs.writeFileSync(sesiFile, Buffer.from(JSON.stringify(riwayatPercakapan)).toString('base64'));

    // Penambahan jeda sebelum mengirim balasan agar tidak terpotong sistem
    await sleep(5000);
    m.reply(hasil);

  } catch (err) {
    console.error(err);
    m.reply(`[!] ${err.message || err}`);
  }
};

handler.command = handler.help = ['venice', 'ven'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;
module.exports = handler;
