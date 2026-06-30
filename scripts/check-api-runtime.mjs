delete process.env.FIGMA_ACCESS_TOKEN;

const { default: handler } = await import('../.tmp/api-runtime/api/figma.js');

let statusCode = 0;
let responseBody;
const response = {
  status(code) {
    statusCode = code;
    return response;
  },
  json(payload) {
    responseBody = payload;
  },
};

await handler({ method: 'POST', body: {} }, response);

if (statusCode !== 501 || responseBody?.reason !== 'not_configured') {
  throw new Error(
    `Expected unconfigured Figma handler to return 501/not_configured; received ${statusCode}/${responseBody?.reason ?? 'no reason'}.`,
  );
}

console.log('Figma API runtime import smoke check passed.');
