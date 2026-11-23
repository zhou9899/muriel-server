// Standalone launcher: starts the Muriel server without Electron.
process.env.MURIEL_ALLOW_ANY_HOST = '1'; // allow tunnel / cloud hostnames (the token still protects every /api route)
const onCloud = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
if (onCloud && !process.env.MURIEL_TOKEN) {
  console.error('Set the MURIEL_TOKEN variable (a long random secret) before deploying.');
  process.exit(1);
}
const s = require('./server');
s.startServer().then((port) => {
  console.log('\n=== Muriel server ready on port ' + port + ' ===');
  if (!onCloud) {
    const t = s.getServerToken();
    console.log('TOKEN =', t);
    console.log(`curl -s -H "x-muriel-token: ${t}" "http://127.0.0.1:${port}/api/search?q=daft+punk&platform=youtube&limit=5"`);
  }
});
