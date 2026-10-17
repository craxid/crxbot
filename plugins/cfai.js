const fs = require('fs');
const fetch = require('node-fetch');

// Pastikan global.cfai, global.numberowner, dan global.mail sudah terdefinisi di config kamu
const CF_KEY = global.cfai;
const CF_ACCOUNT = "ISI_ACCOUNT_ID_DISINI";
const CF_MODEL = "@cf/zai-org/glm-4.7-flash";
const sesiFolder = 'sesi';

if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const MAX_HISTORY_LENGTH = 8;

async function callCloudflareAPI(messages) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${CF_MODEL}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error(`Cloudflare API error: ${res.status} ${res.statusText}${txt ? '\n' + txt : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data;
}

const handler = async (m, { text, conn }) => {
  try {
    // === CUSTOM PROMPT (SYSTEM INSTRUCTION) ===
    const systemPrompt = `Kamu adalah asisten AI yang cerdas, ramah, dan sangat membantu yang dikembangkan oleh CraXID Project. Pembuatmu adalah @${global.numberowner}, email: ${global.mail}`;

    if (!CF_KEY) throw new Error('API key Cloudflare tidak ditemukan. Set global.cfai atau env CF_KEY.');
    if (!text) return m.reply("Ada yang bisa saya bantu?");

    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const sesiFile = `${sesiFolder}/${who}-cf.txt`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    // Load riwayat percakapan
    let riwayatPercakapan = [];
    if (fs.existsSync(sesiFile)) {
      try {
        const raw = fs.readFileSync(sesiFile, 'utf8');
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        riwayatPercakapan = JSON.parse(decoded);
        if (!Array.isArray(riwayatPercakapan)) riwayatPercakapan = [];
      } catch (e) {
        riwayatPercakapan = [];
      }
    }

    // Tambahkan pesan user baru ke riwayat
    riwayatPercakapan.push({ role: "user", content: text });

    // Batasi riwayat (User + Assistant)
    if (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
      riwayatPercakapan = riwayatPercakapan.slice(-MAX_HISTORY_LENGTH * 2);
    }

    // Gabungkan System Prompt + Riwayat Percakapan
    const messages = [
      { role: "system", content: systemPrompt },
      ...riwayatPercakapan
    ];

    // Panggil Cloudflare API
    const data = await callCloudflareAPI(messages);

    // Ambil hasil respons (Mendukung format 'choices' atau 'response')
    let hasil = (
      data?.result?.choices?.[0]?.message?.content || 
      data?.result?.response || 
      ''
    ).trim();

    if (!hasil) {
      hasil = `❌ Tidak ada respons teks dari model.\n\nLog:\n${JSON.stringify(data, null, 2)}`;
    }

    // Simpan riwayat jika berhasil mendapatkan respons
    if (!hasil.startsWith('❌')) {
      riwayatPercakapan.push({ role: "assistant", content: hasil });
      const encoded = Buffer.from(JSON.stringify(riwayatPercakapan)).toString('base64');
      fs.writeFileSync(sesiFile, encoded);
    }

    // Kirim balasan ke user
    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 800);

  } catch (err) {
    console.error('Handler error:', err);
    m.reply(`❌ Error terjadi:\n\n${err.message || String(err)}`);
  }
};

handler.command = handler.help = ['cfai', 'cloudflareai'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;