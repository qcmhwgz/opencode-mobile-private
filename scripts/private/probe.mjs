// GET-only acceptance probe. Password comes from the environment, never argv or output.
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
const origin = 'http://10.0.0.2:47119';
const password = process.env.OPENCODE_PROBE_PASSWORD;
const username = process.env.OPENCODE_PROBE_USERNAME || 'opencode';
const directory = process.env.OPENCODE_PROBE_DIRECTORY;
const headers = password ? { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` } : {};
const results = [];
async function get(path, stream = false, optional = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), stream ? 8000 : 5000);
  try {
    const url = new URL(origin + path);
    if (directory && /^\/api\/(session|pty|permission)(?:\/|$)/.test(path)) url.searchParams.set('location[directory]', directory);
    const response = await fetch(url, { headers, redirect: 'error', signal: controller.signal });
    const result = { path: path.replace(/ses_[\w-]+/g, '<session>'), status: response.status, optional, contentType: response.headers.get('content-type') };
    results.push(result);
    if (!response.ok) { await response.body?.cancel(); return; }
    if (stream) {
      if (!result.contentType?.includes('text/event-stream')) result.error = 'Expected SSE';
      else {
        const reader = response.body.getReader();
        const frame = await reader.read();
        result.receivedBytes = frame.value?.byteLength ?? 0;
        await reader.cancel();
      }
      return;
    }
    const json = await response.json();
    if (path === '/api/info') {
      result.version = json.data?.version ?? json.version;
      result.expectedVersion = result.version === '2.1.4';
    }
    result.shape = Array.isArray(json) ? 'array' : Object.keys(json).sort().join(',');
    return json;
  } catch (error) { results.push({ path: path.split('?')[0], error: error.name }); }
  finally { clearTimeout(timeout); }
}
await get('/api/info');
await get('/api/health', false, true);
await get('/api/project');
await get('/api/session');
await get('/api/permission/request');
await get('/api/pty');
await get('/api/event', true);
// Supplying a session ID enables existing transcript/diff/form reads. No creation or approval reply.
const session = process.env.OPENCODE_PROBE_SESSION;
if (session && /^[\w-]+$/.test(session)) {
  await get(`/api/session/${encodeURIComponent(session)}/message`);
  await get(`/api/session/${encodeURIComponent(session)}/diff`);
  await get(`/api/session/${encodeURIComponent(session)}/form`);
}
const report = { date: new Date().toISOString(), origin, authenticated: Boolean(password), projectScoped: Boolean(directory), readOnly: true, results,
  limitation: 'GET shape/status checks only; no prompt, approval reply, PTY creation or device test was performed.' };
const output = process.env.OPENCODE_PROBE_REPORT || 'private-probe-report.json';
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
if (results.some((item) => !item.optional && (item.error || item.status < 200 || item.status >= 300 || item.expectedVersion === false))) process.exitCode = 1;
