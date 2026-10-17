let handler = async (m, { conn}) => {
  // Fungsi untuk menghasilkan kode acak dengan minimal 2 angka
  const generateRandomCode = (length = 5) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    let result = '';

    // Tambahkan 2 angka terlebih dahulu
    for (let i = 0; i < 2; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
}

    // Tambahkan sisa karakter (length - 2) dari gabungan huruf dan angka
    const allChars = letters + digits;
    for (let i = 0; i < length - 2; i++) {
      result += allChars.charAt(Math.floor(Math.random() * allChars.length));
}

    // Acak ulang urutan karakter agar angka tidak selalu di awal
    return result.split('').sort(() => Math.random() - 0.5).join('');
};

  // Buat 10 kode acak
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(generateRandomCode());
}

  // Format pesan
  const message = `🎲 10 Kode Acak:\n\n${codes.map((code, i) => `*${i + 1}.* ${code}`).join('\n')}`;

  await conn.reply(m.chat, message, m);
};

handler.command = ['acak'];
handler.tags = ['fun'];
handler.help = ['acak'];

module.exports = handler;