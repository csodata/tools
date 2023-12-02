import { promises as fs } from 'fs';
import path from 'path';

const inputPath = './data/processed';
const outputPath = './data/processed';
const inPath = path.join(inputPath, 'CSO-all.json');
const data = JSON.parse(await fs.readFile(inPath, 'utf-8'));
Object.freeze(data);

async function report(outPath) {
  const stats = await fs.stat(outPath);
  const sizeInMB = (stats.size / 1048576).toFixed(2);
  console.log(`📄 Generated: ${outPath} (${sizeInMB} MB).`);
}


async function filterStatus() {
  const statuses = await extractStatuses();

  for (const status of statuses) {
    const filtered = { totalItems: 0, items: data.items.filter(item => item.status === status) };
    filtered.totalItems = filtered.items.length;

    const outPath = path.join(outputPath, `CSO-status-${status.replace(/ /g, '-')}.json`.toLowerCase());
    await fs.writeFile(outPath, JSON.stringify(filtered, null, 2));
    await report(outPath);
  }
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

  const items = data.items;
  const minutes = items.map(item => {
    // log(item);
    const minutes = item.historicSpillsList.map(spill => {
      return spill.duration;
    });
    return minutes;
  });

  const totalClaimed = items.length;
  const genuine = items.filter(item => item.status === 'Genuine').length;
  const notGenuine = items.filter(item => item.status === 'Not Genuine').length;
  const other = items.filter(item => !item.status.includes('Genuine')).length;
  const totalProcessed = genuine + notGenuine + other;

  const events = {
    totalClaimed,
    statuses: extractStatuses(),
    genuine,
    notGenuine,
    other,
    totalProcessed
  };

  // count the number of genuine spills (i.e. objects within data.items that havea status of Genuine )

  const mid = Math.floor(minutes.length / 2);
  const minutesFlat = minutes.flat().sort((a, b) => a - b);
  const minutesSum = minutesFlat.reduce((a, b) => a + b, 0);
  const minutesMean = minutesSum / minutesFlat.length;
  
  const minutesMax = Math.max(...minutesFlat);
  const minutesMin = Math.min(...minutesFlat);

  const metaReport = {
    events,
    minutesSum,
    minutesMean,
    minutesMax,
    minutesMin,
  };

  await fs.writeFile(outPath, JSON.stringify(metaReport, null, 2));
  await report(outPath)
}

function extractStatuses() {
  const statuses = data.items.map(item => item.status);
  return [...new Set(statuses)];
}

try {
  filterHistoricSpills();
  generateCSV();
  reportMeta(); 
  const statuses = extractStatuses(); 
  filterStatus(statuses);
} catch (error) {
  console.error(error);
}
