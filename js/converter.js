'use strict';

const CONVERTER_MAX_SIZE = 25 * 1024 * 1024;
let converterEnginePromise = null;

const converterState = {
  word: null,
  pdf: null,
};

const converterConfig = {
  word: {
    input: '#wordFileInput',
    dropzone: '#wordDropzone',
    selected: '#wordSelectedFile',
    fileName: '#wordFileName',
    fileMeta: '#wordFileMeta',
    remove: '#removeWordFile',
    clear: '#clearWordBtn',
    convert: '#convertWordBtn',
    progress: '#wordProgress',
    progressText: '#wordProgressText',
    progressValue: '#wordProgressValue',
    progressBar: '#wordProgressBar',
    extension: '.docx',
    label: 'Word',
  },
  pdf: {
    input: '#pdfFileInput',
    dropzone: '#pdfDropzone',
    selected: '#pdfSelectedFile',
    fileName: '#pdfFileName',
    fileMeta: '#pdfFileMeta',
    remove: '#removePdfFile',
    clear: '#clearPdfBtn',
    convert: '#convertPdfBtn',
    progress: '#pdfProgress',
    progressText: '#pdfProgressText',
    progressValue: '#pdfProgressValue',
    progressBar: '#pdfProgressBar',
    extension: '.pdf',
    label: 'PDF',
  },
};

function converterQuery(selector) {
  return document.querySelector(selector);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(index === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

function notify(title, description = '', type = 'success') {
  if (typeof window.sstToast === 'function') {
    window.sstToast(title, description, type);
    return;
  }
  console[type === 'error' ? 'error' : 'log'](`${title}: ${description}`);
}

function isAcceptedFile(kind, file) {
  if (!file) return false;
  return file.name.toLowerCase().endsWith(converterConfig[kind].extension);
}

function setProgress(kind, value, message, status = '') {
  const config = converterConfig[kind];
  const box = converterQuery(config.progress);
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  box.hidden = false;
  box.dataset.status = status;
  converterQuery(config.progressText).textContent = message || 'Processando...';
  converterQuery(config.progressValue).textContent = `${Math.round(normalized)}%`;
  converterQuery(config.progressBar).style.width = `${normalized}%`;
}

function hideProgress(kind) {
  const config = converterConfig[kind];
  const box = converterQuery(config.progress);
  box.hidden = true;
  box.dataset.status = '';
  converterQuery(config.progressBar).style.width = '0%';
}

function clearFile(kind, keepProgress = false) {
  const config = converterConfig[kind];
  converterState[kind] = null;
  converterQuery(config.input).value = '';
  converterQuery(config.selected).hidden = true;
  converterQuery(config.dropzone).hidden = false;
  converterQuery(config.convert).disabled = true;
  converterQuery(config.clear).disabled = true;
  if (!keepProgress) hideProgress(kind);
}

function selectFile(kind, file) {
  const config = converterConfig[kind];
  if (!isAcceptedFile(kind, file)) {
    notify('Formato não aceito', `Selecione um arquivo ${config.extension}.`, 'error');
    return;
  }
  if (file.size > CONVERTER_MAX_SIZE) {
    notify('Arquivo muito grande', 'O limite para conversão local é de 25 MB.', 'error');
    return;
  }

  converterState[kind] = file;
  converterQuery(config.fileName).textContent = file.name;
  converterQuery(config.fileMeta).textContent = `${formatFileSize(file.size)} • pronto para converter`;
  converterQuery(config.selected).hidden = false;
  converterQuery(config.dropzone).hidden = true;
  converterQuery(config.convert).disabled = false;
  converterQuery(config.clear).disabled = false;
  hideProgress(kind);
}

function loadConverterEngine(kind) {
  if (!converterEnginePromise) {
    setProgress(kind, 4, 'Carregando recursos de conversão...');
    converterEnginePromise = import('../vendor/converter-engine.js').catch(error => {
      converterEnginePromise = null;
      throw error;
    });
  }
  return converterEnginePromise;
}

async function runConversion(kind) {
  const file = converterState[kind];
  const config = converterConfig[kind];
  if (!file) {
    notify('Selecione um arquivo', `Escolha um arquivo ${config.extension} antes de converter.`, 'error');
    return;
  }

  const convertButton = converterQuery(config.convert);
  const clearButton = converterQuery(config.clear);
  convertButton.disabled = true;
  clearButton.disabled = true;
  convertButton.classList.add('is-loading');
  convertButton.setAttribute('aria-busy', 'true');

  try {
    setProgress(kind, 3, 'Iniciando conversão...');
    const engine = await loadConverterEngine(kind);
    const onProgress = (value, message) => setProgress(kind, value, message);

    if (kind === 'word') {
      const result = await engine.convertDocxToPdf(file, { onProgress });
      setProgress(kind, 100, 'PDF convertido e baixado.', 'success');
      notify('Conversão concluída', `${result.filename} foi enviado para seus downloads.`);
    } else {
      const result = await engine.convertPdfToDocx(file, { onProgress });
      setProgress(kind, 100, 'Word convertido e baixado.', 'success');
      notify('Conversão concluída', `${result.filename} foi enviado para seus downloads.`);
    }
  } catch (error) {
    console.error(error);
    const message = error?.message || 'Não foi possível converter este arquivo.';
    setProgress(kind, 100, message, 'error');
    notify('Falha na conversão', message, 'error');
  } finally {
    convertButton.disabled = false;
    clearButton.disabled = false;
    convertButton.classList.remove('is-loading');
    convertButton.removeAttribute('aria-busy');
  }
}

function bindDropzone(kind) {
  const config = converterConfig[kind];
  const input = converterQuery(config.input);
  const dropzone = converterQuery(config.dropzone);

  input?.addEventListener('change', () => selectFile(kind, input.files?.[0]));
  dropzone?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input?.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => dropzone?.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.add('dragging');
  }));

  ['dragleave', 'drop'].forEach(eventName => dropzone?.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.remove('dragging');
  }));

  dropzone?.addEventListener('drop', event => selectFile(kind, event.dataTransfer?.files?.[0]));
  converterQuery(config.remove)?.addEventListener('click', () => clearFile(kind));
  converterQuery(config.clear)?.addEventListener('click', () => clearFile(kind));
  converterQuery(config.convert)?.addEventListener('click', () => runConversion(kind));
}

function initConverter() {
  if (!converterQuery('#conversor')) return;
  bindDropzone('word');
  bindDropzone('pdf');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConverter, { once: true });
} else {
  initConverter();
}
