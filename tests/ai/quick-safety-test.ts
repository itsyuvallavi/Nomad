/**
 * Quick safety test - verify old AI files can be deleted
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 QUICK SAFETY TEST - Can we delete old AI files?\n');
console.log('=' . repeat(50));

// Test 1: Check if new AI files exist and are complete
console.log('\n1️⃣ Checking new AI files exist...');
const newFiles = [
  'src/services/ai/ai-controller.ts',
  'src/services/ai/trip-generator.ts',
  'src/services/ai/prompts.ts'
];

let allNewExist = true;
for (const file of newFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} MISSING!`);
    allNewExist = false;
  }
}

// Test 2: Check critical imports in new files
console.log('\n2️⃣ Checking new files don\'t import old ones...');

const checkFile = (filePath: string): boolean => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasOldImports =
    content.includes("from '@/services/ai/flows/") ||
    content.includes("from '@/services/ai/conversation/") ||
    (content.includes("from '@/services/ai/utils/") &&
     !content.includes('openai-travel-costs') &&
     !content.includes('safeChat'));

  if (hasOldImports) {
    console.log(`   ❌ ${path.basename(filePath)} has old imports!`);
    // Show the problematic lines
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes("from '@/services/ai/flows/") ||
          line.includes("from '@/services/ai/conversation/")) {
        console.log(`      Line ${i+1}: ${line.trim()}`);
      }
    });
    return false;
  } else {
    console.log(`   ✅ ${path.basename(filePath)} is clean`);
    return true;
  }
};

const newFilesClean = newFiles.every(f => fs.existsSync(f) && checkFile(f));

// Test 3: Check API route
console.log('\n3️⃣ Checking API route uses new components...');
const apiRoute = 'src/app/api/ai/generate-itinerary-v2/route.ts';
if (fs.existsSync(apiRoute)) {
  const content = fs.readFileSync(apiRoute, 'utf-8');
  const usesNewComponents =
    content.includes("from '@/services/ai/ai-controller'") &&
    content.includes("from '@/services/ai/trip-generator'");

  if (usesNewComponents) {
    console.log('   ✅ API route uses new components');
  } else {
    console.log('   ❌ API route not using new components!');
  }
} else {
  console.log('   ❌ API route not found!');
}

// Test 4: List old files that would be deleted
console.log('\n4️⃣ Files that would be deleted:');
const oldDirs = [
  'src/services/ai/flows',
  'src/services/ai/conversation',
];

const oldFiles: string[] = [];
oldDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        oldFiles.push(path.join(dir, file));
      }
    });
  }
});

// Additional old utils files
const oldUtils = [
  'src/services/ai/utils/conversational-generator.ts',
  'src/services/ai/utils/intent-understanding.ts',
  'src/services/ai/utils/zone-based-planner.ts',
  'src/services/ai/utils/route-optimizer.ts',
  'src/services/ai/utils/simple-generator.ts',
  'src/services/ai/utils/hybrid-parser.ts',
  'src/services/ai/openai-config.ts'
];

oldUtils.forEach(file => {
  if (fs.existsSync(file)) {
    oldFiles.push(file);
  }
});

console.log(`   Found ${oldFiles.length} old files to delete:`);
oldFiles.forEach(f => console.log(`   - ${f}`));

// Test 5: Check if any SOURCE files still import old files
console.log('\n5️⃣ Checking if any source files import old AI...');
const checkDirectory = (dir: string): number => {
  let count = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.')) {
      count += checkDirectory(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      // Skip old AI files themselves
      if (oldFiles.some(old => fullPath.includes(old))) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes("from '@/services/ai/flows/") ||
          content.includes("from '@/services/ai/conversation/")) {
        console.log(`   ⚠️  ${fullPath}`);
        count++;
      }
    }
  }
  return count;
};

const srcImports = checkDirectory('src');
if (srcImports === 0) {
  console.log('   ✅ No source files import old AI');
} else {
  console.log(`   ❌ Found ${srcImports} files importing old AI`);
}

// Final verdict
console.log('\n' + '=' . repeat(50));
console.log('📊 VERDICT:');

if (allNewExist && newFilesClean && srcImports === 0) {
  console.log('✅ SAFE TO DELETE OLD FILES');
  console.log('\nYou can safely remove:');
  console.log('  - src/services/ai/flows/*');
  console.log('  - src/services/ai/conversation/*');
  console.log('  - src/services/ai/utils/* (except openai-travel-costs.ts, safeChat.ts)');
  console.log('  - src/services/ai/openai-config.ts');
} else {
  console.log('❌ NOT SAFE TO DELETE - Issues found above');
}

process.exit(0);