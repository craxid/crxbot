const TicTacToe = require("../lib/tictactoe");

let handler = async (m, { conn, usedPrefix, command, text}) => {
  conn.game = conn.game || {};

  // Cek apakah pemain sudah berada dalam game
  if (Object.values(conn.game).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender))) {
    throw '⚠️ Kamu masih berada dalam game yang sedang berlangsung.';
}

  // Cari room yang sedang menunggu
  let room = Object.values(conn.game).find(room => room.state === 'WAITING' && (text? room.name === text: true));

  if (room) {
    m.reply('✅ Partner ditemukan!');
    room.o = m.chat;
    room.game.playerO = m.sender;
    room.state = 'PLAYING';

    // Tambahkan callback kemenangan
    room.game.onWin = async winner => {
      const loser = [room.game.playerX, room.game.playerO].find(p => p!== winner);
      const prize = 1000;

      const winnerData = global.db.data.users[winner] || {};
      const loserData = global.db.data.users[loser] || {};

      if ((loserData.money || 0)>= prize) {
        loserData.money -= prize;
        winnerData.money = (winnerData.money || 0) + prize;

        const winnerName = await conn.getName(winner);
        const loserName = await conn.getName(loser);

        const msg = `🎉 ${winnerName} menang dan mendapatkan Rp${prize.toLocaleString('id-ID')} dari ${loserName}!`;

        conn.sendMessage(room.x, { text: msg}, { quoted: m});
        if (room.o!== room.x) conn.sendMessage(room.o, { text: msg}, { quoted: m});
} else {
        const loserName = await conn.getName(loser);
        const msg = `💸 ${loserName} tidak punya cukup uang untuk membayar hadiah.`;

        conn.sendMessage(room.x, { text: msg}, { quoted: m});
        if (room.o!== room.x) conn.sendMessage(room.o, { text: msg}, { quoted: m});
}

      delete conn.game[room.id];
};

    // Tampilkan papan permainan
    let arr = room.game.render().map(v => ({
      X: '❌', O: '⭕',
      1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
      4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
      7: '7️⃣', 8: '8️⃣', 9: '9️⃣'
}[v]));

    let str = `
🎮 Room ID: ${room.id}
${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

Giliran @${room.game.currentTurn.split('@')[0]}
Ketik *nyerah* untuk menyerah
`.trim();

    m.reply(str, room.x, { contextInfo: { mentionedJid: conn.parseMention(str)}});
    m.reply(str, room.o, { contextInfo: { mentionedJid: conn.parseMention(str)}});

} else {
    // Buat room baru
    room = {
      id: 'tictactoe-' + (+new Date),
      x: m.chat,
      o: '',
      game: new TicTacToe(m.sender),
      state: 'WAITING'
};
    if (text) room.name = text;

    m.reply('🕹️ Menunggu partner ' + (text? `mengetik command berikut:\n${usedPrefix}${command} ${text}`: ''));
    conn.game[room.id] = room;
}
};

handler.help = ['tictactoe', 'ttt'].map(v => v + ' [nama room]');
handler.tags = ['game'];
handler.command = /^(tictactoe|t{3})$/;
handler.group = true;

module.exports = handler;