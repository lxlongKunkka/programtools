#!/bin/bash
# Migration script: hydro db -> programtools db
# Run on the server: bash migrate.sh
# Set credentials via environment variables or edit the URI below (DO NOT commit real passwords)

HYDRO_URI="${HYDRO_MONGODB_URI:-mongodb://hydro:<password>@localhost:27017/hydro}"
APP_URI="${APP_MONGODB_URI:-mongodb://programtools:<password>@localhost:27017/programtools}"

COLLECTIONS=(
  "app_settings"
  "coursegroups"
  "courselevels"
  "dailyproblems"
  "dailysudokus"
  "sokobanlevels"
  "sokobanprogresses"
  "sokobanresults"
  "sudokuresults"
  "typingresults"
  "userprogrresses"
)

DUMP_DIR="/tmp/programtools_migration"
mkdir -p "$DUMP_DIR"

echo "=== Step 1: Checking collections in hydro db ==="
mongosh "$HYDRO_URI" --quiet --eval "db.getCollectionNames().join('\n')"

echo ""
echo "=== Step 2: Dumping collections from hydro ==="
for COL in "${COLLECTIONS[@]}"; do
  echo "  Dumping: $COL"
  mongodump \
    --uri="$HYDRO_URI" \
    --collection="$COL" \
    --out="$DUMP_DIR" \
    --quiet 2>&1
  if [ $? -eq 0 ]; then
    echo "    OK: $COL"
  else
    echo "    SKIP: $COL (not found or empty)"
  fi
done

echo ""
echo "=== Step 3: Restoring collections to programtools ==="
for COL in "${COLLECTIONS[@]}"; do
  BSON_FILE="$DUMP_DIR/hydro/${COL}.bson"
  if [ -f "$BSON_FILE" ]; then
    echo "  Restoring: $COL"
    mongorestore \
      --uri="$APP_URI" \
      --collection="$COL" \
      "$BSON_FILE" \
      --quiet 2>&1
    if [ $? -eq 0 ]; then
      echo "    OK: $COL"
    else
      echo "    FAILED: $COL"
    fi
  else
    echo "  SKIP: $COL (no dump file)"
  fi
done

echo ""
echo "=== Step 4: Verify collection counts in programtools ==="
mongosh "$APP_URI" --quiet --eval "
  const cols = db.getCollectionNames();
  cols.forEach(c => {
    const count = db.getCollection(c).countDocuments();
    print(c + ': ' + count + ' documents');
  });
"

echo ""
echo "=== Migration complete ==="
rm -rf "$DUMP_DIR"
echo "Temp files cleaned up."
