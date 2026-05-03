import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

if (proxyUrl) {
  setGlobalDispatcher(
    new ProxyAgent({
      uri: proxyUrl,
      requestTls: { rejectUnauthorized: false },
      proxyTls: { rejectUnauthorized: false },
    })
  );
}
