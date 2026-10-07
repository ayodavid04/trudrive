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
SRC=$(pwd)

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
# Every committed file read in full, plus the commit author.
node "$SRC/scripts/check-names.mjs"
