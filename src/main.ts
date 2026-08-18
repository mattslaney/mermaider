import mermaid from 'mermaid';
import { clampRatio, layouts, resolveLayout, type Layout, type Pane } from './layout.ts';
import './style.css';

type Theme = 'light' | 'dark';

interface State {
  source: string;
  layout: Layout;
  ratio: number;
  collapsed: Pane | null;
  theme: Theme;
  exportTheme: Theme;
  transparent: boolean;
  background: string;
}

const STORAGE_KEY = 'mermaider-state-v1';
const defaultSource = `flowchart LR
  Idea([Idea]) --> Draft[Write Mermaid]
  Draft --> Preview{Looks right?}
  Preview -- Yes --> Export[Export PNG]
  Preview -- No --> Draft`;

const defaultState: State = {
  source: defaultSource,
  layout: 'auto',
  ratio: 0.5,
  collapsed: null,
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  exportTheme: 'light',
  transparent: false,
  background: '#ffffff',
};

function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<State>;
    return {
      source: typeof saved.source === 'string' ? saved.source : defaultState.source,
      layout: layouts.includes(saved.layout as Layout) ? (saved.layout as Layout) : defaultState.layout,
      ratio: typeof saved.ratio === 'number' ? clampRatio(saved.ratio) : defaultState.ratio,
      collapsed: saved.collapsed === 'source' || saved.collapsed === 'preview' ? saved.collapsed : null,
      theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : defaultState.theme,
      exportTheme: saved.exportTheme === 'light' || saved.exportTheme === 'dark' ? saved.exportTheme : defaultState.exportTheme,
      transparent: typeof saved.transparent === 'boolean' ? saved.transparent : defaultState.transparent,
      background: typeof saved.background === 'string' && /^#[\da-f]{6}$/i.test(saved.background) ? saved.background : defaultState.background,
    };
  } catch {
    return defaultState;
  }
}

const state = loadState();

document.querySelector<HTMLElement>('#app')!.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">M</span>
        <div>
          <h1>Mermaider</h1>
          <p>Shape ideas in plain text.</p>
        </div>
      </div>
      <div class="controls" aria-label="Editor controls">
        <label>
          <span>Layout</span>
          <select id="layout">
            <option value="auto">Auto</option>
            <option value="source-left">Source left</option>
            <option value="preview-top">Preview top</option>
            <option value="preview-left">Preview left</option>
            <option value="source-top">Source top</option>
          </select>
        </label>
        <button id="collapse-source" type="button">Hide source</button>
        <button id="collapse-preview" type="button">Hide preview</button>
        <button id="theme" type="button"></button>
        <details id="export-menu" class="export-menu">
          <summary>Export</summary>
          <div class="export-panel">
            <h2>Export PNG</h2>
            <label>
              <span>Diagram theme</span>
              <select id="export-theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label class="check-control">
              <input id="transparent" type="checkbox" />
              <span>Transparent background</span>
            </label>
            <label>
              <span>Solid colour</span>
              <input id="background" type="color" />
            </label>
            <button id="export" class="primary-button" type="button">Download PNG</button>
          </div>
        </details>
      </div>
    </header>

    <main class="workspace" data-axis="horizontal">
      <section class="pane source-pane" aria-labelledby="source-heading">
        <div class="pane-heading">
          <h2 id="source-heading">Source</h2>
          <span>Mermaid</span>
        </div>
        <textarea id="source" aria-label="Mermaid source" aria-describedby="render-error" spellcheck="false"></textarea>
      </section>

      <div id="separator" class="separator" role="separator" tabindex="0" aria-label="Resize panes" aria-valuemin="15" aria-valuemax="85">
        <span aria-hidden="true"></span>
      </div>

      <section class="pane preview-pane" aria-labelledby="preview-heading">
        <div class="pane-heading">
          <h2 id="preview-heading">Preview</h2>
          <span id="render-status" role="status" aria-live="polite">Rendering</span>
        </div>
        <div id="preview" class="preview"></div>
        <p id="render-error" class="render-error" role="alert" hidden></p>
      </section>
    </main>
  </div>
