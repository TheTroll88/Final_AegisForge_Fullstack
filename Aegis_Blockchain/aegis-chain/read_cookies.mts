import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const cookiePath = join(homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cookies');

try {
  const db = new Database(cookiePath, { readonly: true, fileMustExist: true });

  // Look for relevant cookies
  const rows = db.prepare(
    `SELECT host_key, name, encrypted_value FROM cookies
     WHERE host_key LIKE '%github%' OR host_key LIKE '%solana%' OR host_key LIKE '%google%'
     ORDER BY host_key`
  ).all() as any[];

  console.log(`Found ${rows.length} matching cookies`);
  rows.forEach((r: any) => console.log(r.host_key, r.name, r.encrypted_value?.length, 'bytes enc'));

  db.close();
} catch(e: any) {
  console.log('Error:', e.code, e.message?.slice(0, 200));
}
