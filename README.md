<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=220&section=header&text=%E2%99%AA%20Muriel%20Server%20%E2%99%AB&fontSize=56&fontColor=ffffff&animation=fadeIn&desc=search%20%E2%9C%A6%20download%20%E2%9C%A6%20stream%20%E2%80%94%20over%20plain%20HTTP&descSize=18&descAlignY=72" alt="Muriel Server banner" width="100%">

<a href="https://github.com/cloverscripts/riff-muriel"><img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=20&duration=3200&pause=900&color=A78BFA&center=true&vCenter=true&width=640&lines=%E2%9D%AF+search+YouTube%2C+YT+Music+%26+SoundCloud;%E2%9D%AF+download+as+mp3%2C+flac%2C+opus+and+more;%E2%9D%AF+run+it+at+home%2C+on+a+phone%2C+or+on+Railway" alt="typing animation"></a>

<br>

![node](https://img.shields.io/badge/node-18%2B-5fa04e?style=for-the-badge&logo=nodedotjs&logoColor=white)
![docker](https://img.shields.io/badge/docker-ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![railway](https://img.shields.io/badge/deploy-railway-0b0d0e?style=for-the-badge&logo=railway&logoColor=white)
![yt-dlp](https://img.shields.io/badge/powered%20by-yt--dlp-ff0000?style=for-the-badge&logo=youtube&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-a78bfa?style=for-the-badge)

<!--
  GIF SLOT 1 (hero). Paste a direct .gif link, then remove the comment markers.
  <img src="PASTE_DIRECT_GIF_LINK_HERE" width="320" alt="hero gif">
-->

```text
╭────────────────────────────────────────────────────╮
│   ♪  find a song  ──▶  grab the file  ──▶  done    │
╰────────────────────────────────────────────────────╯
```

</div>

## ✦ ━━━━━━━━━━ about ━━━━━━━━━━ ✦

This is the HTTP server that lives inside [Muriel](https://github.com/cloverscripts/riff-muriel), a lightweight music player, pulled out so it runs on its own. No Electron window, no app. You start it and you get a small JSON API that you can talk to with curl, a Discord or WhatsApp bot, a script, anything.

I wanted something I could point a bot at and say "find this song, get me the file". That is really all it does, and it needs no API keys.

<!--
  GIF SLOT 2 (small reaction gif)
  <p align="center"><img src="PASTE_DIRECT_GIF_LINK_HERE" width="260" alt="reaction gif"></p>
-->

## ❖ contents

&nbsp;&nbsp;◆ [what it can do](#-what-it-can-do)  
&nbsp;&nbsp;◆ [how it works](#-how-it-works)  
&nbsp;&nbsp;◆ [quick start](#-quick-start)  
&nbsp;&nbsp;◆ [the api](#-the-api)  
&nbsp;&nbsp;◆ [environment variables](#-environment-variables)  
&nbsp;&nbsp;◆ [deploy on railway](#-deploy-on-railway)  
&nbsp;&nbsp;◆ [using it from a bot](#-using-it-from-a-bot)  
&nbsp;&nbsp;◆ [troubleshooting](#-troubleshooting)  
&nbsp;&nbsp;◆ [unicode palette](#-unicode-palette)  
&nbsp;&nbsp;◆ [credits](#-credits)

## ✧ what it can do

| &nbsp; | thing | what you get |
| :-: | --- | --- |
| ⌕ | **search** | YouTube, YouTube Music and SoundCloud, up to 50 results a query |
| ⇩ | **download** | mp3, m4a, flac, opus, wav or ogg with tags and cover art embedded |
| ✂ | **trim** | cut a track with `start` and `end` (seconds) while downloading |
| ➤ | **serve** | every download comes back with a link to fetch the file |
| ♫ | **cache** | fetched tracks are kept and listed, repeat requests are instant |
| ✦ | **extras** | lyrics, album and artist lookups, playlist imports, Last.fm scrobbling |

Only search and download are documented in detail here. The other routes exist, I just have not written them up.

## ⟡ how it works

Search tries the lightest option first and only falls back to yt-dlp when it has to.

```text
                    /api/search
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
     youtube          ytmusic         soundcloud
        │                │                │
  scrape results    innertube API       yt-dlp
        │                │
    (fallback)       (fallback)
      yt-dlp           yt-dlp
```

Download always goes through yt-dlp, with ffmpeg doing the converting and trimming. If a track is already cached, ffmpeg re-encodes the cached file and yt-dlp is skipped.

The file is saved on the machine running the server. The JSON reply includes a `downloadUrl` so whatever called the API can go and fetch it.

<details>
<summary><b>▸ download flow in detail</b></summary>

&nbsp;

1. check the cache for that track id
2. cached: run ffmpeg on it (bitrate, trim, metadata) and write it to the downloads folder
3. not cached: run yt-dlp with `-x --audio-format <format>` and embed metadata and thumbnail
4. if that fails, retry once without the android client option
5. if the url looks unsafe or comes from Deezer, search YouTube for `<artist> <title> official audio` instead
6. clean up partial files if anything goes wrong

</details>

## ➤ quick start

You need Node 18 or newer, plus `yt-dlp` and `ffmpeg` on your PATH.

```bash
# macOS
brew install yt-dlp ffmpeg

# Debian / Ubuntu
sudo apt install ffmpeg python3
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Start it with a token of your own:

```bash
MURIEL_TOKEN=your-long-random-secret node start.js
```

It listens on port `38472` unless you set `PORT`. Try a search:

```bash
export T=your-long-random-secret
curl -s -H "x-muriel-token: $T" \
  "http://127.0.0.1:38472/api/search?q=daft+punk&platform=youtube&limit=5"
```

<!--
  GIF SLOT 3 ("it works" moment)
  <p align="center"><img src="PASTE_DIRECT_GIF_LINK_HERE" width="260" alt="celebration gif"></p>
-->

## ⌁ the api

Every route needs your token, sent as a header or in the query string:

```text
x-muriel-token: <your token>
?t=<your token>
```

### ⌕ search

`GET /api/search`

| param | meaning | default |
| --- | --- | --- |
| `q` | what to search for | required |
| `platform` | `youtube`, `ytmusic` or `soundcloud` | `youtube` |
| `limit` | 1 to 50 | 20 |

```bash
curl -s -H "x-muriel-token: $T" \
  "$B/api/search?q=daft+punk&platform=ytmusic&limit=5"
```

```json
{
  "success": true,
  "tracks": [
    {
      "id": "FGBhQbmPwH8",
      "title": "One More Time",
      "artist": "Daft Punk",
      "duration": 320,
      "thumbnail": "https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=FGBhQbmPwH8",
      "platform": "youtube",
      "isCached": false
    }
  ]
}
```

Results are cached for five minutes and the top hit is prefetched in the background, so the follow-up download is quicker.

### ⇩ download

`GET /api/download`

| param | meaning |
| --- | --- |
| `url` | the track url from a search result |
| `id` | the track id (helps the cache) |
| `title`, `artist` | used for the filename and tags |
| `format` | `mp3` (default), `m4a`, `flac`, `opus`, `wav`, `ogg` |
| `quality` | yt-dlp audio quality, `0` is best |
| `start`, `end` | trim, in seconds |

```bash
curl -s -G -H "x-muriel-token: $T" "$B/api/download" \
  --data-urlencode "url=https://www.youtube.com/watch?v=FGBhQbmPwH8" \
  --data-urlencode "id=FGBhQbmPwH8" \
  --data-urlencode "title=One More Time" \
  --data-urlencode "artist=Daft Punk" \
  --data-urlencode "format=mp3"
```

```json
{
  "success": true,
  "filename": "Daft Punk - One More Time.mp3",
  "directory": "/data/Downloads",
  "downloadUrl": "https://your-host/api/downloaded-track?name=Daft%20Punk%20-%20One%20More%20Time.mp3&t=<token>"
}
```

Open `downloadUrl` in a browser or fetch it with curl to get the audio file. It supports range requests, so it streams too. The link carries your token, so treat it like one.

### ♫ saved files

```bash
curl -s -H "x-muriel-token: $T" "$B/api/offline-library"
```

Lists everything in the cache with size, title and artist.

## ⚙ environment variables

| variable | what it does | default |
| --- | --- | --- |
| `MURIEL_TOKEN` | the secret every request must send | required on Railway |
| `PORT` | port to listen on | `38472` |
| `HOST` | address to bind | `127.0.0.1` (the Dockerfile sets `0.0.0.0`) |
| `MURIEL_ALLOW_ANY_HOST` | accept requests for hostnames other than localhost | `1`, set by `start.js` |
| `MURIEL_DATA_DIR` | where the cache and library live | `~/.cache/muriel` |
| `MURIEL_YTDLP`, `MURIEL_FFMPEG` | full path to a specific binary | looked up on PATH |

The original app refuses requests whose Host header is not localhost, to stop DNS rebinding against the desktop build. Behind a tunnel or on a cloud host that check has to go, which is why `start.js` turns it off.

## ⛭ deploy on railway

The folder already has a `Dockerfile` and a `railway.json`.

1. Push the contents of this folder to a GitHub repo. The Dockerfile has to sit at the root.
2. On Railway, create a new project and deploy from that repo.
3. In Variables, add `MURIEL_TOKEN` with a long random value. `openssl rand -hex 24` makes a good one.
4. Under Settings, then Networking, generate a domain.
5. Optional but worth it: add a Volume mounted at `/data`. Without one, downloads disappear on every redeploy.
6. Test it:

```bash
curl -s -H "x-muriel-token: YOUR_TOKEN" \
  "https://YOUR-APP.up.railway.app/api/search?q=daft+punk&platform=youtube&limit=5"
```

On Railway the server refuses to start without `MURIEL_TOKEN`, and it does not print the token in the logs.

<!--
  GIF SLOT 4 (deploy section)
  <p align="center"><img src="PASTE_DIRECT_GIF_LINK_HERE" width="260" alt="deploy gif"></p>
-->

## ✿ using it from a bot

Search, download, then pull the audio bytes so you can send the file straight into a chat.

```js
const B = "https://YOUR-APP.up.railway.app";
const headers = { "x-muriel-token": process.env.MURIEL_TOKEN };

// 1. search
const q = encodeURIComponent("daft punk one more time");
const s = await (await fetch(`${B}/api/search?q=${q}&limit=1`, { headers })).json();
const track = s.tracks[0];

// 2. download
const p = new URLSearchParams({
  url: track.url, id: track.id, title: track.title, artist: track.artist, format: "mp3",
});
const d = await (await fetch(`${B}/api/download?${p}`, { headers })).json();

// 3. get the file itself
const audio = Buffer.from(await (await fetch(d.downloadUrl)).arrayBuffer());
```

## ✧ troubleshooting

<details>
<summary><b>▸ I get {"success":false,"error":"forbidden"}</b></summary>

&nbsp;

Three usual causes. The token is wrong or missing. Or you are going through a tunnel or cloud host and `MURIEL_ALLOW_ANY_HOST` is not `1` (`node start.js` sets it, running `node server.js` directly does not). Or the tunnel url changed, since free tunnels hand out a new one every time they reconnect.

To tell which one it is, call the server on its own machine:

```bash
curl -s -H "x-muriel-token: $T" "http://127.0.0.1:38472/api/offline-library"
```

If that works but the public url does not, it is the host check or a stale url.

</details>

<details>
<summary><b>▸ search works but download fails</b></summary>

&nbsp;

Make sure `yt-dlp` and `ffmpeg` are installed and on PATH. Run `yt-dlp --version` and `ffmpeg -version` on the same machine as the server. Old yt-dlp versions break often because YouTube keeps changing things, so update it first.

</details>

<details>
<summary><b>▸ "Sign in to confirm you're not a bot"</b></summary>

&nbsp;

YouTube blocks a lot of datacenter IP addresses, and Railway is one of them. Running the server from a home connection usually avoids it. On a cloud host you would have to hand yt-dlp browser cookies, which this version does not wire up yet.

</details>

<details>
<summary><b>▸ YouTube Music search returns nothing</b></summary>

&nbsp;

It uses YouTube's internal API with a hardcoded client version. If that goes stale, the server backs off for five minutes after three failures and falls back to yt-dlp. Searching with `platform=youtube` is the reliable path.

</details>

<details>
<summary><b>▸ files vanish after a redeploy</b></summary>

&nbsp;

Containers have no permanent disk. Attach a Railway Volume at `/data`.

</details>

## ❖ unicode palette

Everything decorative in this README is plain Unicode text, no images, so it renders anywhere. Steal whatever you like.


```text
♪ ──────── ✦ ──────── ♫
```

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=110&section=footer" alt="footer" width="100%">

</div>

