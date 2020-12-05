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
  return String(str).indexOf('http') === 0;
}

function getPrefix(source) {
  const prefixArr = path.basename(source).split('_');
  if (prefixArr.length > 1) {
    return prefixArr[0];
  }
  return;
}

function genQR(path, text, opts = {}) {
  return new Promise((resove, reject) => {
    qr.toFile(path, text, opts, (err) => {
      if (err) reject(err);
      resove(path);
    });
  });
}

function readExcel(file) {
  return new Promise((resove, reject) => {
    fs.readFile(file, (err, buffer) => {
      if (err) reject(err);
      const workSheets = xlsx.parse(buffer);
      resove(workSheets);
    });
  });
}

async function saveQR(event, options) {
  if (!sourcePath || !savePath) return;
  const file = await readExcel(sourcePath);
  const data = file[0] && file[0].data;
  if (!data || data.length < 0) return;
  const prefix = savePath.split('/').pop();
  // console.log(prefix, data);
  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
  }
  let i = 0;
  event.sender.send('process', 'all', data.length);
  for (const row of data) {
    const id = row && row[1];
    const name = row && row[2];
    const str = row && row[0];
    if (str && isUrl(str)) {
      i += 1;
      const filename =
        id && name
          ? `${ id }_${ name }.png`
          : `${ prefix }_${ leftPad(i, 8) }.png`;
      const filePath = path.resolve(savePath, filename);
      // console.log(row, filePath);
      await genQR(filePath, str, options);
      event.sender.send('process', 'one', i);
      event.sender.send('process', 'file', filename);
    }
  }
  shell.showItemInFolder(savePath);
}

ipc.on('open-file-dialog', async function (event) {
  if (isOpen) return;
  isOpen = true;
  try {
    const ret = await dialog.showOpenDialog({
      properties: [ 'openFile' ],
      filters: [{ name: 'Excel', extensions: [ 'xlsx', 'xls' ]}],
    });
    if (ret.filePaths && ret.filePaths.length > 0) {
      const prefix = getPrefix(ret.filePaths[0]);
      sourcePath = ret.filePaths[0];
      event.sender.send('selected-directory', ret.filePaths[0], prefix);
    }
  } catch (error) {
    console.error(error);
  } finally {
    isOpen = false;
  }
});

ipc.on('open-dir-dialog', async function (event) {
  if (isOpen) return;
  isOpen = true;
  try {
    const ret = await dialog.showOpenDialog({
      properties: [ 'openDirectory' ],
    });
    if (ret.filePaths && ret.filePaths.length > 0) {
      savePath = ret.filePaths[0];
      event.sender.send('selected-dist', ret.filePaths[0]);
    }
  } catch (error) {
    console.error(error);
  } finally {
    isOpen = false;
  }
});

ipc.on('drop-file-ok', function (event, dist) {
  sourcePath = dist;
  const prefix = getPrefix(sourcePath);
  event.sender.send('selected-directory', dist, prefix);
});

ipc.on('start', async function (event, options, dist, dir) {
  if (isOpen) return;
  isOpen = true;
  savePath = path.resolve(dist, dir);
  try {
    await saveQR(event, options);
  } catch (error) {
    console.error(error);
  } finally {
    isOpen = false;
  }
  event.sender.send('gen-done');
});
