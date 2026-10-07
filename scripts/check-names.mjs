// Run inside the owner's copy by export-for-owner.sh: reads every committed
// file in full and fails if any mentions a name that should not be there.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const names = /travinyx|oduola|ayodavid/i;
const files = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
if (files.length < 50) {
  console.log(`WARNING: only ${files.length} files listed, the copy looks wrong`);
  process.exit(1);
}
const hits = files.filter((f) => names.test(fs.readFileSync(f, 'latin1')));
if (hits.length) {
  console.log(`WARNING: these mention a name that should not be there:\n${hits.join('\n')}`);
  process.exit(1);
}
const authors = execSync('git log --format=%an%n%ae', { encoding: 'utf8' });
if (names.test(authors)) {
  console.log('WARNING: a commit in this copy is under a name that should not be there');
  process.exit(1);
}
console.log(`Checked all ${files.length} files and the commit author: no other names.`);
