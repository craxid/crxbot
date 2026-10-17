const { areJidsSameUser } = require('@adiwajshing/baileys');

let handler = async (m, { conn, args, participants}) => {
  // Abaikan jika ada argumen setelah perintah
  if (args.length> 0) return;

  const topCount = 5;
  const categories = ['money', 'exp', 'limit', 'level'];
  const users = Object.entries(global.db.data.users).map(([jid, data]) => ({ jid,...data }));

  let text = categories.map(category => {
    const sortedUsers = [...users].sort((a, b) => (b[category] || 0) - (a[category] || 0));
    const position = sortedUsers.findIndex(u => u.jid === m.sender) + 1;
    const total = sortedUsers.length;
    const topUsers = sortedUsers.slice(0, topCount);

    const leaderboard = topUsers.map((user, i) => {
      const name = participants.some(p => areJidsSameUser(user.jid, p.id))
? `(${conn.getName(user.jid)}) wa.me/${user.jid.split('@')[0]}`
: `@${user.jid.split('@')[0]}`;
      const value = formatValue(category, user[category] || 0);
      return `*${i + 1}.* ${name} ➭ _*${value}*_`;
}).join('\n');

    return `≡ *TOP ${topCount} ${category.toUpperCase()}* ${getLabel(category)}\n` +
           `Kamu posisi: *${position}* dari *${total}*\n` +
           leaderboard;
}).join('\n\n');

  conn.reply(m.chat, text.trim(), m, {
    mentions: users.map(u => u.jid).filter(jid =>!participants.some(p => areJidsSameUser(jid, p.id))),
});
};

handler.help = ['leaderboard'];
handler.tags = ['main'];
handler.command = ['leaderboard', 'lb', 'top'];
handler.register = true
handler.group = true
module.exports = handler;

function getLabel(category) {
  const labels = {
    money: '💰',
    exp: '🧬',
    limit: '🔗',
    level: '⬆️'
};
  return labels[category] || '';
}

function formatValue(property, value) {
  switch (property) {
    case 'money':
      return `Rp${value.toLocaleString('id-ID')}`;
    case 'exp':
      return `XP ${value.toLocaleString('id-ID')}`;
    case 'limit':
      return `Limit ${value.toLocaleString('id-ID')}`;
    case 'level':
      return `Level ${value.toLocaleString('id-ID')}`;
    default:
      return value.toLocaleString('id-ID');
}
}
