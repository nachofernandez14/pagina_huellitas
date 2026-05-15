// ============================================================
// HUELLITAS PETSHOP - CSV Product Parser
// Parses the messy CSV exports from the price spreadsheet
// Applied Rules: [SF], [DRY], [REH]
// ============================================================

import fs from 'fs';
import path from 'path';
import type { ProductCategory } from '@/types';

export interface ParsedProduct {
  nombre: string;
  categoria: ProductCategory;
  subcategoria?: string;
  precio: number | null;
  kg?: string;
  imagen?: string;
}

// Clean price strings like "$ 55,000" → 55000
function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function clean(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

// Map product name → image filename using known images
const IMAGE_MAP: Record<string, string> = {
  // Perros adultos
  'agility': 'perroadulto/agility-perro-adulto-raza-mediana-grande-x-20-kg.webp',
  'agility adulto mord pequeña': 'perroadulto/AGILITY-ADULTOS-MP.webp',
  'agility cordero': 'perroadulto/alimento-agility_-perro-adulto-cordero.webp',
  'agility dermaprotec': 'perroadulto/dermacontrol.png',
  'agility control peso': 'perroadulto/agility-perro-control-de-peso.jpg.webp',
  'balanced cordero': 'perroadulto/vitalcan-cordero-balanced-15-kilos.webp',
  'balanced adulto': 'perroadulto/vitalcan-balanced-perro-adulto-raza-mediana-x-20-kg-01.webp',
  'bio max': 'perroadulto/BIOCAREADULTOCORDERO20kg.jpg',
  'biomax mord pequeña': 'perroadulto/biomax mord pequeña.jpg',
  'bonzo': 'perroadulto/BONZO.webp',
  'canfeed adulto mord mediana y grande': 'perroadulto/canfeed_20kg_adultos-1024-1024.webp',
  'canfeed adulto mord pequeña': 'perroadulto/canfeed_3kg-1024-1024.webp',
  'canfeed light': 'perroadulto/CANFEED-light.webp',
  'capitan': 'perroadulto/capitan-15.png',
  'complited': 'perroadulto/complited-20kg.png',
  'dog chow mord pequeña': 'perroadulto/DOGCHOW-mordpequeña-20kg.png',
  'dog selection': 'perroadulto/dogselection-21kg.png',
  'dog selection adulto mord pequeña': 'perroadulto/dog-selection-adulto-mord-pequeña-8kg.png',
  'dogui': 'perroadulto/dogui21kga.webp',
  'essential': 'perroadulto/essential-perroadulto-20kg.webp',
  'estampa plus': 'perroadulto/adultoestampaplus20kg.webp',
  'evolution criadores mord pequeña': 'perroadulto/Evolution-Criadores-mordpequeña10kg.webp',
  'exact': 'perroadulto/Exact_premiumAdulto_21kg.png',
  'full nutrition': 'perroadulto/fullnutrition20kg.jpg',
  'gooster': 'perroadulto/gooster20kgadulto.jpg',
  'gran campeon': 'perroadulto/gran-campeon-tradicional21kg.webp',
  'gran pastor': 'perroadulto/granpastor21kg.jpg',
  'ken l': 'perroadulto/Kenl_perrosadultos25KG.png',
  'kenl': 'perroadulto/KENL18KG.jpg',
  'ken l adulto mp': 'perroadulto/KENLMP7.5KG.gif',
  'nutribon criadores': 'perroadulto/nutribon-criadores22kg.webp',
  'puppy food': 'perroadulto/puppy-foodadulto-20-kg-1.png',
  'seguidor': 'perroadulto/segadulto22kg.webp',
  // Gatos
  'cat chow': 'gatos/catchow15kg.webp',
  'essential gato': 'gatos/essentialcat20kg.jpg',
  'evolution urinario': 'gatos/evolutionurinario8kg.webp',
  'exact urinario': 'gatos/exacturinario8kg.jpg',
  'full nutrition gato': 'gatos/fullnutrition7,5kg.webp',
  'gati': 'gatos/gati15kg.webp',
  '7 vidas': 'gatos/gatoadulto7vidas10kg.jpg',
  'agility gato adulto': 'gatos/gatoadultoagility10kg.jpg',
  'agility urinario': 'gatos/gatoagilityurinario10kg.webp',
  'gran persa': 'gatos/granpersa10kg.png',
  'nutribon gato': 'gatos/Nutribon20kg.webp',
  'natural choice kitten': 'gatocachorro/Naturalchoicekitten7,5kg.webp',
  'natural choice urinario': 'gatocachorro/Naturalchoiceurinario7.5kg.webp',
  'nutribon xq cachorro': 'gatocachorro/NutribonXQCachorro8kg.webp',
  'agility gato cachorro': 'gatocachorro/alimento-agility-gato-cachorro-10kg.webp',
  'ken l gato adulto': 'gatos/ken-l-gato-adulto-xkg.webp',
  'ken l gato cachorro': 'gatocachorro/alimento-kenl-gato-gatito-cachorro-kitten-01.webp',
  'optimun gato': 'gatos/optimun10kg.webp',
  'sabrositos gato mix': 'gatos/sabrositosgatosmix10kg.webp',
  'sabrositos gato pescado': 'gatos/sabrositos}gatos10kg.webp',
  'upper gatos': 'gatos/uppergatos10kg.webp',
  'vagoneta gato': 'gatos/vagoneta10kg.webp',
  'whiskas': 'gatos/whiskas-10kg-gatos-adultos.webp',
};

function guessImage(nombre: string, categoria: ProductCategory): string | undefined {
  const key = nombre.toLowerCase();
  for (const [pattern, img] of Object.entries(IMAGE_MAP)) {
    if (key.includes(pattern)) return img;
  }
  // Category fallbacks
  const fallbacks: Record<ProductCategory, string> = {
    perros:     'perroadulto/dogselection-21kg.png',
    cachorros:  'perrocachorro/KenLCachorro18kg.avif',
    gatos:      'gatos/gatoadulto7vidas10kg.jpg',
    gatitos:    'gatocachorro/alimento-agility-gato-cachorro-10kg.webp',
    granos:     'granos.png',
    accesorios: 'accesorios.jpeg',
  };
  return fallbacks[categoria];
}

// Palabras clave que indican producto cachorro/kitten
const CACHORRO_KEYWORDS = ['cachorro', 'puppy', 'pupy', 'kitten', 'gatito'];
function isCachorroName(name: string): boolean {
  const lower = name.toLowerCase();
  return CACHORRO_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Alimentos CSV parser ──────────────────────────────────────
export function parseAlimentosCSV(csvPath: string): ParsedProduct[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = content.split('\n').map((r) => r.split(','));
  const products: ParsedProduct[] = [];

  // Flag: true una vez que encontramos la segunda cabecera MARCA,KG,PRECIO
  // que indica el inicio de la sección de cachorros en el CSV.
  let inCachorro = false;
  let headersFound = 0;

  // Skip header rows (row 0 = section headers, row 1 = sub-headers, row 2 = column headers)
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const col0 = clean(row[0] ?? '');

    // Detectar filas de cabecera "MARCA,KG,PRECIO" para saber cuándo empiezan los cachorros
    if (col0.toUpperCase() === 'MARCA') {
      headersFound++;
      if (headersFound >= 2) inCachorro = true;
      continue; // saltar la fila de cabecera
    }

    // ── Perros / Cachorros (cols 0-2) ──
    const dogNombre = col0;
    const dogKg = clean(row[1] ?? '');
    const dogPrecio = clean(row[2] ?? '');
    if (dogNombre && dogNombre.length > 1) {
      // Determinar categoría: si estamos en sección cachorro O el nombre lo indica
      const esCachorro = inCachorro || isCachorroName(dogNombre);
      const categoria: ProductCategory = esCachorro ? 'cachorros' : 'perros';
      products.push({
        nombre: dogNombre,
        categoria,
        subcategoria: 'alimentos',
        kg: dogKg || undefined,
        precio: parsePrice(dogPrecio),
        imagen: guessImage(dogNombre, categoria),
      });
    }

    // ── Gatos / Gatitos (cols 6-8) ──
    const catNombre = clean(row[6] ?? '');
    const catKg = clean(row[7] ?? '');
    const catPrecio = clean(row[8] ?? '');
    if (catNombre && catNombre.length > 1) {
      const esGatito = isCachorroName(catNombre);
      const catCategoria: ProductCategory = esGatito ? 'gatitos' : 'gatos';
      products.push({
        nombre: catNombre,
        categoria: catCategoria,
        subcategoria: 'alimentos',
        kg: catKg || undefined,
        precio: parsePrice(catPrecio),
        imagen: guessImage(catNombre, catCategoria),
      });
    }

    // ── Granos (cols 11-13) ──
    const granoNombre = clean(row[11] ?? '');
    const granoKg = clean(row[12] ?? '');
    const granoPrecio = clean(row[13] ?? '');
    if (granoNombre && granoNombre.length > 1) {
      products.push({
        nombre: granoNombre,
        categoria: 'granos',
        subcategoria: 'granos',
        kg: granoKg || undefined,
        precio: parsePrice(granoPrecio),
        imagen: guessImage(granoNombre, 'granos'),
      });
    }
  }

  // Eliminar duplicados por (nombre, kg)
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = `${p.nombre}-${p.kg ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Accesorios CSV parser ─────────────────────────────────────
const ACCESORIO_SUBCATS: Record<string, string> = {
  COLLARES: 'collares',
  'COLLARES SIMPLES': 'collares',
  'COLLARES DE CUERO': 'collares',
  'COLLARES PULGICIDAS': 'collares',
  PRETALES: 'pretales',
  'PRETALES COMPLETOS IMPORTADOS': 'pretales',
  CORREAS: 'correas',
  CADENAS: 'cadenas',
  COLCHONETAS: 'colchonetas',
  'COMEDEROS DE AC.INOX': 'comederos',
  'COMEDEROS DE PLASTICO': 'comederos',
  SHAMPOO: 'higiene',
  PULGICIDAS: 'antiparasitarios',
  PIPETAS: 'antiparasitarios',
  SINPARICA: 'antiparasitarios',
  NEXGARD: 'antiparasitarios',
  CURABICHERO: 'antiparasitarios',
};

export function parseAccesoriosCSV(csvPath: string): ParsedProduct[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = content.split('\n').map((r) => r.split(','));
  const products: ParsedProduct[] = [];

  // The accesorios CSV is complex multi-column layout.
  // We extract name-price pairs from recognizable columns (A=nombre, B=?, C=precio)
  let currentSubcat = 'accesorios';

  for (const row of rows) {
    if (!row || row.length < 2) continue;

    const col0 = clean(row[0] ?? '');
    const col2 = clean(row[2] ?? '');

    // Check if this row is a subcategory header
    const upperCol = col0.toUpperCase();
    if (ACCESORIO_SUBCATS[upperCol]) {
      currentSubcat = ACCESORIO_SUBCATS[upperCol];
      continue;
    }

    // Try to extract product (col0 = name, col2 = price)
    if (col0 && col0.length > 1 && col2 && col2.includes('$')) {
      products.push({
        nombre: col0,
        categoria: 'accesorios',
        subcategoria: currentSubcat,
        precio: parsePrice(col2),
        imagen: guessImage(currentSubcat, 'accesorios'),
      });
    }

    // Also check cols 4-5 (colchonetas), 8-9 (comederos ac inox), 10-11 (comederos plastico)
    const pairs: [number, number][] = [
      [4, 5], [7, 8], [10, 11], [13, 14],
    ];
    for (const [ni, pi] of pairs) {
      const n = clean(row[ni] ?? '');
      const p = clean(row[pi] ?? '');
      if (n && n.length > 1 && p && p.includes('$')) {
        products.push({
          nombre: n,
          categoria: 'accesorios',
          subcategoria: currentSubcat,
          precio: parsePrice(p),
          imagen: guessImage(currentSubcat, 'accesorios'),
        });
      }
    }
  }

  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.nombre)) return false;
    seen.add(p.nombre);
    return true;
  });
}

export function parseAllProducts(csvDir: string): ParsedProduct[] {
  const alimentosPath = path.join(
    csvDir,
    'PRECIOS HUELLITAS (4).xlsx - PRECIOS ALIMENTOS.csv'
  );
  const accesoriosPath = path.join(
    csvDir,
    'PRECIOS HUELLITAS (4).xlsx - PRECIOS ACCESORIOS.csv'
  );

  const alimentos = fs.existsSync(alimentosPath)
    ? parseAlimentosCSV(alimentosPath)
    : [];
  const accesorios = fs.existsSync(accesoriosPath)
    ? parseAccesoriosCSV(accesoriosPath)
    : [];

  return [...alimentos, ...accesorios];
}
