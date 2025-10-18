#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const open = require('open').default;
// const fetch = require('node-fetch'); // or axios

async function run() {
  const filePath = process.argv[2];

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    console.error('Error: The file must have a .json extension.');
    process.exit(1);
  }

  let requestData;
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    requestData = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read or parse the JSON file:', err.message);
    process.exit(1);
  }

  try {
    const response = await fetch('https://hgm3emjv2g.execute-api.us-east-1.amazonaws.com/prod/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'lmeYPSp8qBHmbzqVapt453nn0XSnU285qqoWd7Og'},
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    const downloadUrl = result.download_url;

    if (!downloadUrl) {
      throw new Error('Error: download_url not found in the response.');
    }

    console.log(`Opening the report`);
    await open(downloadUrl);
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(1);
  }
}

run();
