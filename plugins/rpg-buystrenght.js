let handler = async (m, {
	conn,
	args,
	command,
	usedPrefix
}) => {
	if (!args[0] || isNaN(args[0])) {
		throw `*Example*: ${usedPrefix + command} 100`;
	}

	/*conn.sendMessage(m.chat, {
		react: {
			text: '✅',
			key: m.key,
		}
	})*/

	let count = parseInt(args[0]);
	if (count <= 0) {
	    throw 'Jumlah pembelian harus lebih dari 0';
	}
	let hrg = 50000;
	let price = count * hrg;
	let users = global.db.data.users;
	let user = users[m.sender];
	if (price > user.money) {
		throw `Maaf, uang kamu tidak cukup untuk membeli ${count} strength. Harga 1 strength adalah ${hrg} money.\n\nMembutuhkan ${price} Money.`;
	}
	user.money -= price;
	user.strenght += count;
	conn.reply(m.chat, `Berhasil membeli ${count} strength dengan harga ${price} money.`, m);
}

handler.help = ['buystrength <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^buystrength$/i;
handler.group = true
handler.register = true;

module.exports = handler;