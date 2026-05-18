export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();
    const result = { title: '', image: '', description: '', url: targetUrl };

    const titlePatterns = [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i,
      /<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]{1,200})<\/title>/i,
    ];
    for (const p of titlePatterns) {
      const m = html.match(p);
      if (m && m[1]) { result.title = m[1].trim().replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' '); break; }
    }

    const imagePatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']{10,})["']/i,
      /<meta[^>]+content=["']([^"']{10,})["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']{10,})["']/i,
      /<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const p of imagePatterns) {
      const m = html.match(p);
      if (m && m[1]) {
        let img = m[1].trim();
        if (img.startsWith('//')) img = 'https:' + img;
        if (img.startsWith('http')) { result.image = img; break; }
      }
    }

    const pricePatterns = [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const p of pricePatterns) {
      const m = html.match(p);
      if (m && m[1] && !isNaN(parseFloat(m[1]))) { result.price = parseFloat(m[1]); break; }
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message, title: '', image: '' });
  }
}
