import fs from 'fs';
import puppeteer from 'puppeteer';
import data from './data.json' assert { type: 'json' };

async function downloadImageFromBlobUrl(blobUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Create a temporary HTML page
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Temporary Image Page</title>
        </head>
        <body>
            <img src="${blobUrl}" />
        </body>
        </html>
    `;

  // Navigate to the temporary page
  await page.setContent(html);

  // Capture the screenshot
  const imageBuffer = await page.screenshot({ type: 'png' });

  await browser.close();

  return imageBuffer;
}

const headers =
  'Item Number,Interior/Exterior,Floor/Level,Room/Area,Item,Description,Attachments';

let csv = headers + '\n';

const interior = data.returnValue.filter(
  (row) => row.interiorExterior === 'INTERIOR',
);
const exterior = data.returnValue.filter(
  (row) => row.interiorExterior === 'EXTERIOR',
);

const cookieSettings = {
  sid: '00D5X0000008aQ3!AQEAQL0UUEqnQEYfLrSY4rP8.blUzcsni.oEDWXiD.ho1Dbqp5bzlOCIS.hWy_DejAcmxmiPtnfwEcWzMZX5G0KcL11ueqvi',
};

const cookies = Object.keys(cookieSettings).map((key) => {
  return {
    name: key,
    value: cookieSettings[key],
    domain: 'myhome.tarion.com',
    path: '/',
    secure: true,
  };
});

async function getImageBlobFromIframe(iframeUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set cookies for the page
  await browser.setCookie(...cookies);
  // await Promise.all(cookies.map((cookie) => page.setCookie(cookie)));

  const url = new URL(iframeUrl);
  const id = url.searchParams.get('cmItemId');
  const newUrl = `https://myhome.tarion.com/myhome/apex/MH_PreviewPage?cmItemId=${id}`;

  await page.goto(newUrl);

  // Get the iframe element
  const iframeHandle = await page.waitForSelector('iframe');

  // Get the iframe's frame
  const iframeFrame = await iframeHandle.contentFrame();

  const frameElement = await iframeFrame.frameElement();
  const blobUrl = await (await frameElement.getProperty('src')).jsonValue();
  console.log('blobUrl', blobUrl);

  await browser.close();
  return blobUrl;
}

async function getImages(attachments, id) {
  if (attachments.length > 0) {
    const baseUrl = 'https://myhome.tarion.com';

    const blobUrl = await getImageBlobFromIframe(
      `${baseUrl}${attachments[0].url}`,
    );

    const imageBuffer = await downloadImageFromBlobUrl(blobUrl);

    // Save the image to a file
    await fs.writeFile(`${id}.jpg`, imageBuffer);

    return id;
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
    const images = await getImages(row.attachments, row.lineItemNumber);

    csv += `${row.lineItemNumber},${row.interiorExterior},${row.floorLevel},${
      row.roomArea
    },"${row.item}","${row.description.replace(
      /(\r\n|\n|\r)/gm,
      '',
    )}",${images}\n`;
  }
}

async function runAsync() {
  await addRows([
    {
      accordionName: 'Item Number - 182',
      attachments: [
        {
          attachmentName: 'Tarion-1year-216.jpg',
          url: '/myhome/s/file-preview?cmItemId=A1001001A24D26A04313J14228',
        },
      ],
      description:
        'The builder didn’t provide a proper AC rough-in. Only included electrical wire and no duct connection on the 4th floor deck. This left us with the only possible connection on the side of the house which overhangs the neighbour’s property. This resulted in legal issues for us.',
      floorLevel: 'Lot/Property/Yard',
      interiorExterior: 'EXTERIOR',
      item: 'Other (Please describe)',
      lineItemNumber: '182',
      roomArea: 'Not Applicable (Choose your next selection)',
    },
  ]);
  // await addRows(interior);

  // await addRows(exterior);

  fs.writeFileSync('data.csv', csv, 'utf-8');
}

runAsync();
