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
