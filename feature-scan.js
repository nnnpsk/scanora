// --- Imports ---
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const acorn = require('acorn');
const walk = require('acorn-walk');
const stripAnsi = require('strip-ansi').default;

const webFeaturesPackage = require('web-features');
const webFeatures = webFeaturesPackage.features;

const now = new Date();
const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(2, 17) + now.getMilliseconds().toString().padStart(3, '0');

// --- Globals ---
const IGNORE_PATHS = ['feature-scan.js', 'node_modules/**', 'dist/**'];
const LOG_FILE = `scano_log_${timestamp}.log`;
const REPORT_FILE = `report_${timestamp}.json`;

let logBuffer = '';
let scannedFiles = [];

const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  logBuffer += message + '\n';
  originalLog(...args);
};

// --- Error Handling ---
function handleFatalError(error) {
  console.error(chalk.red(`💥 Fatal error: ${error.message || error}`));

  try {
    fs.writeFileSync(LOG_FILE, stripAnsi(logBuffer));

    const errorReport = {
      status: 'error',
      error: error.message || String(error),
      scannedFiles,
      features: [],
    };

    fs.writeFileSync(REPORT_FILE, JSON.stringify(errorReport, null, 2));
  } catch (e) {
    console.error(chalk.red('❌ Failed to write logs:'), e.message);
  }

  process.exit(1);
}

process.on('uncaughtException', handleFatalError);
process.on('unhandledRejection', handleFatalError);

// --- Utility Functions ---
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractKeywords(feature) {
  const keywords = new Set();
  const fields = ['api', 'aliases', 'cssProperties', 'htmlElements', 'htmlAttributes', 'keywords', 'title', 'name'];
  fields.forEach(field => {
    const values = feature[field];
    if (Array.isArray(values)) values.forEach(v => v && keywords.add(v));
    else if (typeof values === 'string') keywords.add(values);
  });
  return Array.from(keywords).map(k => k.toLowerCase());
}

function buildKeywordMap() {
  const keywordToFeature = new Map();

  for (const id in webFeatures) {
    const feature = webFeatures[id];
    // console.log('Feature:', id, feature);  // Check each feature

    const keywords = extractKeywords(feature);
    // console.log('Extracted keywords:', keywords);

    keywords.forEach(keyword => {
      if (!keywordToFeature.has(keyword)) {
        keywordToFeature.set(keyword, id);
      }
    });
  }

  const manualFeatures = {
    // JavaScript
    'optional chaining': 'js-optional-chaining',
    'nullish coalescing': 'js-nullish-coalescing',
    'top-level await': 'js-top-level-await',
    'dynamic import': 'js-dynamic-import',
    'structuredclone': 'structured-clone',
    'bigint': 'js-bigint',
    'globalthis': 'js-global-this',
    'import.meta': 'js-import-meta',
    'finalizationregistry': 'js-finalization-registry',
    'weakref': 'js-weakref',
    'promise.allsettled': 'js-promise-allsettled',

    // CSS
    ':has': 'has',
    '@layer': 'cascade-layers',
    '@scope': 'css-scope',
    'accent-color': 'css-accent-color',
    'color-mix': 'css-color-mix',
    'scroll-timeline': 'css-scroll-timeline',
    ':is': 'css-is',
    ':where': 'css-where',
    '@container': 'css-container-queries',
    'container-type': 'css-container-queries',
    '@property': 'css-properties-values-api',
    '@import layer': 'css-cascade-layers',
    '@scroll-timeline': 'css-scroll-linked-animations',
    '@counter-style': 'css-counter-styles',
    '@font-feature-values': 'css-font-feature-values',
    '@supports': 'css-featurequeries',
    '@viewport': 'css-viewport-rule',
    '@charset': 'css-charset-rule',

    // Web APIs / Platform
    'navigator.bluetooth': 'web-bluetooth',
    'navigator.credentials': 'web-authentication',
    'navigator.share': 'web-share',
    'file system access': 'file-system-access',
    'notification': 'notifications',
    'permissions api': 'permissions-api',
    'webxr': 'webxr',
    'webgpu': 'webgpu',

    // Shorthand operators/syntax
    '??': 'js-nullish-coalescing',
    '?.': 'js-optional-chaining',
    '=>': 'js-arrow-functions',
    '...': 'js-spread-operator',
    '??=': 'js-logical-assignment-operators',
    '||=': 'js-logical-assignment-operators',
    '&&=': 'js-logical-assignment-operators',
    '**': 'js-exponentiation-operator',
    'async': 'js-async-functions',
    'await': 'js-top-level-await',
};

  for (const [keyword, id] of Object.entries(manualFeatures)) {
    keywordToFeature.set(keyword.toLowerCase(), id);
  }

  //   console.log(keywordToFeature)
  return keywordToFeature;
}

