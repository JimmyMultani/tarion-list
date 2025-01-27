import fs from 'fs';
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

async function getImages(attachments, id) {
  if (attachments.length > 0) {
    return attachments[0].attachmentName;
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
  await addRows(interior);

  await addRows(exterior);

  fs.writeFileSync('data.csv', csv, 'utf-8');
}

runAsync();
