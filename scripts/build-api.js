#!/usr/bin/env node

/**
 * NAICS Static REST API Generator
 *
 * Reads NAICS.json and NAICS_Mini.json, then generates a directory
 * structure of JSON files that can be served as a static REST API
 * via GitHub Pages.
 *
 * Zero dependencies — uses only Node.js built-ins (fs, path).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const API = path.join(DIST, 'api', 'v1');

const VERSION = '1.0.0';
const SOURCE = 'https://github.com/upholdjd/NAICS';
const NAICS_SEARCH_PAGE = 'https://www.naics.com/search/';
const NAICS_CODE_DESCRIPTION_BASE = 'https://www.naics.com/naics-code-description/?code=';
const NAICS_AJAX_SEARCH_URL = 'https://www.naics.com/wp-admin/admin-ajax.php';
const NAICS_AJAX_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(filepath, data, endpoint) {
  const envelope = {
    meta: {
      version: VERSION,
      generated: new Date().toISOString(),
      source: SOURCE,
      endpoint,
    },
    data,
  };
  mkdirp(path.dirname(filepath));
  fs.writeFileSync(filepath, JSON.stringify(envelope, null, 2));
}

/** Map a level name to its URL slug */
function levelSlug(level) {
  return level.toLowerCase().replace(/\s+/g, '-');
}

/** Build breadcrumb ancestry chain for a code (parent → grandparent → …) */
function breadcrumb(code, byCode) {
  const trail = [];
  let current = byCode.get(code);
  while (current && current.parent) {
    const parent = byCode.get(current.parent);
    if (!parent) break;
    trail.unshift({ code: parent.naics, name: parent.formal_name, level: parent.level });
    current = parent;
  }
  return trail;
}

/** Build external lookup URLs for a NAICS code */
function buildLookup(code) {
  return {
    search_page: NAICS_SEARCH_PAGE,
    code_description: `${NAICS_CODE_DESCRIPTION_BASE}${encodeURIComponent(code)}`,
  };
}