// --- Feature Detection ---
function detectJSFeatures(filePath, content, keywordMap) {
  const detected = new Set();

  try {
    const ast = acorn.parse(content, {
      ecmaVersion: 'latest',
      locations: true,
      sourceType: 'module'
    });

    walk.simple(ast, {
      Identifier(node) {
        const name = node.name.toLowerCase();
        if (keywordMap.has(name)) {
          detected.add(JSON.stringify({
            featureId: keywordMap.get(name),
            keyword: name,
            file: filePath,
            line: node.loc.start.line,
          }));
        }
      },
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'navigator' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'bluetooth' &&
          keywordMap.has('navigator.bluetooth')
        ) {
          detected.add(JSON.stringify({
            featureId: keywordMap.get('navigator.bluetooth'),
            keyword: 'navigator.bluetooth',
            file: filePath,
            line: node.loc.start.line,
          }));
        }
      },
      ChainExpression(node) {
        detected.add(JSON.stringify({
          featureId: keywordMap.get('optional chaining'),
          keyword: 'optional chaining',
          file: filePath,
          line: node.loc.start.line,
        }));
      },
      LogicalExpression(node) {
        if (node.operator === '??') {
          detected.add(JSON.stringify({
            featureId: keywordMap.get('nullish coalescing'),
            keyword: '??',
            file: filePath,
            line: node.loc.start.line,
          }));
        }
      },
      AwaitExpression(node) {
        detected.add(JSON.stringify({
          featureId: keywordMap.get('top-level await'),
          keyword: 'await',
          file: filePath,
          line: node.loc.start.line,
        }));
      },
      ImportExpression(node) {
        detected.add(JSON.stringify({
          featureId: keywordMap.get('dynamic import'),
          keyword: 'import()',
          file: filePath,
          line: node.loc.start.line,
        }));
      }
    });
  } catch (e) {
    console.error(chalk.red(`⚠️  Failed to parse ${filePath}: ${e.message}`));
  }

  return Array.from(detected).map(JSON.parse);
}

function detectHTML_CSS_Features(filePath, content, keywordMap) {
  const detected = new Set();
  const lines = content.toLowerCase().split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    keywordMap.forEach((featureId, keyword) => {
      if (keyword.startsWith(':') || keyword.startsWith('@')) {
        if (line.includes(keyword)) {
          detected.add(JSON.stringify({
            featureId,
            keyword,
            file: filePath,
            line: lineNum + 1,
          }));
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
        if (regex.test(line)) {
          detected.add(JSON.stringify({
            featureId,
            keyword,
            file: filePath,
            line: lineNum + 1,
          }));
        }
      }
    });
  }

  return Array.from(detected).map(JSON.parse);
}

function getBrowserSupport(featureId) {
  const feature = webFeatures[featureId];

  if (!feature) {
    console.warn(`⚠️ Feature data not found for: ${featureId}`);
    return {
      supported: false,
      unsupported: ['Unknown (feature not tracked in baseline)'],
      title: featureId,
      versions: {}
    };
  }

  const supportData = feature.status?.support;

  if (!supportData || typeof supportData !== 'object') {
    console.warn(`⚠️ Support info missing or invalid for: ${featureId}`);
    return {
      supported: false,
      unsupported: ['Unknown (feature not tracked in baseline)'],
      title: feature.title || featureId,
      versions: {}
    };
  }

  const unsupported = Object.entries(supportData)
    .filter(([_, version]) => !version)
    .map(([browser]) => browser);

  const versions = Object.fromEntries(
    Object.entries(supportData).filter(([_, version]) => version)
  );

  return {
    supported: unsupported.length === 0,
    unsupported,
    title: feature.title || featureId,
    versions
  };
}


// --- Scanner ---
function scanFiles(files, keywordMap) {
  const allDetected = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const ext = path.extname(file);
    if (ext === '.js') {
      allDetected.push(...detectJSFeatures(file, content, keywordMap));
    } else if (ext === '.html' || ext === '.css') {
      allDetected.push(...detectHTML_CSS_Features(file, content, keywordMap));
    }
  }

  return allDetected;
}

