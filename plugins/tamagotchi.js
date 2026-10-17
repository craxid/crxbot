let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    if (!user) throw '❌ Kamu belum terdaftar di database pemain!'

    const tag = `@${m.sender.replace(/@.+/, '')}`  

    // Pastikan variabel makananpet ada dan berformat angka
    if (typeof user.makananpet === 'undefined') user.makananpet = 0;
    user.makananpet = parseInt(user.makananpet) || 0; 

    // Inisialisasi penyimpan timer di session (Mencegah spam timer ganda)
    if (!conn.tgTimers) conn.tgTimers = {}
    if (!conn.tgTimers[m.sender]) conn.tgTimers[m.sender] = {}

    // Inisialisasi object tamagotchi di database user  
    if (!user.tamagotchi) {  
        user.tamagotchi = {  
            name: '',  
            health: 100,  
            hunger: 100,  
            energy: 100,  
            happiness: 100,  
            level: 1,  
            exp: 0,  
            lastUpdate: 0,  
            isDead: false  
        }  
    }  

    let tg = user.tamagotchi  
      
    // Patch darurat (buat nge-update data lama)  
    if (typeof tg.level === 'undefined') tg.level = 1;  
    if (typeof tg.exp === 'undefined') tg.exp = 0;  

    let action = args[0] ? args[0].toLowerCase() : ''  
    let petNameInput = args.slice(1).join(' ')  

    // 🌟 BATAS MAKSIMAL STATUS  
    let maxStat = 100 + ((tg.level - 1) * 10)  

    // 🌟 FUNGSI PROGRESS BAR  
    const renderBar = (value) => {  
        let length = 10;  
        let filled = Math.round((value / maxStat) * length);  
        if (filled > length) filled = length;  
        let empty = Math.max(0, length - filled);  
        return '█'.repeat(filled) + '░'.repeat(empty);  
    }  

    // 🌟 FUNGSI DECAY & AUTO-HEAL 
    const updateStats = () => {  
        if (tg.isDead || tg.name === '') return;  

        let now = Date.now()  
        let elapsed = now - tg.lastUpdate;  
        let hoursPassed = elapsed / (1000 * 60 * 60);  

        if (hoursPassed >= 0.1) {  
            tg.hunger = Math.max(0, Math.floor(tg.hunger - (10 * hoursPassed)))  
            tg.energy = Math.max(0, Math.floor(tg.energy - (5 * hoursPassed)))  
            tg.happiness = Math.max(0, Math.floor(tg.happiness - (10 * hoursPassed)))  
              
            let laparDarurat = Math.floor(maxStat * 0.2);   
            if (tg.hunger < laparDarurat) {  
                tg.health = Math.max(0, Math.floor(tg.health - (15 * hoursPassed)))  
            } else {
                tg.health = Math.min(maxStat, Math.floor(tg.health + (10 * hoursPassed)))
            }

            if (tg.health <= 0) {  
                tg.health = 0  
                tg.isDead = true  
            }  
              
            tg.lastUpdate = now  
        }  
    }  

    // 🌟 FUNGSI SET NOTIFIKASI PINTAR
    const setPetTimers = () => {
        if (tg.isDead || tg.name === '') return;

        let laparDarurat = Math.floor(maxStat * 0.2);
        let lelahDarurat = Math.floor(maxStat * 0.2);
        let sedihDarurat = Math.floor(maxStat * 0.2);

        for (let key in conn.tgTimers[m.sender]) {
            clearTimeout(conn.tgTimers[m.sender][key]);
        }
        conn.tgTimers[m.sender] = {};

        let timeToLapar = -1;
        if (tg.hunger > laparDarurat) {
            let hoursToLapar = (tg.hunger - laparDarurat) / 10;
            timeToLapar = hoursToLapar * 60 * 60 * 1000;
            conn.tgTimers[m.sender].lapar = setTimeout(() => {
                conn.reply(m.chat, `🔔 *[ SYSTEM ALERT ]*\nTamer ${tag}, *${tg.name}* sedang kelaparan (Hunger Drop)! Berikan 🥫 *Pet Food* segera sebelum HP-nya berkurang.\n\nCommand: *${usedPrefix + command} feed*`, m, { mentions: [m.sender] });
            }, timeToLapar);
        }

        if (tg.energy > lelahDarurat) {
            let hoursToLelah = (tg.energy - lelahDarurat) / 5;
            let timeToLelah = hoursToLelah * 60 * 60 * 1000;
            conn.tgTimers[m.sender].lelah = setTimeout(() => {
                conn.reply(m.chat, `💤 *[ SYSTEM ALERT ]*\nTamer ${tag}, Energy *${tg.name}* sudah sangat rendah. Kirim dia ke mode istirahat!\n\nCommand: *${usedPrefix + command} sleep*`, m, { mentions: [m.sender] });
            }, timeToLelah);
        }

        if (tg.happiness > sedihDarurat) {
            let hoursToSedih = (tg.happiness - sedihDarurat) / 10;
            let timeToSedih = hoursToSedih * 60 * 60 * 1000;
            conn.tgTimers[m.sender].sedih = setTimeout(() => {
                conn.reply(m.chat, `🎭 *[ SYSTEM ALERT ]*\nTamer ${tag}, *${tg.name}* merasa diabaikan (Happiness Drop). Ajak main untuk menaikkan mood-nya!\n\nCommand: *${usedPrefix + command} play*`, m, { mentions: [m.sender] });
            }, timeToSedih);
        }

        if (tg.health < maxStat && tg.hunger >= laparDarurat) {
            let hoursToFullHP = (maxStat - tg.health) / 10;
            let timeToFullHP = hoursToFullHP * 60 * 60 * 1000;
            
            if (timeToLapar === -1 || timeToFullHP <= timeToLapar) {
                conn.tgTimers[m.sender].sembuh = setTimeout(() => {
                    conn.reply(m.chat, `💖 *[ SYSTEM ALERT ]*\nTamer ${tag}, Health (HP) *${tg.name}* telah pulih 100% (Max)!\n\nCommand: *${usedPrefix + command} status*`, m, { mentions: [m.sender] });
                }, timeToFullHP);
            }
        }
    };

    // 🌟 FUNGSI CEK NAIK LEVEL  
    const checkLevelUp = () => {  
        let expNeeded = tg.level * 100;  
        let isLevelUp = false;  
          
        while (tg.exp >= expNeeded) {  
            tg.level++;  
            tg.exp -= expNeeded;  
            expNeeded = tg.level * 100;  
            isLevelUp = true;  
        }  

        if (isLevelUp) {  
            maxStat = 100 + ((tg.level - 1) * 10);  
            tg.health = maxStat;  
            tg.hunger = maxStat;  
            tg.energy = maxStat;  
            tg.happiness = maxStat;  
        }  
        return isLevelUp;  
    }  

    updateStats()  

    // 1. Aksi: Adopsi Pet Baru  
    if (action === 'adopt') {  
        if (tg.name !== '' && !tg.isDead) throw `❌ Kamu sudah memiliki Pet bernama *${tg.name}* aktif!`  
        if (!petNameInput) throw `Mau kasih nama siapa Pet barumu?\n\nContoh: *${usedPrefix + command} adopt Kuro*`  
        
        // 🚫 VALIDASI ANTI-TAG UNTUK ADOPT
        if (petNameInput.includes('@')) throw `❌ *Invalid Name!* Nama Pet tidak boleh mengandung tag atau karakter '@'.`

        user.tamagotchi = {  
            name: petNameInput,  
            health: 100,  
            hunger: 100,  
            energy: 100,  
            happiness: 100,  
            level: 1,  
            exp: 0,  
            lastUpdate: Date.now(),  
            isDead: false  
        }  
        tg = user.tamagotchi 
        maxStat = 100
        setPetTimers() 
        return m.reply(`🎉 *[ PET SUMMONED ]*\nSelamat, Tamer! Kamu berhasil mengadopsi Pet baru bernama *${petNameInput}* 🐾.\n\nGunakan *${usedPrefix + command} status* untuk mengecek stats-nya.`)  
    }  

    if (tg.name === '') throw `❌ Kamu belum memiliki Pet! Summon Pet dulu dengan cara:\n*${usedPrefix + command} adopt <nama>*`  
    if (tg.isDead && action !== 'status') return m.reply(`💀 *[ GAME OVER ]*\n*${tg.name}* telah gugur...\nKetik *${usedPrefix + command} adopt <nama_baru>* untuk mereset dan memanggil Pet baru.`)  

    // 2. Routing Aksi Game Tamagotchi  
    switch (action) {  
        case 'rename':  
            if (!petNameInput) throw `Masukkan nama baru Pet-mu.\nContoh: *${usedPrefix + command} rename Shiro*`  
            
            // 🚫 VALIDASI ANTI-TAG UNTUK RENAME
            if (petNameInput.includes('@')) throw `❌ *Invalid Name!* Nama Pet tidak boleh mengandung tag atau karakter '@'.`

            let oldName = tg.name  
            tg.name = petNameInput  
            m.reply(`🏷️ *[ NAME TAG USED ]*\nNama Pet berhasil diubah dari *${oldName}* menjadi *${tg.name}*.`)  
            break;  

        case 'feed':  
            if (user.makananpet < 1) {
                throw `❌ *[ INVENTORY KOSONG ]*\nKamu tidak memiliki 🥫 *Pet Food*!\n\nBeli di Shop dengan mengetik:\n*${usedPrefix}shop buy makananpet 1*`;
            }

            if (tg.hunger >= maxStat) {
                throw `🍖 *${tg.name}* sudah kenyang! (Hunger Full)\n(Item tidak digunakan, sisa: ${user.makananpet})`;
            }
            
            user.makananpet -= 1; 
            tg.hunger = Math.min(maxStat, tg.hunger + 30);
            tg.energy = Math.max(0, tg.energy - 5);  
            tg.exp += 25;  
              
            let feedMsg = `🍖 *[ FEEDING TIME ]*\nKamu memberikan 🥫 *Pet Food* kepada *${tg.name}*.\n(Sisa Pet Food di Inventory: ${user.makananpet})\n\n📊 *Stats Change:*\n🍖 Hunger: +30 📈\n⚡ Energy: -5 📉\n✨ EXP: +25`;
            
            if (checkLevelUp()) {
                feedMsg += `\n\n🎊 *[ LEVEL UP! ]* 🎊\n*${tg.name}* telah mencapai *Level ${tg.level}*!\nMax Stats meningkat menjadi *${maxStat}* dan semua bar status terisi penuh (Max)!`;
            }
            
            m.reply(feedMsg);
            setPetTimers();
            break;  

        case 'play':  
            if (tg.energy < 20) throw `💤 *Low Energy!* *${tg.name}* terlalu lelah untuk diajak bermain.`  
            if (tg.hunger < 20) throw `😵 *Low Hunger!* *${tg.name}* kelaparan, beri Pet Food terlebih dahulu.`  
            tg.happiness = Math.min(maxStat, tg.happiness + 30)  
            tg.energy = Math.max(0, tg.energy - 20)  
            tg.hunger = Math.max(0, tg.hunger - 15)  
            tg.exp += 30  
              
            let playMsg = `🎾 *[ PLAYTIME ]*\nKamu mengajak *${tg.name}* bermain!\n\n📊 *Stats Change:*\n🎭 Happy: +30 📈\n⚡ Energy: -20 📉\n🍖 Hunger: -15 📉\n✨ EXP: +30`  
            if (checkLevelUp()) playMsg += `\n\n🎊 *[ LEVEL UP! ]* 🎊\n*${tg.name}* telah mencapai *Level ${tg.level}*!\nMax Stats meningkat menjadi *${maxStat}* dan semua bar status terisi penuh (Max)!`;  
            m.reply(playMsg)  
            setPetTimers() 
            break;  

        case 'sleep':  
            if (tg.energy >= maxStat) throw `👀 *Energy Full!* *${tg.name}* masih segar bugar dan menolak tidur.`  
            tg.energy = Math.min(maxStat, tg.energy + 50)  
            tg.health = Math.min(maxStat, tg.health + 10)  
            tg.hunger = Math.max(0, tg.hunger - 20)  
            tg.exp += 10  
              
            let sleepMsg = `🛏️ *[ RESTING ]*\n*${tg.name}* masuk ke mode istirahat (Tidur nyenyak). Zzz...\n\n📊 *Stats Change:*\n⚡ Energy: +50 📈\n❤️ Health: +10 📈\n🍖 Hunger: -20 📉\n✨ EXP: +10`  
            if (checkLevelUp()) sleepMsg += `\n\n🎊 *[ LEVEL UP! ]* 🎊\n*${tg.name}* telah mencapai *Level ${tg.level}*!\nMax Stats meningkat menjadi *${maxStat}* dan semua bar status terisi penuh (Max)!`;  
            m.reply(sleepMsg)  
            setPetTimers() 
            break;  

        case 'heal':  
            if (tg.health >= maxStat) throw `💖 *HP Full!* *${tg.name}* tidak membutuhkan pengobatan.`  
            tg.health = Math.min(maxStat, tg.health + 40)  
            tg.happiness = Math.max(0, tg.happiness - 15)  
            tg.exp += 15  
              
            let healMsg = `💊 *[ HEALING ]*\nKamu memberikan *Health Potion* kepada *${tg.name}*.\n\n📊 *Stats Change:*\n❤️ Health: +40 📈\n🎭 Happy: -15 📉\n✨ EXP: +15`  
            if (checkLevelUp()) healMsg += `\n\n🎊 *[ LEVEL UP! ]* 🎊\n*${tg.name}* telah mencapai *Level ${tg.level}*!\nMax Stats meningkat menjadi *${maxStat}* dan semua bar status terisi penuh (Max)!`;  
            m.reply(healMsg)  
            setPetTimers() 
            break;  

        case 'status':  
            let ownerName = '@' + m.sender.replace(/@.+/, '')  
            let statusEmoji = tg.isDead ? '💀' : (tg.health < (maxStat * 0.4) ? '🤕' : (tg.happiness > (maxStat * 0.7) ? '🥰' : '😐'))  
            let conditionText = tg.isDead ? 'Gugur 💀' : (tg.health < (maxStat * 0.4) ? 'Kritis 🔴' : 'Normal 🟢')
              
            let statusText = `
╭─── [ 🐾 PET STATUS ] ───
│ 👤 Tamer: ${ownerName}
│ 🐕 Name: ${tg.name} ${statusEmoji}
│ 🏅 Level: ${tg.level} (EXP: ${tg.exp} / ${tg.level * 100})
│ 🫀 Condition: ${conditionText}
╰──────────────────────

❤️ *Health:* ${tg.health} / ${maxStat}
[${renderBar(tg.health)}]

🍖 *Hunger:* ${tg.hunger} / ${maxStat}
[${renderBar(tg.hunger)}]

⚡ *Energy:* ${tg.energy} / ${maxStat}
[${renderBar(tg.energy)}]

🎭 *Happy:* ${tg.happiness} / ${maxStat}
[${renderBar(tg.happiness)}]

🎒 *Inventory:* ${user.makananpet}x 🥫 Pet Food
`.trim()
            conn.reply(m.chat, statusText, m, { mentions: [m.sender] })
            setPetTimers()
            break;

        default:  
            let helpText = `
╭─── [ 🐾 PET SYSTEM ] ───
│ 🎒 Inventory: ${user.makananpet}x 🥫 Pet Food
│
│ 🎮 *COMMANDS:*
│ ➭ ${usedPrefix + command} adopt <nama> : Summon Pet
│ ➭ ${usedPrefix + command} rename <nama> : Ganti Nama Pet
│ ➭ ${usedPrefix + command} status : Cek Stats & Bar
│ ➭ ${usedPrefix + command} feed : Beri Pet Food
│ ➭ ${usedPrefix + command} play : Dapatkan EXP
│ ➭ ${usedPrefix + command} sleep : Pulihkan Energy
│ ➭ ${usedPrefix + command} heal : Pulihkan Health
╰───────────────────────
`.trim()
            m.reply(helpText)
            break;
    }
}

handler.help = ['tamagotchi']
handler.tags = ['rpg']
handler.command = ['tamagotchi', 'pet']
handler.register = true

module.exports = handler