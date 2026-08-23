'use strict';

/**
 * Master waifu pool. Each entry becomes an auctionable character.
 * `id` is stable so it can be referenced from client actions.
 */
const RAW_DATA = [
  ['Re:Zero - Starting Life in Another World', ['Rem', 'Emilia', 'Ram']],
  ['Sword Art Online', ['Asuna Yuuki']],
  ["Frieren: Beyond Journey's End", ['Frieren', 'Fern']],
  ['The Quintessential Quintuplets', ['Miku Nakano', 'Nino Nakano', 'Itsuki Nakano']],
  ['My Dress-Up Darling', ['Marin Kitagawa']],
  ['Spy x Family', ['Yor Forger']],
  ['Fairy Tail', ['Erza Scarlet', 'Juvia Lockser', 'Mirajane Strauss']],
  ['Chainsaw Man', ['Makima', 'Power']],
  ['One Piece', ['Nico Robin', 'Boa Hancock', 'Nami']],
  ['Steins;Gate', ['Kurisu Makise']],
  ['Violet Evergarden', ['Violet Evergarden']],
  ['Rascal Does Not Dream of Bunny Girl Senpai', ['Mai Sakurajima']],
  ['Attack on Titan', ['Mikasa Ackerman', 'Historia Reiss']],
  ['Demon Slayer', ['Shinobu Kocho', 'Mitsuri Kanroji', 'Nezuko Kamado']],
  ['Naruto', ['Hinata Hyuga', 'Tsunade Senju']],
  ['Kaguya-sama: Love Is War', ['Kaguya Shinomiya', 'Chika Fujiwara', 'Ai Hayasaka']],
  ['Fullmetal Alchemist: Brotherhood', ['Winry Rockbell', 'Riza Hawkeye']],
  ['Neon Genesis Evangelion', ['Rei Ayanami', 'Asuka Langley Soryu']],
  ['High School DxD', ['Rias Gremory']],
  ['Jujutsu Kaisen', ['Nobara Kugisaki', 'Maki Zenin']],
  ['Darling in the Franxx', ['Zero Two']],
  ['Bleach', ['Yoruichi Shihoin', 'Rangiku Matsumoto', 'Orihime Inoue']],
  ['Oshi no Ko', ['Ai Hoshino']],
  ['The Angel Next Door Spoils Me Rotten', ['Mahiru Shiina']],
  ['Cowboy Bebop', ['Faye Valentine']],
  ['Dragon Ball', ['Bulma', 'Android 18']],
  ['One Punch Man', ['Fubuki', 'Tatsumaki']],
  ['Solo Leveling', ['Cha Hae-In']],
  ['Date A Live', ['Kurumi Tokisaki']],
  ['The Apothecary Diaries', ['Maomao']],
];

