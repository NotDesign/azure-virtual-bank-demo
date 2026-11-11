import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, readdir, chmod, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {configuration, validateBindings, loadSettings, configStatus} from '../settings.mjs';
import {dispatch, planNotification} from '../dispatcher.mjs';
import {sendProvider, providerRequest} from '../providers.mjs';
import {Journal, digest} from '../journal.mjs';
import {parseArgs, main} from '../cli.mjs';

const EMAIL = 'operator@example.invalid';
const other = 'second@example.invalid';
const ENV = {TELEGRAM_BOT_TOKEN: '123456:MOCK_ONLY_TOKEN_123456789012345', WHATSAPP_ACCESS_TOKEN: 'mock-only-meta-token-not-usable', WHATSAPP_API_VERSION: 'v99.0', WHATSAPP_PHONE_NUMBER_ID: '123456789', WHATSAPP_TEMPLATE_NAME: 'azure_demo_notice', WHATSAPP_TEMPLATE_LANGUAGE: 'zh_HK', WHATSAPP_TEMPLATE_BODY_PARAMS: '3', NOTIFY_TIMEOUT_MS: '100', NOTIFY_RETRIES: '1'};
const row = () => ({label: '合成 Demo 操作者', events: ['test', 'deposit', 'withdrawal', 'supplement', 'approval'], telegram: {enabled: true, consent: true, chatId: '1234567001', consentedAt: '2026-11-11T08:00:00Z'}, whatsapp: {enabled: true, consent: true, phone: '15555550123', consentedAt: '2026-11-11T08:00:00Z'}});
const input = (eventId = 'synthetic-event-0001', event = 'test', account = EMAIL) => ({account, event, eventId});
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json', ...headers}});
const accepted = url => url.startsWith('https://api.telegram.org/') ? json({ok: true, result: {message_id: 1234}}) : json({messages: [{id: 'wamid.SYNTHETIC_1234'}]});
async function fixture(t, transform = value => value) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'azure-notify-mocked-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const file = path.join(directory, 'bindings.private.json');
  const bindings = transform({version: 1, accounts: {[EMAIL]: row()}});
  await writeFile(file, JSON.stringify(bindings), {mode: 0o600});
  const env = {...ENV, NOTIFY_BINDINGS_FILE: file, NOTIFY_STATE_DIR: path.join(directory, 'state')};
  return {directory, file, env, settings: await loadSettings(env)};
}
const onlyTG = data => {data.accounts[EMAIL].whatsapp = {enabled: false, consent: false}; return data;};

