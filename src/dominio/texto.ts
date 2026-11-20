export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function contemTermo(texto: string, termo: string): boolean {
  if (termo.includes(' ')) return texto.includes(termo);
  return new RegExp(`(?:^|[^a-z0-9])${termo}(?:$|[^a-z0-9])`).test(texto);
}

export function indiceTermo(texto: string, termo: string): number {
  if (termo.includes(' ')) return texto.indexOf(termo);
  const match = new RegExp(`(?:^|[^a-z0-9])${termo}(?:$|[^a-z0-9])`).exec(texto);
  return match?.index ?? -1;
}