// Portrait art fetched from AniList's public character API (https://anilist.co),
// matched per-anime against the roster above and verified reachable. AniList
// hosts these specifically for third-party apps to embed, so images are
// linked directly from their CDN rather than redistributed in this repo.
const CHARACTER_IMAGES = {
  'Ai Hayasaka': 'https://s4.anilist.co/file/anilistcdn/character/large/b121104-7TYRl3EEsDYU.png',
  'Ai Hoshino': 'https://s4.anilist.co/file/anilistcdn/character/large/b172759-cccVhJ2fQA92.png',
  'Android 18': 'https://s4.anilist.co/file/anilistcdn/character/large/b4318-HfIy9rOIOZXM.png',
  'Asuka Langley Soryu': 'https://s4.anilist.co/file/anilistcdn/character/large/b94-d631a3Z2KPvd.png',
  'Asuna Yuuki': 'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png',
  'Boa Hancock': 'https://s4.anilist.co/file/anilistcdn/character/large/b16342-kVOF6V5Q94go.png',
  'Bulma': 'https://s4.anilist.co/file/anilistcdn/character/large/b678-2YCe13F0tFos.jpg',
  'Cha Hae-In': 'https://s4.anilist.co/file/anilistcdn/character/large/b138789-AhE8m0LWjE7E.png',
  'Chika Fujiwara': 'https://s4.anilist.co/file/anilistcdn/character/large/b121103-UGLxT8utLPnq.png',
  'Emilia': 'https://s4.anilist.co/file/anilistcdn/character/large/b88572-IzTwXEHSobRs.jpg',
  'Erza Scarlet': 'https://s4.anilist.co/file/anilistcdn/character/large/b5189-GR1xdok9SFsN.jpg',
  'Faye Valentine': 'https://s4.anilist.co/file/anilistcdn/character/large/b2-0Iszg6Izgt4p.png',
  'Fern': 'https://s4.anilist.co/file/anilistcdn/character/large/b183965-uGFohBjlFoTp.png',
  'Frieren': 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png',
  'Fubuki': 'https://s4.anilist.co/file/anilistcdn/character/large/b81931-fmouMoprPVbV.png',
  'Hinata Hyuga': 'https://s4.anilist.co/file/anilistcdn/character/large/b1555-Q41GLTV3FvYF.png',
  'Historia Reiss': 'https://s4.anilist.co/file/anilistcdn/character/large/b62481-ZZDa7vn17lMU.png',
  'Itsuki Nakano': 'https://s4.anilist.co/file/anilistcdn/character/large/b126375-dEe9IyQ9By09.png',
  'Juvia Lockser': 'https://s4.anilist.co/file/anilistcdn/character/large/b9719-xh4xqTV6byNl.png',
  'Kaguya Shinomiya': 'https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png',
  'Kurisu Makise': 'https://s4.anilist.co/file/anilistcdn/character/large/b34470-Jw2LXZBL5R8i.png',
  'Kurumi Tokisaki': 'https://s4.anilist.co/file/anilistcdn/character/large/b70069-DEV7X6o2L7oG.jpg',
  'Mahiru Shiina': 'https://s4.anilist.co/file/anilistcdn/character/large/b195602-Cc0vrUDl7r15.png',
  'Mai Sakurajima': 'https://s4.anilist.co/file/anilistcdn/character/large/b127222-Jh5hhP7vZ7s1.png',
  'Maki Zenin': 'https://s4.anilist.co/file/anilistcdn/character/large/b134167-5TCytk45YByD.png',
  'Makima': 'https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png',
  'Maomao': 'https://s4.anilist.co/file/anilistcdn/character/large/b126824-MqsCncTO1qpv.png',
  'Marin Kitagawa': 'https://s4.anilist.co/file/anilistcdn/character/large/b133676-kV2czE3C8Qls.png',
  'Mikasa Ackerman': 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png',
  'Miku Nakano': 'https://s4.anilist.co/file/anilistcdn/character/large/b126373-CWeyXb822uDN.png',
  'Mirajane Strauss': 'https://s4.anilist.co/file/anilistcdn/character/large/b5190-Xql1rGKUv1ql.png',
  'Mitsuri Kanroji': 'https://s4.anilist.co/file/anilistcdn/character/large/b136072-xVwyRUKdpybi.png',
  'Nami': 'https://s4.anilist.co/file/anilistcdn/character/large/b723-vp5hPptgnNEC.png',
  'Nezuko Kamado': 'https://s4.anilist.co/file/anilistcdn/character/large/b127518-NRlq1CQ1v1ro.png',
  'Nico Robin': 'https://s4.anilist.co/file/anilistcdn/character/large/b61-ywXUyyocEEqt.png',
  'Nino Nakano': 'https://s4.anilist.co/file/anilistcdn/character/large/b126372-DtorHRgQaYUJ.png',
  'Nobara Kugisaki': 'https://s4.anilist.co/file/anilistcdn/character/large/b133700-f6sOO3TcgLV6.png',
  'Orihime Inoue': 'https://s4.anilist.co/file/anilistcdn/character/large/b7-JdR4betokDjR.jpg',
  'Power': 'https://s4.anilist.co/file/anilistcdn/character/large/b137079-6yLEUYR3bmpr.png',
  'Ram': 'https://s4.anilist.co/file/anilistcdn/character/large/b88576-NWkotUiJ3mK3.png',
  'Rangiku Matsumoto': 'https://s4.anilist.co/file/anilistcdn/character/large/b904-bdfi2xqHicCj.png',
  'Rei Ayanami': 'https://s4.anilist.co/file/anilistcdn/character/large/86-cA1zL7fyls8E.jpg',
  'Rem': 'https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png',
  'Rias Gremory': 'https://s4.anilist.co/file/anilistcdn/character/large/b50389-gIhJkyk8xj1P.png',
  'Riza Hawkeye': 'https://s4.anilist.co/file/anilistcdn/character/large/b70-k4bCgDspyOdI.png',
  'Shinobu Kocho': 'https://s4.anilist.co/file/anilistcdn/character/large/b136070-MC9LLxJsHyHE.png',
  'Tatsumaki': 'https://s4.anilist.co/file/anilistcdn/character/large/b81929-WPVp2LQoWgkc.png',
  'Tsunade Senju': 'https://s4.anilist.co/file/anilistcdn/character/large/b2767-r61Cj9v8I0wl.png',
  'Violet Evergarden': 'https://s4.anilist.co/file/anilistcdn/character/large/b90169-4wr1Zehnsac8.png',
  'Winry Rockbell': 'https://s4.anilist.co/file/anilistcdn/character/large/63-xloedtYxiJ2E.jpg',
  'Yor Forger': 'https://s4.anilist.co/file/anilistcdn/character/large/b138102-ZOAu9jI2d5ke.png',
  'Yoruichi Shihoin': 'https://s4.anilist.co/file/anilistcdn/character/large/b908-JSYUkJLCw1f0.png',
  'Zero Two': 'https://s4.anilist.co/file/anilistcdn/character/large/b124381-2gAVq76HPfL2.png',
};

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Deterministic HSL accent color derived from the anime title, so every
 * character from the same show shares a family of colors client-side. */
function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 55%)`;
}

const CHARACTERS = [];
for (const [anime, names] of RAW_DATA) {
  const animeColor = colorFor(anime);
  for (const name of names) {
    CHARACTERS.push({
      id: `${slugify(anime)}__${slugify(name)}`,
      name,
      anime,
      color: animeColor,
      image: CHARACTER_IMAGES[name] || null,
    });
  }
}

function freshPool() {
  // Return a shuffled deep copy so each room gets its own independent order.
  const pool = CHARACTERS.map((c) => ({ ...c }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

module.exports = { CHARACTERS, freshPool };
