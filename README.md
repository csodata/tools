#  GetCSO
## CSO discharge data from Southern Water's Beachbuoy service

This repository  contains CSO discharge data from Southern Water's Beachbuoy service as well as the tools used to download and process it.
Code is written using JavaScript/node (tested on version 19).
Repository: [https://github.com/portsoc/getcso](https://github.com/portsoc/getcso)

## Discharge Data
If there's a file format that you desire, let us know in the [issues](issues) page.

### JSON files
* [CSO-all-meta.json](data/processed/CSO-all-meta.json) - metadata (e.g. total minutes) derived from analysing the downloaded data.
* [CSO-all.json](data/processed/CSO-all.json) - all data retrieved from Southern Water.
* [CSO-all-simplified-historic-spills.json](data/processed/CSO-all-simplified-historic-spills.json) - all data, but with duplicate data removed from historic spills which reduces the size by ~50%.
* [CSO-status-genuine.json](data/processed/CSO-status-genuine.json)
* [CSO-status-not-genuine.json](data/processed/CSO-status-not-genuine.json)
* [CSO-status-under-review.json](data/processed/CSO-status-under-review.json)

### Comma Separatyed variable
* [CSO-all-no-historic-spills.csv](data/processed/CSO-all-no-historic-spills.csv) - all data as a CSV file (with historic spills data removed).

## Tools
If you just want to use the data, you probably don't need to run these tools and can focus on the [data](/data) folder.

### download.js
JSON data on CSO discharge is not available as a single file.  Instead, Southern Water's API provides 25 records per 'page'.  This tool therefore requests every page sequentially and stores each as a file in the `data` subfolder.  These are the `CSO-n.json` files found in `data/raw`.  This tool may take several hours to run and when it does so it will replace all the files in the data folder, following which a `git diff` should quickly show if there have been any material changes to any pages since the last committed version in the repository.  The `id` field in these files is prone to regular changes and is not stable between downloads (instead use `eventID`).

To run use: `node download.js`

** Arguments **
* `--from x` will start at page _x_, e.g. `node download.js --from 109` will begin downloading from page 109 and continue incrementally to the last page (or a page specified by `--to`).
* `--to y` will stop at page _y_, e.g. `node download.js --to 115` will incrementally download all pages up to and including page 115.
* `--all` will run a complete download, starting at page one and retrieving all pages up to and including the last current page.  e.g. `node download.js --all`
* `--update` will reload the last page retrieved and any subsequent pages that have been added since then.  e.g. `node download.js --update`
 
### combine.js
This tool combines all the `CSO-n.json` files into a single `CSO-all.json` file.  In each file there is an `items` field that contains 25 records.  These items fields are combined such that the items field in `CSO-all.json` is very large (18701 during the first successful run - a number which will only increase) and the resulting file is therefore also large (tens of megabytes).

To run use: `node combine.js`

### process.js
This tool includes various functions for processing the data, the output of which goes in the data/processed subfolder.

To run use: `node process.js`