#!/usr/bin/env sh
# Makes the copy that goes to the owner: the current committed site with no
# history and none of the build notes (see export-ignore in .gitattributes),
# as one fresh commit in the owner's name.
#
#   sh scripts/export-for-owner.sh <new folder> "<owner name>" <owner email>
#
# Then, in the new folder: git remote add origin <his repo URL> && git push -u origin main
set -e
DEST=${1:?give a folder that does not exist yet}
NAME=${2:-TruDrive}
EMAIL=${3:-website@trudrive.invalid}
[ -e "$DEST" ] && { echo "$DEST already exists"; exit 1; }

[ -z "$(git status --porcelain)" ] || { echo "commit your changes first: the copy is made from the last commit"; exit 1; }

mkdir -p "$DEST"
git archive HEAD | tar -x -C "$DEST"
cd "$DEST"
git init -q -b main
# His name on this copy, so any commit made here later is his, not yours.
git config user.name "$NAME"
git config user.email "$EMAIL"
git add -A
git commit -q -m "TruDrive website"

echo "Made $DEST: $(git ls-files | wc -l) files, one commit by $NAME <$EMAIL>"
# Every committed file, read in full (grep can crash on the large editor file
# and would then look like a pass). Exits non-zero on a hit or on any error.
git ls-files -z | node -e '
  const fs = require("fs");
  const names = /travinyx|oduola|ayodavid/i;
  const files = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
  const hits = files.filter((f) => names.test(fs.readFileSync(f, "latin1")));
  if (hits.length) { console.log("WARNING: these mention a name that should not be there:\n" + hits.join("\n")); process.exit(1); }
  console.log("Checked all " + files.length + " files: no other names.");
'
