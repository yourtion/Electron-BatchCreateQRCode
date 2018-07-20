const fs = require('fs');
const path = require('path');
const qr = require('qrcode');
const xlsx = require('node-xlsx').default;

const ipc = require('electron').ipcMain;
const { dialog, shell } = require('electron');

let isOpen = false;
let savePath;
let sourcePath;

function leftPad(n, c) {
  let res = String(n);
  while (res.length < c) {
    res = '0' + res;
  }
  return res;
}

function isUrl(str) {
  return str.indexOf('http') === 0;
}

function getPrefix(source) {
  const prefixArr = path.basename(source).split('_');
  if(prefixArr.length > 1) {
    return prefixArr[0];
  }
  return;
}

function genQR(path, text, opts = {}) {
  return new Promise((resove, reject) => {
    qr.toFile(path, text, opts, (err) => {
      if(err) reject(err);
      resove(path);
    });
  });
}

function readExcel(file) {
  return new Promise((resove, reject) => {
    fs.readFile(file, (err, buffer) => {
      if(err) reject(err);
      const workSheets = xlsx.parse(buffer);
      resove(workSheets);
    });
  });
}

async function saveQR(options) {
  if(!sourcePath || !savePath) return;
  const file = await readExcel(sourcePath);
  const data = file[0] && file[0].data;
  if(!data || data.length < 0) return;
  const prefix = savePath.split('/').pop();
  // console.log(prefix, data);
  if (!fs.existsSync(savePath)){
    fs.mkdirSync(savePath);
  }
  let i = 0;
  for(const row of data) {
    const str = row && row[0];
    if(str && isUrl(str)) {
      i += 1;
      const filePath = path.resolve(savePath, `${ prefix }_${ leftPad(i, 8) }.png`);
      // console.log(row, filePath);
      await genQR(filePath, str, options);
    }
  }
  shell.showItemInFolder(savePath);
}

ipc.on('open-file-dialog', function (event) {
  if(isOpen) return;
  isOpen = true;
  dialog.showOpenDialog({
    properties: [ 'openFile' ],
    filters: [
      { name: 'Excel', extensions: [ 'xlsx', 'xls' ]},
    ],
  }, function (files) {
    if (files && files[0]) {
      sourcePath = files[0];
      const prefix = getPrefix(sourcePath);
      event.sender.send('selected-directory', files[0], prefix);
    }
    isOpen = false;
  });
});

ipc.on('open-dir-dialog', function (event) {
  if(isOpen) return;
  isOpen = true;
  dialog.showOpenDialog({
    properties: [ 'openDirectory' ],
  }, async function (files) {
    if(files && files[0]) {
      event.sender.send('selected-dist', files[0]);
    }
    isOpen = false;
  });
});

ipc.on('drop-file-ok', function (event, dist) {
  sourcePath = dist;
  const prefix = getPrefix(sourcePath);
  event.sender.send('selected-directory', dist, prefix);
});

ipc.on('start', async function (event, options, dist, dir) {
  if(isOpen) return;
  isOpen = true;
  savePath = path.resolve(dist, dir);
  await saveQR(options);
  isOpen = false;
});
