#!/usr/bin/env node

/**
 * ULT FPEB - Frontend Cleanup Verification Script
 * Verifies that all components are properly connected and no unused files remain
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const FRONTEND_DIR = join(__dirname, 'frontend', 'src');
const PAGES_DIR = join(FRONTEND_DIR, 'pages');
const APP_JSX_PATH = join(FRONTEND_DIR, 'App.jsx');

console.log('🔍 ULT FPEB Frontend Cleanup Verification\n');

// Step 1: Read App.jsx and extract imports
console.log('📄 Analyzing App.jsx imports...');
const appJsxContent = readFileSync(APP_JSX_PATH, 'utf8');

// Extract import statements for pages
const pageImports = [];
const importRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+['"][./]*pages\/([^'"]+)['"];?/g;
let match;

while ((match = importRegex.exec(appJsxContent)) !== null) {
    const componentName = match[1].trim();
    const fileName = match[2];
    pageImports.push({ componentName, fileName });
}

console.log(`   Found ${pageImports.length} page component imports`);

// Step 2: Check if all imported files exist
console.log('\n📁 Verifying page files exist...');
const missingFiles = [];
const existingFiles = [];

pageImports.forEach(({ componentName, fileName }) => {
    const filePath = join(PAGES_DIR, fileName);
    if (existsSync(filePath)) {
        existingFiles.push({ componentName, fileName });
        console.log(`   ✅ ${fileName} - ${componentName}`);
    } else {
        missingFiles.push({ componentName, fileName });
        console.log(`   ❌ ${fileName} - ${componentName} (MISSING)`);
    }
});

// Step 3: Check for unused files in pages directory
console.log('\n📂 Checking for unused page files...');
const allPageFiles = readdirSync(PAGES_DIR).filter(file => file.endsWith('.jsx'));
const importedFileNames = pageImports.map(imp => imp.fileName);
const unusedFiles = allPageFiles.filter(file => !importedFileNames.includes(file));

if (unusedFiles.length === 0) {
    console.log('   ✅ No unused page files found');
} else {
    console.log('   ⚠️  Found potentially unused files:');
    unusedFiles.forEach(file => {
        console.log(`      - ${file}`);
    });
}

// Step 4: Check for route usage
console.log('\n🛣️  Verifying route definitions...');
const routes = [];
const routeRegex = /<Route[^>]+element={<([^/>]+)[^>]*>}/g;

while ((match = routeRegex.exec(appJsxContent)) !== null) {
    const componentName = match[1];
    routes.push({ componentName });
}

console.log(`   Found ${routes.length} defined routes`);

// Check if all imported page components are used in routes
const routeComponents = routes.map(r => r.componentName);
const unusedImports = pageImports.filter(imp => 
    !routeComponents.includes(imp.componentName)
);

if (unusedImports.length === 0) {
    console.log('   ✅ All imported page components are used in routes');
} else {
    console.log('   ⚠️  Found imported but unused components:');
    unusedImports.forEach(imp => {
        console.log(`      - ${imp.componentName} (${imp.fileName})`);
    });
}

// Step 5: Summary
console.log('\n📊 CLEANUP VERIFICATION SUMMARY');
console.log('━'.repeat(50));
console.log(`📄 Total page imports: ${pageImports.length}`);
console.log(`📁 Existing files: ${existingFiles.length}`);
console.log(`❌ Missing files: ${missingFiles.length}`);
console.log(`🗑️  Unused files: ${unusedFiles.length}`);
console.log(`🛣️  Defined routes: ${routes.length}`);
console.log(`⚠️  Unused imports: ${unusedImports.length}`);

// Final status
const isClean = missingFiles.length === 0 && unusedFiles.length === 0 && unusedImports.length === 0;

if (isClean) {
    console.log('\n🎉 CLEANUP VERIFICATION PASSED');
    console.log('   Frontend pages directory is clean and optimized!');
    process.exit(0);
} else {
    console.log('\n⚠️  CLEANUP VERIFICATION ISSUES FOUND');
    console.log('   Please review the issues above.');
    
    if (missingFiles.length > 0) {
        console.log('\n🔧 Missing files need to be restored or imports removed.');
    }
    
    if (unusedFiles.length > 0) {
        console.log('\n🗑️  Unused files can be safely deleted.');
    }
    
    if (unusedImports.length > 0) {
        console.log('\n📝 Unused imports can be removed from App.jsx.');
    }
    
    process.exit(1);
}
