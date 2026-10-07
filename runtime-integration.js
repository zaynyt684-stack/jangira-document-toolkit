/* Jangira E Mitra Smart Document Toolkit
   Upload + PDF runtime integration
   Keeps the Active Document model in one place and avoids competing loaders.
*/
(() => {
  "use strict";

  const ACCEPTED = /\.(jpe?g|png|webp|pdf)$/i;
  const PDF_TYPES = /application\/pdf/i;
  const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  function valid(file) {
    return !!file && (ACCEPTED.test(file.name || "") || PDF_TYPES.test(file.type || ""));
  }

  function isPDF(file) {
    return PDF_TYPES.test(file.type || "") || /\.pdf$/i.test(file.name || "");
  }

  function imageData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function renderPDF(file) {
    if (!window.pdfjsLib) throw new Error("PDF.js is unavailable");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;

    const bytes = await file.arrayBuffer();
    const task = window.pdfjsLib.getDocument({ data: bytes });
    const pdf = await task.promise;
    const pages = [];

    try {
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport }).promise;

        pages.push({
          src: canvas.toDataURL("image/jpeg", 0.92),
          name: "Page " + n,
          rotation: 0,
          flip: false,
          source: file.name
        });

        canvas.width = 1;
        canvas.height = 1;
      }
    } finally {
      if (pdf.cleanup) pdf.cleanup();
      if (pdf.destroy) await pdf.destroy();
    }
    return pages;
  }

  async function prepare(file) {
    if (!valid(file)) throw new Error("Unsupported file type");
    return isPDF(file)
      ? renderPDF(file)
      : [{
          src: await imageData(file),
          name: file.name,
          rotation: 0,
          flip: false,
          source: file.name
        }];
  }

  window.loadFiles = async function(files) {
    const list = [...(files || [])].filter(valid);
    if (!list.length) {
      msg("Choose JPG, PNG, WebP or PDF");
      return;
    }

    try {
      const fresh = !S.pages.length;
      if (fresh) {
        S.file = list[0];
        S.name = list.length === 1 ? list[0].name : list[0].name + " +" + (list.length - 1);
        S.type = list[0].type || "";
        S.pages = [];
        S.page = 0;
        S.history = [];
        S.future = [];
      }

      let added = 0;
      for (const file of list) {
        const pages = await prepare(file);
        S.pages.push(...pages);
        added += pages.length;
      }

      S.page = Math.max(0, Math.min(S.page, S.pages.length - 1));
      if (typeof save === "function") save();
      if (typeof saveRecent === "function") saveRecent();
      msg(added + " page(s) ready");
      go("workspace");
    } catch (error) {
      console.error("Upload/PDF runtime error:", error);
      msg(error && error.message ? error.message : "Could not load document");
    }
  };

  window.loadFile = file => window.loadFiles(file ? [file] : []);

  const input = document.querySelector("#fileInput");
  if (input) {
    input.onchange = event => {
      window.loadFiles(event.target.files);
      event.target.value = "";
    };
  }

  const upload = document.querySelector("#uploadBtn");
  if (upload) upload.onclick = () => document.querySelector("#fileInput")?.click();

  window.JangiraDocumentRuntime = {
    version: "1.0.0",
    accepted: ["JPG", "JPEG", "PNG", "WebP", "PDF"],
    pdfWorker: PDF_WORKER,
    isPDF
  };
})();
