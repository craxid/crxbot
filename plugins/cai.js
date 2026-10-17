const https = require('https');
const fs = require('fs');

// ================= KONFIGURASI API =================
const API_URL = 'openrouter.ai';
// Pastikan variabel global API Anda sudah benar, menggunakan goapi atau ninrut
const API_KEY = 'ISI_API_KEY_DISINI'
const MODEL_ID = 'auto'; // Silakan ganti model sesuai keinginan

const sesiFolder = 'sesi';
const karakterFolder = 'karakter';

if (!fs.existsSync(sesiFolder)) fs.mkdirSync(sesiFolder);
if (!fs.existsSync(karakterFolder)) fs.mkdirSync(karakterFolder);

const MAX_HISTORY_LENGTH = 10; // Batas riwayat agar tidak boros limit token

// ================= FUNGSI FETCH OPENROUTER =================
function fetchAIResponse(messages) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL_ID,
            messages: messages,
            temperature: 0.7 // Sedikit dinaikkan agar AI roleplay lebih kreatif
        });

        const options = {
            hostname: API_URL,
            port: 443,
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://github.com/craxid',
                'X-OpenRouter-Title': 'CraXID Project',
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
                    } else {
                        resolve(parsed.choices[0].message.content);
                    }
                } catch (e) {
                    reject(new Error("Gagal membaca respons dari OpenRouter."));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

// ================= HANDLER BOT =================
const handler = async (m, { text, usedPrefix, command, conn }) => {
    
  // Fitur lihat karakter
  if (text?.toLowerCase().trim() === 'karakterku') {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const karakterFile = `${karakterFolder}/${who}-karakter.json`;

    if (!fs.existsSync(karakterFile)) {
      return m.reply(`❌ Kamu belum punya karakter. Buat dulu dengan:\n"${usedPrefix + command} ubah karakter [deskripsi]"`);
    }

    const rawKarakter = fs.readFileSync(karakterFile, 'utf8');
    const karakterDeskripsi = JSON.parse(rawKarakter);

    return m.reply(`👤 Karakter aktif kamu saat ini:\n\n"${karakterDeskripsi.deskripsi}"`);
  }
    
  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;
    const sesiFile = `${sesiFolder}/${who}-ai_chat.json`;
    const karakterFile = `${karakterFolder}/${who}-karakter.json`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

    // Logika ubah karakter
    let karakterDeskripsi;
    if (text?.toLowerCase().startsWith('ubah karakter')) {
      const deskripsiBaru = text.slice('ubah karakter'.length).trim();
      if (deskripsiBaru.length < 9) {
        return m.reply(`❗ Deskripsi karakter terlalu pendek. Contoh:\n"${usedPrefix + command} ubah karakter Tokai Teio dari Uma Musume, ceria, suka bercanda."`);
      }

      karakterDeskripsi = { deskripsi: deskripsiBaru };
      fs.writeFileSync(karakterFile, JSON.stringify(karakterDeskripsi, null, 2));
      
      // Reset riwayat chat jika karakter diubah agar AI tidak bingung
      if (fs.existsSync(sesiFile)) fs.unlinkSync(sesiFile);
      
      return await conn.sendMessage(m.chat, {
        text: `✅ Karakter berhasil diubah! Riwayat chat sebelumnya telah direset.\nSekarang AI akan berperan sebagai:\n\n"${deskripsiBaru}"`
      });
    } else {
      // Pengecekan karakter yang sudah ada
      if (!fs.existsSync(karakterFile)) {
        return m.reply(`👤 *@${m.name || m.sender.split('@')[0]}* Kamu belum mendefinisikan karakter AI-mu.\n\nUntuk membuat karakter, ketik:\n"${usedPrefix + command} ubah karakter Tokai Teio dari Uma Musume, ceria, suka bercanda."`);
      }
      const rawKarakter = fs.readFileSync(karakterFile, 'utf8');
      karakterDeskripsi = JSON.parse(rawKarakter);
    }

    // Jika pengguna hanya memanggil command tanpa teks (dan bukan sedang setup)
    if (!text) return m.reply(`Kirim pesan untuk ngobrol dengan karaktermu!\nContoh: *${usedPrefix + command} Halo, lagi ngapain?*`);

    // Load & Migrasi riwayat percakapan
    let riwayatPercakapan = [];
    if (fs.existsSync(sesiFile)) {
      const raw = fs.readFileSync(sesiFile, 'utf8');
      const parsedData = JSON.parse(raw);
      
      // Auto-migrate format Google GenAI ke OpenRouter/OpenAI format
      riwayatPercakapan = parsedData.map(msg => {
          if (msg.parts) {
              return {
                  role: msg.role === 'model' ? 'assistant' : 'user',
                  content: msg.parts[0].text
              };
          }
          return msg; // Jika sudah format OpenRouter
      });
    }

    // Push pesan baru dari user
    riwayatPercakapan.push({ role: "user", content: text });

    // Pangkas memori chat jika terlalu panjang
    if (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
        riwayatPercakapan = riwayatPercakapan.slice(-(MAX_HISTORY_LENGTH * 2));
    }

    const systemInstruction = `Kamu adalah ${karakterDeskripsi.deskripsi}.
Berperanlah sesuai karakter tersebut sepenuhnya, gunakan gaya bicara yang sesuai. 
Nama orang yang sedang berbicara denganmu adalah ${nama}.`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...riwayatPercakapan
    ];

    // Request ke OpenRouter
    const hasil = await fetchAIResponse(messages);

    // Push jawaban AI ke riwayat
    riwayatPercakapan.push({ role: "assistant", content: hasil.trim() });

    // Simpan format baru
    fs.writeFileSync(sesiFile, JSON.stringify(riwayatPercakapan, null, 2));

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil.trim());
    }, 2000);
    
  } catch (err) {
    console.error(err);
    m.reply(`❌ Error terjadi:\n\n${err.message}`);
  }
};

handler.command = handler.help = ['characterai', 'cai'];
handler.tags = ['ai', 'tools'];
handler.limit = 1;
handler.register = true;
handler.premium = false;

module.exports = handler;