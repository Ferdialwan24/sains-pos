import { spawn } from 'node:child_process';

const processes = [];
let shuttingDown = false;
const isWindows = process.platform === 'win32';

const runProcess = (name, command, color) => {
  const executable = isWindows ? process.env.ComSpec || 'cmd.exe' : 'sh';
  const args = isWindows ? ['/d', '/s', '/c', command] : ['-lc', command];

  const child = spawn(executable, args, {
    cwd: process.cwd(),
    stdio: ['inherit', 'pipe', 'pipe']
  });

  const prefix = `${color}[${name}]\x1b[0m`;

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.stderr.write(`\n${prefix} exited with code ${code ?? 'unknown'}\n`);

    for (const processItem of processes) {
      if (!processItem.killed) {
        processItem.kill();
      }
    }

    process.exit(code ?? 1);
  });

  processes.push(child);
};

runProcess('server', 'npm run dev:server', '\x1b[36m');
runProcess('client', 'npm run dev:client', '\x1b[35m');

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
