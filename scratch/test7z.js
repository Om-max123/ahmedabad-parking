import { execSync } from 'child_process';

try {
  const out = execSync('"C:\\Program Files\\7-Zip\\7z.exe" l "C:\\Users\\omdha\\AppData\\Local\\Temp\\WinGet\\PostgreSQL.PostgreSQL.16.16.15-5\\postgresql-16.15-5-windows-x64.exe"', { encoding: 'utf8' });
  console.log('7z worked! First 40 lines:');
  console.log(out.split('\n').slice(0, 40).join('\n'));
} catch (e) {
  console.log('7z failed:', e.message);
}
