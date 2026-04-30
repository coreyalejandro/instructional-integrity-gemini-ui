const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
fs.writeFileSync('src/App.tsx', content.replace(/text-zinc-500/g, 'text-zinc-400'));
