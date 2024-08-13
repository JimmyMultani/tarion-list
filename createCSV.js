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

function sortRows(rows) {
  return rows.sort(
    (a, b) =>
      a.floorLevel.localeCompare(b.floorLevel) ||
      a.roomArea.localeCompare(b.roomArea) ||
      a.item.localeCompare(b.item),
  );
}

function addRows(rows) {
  const sortedRows = sortRows(rows);

  sortedRows.forEach((row) => {
    csv += `${row.lineItemNumber},${row.interiorExterior},${row.floorLevel},${
      row.roomArea
    },${row.item},${row.description.replace(/(\r\n|\n|\r)/gm, '')}\n`;
  });
}

addRows(interior);

addRows(exterior);

fs.writeFileSync('data.csv', csv, 'utf-8');
