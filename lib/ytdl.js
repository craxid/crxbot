const axios = require("axios")

const FORMATS = {
  video: {
    "144p": 144,
    "240p": 240,
    "360p": 360,
    "480p": 480,
    "720p": 720,
    "1080p": 1080,
    "1440p": 1440,
    "4k": "4k",
  },
  audio: {
    mp3: "mp3",
    m4a: "m4a",
    aac: "aac",
    flac: "flac",
    opus: "opus",
    ogg: "ogg",
    wav: "wav",
    webm: "webm",
  },
}

const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/

const sleep = ms => new Promise(r => setTimeout(r, ms))

function validateFormat(type, format) {
  if (!FORMATS[type]) throw new Error(`Invalid type: ${type}`)
  const value = FORMATS[type][format]
  if (!value) throw new Error(`Invalid format: ${format}`)
  return value
}

async function getDownloadInfo(url, type = "video", format = "360p") {
  const match = url.match(ytRegex)
  if (!match) throw new Error("Invalid YouTube URL")

  const videoId = match[1]
  const formatValue = validateFormat(type, format)

  const start = await axios.get("https://p.savenow.to/ajax/download.php", {
    params: {
      copyright: 0,
      format: formatValue,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      api: "dfcb6d76f2f6a9894gjkege8a4ab232222"
    }
  })

  const init = start.data
  const id = init.progress_url.split("id=")[1]

  let progressData

  while (true) {
    const res = await axios.get("https://p.savenow.to/api/progress", {
      params: { id }
    })

    const data = res.data

    if (data.success === 1 && data.progress === 1000) {
      progressData = data
      break
    }

    await sleep(1000)
  }

  return {
    success: init.success,
    id: init.id,
    title: init.title,
    info: init.info,
    cachehash: init.cachehash,
    additional_info: init.additional_info,
    extended_duration: init.extended_duration,
    progress: {
      progress: progressData.progress,
      text: progressData.text,
      download_url: progressData.download_url,
      alternative_download_urls: progressData.alternative_download_urls
    }
  }
}

// ekspor sebagai objek
module.exports = { getDownloadInfo }