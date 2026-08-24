import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright-core";

type PrintPdfPayload = {
  html?: string;
  filename?: string;
};

function safeFilename(value: string | undefined): string {
  const fallback = `loan-document-${new Date().toISOString().slice(0, 10)}.pdf`;
  const name = (value || fallback).replace(/[\\/:*?"<>|]/g, "_").trim();
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function chromiumExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (!process.env.HOME) return undefined;
  return join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell");
}

async function inlineKhmerFont(html: string): Promise<string> {
  const inlineFont = async (currentHtml: string, fontFile: string, mimeType: string) => {
    try {
      const fontPath = join(process.cwd(), "public/fonts", fontFile);
      const font = await readFile(fontPath);
      const dataUrl = `data:${mimeType};base64,${font.toString("base64")}`;
      return currentHtml.replaceAll(`url("/fonts/${fontFile}")`, `url("${dataUrl}")`);
    } catch {
      return currentHtml;
    }
  };

  let inlined = html;
  inlined = await inlineFont(inlined, "khmer-os-muol-light.ttf", "font/ttf");
  inlined = await inlineFont(inlined, "khmer-os-battambang.ttf", "font/ttf");
  inlined = await inlineFont(inlined, "kantumruypro-khmer.woff2", "font/woff2");
  return inlined;
}

export async function POST(request: NextRequest) {
  let payload: PrintPdfPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid PDF request" }, { status: 400 });
  }

  if (!payload.html?.trim()) {
    return NextResponse.json({ success: false, error: "Missing document HTML" }, { status: 400 });
  }

  const filename = safeFilename(payload.filename);
  const browser = await chromium.launch({
    executablePath: chromiumExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.setContent(await inlineKhmerFont(payload.html), { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "14mm", bottom: "14mm", left: "14mm" },
      preferCSSPageSize: true,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