`;

const workspace = document.querySelector<HTMLElement>('.workspace')!;
const sourcePane = document.querySelector<HTMLElement>('.source-pane')!;
const previewPane = document.querySelector<HTMLElement>('.preview-pane')!;
const separator = document.querySelector<HTMLElement>('#separator')!;
const editor = document.querySelector<HTMLTextAreaElement>('#source')!;
const preview = document.querySelector<HTMLElement>('#preview')!;
const errorDisplay = document.querySelector<HTMLElement>('#render-error')!;
const statusDisplay = document.querySelector<HTMLElement>('#render-status')!;
const layoutSelect = document.querySelector<HTMLSelectElement>('#layout')!;
const sourceButton = document.querySelector<HTMLButtonElement>('#collapse-source')!;
const previewButton = document.querySelector<HTMLButtonElement>('#collapse-preview')!;
const themeButton = document.querySelector<HTMLButtonElement>('#theme')!;
const exportMenu = document.querySelector<HTMLDetailsElement>('#export-menu')!;
const exportThemeSelect = document.querySelector<HTMLSelectElement>('#export-theme')!;
const transparentInput = document.querySelector<HTMLInputElement>('#transparent')!;
const backgroundInput = document.querySelector<HTMLInputElement>('#background')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;

editor.value = state.source;
layoutSelect.value = state.layout;
exportThemeSelect.value = state.exportTheme;
transparentInput.checked = state.transparent;
backgroundInput.value = state.background;
backgroundInput.disabled = state.transparent;

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateCollapseControls() {
  sourceButton.textContent = state.collapsed === 'source' ? 'Show source' : 'Hide source';
  previewButton.textContent = state.collapsed === 'preview' ? 'Show preview' : 'Hide preview';
  sourceButton.setAttribute('aria-pressed', String(state.collapsed === 'source'));
  previewButton.setAttribute('aria-pressed', String(state.collapsed === 'preview'));
}

function applyLayout() {
  const { axis, first } = resolveLayout(state.layout, window.innerWidth, window.innerHeight);
  const sourceFirst = first === 'source';

  workspace.dataset.axis = axis;
  workspace.dataset.collapsed = state.collapsed ?? '';
  workspace.style.setProperty('--first', `${state.ratio}fr`);
  workspace.style.setProperty('--second', `${1 - state.ratio}fr`);
  sourcePane.style.order = sourceFirst ? '0' : '2';
  separator.style.order = '1';
  previewPane.style.order = sourceFirst ? '2' : '0';
  sourcePane.hidden = state.collapsed === 'source';
  previewPane.hidden = state.collapsed === 'preview';
  separator.hidden = state.collapsed !== null;
  separator.setAttribute('aria-orientation', axis);
  separator.setAttribute('aria-valuenow', String(Math.round(state.ratio * 100)));
  updateCollapseControls();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeButton.textContent = `Theme: ${state.theme === 'light' ? 'Light' : 'Dark'}`;
}

let renderQueue: Promise<void> = Promise.resolve();
let diagramId = 0;
let renderVersion = 0;
let renderTimer = 0;

function renderSvg(source: string, theme: Theme): Promise<string> {
  const task = renderQueue.then(async () => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      theme: theme === 'dark' ? 'dark' : 'default',
    });
    return (await mermaid.render(`diagram-${++diagramId}`, source)).svg;
  });
  renderQueue = task.then(() => undefined, () => undefined);
  return task;
}

function requestRender(delay = 0) {
  const version = ++renderVersion;
  window.clearTimeout(renderTimer);
  statusDisplay.textContent = 'Rendering';
  renderTimer = window.setTimeout(() => {
    void renderSvg(state.source, state.theme).then(
      (svg) => {
        if (version !== renderVersion) return;
        preview.innerHTML = svg;
        errorDisplay.hidden = true;
        statusDisplay.textContent = 'Ready';
      },
      (error: unknown) => {
        if (version !== renderVersion) return;
        errorDisplay.textContent = error instanceof Error ? error.message : String(error);
        errorDisplay.hidden = false;
        statusDisplay.textContent = 'Syntax error';
      },
    );
  }, delay);
}

editor.addEventListener('input', () => {
  state.source = editor.value;
  persist();
  requestRender(180);
});

layoutSelect.addEventListener('change', () => {
  state.layout = layoutSelect.value as Layout;
  state.collapsed = null;
  persist();
  applyLayout();
});

sourceButton.addEventListener('click', () => {
  state.collapsed = state.collapsed === 'source' ? null : 'source';
  persist();
  applyLayout();
});

previewButton.addEventListener('click', () => {
  state.collapsed = state.collapsed === 'preview' ? null : 'preview';
  persist();
  applyLayout();
});

themeButton.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  persist();
  applyTheme();
  requestRender();
});

exportThemeSelect.addEventListener('change', () => {
  state.exportTheme = exportThemeSelect.value as Theme;
  persist();
});

transparentInput.addEventListener('change', () => {
  state.transparent = transparentInput.checked;
  backgroundInput.disabled = state.transparent;
  persist();
});

backgroundInput.addEventListener('input', () => {
  state.background = backgroundInput.value;
  persist();
});

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error('The rendered SVG could not be converted to an image.')), { once: true });
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not create a PNG.')), 'image/png');
  });
}

async function exportPng() {
  exportButton.disabled = true;
  exportButton.textContent = 'Rendering...';

  try {
    const svg = await renderSvg(state.source, state.exportTheme);
    const svgDocument = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (svgDocument.querySelector('parsererror')) throw new Error('The rendered SVG could not be read.');

    const svgElement = document.importNode(svgDocument.documentElement, true) as unknown as SVGSVGElement;
    let viewBox = svgElement.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
      const stage = document.createElement('div');
      stage.className = 'export-stage';
      stage.append(svgElement);
      document.body.append(stage);
      try {
        const bounds = svgElement.getBBox();
        viewBox = [bounds.x, bounds.y, bounds.width, bounds.height];
      } finally {
        stage.remove();
      }
    }

    const [x, y, width, height] = viewBox;
    if (!viewBox.every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('The diagram did not provide export dimensions.');
    svgElement.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    svgElement.setAttribute('width', String(width));
    svgElement.setAttribute('height', String(height));
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgElement)], { type: 'image/svg+xml' }));
    let image: HTMLImageElement;
    try {
      image = await loadImage(svgUrl);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is not supported by this browser.');

    context.scale(scale, scale);
    if (!state.transparent) {
      context.fillStyle = state.background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);

    const pngUrl = URL.createObjectURL(await canvasBlob(canvas));
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `mermaid-diagram-${state.exportTheme}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(pngUrl));
    exportMenu.open = false;
  } catch (error) {
    errorDisplay.textContent = error instanceof Error ? error.message : String(error);
    errorDisplay.hidden = false;
    statusDisplay.textContent = 'Export failed';
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = 'Download PNG';
  }
}

