'use strict';

/**
 * Master waifu pool. Each entry becomes an auctionable character.
 * `id` is stable so it can be referenced from client actions.
 */
const RAW_DATA = [
  ['Re:Zero - Starting Life in Another World', ['Rem', 'Emilia', 'Ram', 'Beatrice']],
  ['Sword Art Online', ['Asuna Yuuki']],
  ["Frieren: Beyond Journey's End", ['Frieren', 'Fern']],
  ['The Quintessential Quintuplets', ['Miku Nakano', 'Nino Nakano', 'Itsuki Nakano', 'Ichika Nakano', 'Yotsuba Nakano']],
  ['My Dress-Up Darling', ['Marin Kitagawa']],
  ['Spy x Family', ['Yor Forger', 'Anya Forger']],
  ['Fairy Tail', ['Erza Scarlet', 'Juvia Lockser', 'Mirajane Strauss']],
  ['Chainsaw Man', ['Makima', 'Power', 'Reze']],
  ['One Piece', ['Nico Robin', 'Boa Hancock', 'Nami']],
  ['Steins;Gate', ['Kurisu Makise', 'Mayuri Shiina']],
  ['Violet Evergarden', ['Violet Evergarden']],
  ['Rascal Does Not Dream of Bunny Girl Senpai', ['Mai Sakurajima']],
  ['Attack on Titan', ['Mikasa Ackerman', 'Historia Reiss', 'Annie Leonhart']],
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
  ['Toradora!', ['Taiga Aisaka', 'Minori Kushieda']],
  ['Code Geass: Lelouch of the Rebellion', ['C.C.', 'Kallen Kouzuki']],
  ['Fate/stay night', ['Saber', 'Rin Tohsaka']],
  ['K-On!', ['Yui Hirasawa', 'Mio Akiyama']],
  ['Your Lie in April', ['Kaori Miyazono']],
  ['Nisekoi', ['Chitoge Kirisaki', 'Kosaki Onodera']],
  ['Rent-A-Girlfriend', ['Chizuru Mizuhara']],
  ['Horimiya', ['Kyoko Hori']],
  ["Komi Can't Communicate", ['Shoko Komi']],
  ['Classroom of the Elite', ['Kei Karuizawa', 'Suzune Horikita']],
  ['The Rising of the Shield Hero', ['Raphtalia']],
  ["KonoSuba: God's Blessing on This Wonderful World!", ['Megumin', 'Aqua', 'Darkness']],
  ['No Game No Life', ['Shiro']],
  ['Overlord', ['Albedo', 'Shalltear Bloodfallen']],
  ['Mushoku Tensei: Jobless Reincarnation', ['Roxy Migurdia']],
  ['That Time I Got Reincarnated as a Slime', ['Shion', 'Milim Nava']],
  ['Tokyo Ghoul', ['Touka Kirishima']],
  ['Fruits Basket', ['Tohru Honda']],
  ['Black Clover', ['Noelle Silva']],
  ['Lycoris Recoil', ['Chisato Nishikigi', 'Takina Inoue']],
  ['Bocchi the Rock!', ['Hitori Gotou']],
  ["Miss Kobayashi's Dragon Maid", ['Tohru']],
  ['Akame ga Kill!', ['Akame', 'Esdeath']],
  ['The Devil is a Part-Timer!', ['Emi Yusa']],
  ['Is It Wrong to Try to Pick Up Girls in a Dungeon?', ['Hestia']],
  ['Your Name', ['Mitsuha Miyamizu']],
  ['Princess Mononoke', ['San']],
  ["Howl's Moving Castle", ['Sophie Hatter']],
  ['Sailor Moon', ['Usagi Tsukino']],
  ['Puella Magi Madoka Magica', ['Madoka Kaname', 'Homura Akemi']],
  ['Inuyasha', ['Kagome Higurashi']],
  ['My Hero Academia', ['Ochaco Uraraka', 'Momo Yaoyorozu']],
  ['Lucky Star', ['Konata Izumi']],
  ['The Melancholy of Haruhi Suzumiya', ['Haruhi Suzumiya']],
  ['Ouran High School Host Club', ['Haruhi Fujioka']],
  ['Gurren Lagann', ['Yoko Littner']],
  ['My Teen Romantic Comedy SNAFU', ['Yukino Yukinoshita']],
  ['Tokyo Revengers', ['Hinata Tachibana']],
  ['Higurashi: When They Cry', ['Rena Ryuguu']],
  ['Death Note', ['Misa Amane']],
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
  // -- catalog expansion batch --
  'Akame': 'https://s4.anilist.co/file/anilistcdn/character/large/b63351-0WmsDENpiscp.png',
  'Albedo': 'https://s4.anilist.co/file/anilistcdn/character/large/b89122-Gj7MBs7F5cMJ.png',
  'Aqua': 'https://s4.anilist.co/file/anilistcdn/character/large/b89362-ibkc0eoECaW1.png',
  'C.C.': 'https://s4.anilist.co/file/anilistcdn/character/large/b1111-UhmlFtRFrnWa.png',
  'Chisato Nishikigi': 'https://s4.anilist.co/file/anilistcdn/character/large/b260329-1Z5n1QgViEBI.png',
  'Chitoge Kirisaki': 'https://s4.anilist.co/file/anilistcdn/character/large/b48391-SuJot8cVKjHj.png',
  'Chizuru Mizuhara': 'https://s4.anilist.co/file/anilistcdn/character/large/b128106-zSTsuULvz6PX.png',
  'Darkness': 'https://s4.anilist.co/file/anilistcdn/character/large/b89363-mm21Ll4NegUD.png',
  'Emi Yusa': 'https://s4.anilist.co/file/anilistcdn/character/large/b70735-DmmbHRLKpS0E.png',
  'Esdeath': 'https://s4.anilist.co/file/anilistcdn/character/large/b65239-2S3t2vSyUew9.png',
  'Hestia': 'https://s4.anilist.co/file/anilistcdn/character/large/b87654-UmmuLPwSK2Hd.jpg',
  'Hitori Gotou': 'https://s4.anilist.co/file/anilistcdn/character/large/b257562-Ru35NYPfsqhY.png',
  'Ichika Nakano': 'https://s4.anilist.co/file/anilistcdn/character/large/b126371-0KQpl80s8kXQ.png',
  'Kallen Kouzuki': 'https://s4.anilist.co/file/anilistcdn/character/large/b558-8tSMZ4a0LWrn.jpg',
  'Kaori Miyazono': 'https://s4.anilist.co/file/anilistcdn/character/large/b69411-lxM0FRvWHqlv.png',
  'Kei Karuizawa': 'https://s4.anilist.co/file/anilistcdn/character/large/b141122-6Zk52eU3VK3O.png',
  'Kosaki Onodera': 'https://s4.anilist.co/file/anilistcdn/character/large/b52723-YbLFn4JmoAVQ.png',
  'Kyoko Hori': 'https://s4.anilist.co/file/anilistcdn/character/large/b66171-o2vk3689wWFK.png',
  'Megumin': 'https://s4.anilist.co/file/anilistcdn/character/large/b89361-tq8PQQ4MmF0M.png',
  'Milim Nava': 'https://s4.anilist.co/file/anilistcdn/character/large/b128036-lW0dxNwerqw4.png',
  'Minori Kushieda': 'https://s4.anilist.co/file/anilistcdn/character/large/b12305-AdKOcp0az9mq.jpg',
  'Mio Akiyama': 'https://s4.anilist.co/file/anilistcdn/character/large/b19566-XKsMgf370b4m.png',
  'Noelle Silva': 'https://s4.anilist.co/file/anilistcdn/character/large/b123283-7nJHtKha0LSm.png',
  'Raphtalia': 'https://s4.anilist.co/file/anilistcdn/character/large/b88889-CWYytVbCOPsV.png',
  'Rin Tohsaka': 'https://s4.anilist.co/file/anilistcdn/character/large/b498-lwawtSpLyATL.png',
  'Roxy Migurdia': 'https://s4.anilist.co/file/anilistcdn/character/large/b88350-QU1iwgZ887U8.png',
  'Saber': 'https://s4.anilist.co/file/anilistcdn/character/large/b497-Yg5pNmC8kxzs.png',
  'Shalltear Bloodfallen': 'https://s4.anilist.co/file/anilistcdn/character/large/b89121-N8hzLH4nfWna.png',
  'Shion': 'https://s4.anilist.co/file/anilistcdn/character/large/b128033-fLbTgW4M2yj3.png',
  'Shiro': 'https://s4.anilist.co/file/anilistcdn/character/large/b82525-sKk2FGRKN4aK.png',
  'Shoko Komi': 'https://s4.anilist.co/file/anilistcdn/character/large/b121956-5FbIbcd6gAZW.png',
  'Suzune Horikita': 'https://s4.anilist.co/file/anilistcdn/character/large/b123213-jUfrGBXfW7BL.png',
  'Taiga Aisaka': 'https://s4.anilist.co/file/anilistcdn/character/large/b12064-7PDN3ylIeAZn.png',
  'Takina Inoue': 'https://s4.anilist.co/file/anilistcdn/character/large/b260328-GVvi4r6RKivm.png',
  'Tohru': 'https://s4.anilist.co/file/anilistcdn/character/large/b120970-knjWLdlQIs1y.jpg',
  'Tohru Honda': 'https://s4.anilist.co/file/anilistcdn/character/large/b207-RQ4EUdTD0K62.png',
  'Touka Kirishima': 'https://s4.anilist.co/file/anilistcdn/character/large/b87277-oUaqrI1iBzu6.png',
  'Yotsuba Nakano': 'https://s4.anilist.co/file/anilistcdn/character/large/b126374-Aal36iSQ5nKz.png',
  'Yui Hirasawa': 'https://s4.anilist.co/file/anilistcdn/character/large/b19565-7gMiEAm7NGNK.png',
  // -- catalog expansion batch 2 --
  'Annie Leonhart': 'https://s4.anilist.co/file/anilistcdn/character/large/b46490-tan274Ifc1Jf.jpg',
  'Anya Forger': 'https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png',
  'Beatrice': 'https://s4.anilist.co/file/anilistcdn/character/large/b90181-wRPm0OEaucmw.png',
  'Haruhi Fujioka': 'https://s4.anilist.co/file/anilistcdn/character/large/b18-SAz5kAo2Fhm1.png',
  'Haruhi Suzumiya': 'https://s4.anilist.co/file/anilistcdn/character/large/b251-8DTaCNkSvBQ8.png',
  'Hinata Tachibana': 'https://s4.anilist.co/file/anilistcdn/character/large/b138453-MFISjDiAEfiM.png',
  'Homura Akemi': 'https://s4.anilist.co/file/anilistcdn/character/large/b38005-T3NR8p2f021x.jpg',
  'Kagome Higurashi': 'https://s4.anilist.co/file/anilistcdn/character/large/b1354-PuUTCSX7UzKA.png',
  'Konata Izumi': 'https://s4.anilist.co/file/anilistcdn/character/large/2169-5xDzQnt3MtQk.png',
  'Madoka Kaname': 'https://s4.anilist.co/file/anilistcdn/character/large/b37832-lzVj5IkUciLd.jpg',
  'Mayuri Shiina': 'https://s4.anilist.co/file/anilistcdn/character/large/b35253-u6QVgLLyHq2W.png',
  'Misa Amane': 'https://s4.anilist.co/file/anilistcdn/character/large/b835-CiZa8y2z2gCz.png',
  'Mitsuha Miyamizu': 'https://s4.anilist.co/file/anilistcdn/character/large/b121514-MGI7JRluscpz.png',
  'Momo Yaoyorozu': 'https://s4.anilist.co/file/anilistcdn/character/large/b89241-Q8KzAfX4Qe2y.png',
  'Ochaco Uraraka': 'https://s4.anilist.co/file/anilistcdn/character/large/b89221-gSF2a4gPbG4m.png',
  'Rena Ryuguu': 'https://s4.anilist.co/file/anilistcdn/character/large/b1427-28AR4oy0y2Hw.png',
  'Reze': 'https://s4.anilist.co/file/anilistcdn/character/large/b148740-ceAibPxLW8rR.png',
  'San': 'https://s4.anilist.co/file/anilistcdn/character/large/b2727-eH2xoFpmfbS4.png',
  'Sophie Hatter': 'https://s4.anilist.co/file/anilistcdn/character/large/b508-ONXMgE281eHe.jpg',
  'Usagi Tsukino': 'https://s4.anilist.co/file/anilistcdn/character/large/b2030-GQvVYPEYkXCy.jpg',
  'Yoko Littner': 'https://s4.anilist.co/file/anilistcdn/character/large/b2063-7BKqQbrhtDD2.png',
  'Yukino Yukinoshita': 'https://s4.anilist.co/file/anilistcdn/character/large/b67067-gqhgjlni0Bcf.png',
};

