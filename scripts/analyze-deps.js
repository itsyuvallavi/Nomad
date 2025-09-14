#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all source files
function findSourceFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findSourceFiles(fullPath, files);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Extract imports from a file
function extractImports(filePath) {
  const imports = new Set();

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Match import statements
    const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
    const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    const exportFromRegex = /export\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    while ((match = exportFromRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }

  return Array.from(imports);
}

// Resolve import path to actual file
function resolveImportPath(importPath, currentFile) {
  const currentDir = path.dirname(currentFile);

  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null;
  }

  // Handle @/ alias
  if (importPath.startsWith('@/')) {
    importPath = importPath.replace('@/', 'src/');
  }
  // Handle relative imports
  else if (importPath.startsWith('./')) {
    importPath = path.join(currentDir, importPath.substring(2));
  }
  else if (importPath.startsWith('../')) {
    importPath = path.join(currentDir, importPath);
  }

  // Try to find the actual file
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

  for (const ext of extensions) {
    const fullPath = importPath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

// Main analysis
function analyzeDepencies() {
  console.log('Analyzing src folder dependencies...\n');

  const allFiles = findSourceFiles('src');
  console.log(`Found ${allFiles.length} source files\n`);

  // Track imports
  const fileImports = {};  // file -> files it imports
  const importedBy = {};   // file -> files that import it

  // Initialize
  allFiles.forEach(file => {
    fileImports[file] = new Set();
    importedBy[file] = new Set();
  });

  // Build dependency graph
  for (const file of allFiles) {
    const imports = extractImports(file);

    for (const importPath of imports) {
      const resolved = resolveImportPath(importPath, file);

      if (resolved && resolved.startsWith('src/')) {
        fileImports[file].add(resolved);

        if (!importedBy[resolved]) {
          importedBy[resolved] = new Set();
        }
        importedBy[resolved].add(file);
      }
    }
  }

  // Find unused files
  const unusedFiles = [];
  const entryPoints = ['app/', 'pages/', 'middleware', 'instrumentation'];

  for (const file of allFiles) {
    const imported = importedBy[file] || new Set();

    // Check if it's never imported and not an entry point
    if (imported.size === 0 && !entryPoints.some(entry => file.includes(entry))) {
      unusedFiles.push(file);
    }
  }

  // Categorize unused files
  const categories = {
    components: [],
    services: [],
    lib: [],
    hooks: [],
    contexts: [],
    types: [],
    utils: [],
    other: []
  };

  for (const file of unusedFiles) {
    let categorized = false;

    for (const category of Object.keys(categories)) {
      if (file.includes(`/${category}/`)) {
        categories[category].push(file);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      categories.other.push(file);
    }
  }

  // Print report
  console.log(`=== UNUSED FILES ANALYSIS ===\n`);
  console.log(`Total files: ${allFiles.length}`);
  console.log(`Unused files: ${unusedFiles.length}\n`);

  for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
      console.log(`\n${category.toUpperCase()} (${files.length} files):`);
      files.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (files.length > 10) {
        console.log(`  ... and ${files.length - 10} more`);
      }
    }
  }

  // Find potential duplicates
  console.log('\n\n=== POTENTIAL DUPLICATES ===\n');

  const nameGroups = {};

  for (const file of allFiles) {
    let baseName = path.basename(file).toLowerCase();
    baseName = baseName.replace(/\.(ts|tsx|js|jsx)$/, '');
    baseName = baseName.replace(/[-_](v\d+|old|new|backup|copy|temp|test|deprecated)$/, '');

    if (!nameGroups[baseName]) {
      nameGroups[baseName] = [];
    }
    nameGroups[baseName].push(file);
  }

  const duplicates = Object.entries(nameGroups)
    .filter(([name, files]) => files.length > 1)
    .slice(0, 15);

  for (const [name, files] of duplicates) {
    console.log(`${name}:`);
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('');
  }

  // Save full report
  const report = {
    totalFiles: allFiles.length,
    unusedFiles: unusedFiles.length,
    categories,
    allUnusedFiles: unusedFiles,
    duplicates: Object.fromEntries(
      Object.entries(nameGroups).filter(([name, files]) => files.length > 1)
    )
  };

  fs.writeFileSync('unused-files-report.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to: unused-files-report.json');

  return report;
}

// Run analysis
analyzeDepencies();