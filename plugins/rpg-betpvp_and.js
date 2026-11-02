const delay = (time) => new Promise((res) => setTimeout(res, time));

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports.before = async function (m) {
    this.judipvp = this.judipvp ? this.judipvp : {};
    let room = Object.values(this.judipvp).find(room => room.id.startsWith('judipvp') && room.status && [room.p, room.p2].includes(m.sender));
    let user = db.data.users;
    let score = Math.ceil(Math.random() * 100) * 1;
    let score2 = Math.ceil(Math.random() * 100) * 1;

    if (room) {
        let txt = (m.text || '').toLowerCase();
        // fase 1: lawan jawab terima atau tolak (yg dulu tombol N-nya gak pernah jalan, sekarang dibetulin)
        if (m.sender === room.p2 && m.isGroup && room.status === 'wait') {
            if (/\b(n(o)?|tidak|tolak)\b/i.test(txt)) {
                clearTimeout(room.waktu);
                delete this.judipvp[room.id];
                return this.reply(m.chat, `❌ @${room.p2.split`@`[0]} menolak tantangan. Judipvp dibatalkan.`, m, { contextInfo: { mentionedJid: [room.p2] } });
            }
            if (/\b(y(a|es)?|ya|mau|setuju)\b/i.test(txt)) {
                if (user[room.p2][room.type] < room.taruhan) return m.reply(`❌ ${room.type} kamu kurang. Butuh ${room.taruhan} ${room.type} untuk ikut.`);
                if (user[room.p][room.type] < room.taruhan) return m.reply(`❌ ${room.type} lawan kurang. Dia butuh ${room.taruhan} ${room.type}.`);
                clearTimeout(room.waktu);
                room.status = 'spin';
                room.asal = m.chat;
                room.spin = room.p;
                await this.reply(room.asal, `🎰 Tantangan diterima!\n\nGiliran @${room.p.split('@')[0]} untuk spin.\nKetik *spin* untuk memutar.`, m, { contextInfo: { mentionedJid: [room.p] } });
                room.waktu = setTimeout(() => {
                    this.reply(m.chat, `⏰ Waktu habis! @${room.spin.split('@')[0]} tidak spin, judipvp dibatalkan.`, m, { contextInfo: { mentionedJid: [room.spin] } });
                    delete this.judipvp[room.id];
                }, 60000);
            }
            return true;
        } else if (room.status === 'spin' && /spin|judi/i.test(m.text)) {
            if (m.sender !== room.spin) return m.reply('❌ Sekarang bukan giliran kamu. Tunggu dulu.');
            if (user[room.spin][room.type] < room.taruhan) return m.reply(`❌ ${room.type} kamu kurang. Butuh ${room.taruhan} ${room.type} untuk ikut.`);
            if (user[room.p2][room.type] < room.taruhan) return m.reply(`❌ ${room.type} lawan kurang. Dia butuh ${room.taruhan} ${room.type}.`);
            clearTimeout(room.waktu);
            room.score = score;
            room.status = 'spinp';
            room.spin = room.p2;
            room.waktu = setTimeout(() => {
                this.reply(m.chat, `⏰ Waktu habis! @${room.spin.split('@')[0]} tidak spin, judipvp dibatalkan.`, m, { contextInfo: { mentionedJid: [room.spin] } });
                delete this.judipvp[room.id];
            }, 60000);
            this.reply(room.asal, `🎲 @${m.sender.split('@')[0]} dapat skor *${score}*!\n\nSekarang giliran @${room.p2.split('@')[0]} untuk spin.\nKetik *spin* untuk memutar.`, m, { contextInfo: { mentionedJid: [room.p, room.p2] } });
        } else if (room.status === 'spinp' && /spin|judi/i.test(m.text)) {
            if (m.sender !== room.spin) return m.reply(room.asal, '❌ Sekarang bukan giliran kamu. Tunggu dulu.', m);
            if (user[room.spin][room.type] < room.taruhan) return m.reply(`❌ ${room.type} kamu kurang. Butuh ${room.taruhan} ${room.type} untuk ikut.`);
            if (user[room.p][room.type] < room.taruhan) return m.reply(`❌ ${room.type} lawan kurang. Dia butuh ${room.taruhan} ${room.type}.`);
            clearTimeout(room.waktu);
            if (room.score < score2) {
                user[room.p2][room.type] += room.taruhan * 1;
                user[room.p][room.type] -= room.taruhan * 1;
                room.win = room.p2;
            } else if (room.score > score2) {
                user[room.p2][room.type] -= room.taruhan * 1;
                user[room.p][room.type] += room.taruhan * 1;
                room.win = room.p;
            } else {
                room.win = 'draw';
            }
            this.reply(room.asal, `
🎲 *HASIL JUDI PVP*

👤 @${room.p.split('@')[0]} : ${room.score} poin
👤 @${room.p2.split('@')[0]} : ${score2} poin

${room.win !== 'draw' ? `🏆 Pemenang: @${room.win.split('@')[0]}!\nDapat ${room.taruhan} ${room.type}.` : `🤝 Seri! Taruhan dikembalikan ke masing-masing.`}
`.trim(), m, { contextInfo: { mentionedJid: [room.p, room.p2] } });
            delete this.judipvp[room.id];
        }
        return true;
    }
    return true;
};
