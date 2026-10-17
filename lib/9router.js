const axios = require('axios');
const fs = require('fs');

const routerUrl = 'https://api.hxa.my.id/v1/chat/completions';
const apiKey = global.ninrut
//const apiKey = 'ISI_API_KEY_DISINI'; // diisi via env
const sesiFolder = 'sesi';

if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const MAX_HISTORY_LENGTH = 5; 

async function chatAI({ senderId, senderName, text, model, aiName, sesiPrefix }) {
  const sesiFile = `${sesiFolder}/${senderId}-${sesiPrefix}.json`;
  let riwayatPercakapan = [];
  
  if (fs.existsSync(sesiFile)) {
    const raw = fs.readFileSync(sesiFile, 'utf8');
    riwayatPercakapan = JSON.parse(raw);
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

  const response = await axios.post(routerUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}` // Menggunakan variabel apiKey
    }
  });

  const hasil = response.data.choices[0].message.content;

  riwayatPercakapan.push({ role: "assistant", content: hasil.trim() });
  fs.writeFileSync(sesiFile, JSON.stringify(riwayatPercakapan, null, 2));

  return hasil.trim();
}

module.exports = { chatAI };
