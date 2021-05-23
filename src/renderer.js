const { ipcRenderer } = require('electron');
// 引入 ipcRenderer 模块。

let all = 0;
let pre = 0;

window.$ = window.jQuery = require('./libs/jquery.min.js');
require('./libs/bootstrap/js/bootstrap.min.js');

function info() {
  const v = process.versions;
  return `Powered by Electron: ${ v.electron } Node: ${ v.node } Chrome: ${ v.chrome }. Yourtion`;
}

$(function () {
  $('#upload').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('open-file-dialog');
  });

  $('#select-save-path').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('open-dir-dialog');
  });

  $('#start').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    const subDir = $('#sub-dir').val();
    const path = $('#save-path').text();
    if (!subDir || !path) {
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
    if (isNaN(width)) {
      $('#input-width').addClass('has-error');
      alert('宽度必须是数字');
      return;
    }
    $('#input-width').removeClass('has-error');
    $('#start').attr('disabled', 'true');
    $('#start').text('二维码生成中...');

    if (errorCorrectionLevel) obj.errorCorrectionLevel = errorCorrectionLevel;
    if (width) obj.width = Number(width);
    if (dark) obj.color.dark = dark + 'ff';
    if (light) obj.color.light = light + 'ff';
    ipcRenderer.send('start', obj, path, subDir);
  });

  ipcRenderer.on('gen-done', function () {
    $('#start').removeAttr('disabled');
    $('#start').text('开始生成');
    $('#process').hide();
    const notification = new Notification('二维码生成完成', { silent: true });
    notification.onclick = () => ipcRenderer.send('forceWindow', 'main');
    // main.setBadge('1');
    // main.setProcess(-1);
  });

  ipcRenderer.on('selected-directory', function (event, path, prefix) {
    $('#selected-file').html(path);
    if (prefix) {
      $('#sub-dir').val(prefix);
    }
  });

  ipcRenderer.on('selected-dist', function (event, path) {
    $('#save-path').text(path + '/');
  });

  ipcRenderer.on('process', function (event, type, data) {
    // console.log(type, data)
    if (type === 'all') {
      all = Number(data);
      if (all > 100) {
        $('#progress-bar').width(0);
        $('#process').show();
      }
    }
    if (type === 'one' && all) {
      const precent = ((Number(data) / all) * 100).toFixed(2);
      const p = parseInt(precent + 0.5, 10);
      if (pre !== p) {
        $('#progress-bar').width(p + '%');
        pre = p;
      }
      $('#progress-bar span').text(precent + '%');
      // main.setProcess(Number(data) / all);
    }
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
    ipcRenderer.send('drop-file-ok', path);
    return false;
  };

  $('#footer').html(info());
});
