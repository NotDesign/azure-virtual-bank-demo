import {mkdir, open, readFile, writeFile, rename, lstat} from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {NotificationError} from './settings.mjs';
export const digest = value => createHash('sha256').update(value).digest('hex');
export class Journal {
  constructor(directory) { this.directory = directory; }
  async claim(key, fingerprint) {
    try {
      await mkdir(this.directory, {recursive: true, mode: 0o700});
      const directory = await lstat(this.directory);
      if (!directory.isDirectory() || directory.isSymbolicLink() || (process.platform !== 'win32' && (directory.mode & 0o077))) throw new NotificationError('private_state_permissions');
      const file = path.join(this.directory, digest(key) + '.json');
      let handle;
      try { handle = await open(file, 'wx', 0o600); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const meta = await lstat(file); if (!meta.isFile() || meta.isSymbolicLink() || meta.size > 4096) throw new NotificationError('invalid_journal');
        const prior = JSON.parse(await readFile(file, 'utf8'));
        return {claimed: false, conflict: prior.fingerprint !== fingerprint, status: ['accepted', 'rejected', 'uncertain', 'in_flight'].includes(prior.status) ? prior.status : 'uncertain'};
      }
      const claim = {file, fingerprint};
      try { await handle.writeFile(JSON.stringify({fingerprint, status: 'in_flight', at: new Date().toISOString()})); await handle.sync(); } finally { await handle.close(); }
      return {claimed: true, ...claim};
    } catch (error) { throw error instanceof NotificationError ? error : new NotificationError('journal_unavailable'); }
  }
  async finish(claim, result) {
    const temporary = claim.file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temporary, JSON.stringify({fingerprint: claim.fingerprint, ...result, at: new Date().toISOString()}), {mode: 0o600, flag: 'wx'}); await rename(temporary, claim.file); }
    catch { throw new NotificationError('journal_write_failed_reconcile_before_retry'); }
  }
}
