#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

SOURCE="$TMP/source"
WEBROOT="$TMP/live"
BACKUPS="$TMP/backups"
STATE_ROOT="$TMP/state"
FAKEBIN="$TMP/bin"
HTTP_STATE="$TMP/http-running"
HTTP_SERVICE="$TMP/S70httpd"
SOURCE_SHA=1111111111111111111111111111111111111111

mkdir -p "$SOURCE/.ad5x" "$SOURCE/assets" "$WEBROOT" "$FAKEBIN"
cp "$ROOT/scripts/ad5x-fluidd-deploy.sh" "$SOURCE/.ad5x/deploy.sh"
chmod 0755 "$SOURCE/.ad5x/deploy.sh"

printf '%s\n' 'new-fluidd-index' >"$SOURCE/index.html"
INDEX_SHA="$(sha256sum "$SOURCE/index.html" | awk '{print $1}')"
cat >"$SOURCE/.ad5x-build.json" <<EOF
{
  "schema": 1,
  "source_repository": "genrudko/fluidd",
  "source_branch": "ad5x-dev",
  "source_sha": "$SOURCE_SHA",
  "index_sha256": "$INDEX_SHA"
}
EOF

printf '%s\n' 'old-fluidd-index' >"$WEBROOT/index.html"
printf '%s\n' '{"moonraker": "preserve-me"}' >"$WEBROOT/config.json"
printf '%s\n' running >"$HTTP_STATE"

cat >"$HTTP_SERVICE" <<'SH'
#!/bin/sh
case "${1:-}" in
    stop)
        rm -f "$AD5X_TEST_HTTP_STATE"
        # Z-Mod S70httpd may return non-zero even though zmod_httpd is gone.
        exit 1
        ;;
    start)
        printf '%s\n' running >"$AD5X_TEST_HTTP_STATE"
        exit 0
        ;;
    *)
        exit 2
        ;;
esac
SH
chmod 0755 "$HTTP_SERVICE"

cat >"$FAKEBIN/ps" <<'SH'
#!/bin/sh
if [ -f "$AD5X_TEST_HTTP_STATE" ]; then
    printf '%s\n' "123 root zmod_httpd $AD5X_TEST_WEBROOT"
fi
SH
chmod 0755 "$FAKEBIN/ps"

cat >"$FAKEBIN/curl" <<'SH'
#!/bin/sh
OUT=
while [ "$#" -gt 0 ]; do
    case "$1" in
        -o)
            shift
            OUT="${1:-}"
            ;;
    esac
    shift || true
done
if [ -n "$OUT" ]; then
    cp "$AD5X_TEST_WEBROOT/index.html" "$OUT"
else
    cat "$AD5X_TEST_WEBROOT/index.html"
fi
SH
chmod 0755 "$FAKEBIN/curl"

OUTPUT="$TMP/output.txt"
PATH="$FAKEBIN:$PATH" \
AD5X_TEST_HTTP_STATE="$HTTP_STATE" \
AD5X_TEST_WEBROOT="$WEBROOT" \
AD5X_FLUIDD_WEBROOT="$WEBROOT" \
AD5X_FLUIDD_HTTP_SERVICE="$HTTP_SERVICE" \
AD5X_FLUIDD_HTTP_URL=http://fake-fluidd/ \
AD5X_FLUIDD_BACKUP_ROOT="$BACKUPS" \
AD5X_FLUIDD_STATE_ROOT="$STATE_ROOT" \
AD5X_FLUIDD_SOURCE_SHA="$SOURCE_SHA" \
/bin/sh "$SOURCE/.ad5x/deploy.sh" update >"$OUTPUT" 2>&1

cmp "$SOURCE/index.html" "$WEBROOT/index.html"
grep -Fq 'preserve-me' "$WEBROOT/config.json"
grep -Fq "\"source_sha\": \"$SOURCE_SHA\"" "$WEBROOT/.ad5x-build.json"
grep -Fq '[OK] Fluidd git deploy complete' "$OUTPUT"
[ -f "$HTTP_STATE" ]

BACKUP="$(cat "$STATE_ROOT/last-backup")"
grep -Fqx 'old-fluidd-index' "$BACKUP/live/index.html"
grep -Fq 'preserve-me' "$BACKUP/live/config.json"

ROLLBACK_OUTPUT="$TMP/rollback-output.txt"
PATH="$FAKEBIN:$PATH" \
AD5X_TEST_HTTP_STATE="$HTTP_STATE" \
AD5X_TEST_WEBROOT="$WEBROOT" \
AD5X_FLUIDD_WEBROOT="$WEBROOT" \
AD5X_FLUIDD_HTTP_SERVICE="$HTTP_SERVICE" \
AD5X_FLUIDD_HTTP_URL=http://fake-fluidd/ \
AD5X_FLUIDD_BACKUP_ROOT="$BACKUPS" \
AD5X_FLUIDD_STATE_ROOT="$STATE_ROOT" \
/bin/sh "$SOURCE/.ad5x/deploy.sh" rollback >"$ROLLBACK_OUTPUT" 2>&1

grep -Fqx 'old-fluidd-index' "$WEBROOT/index.html"
grep -Fq 'preserve-me' "$WEBROOT/config.json"
grep -Fq '[OK] Fluidd rollback complete' "$ROLLBACK_OUTPUT"
[ -f "$HTTP_STATE" ]

printf '%s\n' '[OK] deploy accepts false-negative S70httpd stop rc only after zmod_httpd is actually absent'
printf '%s\n' '[OK] local backup rollback restores previous Fluidd tree without network access'
