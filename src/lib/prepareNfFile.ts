// Reduz fotos de NF antes de enviar para a IA (fotos de celular têm 5-12 MB).
// PDFs e arquivos não-imagem são enviados como estão.
export async function prepareNfFile(
  file: File,
  maxSide = 1800,
  quality = 0.82,
): Promise<{ base64: string; mimeType: string }> {
  const readAsBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        const i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  const type = file.type || "";
  if (!type.startsWith("image/")) {
    return { base64: await readAsBase64(file), mimeType: type || "application/pdf" };
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) throw new Error("no blob");
    return { base64: await readAsBase64(blob), mimeType: "image/jpeg" };
  } catch {
    return { base64: await readAsBase64(file), mimeType: type || "image/jpeg" };
  }
}