exportButton.addEventListener('click', () => void exportPng());

separator.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  separator.setPointerCapture(event.pointerId);
  document.body.classList.add('is-resizing');
});

separator.addEventListener('pointermove', (event) => {
  if (!separator.hasPointerCapture(event.pointerId)) return;
  const rect = workspace.getBoundingClientRect();
  const ratio = workspace.dataset.axis === 'horizontal'
    ? (event.clientX - rect.left) / rect.width
    : (event.clientY - rect.top) / rect.height;
  state.ratio = clampRatio(ratio);
  applyLayout();
});

separator.addEventListener('pointerup', (event) => {
  if (!separator.hasPointerCapture(event.pointerId)) return;
  separator.releasePointerCapture(event.pointerId);
  document.body.classList.remove('is-resizing');
  persist();
});

separator.addEventListener('keydown', (event) => {
  const vertical = workspace.dataset.axis === 'vertical';
  const decrement = vertical ? event.key === 'ArrowUp' : event.key === 'ArrowLeft';
  const increment = vertical ? event.key === 'ArrowDown' : event.key === 'ArrowRight';
  if (!decrement && !increment && event.key !== 'Home' && event.key !== 'End') return;

  event.preventDefault();
  state.ratio = event.key === 'Home' ? 0.15 : event.key === 'End' ? 0.85 : clampRatio(state.ratio + (increment ? 0.025 : -0.025));
  persist();
  applyLayout();
});

window.addEventListener('resize', () => {
  if (state.layout === 'auto') applyLayout();
});

applyTheme();
applyLayout();
requestRender();
