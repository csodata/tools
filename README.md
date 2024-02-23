#  Splash
## CSO discharge data from Southern Water's Beachbuoy service

This [repository](https://github.com/portsoc/splash) contains tools for reading and processing Combined Serage Overspill (CSO) discharge data from Southern Water's Beachbuoy service.
Beachbuoy is a website that provides CSO discharge information in discrete pages, with 25 records per page.  Anybody wishing to analyse the data would have to manually downloading each page and combine the data by hand: a process that would take many hours and be prone to error.  Herein are tools that solve that problem by automating the process. 

Code is written using JavaScript/node (tested on version 19).

## Installation
```shell
gh repo clone portsoc/splash
```

## Feedback
If you notice any problems or have enhancements to suggest, please add an entry in the [issues](https://github.com/portsoc/splash/issues) page.

## Sample Data
If you just want to use the data, you probably don't need to run these tools and can focus on the [data](/data) folder, files include:

### JSON files
* [CSO-all-meta.json](data/processed/CSO-all-meta.json) - metadata (e.g. total minutes) derived from analysing the downloaded data.
* [CSO-all.json](data/processed/CSO-all.json) - all data retrieved from Southern Water.
* [CSO-all-simplified-historic-spills.json](data/processed/CSO-all-simplified-historic-spills.json) - all data, but with duplicate data removed from historic spills which reduces the size by ~50%.
* [cso-status-genuine.json](data/processed/cso-status-genuine.json)
* [cso-status-not-genuine.json](data/processed/cso-status-not-genuine.json)
* [cso-status-under-review.json](data/processed/cso-status-under-review.json)

### Comma Separated variable
* [CSO-all-no-historic-spills.csv](data/processed/CSO-all-no-historic-spills.csv) - all data as a CSV file (with historic spills data removed).

## Tools

### download.js
This tool requests data from every page and stores each as a file in the `data` subfolder.  These are the `CSO-n.json` files found in `data/raw`.  This tool may take several hours to run and when it does so it will replace all the files in the data folder, following which a `git diff` should quickly show if there have been any material changes to any pages since the last committed version in the repository.  The `id` field in these files is prone to regular changes and is not stable between downloads (instead use `eventID`).

To run use:
```shell
node download.js
```

#### Arguments
* `--from x` will start at page _x_, e.g. `node download.js --from 109` will begin downloading from page 109 and continue incrementally to the last page (or a page specified by `--to`).
* `--to y` will stop at page _y_, e.g. `node download.js --to 115` will incrementally download all pages up to and including page 115.
* `--all` will run a complete download, starting at page one and retrieving all pages up to and including the last current page.  e.g. `node download.js --all`
* `--update` will reload the last page retrieved and any subsequent pages that have been added since then.  e.g. `node download.js --update`
 
### combine.js
This tool combines all the `CSO-n.json` files into a single `CSO-all.json` file.  In each file there is an `items` field that contains 25 records.  These items fields are combined such that the items field in `CSO-all.json` is very large (18701 during the first successful run - a number which will only increase) and the resulting file is therefore also large (tens of megabytes).

To run use: 
```shell
node combine.js
```

### process.js
This tool includes various functions for processing the data, the output of which goes in the data/processed subfolder.

To run use:
```shell
node process.js
```
