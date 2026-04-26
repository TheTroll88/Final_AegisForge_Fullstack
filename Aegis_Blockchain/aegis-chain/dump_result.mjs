import { readFileSync } from 'fs';
const r = JSON.parse(readFileSync('moove3_result.json', 'utf8'));
const regTraffic = r.networkTraffic.filter(n => n.url && n.url.includes('registration'));
console.log('All registration traffic:');
regTraffic.forEach(n => {
  console.log(`  ${n.dir} ${n.status || ''} ${n.url}`);
  if (n.body) console.log(`  BODY: ${n.body.slice(0, 800)}`);
});