/**
 * Optional joke/mascot picks — comic-relief characters that aren't "waifus"
 * at all. Off by default; a host can opt in from the settings panel to mix
 * them into the auction pool as a surprise.
 */
const TROLL_RAW_DATA = [
  ['One Piece', ['Tony Tony Chopper', 'Usopp']],
  ['Fairy Tail', ['Happy', 'Plue']],
  ['Bleach', ['Kon']],
  ['Dragon Ball', ['Master Roshi', 'Hercule Satan']],
  ['One Punch Man', ['Saitama']],
  ['Naruto', ['Might Guy', 'Rock Lee']],
  ["JoJo's Bizarre Adventure", ['Robert E. O. Speedwagon']],
  ['Death Note', ['Ryuk']],
  ['Assassination Classroom', ['Korosensei']],
  ['My Hero Academia', ['Minoru Mineta']],
  ['Jujutsu Kaisen', ['Panda']],
  ['Demon Slayer', ['Zenitsu Agatsuma']],
  ['Spy x Family', ['Bond Forger']],
];

const TROLL_CHARACTER_IMAGES = {
  'Bond Forger': 'https://s4.anilist.co/file/anilistcdn/character/large/b169679-EFPubVtZFYom.jpg',
  'Happy': 'https://s4.anilist.co/file/anilistcdn/character/large/b5188-1jTaic3aJ7Ds.jpg',
  'Hercule Satan': 'https://s4.anilist.co/file/anilistcdn/character/large/9377.jpg',
  'Kon': 'https://s4.anilist.co/file/anilistcdn/character/large/1089.jpg',
  'Korosensei': 'https://s4.anilist.co/file/anilistcdn/character/large/b65643-jimrOw0RGtoB.png',
  'Master Roshi': 'https://s4.anilist.co/file/anilistcdn/character/large/b6167-aMPt1bHf5YbV.jpg',
  'Might Guy': 'https://s4.anilist.co/file/anilistcdn/character/large/b307-xieUEdhdTVwQ.png',
  'Minoru Mineta': 'https://s4.anilist.co/file/anilistcdn/character/large/b89244-VVwK9loDHeTV.png',
  'Panda': 'https://s4.anilist.co/file/anilistcdn/character/large/b137974-9qnK3DPrvLKh.jpg',
  'Plue': 'https://s4.anilist.co/file/anilistcdn/character/large/5879.jpg',
  'Robert E. O. Speedwagon': 'https://s4.anilist.co/file/anilistcdn/character/large/n21938-7iTMOJ4i6ET8.png',
  'Rock Lee': 'https://s4.anilist.co/file/anilistcdn/character/large/b306-oUTOO45xInXt.png',
  'Ryuk': 'https://s4.anilist.co/file/anilistcdn/character/large/b75-IkEpzO21LgFy.jpg',
  'Saitama': 'https://s4.anilist.co/file/anilistcdn/character/large/b73935-ON5d0mAcrItd.jpg',
  'Tony Tony Chopper': 'https://s4.anilist.co/file/anilistcdn/character/large/b309-H64NhbJ2ywIQ.jpg',
  'Usopp': 'https://s4.anilist.co/file/anilistcdn/character/large/b724-GFGgI9AJQkfy.jpg',
  'Zenitsu Agatsuma': 'https://s4.anilist.co/file/anilistcdn/character/large/b129131-FZrQ7lSlxmEr.png',
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

const TROLL_CHARACTERS = [];
for (const [anime, names] of TROLL_RAW_DATA) {
  const animeColor = colorFor(anime);
  for (const name of names) {
    TROLL_CHARACTERS.push({
      id: `${slugify(anime)}__${slugify(name)}`,
      name,
      anime,
      color: animeColor,
      image: TROLL_CHARACTER_IMAGES[name] || null,
      isTroll: true,
    });
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function freshPool({ includeTroll = false } = {}) {
  // Return a shuffled deep copy so each room gets its own independent order.
  const source = includeTroll ? [...CHARACTERS, ...TROLL_CHARACTERS] : CHARACTERS;
  return shuffle(source.map((c) => ({ ...c })));
}

module.exports = { CHARACTERS, TROLL_CHARACTERS, freshPool };
