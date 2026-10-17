const mfree = 50000;
const mprem = 2000000;
const lfree = 50;
const lprem = 2000;

const events = [
    { 
        code: 'jumatberkah', 
        check: (now) => now.getDay() === 5, 
        key: 'lastredeem', 
        multiplier: 1, 
        message: '🎁 *JUMAT BERKAH*\n\nSemoga hari Jumat ini penuh keberkahan dan rezeki dilipatgandakan.', 
        failMsg: '🎁 *Redeem Jumat Berkah hanya bisa dilakukan pada hari Jumat*', 
        repeatMsg: (waktu) => `🎁 *Kamu sudah klaim hari ini.*\nCoba lagi dalam: ${waktu}` 
    },
    { 
        code: 'natal2025', 
        check: (now) => now.getMonth() === 11 && now.getDate() === 25, 
        key: 'lastredeem_natal', 
        multiplier: 2, 
        message: '🎄 *SELAMAT NATAL*', 
        failMsg: '🎄 *Kode redeem ini hanya bisa diklaim tanggal 25 Desember*', 
        repeatMsg: () => '🎄 *Kamu sudah klaim kode ini!*' 
    },
    { 
        code: 'newyear2026', 
        check: (now) => now.getMonth() === 0 && now.getDate() === 1, 
        key: 'lastredeem_newyear', 
        multiplier: 3, 
        message: '🎆 *SELAMAT TAHUN BARU*', 
        failMsg: '🎆 *Kode redeem ini hanya bisa diklaim tanggal 1 Januari*', 
        repeatMsg: () => '🎆 *Kamu sudah klaim kode ini*' 
    },
    { 
        code: 'imlek2026', 
        check: (now) => now.getMonth() === 1 && now.getDate() === 17, 
        key: 'lastredeem_imlek', 
        multiplier: 3, 
        message: '🧧 *GONG XI FA CAI*', 
        failMsg: '🧧 *Kode redeem ini hanya bisa diklaim tanggal 17 Februari*', 
        repeatMsg: () => '🧧 *Kamu sudah klaim kode ini!*' 
    },
    { 
        code: 'idulfitri2026', 
        check: (now) => now.getMonth() === 2 && now.getDate() === 21, 
        key: 'lastredeem_idulfitri', 
        multiplier: 4, 
        message: '🌙 *SELAMAT IDULFITRI*', 
        failMsg: '🌙 *Kode redeem ini hanya bisa diklaim tanggal 21 Maret*', 
        repeatMsg: () => '🌙 *Kamu sudah klaim kode ini*' 
    },
    { 
        code: 'hut-ke81ri', 
        check: (now) => now.getMonth() === 7 && now.getDate() === 17, 
        key: 'lastredeem_merdeka81', 
        customMoney: 170845, // Reward tema kemerdekaan (17 Agustus 1945)
        customLimit: 1945,     // Limit tema kemerdekaan (1945)
        message: '🇮🇩 *DIRGAHAYU REPUBLIK INDONESIA KE-81*\n\nIni hadiah spesial buat kamu.', 
        failMsg: '🇮🇩 *Kode ini hanya bisa diklaim pada tanggal 17 Agustus*', 
        repeatMsg: () => '🇮🇩 *Kamu sudah klaim hadiah kemerdekaan ini!*' 
    }
];

let handler = async (m, { conn, isPrems }) => {
    let text = m.text.split(' ')[1];
    if (!text) return m.reply('Masukkan kodenya!');
  
    let now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    let inputCode = text.toLowerCase();
    let user = global.db.data.users[m.sender];
    let jid = m.sender.split('@')[0];

    // 1. event dulu (kode musiman kayak jumatberkah, natal, dll)
    let event = events.find(e => e.code === inputCode);
    if (event) {
        if (!event.check(now)) return m.reply(event.failMsg);
        
        let lastRedeem = user[event.key] || 0;
        let todayMidnight = new Date(now).setHours(0, 0, 0, 0);
        
        if (lastRedeem >= todayMidnight) {
            return m.reply(event.code === 'jumatberkah' ? event.repeatMsg(msToTime(new Date(todayMidnight + 86400000) - now)) : event.repeatMsg());
        }

        // kalo ada customMoney/customLimit pake itu, kalo gak ya pake multiplier
        let money = event.customMoney ? event.customMoney : (isPrems ? mprem * event.multiplier : mfree * event.multiplier);
        let limit = event.customLimit ? event.customLimit : (isPrems ? lprem * event.multiplier : lfree * event.multiplier);
        
        user.money += money; 
        user.limit += limit; 
        user[event.key] = now.getTime();
        
        return m.reply(`${event.message}\n\n💰 *Money*: ${money}\n🎫 *Limit*: ${limit}`);
    }

    // 2. kode premium / money dari database (dibuat via setredeem)
    let redeemDb = global.db.data.redeem || {};
    let allCodes = Object.keys(redeemDb);

    // cari kode yg cocok, huruf besar kecil gak masalah
    let foundKey = allCodes.find(key => key.toLowerCase() === inputCode);

    if (foundKey) {
        let rd = redeemDb[foundKey];
        if (rd.users.length >= rd.quota) return m.reply('❌ Kamu telat nih kuotanya udah habis');
        if (rd.users.includes(m.sender)) return m.reply('❌ Kamu sudah klaim kode ini!');

        // kalo tipenya money, langsung kasih reward yg ada aja
        if (rd.type === 'money') {
            let dapet = [];
            if ((rd.money || 0) > 0) { user.money += rd.money; dapet.push(`+ Rp ${rd.money.toLocaleString('id-ID')} money`); }
            if ((rd.limit || 0) > 0) { user.limit += rd.limit; dapet.push(`+ ${rd.limit.toLocaleString('id-ID')} limit`); }
            rd.users.push(m.sender);

            return m.reply(`💰 *Redeem berhasil!*\n\n${dapet.join('\n')}\nKuota: ${rd.users.length}/${rd.quota}`);
        }

        // sisanya tipe premium
        if (user.premium && user.premiumTime > now.getTime()) return m.reply('❌ Premium kamu masih jalan, tunggu habis dulu baru klaim lagi!');

        let durasiMs = rd.duration * 86400000;
        user.premium = true;
        user.premiumTime = now.getTime() + durasiMs;
        rd.users.push(m.sender);

        if (!global.prems.includes(jid)) global.prems.push(jid);

        return m.reply(`✨ *Premium aktif!*\n\n${rd.duration} hari, sampai ${new Date(user.premiumTime).toLocaleString('id-ID')} WIB\nKuota: ${rd.users.length}/${rd.quota}`);
    }

    return m.reply(`❌ Kodenya salah.\n\nCek list kode: .cekredeem`);
};

handler.help = ['redeem'];
handler.tags = ['main'];
handler.command = ['redeem'];
handler.register = true;

module.exports = handler;

function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60), 
        minutes = Math.floor((duration / (1000 * 60)) % 60), 
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24), 
        days = Math.floor((duration / (1000 * 60 * 60 * 24)));
    return `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
}