test('configuration status is local and masks every recipient, account and secret', async t => {
  const {settings} = await fixture(t), status = JSON.stringify(configStatus(settings));
  for (const value of [EMAIL, ENV.TELEGRAM_BOT_TOKEN, ENV.WHATSAPP_ACCESS_TOKEN, ENV.WHATSAPP_PHONE_NUMBER_ID, '1234567001', '15555550123']) assert.equal(status.includes(value), false);
  assert.equal(configStatus(settings).providers.whatsapp.configured, true);
});
test('missing configuration refuses before networking and prints no ENV or path', async t => {
  let calls = 0; t.mock.method(globalThis, 'fetch', async () => {calls++; throw new Error('unexpected');});
  const output = [], code = await main(['--check'], {env: ENV, output: text => output.push(text)});
  assert.equal(code, 2); assert.equal(calls, 0); assert.deepEqual(JSON.parse(output[0]), {ok: false, code: 'bindings_not_configured'});
});
test('recipient bindings reject embedded tokens, unknown fields, numeric IDs and duplicate account aliases', () => {
  for (const change of [r => {r.token = 'bad';}, r => {r.telegram.chatId = 123;}, r => {r.whatsapp.phone = 123;}, r => {r.events.push('arbitrary');}]) {
    const r = row(); change(r); assert.throws(() => validateBindings({version: 1, accounts: {[EMAIL]: r}}));
  }
  assert.throws(() => validateBindings({version: 1, accounts: {[EMAIL]: row(), [EMAIL.toUpperCase()]: row()}}));
});
test('enabled recipient requires explicit consent and timestamp', () => {
  for (const field of ['consent', 'consentedAt']) { const r = row(); delete r.telegram[field]; assert.throws(() => validateBindings({version: 1, accounts: {[EMAIL]: r}})); }
});
test('bindings with public file permissions refuse before send', async t => {
  if (process.platform === 'win32') return t.skip();
  const {file, env} = await fixture(t); await chmod(file, 0o644); await assert.rejects(loadSettings(env), {code: 'private_file_permissions'});
});
test('invalid limits, Graph version and template parameters never create a ready unsafe provider', () => {
  for (const params of ['1', '2', '4', '-1']) assert.throws(() => configuration({...ENV, WHATSAPP_TEMPLATE_BODY_PARAMS: params}));
  assert.throws(() => configuration({...ENV, NOTIFY_RETRIES: '3'}));
  assert.throws(() => configuration({...ENV, WHATSAPP_TEMPLATE_NAME: 'other', WHATSAPP_TEMPLATE_BODY_PARAMS: '0'}));
  assert.equal(configuration({...ENV, WHATSAPP_API_VERSION: 'https://attacker.invalid'}).whatsapp.ready, false);
});
test('dry run has zero networking and no journal files', async t => {
  const {settings} = await fixture(t); let calls = 0;
  const result = await dispatch(settings, input(), {fetchImpl: async () => {calls++;}});
  assert.equal(result.dryRun, true); assert.equal(calls, 0); await assert.rejects(readdir(settings.stateDir), {code: 'ENOENT'});
});
test('unconfigured enabled WhatsApp blocks both channels before any networking', async t => {
  const {settings} = await fixture(t); settings.whatsapp.ready = false; let calls = 0;
  await assert.rejects(dispatch(settings, input(), {send: true, fetchImpl: async () => {calls++;}}), {code: 'channel_not_ready'}); assert.equal(calls, 0);
});
test('caller cannot override a recipient, content or an unbound account/event', async t => {
  const {settings} = await fixture(t); let calls = 0;
  for (const bad of [{...input(), to: '15555559999'}, {...input(), text: 'arbitrary'}, input('synthetic-other-id', 'test', other), input('synthetic-other-id', 'unknown'), input('short')]) await assert.rejects(dispatch(settings, bad, {send: true, fetchImpl: async () => {calls++;}}));
  assert.equal(calls, 0);
});
test('Telegram and WhatsApp use exact official POST payloads and only server recipients', async t => {
  const {settings} = await fixture(t), calls = [];
  const result = await dispatch(settings, input(), {send: true, fetchImpl: async (url, options) => {calls.push({url, ...options, body: JSON.parse(options.body)}); return accepted(url);}});
  assert.equal(calls.length, 2); assert.equal(result.accepted, 2); assert.equal(result.delivered, 'not_verified');
  assert.equal(calls[0].url, `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`); assert.equal(calls[0].body.chat_id, '1234567001'); assert.match(calls[0].body.text, /Demo/); assert.equal(calls[0].body.parse_mode, undefined);
  assert.equal(calls[1].url, 'https://graph.facebook.com/v99.0/123456789/messages'); assert.equal(calls[1].headers.Authorization, 'Bearer ' + ENV.WHATSAPP_ACCESS_TOKEN); assert.equal(calls[1].body.type, 'template'); assert.equal(calls[1].body.to, '15555550123');
  assert.deepEqual(calls[1].body.template.components[0].parameters.map(x => x.type), ['text', 'text', 'text']); assert.equal(calls[1].body.template.language.code, 'zh_HK'); assert.equal(calls.every(x => x.redirect === 'error'), true);
  const publicResult = JSON.stringify(result); for (const value of Object.values(ENV)) if (value.length > 10) assert.equal(publicResult.includes(value), false);
  assert.equal(publicResult.includes('SYNTHETIC_1234'), false);
  const journals = await Promise.all((await readdir(settings.stateDir)).map(f => readFile(path.join(settings.stateDir, f), 'utf8'))); assert.equal(journals.some(x => x.includes('wamid.SYNTHETIC_1234')), true); assert.equal(journals.some(x => x.includes(ENV.WHATSAPP_ACCESS_TOKEN)), false);
});
test('same event ID persists across dispatcher instances and never sends twice', async t => {
  const {settings} = await fixture(t); let calls = 0; const fetchImpl = async url => {calls++; return accepted(url);};
  await dispatch(settings, input(), {send: true, fetchImpl});
  const again = await dispatch(settings, input(), {send: true, fetchImpl, journal: new Journal(settings.stateDir)});
  assert.equal(calls, 2); assert.equal(again.results.every(x => x.status === 'duplicate_blocked' && x.previousStatus === 'accepted'), true);
});
test('parallel send claims are atomic per account, channel and event ID', async t => {
  const {settings} = await fixture(t, onlyTG); let calls = 0;
  const send = () => dispatch(settings, input(), {send: true, fetchImpl: async url => {calls++; await new Promise(r => setTimeout(r, 20)); return accepted(url);}});
  const results = await Promise.all([send(), send()]); assert.equal(calls, 1); assert.equal(results.flatMap(x => x.results).filter(x => x.status === 'accepted').length, 1);
});
test('same ID with changed event, recipient or template is conflict and never rerouted', async t => {
  const {settings} = await fixture(t); let calls = 0; const fetchImpl = async url => {calls++; return accepted(url);};
  await dispatch(settings, input(), {send: true, fetchImpl});
  const conflict = await dispatch(settings, input(undefined, 'deposit'), {send: true, fetchImpl}); assert.equal(conflict.results.every(x => x.status === 'conflict'), true);
  settings.accounts[EMAIL].telegram.chatId = '1234567999'; settings.whatsapp.template = 'another_approved_template';
  const reroute = await dispatch(settings, input(), {send: true, fetchImpl}); assert.equal(reroute.results.every(x => x.status === 'conflict'), true); assert.equal(calls, 2);
});
test('one person may bind two accounts while journals remain per account', async t => {
  const {settings} = await fixture(t, value => {value.accounts[other] = row(); return value;}); let calls = 0;
  for (const account of [EMAIL, other]) await dispatch(settings, input(undefined, 'test', account), {send: true, fetchImpl: async url => {calls++; return accepted(url);}});
  assert.equal(calls, 4);
});
test('channel-specific rejection does not prevent an independent configured channel', async t => {
  const {settings} = await fixture(t); const result = await dispatch(settings, input(), {send: true, fetchImpl: async url => url.includes('telegram') ? json({ok: false, description: ENV.TELEGRAM_BOT_TOKEN}, 403) : accepted(url)});
  assert.deepEqual(result.results.map(x => x.status), ['rejected', 'accepted']); assert.equal(JSON.stringify(result).includes(ENV.TELEGRAM_BOT_TOKEN), false);
});
test('timeout is bounded and uncertain results are never automatically retried', async t => {
  const {settings} = await fixture(t, onlyTG); settings.retries = 2; let calls = 0;
  const fetchImpl = async (_url, {signal}) => {calls++; return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error(ENV.TELEGRAM_BOT_TOKEN)), {once: true}));};
  const before = Date.now(), result = await dispatch(settings, input(), {send: true, fetchImpl});
  assert.ok(Date.now() - before < 2000); assert.equal(calls, 1); assert.equal(result.results[0].status, 'uncertain');
  const again = await dispatch(settings, input(), {send: true, fetchImpl}); assert.equal(calls, 1); assert.equal(again.results[0].previousStatus, 'uncertain');
});
test('5xx, malformed success, redirected transport and large response are uncertain without retries', async t => {
  const {settings} = await fixture(t, onlyTG); settings.retries = 2;
  const responses = [async () => json({error: 'temporary'}, 503), async () => new Response('not json'), async () => {throw new Error('URL ' + ENV.TELEGRAM_BOT_TOKEN);}, async () => new Response('x'.repeat(70000))];
  for (let i = 0; i < responses.length; i++) {let calls = 0; const result = await dispatch(settings, input('synthetic-uncertain-' + i), {send: true, fetchImpl: async () => {calls++; return responses[i]();}}); assert.equal(result.results[0].status, 'uncertain'); assert.equal(calls, 1); assert.equal(JSON.stringify(result).includes(ENV.TELEGRAM_BOT_TOKEN), false);}
});
test('only explicit short Telegram 429 retries once within configured limit', async t => {
  const {settings} = await fixture(t, onlyTG); let calls = 0; const waits = [];
  const result = await dispatch(settings, input(), {send: true, sleep: async ms => waits.push(ms), fetchImpl: async url => ++calls === 1 ? json({ok: false, error_code: 429, parameters: {retry_after: 1}}, 429) : accepted(url)});
  assert.equal(calls, 2); assert.deepEqual(waits, [1000]); assert.equal(result.results[0].status, 'accepted');
});
test('long 429 delay is not slept or retried, and server errors never leak', async t => {
  const {settings} = await fixture(t, onlyTG); let calls = 0;
  const result = await dispatch(settings, input(), {send: true, sleep: async () => assert.fail('no wait'), fetchImpl: async () => {calls++; return json({ok: false, error_code: 429, description: ENV.TELEGRAM_BOT_TOKEN, parameters: {retry_after: 60}}, 429);}});
  assert.equal(calls, 1); assert.equal(result.results[0].status, 'rejected'); assert.equal(JSON.stringify(result).includes(ENV.TELEGRAM_BOT_TOKEN), false);
});
test('WhatsApp hello_world has no components and is test-only', async t => {
  const {settings} = await fixture(t); settings.whatsapp.template = 'hello_world'; settings.whatsapp.bodyParams = 0;
  const plan = planNotification(settings, input()); assert.equal(providerRequest('whatsapp', settings, settings.accounts[EMAIL].whatsapp, plan.message).body.template.components, undefined);
  let calls = 0; await assert.rejects(dispatch(settings, input(undefined, 'deposit'), {send: true, fetchImpl: async () => {calls++;}}), {code: 'hello_world_test_only'}); assert.equal(calls, 0);
});
test('WhatsApp rate limit requires explicit error and short Retry-After', async t => {
  const {settings} = await fixture(t); let calls = 0;
  const result = await sendProvider('whatsapp', settings, settings.accounts[EMAIL].whatsapp, planNotification(settings, input()).message, {sleep: async ms => assert.equal(ms, 1000), fetchImpl: async url => ++calls === 1 ? json({error: {code: 130429, message: 'not echoed'}}, 429, {'Retry-After': '1'}) : accepted(url)});
  assert.equal(calls, 2); assert.equal(result.status, 'accepted');
});
test('crashed/in-flight journal state blocks a duplicate rather than retrying blindly', async t => {
  const {settings} = await fixture(t, onlyTG), plan = planNotification(settings, input()), key = JSON.stringify([plan.key, 'telegram', plan.eventId]);
  const fingerprint = digest(JSON.stringify([plan.event, plan.message.bodyParams, plan.row.telegram, 'sendMessage'])); await new Journal(settings.stateDir).claim(key, fingerprint); let calls = 0;
  const result = await dispatch(settings, input(), {send: true, fetchImpl: async () => {calls++;}}); assert.equal(result.results[0].previousStatus, 'in_flight'); assert.equal(calls, 0);
});
test('CLI rejects arbitrary recipients, extra arguments and implicit event IDs', () => {
  for (const args of [['--send'], ['--check', '--send'], ['--account', EMAIL, '--event', 'test'], ['--to', '15555550123'], ['--check', '--check']]) assert.throws(() => parseArgs(args));
  assert.equal(parseArgs(['--account', EMAIL, '--event', 'test', '--event-id', 'synthetic-id']).send, false);
});
test('CLI config check never fetches; output is masked and permission errors are generic', async t => {
  const {env, file} = await fixture(t); let calls = 0; t.mock.method(globalThis, 'fetch', async () => {calls++; throw new Error(ENV.WHATSAPP_ACCESS_TOKEN);});
  const output = []; assert.equal(await main(['--config-status'], {env, output: s => output.push(s)}), 0); assert.equal(calls, 0);
  assert.equal(output.join('').includes(EMAIL), false); assert.equal(output.join('').includes(ENV.TELEGRAM_BOT_TOKEN), false);
  await writeFile(file, '{bad json'); const errors = []; assert.equal(await main(['--check'], {env, output: s => errors.push(s)}), 2); assert.deepEqual(JSON.parse(errors[0]), {ok: false, code: 'bindings_unreadable'});
});
test('CLI accepted duplicate exits successfully, uncertain duplicate remains an actionable failure', async t => {
  const {env} = await fixture(t, onlyTG); t.mock.method(globalThis, 'fetch', async url => accepted(url));
  const args = ['--account', EMAIL, '--event', 'test', '--event-id', 'synthetic-cli-accepted', '--send']; assert.equal(await main(args, {env, output: () => {}}), 0); assert.equal(await main(args, {env, output: () => {}}), 0);
  t.mock.method(globalThis, 'fetch', async () => {throw new Error('network uncertain');}); args[5] = 'synthetic-cli-unknown';
  assert.equal(await main(args, {env, output: () => {}}), 2); assert.equal(await main(args, {env, output: () => {}}), 2);
});
