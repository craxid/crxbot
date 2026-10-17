const delay = time => new Promise(res => setTimeout(res, time))

let reg = 50
let handler = async (m, { conn, args, usedPrefix, command }) => {
  let fa = ` Berapa banyak Kamu ingin taruhan? 📌 Contoh : *${usedPrefix + command}* 5000`.trim()
  if (!args[0]) throw fa
  if (isNaN(args[0])) throw fa
  
  let taruhan = parseInt(args[0])
  let users = global.db.data.users[m.sender]
  
  let umur = users.age
  let time = (users.lastslot || 0) + 10000
  
  if (new Date - users.lastslot < 10000) throw `⏳ Tunggu *${msToTime(time - new Date())}*`
  if (taruhan < 5000) throw '✳️ Minimal taruhan *Rp 5000*'
  if (umur < 18) throw `❎ Kamu masih di bawah umur (Min. 18 tahun)`
  if (users.money < taruhan) throw `✳️ *Uangmu* kurang`

  await conn.sendPresenceUpdate('recording', m.chat)

  let emojis = ["🍎", "🍇", "🍊", "🍋", "🍒", "🍓", "🍍"];

  // --- LOGIKA PELUANG (ngikut nominal taruhan) ---
  // bid kecil (< 30k): digampangin menang | bid gede: rate menang dikecilin
  let winRate, drawRate
  if (taruhan < 30000) {
    winRate = 15; drawRate = 55 // win 15%, draw 55%, lose 30%
  } else {
    winRate = 2; drawRate = 40 // win 2%, draw 40%, lose 58%
  }

  let chance = Math.random() * 100;
  let resultType = "";

  if (chance <= winRate) {
    resultType = "win";
  } else if (chance <= winRate + drawRate) {
    resultType = "draw";
  } else {
    resultType = "lose";
  }

  let a, b, c;
  let isWin = false;

  if (resultType === "win") {
    isWin = true;
    a = b = c = Math.floor(Math.random() * emojis.length);
  } else if (resultType === "draw") {
    a = Math.floor(Math.random() * emojis.length);
    b = a; 
    c = (a + 1) % emojis.length;
  } else {
    a = Math.floor(Math.random() * emojis.length);
    b = (a + 1) % emojis.length;
    c = (a + 2) % emojis.length;
  }

  // x = Kolom Kiri, y = Kolom Tengah, z = Kolom Kanan
  let x = [], y = [], z = [];
  for (let i = 0; i < 3; i++) {
    x[i] = emojis[(a + i) % emojis.length];
    y[i] = emojis[(b + i) % emojis.length];
    z[i] = emojis[(c + i) % emojis.length];
  }

  // --- RINGKASAN HASIL ---
  let end;
  if (isWin) {
    let hadiah = taruhan * 3;
    end = `*🎁 JACKPOT 🎉🎉🎉!*\n\nKamu sangat beruntung!\nMendapatkan *${formatRupiah(hadiah)},-*`
    users.money += hadiah
  } else if (resultType === "draw") {
    end = `*⚖️ DRAW*\n\nDikit Lagi!\nModalmu kembali: *${formatRupiah(taruhan)},-*`
  } else {
    end = `*😔 KAMU KALAH* \n\nUangmu dikurangi *${formatRupiah(taruhan)},-*`
    users.money -= taruhan
  }

  users.lastslot = new Date * 1

  // --- FUNGSI ANIMASI GULUNGAN (REEL) ---
  const randomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)];

  // Fungsi untuk membuat grid, parameter menentukan apakah kolom tsb sudah berhenti atau masih acak
  const generateGrid = (lockLeft, lockCenter, lockRight) => {
    let grid = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];
    
    // Baris 1, 2, 3
    for(let i=0; i<3; i++) {
      grid[i][0] = lockLeft ? x[i] : randomEmoji();   // Kolom 1 (Kiri)
      grid[i][1] = lockCenter ? y[i] : randomEmoji(); // Kolom 2 (Tengah)
      grid[i][2] = lockRight ? z[i] : randomEmoji();  // Kolom 3 (Kanan)
    }
    
    return `
${grid[0][0]} : ${grid[0][1]} : ${grid[0][2]}
${grid[1][0]} : ${grid[1][1]} : ${grid[1][2]}
${grid[2][0]} : ${grid[2][1]} : ${grid[2][2]}
`.trim();
  }

  // Layout seragam dari awal sampai akhir tanpa teks "BERPUTAR..."
  let layoutAnimasi = (grid) => `
🎰 ┃ *FUNTASY SLOT 69* 
─────────── 
${grid}
───────────
🎰 ┃ 🎰 ┃ 🎰 
`.trim();

  // 1. Frame 1: Semua kolom masih berputar (acak)
  let { key } = await conn.sendMessage(m.chat, { text: layoutAnimasi(generateGrid(false, false, false)) }, { quoted: m });

  // 2. Frame 2: Kolom KIRI berhenti (terkunci ke hasil akhir)
  await delay(600);
  await conn.sendMessage(m.chat, { text: layoutAnimasi(generateGrid(true, false, false)), edit: key });

  // 3. Frame 3: Kolom TENGAH berhenti
  await delay(600);
  await conn.sendMessage(m.chat, { text: layoutAnimasi(generateGrid(true, true, false)), edit: key });

  // 4. Frame 4: Kolom KANAN berhenti + Muncul teks hasil akhir
  let teksAkhir = `
${layoutAnimasi(generateGrid(true, true, true))}

${end}
  `.trim();

  await delay(600);
  await conn.sendMessage(m.chat, { text: teksAkhir, edit: key });
}

handler.help = ['slot <jumlah taruhan>']
handler.tags = ['game']
handler.command = ['slot']
handler.register = true
handler.group = true

module.exports = handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  return seconds + " detik"
}

function formatRupiah(angka) {
  return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}