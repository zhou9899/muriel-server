<div align="center">

# ♪ Muriel Server ♫

**Search, download, stream and read lyrics for music over plain HTTP.**

![node](https://img.shields.io/badge/node-18%2B-5fa04e?style=for-the-badge&logo=nodedotjs&logoColor=white)
![docker](https://img.shields.io/badge/docker-ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![railway](https://img.shields.io/badge/deploy-railway-0b0d0e?style=for-the-badge&logo=railway&logoColor=white)
![yt-dlp](https://img.shields.io/badge/powered%20by-yt--dlp-ff0000?style=for-the-badge&logo=youtube&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-a78bfa?style=for-the-badge)

</div>

## About

This is the HTTP server that lives inside [Muriel](https://github.com/cloverscripts/riff-muriel), a lightweight music player, pulled out so it runs on its own. There is no Electron window and no app. You start it and get a JSON API you can call with curl, a bot, a script, or anything else that speaks HTTP.

It is a single Node process built on the standard `http` module, with no npm dependencies. `yt-dlp` and `ffmpeg` do the heavy lifting.

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [API reference](#api-reference)
  - [Search and discovery](#search-and-discovery)
  - [Downloading](#downloading)
  - [Streaming and cache](#streaming-and-cache)
  - [Local library](#local-library)
  - [Lyrics](#lyrics)
  - [Translation](#translation)
  - [Player state](#player-state)
  - [System](#system)
- [Examples](#examples)
- [Environment variables](#environment-variables)
- [Deploy on Railway](#deploy-on-railway)
- [Troubleshooting](#troubleshooting)
- [Project layout](#project-layout)

## Features

| | Feature | Details |
| :-: | --- | --- |
| ⌕ | **Search** | YouTube, YouTube Music and SoundCloud, up to 50 results per query |
| ⇩ | **Download** | mp3, m4a, flac, opus, wav or ogg with tags and cover art embedded |
| ✂ | **Trim** | Cut a track with `start` and `end` (seconds) while downloading |
| ➤ | **Serve** | Every download returns a link to fetch the file, with range requests so it streams |
| ♫ | **Cache** | Fetched tracks are kept on disk and listed, repeat requests are instant |
| ✎ | **Lyrics** | Time-synced lyrics from LRCLIB with Genius as fallback, plus custom overrides and word-level karaoke timings |
| ◎ | **Browse** | Artist info, artist albums, album tracks, trending charts and hot picks |
| ✦ | **Recommend** | "Vibe" and "discover" endpoints that build suggestions from listening history |
| ⌂ | **Library** | A local library of your own audio files with covers |
| 文 | **Translate** | Translate lyrics lines and UI strings |

## How it works

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

Results are cached for five minutes and the top hit is prefetched in the background, so the follow-up download is quicker.

Download always goes through yt-dlp, with ffmpeg converting and trimming.

<details>
<summary><b>▸ Download flow in detail</b></summary>

1. Check the cache for that track id.
2. Cached: run ffmpeg on the cached file (bitrate, trim, metadata) and write it to the downloads folder.
3. Not cached: run yt-dlp with `-x --audio-format <format>` and embed metadata and thumbnail.
4. If that fails, retry once without the android client option.
5. If the url looks unsafe or comes from Deezer, search YouTube for `<artist> <title> official audio` instead.
6. Clean up partial files if anything goes wrong.

</details>

<details>
<summary><b>▸ Lyrics flow in detail</b></summary>

1. A custom lyrics file saved for that title and artist wins.
2. Otherwise a previously fetched copy on disk is used.
3. Otherwise lyrics are fetched online from the preferred source (LRCLIB by default), then from the other one.
4. Hits are saved to disk and cached in memory. A miss is retried after 10 minutes.
5. Simultaneous requests for the same song share one lookup.

</details>

## Quick start

You need Node 18 or newer, plus `yt-dlp` and `ffmpeg` on your PATH.

```bash
# macOS
brew install yt-dlp ffmpeg

# Debian / Ubuntu
sudo apt install ffmpeg python3
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Start the server:

```bash
node start.js
```

It listens on port `38472` unless you set `PORT`. Try a search:

```bash
B=http://127.0.0.1:38472
curl -s "$B/api/search?q=daft+punk&platform=youtube&limit=5"
```

You can also check that the tools are found:

```bash
curl -s "$B/api/tools-status"
```

## API reference

All routes live under `/api/` and return JSON unless noted. Query parameters go in the URL. `POST` routes take a JSON body of up to 2 MB, except `/api/encode`.

Most JSON replies include `"success": true` or `"success": false` with an `error` message.

### Search and discovery

#### `GET /api/search`

| param | meaning | default |
| --- | --- | --- |
| `q` | what to search for | required |
| `platform` | `youtube`, `ytmusic` or `soundcloud` | `youtube` |
| `limit` | 1 to 50 | 20 |

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

#### `GET /api/artist`

Artist profile information.

| param | meaning |
| --- | --- |
| `name` | artist name (required) |
| `id` | optional artist id to skip the lookup |
| `video` | optional video id used to resolve the artist |

Returns `{ "success": true, "artist": { ... } }`.

#### `GET /api/artist-matches`

Candidate artists whose name matches `name` exactly (up to 8). Useful when several artists share a name. Returns `{ "success": true, "artists": [...] }`.

| param | meaning |
| --- | --- |
| `name` | artist name |

#### `GET /api/artist-albums`

An artist's albums. Takes `name`, plus optional `id` and `video` as in `/api/artist`. Returns `{ "success": true, "albums": [...] }`, or an empty list when `name` is missing.

#### `GET /api/albums/search`

Search albums by `q`. Returns `{ "success": true, "albums": [...] }`, empty when `q` is blank.

#### `GET /api/albums/tracks`

Track list for an album. `/api/album` and `/api/album-tracks` are aliases of the same route.

| param | meaning | default |
| --- | --- | --- |
| `id` | numeric album id | none |
| `title`, `artist` | look an album up by name when you have no id | none |
| `source` | `itunes` or `deezer` | `itunes` |

Send either `id` or `title`. A non-numeric `id`, or neither, returns `400`.

#### `GET /api/trending`

The Apple Music "most played" chart for the server's region. Returns `{ "success": true, "tracks": [...] }`.

#### `GET /api/hot`

Hot picks. Takes `limit` (1 to 25, default 12). Returns `success`, a `title` and a list of tracks.

#### `POST /api/vibe`

Recommendations based on what someone has been listening to.

```json
{
  "history": [{ "title": "...", "artist": "..." }],
  "favorites": [{ "title": "...", "artist": "..." }],
  "limit": 10,
  "seeds": [],
  "avoid": [],
  "refresh": false
}
```

`limit` is clamped to 4 to 16. Everything is optional. Returns `{ "success": true, ... }` with the recommended tracks.

#### `POST /api/discover`

A discovery feed built from `history` and `favorites` arrays, same shape as above. Returns `{ "success": true, ... }`.

### Downloading

#### `GET /api/download`

Downloads and converts a track to the server's downloads folder.

| param | meaning |
| --- | --- |
| `url` | the track url from a search result |
| `id` | the track id (helps the cache) |
| `title`, `artist` | used for the filename and tags |
| `format` | `mp3` (default), `m4a`, `flac`, `opus`, `wav`, `ogg` |
| `quality` | yt-dlp audio quality, `0` is best |
| `start`, `end` | trim, in seconds |
| `raw` | `1` or `true` to skip the download de-duplication |
| `streamUrl` | an already-resolved stream url, if you have one |

```bash
curl -s -G "$B/api/download" \
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
  "downloadUrl": "https://your-host/api/downloaded-track?name=Daft%20Punk%20-%20One%20More%20Time.mp3"
}
```

Identical simultaneous requests share one download. Missing track information returns an error.

#### `GET /api/downloaded-track`

Serves a downloaded file by `name`. It supports range requests, so it streams. This is the link `downloadUrl` points to.

#### `POST /api/encode`

Takes raw WAV audio in the request body (up to 500 MB) and encodes it into the downloads folder.

| param | meaning | default |
| --- | --- | --- |
| `title`, `artist` | used for the filename | `untitled`, `unknown artist` |
| `format` | `mp3`, `m4a`, `flac`, `opus`, `wav`, `ogg` | `mp3` |
| `quality` | `0` = 320k, `2` = 256k, `4` = 192k, `5` = 128k | `0` |

#### `GET /api/tmp-file`

Serves a temporary `.wav` render from the downloads `.tmp` folder by `name`. Only `.wav` file names with simple characters are accepted.

### Streaming and cache

#### `GET /api/stream-info`

Gets something you can play right now for a track. If the track is cached or already downloaded you get a local `streamUrl` with `isLocal: true` straight away. Otherwise the server resolves and caches it first.

| param | meaning |
| --- | --- |
| `url`, `id` | track url and id |
| `platform` | defaults to `youtube` |
| `title`, `artist`, `duration`, `thumbnail` | track details, stored with the cached file |

Returns `{ "success": true, "isLocal": true, "streamUrl": "..." }`, or `{ "success": false, "error": "..." }` with status `500` if the stream could not be resolved.

#### `GET /api/prefetch`

Starts caching a track in the background and returns `{ "success": true }` immediately.

| param | meaning |
| --- | --- |
| `url`, `id` | track url and id |
| `platform` | defaults to `youtube` |
| `title`, `artist`, `duration`, `thumbnail` | optional track details |

#### `GET /api/check-cache`

Is track `id` cached? Returns `{ "cached": true, "streamUrl": "..." }` or `{ "cached": false, "streamUrl": null }`.

#### `GET /api/local-track`

Streams a cached track by `id`, with range support.

#### `GET /api/local-thumbnail`

The cached thumbnail (JPEG) for track `id`. Returns `404` if there is none.

#### `GET /api/audio-proxy`

Streams a remote audio file through the server. Takes `url`. Only `http` and `https` addresses to public hosts are allowed. Private and local addresses are refused.

#### `GET /api/offline-library`

Lists everything in the cache.

```json
{
  "success": true,
  "count": 1,
  "totalBytes": 8123456,
  "tracks": [
    {
      "id": "FGBhQbmPwH8",
      "cleanId": "FGBhQbmPwH8",
      "title": "One More Time",
      "artist": "Daft Punk",
      "duration": 320,
      "thumbnail": "https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg",
      "localThumbnail": "...",
      "platform": "youtube",
      "fileSize": 8123456,
      "lastPlayed": 1731800000000,
      "analysis": null
    }
  ]
}
```

#### `POST /api/offline-delete`

Deletes one cached track and its thumbnail. Takes `id` as a query parameter.

#### `POST /api/clear-offline-library`

Deletes **every** cached audio file and thumbnail and resets the metadata. There is no confirmation step.

#### `GET /api/track-analysis`, `POST /api/track-analysis`

Read or store audio-analysis data for a track.

- `GET ?id=<trackId>` returns `{ "success": true, "analysis": ... }` (`null` if none).
- `POST` with `{ "id": "<trackId>", "analysis": { ... } }` saves it and returns `{ "success": true }`.

### Local library

Your own audio files, separate from the download cache. Items are files already placed in the server's library folder, named `local_<12 hex chars>.<ext>`.

#### `GET /api/library`

Lists library items, newest first, as `[{ id, platform: "local", title, artist, duration, thumbnail }]`.

#### `POST /api/library-add`

Registers files that are already in the library folder.

```json
{
  "items": [
    { "id": "local_abc123", "file": "local_0123456789ab.mp3", "name": "Daft Punk - One More Time", "ext": "mp3" }
  ]
}
```

A name with ` - ` is split into artist and title. A leading track number is stripped. Returns `{ "success": true, "count": <added> }`.

#### `POST /api/library-update`

Sets a library item's duration: `{ "id": "...", "duration": 320 }`.

#### `POST /api/library-remove`

Removes an item and deletes its file. Takes `{ "id": "..." }` in the body or `?id=` in the URL.

#### `GET /api/library-file`

Streams a library file by `id`.

#### `GET /api/local-cover`

Cover art (JPEG) for a library item by `id`. Returns `404` if there is none.

### Lyrics

#### `GET /api/lyrics`

| param | meaning | default |
| --- | --- | --- |
| `title` | song title | none |
| `artist` | artist name | none |
| `duration` | track length in seconds, helps LRCLIB pick the right version | `0` |
| `source` | which site to try first, `lrclib` or `genius` | `lrclib` |
| `online` | set to `0` to skip the web and only use saved or custom lyrics | online allowed |

```bash
curl -s -G "$B/api/lyrics" \
  --data-urlencode "title=One More Time" \
  --data-urlencode "artist=Daft Punk" \
  --data-urlencode "duration=320"
```

```json
{ "success": true, "lyrics": "[00:12.34] Line one\n[00:15.80] Line two", "isCustom": false }
```

- When LRCLIB has synced lyrics you get LRC text with `[mm:ss.xx]` timestamps. Otherwise you get plain text. Genius is always plain text.
- If nothing is found, `success` is still `true` and `lyrics` is empty or `null`. Check `lyrics`, not `success`.
- `isCustom` is `true` when the text came from a custom override.

#### `GET /api/lyrics-words`

Word-level karaoke timings from NetEase. Takes `title`, `artist` and `duration`. Returns `{ "success": true, "lines": [...] }`. `success` is `false` and `lines` is empty when nothing matches.

#### `POST /api/save-custom-lyrics`

Saves your own lyrics for a song, overriding the online ones. `title` and `artist` go in the query string and the body is JSON.

```bash
curl -s -X POST "$B/api/save-custom-lyrics?title=One%20More%20Time&artist=Daft%20Punk" \
  -H "Content-Type: application/json" \
  -d '{"lyrics":"[00:12.00] my own lyrics"}'
```

Returns `{ "success": true }`. After this, `/api/lyrics` returns it with `isCustom: true`.

### Translation

#### `POST /api/translate`

Translates lines, for example lyrics.

```json
{ "texts": ["Hello", "Good night"], "targetLang": "de" }
```

`texts` may also be sent as `lines`, and `targetLang` as `to`. The default language is `en`. Returns `{ "success": true, "translations": ["Hallo", "Gute Nacht"] }`.

#### `GET /api/i18n-batch`, `POST /api/i18n-batch`

UI string translation with a server-side dictionary.

- `GET ?target=<lang>` returns everything translated so far for that language.
- `POST` with `{ "target": "de", "texts": ["Settings", "Play"] }` translates up to 400 strings of up to 500 characters each. Returns `{ "success": true, "translations": [...], "complete": true|false }`. `complete: false` means some are still being translated, so ask again shortly.

### Player state

These routes let a front end publish what is playing and let other clients follow along.

#### `POST /api/state`

Send the current player state as any JSON object. The server keeps the latest one and pushes it to every connected stream. Returns `{ "success": true }`.

#### `GET /api/lyrics-stream`

A Server-Sent Events stream (`text/event-stream`). It sends the current state immediately, then a new `data:` event whenever someone posts to `/api/state`. This is a single global state shared by all clients, not a per-user one. Requests from a web page (those carrying an `Origin` header) are refused.

```bash
curl -N "$B/api/lyrics-stream"
```

### System

#### `GET /api/tools-status`

Reports whether `yt-dlp` and `ffmpeg` are available.

#### `GET /api/tools-install`

Starts installing the tools in the background and returns `{ "started": true }` straight away. Poll `/api/tools-status` to see when it finishes.

#### `GET /api/audio-output-info`

Information about the machine's current system audio output device.

Any unknown route returns `404 Not found`.

## Examples

### Search, download, then fetch the file and lyrics

```js
const B = "http://127.0.0.1:38472";

// 1. search
const q = encodeURIComponent("daft punk one more time");
const s = await (await fetch(`${B}/api/search?q=${q}&limit=1`)).json();
const track = s.tracks[0];

// 2. download
const p = new URLSearchParams({
  url: track.url, id: track.id, title: track.title, artist: track.artist, format: "mp3",
});
const d = await (await fetch(`${B}/api/download?${p}`)).json();

// 3. get the audio bytes
const audio = Buffer.from(await (await fetch(d.downloadUrl)).arrayBuffer());

// 4. get lyrics
const lp = new URLSearchParams({ title: track.title, artist: track.artist, duration: track.duration });
const l = await (await fetch(`${B}/api/lyrics?${lp}`)).json();
console.log(l.lyrics);
```

### Strip timestamps from synced lyrics

```js
const plain = lyrics.replace(/\[\d+:\d+(\.\d+)?\]\s*/g, "");
```

### Trim a clip

```bash
curl -s -G "$B/api/download" \
  --data-urlencode "url=https://www.youtube.com/watch?v=FGBhQbmPwH8" \
  --data-urlencode "id=FGBhQbmPwH8" \
  --data-urlencode "title=One More Time" \
  --data-urlencode "artist=Daft Punk" \
  --data-urlencode "start=30" --data-urlencode "end=75"
```

## Environment variables

| variable | what it does | default |
| --- | --- | --- |
| `PORT` | port to listen on | `38472` |
| `HOST` | address to bind | `127.0.0.1` (the Dockerfile sets `0.0.0.0`) |
| `MURIEL_ALLOW_ANY_HOST` | accept requests for hostnames other than localhost | `1`, set by `start.js` |
| `MURIEL_DATA_DIR` | where the cache and library live | `~/.cache/muriel` |
| `MURIEL_YTDLP`, `MURIEL_FFMPEG` | full path to a specific binary | looked up on PATH |
| `YT_COOKIES_B64` | base64 of a YouTube `cookies.txt`, hands yt-dlp a logged-in session | none |
| `YT_COOKIES_FILE` | path to a `cookies.txt` instead (for example on a volume) | none |
| `YT_PROXY` | proxy for yt-dlp, like `http://user:pass@host:port` | none |
| `YT_JS_RUNTIME` | JS runtime for yt-dlp, `node` in the Docker image | none |

The original app refuses requests whose Host header is not localhost, to stop DNS rebinding against the desktop build. Behind a tunnel or on a cloud host that check has to go, which is why `start.js` turns it off.

## Deploy on Railway

The folder already has a `Dockerfile` and a `railway.json`.

1. Push the contents of this folder to a GitHub repo. The Dockerfile has to sit at the root.
2. On Railway, create a new project and deploy from that repo.
3. Under Settings, then Networking, generate a domain.
4. Optional but worth it: add a Volume mounted at `/data`. Without one, downloads disappear on every redeploy.
5. Test it:

```bash
curl -s "https://YOUR-APP.up.railway.app/api/search?q=daft+punk&platform=youtube&limit=5"
```

## Troubleshooting

<details>
<summary><b>▸ I get {"success":false,"error":"forbidden"}</b></summary>

You are probably going through a tunnel or cloud host and `MURIEL_ALLOW_ANY_HOST` is not `1` (`node start.js` sets it, running `node server.js` directly does not). Or the tunnel url changed, since free tunnels hand out a new one every time they reconnect.

To tell which one it is, call the server on its own machine:

```bash
curl -s "http://127.0.0.1:38472/api/offline-library"
```

If that works but the public url does not, it is the host check or a stale url.

</details>

<details>
<summary><b>▸ Search works but download fails</b></summary>

Make sure `yt-dlp` and `ffmpeg` are installed and on PATH. Run `yt-dlp --version` and `ffmpeg -version` on the same machine as the server, or call `/api/tools-status`. Old yt-dlp versions break often because YouTube keeps changing things, so update it first.

</details>

<details>
<summary><b>▸ "Sign in to confirm you're not a bot"</b></summary>

YouTube blocks a lot of datacenter IP addresses, and Railway is one of them. Running the server from a home connection usually avoids it. On a cloud host you have two ways around it.

**Cookies.** Give yt-dlp a logged-in YouTube session.

1. In a private or incognito window, log in to YouTube, then export `youtube.com` cookies in Netscape format with a browser extension such as "Get cookies.txt LOCALLY". Close the window afterwards so the browser does not rotate them.
2. Turn the file into one line of base64:

```bash
base64 -i cookies.txt | tr -d '\n' | pbcopy      # macOS
base64 -w0 cookies.txt                            # Linux
```

3. In Railway, add a variable `YT_COOKIES_B64` and paste that value. It redeploys on its own.

If the cookies file is too big for a variable, put it on the volume and set `YT_COOKIES_FILE=/data/cookies.txt` instead. Use a throwaway Google account, not your main one. Google can flag accounts that suddenly get used from a datacenter.

**Proxy.** Set `YT_PROXY` to a residential proxy. Datacenter proxies usually get blocked the same way.

Cookies expire, so if it stops working a few weeks later, export a fresh file.

</details>

<details>
<summary><b>▸ YouTube Music search returns nothing</b></summary>

It uses YouTube's internal API with a hardcoded client version. If that goes stale, the server backs off for five minutes after three failures and falls back to yt-dlp. Searching with `platform=youtube` is the reliable path.

</details>

<details>
<summary><b>▸ Lyrics come back empty</b></summary>

Check that the title and artist match what the lyrics sites use, and pass `duration` so LRCLIB can pick the right version. Try `source=genius`. Remember that a "not found" still returns `success: true`. Misses are retried after 10 minutes, so wait or fix the spelling. You can always save your own with `/api/save-custom-lyrics`.

</details>

<details>
<summary><b>▸ Files vanish after a redeploy</b></summary>

Containers have no permanent disk. Attach a Railway Volume at `/data`.

</details>

## Project layout

| file | what it does |
| --- | --- |
| `start.js` | standalone launcher, enables cloud hostnames and prints a ready message |
| `server.js` | the HTTP server and every route |
| `platform.js` | paths, data directories and binary lookup |
| `tools.js` | checks for and installs `yt-dlp` and `ffmpeg` |
| `lyrics-sources.js`, `lyrics-match.js` | lyrics fetching and matching |
| `ytm-artist.js` | YouTube Music artist and album parsing |
| `library-pages.js` | local library helpers |
| `audio-output.js` | system audio output info |
| `logger.js` | logging |
| `Dockerfile`, `railway.json` | container and Railway deploy config |
