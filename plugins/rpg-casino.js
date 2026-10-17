let buatall = 1;
let handler = async (m, { conn, args, usedPrefix, DevMode }) => {
  conn.casino = conn.casino ? conn.casino : {};
  
  // Perbaiki: Lock berdasarkan m.sender (User) agar tidak memblokir satu grup penuh
  if (m.sender in conn.casino) {
    return m.reply("Kamu masih memiliki sesi casino yang sedang berjalan, tunggu sampai selesai!!");
  }
  
  // Pengecekan argumen di awal sebelum memproses perhitungan
  if (args.length < 1) {
    return conn.reply(m.chat, `Gunakan format: ${usedPrefix}casino <jumlah>\nContoh: ${usedPrefix}casino 1000 atau ${usedPrefix}casino all`, m);
  }

  // Set lock untuk user
  conn.casino[m.sender] = true;

  try {
    let randomaku = Math.floor(Math.random() * 150);
    let randomkamu = Math.floor(Math.random() * 80); // Hehe biar susah menang :v
    
    let Aku = randomaku * 1;
    let Kamu = randomkamu * 1;
    let user = global.db.data.users[m.sender];
    
    // Proses Parsing Count
    let count = args[0];
    if (/all/i.test(count)) {
      count = Math.floor(user.money / buatall);
    } else {
      count = parseInt(count);
    }

    // Validasi apakah input berupa angka
    if (isNaN(count)) {
      return m.reply("Jumlah taruhan harus berupa angka atau 'all'!");
    }

    count = Math.max(1, count); // Minimal taruhan adalah 1

    // Proses Taruhan
    if (user.money >= count) {
      user.money -= count; // Potong uang di awal
      
      if (Aku > Kamu) {
        conn.reply(
          m.chat,
          `💰 *C A S I N O* 💰\n\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*Yahh, Kamu KALAH*\nKamu kehilangan ${count} Money`.trim(),
          m
        );
      } else if (Aku < Kamu) {
        user.money += count * 2; // Hadiah x2
        conn.reply(
          m.chat,
          `💰 *C A S I N O* 💰\n\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*Selamat Kamu MENANG*\nKamu mendapatkan ${count * 2} Money`.trim(),
          m
        );
      } else {
        user.money += count * 1; // Uang kembali
        conn.reply(
          m.chat,
          `💰 *C A S I N O* 💰\n\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*Hasilnya SERI*\nUang taruhanmu dikembalikan ${count * 1} Money`.trim(),
          m
        );
      }
    } else {
      conn.reply(
        m.chat,
        `Uang kamu tidak mencukupi untuk Casino. Sisa uangmu: ${user.money} Money.\nSilahkan *#kerja* terlebih dahulu!`.trim(),
        m
      );
    }
  } catch (e) {
    console.log(e);
    m.reply("Terjadi kesalahan sistem (Error)!!");
    if (DevMode) {
      for (let jid of global.owner
        .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
        .filter((v) => v != conn.user.jid)) {
        
        // Perbaiki: Gunakan format objek { text: ... } untuk Baileys MD
        conn.sendMessage(
          jid, 
          { text: `*Casino Error!*\n\nUser: ${m.sender.split('@')[0]}\nCommand: ${m.text}\n\nLog:\n${e}` }
        );
      }
    }
  } finally {
    // Hapus sesi setelah proses selesai atau terjadi error
    delete conn.casino[m.sender];
  }
};

handler.help = ["casino <jumlah>"];
handler.tags = ["rpg"];
handler.command = /^(casino)$/i;
handler.register = true;
handler.group = true;
//handler.limit = 10;
module.exports = handler;

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}