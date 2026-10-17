const https = require('https');
const fs = require('fs');

// ================= KONFIGURASI API =================
const API_URL = 'api.hcnsec.cn';
const API_KEY = 'ISI_API_KEY_DISINI';
const MODEL_ID = 'MiniMax-M3'; 

const sesiFolder = 'sesi';
if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const MAX_HISTORY_LENGTH = 5; 

// ================= FUNGSI FETCH =================
function fetchAIResponse(messages) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL_ID,
            messages: messages,
            temperature: 0.5
        });

        const options = {
            hostname: API_URL,
            port: 443,
            path: '/v1/chat/completions', // Path disesuaikan dengan API hcnsec
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(parsed.error.message));
                    } else if (parsed.choices && parsed.choices.length > 0) {
                        resolve(parsed.choices[0].message.content);
                    } else {
                        reject(new Error("Format respons API tidak dikenali."));
                    }
                } catch (e) {
                    reject(new Error("Gagal membaca respons dari API."));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

// ================= HANDLER BOT =================
const handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Masukkan pertanyaan yang ingin didiskusikan!');

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;
    const sesiFile = `${sesiFolder}/${who}-minimax.json`; // Nama file disesuaikan

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

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

    // Menggabungkan identitas CraXID Project dengan pengenalan nama user
    const systemInstruction = `Kamu adalah "", asisten AI yang ramah dan cerdas. Tugas Kamu adalah merespons percakapan secara natural layaknya manusia. Pengguna yang sedang berbicara denganmu adalah ${nama}.`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...riwayatPercakapan
    ];

    const hasil = await fetchAIResponse(messages);

    riwayatPercakapan.push({ role: "assistant", content: hasil.trim() });

    fs.writeFileSync(sesiFile, JSON.stringify(riwayatPercakapan, null, 2));

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil.trim());
    }, 2000);
    
  } catch (err) {
    console.error(err);
    m.reply(`❌ Error:\n\n${err.message}`);
  }
};

handler.command = handler.help = ['minimax'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;
handler.premium = false;

module.exports = handler;