export function diagramFilename(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[. ]+$/, '') || 'mermaid-diagram';
}