/** Recursively build a tree node for a code */
function buildTree(code, childrenMap, byCode) {
  const record = byCode.get(code);
  if (!record) return null;
  const kids = (childrenMap.get(code) || []).map((c) => buildTree(c, childrenMap, byCode)).filter(Boolean);
  const node = {
    code: record.naics,
    name: record.formal_name,
    level: record.level,
    lookup: buildLookup(record.naics),
  };
  if (kids.length > 0) node.children = kids;
  return node;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Reading data files...');
  const naics = readJSON('NAICS.json');
  const mini = readJSON('NAICS_Mini.json');

  // Build lookup maps
  const byCode = new Map();
  const childrenMap = new Map(); // parent code → [child codes]
  const byLevel = new Map();    // level slug → [records]
  const bySector = new Map();   // sector code → [records]

  for (const record of naics) {
    byCode.set(record.naics, record);

    // Children map
    if (record.parent) {
      if (!childrenMap.has(record.parent)) childrenMap.set(record.parent, []);
      childrenMap.get(record.parent).push(record.naics);
    }

    // By level
    const slug = levelSlug(record.level);
    if (!byLevel.has(slug)) byLevel.set(slug, []);
    byLevel.get(slug).push(record);

    // By sector
    if (!bySector.has(record.sector)) bySector.set(record.sector, []);
    bySector.get(record.sector).push(record);
  }

  // Mini lookup
  const miniByCode = new Map();
  for (const record of mini) {
    miniByCode.set(record.naics_id, record);
  }

  // Clean dist
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }

  let fileCount = 0;

  // -------------------------------------------------------------------------
  // 1. codes.json — summary of all codes
  // -------------------------------------------------------------------------
  console.log('Generating codes.json...');
  const summary = naics.map((r) => ({
    code: r.naics,
    name: r.formal_name,
    level: r.level,
    sector: r.sector,
    lookup: buildLookup(r.naics),
  }));
  writeJSON(path.join(API, 'codes.json'), summary, '/codes.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 2. codes-full.json — all codes with full records
  // -------------------------------------------------------------------------
  console.log('Generating codes-full.json...');
  writeJSON(path.join(API, 'codes-full.json'), naics, '/codes-full.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 3. stats.json — dataset statistics
  // -------------------------------------------------------------------------
  console.log('Generating stats.json...');
  const levelCounts = {};
  for (const [slug, records] of byLevel) {
    levelCounts[slug] = records.length;
  }
  const sectorCounts = {};
  for (const [code, records] of bySector) {
    const sectorRecord = byCode.get(code);
    sectorCounts[code] = {
      name: sectorRecord ? sectorRecord.formal_name : code,
      total: records.length,
    };
  }
  writeJSON(path.join(API, 'stats.json'), {
    total: naics.length,
    byLevel: levelCounts,
    bySector: sectorCounts,
  }, '/stats.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 4. naics/{code}.json — individual code with children + breadcrumb
  // -------------------------------------------------------------------------
  console.log('Generating naics/{code}.json...');
  for (const record of naics) {
    const children = (childrenMap.get(record.naics) || []).map((c) => {
      const child = byCode.get(c);
      return {
        code: child.naics,
        name: child.formal_name,
        level: child.level,
        lookup: buildLookup(child.naics),
      };
    });
    const enriched = {
      ...record,
      lookup: buildLookup(record.naics),
      breadcrumb: breadcrumb(record.naics, byCode),
      children,
    };
    writeJSON(
      path.join(API, 'naics', `${record.naics}.json`),
      enriched,
      `/naics/${record.naics}.json`
    );
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 5. level/{slug}.json — codes at each level
  // -------------------------------------------------------------------------
  console.log('Generating level/{slug}.json...');
  for (const [slug, records] of byLevel) {
    const levelData = records.map((r) => ({
      code: r.naics,
      name: r.formal_name,
      sector: r.sector,
      lookup: buildLookup(r.naics),
    }));
    writeJSON(path.join(API, 'level', `${slug}.json`), levelData, `/level/${slug}.json`);
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 6. sector/{code}.json — all codes in a sector
  // -------------------------------------------------------------------------
  console.log('Generating sector/{code}.json...');
  for (const [code, records] of bySector) {
    const sectorData = records.map((r) => ({
      code: r.naics,
      name: r.formal_name,
      level: r.level,
      lookup: buildLookup(r.naics),
    }));
    writeJSON(path.join(API, 'sector', `${code}.json`), sectorData, `/sector/${code}.json`);
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 7. sector/{code}/tree.json — hierarchical tree for a sector
  // -------------------------------------------------------------------------
  console.log('Generating sector/{code}/tree.json...');
  for (const [code] of bySector) {
    const tree = buildTree(code, childrenMap, byCode);
    writeJSON(
      path.join(API, 'sector', code, 'tree.json'),
      tree,
      `/sector/${code}/tree.json`
    );
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 8. tree.json — full hierarchical tree
  // -------------------------------------------------------------------------
  console.log('Generating tree.json...');
  const sectors = naics.filter((r) => r.level === 'Sector');
  const fullTree = sectors.map((s) => buildTree(s.naics, childrenMap, byCode)).filter(Boolean);
  writeJSON(path.join(API, 'tree.json'), fullTree, '/tree.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 9. children/{code}.json — direct children of non-leaf codes
  // -------------------------------------------------------------------------
  console.log('Generating children/{code}.json...');
  for (const [parentCode, childCodes] of childrenMap) {
    const children = childCodes.map((c) => {
      const child = byCode.get(c);
      return {
        code: child.naics,
        name: child.formal_name,
        level: child.level,
        lookup: buildLookup(child.naics),
      };
    });
    writeJSON(
      path.join(API, 'children', `${parentCode}.json`),
      children,
      `/children/${parentCode}.json`
    );
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 10. mini/codes.json — all mini records
  // -------------------------------------------------------------------------
  console.log('Generating mini/codes.json...');
  writeJSON(path.join(API, 'mini', 'codes.json'), mini, '/mini/codes.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 11. mini/{code}.json — individual mini records
  // -------------------------------------------------------------------------
  console.log('Generating mini/{code}.json...');
  for (const record of mini) {
    writeJSON(
      path.join(API, 'mini', `${record.naics_id}.json`),
      record,
      `/mini/${record.naics_id}.json`
    );
    fileCount++;
  }

  // -------------------------------------------------------------------------
  // 12. search-index.json — compact index for client-side search
  // -------------------------------------------------------------------------
  console.log('Generating search-index.json...');
  const searchIndex = naics.map((r) => ({
    c: r.naics,
    n: r.formal_name,
    s: r.sector,
    u: buildLookup(r.naics).code_description,
  }));
  writeJSON(path.join(API, 'search-index.json'), searchIndex, '/search-index.json');
  fileCount++;

  // -------------------------------------------------------------------------
  // 13. search-config.json — request template for NAICS.com live search
  // -------------------------------------------------------------------------
  console.log('Generating search-config.json...');
  writeJSON(
    path.join(API, 'search-config.json'),
    {
      search_page: NAICS_SEARCH_PAGE,
      code_description_template: `${NAICS_CODE_DESCRIPTION_BASE}{code}`,
      json_call: {
        method: 'POST',
        url: NAICS_AJAX_SEARCH_URL,
        headers: {
          'Content-Type': NAICS_AJAX_CONTENT_TYPE,
        },
        body_template: 'action=naics_search_autocomplete&words={query}&source_form=naics',
      },
    },
    '/search-config.json'
  );
  fileCount++;

  // -------------------------------------------------------------------------
  // Copy index.html to dist/
  // -------------------------------------------------------------------------
  const indexSrc = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexSrc)) {
    console.log('Copying index.html...');
    fs.copyFileSync(indexSrc, path.join(DIST, 'index.html'));
  }

  // -------------------------------------------------------------------------
  // Build summary
  // -------------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Calculate total size
  let totalSize = 0;
  function sumDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) sumDir(full);
      else totalSize += fs.statSync(full).size;
    }
  }
  sumDir(DIST);

  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

  console.log('\n========================================');
  console.log('  NAICS Static API — Build Complete');
  console.log('========================================');
  console.log(`  Files generated : ${fileCount}`);
  console.log(`  Total size      : ${sizeMB} MB`);
  console.log(`  Time elapsed    : ${elapsed}s`);
  console.log(`  Output dir      : ${path.relative(ROOT, DIST)}/`);
  console.log('========================================\n');
}

main();
