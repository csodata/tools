import { promises as fs } from 'fs';
import path from 'path';

const inputPath = './data/processed';
const outputPath = './data/processed';
const inPath = path.join(inputPath, 'CSO-all.json');

async function report(outPath) {
  const stats = await fs.stat(outPath);
  const sizeInMB = (stats.size / 1048576).toFixed(2);
  console.log(`${outPath} generated (${sizeInMB} MB).`);
}

async function filterHistoricSpills() {
  const outPath = path.join(outputPath, 'CSO-all-simplified-historic-spills.json');
  const data = JSON.parse(await fs.readFile(inPath, 'utf-8'));

  data.items.forEach(item => {
    if (item.historicSpillsList) {
      item.historicSpillsList.forEach((spill, index) => {
        for (const prop in spill) {
          if (spill[prop] === item[prop]) {
            delete item.historicSpillsList[index][prop];
          }
        }
      });
    }
  });

  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  await report(outPath)
}

async function generateCSV() {
  const outPath = path.join(outputPath, 'CSO-all-no-historic-spills.csv');
  const data = JSON.parse(await fs.readFile(inPath, 'utf-8'));

  const items = data.items;
  const replacer = (key, value) => value === null ? '' : value;
  let header = Object.keys(items[0]);
  header = header.filter(h => h !== 'historicSpillsList'); // exclude historicSpillsList from header
  header = header.filter(h => h !== 'id'); // exclude ever-changing id from header
  let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
  csv.unshift(header.join(','));
  csv = csv.join('\r\n');

  await fs.writeFile(outPath, csv);
  await report(outPath)
}

async function reportMeta() {
  const outPath = path.join(outputPath, 'CSO-all-meta.json');
  const data = JSON.parse(await fs.readFile(inPath, 'utf-8'));

  const items = data.items;
  const minutes = items.map(item => {
    // log(item);
    const minutes = item.historicSpillsList.map(spill => {
      return spill.duration;
    });
    return minutes;
  });


  const mid = Math.floor(minutes.length / 2);
  const minutesFlat = minutes.flat().sort((a, b) => a - b);
  const minutesSum = minutesFlat.reduce((a, b) => a + b, 0);
  const minutesMean = minutesSum / minutesFlat.length;
  
  const minutesMax = Math.max(...minutesFlat);
  const minutesMin = Math.min(...minutesFlat);

  const metaReport = {
    minutesSum,
    minutesMean,
    minutesMax,
    minutesMin
  };

  await fs.writeFile(outPath, JSON.stringify(metaReport, null, 2));
  await report(outPath)
}

try {
  filterHistoricSpills();
  generateCSV();
  reportMeta();  
} catch (error) {
  console.error(error);
}
