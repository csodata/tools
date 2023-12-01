import { log } from 'console';
import { promises as fs } from 'fs';
import { parseArgs } from "node:util";
import path from 'path';

const args = parseArgs({
  options: {
    update: { type: "boolean", short: "u", default: false },
    all: { type: "boolean", short: "a", default: false },
    from: { type: "string", short: "f", default: "1"},
    to: { type: "string", short: "t", default: "3"},
  },
});

let from = args.values.all ? 1 : Number(args.values.from);
let to = args.values.all ? Infinity : Number(args.values.to);

if (args.values.update) {
    // find the last page based on the files in data/raw
    const files = await fs.readdir("./data/raw");
    const csoFiles = files.filter(file => /^CSO-\d+\.json$/.test(file));
    from = csoFiles.length;
    to = Infinity;
}

console.log(from, to);

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

let obj = {totalPages: to};
for (let page = from; page <= obj.totalPages; page++) {
    console.log(`Page ${page} of ${obj.totalPages}`);
    obj = await retrievePage(`https://www.southernwater.co.uk/gateway/Beachbuoy/1.0/api/v1.0/Spills/GetHistoricSpills?status=Genuine&page=${page}`);
    await storePage(`CSO-${page}.json`, obj);
}
