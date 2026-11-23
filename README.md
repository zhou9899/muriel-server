# Muriel server on Railway
1. Push this folder to a GitHub repo (or `railway up`).
2. Railway: New Project -> Deploy from repo. It uses the Dockerfile.
3. Variables: MURIEL_TOKEN = a long random secret (required).
4. Settings -> Networking -> Generate Domain.
5. (Optional) Add a Volume mounted at /data so downloads survive redeploys.
Test:  curl -s -H "x-muriel-token: $T" "https://YOUR.up.railway.app/api/search?q=daft+punk&platform=youtube&limit=5"
