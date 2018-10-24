const puppeteer = require('puppeteer');
const $ = require('cheerio');
const url = 'https://fantasycalc.com/#/players';

async function scrape(){
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, {waitUntil: 'networkidle0'});
  let html = await page.content();

  var last;
  let final = [];
  await $('.mat-table', html).find('.ng-star-inserted').each((i, row) => {
    let value = $(row).children('.mat-cell.small').text();
    if (value && value.length && parseFloat(value)) {
      last = parseFloat(value)
    }

    $(row).find('.mat-cell.name').each( (x, col) => {
      let name = $(col).find('app-table-row > div > div > a').text()
      if (name.length > 0) {
        final.push({
          'name': name,
          'value': last
        })
      }
    })
  }).get()

  await browser.close();

  return final
}

module.exports = {
  scrape
};