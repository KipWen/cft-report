import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const isVercel = !!process.env.VERCEL;

// Only set proxy in local dev — Vercel servers are in the US and can
// reach CFTC/Yahoo directly. Routing through 127.0.0.1:7890 on Vercel
// would break all outgoing requests.
if (proxyUrl && !isVercel) {
  setGlobalDispatcher(
    new ProxyAgent({
      uri: proxyUrl,
      requestTls: { rejectUnauthorized: false },
      proxyTls: { rejectUnauthorized: false },
    })
  );
}
