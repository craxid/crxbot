const axios = require('axios');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    if (!text) {
        return m.reply(`*Format salah!*\nMasukkan nomor XL/AXIS yang ingin dicek kuotanya.\n\nContoh: ${usedPrefix}${command} 0878xxxxxxx`);
    }

    // Normalisasi nomor ke format 08
    let msisdn = text.replace(/[^0-9]/g, '');
    if (msisdn.startsWith('628')) {
        msisdn = '08' + msisdn.slice(3);
    }

    // Validasi dasar
    if (!msisdn.startsWith('08')) {
        return m.reply('❌ Nomor harus diawali dengan 08 atau 628.');
    }
    if (msisdn.length < 10 || msisdn.length > 15) {
        return m.reply('❌ Panjang nomor telepon tidak valid.');
    }

    // --- VALIDASI PREFIX XL & AXIS ---
    const prefix = msisdn.substring(0, 4);
    const listPrefix = [
        '0817', '0818', '0819', '0859', '0877', '0878', // XL
        '0831', '0832', '0833', '0838'                 // AXIS
    ];

    if (!listPrefix.includes(prefix)) {
        return m.reply(`❌ *Nomor Bukan XL/AXIS!*\n\nPrefix *${prefix}* tidak didukung. Gunakan nomor XL atau AXIS.`);
    }

    try {
        const apiUrl = `https://apigw.kmsp-store.com/sidompul/v4/cek_kuota?msisdn=${encodeURIComponent(msisdn)}&isJSON=true`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'Basic c2lkb21wdWxhcGk6YXBpZ3drbXNw',
                'X-API-Key': 'ISI_API_KEY_DISINI',
                'X-App-Version': '4.0.0'
            }
        });

        const data = response.data;

        if (data.status === false) {
            let errorMessage = data.message || (data.data && data.data.keteranganError) || 'Terjadi kesalahan dari server.';
            return m.reply(`❌ *Gagal Cek Kuota:*\n${errorMessage}`);
        } 
        
        if (data.status === true && data.data) {
            const sp = data.data.data_sp;

            // Jika API mengembalikan data_sp (JSON terstruktur), kita pakai ini agar rapi
            if (sp && sp.prefix) {
                let msg = `✅ *INFORMASI KARTU ${sp.prefix.value.toUpperCase()}*\n\n`;
                msg += `📱 *Nomor:* ${data.data.msisdn}\n`;
                msg += `🪪 *Status Dukcapil:* ${sp.dukcapil?.value || '-'}\n`;
                msg += `📶 *Status Jaringan:* ${sp.status_4g?.value || '-'}\n`;
                msg += `⏳ *Umur Kartu:* ${sp.active_card?.value || '-'}\n`;
                msg += `✅ *Masa Aktif:* ${sp.active_period?.value || '-'}\n`;
                msg += `⚠️ *Masa Tenggang:* ${sp.grace_period?.value || '-'}\n\n`;

                let quotas = sp.quotas?.value || [];
                // Flatten array jika strukturnya nested (contoh: [[{...}]])
                if (Array.isArray(quotas)) quotas = quotas.flat(); 

                if (quotas.length > 0) {
                    msg += `🌐 *DETAIL PAKET & KUOTA*\n`;
                    quotas.forEach((pkg) => {
                        msg += `===========================\n`;
                        msg += `🎁 *${pkg.packages?.name || 'Paket'}*\n`;
                        msg += `📅 Aktif s/d: ${pkg.packages?.expDate || '-'}\n\n`;

                        if (pkg.benefits && Array.isArray(pkg.benefits)) {
                            pkg.benefits.forEach((b) => {
                                msg += `🔹 *${b.bname}*\n`;
                                msg += `   ├ Tipe: ${b.type}\n`;
                                msg += `   ├ Total: ${b.quota}\n`;
                                msg += `   └ Sisa: *${b.remaining}*\n\n`;
                            });
                        }
                    });
                } else {
                    msg += `===========================\n_Tidak ada paket atau kuota aktif._\n`;
                }

                return m.reply(msg.trim());
            } 
            // Fallback (Cadangan): Jika data_sp kosong, baru kita bersihkan format HTML dari 'hasil'
            else {
                let hasilHtml = data.data.hasil || '';
                let hasilText = hasilHtml
                    .replace(/<br\s*\/?>/gi, '\n') // Ubah <br> jadi enter
                    .replace(/<[^>]+>/g, '')      // Hapus tag HTML lainnya
                    .replace(/📃\s*RESULT:\s*/gi, '') // Hapus teks emoji result
                    .trim();
                
                return m.reply(`✅ *SIDOMPUL*\n\n${hasilText}`);
            }
        }

    } catch (error) {
        console.error('Error Cek Kuota:', error);
        m.reply(`❌ *Terjadi Kesalahan!*\nTidak dapat terhubung ke server.\n\n_Log: ${error.message}_`);
    } finally {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    }
};

handler.help = ['sidompul <nomor>'];
handler.tags = ['internet'];
handler.command = ['sidompul','sidiva']; // Tambahan alias command
handler.register = true;
handler.limit = true;

module.exports = handler;