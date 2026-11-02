const axios = require('axios');
const fs = require('fs');

// 9Router jalan lokal di VPS ini (127.0.0.1:20128), jadi ga perlu domain lagi
const routerUrl = 'http://127.0.0.1:20128/v1/chat/completions';
const apiKey = global.ninrut
const sesiFolder = 'sesi';

if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const MAX_HISTORY_LENGTH = 5;

async function chatAI({ senderId, senderName, text, model, aiName, sesiPrefix }) {
  const sesiFile = `${sesiFolder}/${senderId}-${sesiPrefix}.json`;
  let riwayatPercakapan = [];

  if (fs.existsSync(sesiFile)) {
    try {
      riwayatPercakapan = JSON.parse(fs.readFileSync(sesiFile, 'utf8'));
    } catch (e) {
      // file sesi rusak? reset aja daripada perintahnya error selamanya
      riwayatPercakapan = [];
    }
  }

  riwayatPercakapan.push({ role: "user", content: text });

  if (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
      while (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
          riwayatPercakapan.shift();
          riwayatPercakapan.shift();
      }
  }

  const systemInstruction = `You are ${aiName}
You respond clearly and concisely.
Your user is ${senderName}. Be respectful, professional, and informative in all responses.`;

  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemInstruction },
      ...riwayatPercakapan
    ]
  };

  let response;
  try {
    response = await axios.post(routerUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000 // router mikir kelamaan mending putus daripada perintah nyangkut
    });
  } catch (err) {
    const status = err?.response?.status;
    const pesanServer = err?.response?.data?.error?.message;
    if (pesanServer) throw new Error(pesanServer);
    if (err.code === 'ECONNABORTED') throw new Error('Router AI tidak merespons (timeout 120 detik). Coba lagi nanti ya.');
    if (status === 401) throw new Error('API key 9Router ditolak. Cek lagi global.ninrut di config.js.');
    if (err.code === 'ECONNREFUSED') throw new Error('9Router lokal tidak jalan. Cek proses PM2 bernama 9router.');
    throw new Error(`Router AI error${status ? ' (HTTP ' + status + ')' : ''}: ${err.message}`);
  }

  const hasil = response.data.choices[0].message.content;

  riwayatPercakapan.push({ role: "assistant", content: hasil.trim() });
  fs.writeFileSync(sesiFile, JSON.stringify(riwayatPercakapan, null, 2));

  return hasil.trim();
}

module.exports = { chatAI };
