#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { mainScan } = require('../feature-scan');

function normalizeIgnorePatterns(ignorePatterns, inputPath) {
  return ignorePatterns.flatMap(pattern => {
    // to allow comma-separated patterns within a single arg or multiple --ignore args
    return pattern
      .split(',')
      .map(entry => {
        // Clean up leading ./ or /
        let cleaned = entry.trim().replace(/^\.?\/+/, '');

        const fullPath = path.resolve(inputPath, cleaned);

        try {
          const stat = require('fs').statSync(fullPath);
          if (stat.isDirectory()) {
            return cleaned.replace(/\/$/, '') + '/**';
          }
        } catch {
          // Fallback for unknown/missing paths:
          if (!path.extname(cleaned)) {
            return cleaned.replace(/\/$/, '') + '/**';
          }
        }

        return cleaned; // probably a file
      });
  });
}


async function run() {
  const args = minimist(process.argv.slice(2), {
    string: ['file', 'ignore'],
    boolean: ['version', 'help'],
    alias: { f: 'file', i: 'ignore', v: 'version', h: 'help' },
  });

  // summ report generation-starts
  if (args._[0] === 'summ') {
    const filePath = args._[1];

    if (!filePath) {
    console.error('Error: Please provide a JSON file to send.');
    process.exit(1);
    }

    const summScript = path.resolve(__dirname, 'summ.js');
    const { spawn } = require('child_process');
    const child = spawn('node', [summScript, filePath], {
      stdio: 'inherit',
    });

    child.on('exit', code => process.exit(code));
    return;
  }
  // summ report generation-ends

  //validate the command args-starts
  const allowedCommands = ['help', 'summ'];
  const firstArg = args._[0];

  if (
    firstArg &&
    !allowedCommands.includes(firstArg) &&
    !fs.existsSync(path.resolve(firstArg))
  ) {
    console.error(`Error: Unrecognized command or path "${firstArg}".`);
    console.log(`Run "scano help" to see available options.`);
    process.exit(1);
  }
  //validate the command args-ends

  const scanTarget = args._[0] || '.';
  const inputPath = path.resolve(scanTarget);
  const file = args.file || null;

  // default ignore list
  const DEFAULT_IGNORES = ['bin/scano.js', 'bin/summ.js', 'feature-scan.js', 'node_modules/**', 'dist/**'];

  // Handle --ignore
  let ignore = [];

  if (args.ignore) {
    const ignoreInput = Array.isArray(args.ignore) ? args.ignore : [args.ignore];
    ignore = normalizeIgnorePatterns(ignoreInput, inputPath);
  }

  const combinedIgnore = [...DEFAULT_IGNORES, ...ignore];

  // Version
  if (args.version) {
    const pkg = require('../package.json');
    console.log(`scano version ${pkg.version}`);
    return;
  }

  // Help
  if (args.help || args._[0] === 'help') {
    console.log(`
Usage:
  scano [path] [options]

Examples:
  scano                                 Run scan on current directory (recursive)
  scano ./folder                        Scan all JS/CSS/HTML in the folder
  scano ./file.js                       Scan a single JS/CSS/HTML file
  scano --file=manifest.txt             Scan files listed in manifest file

Ignore Options:
  scano --ignore=dist,node_modules      Ignore multiple paths (comma-separated)
  scano --ignore="src,dist,file.css"    Quote values with commas (cross-platform safe)
  scano --ignore=dist --ignore=src/inn  Use multiple --ignore flags (also supported)
  scano --ignore=src/inn/file.css       Ignore a specific file
  scano --ignore=src/inn,file.css       Mix folders and files

Other:
  scano --version                       Show version
  scano help                            Show help
  scano summ <scan_report_xx.json>      Generate a summarization report using Claude

Notes:
  - Paths are relative to the scan target (default is current directory)
  - Directories are expanded to match all files inside (e.g. src => src/**)
  - Use quotes for comma-separated ignore values to avoid shell parsing issues
`);
    return;
  }

const isSingleFile =
  fs.existsSync(inputPath) &&
  fs.statSync(inputPath).isFile() &&
  ['.js', '.css', '.html'].includes(path.extname(inputPath).toLowerCase());

if (isSingleFile) {
  const fileDir = path.dirname(path.resolve(inputPath));
  const fileName = path.basename(inputPath).replace(/^\.?[\/\\]+/, ''); // clean ./ or .\
  
  await mainScan({
    inputPath: fileDir,
    file: fileName,
    ignore: combinedIgnore,
  });
} else {
  await mainScan({
    inputPath,
    file,
    ignore: combinedIgnore,
  });
}
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});