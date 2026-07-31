import { NextResponse } from "next/server";
import { ExternalQuoteSourceService } from "@/source/web/src/reina-core/external-quotes/external-quote-source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId")?.trim();

  if (sourceId) {
    const result = await ExternalQuoteSourceService.checkSource(sourceId);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      sources: ExternalQuoteSourceService.listSources(),
      results: [result]
    });
  }

  const results = await ExternalQuoteSourceService.checkAll();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    sources: ExternalQuoteSourceService.listSources(),
    results
  });
}
