# scanora

**Baseline WebFeature Scan Tool**

`scanora` is a CLI tool that scans JavaScript projects to detect baseline web features used in codebase. It helps developers identify browser compatibility concerns by analyzing feature usage.

---

## Installation

Install it globally using npm:

`npm install -g scanora`

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