// --- Reporter ---
function reportFeatures(detectedList, scannedFiles = []) {
  const featureGroups = new Map();
  detectedList.forEach(d => {
    if (!featureGroups.has(d.featureId)) featureGroups.set(d.featureId, []);
    featureGroups.get(d.featureId).push(d);
  });

  const reportJson = [];
  let hasUnsafe = false;

  console.log(chalk.bold('\n🔍 Feature Scan Report:\n'));

  for (const [featureId, entries] of featureGroups) {
  const support = getBrowserSupport(featureId);
  if (!support) continue;

  const statusIcon = support.supported ? '✅' : '❌';
  const color = support.supported ? chalk.green : chalk.red;

  if (!support.supported) hasUnsafe = true;

  console.log(`${statusIcon} ${color(featureId)}: ${support.title}`);
  
  if (support.supported && Object.keys(support.versions).length > 0) {
    const versions = Object.entries(support.versions)
      .map(([browser, version]) => `${browser} ${version}`)
      .join(', ');
    console.log(`   Supported: ${chalk.cyan(versions)}`);
  }

  if (!support.supported) {
    console.log(`   ${chalk.red('Missing:')} ${support.unsupported.join(', ')}`);
  }

  entries.forEach(({ file, line, keyword }) => {
    console.log(`   - ${chalk.gray(file)}:${line} → "${chalk.yellow(keyword)}"`);
  });

  reportJson.push({
    featureId,
    title: support.title,
    supported: support.supported,
    unsupported: support.unsupported,
    versions: support.versions,
    occurrences: entries.map(e => ({
      file: e.file,
      line: e.line,
      keyword: e.keyword
    })),
  });
}


  const reportData = {
    status: 'success',
    scannedFiles,
    features: reportJson,
  };

  
  fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2));

  if (hasUnsafe) {
    console.log(chalk.red.bold('❗ Some features are not safe to use.'));
  } else {
    console.log(chalk.green.bold('✅ All detected features are safe.'));
  }

  console.log(`\n📄 Log written to: ${chalk.cyan(LOG_FILE)}`);
  console.log(`📄 Report written to: ${chalk.cyan(REPORT_FILE)}\n`);

  // Log everything *after* final console messages
  fs.writeFileSync(LOG_FILE, stripAnsi(logBuffer));

  // Exit based on status
  process.exit(hasUnsafe ? 1 : 0);
}

// --- Entry Point ---
(async function main() {
  console.log(chalk.cyan.bold('🌐 Running Web Feature Baseline Scan...\n'));

  const keywordMap = buildKeywordMap();

  const files = glob.sync('**/*.{js,css,html}', {
    ignore: IGNORE_PATHS,
    nodir: true,
  });

  scannedFiles = files;

  if (files.length === 0) {
    console.log(chalk.yellow('⚠️  No .js, .css, or .html files found.'));
    fs.writeFileSync(LOG_FILE, stripAnsi(logBuffer));
    fs.writeFileSync(REPORT_FILE, JSON.stringify({
      status: 'success',
      scannedFiles: [],
      features: []
    }, null, 2));
    console.log(`📄 Empty report written to: ${chalk.cyan(REPORT_FILE)}`);
    process.exit(0);
  }

  console.log(chalk.bold(`📂 Scanning ${files.length} file(s):`));
  files.forEach(file => console.log(`  - ${file}`));

  const detected = scanFiles(files, keywordMap);

  if (detected.length === 0) {
    console.log(chalk.green('\n✅ No modern web features detected.'));
    fs.writeFileSync(LOG_FILE, stripAnsi(logBuffer));
    fs.writeFileSync(REPORT_FILE, JSON.stringify({
      status: 'success',
      scannedFiles,
      features: []
    }, null, 2));
    console.log(`\n📄 Log written to: ${chalk.cyan(LOG_FILE)}`);
    console.log(`📄 Empty report written to: ${chalk.cyan(REPORT_FILE)}\n`);
    process.exit(0);
  }


//DEBUG-STARTS
// const testFeatures = [
//   'cascade-layers',   //  <=== Change this as needed to debug
// ];
   
//   testFeatures.forEach(id => {
//     if (webFeatures[id]) {
//       console.log(`${id} ✅ found with support data.` , (webFeatures[id]));
//     } else {
//       console.warn(`${id} ❌ NOT found in webFeatures.`);
//     }
//   });
//DEBUG-ENDS


  reportFeatures(detected, scannedFiles);
})();

