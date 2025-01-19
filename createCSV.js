import fs from 'fs';
import puppeteer from 'puppeteer';
import data from './data.json' assert { type: 'json' };

const headers =
  'Item Number,Interior/Exterior,Floor/Level,Room/Area,Item,Description,Attachments';

let csv = headers + '\n';

const interior = data.returnValue.filter(
  (row) => row.interiorExterior === 'INTERIOR',
);
const exterior = data.returnValue.filter(
  (row) => row.interiorExterior === 'EXTERIOR',
);

const cookiesString =
  'CookieConsentPolicy=0:1; LSKey-c$CookieConsentPolicy=0:1; guest_uuid_essential_0DM5W00000000at=6d240266-ac20-4742-8981-4f339d524955; oid=00D5X0000008aQ3; PreferredLanguage0DM5W00000000atWAA=en-US; oinfo=c3RhdHVzPUFDVElWRSZ0eXBlPTYmb2lkPTAwRDVYMDAwMDAwOGFRMw==; autocomplete=1; sid=00D5X0000008aQ3!AQEAQIKOR0mX41ml_ef4swbzCLuHPGbVfPP9ISewTuDyG4t5y_vaDc5o2WH.TEH9joFKtcvt3V4B9pjqJeAdAC1pSofTLLUN; sid_Client=W000000izyGX0000008aQ3; clientSrc=76.67.127.58; inst=APP_N3; __Secure-has-sid=1';

const cookies = cookiesString.split(';').map((item) => {
  const arr = item.split('=');
  const name = arr[0].trim().replace('"', '');
  const value = arr[1];

  return {
    name,
    value,
    domain: 'myhome.tarion.com',
    path: '/',
    secure: true,
  };
});

console.log(cookies);

async function getImageSrcFromIframe(iframeUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set cookies for the page
  await browser.setCookie(...cookies);
  // await Promise.all(cookies.map((cookie) => page.setCookie(cookie)));

  await page.goto(iframeUrl);

  // Wait for the iframe to load and its content to render
  await page.waitForSelector('iframe');

  await page.waitForFunction(() => {
    return (
      document.querySelector('iframe')?.contentDocument?.readyState ===
      'complete'
    );
  });

  // Extract the image src from the rendered iframe content
  const imageSrc = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');

    const image = iframes[0]?.contentDocument?.querySelector('img');

    return image ? image.src : null;
  });

  await browser.close();
  return imageSrc;
}

async function getImages(attachments) {
  if (attachments.length > 0) {
    const baseUrl = 'https://myhome.tarion.com';

    return await getImageSrcFromIframe(`${baseUrl}${attachments[0].url}`);
  }

  return '';
}

function sortRows(rows) {
  return rows.sort(
    (a, b) =>
      a.floorLevel.localeCompare(b.floorLevel) ||
      a.roomArea.localeCompare(b.roomArea) ||
      a.item.localeCompare(b.item),
  );
}

async function addRows(rows) {
  const sortedRows = sortRows(rows);

  for (const row of sortedRows) {
    const images = await getImages(row.attachments);

    csv += `${row.lineItemNumber},${row.interiorExterior},${row.floorLevel},${
      row.roomArea
    },"${row.item}","${row.description.replace(
      /(\r\n|\n|\r)/gm,
      '',
    )}",${images}\n`;
  }
}

async function runAsync() {
  await addRows(interior);

  await addRows(exterior);

  fs.writeFileSync('data.csv', csv, 'utf-8');
}

runAsync();
