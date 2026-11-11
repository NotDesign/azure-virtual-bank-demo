import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';

export const EVENTS = Object.freeze(['test', 'deposit', 'withdrawal', 'supplement', 'approval']);
export const CHANNELS = Object.freeze(['telegram', 'whatsapp']);
export class NotificationError extends Error {
  constructor(code) { super(code); this.name = 'NotificationError'; this.code = code; }
}
const fail = code => { throw new NotificationError(code); };
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => object(value) && Object.keys(value).every(k => allowed.includes(k));
export const accountKey = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254 ? value.trim().toLowerCase() : fail('invalid_account');
const secret = value => typeof value === 'string' && value.length > 0 && value.length <= 2048 && !/[\s\u0000-\u001f]/.test(value);
const integer = (raw, fallback, min, max) => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw); if (!/^\d+$/.test(String(raw)) || !Number.isSafeInteger(n) || n < min || n > max) fail('invalid_limits');
  return n;
};
export function validateBindings(value) {
  if (!keys(value, ['version', 'accounts']) || value.version !== 1 || !object(value.accounts) || Object.keys(value.accounts).length > 500) fail('invalid_bindings');
  const accounts = Object.create(null);
  for (const [email, row] of Object.entries(value.accounts)) {
    const key = accountKey(email);
    if (accounts[key] || !keys(row, ['label', 'events', ...CHANNELS]) || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 80 || /[\u0000-\u001f<>]/.test(row.label) || !Array.isArray(row.events) || !row.events.length || row.events.some(x => !EVENTS.includes(x)) || new Set(row.events).size !== row.events.length) fail('invalid_bindings');
    const normalized = {label: row.label.trim(), events: [...row.events]};
    for (const channel of CHANNELS) {
      const binding = row[channel] ?? {enabled: false, consent: false};
      if (!keys(binding, ['enabled', 'consent', 'consentedAt', channel === 'telegram' ? 'chatId' : 'phone']) || typeof binding.enabled !== 'boolean' || typeof binding.consent !== 'boolean') fail('invalid_bindings');
      if (binding.enabled && (binding.consent !== true || typeof binding.consentedAt !== 'string' || !Number.isFinite(Date.parse(binding.consentedAt)))) fail('consent_required');
      if (binding.enabled && !(channel === 'telegram' ? typeof binding.chatId === 'string' && /^\d{1,20}$/.test(binding.chatId) : typeof binding.phone === 'string' && /^[1-9]\d{5,14}$/.test(binding.phone))) fail('invalid_recipient');
      normalized[channel] = {...binding};
    }
    accounts[key] = normalized;
  }
  return accounts;
}
export function configuration(env = process.env, accounts = Object.create(null)) {
  const telegramToken = env.TELEGRAM_BOT_TOKEN || '';
  const whatsappToken = env.WHATSAPP_ACCESS_TOKEN || '';
  const apiVersion = env.WHATSAPP_API_VERSION || '';
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
  const template = env.WHATSAPP_TEMPLATE_NAME || '';
  const language = env.WHATSAPP_TEMPLATE_LANGUAGE || '';
  const rawCount = env.WHATSAPP_TEMPLATE_BODY_PARAMS;
  const bodyParams = rawCount === undefined || rawCount === '' ? 3 : integer(rawCount, 3, 0, 3);
  if (![0, 3].includes(bodyParams) || (bodyParams === 0 && template !== 'hello_world')) fail('invalid_template');
  const telegramReady = /^\d+:[A-Za-z0-9_-]{20,}$/.test(telegramToken) && secret(telegramToken);
  const whatsappReady = secret(whatsappToken) && /^v\d{1,3}\.\d{1,2}$/.test(apiVersion) && /^\d{1,32}$/.test(phoneNumberId) && /^[a-z0-9_]{1,512}$/.test(template) && /^[a-z]{2,3}(?:_[A-Za-z]{2,4})?$/.test(language);
  return {accounts, telegram: {ready: telegramReady, token: telegramToken}, whatsapp: {ready: whatsappReady, token: whatsappToken, apiVersion, phoneNumberId, template, language, bodyParams}, timeoutMs: integer(env.NOTIFY_TIMEOUT_MS, 8000, 100, 15000), retries: integer(env.NOTIFY_RETRIES, 1, 0, 2)};
}
export async function loadSettings(env = process.env) {
  const file = env.NOTIFY_BINDINGS_FILE;
  if (!file || !path.isAbsolute(file)) fail('bindings_not_configured');
  let value;
  try {
    const meta = await stat(file);
    if (!meta.isFile() || meta.size > 262144) fail('invalid_bindings');
    if (process.platform !== 'win32' && (meta.mode & 0o077)) fail('private_file_permissions');
    value = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) { if (error instanceof NotificationError) throw error; fail('bindings_unreadable'); }
  const settings = configuration(env, validateBindings(value));
  const stateDir = env.NOTIFY_STATE_DIR || path.join(path.dirname(file), 'delivery-state');
  if (!path.isAbsolute(stateDir)) fail('invalid_state_directory');
  return {...settings, stateDir};
}
const tail = value => typeof value === 'string' && value ? '***' + value.slice(-4) : 'not_set';
export function configStatus(settings) {
  return {operatorLocal: true, productionAuthentication: false, providers: {telegram: {configured: settings.telegram.ready}, whatsapp: {configured: settings.whatsapp.ready, templateBodyParams: settings.whatsapp.bodyParams}}, accounts: Object.entries(settings.accounts).map(([email, row]) => ({account: email[0] + '***@***', events: row.events, channels: Object.fromEntries(CHANNELS.map(channel => [channel, {enabled: row[channel].enabled, consent: row[channel].consent === true, recipient: tail(row[channel][channel === 'telegram' ? 'chatId' : 'phone']), ready: row[channel].enabled && row[channel].consent && settings[channel].ready}]))}))};
}
