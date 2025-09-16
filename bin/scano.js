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

  const scanTarget = args._[0] || '.';
  const inputPath = path.resolve(scanTarget);
  const file = args.file || null;

  // default ignore list
  const DEFAULT_IGNORES = ['bin/scano.js','feature-scan.js', 'node_modules/**', 'dist/**'];

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
