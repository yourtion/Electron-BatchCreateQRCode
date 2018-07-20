// 引入 ipcRenderer 模块。
const ipc = require('electron').ipcRenderer;

window.$ = window.jQuery = require('./libs/jquery.min.js');
require('./libs/bootstrap/js/bootstrap.min.js');

function isDev() {
  return process.mainModule.filename.indexOf('app.asar') === -1;
}

function info() {
  const v = process.versions;
  return `Powered by Electron: ${ v.electron } Node: ${ v.node } Chrome: ${ v.chrome } ${ isDev() ? 'Dev' : 'Prod' }. Yourtion`;
}

$(function () {

  $('#upload').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    ipc.send('open-file-dialog');
  });

  $('#select-save-path').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    ipc.send('open-dir-dialog');
  });

  $('#start').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    const subDir = $('#sub-dir').val();
    const path = $('#save-path').text();
    if(!subDir || !path) {
      $('#dist-path').addClass('has-error');
      alert('请先选择保存路径和输入子目录');
      return;
    }
    $('#dist-path').removeClass('has-error');

    const obj = {
      color: {},
    };
    const errorCorrectionLevel = $('#errorCorrectionLevel').val();
    const width = Number($('#width').val());
    const dark = $('#dark').val();
    const light = $('#light').val();
    if(isNaN(width)) {
      $('#input-width').addClass('has-error');
      alert('宽度必须是数字');
      return;
    }
    $('#input-width').removeClass('has-error');

    if(errorCorrectionLevel) obj.errorCorrectionLevel = errorCorrectionLevel;
    if(width) obj.width = Number(width);
    if(dark) obj.color.dark = dark + 'ff';
    if(light) obj.color.light = light + 'ff';

    ipc.send('start', obj, path, subDir);
  });

  ipc.on('selected-directory', function (event, path, prefix) {
    $('#selected-file').html(path);
    if(prefix) {
      $('#sub-dir').val(prefix);
    }
  });

  ipc.on('selected-dist', function (event, path) {
    $('#save-path').text(path + '/');
  });

  const holder = document.getElementById('drag-file');
  holder.ondragover = () => {
    return false;
  };

  holder.ondragleave = () => {
    return false;
  };

  holder.ondragend = () => {
    return false;
  };

  holder.ondrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const path = e.dataTransfer.files[0].path;
    const file = e.dataTransfer.files[0].name;
    const ext = file.split('.').pop();
    if ([ 'xlsx', 'xls' ].indexOf(ext) === -1) {
      alert('文件不是Excle');
      return;
    }
    ipc.send('drop-file-ok', path);
    return false;
  };

  $('#footer').html(info());
});

