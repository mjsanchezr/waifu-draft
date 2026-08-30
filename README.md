# 💜 Waifu Draft

🔴 **Jugar ahora**: https://waifu-draft.onrender.com
(plan gratuito de Render — si nadie ha entrado en un rato tarda ~30-50s en
despertar la primera vez que alguien abre el enlace)

Juego de subastas en tiempo real para 2-4 jugadores. Cada jugador empieza con
**$100**, se van subastando personajes uno a uno (el que más ofrece se lo
lleva) hasta que todos tienen el mismo número de waifus (5 por defecto,
configurable). Después empieza la votación: ronda por ronda se enfrentan las
primeras waifus de cada jugador entre sí, luego las segundas, etc. La que
más votos reciba en cada ronda suma un punto para su dueño. Gana quien más
rondas se lleve.

Incluye 114 personajes de 69 animes distintos (Re:Zero, SxF, AoT, Bleach,
Fairy Tail, One Piece, Jujutsu Kaisen, Frieren, Chainsaw Man, Fate/stay
night, Code Geass, KonoSuba, Overlord, Sailor Moon, Madoka Magica, Studio
Ghibli, y muchos más), cada uno con su
imagen oficial.

**Imágenes**: los retratos se enlazan directamente desde el CDN público de
[AniList](https://anilist.co) (`s4.anilist.co`), que expone su API
justamente para que apps de terceros muestren estas imágenes — no se
redistribuyen copias en este repo. Si AniList cambiara o retirase alguna
URL, el personaje afectado simplemente se quedaría sin miniatura; el resto
del juego sigue funcionando igual. Nota honesta sobre la calidad: 230×345px
es el tamaño más grande que AniList ofrece para retratos de personaje (lo
confirmamos contra su API) — no existe una versión más "HD" que se pueda
pedir de ahí. Compensamos con mejor presentación (marcos, sombras, tamaños
de tarjeta ajustados) en vez de píxeles que la fuente no tiene.

**Personalización antes de empezar** (solo el host, desde la sala de
espera, o el interruptor "Waifus / Chicos" en la propia pantalla de
inicio):
- **Personajes**: "Waifus" (el catálogo de anime de siempre) o "Chicos" —
  63 actores y personajes reales/ficticios (Tom Holland, Chris Hemsworth,
  Leonardo DiCaprio, Jacob Elordi, personajes de Gossip Girl, Outer Banks,
  Big Time Rush, futbolistas, etc.), pensado para que quien prefiera
  subastar chicos en vez de waifus también tenga su versión del juego.
  Cambiar de modo también cambia el tema visual de toda la app a azul.
- **Modo de juego**: "Elegir personaje" (el nominador escoge de la lista),
  "Aleatorio" (el personaje de cada turno se sortea al instante), o
  "A ciegas" (se sortea igual que en aleatorio, pero solo se ve el anime —
  el nombre y la imagen del personaje quedan ocultos para todos hasta que
  alguien gana la puja).
- **Waifus/chicos por jugador**: de 3 a 10, en vez del 5 fijo original.
- **Moneda de la subasta**: "Dinero" ($20-$500, con botones rápidos
  +50/+100) o "Shots" (5-10) — para jugarlo como juego de beber, pujando
  tragos en vez de dólares. Bebe con responsabilidad.
- **Prohibir autovoto**: activado por defecto — nadie puede votar por su
  propia waifu en la ronda de votación.
- **Incluir personajes troll**: solo en modo "Waifus". Mezcla en la
  subasta 17 fichajes de broma que no son waifus en absoluto (Tony Tony
  Chopper, Speedwagon, Ryuk, Saitama, Korosensei, Usopp, Rock Lee, el
  perro Bond, y más) — apagado por defecto.

**Imágenes en modo "Chicos"**: se enlazan desde la API pública de
[Wikipedia](https://es.wikipedia.org) (`upload.wikimedia.org`), que aloja
fotos con licencia libre justamente para que se puedan reusar así — no se
redistribuyen copias en este repo, igual que con AniList. Para personajes
de ficción usamos la foto del actor que los interpreta, ya que los
artículos de los personajes casi nunca tienen una imagen libre propia.
Cada nombre de la lista original se verificó a mano (búsqueda + revisión
visual) antes de incluirlo; **63 de los ~70 nombres pedidos** están
incluidos. Los 5 que se quedaron fuera (Ben Florian, Nuno Gallego, Héctor
Fort, Ronen Rubinstein, Corey Mylchreest) no tienen ninguna foto con
licencia libre localizable — ni en su artículo de Wikipedia ni en
Wikimedia Commons — así que no hay ninguna imagen legítima que se les
pueda asignar por ahora sin arriesgarse a mostrar a la persona
equivocada.

Nota sobre "que se vean jóvenes": Wikimedia Commons solo aloja fotos con
licencia libre, y la fotografía de famosos con licencia libre (Flickr CC,
fotógrafos de convenciones, etc.) se volvió común recién a mediados de
los 2000. Para estrellas cuya etapa "20-30 años" fue en los 80-90
(Leonardo DiCaprio, Brad Pitt, Tom Cruise, Robert Downey Jr.) no existe
ninguna foto libre de esa época — la foto actual es la única opción libre
real. Para quienes su papel más conocido aquí fue en los 2000s-2010s sí
se consiguieron fotos de esa época (Chad Michael Murray y Paul Walker en
2007, por ejemplo); para otros (Kevin Jonas, Tom Welling, Ryan Reynolds,
Ian Somerhalder, Jensen Ackles, Robert Pattinson) se intentó pero no
apareció ninguna foto libre genuinamente distinta a la actual.

**Durante la subasta**, cualquiera puede pulsar "Saltar" para decir que no
le interesa la waifu en juego; en cuanto pujas, ya no puedes saltar. Si
todos los que faltaban por decidir saltan, la ronda se resuelve al
instante (sin ganador si nadie pujó, o para quien iba ganando si alguien
sí lo hizo) en vez de esperar el reloj completo.

## Cómo jugar

1. Un jugador crea una sala (host) y comparte el código de 4 letras.
2. Los demás (hasta 4 en total) se unen con ese código desde su propio
   móvil u ordenador.
3. El host pulsa "Empezar subasta". Por turnos, cada jugador nomina un
   personaje de la lista y todos pujan en tiempo real (30s para nominar,
   15s para pujar, con "anti-snipe": si alguien puja en los últimos 5s el
   reloj se alarga 5s más).
4. El presupuesto se reserva automáticamente: no puedes pujar tanto que te
   quedes sin al menos $1 para cada hueco que te falte por llenar.
5. Cuando todos tienen 5 waifus, empieza la votación por rondas (25s por
   ronda, o antes si todos ya votaron).
6. Al final se muestra la clasificación y el host puede pulsar "Jugar otra
   vez" para repetir con el mismo grupo.

## Arquitectura (para que el despliegue sea trivial)

- **Backend**: Node.js + Express + Socket.IO. Todo el estado de la partida
  vive en memoria del servidor (sin base de datos) — perfecto para un
  contenedor gratuito de un solo proceso.
- **Frontend**: HTML/CSS/JS sin build step, servido como estático por el
  mismo servidor Express.
- **Un único contenedor**: el `Dockerfile` empaqueta las dos cosas juntas,
  así que solo hace falta desplegar un servicio.

## Ejecutar en local

```bash
npm install
npm start
# abre http://localhost:3000 en varias pestañas/dispositivos
```

## Desplegar gratis en Render (recomendado)

Render tiene un plan gratuito para "Web Services", soporta Docker
directamente y solo pide enlazar el repo de GitHub — no requiere tarjeta.

1. Sube este repo a tu cuenta de GitHub (ya está hecho si usaste este
   mismo proyecto).
2. Entra en [render.com](https://render.com) y crea una cuenta gratuita.
3. Click **New +** → **Blueprint** → conecta tu repo de GitHub.
4. Render detecta automáticamente `render.yaml` y el `Dockerfile` — solo
   hay que confirmar. En unos minutos tendrás una URL pública tipo
   `https://waifu-draft.onrender.com`.
5. Comparte esa URL con tus amigos y a jugar.

También puedes usar el botón de despliegue en un click (sustituye la URL
del repo si has hecho un fork):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mjsanchezr/waifu-draft)

**Nota sobre el plan gratuito**: el servicio se "duerme" tras ~15 minutos
sin tráfico y tarda unos 30-50s en despertar con la primera visita. Para
una partida entre amigos es perfecto: abre el enlace un par de minutos
antes de jugar.

⚠️ El estado de las partidas vive en memoria — si el servicio se reinicia
(por ejemplo tras dormirse y despertar, o al desplegar una actualización)
las salas activas se pierden. No pasa nada, se crean salas nuevas al
instante.

### Alternativas igual de gratuitas

Cualquier plataforma que despliegue un `Dockerfile` desde GitHub sirve
igual de bien (por ejemplo [Fly.io](https://fly.io) o
[Railway](https://railway.app)); solo cambia el proceso de conexión de la
cuenta, el `Dockerfile` no necesita tocarse.

## Estructura del proyecto

```
server/
  index.js       Servidor Express + Socket.IO, gestión de salas
  room.js        Toda la lógica del juego (subasta, votación, turnos)
  characters.js  Lista maestra de personajes/animes
public/
  index.html     Las 5 pantallas (inicio, sala, subasta, votación, resultados)
  style.css      Tema visual
  app.js         Cliente Socket.IO + renderizado
Dockerfile       Imagen de un solo contenedor
render.yaml      Blueprint para desplegar en Render con un click
```
