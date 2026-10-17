let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    // Inisialisasi database khusus untuk event vote piala dunia
    global.db.data.wcvote = global.db.data.wcvote || {
        status: false,
        teamA: '',
        teamB: '',
        votersA: [],
        votersB: []
    };

    let vote = global.db.data.wcvote;
    let args = text.trim().split(/\s+/);
    let action = args[0]?.toLowerCase();

    // Pesan Panduan (Help Menu)
    const helpMessage = `
*🏆 VOTING FINAL PIALA DUNIA 🏆*

*── 「 COMMANDS OWNER 」 ──*
◦ *${usedPrefix + command} start [Tim1] [Tim2]*
  (Mulai sesi voting baru)
◦ *${usedPrefix + command} end [TimPemenang]*
  (Tutup vote & bagikan hadiah 50Jt Money + 50k Limit)

*── 「 COMMANDS USER 」 ──*
◦ *${usedPrefix + command} vote [NamaTim]*
  (Pilih jagoanmu! Pilihan tidak bisa diubah)
◦ *${usedPrefix + command} status*
  (Cek perolehan suara sementara)
    `.trim();

    if (!action) return m.reply(helpMessage);

    // ==========================================
    // 1. MULAI VOTING (HANYA OWNER)
    // ==========================================
    if (action === 'start') {
        if (!isOwner) return m.reply('❌ Maaf, hanya Owner yang bisa memulai sesi voting!');
        if (vote.status) return m.reply('⚠️ Masih ada sesi voting yang belum diselesaikan! Gunakan perintah *end* terlebih dahulu.');
        if (args.length < 3) return m.reply(`*Format Salah!*\nContoh: \`${usedPrefix + command} start Argentina Spanyol\``);

        vote.status = true;
        vote.teamA = args[1].toUpperCase();
        vote.teamB = args[2].toUpperCase();
        vote.votersA = [];
        vote.votersB = [];

        let startMsg = `
*📢 VOTING FINAL PIALA DUNIA DIMULAI!*

Tim yang bertanding:
⚽ *${vote.teamA}*  VS  *${vote.teamB}* ⚽

Ketik:
*${usedPrefix + command} vote ${vote.teamA}*
Atau
*${usedPrefix + command} vote ${vote.teamB}*

*🎁 REWARD BAGI YANG MENEBAK BENAR:*
💰 50.000.000 Money
🎫 50.000 Limit
        `.trim();

        return m.reply(startMsg);
    }

    // ==========================================
    // 2. MELAKUKAN VOTING (SEMUA USER)
    // ==========================================
    if (action === 'vote') {
        if (!vote.status) return m.reply('❌ Tidak ada event voting piala dunia yang sedang berlangsung.');
        
        let pilihan = args[1]?.toUpperCase();
        if (!pilihan) return m.reply(`Pilih tim jagoanmu!\nContoh: \`${usedPrefix + command} vote ${vote.teamA}\``);
        
        let sender = m.sender;

        // Cek jika user belum terdaftar di database utama
        global.db.data.users[sender] = global.db.data.users[sender] || { money: 0, limit: 0 };

        // Cegah pemilih ganda
        if (vote.votersA.includes(sender) || vote.votersB.includes(sender)) {
            return m.reply('⚠️ Kamu sudah memvoting sebelumnya! Pilihan tidak bisa diganti.');
        }

        // Proses input suara
        if (pilihan === vote.teamA) {
            vote.votersA.push(sender);
            return m.reply(`✅ Berhasil memberikan dukungan untuk tim *${vote.teamA}*!`);
        } else if (pilihan === vote.teamB) {
            vote.votersB.push(sender);
            return m.reply(`✅ Berhasil memberikan dukungan untuk tim *${vote.teamB}*!`);
        } else {
            return m.reply(`❌ Pilihan tidak valid! Pastikan penulisan nama tim benar.\nPilihan tersedia: *${vote.teamA}* atau *${vote.teamB}*.`);
        }
    }

    // ==========================================
    // 3. CEK STATUS VOTING (SEMUA USER)
    // ==========================================
    if (action === 'status') {
        if (!vote.status) return m.reply('❌ Tidak ada event voting piala dunia yang sedang berlangsung.');
        
        let statusMsg = `
*📊 STATUS VOTING SEMENTARA*

⚽ *${vote.teamA}:* ${vote.votersA.length} Suara
⚽ *${vote.teamB}:* ${vote.votersB.length} Suara

Total Pemilih Sementara: ${vote.votersA.length + vote.votersB.length} Orang.
        `.trim();
        return m.reply(statusMsg);
    }

    // ==========================================
    // 4. TUTUP VOTE & BAGI HADIAH (HANYA OWNER)
    // ==========================================
    if (action === 'end') {
        if (!isOwner) return m.reply('❌ Maaf, hanya Owner yang bisa menutup sesi voting!');
        if (!vote.status) return m.reply('❌ Tidak ada event voting yang sedang berlangsung.');
        
        let pemenang = args[1]?.toUpperCase();
        if (!pemenang) return m.reply(`Pilih tim pemenang!\nContoh: \`${usedPrefix + command} end ${vote.teamA}\``);

        let winners = [];
        if (pemenang === vote.teamA) {
            winners = vote.votersA;
        } else if (pemenang === vote.teamB) {
            winners = vote.votersB;
        } else {
            return m.reply(`❌ Tim pemenang tidak valid!\nPilihan yang tersedia adalah *${vote.teamA}* atau *${vote.teamB}*.`);
        }

        // Proses pembagian hadiah 
        let hadiahMoney = 50000000;
        let hadiahLimit = 50000;

        for (let user of winners) {
            // Pastikan data user ada sebelum diisi hadiah
            if (global.db.data.users[user]) {
                global.db.data.users[user].money += hadiahMoney;
                global.db.data.users[user].limit += hadiahLimit;
            }
        }

        let endMsg = `
*🎊 EVENT VOTING PIALA DUNIA BERAKHIR 🎊*

Juara Piala Dunia: *${pemenang}* 🏆

Selamat kepada *${winners.length}* orang yang berhasil menebak dengan benar!
Hadiah kemenangan:
💰 ${hadiahMoney.toLocaleString('id-ID')} Money
🎫 ${hadiahLimit.toLocaleString('id-ID')} Limit

_Hadiah telah dikirimkan secara otomatis ke akun masing-masing pemenang! Cek menggunakan perintah ${ usedPrefix }profil atau ${ usedPrefix }balance_
        `.trim();

        // Reset status database agar siap digunakan untuk voting berikutnya
        vote.status = false;
        vote.teamA = '';
        vote.teamB = '';
        vote.votersA = [];
        vote.votersB = [];

        return m.reply(endMsg);
    }
    
    // Jika command tidak sesuai argumen action yang terdaftar
    return m.reply(helpMessage);
};

handler.help = ['wcvote'];
handler.tags = ['game']; // Dihapus tag 'owner' agar tampil di menu game user biasa
handler.command = /^(wcvote|votewc)$/i;

module.exports = handler;