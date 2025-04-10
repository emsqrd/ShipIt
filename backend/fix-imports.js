#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to process
const srcDir = path.join(__dirname, 'src');

// Extensions to process
const extensions = ['.ts', '.tsx'];

// Regular expression to match relative imports without extensions
const relativeImportRegex = /from\s+['"](\.[^'"]*)['"]/g;
const typeImportRegex = /import\s+type\s+.*?\s+from\s+['"](\.[^'"]*)['"]/g;

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }),
  );
  return files
    .flat()
    .filter(
      (file) =>
        extensions.includes(path.extname(file)) &&
        !file.includes('node_modules') &&
        !file.includes('dist'),
    );
}

async function processFile(file) {
  const content = await readFile(file, 'utf8');

  // Skip files that already have extensions in imports
  if (content.includes('.js"') || content.includes(".js'")) {
    console.log(`Skipping ${file} - already has .js extensions`);
    return false;
  }

  let updatedContent = content;

  // Replace imports but skip type imports
  const typeImports = [];
  let match;
  while ((match = typeImportRegex.exec(content)) !== null) {
    typeImports.push(match[1]);
  }

  updatedContent = updatedContent.replace(relativeImportRegex, (match, importPath) => {
    // Skip if this is a type import
    if (typeImports.includes(importPath)) {
      return match;
    }

    // Don't add extension if it already has one
    if (path.extname(importPath)) {
      return match;
    }

    const extension = '.js'; // We always use .js for the output
    return `from '${importPath}${extension}'`;
  });

  if (content !== updatedContent) {
    await writeFile(file, updatedContent, 'utf8');
    console.log(`Updated ${file}`);
    return true;
  }

  return false;
}

const main = async () => {
  try {
    const files = await getFiles(srcDir);
    console.log(`Found ${files.length} files to process`);

    let updatedCount = 0;
    for (const file of files) {
      const updated = await processFile(file);
      if (updated) updatedCount++;
    }

    console.log(`Updated ${updatedCount} files with proper import extensions`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Execute the main function
main();
