#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
import {loadSettings, configStatus} from './settings.mjs';
import {dispatch} from './dispatcher.mjs';
export function parseArgs(args) {
  const flags = new Set(['--check', '--config-status', '--send']), values = new Set(['--account', '--event', '--event-id']), parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]; if (!flags.has(arg) && !values.has(arg) || arg in parsed) throw new Error('invalid_arguments');
    if (flags.has(arg)) parsed[arg] = true;
    else { const value = args[++i]; if (!value || value.startsWith('--')) throw new Error('invalid_arguments'); parsed[arg] = value; }
  }
  if (parsed['--check'] || parsed['--config-status']) { if (Object.keys(parsed).some(k => !['--check', '--config-status'].includes(k))) throw new Error('invalid_arguments'); return {check: true}; }
  if (!parsed['--account'] || !parsed['--event'] || !parsed['--event-id']) throw new Error('invalid_arguments');
  return {account: parsed['--account'], event: parsed['--event'], eventId: parsed['--event-id'], send: parsed['--send'] === true};
}
export async function main(args = process.argv.slice(2), {env = process.env, output = text => process.stdout.write(text + '\n')} = {}) {
  try {
    const options = parseArgs(args), settings = await loadSettings(env);
    const result = options.check ? configStatus(settings) : await dispatch(settings, {account: options.account, event: options.event, eventId: options.eventId}, {send: options.send});
    output(JSON.stringify(result, null, 2));
    return !options.check && !result.dryRun && result.results.some(x => x.status !== 'accepted' && !(x.status === 'duplicate_blocked' && x.previousStatus === 'accepted')) ? 2 : 0;
  } catch (error) {
    const allowed = new Set(['invalid_arguments', 'invalid_account', 'invalid_limits', 'invalid_bindings', 'consent_required', 'invalid_recipient', 'invalid_template', 'bindings_not_configured', 'private_file_permissions', 'bindings_unreadable', 'invalid_state_directory', 'account_or_event_not_bound', 'invalid_event_id', 'no_enabled_channels', 'channel_not_ready', 'hello_world_test_only', 'private_state_permissions', 'invalid_journal', 'journal_unavailable', 'journal_write_failed_reconcile_before_retry']);
    output(JSON.stringify({ok: false, code: allowed.has(error.code || error.message) ? error.code || error.message : 'notification_failed'})); return 2;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
