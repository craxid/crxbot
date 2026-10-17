const axios = require('axios');

let handler = async (m, { args, text }) => {
  if (!args[0]) throw "Masukan nama tempat atau kota";
  
  await m.reply(`Tunggu bentar...\n*_Mengambil info cuaca_*`);
  
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${text}&units=metric&appid=${global.owm}&lang=id`);
    
    let coord = `「 🌐 」 Koordinat: ${response.data.coord.lon}, ${response.data.coord.lat}`;
    let name = `「 📍 」 Lokasi: ${response.data.name}`;
    let Country = `「 🗺️ 」 Negara: ${response.data.sys.country}`;
    let Weather = `「 🌤️ 」 Cuaca: ${response.data.weather[0].description}`;
    let Temperature = `「 🌡️ 」 Temperatur: ${response.data.main.temp}°C`;
    let FeelsLike = `「 🤔 」 Terasa seperti: ${response.data.main.feels_like}°C`;
    let Minimum_Temperature = `「 💠 」 Temperatur Min.: ${response.data.main.temp_min}°C`;
    let Maximum_Temperature = `「 📛 」 Temperatur Maks.: ${response.data.main.temp_max}°C`;
    let Humidity = `「 💦 」 Kelembapan: ${response.data.main.humidity}%`;
    let Pressure = `「 ⚖️ 」 Tekanan: ${response.data.main.pressure} hPa`;
    let Wind = `「 🌬️ 」 Angin: ${response.data.wind.speed} m/s`;
    let Visibility = `「 🔍 」 Visibilitas: ${response.data.visibility} meter`;
    let Clouds = `「 ☁️ 」 Awan: ${response.data.clouds.all}%`;
    
    let wea = `${coord}
${name}
${Country}
${Weather}
${Temperature}
${FeelsLike}
${Minimum_Temperature}
${Maximum_Temperature}
${Humidity}
${Pressure}
${Wind}
${Visibility}
${Clouds}

 ${global.wm}`;
    
    setTimeout(() => {
      conn.sendPresenceUpdate('recording', m.chat);
      conn.sendMessage(m.chat, {
        text: wea,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
        }
      }, { quoted: m });
    }, 3000);
  } catch (e) {
    return "Error: Lokasi tidak ditemukan!";
  }
}

handler.help = ['cuaca <nama kota>'];
handler.tags = ['tools'];
handler.command = /^(weather|cuaca)$/i;
handler.register = true
module.exports = handler;