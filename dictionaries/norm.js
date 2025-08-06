const fs = require('fs');

const inputFile = 'spanish.txt';
const outputFile = 'spanish.txt';

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) throw err;
  const noDiacritics = data.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  fs.writeFile(outputFile, noDiacritics, 'utf8', err => {
    if (err) throw err;
  });
});
