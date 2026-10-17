const fs = require('fs')
let handler = async (m, { conn, usedPrefix, text, command }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
    let user = global.db.data.users[m.sender]
    let skill = {
        "barbarian": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "bard": { difficulty: "medium", stars: "⭐⭐⭐" },
        "cleric": { difficulty: "medium", stars: "⭐⭐⭐" },
        "druid": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "fighter": { difficulty: "easy", stars: "⭐⭐" },
        "monk": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" },
        "paladin": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "ranger": { difficulty: "medium", stars: "⭐⭐⭐" },
        "rogue": { difficulty: "medium", stars: "⭐⭐⭐" },
        "sorcerer": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" },
        "warlock": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "wizard": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" }
    }

    let skil = text.trim().toLowerCase() // filter text

    if (!Object.keys(skill).includes(skil)) {
        // Generate the list of skills with their difficulty and star rating
        let skillList = Object.keys(skill).map(s => {
            let { difficulty, stars } = skill[s]
            return `- *${s}* *[ ${stars} ]*\n_Difficulty_ : ${difficulty}`
        }).join('\n')

        const availableSkillsMessage = `乂 *C L A S S*\n\nPilih *Class* yang kamu sukai atau sesuai dengan skill atau talent mu :\n\n${skillList}\n\n_How To Use_ :\n${usedPrefix + command} *nameskill*\n\n_Example_ :\n${usedPrefix + command} *wizard*`.trim();
        await conn.reply(m.chat, availableSkillsMessage, fkonn, {
            contextInfo: {
                forwardingScore: 9999,
isForwarded: true,
}
        });
        return;
    }

    // Initialize user skills if not present
    if (!user.skills) {
        user.skills = []
    }

    let { difficulty, stars } = skill[skil]

    // Remove previous skill
    if (user.skill) {
        let index = user.skills.findIndex(s => s.name === user.skill)
        user.skills.splice(index, 1)
    }

    let newSkill = {
        name: skil,
        difficulty: difficulty,
        stars: stars
    }

    user.skills.push(newSkill)
    user.skill = skil // Update current skill
    m.reply(`Anda telah memilih skill ${skil} dengan tingkat kesulitan ${difficulty} dan bintang ${stars}.`)
}

handler.help = ['selectskill <type>']
handler.tags = ['rpg']
handler.command = /^(selectskill)$/i
handler.register = true
handler.group = true

module.exports = handler
