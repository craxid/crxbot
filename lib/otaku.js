const fetch = globalThis.fetch;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function wget(u){
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' } });
  return await r.text();
}
function extractField(h, label){
  const re = new RegExp('<b>\\s*'+label+'\\s*</b>\\s*:?\\s*([\\s\\S]*?)(?:</div>|</p>|<br|</li>|</td)','i');
  const m = h.match(re);
  if(!m) return '';                                                          return m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
}
function getTitle(h){const m=h.match(/<title>([^<]*)<\/title>/i);return m?m[1].trim():'';}                                                            async function searchAnime(q){
  const h=await wget(`https://otakudesu.blog/?s=${encodeURIComponent(q)}&post_type=anime`);
  const aurl=(h.match(/https:\/\/otakudesu\.blog\/anime\/[^"]*/g)||[])[0];
  return aurl;
}
async function getEpisodeDetail(epUrl){
  const eh=await wget(epUrl);
  const embed=(eh.match(/<iframe[^>]*src="([^"]*)"/i)||[,''])[1];
  const downloads=[...new Set((eh.match(/href="(https:\/\/[^"]*\.(?:mp4|mkv)[^"]*)"/gi)||[]).map(m=>m[1]))];
  const title=getTitle(eh);
  return {url:epUrl,title,embed,downloads};
}
async function scrapeAnime(aurl){
  const ah=await wget(aurl);
  const title=getTitle(ah)||(ah.match(/<h2[^>]*><a[^>]*>([^<]*)<\/a>/i)||[,''])[1];
  const thumb=(ah.match(/<meta property="og:image"[^>]*content="([^"]*)"/i)||[,''])[1];
  const status=extractField(ah,'Status');
  const skor=extractField(ah,'Rating')||extractField(ah,'Skor');
  const genre=extractField(ah,'Genres')||extractField(ah,'Genre');
  const produser=extractField(ah,'Produser');
  const tanggal_rilis=extractField(ah,'Tanggal Rilis')||extractField(ah,'Dirilis');
  const durasi=extractField(ah,'Durasi');
  const total_episode=extractField(ah,'Total Episode')||extractField(ah,'Episode');
  const eps=[...new Set(ah.match(/https:\/\/otakudesu\.blog\/episode\/[^"]*/g)||[])];
  const episodes=[];
  for(const ep of eps){
    episodes.push(await getEpisodeDetail(ep));
  }
  return {search_anime_url:aurl,title,status,skor,genre,thumbnail:thumb,produser,tanggal_rilis,durasi,total_episode,episodes};
}
module.exports={searchAnime,scrapeAnime,getEpisodeDetail};