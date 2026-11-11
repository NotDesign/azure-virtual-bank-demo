// Only official endpoints; tokens and recipients never appear in result objects.
import {setTimeout as pause} from 'node:timers/promises';
const MAX_RESPONSE = 65536, MAX_RETRY_WAIT = 2000;
async function jsonBody(response) {
  if (!response.body) return null;
  const reader = response.body.getReader(); let length = 0; const chunks = [];
  try {
    while (true) { const {done, value} = await reader.read(); if (done) break; length += value.byteLength; if (length > MAX_RESPONSE) { await reader.cancel(); return null; } chunks.push(Buffer.from(value)); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; } finally { reader.releaseLock(); }
}
export function providerRequest(channel, settings, binding, message) {
  if (channel === 'telegram') return {url: `https://api.telegram.org/bot${settings.telegram.token}/sendMessage`, headers: {'Content-Type': 'application/json'}, body: {chat_id: binding.chatId, text: message.text}};
  const w = settings.whatsapp;
  return {url: `https://graph.facebook.com/${w.apiVersion}/${w.phoneNumberId}/messages`, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${w.token}`}, body: {messaging_product: 'whatsapp', recipient_type: 'individual', to: binding.phone, type: 'template', template: {name: w.template, language: {code: w.language}, ...(w.bodyParams === 3 ? {components: [{type: 'body', parameters: message.bodyParams.map(text => ({type: 'text', text}))}]} : {})}}};
}
export async function sendProvider(channel, settings, binding, message, {fetchImpl = globalThis.fetch, sleep = pause} = {}) {
  const request = providerRequest(channel, settings, binding, message);
  for (let attempt = 0; attempt <= settings.retries; attempt++) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    let response, data;
    try { response = await fetchImpl(request.url, {method: 'POST', redirect: 'error', headers: request.headers, body: JSON.stringify(request.body), signal: controller.signal}); data = await jsonBody(response); }
    catch { return {status: 'uncertain', code: 'transport_or_timeout', attempts: attempt + 1}; }
    finally { clearTimeout(timer); }
    const messageId = channel === 'telegram' ? data?.result?.message_id : data?.messages?.[0]?.id;
    const accepted = response.ok && (channel === 'telegram' ? data?.ok === true && Number.isSafeInteger(messageId) && messageId > 0 : typeof messageId === 'string' && /^wamid\.[A-Za-z0-9+/=_-]{1,500}$/.test(messageId) && !data.error);
    if (accepted) return {status: 'accepted', code: 'provider_accepted_not_delivery_receipt', attempts: attempt + 1, providerMessageId: String(messageId)};
    const rejected429 = response.status === 429 && (channel === 'telegram' ? data?.ok === false && data.error_code === 429 : !!data?.error && Number.isFinite(data.error.code));
    const retrySeconds = channel === 'telegram' ? data?.parameters?.retry_after : Number(response.headers.get('retry-after'));
    if (rejected429 && attempt < settings.retries && Number.isFinite(retrySeconds) && retrySeconds > 0 && retrySeconds * 1000 <= MAX_RETRY_WAIT) { await sleep(retrySeconds * 1000); continue; }
    if (rejected429) return {status: 'rejected', code: 'rate_limited_not_retried', attempts: attempt + 1};
    if (response.status >= 400 && response.status < 500) return {status: 'rejected', code: 'provider_rejected', attempts: attempt + 1};
    return {status: 'uncertain', code: 'ambiguous_provider_response', attempts: attempt + 1};
  }
}
