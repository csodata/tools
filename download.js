import { log } from 'console';
import { promises as fs } from 'fs';
import { parseArgs } from "node:util";
import path from 'path';

const args = parseArgs({
  options: {
    update: { type: "boolean", short: "u", default: false },
    all: { type: "boolean", short: "a", default: false },
    from: { type: "string", short: "f"},
    to: { type: "string", short: "t"},
  },
});

let from = 1;
let to = 3;

if (args.values.from) {
    from = Number(args.values.from);
    to = Infinity;
}

if (args.values.to) {
    to = Number(args.values.to);
}

if (args.values.update) {
    // find the last page based on the files in data/raw
    const files = await fs.readdir("./data/raw");
    const csoFiles = files.filter(file => /^CSO-\d+\.json$/.test(file));
    from = csoFiles.length;
    to = Infinity;
}

async function retrievePage(url) {
    const response = await fetch(
        url,
        { headers: { "x-gateway-apikey": "d25662b7-9fd3-4e19-a68b-0c581ec229d0" } }
    );
    return await response.json();
}

async function storePage(fn, data) {
    return await fs.writeFile(
        path.join("data/raw", fn),
        JSON.stringify(data, null, 2)
    );
}

// if to is infinity, find how high it should go by downloading the first page
if (to === Infinity) {
    const obj = await retrievePage(`https://www.southernwater.co.uk/gateway/Beachbuoy/1.0/api/v1.0/Spills/GetHistoricSpills?page=${from}`);
    to = obj.totalPages;
}

// create an array of numbers from 'from' to 'to'
const todo = [];
for (let i = ++from; i <= to; i++) {
    todo.push(i);
}

log(`Queued ${todo.length} pages for download.`);

while (todo.length) {
    const page = todo.shift();
    try {
        const obj = await retrievePage(`https://www.southernwater.co.uk/gateway/Beachbuoy/1.0/api/v1.0/Spills/GetHistoricSpills?page=${page}`);
        await storePage(`CSO-${page}.json`, obj);
        log(`Downloaded page ${page} of ${to}`);    
    } catch {
        todo.push(page);
        log(`Failed to download page ${page} - readded to queue`);
    }
}
