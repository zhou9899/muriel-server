FROM node:20-bookworm-slim

# ffmpeg + python (yt-dlp needs it) + curl/certs
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# yt-dlp (latest release)
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY . .

# HOME=/data so ~/Downloads becomes /data/Downloads; mount a Railway volume at /data to keep files
ENV HOME=/data \
    MURIEL_DATA_DIR=/data/muriel \
    HOST=0.0.0.0 \
    NODE_ENV=production
RUN mkdir -p /data

CMD ["node", "start.js"]
