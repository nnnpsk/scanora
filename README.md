# Scanora

**Scanora** is a command-line tool that helps web developers build resilient, future-proof applications by detecting the use of modern and experimental web platform features. It checks those features against up-to-date browser compatibility data and reports which are safe to use based on current support.

This tool makes it easier to align your codebase with the [web-features](https://www.npmjs.com/package/web-features), ensuring a better experience for users across different browsers and platforms.

## What It Does

- Scans `.js`, `.css`, and `.html` files recursively in your project directory.
- Reports whether each feature is safe or unsafe based on Web Baseline support.
- Outputs a detailed JSON report and a clean log file.
- Handles JavaScript parsing errors gracefully using Acorn.
- Extensible via custom keyword mappings and overrides.

## Installation

1) Install it globally using npm:  
  `npm install -g scanora`  

    (or)

3) Clone & docker it  
  `git clone https://github.com/nnnpsk/scanora.git`  
  `cd scanora`  
  `docker build -t scanora .`  
  `docker run -it scanora`  

    (or)

3) Docker Pull  
   `docker pull sasipalanin/scanora` , to use in CI/CD 

---

## Usage 

```bash
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
