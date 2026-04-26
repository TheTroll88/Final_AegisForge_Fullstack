import { readFileSync } from 'fs';
const html = readFileSync('moove_source.html', 'utf8');

const srcs = html.match(/https:\/\/[a-z0-9.-]+\.[a-z]{2,10}\/[^\s"'<]{3,80}/g) || [];
const uniq = [...new Set(srcs)].filter(u =>
  !u.includes('moove.xyz') && !u.includes('googleapis') && !u.includes('gstatic') && !u.includes('w3.org')
);
console.log('External refs:');
uniq.slice(0, 25).forEach(u => console.log(' ', u.slice(0, 90)));

const api = html.match(/graphql|apollo|hasura|hygraph|supabase|firebase|clerk|privy|dynamic\.xyz|web3auth|magic\.link|thirdweb|wallet-?connect|rainbowkit|wagmi/gi) || [];
console.log('\nAuth SDK hints:', [...new Set(api.map(s => s.toLowerCase()))].join(', '));

// Check script sources
const scripts = html.match(/src="([^"]+)"/g) || [];
console.log('\nScript srcs:', scripts.filter(s => !s.includes('_next')).join('\n'));
