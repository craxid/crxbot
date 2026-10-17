let handler = async (m, {command, usedPrefix, args}) => {

	let user = global.db.data.users[m.sender]
	
    const list = `╭───────────────
│⬡ 🍖 *Ayambakar* : ${user.ayambakar}
│⬡ 🍖 *ikan bakar* : ${user.ikanbakar}
│⬡ 🍖 *lele bakar* : ${user.lelebakar}
│⬡ 🍖 *nila bakar* : ${user.nilabakar}
│⬡ 🍖 *bawal bakar* : ${user.bawalbakar}
│⬡ 🍖 *udang bakar* : ${user.udangbakar}
│⬡ 🍖 *paus bakar* : ${user.pausbakar}
│⬡ 🍖 *kepiting bakar* : ${user.kepitingbakar}
│⬡ 🍗 *Ayamgoreng* : ${user.ayamgoreng}
│⬡ 🥘 *Rendang* : ${user.rendang}
│⬡ 🥩 *Steak* : ${user.steak}
│⬡ 🥠 *Babipanggang* : ${user.babipanggang}
│⬡ 🍲 *Gulaiayam* : ${user.gulai}
│⬡ 🍜 *Oporayam* : ${user.oporayam}
│⬡ 🍞 *Roti* : ${user.roti}
│⬡ 🍣 *Sushi* : ${user.sushi}
│⬡ 🍷 *Vodka* : ${user.vodka}
│⬡ ☘️ *Ganja* : ${user.ganja}
│⬡ 🍺 *Soda* : ${user.soda}
╰───────────────`
m.reply(list) 

}
handler.help = handler.command = ['kulkas']
handler.tags = ['rpg']
handler.register = true
module.exports = handler