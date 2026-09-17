// Compressão de imagem — porta 1:1 do pipeline atual (comprimirImagem, santa-cruz-orcamentos.html
// linhas 1392-1415). Roda no navegador (usa <canvas>), nunca no servidor. Decisão do Thiago:
// manter a compressão mesmo sem o limite de ~180KB do banco que a motivou originalmente (agora
// os anexos vão pro Vercel Blob) — só o limite de aceite final (TAMANHO_ALVO) foi relaxado,
// já que Blob não tem a mesma restrição apertada.
//
// Sempre converte pra JPEG com fundo branco (canvas preenchido antes de desenhar a imagem) —
// mesmo comportamento de hoje; PNGs com transparência perdem o canal alfa de propósito.
const TENTATIVAS: Array<[number, number]> = [
  [1600, 0.72],
  [1280, 0.65],
  [1024, 0.6],
  [800, 0.55],
];

// ~2MB de JPEG em base64 é um arquivo já bem generoso pro caso de uso (fotos de orçamento) —
// bem acima do antigo limite de 180.000 caracteres, mas ainda protege contra fotos gigantes
// não intencionais indo pro Blob sem necessidade.
const TAMANHO_ALVO = 2_000_000;

export const TAMANHO_MAXIMO_ANEXO = 15_000_000; // 15MB — sanidade para PDFs (nunca comprimidos)

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = URL.createObjectURL(file);
  });
}

function desenharEmCanvas(img: HTMLImageElement, maxLado: number): HTMLCanvasElement {
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem comprimida."))),
      "image/jpeg",
      qualidade,
    );
  });
}

// Tenta as 4 combinações de tamanho/qualidade em ordem, aceita a primeira que couber dentro de
// TAMANHO_ALVO. Se nenhuma couber, rejeita pedindo foto com menos detalhe ou recorte.
export async function comprimirImagem(file: File): Promise<File> {
  const img = await carregarImagem(file);
  try {
    for (const [maxLado, qualidade] of TENTATIVAS) {
      const canvas = desenharEmCanvas(img, maxLado);
      const blob = await canvasParaBlob(canvas, qualidade);
      if (blob.size <= TAMANHO_ALVO) {
        const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], nome, { type: "image/jpeg" });
      }
    }
    throw new Error(
      "A imagem continua grande demais mesmo comprimida — mande uma foto com menos detalhe ou recorte antes de anexar.",
    );
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

// Prepara qualquer anexo (imagem ou PDF) para upload: imagens passam pela compressão acima;
// PDFs nunca são comprimidos — só recusados se passarem do limite de sanidade.
export async function prepararAnexo(file: File): Promise<File> {
  if (file.type.startsWith("image/")) {
    return comprimirImagem(file);
  }
  if (file.size > TAMANHO_MAXIMO_ANEXO) {
    throw new Error("Arquivo grande demais — reduza o PDF antes de anexar (ou mande uma foto da folha).");
  }
  return file;
}
