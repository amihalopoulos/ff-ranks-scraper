const setup = require('./starter-kit/setup');
const scrape = require('./scraper');

const puppeteer = require('puppeteer');
const $ = require('cheerio');
const url = 'https://fantasycalc.com/#/players';

const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.handler = async (event, context, callback) => {
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  try {
    const result = await exports.run(browser);
    callback(null, result);
  } catch (e) {
    callback(e);
  }
};

exports.getFantasyTradeValues = async (event, context, callback) => {
  const browser = await setup.getBrowser();

  try {
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

    await s3.putObject({
      Bucket: process.env.BUCKET,
      Body: JSON.stringify(final),
      Key: "ranks"
    }).promise();

    callback(null, final);
  } catch (e) {
    callback(e);
  }

};

exports.run = async (browser) => {
  // implement here
  // this is sample
  const page = await browser.newPage();
  await page.goto('https://www.google.co.jp',
   {waitUntil: ['domcontentloaded', 'networkidle0']}
  );
  console.log((await page.content()).slice(0, 500));

  await page.type('#lst-ib', 'aaaaa');
  // avoid to timeout waitForNavigation() after click()
  await Promise.all([
    // avoid to
    // 'Cannot find context with specified id undefined' for localStorage
    page.waitForNavigation(),
    page.click('[name=btnK]'),
  ]);

/* screenshot
  await page.screenshot({path: '/tmp/screenshot.png'});
  const aws = require('aws-sdk');
  const s3 = new aws.S3({apiVersion: '2006-03-01'});
  const fs = require('fs');
  const screenshot = await new Promise((resolve, reject) => {
    fs.readFile('/tmp/screenshot.png', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
  await s3.putObject({
    Bucket: '<bucket name>',
    Key: 'screenshot.png',
    Body: screenshot,
  }).promise();
*/

  // cookie and localStorage
  await page.setCookie({name: 'name', value: 'cookieValue'});
  console.log(await page.cookies());
  console.log(await page.evaluate(() => {
    localStorage.setItem('name', 'localStorageValue');
    return localStorage.getItem('name');
  }));
  await page.close();
  return 'done';
};
