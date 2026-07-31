import html2canvas from "html2canvas";

export type HuntExportFileExtension = "png" | "pdf" | "webm";

export const HuntExportService = {
  async renderCanvas(element: HTMLElement) {
    return html2canvas(element, { scale: 2, backgroundColor: "#0d0a06", useCORS: true });
  },

  async renderPdf(element: HTMLElement) {
    const [{ jsPDF }, canvas] = await Promise.all([
      import("jspdf"),
      this.renderCanvas(element)
    ]);
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    return pdf;
  },

  async renderAnimatedVideo(element: HTMLElement) {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Seu navegador nao suporta gravacao de video nesta pagina.");
    }

    const sourceCanvas = await this.renderCanvas(element);
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;

    const context = outputCanvas.getContext("2d");
    if (!context) throw new Error("Nao foi possivel preparar o video animado.");
    const drawingContext = context;

    const mimeType = getSupportedVideoMimeType();
    if (!mimeType) {
      throw new Error("Seu navegador nao encontrou um formato WebM compativel para gravar o video.");
    }

    const durationMs = 5200;
    const frameRate = 30;
    const stream = outputCanvas.captureStream(frameRate);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000
    });
    const chunks: BlobPart[] = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.addEventListener("error", () => reject(new Error("A gravacao do video falhou.")));
    });

    const startTime = performance.now();
    recorder.start();

    await new Promise<void>((resolve) => {
      function drawFrame(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        drawAnimatedHuntFrame(drawingContext, sourceCanvas, progress);

        if (progress < 1) {
          requestAnimationFrame(drawFrame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(drawFrame);
    });

    recorder.stop();
    return finished;
  },

  async canvasToBlob(canvas: HTMLCanvasElement, type: string) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Nao foi possivel gerar o arquivo."));
      }, type);
    });
  },

  async shareFile(file: File, title: string, text: string) {
    if (!navigator.share) return false;

    const payload = { files: [file], title, text };
    if (navigator.canShare && !navigator.canShare(payload)) return false;

    try {
      await navigator.share(payload);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return true;
      return false;
    }
  },

  downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  },

  createFileName(prefix: string, extension: HuntExportFileExtension) {
    return `${prefix}-${Date.now()}.${extension}`;
  }
};

function drawAnimatedHuntFrame(context: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, progress: number) {
  const { width, height } = sourceCanvas;
  context.clearRect(0, 0, width, height);

  const intro = Math.min(progress / 0.18, 1);
  const easedIntro = easeOutCubic(intro);
  const scale = 1.025 - easedIntro * 0.025;
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  context.globalAlpha = 0.12 + easedIntro * 0.88;
  context.drawImage(sourceCanvas, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  context.globalAlpha = 1;

  const sweepX = -width * 0.35 + ((progress * 1.35) % 1) * width * 1.7;
  const sweep = context.createLinearGradient(sweepX - width * 0.18, 0, sweepX + width * 0.18, 0);
  sweep.addColorStop(0, "rgba(255,255,255,0)");
  sweep.addColorStop(0.42, "rgba(53,201,178,0)");
  sweep.addColorStop(0.5, "rgba(255,230,143,0.22)");
  sweep.addColorStop(0.58, "rgba(53,201,178,0.12)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  context.globalCompositeOperation = "screen";
  context.fillStyle = sweep;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  const pulse = 0.5 + Math.sin(progress * Math.PI * 6) * 0.5;
  context.save();
  context.globalAlpha = 0.12 + pulse * 0.08;
  context.strokeStyle = "#f5c842";
  context.lineWidth = 6;
  context.strokeRect(8, 8, width - 16, height - 16);
  context.restore();

  drawSparkles(context, width, height, progress);

  context.save();
  context.globalAlpha = Math.min(progress / 0.22, 1) * Math.min((1 - progress) / 0.16, 1);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(245,200,66,0.75)";
  context.shadowBlur = 18;
  context.font = `900 ${Math.max(26, Math.round(width * 0.032))}px Cinzel, serif`;
  context.fillStyle = "#f5c842";
  context.fillText("ReinaHub Hunt Report", width / 2, height * 0.065);
  context.restore();
}

function drawSparkles(context: CanvasRenderingContext2D, width: number, height: number, progress: number) {
  const points = [
    [0.12, 0.14, 0],
    [0.82, 0.17, 0.18],
    [0.18, 0.72, 0.38],
    [0.72, 0.82, 0.58],
    [0.92, 0.58, 0.76]
  ];

  for (const [xRatio, yRatio, offset] of points) {
    const local = (progress + offset) % 1;
    const alpha = Math.sin(local * Math.PI) * 0.75;
    const radius = 3 + local * 8;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = offset > 0.4 ? "#35c9b2" : "#f5c842";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(width * xRatio, height * yRatio, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getSupportedVideoMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
