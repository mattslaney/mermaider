import mermaid from 'mermaid';
import './style.css';

const source = `flowchart LR
  Idea([Idea]) --> Draft[Write Mermaid]
  Draft --> Preview{Looks right?}
  Preview -- Yes --> Export[Export PNG]
  Preview -- No --> Draft`;

document.querySelector<HTMLElement>('#app')!.innerHTML = `
  <header>
    <h1>Mermaider</h1>
    <p>Edit Mermaid source and see the result.</p>
  </header>
  <div class="workspace">
    <textarea aria-label="Mermaid source" spellcheck="false">${source}</textarea>
    <section class="preview" aria-label="Diagram preview"></section>
  </div>
`;

const editor = document.querySelector<HTMLTextAreaElement>('textarea')!;
const preview = document.querySelector<HTMLElement>('.preview')!;

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

async function render() {
  const { svg } = await mermaid.render(`diagram-${Date.now()}`, editor.value);
  preview.innerHTML = svg;
}

editor.addEventListener('input', () => void render());
void render();
