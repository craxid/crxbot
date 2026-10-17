let handler = async (m, { conn, text, isOwner }) => {
    if (!text) return m.reply('_Masukkan Nama Grup!_');

    try {
        m.reply('Tunggu Bentar. JANGAN SPAM!');
        
        // 1. Buat grup dan masukkan bot beserta user peminta
        let group = await conn.groupCreate(text, [m.sender]);

        // 2. Beri jeda 2 detik agar server WhatsApp selesai memproses grup baru
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Force-add user (berjaga-jaga jika terlewat saat groupCreate)
        await conn.groupParticipantsUpdate(group.id, [m.sender], 'add').catch(console.error);

        // 4. Jadikan user peminta sebagai admin
        await conn.groupParticipantsUpdate(group.id, [m.sender], 'promote').catch(console.error);

        // 5. Kirim konfirmasi ke chat (Tanpa link agar tidak jadi card undangan)
        m.reply(`_Berhasil Membuat Grup *${text}*_\n\n*ID Grup:* ${group.id}\n\n✅ *Sukses!* Silakan cek daftar chat kamu. Kamu sudah otomatis dimasukkan dan dijadikan Admin oleh bot.`);

    } catch (e) {
        // Blok ini untuk format .creategc NamaGrup | @tagmember
        let [namagc, partici] = text.split('|');
        if (!namagc) throw 'Format Salah! Gunakan: .creategc NamaGrup';
        if (!partici) throw 'Tag user sebagai member baru!';

        let mem = conn.parseMention(`@${parseInt(m.sender)} ${partici}`);
        let ha = await conn.groupCreate(namagc, mem).catch(console.error);

        if (!ha) return m.reply('Gagal membuat grup. Pastikan nomor bot tidak dibatasi oleh WhatsApp.');

        // Jeda 2 detik
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Force add & promote peminta
        await conn.groupParticipantsUpdate(ha.id, [m.sender], 'add').catch(console.error);
        await conn.groupParticipantsUpdate(ha.id, [m.sender], 'promote').catch(console.error);

        let senderName = m.sender.split('@')[0];
        await m.reply(`*GROUP CREATE*\n\n\`\`\`Grup Telah Dibuat oleh @${senderName}\`\`\`\n\n✅ Cek daftar chat kamu, kamu sudah otomatis jadi Admin!`);

        // Bot keluar jika yang minta bukan owner
        if (!isOwner) {
            await conn.groupLeave(ha.id);
        }
    }
};

handler.help = ['creategroup'];
handler.tags = ['owner'];
handler.command = /^((create|buat)(gc|grup|group))$/i;
handler.owner = false;
handler.group = false;
handler.premium = false;

module.exports = handler;