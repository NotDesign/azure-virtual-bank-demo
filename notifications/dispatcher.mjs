import {EVENTS, CHANNELS, accountKey, NotificationError} from './settings.mjs';
import {Journal, digest} from './journal.mjs';
import {sendProvider} from './providers.mjs';
const titles = {test: 'Demo 測試通知', deposit: 'Demo 入金狀態更新', withdrawal: 'Demo 提領狀態更新', supplement: 'Demo 需要補交資料', approval: 'Demo 審核狀態更新'};
export function planNotification(settings, input) {
  if (!input || Object.keys(input).some(key => !['account', 'event', 'eventId'].includes(key))) throw new NotificationError('invalid_request');
  const key = accountKey(input.account), row = settings.accounts[key];
  if (!row || !EVENTS.includes(input.event) || !row.events.includes(input.event)) throw new NotificationError('account_or_event_not_bound');
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(input.eventId || '')) throw new NotificationError('invalid_event_id');
  const channels = CHANNELS.filter(channel => row[channel].enabled);
  if (!channels.length) throw new NotificationError('no_enabled_channels');
  // Fail before ANY network if one requested channel lacks consent or credentials.
  for (const channel of channels) if (row[channel].consent !== true || !settings[channel].ready) throw new NotificationError('channel_not_ready');
  if (channels.includes('whatsapp') && settings.whatsapp.bodyParams === 0 && input.event !== 'test') throw new NotificationError('hello_world_test_only');
  const bodyParams = [row.label, titles[input.event], input.eventId];
  const message = {bodyParams, text: `Azure Demo 平台通知\n${bodyParams.join('\n')}\n請登入平台核對；此訊息不代表銀行或鏈上已結算。`};
  return {key, row, channels, message, event: input.event, eventId: input.eventId};
}
export async function dispatch(settings, input, {send = false, fetchImpl, sleep, journal = new Journal(settings.stateDir)} = {}) {
  const plan = planNotification(settings, input);
  if (send !== true) return {dryRun: true, sent: false, channels: plan.channels, event: plan.event, message: 'explicit_send_required'};
  const results = [];
  for (const channel of plan.channels) {
    const binding = plan.row[channel], fingerprint = digest(JSON.stringify([plan.event, plan.message.bodyParams, binding, channel === 'whatsapp' ? [settings.whatsapp.apiVersion, settings.whatsapp.phoneNumberId, settings.whatsapp.template, settings.whatsapp.language, settings.whatsapp.bodyParams] : 'sendMessage']));
    const claim = await journal.claim(JSON.stringify([plan.key, channel, plan.eventId]), fingerprint);
    if (!claim.claimed) { results.push({channel, status: claim.conflict ? 'conflict' : 'duplicate_blocked', previousStatus: claim.status}); continue; }
    const result = await sendProvider(channel, settings, binding, plan.message, {fetchImpl, sleep});
    await journal.finish(claim, result);
    const {providerMessageId: _privateId, ...publicResult} = result; results.push({channel, ...publicResult});
  }
  return {dryRun: false, results, accepted: results.filter(x => x.status === 'accepted').length, delivered: 'not_verified'};
}
