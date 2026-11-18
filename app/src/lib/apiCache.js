const cache = new Map();

export function getCachedJson(url, options = {}) {
  const { force = false } = options;
  if (!force && cache.has(url)) return cache.get(url);
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
  cache.set(url, request);
  request.catch(() => cache.delete(url));
  return request;
}

export function clearApiCache() {
  cache.clear();
}
