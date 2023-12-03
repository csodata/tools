import { log } from 'console';
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


function checkTotalsMatch(durationTotal, minutesArray, eventId) {
    //compare durationTotal with the sum of the minutesArray
    const minutesArrayTotal = minutesArray.reduce((a, b) => a + b, 0);
    if (minutesArrayTotal !== durationTotal) {
      throw new Error(`Problem on ${eventId} - durationTotal ${durationTotal} does not match minutesArrayTotal ${minutesArrayTotal}`);
    }
}
  

/**
 * analyse all spillage times and generate a csv file with the number minutes
 * spilled every <size> minutes so for example, if there are 100 spills recorded
 * as being active at 10:00, then the csv file would have a row with 100 in the
 * 10:00 column
 * This must cope with spills that span multiple days
 * todo - improve so that long spills are rported properly!
 */
const minutesInDay = 24 * 60;
async function analyseTimes(size = 60) {

  let minutesArray = new Array(minutesInDay).fill(0);
  let durationTotal = 0

  // loop over data.items and for each item log the minutes between start and end time.  
  for (const item of data.items) {
    const start = new Date(item.eventStart);
    const duration = item.duration;
    durationTotal += duration;

    let startMinute = start.getHours() * 60 + start.getMinutes();
 
    for (let i = 0; i < duration; i++) {
      let minute = (startMinute + i) % minutesInDay;
      minutesArray[minute]++;
    }

    checkTotalsMatch(durationTotal, minutesArray, item.eventId);
  }

  log(minutesArray);

  // refactor data in the minutes array to group by hour
  let hoursArray = [];
  for (let i = 0; i < minutesArray.length; i += size) {

    // sum the parts of the array we're interested in absed on size
    const subTotalMins = minutesArray.slice(i, i + size).reduce((a, b) => a + b, 0); 
    
    // where i is the number of minutes since midnight, calculate the time of i in hours and minutes
    const hours = Math.floor(i / 60).toString().padStart(2, '0')
    const minutes = (i % 60).toString().padStart(2, '0');
    const time = `${hours}${minutes}`;

    hoursArray.push({ time, subTotalMins });

  }

  // write out the hours array to a csv file
  const outPath = path.join(outputPath, `cso-day-profile-${size}.csv`);
  const header = ['time', 'subTotalMins'];
  let csv = hoursArray.map(row => header.map(fieldName => row[fieldName]).join(','));
  csv.unshift(header.join(','));
  csv = csv.join('\r\n');

  // write the file to outpath

  await fs.writeFile(outPath, csv);
  await report(outPath)
}


try {
  analyseTimes(5);
  analyseTimes(10);
  analyseTimes(15);
  analyseTimes(30);
  analyseTimes(60);
  filterHistoricSpills();
  generateCSV();
  reportMeta(); 
  const statuses = extractStatuses(); 
  filterStatus(statuses);
} catch (error) {
  console.error(error);
}
