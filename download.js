import { promises as fs } from 'fs';
import path from 'path';

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

let obj = {totalPages: Infinity};
for (let page = 1; page <= obj.totalPages; page++) {
    console.log(`Page ${page} of ${obj.totalPages}`);
    obj = await retrievePage(`https://www.southernwater.co.uk/gateway/Beachbuoy/1.0/api/v1.0/Spills/GetHistoricSpills?status=Genuine&page=${page}`);
    await storePage(`CSO-${page}.json`, obj);
}
