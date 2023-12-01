import { log } from 'console';
import { promises as fs } from 'fs';
import path from 'path';

const inPath = './data/raw';
const outPath = './data/processed';

async function combine() {
  const files = await fs.readdir(inPath);
  const csoFiles = files.filter(file => /^CSO-\d+\.json$/.test(file));

  const result = { pages: [], totalPages: 0, totalItems: 0, items: [] };

  for (const file of csoFiles) {
    const filePath = path.join(inPath, file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    result.items.push(...data.items);
    result.pages.push(data.currentPage);
    result.totalItems = Number(data.totalItems);
    result.totalPages = Number(data.totalPages);
  }

  if (result.items.length !== result.totalItems) {
    log( typeof result.items.length, typeof result.totalItems);
    throw new Error(`❌ Expected ${result.items.length} items, but found ${result.totalItems}`);
  }

  if (result.pages.length !== result.totalPages) {
    log( typeof result.pages.length, typeof result.totalPages);
    throw new Error(`❌ Expected ${result.totalPages} pages, but found ${result.pages.length}`);
  }

  log(`✅ The actual number of pages (${result.pages.length}) and items (${result.items.length}) matches that stated in the files.`)

  const outputFile = path.join(outPath, 'CSO-all.json');

  await fs.writeFile(outputFile, JSON.stringify(result, null, 2));


  const stats = await fs.stat(outputFile);
  const sizeInMB = (stats.size / 1048576).toFixed(2);

  console.log(`CSO-all.json generated (${sizeInMB} MB).`);
}

combine().catch(console.error);