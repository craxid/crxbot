let handler = async (m, { conn, args }) => {
  if (!args[0]) throw 'Masukkan nama bot baru';
  try {
    await conn.updateProfileName(args.join(' '));
    m.reply('Nama bot berhasil diubah!');
  } catch (e) {
    console.log(e);
    m.reply('Gagal mengubah nama bot');
  }
};

handler.help = ['setnamebot'];
handler.tags = ['owner'];
handler.command = /^setnamebot$/i;
handler.owner = true;

module.exports = handler;