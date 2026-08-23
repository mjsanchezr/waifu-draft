# 💜 Waifu Draft

Juego de subastas en tiempo real para 2-4 jugadores. Cada jugador empieza con
**$100**, se van subastando personajes uno a uno (el que más ofrece se lo
lleva) hasta que todos tienen **5 waifus**. Después empieza la votación:
ronda por ronda se enfrentan las primeras waifus de cada jugador entre sí,
luego las segundas, etc. La que más votos reciba en cada ronda suma un punto
para su dueño. Gana quien más rondas se lleve.

Incluye 53 personajes de 30 animes distintos (Re:Zero, SxF, AoT, Bleach,
Fairy Tail, One Piece, Jujutsu Kaisen, Frieren, Chainsaw Man, y más).

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
