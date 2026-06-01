// Vercel Serverless Function: /api/payments/paypay をVPSにプロキシ
// openrestyがContent-Type: application/jsonのPOSTを415で弾くため、
// サーバーレス関数経由でVPSに転送する

const BACKEND_URL = 'https://komapay.p-kmt.com/api/payments/paypay';

export default async function handler(req, res) {
  // CORSヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json',
        'X-Forwarded-From': 'vercel-proxy',
      },
      body,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err) {
    console.error('PayPay proxy error:', err);
    return res.status(500).json({ success: false, message: 'Proxy error: ' + err.message });
  }
}
