const axios = require('axios');
const fs = require('fs');
const path = require('path');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Ada yang bisa saya bantu?');
  
  // Pengecekan keamanan: memastikan API Key di config.js sudah terbaca
  if (!global.or) {
      return m.reply('❌ Sistem mendeteksi API Key belum terpasang.');
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

    // 1. Memanggil API Key dari config.js (global.or)
    const apiKey = global.or; 
    const endpoint = 'https://opencode.ai/zen/v1/chat/completions';
    
    // 2. Ekstrak Nomor WhatsApp Pengirim (Tanpa @s.whatsapp.net)
    const who = m.sender.split('@')[0];
    
    // 3. Konfigurasi Folder & File Sesi
    const sessionDir = path.join(process.cwd(), 'sesi'); 
    
    // Membuat folder 'sesi' otomatis jika belum ada
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Nama file menyesuaikan format: nomor-ox.json
    const sessionFile = path.join(sessionDir, `${who}-ox.json`);

    // 4. Baca Riwayat Chat Lama (Mengingat konteks)
    let messages = [];
    if (fs.existsSync(sessionFile)) {
        const rawData = fs.readFileSync(sessionFile, 'utf-8');
        messages = JSON.parse(rawData);
    } else {
        // System prompt awal jika belum pernah chat
        messages.push({ 
            role: "system", 
            content: "You are a helpful and friendly AI assistant." 
        });
    }

    // 5. Masukkan Pesan Baru User
    messages.push({ role: "user", content: text });

    // 6. Request ke API OpenCode
    const payload = {
        model: "x-preview-f-free",
        messages: messages
    };

    const response = await axios.post(endpoint, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });

    const hasil = response.data.choices[0].message.content;

    // 7. Simpan Balasan AI ke File Sesi JSON
    messages.push({ role: "assistant", content: hasil });
    fs.writeFileSync(sessionFile, JSON.stringify(messages, null, 2));

    // 8. Kirim Pesan ke Pengguna
    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 1500);
    
  } catch (err) {
    console.error('OpenCode AI Error:', err.response?.data || err.message);
    m.reply(`❌ Error: ${err.response?.data?.error?.message || err.message}`);
  }
};

handler.command = handler.help = ['ox', 'oxalpha']; 
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;