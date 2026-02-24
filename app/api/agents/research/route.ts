import { NextRequest, NextResponse } from "next/server";

/**
 * Tavily Web Search API route
 * Used by agent chat route to research competitors for battle cards.
 * Can also be called standalone for on-demand research.
 */
export async function POST(request: NextRequest) {
  const { query, searchDepth = "advanced", maxResults = 8 } = await request.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Research API not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.error("Tavily API error:", response.statusText);
      return NextResponse.json({ error: "Research failed" }, { status: 502 });
    }

    const data = await response.json();

    return NextResponse.json({
      answer: data.answer ?? null,
      results: (data.results || []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400),
      })),
    });
  } catch (err) {
    console.error("Research route error:", err);
    return NextResponse.json({ error: "Research request failed" }, { status: 500 });
  }
}
