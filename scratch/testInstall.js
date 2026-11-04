import { spawn } from 'child_process';

const exe = 'C:\\Users\\omdha\\AppData\\Local\\Temp\\WinGet\\PostgreSQL.PostgreSQL.16.16.15-5\\postgresql-16.15-5-windows-x64.exe';

const p = spawn(exe, [
  '--mode', 'unattended',
  '--unattendedmodeui', 'none',
  '--superpassword', 'postgres',
  '--servicepassword', 'postgres',
  '--serverport', '5432'
]);

p.stdout.on('data', (d) => console.log('STDOUT:', d.toString()));
p.stderr.on('data', (d) => console.log('STDERR:', d.toString()));

p.on('error', (err) => console.log('SPAWN ERROR:', err.message));
p.on('close', (code) => console.log('EXIT CODE:', code));
