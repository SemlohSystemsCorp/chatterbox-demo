import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "funny";

  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Giphy API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1&rating=pg-13`,
    );
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      const gif = data.data[0];
      return NextResponse.json({
        url: gif.images.original.url,
        title: gif.title,
        width: gif.images.original.width,
        height: gif.images.original.height,
      });
    }

    return NextResponse.json({ error: "No GIFs found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Failed to search Giphy" }, { status: 500 });
  }
}
