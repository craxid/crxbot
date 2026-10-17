let handler = async (m, { conn, text, usedPrefix, command }) => {
    global.db.data.redeem = global.db.data.redeem || {};

    // --bc buat broadcast, --money reward money, --limit reward limit
    // boleh digabung: --money --limit
    let isBroadcast = text.includes('--bc');
    let isMoney = text.includes('--money');
    let isLimit = text.includes('--limit');
    // buang flag biar gak ngerusuhin argumen
    let cleanText = text.replace('--bc', '').replace('--money', '').replace('--limit', '').trim();

    let args = cleanText.split(/\s+/).filter(a => a.length);
    let code, type, duration, money = 0, limit = 0, quota;

    let acak = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    if (isMoney || isLimit) {
        // urutan angka: money dulu baru limit, paling belakang kuota
        // .setredeem KODE 500000 50 --money
        // .setredeem KODE 100 50 --limit
        // .setredeem KODE 500000 100 50 --money --limit
        // kode acak: buang aja KODE-nya
        let need = (isMoney ? 1 : 0) + (isLimit ? 1 : 0);
        let angka;

        if (args.length && args.every(a => !isNaN(a)) && args.length === need + 1) {
            code = acak();
            angka = args;
        } else if (args.length === need + 2 && args.slice(1).every(a => !isNaN(a))) {
            code = args[0];
            angka = args.slice(1);
        } else {
            return m.reply(`Formatnya salah.

*Money aja:*
${usedPrefix + command} [kode] [money] [kuota] --money
cth: \`${usedPrefix + command} THR500 500000 50 --money\`

*Limit aja:*
${usedPrefix + command} [kode] [limit] [kuota] --limit
cth: \`${usedPrefix + command} LMT100 100 50 --limit\`

*Dua-duanya:*
${usedPrefix + command} [kode] [money] [limit] [kuota] --money --limit
cth: \`${usedPrefix + command} THR500 500000 100 50 --money --limit\`

*Kode acak:* buang aja [kode]-nya
*Broadcast:* tambah --bc di belakang`);
        }

        let i = 0;
        if (isMoney) money = parseInt(angka[i++]);
        if (isLimit) limit = parseInt(angka[i++]);
        quota = parseInt(angka[i]);

        if (isNaN(quota) || quota <= 0 || (isMoney && !(money > 0)) || (isLimit && !(limit > 0))) {
            return m.reply('Angkanya dicek lagi, money/limit/kuota harus angka lebih dari 0.');
        }
        type = 'money';
    } else {
        // tipe premium, kayak biasa
        // manual: .setredeem FREEPREM 7 100
        // otomatis: .setredeem 30 5
        if (args.length === 2 && !isNaN(args[0]) && !isNaN(args[1])) {
            code = acak();
            duration = parseInt(args[0]);
            quota = parseInt(args[1]);
        } else if (args.length >= 3) {
            code = args[0];
            duration = parseInt(args[1]);
            quota = parseInt(args[2]);
        } else {
            return m.reply(`Formatnya salah.

*Premium:*
${usedPrefix + command} [kode] [hari] [kuota]
cth: \`${usedPrefix + command} FREEPREM 7 100\`

*Kode acak:*
${usedPrefix + command} [hari] [kuota]

*Money:* tambah --money di belakang
cth: \`${usedPrefix + command} THR500 500000 50 --money\`

*Limit:* tambah --limit di belakang
cth: \`${usedPrefix + command} LMT100 100 50 --limit\`

*Broadcast* ke semua grup tambah --bc`);
        }

        if (isNaN(duration) || isNaN(quota)) {
            return m.reply("Durasi sama kuota harus angka.");
        }
        type = 'premium';
    }

    if (global.db.data.redeem[code]) {
        return m.reply(`Kode *${code}* udah kepake, ganti yang lain.`);
    }

    // simpen ke db
    if (type === 'money') {
        global.db.data.redeem[code] = { type, money, limit, quota, users: [] };
    } else {
        global.db.data.redeem[code] = { type, duration, quota, users: [] };
    }

    // detail reward ngikutin flag yg dipake
    let detail = [];
    if (money > 0) detail.push(`Money: Rp ${money.toLocaleString('id-ID')}`);
    if (limit > 0) detail.push(`Limit: ${limit.toLocaleString('id-ID')}`);
    if (type !== 'money') detail.push(`Durasi: ${duration} hari`);
    detail = detail.join('\n');

    let typeName = type === 'money'
        ? (money > 0 && limit > 0 ? 'Money/Limit' : money > 0 ? 'Money' : 'Limit')
        : 'Premium';

    let resultMsg = `*Kode redeem sudah jadi!*\n\nKode: \`${code}\`\nTipe: ${typeName}\n${detail}\nKuota: ${quota} user\n\nKlaim: ${usedPrefix}redeem ${code}`;

    // kasih tau owner
    await m.reply(resultMsg);

    // broadcast manual ke semua grup
    if (isBroadcast) {
        await m.reply(`Siap, broadcast ke semua grup...`);

        let getGroups = await conn.groupFetchAllParticipating();
        let groups = Object.values(getGroups);
        const delay = time => new Promise(res => setTimeout(res, time));

        for (let group of groups) {
            await delay(1000);
            let participants = group.participants.map(u => u.id);

            let bcText = `📢 *[ BROADCAST ]*\n\n*Ada kode redeem baru nih!*\n\nKode: \`${code}\`\nTipe: ${typeName}\n${detail}\nKuota: ${quota} user\n\nKetik *${usedPrefix}redeem ${code}* buat klaim`;

            // kirim per grup pake sendMessage, sekalian kasih label diteruskan berkali-kali
            await conn.sendMessage(group.id, {
                text: bcText,
                mentions: participants,
                contextInfo: {
                    forwardingScore: 9999,
                    isForwarded: true
                }
            }).catch(_ => _);
        }
        m.reply(`Broadcast selesai!`);
    }
};

handler.help = ['setredeem'];
handler.tags = ['owner'];
handler.command = /^(setredeem)$/i;
handler.owner = true;

module.exports = handler;
