#!/bin/sh
set -eu

# Git-native deployment lifecycle for the AD5X Fluidd distribution branch.
#
# Expected use: clone genrudko/fluidd branch ad5x-dist inside the Z-Mod chroot,
# then run .ad5x/deploy.sh.  The script never touches Moonraker/Klipper and
# only restarts the Z-Mod HTTP service after the replacement tree is ready.

MODE="${1:-install}"
SELF_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
case "$SELF_DIR" in
    */.ad5x) SOURCE_ROOT="${SELF_DIR%/.ad5x}" ;;
    *) SOURCE_ROOT="$(CDPATH= cd -- "$SELF_DIR/.." && pwd)" ;;
esac

WEBROOT="${AD5X_FLUIDD_WEBROOT:-/root/fluidd}"
HTTP_SERVICE="${AD5X_FLUIDD_HTTP_SERVICE:-/etc/init.d/S70httpd}"
HTTP_URL="${AD5X_FLUIDD_HTTP_URL:-http://127.0.0.1/}"
BACKUP_ROOT="${AD5X_FLUIDD_BACKUP_ROOT:-/opt/config/mod_data/ad5x_custom/backups}"
STATE_ROOT="${AD5X_FLUIDD_STATE_ROOT:-/opt/config/mod_data/ad5x_custom/state/fluidd-frontend}"
REQUESTED_SOURCE_SHA="${AD5X_FLUIDD_SOURCE_SHA:-}"
MANIFEST="$SOURCE_ROOT/.ad5x-build.json"
LIVE_MANIFEST="$WEBROOT/.ad5x-build.json"
LAST_BACKUP="$STATE_ROOT/last-backup"
CURRENT_STATE="$STATE_ROOT/current.env"

EXPECTED_REPOSITORY="genrudko/fluidd"
EXPECTED_SOURCE_BRANCH="zcal/v6-ui-contract"

fail(){ echo "ОШИБКА: $*" >&2; exit 1; }
sha256_file(){ sha256sum "$1" | awk '{print $1}'; }
python_bin(){
    if command -v python3 >/dev/null 2>&1; then
        command -v python3
    elif [ -x /root/moonraker-env/bin/python3 ]; then
        printf '%s\n' /root/moonraker-env/bin/python3
    else
        return 1
    fi
}
curl_bin(){
    if command -v curl >/dev/null 2>&1; then
        command -v curl
    elif [ -x /usr/bin/curl ]; then
        printf '%s\n' /usr/bin/curl
    elif [ -x /usr/prog/curl-7.55.1-https/bin/curl ]; then
        printf '%s\n' /usr/prog/curl-7.55.1-https/bin/curl
    else
        return 1
    fi
}

manifest_values(){
    FILE="$1"
    PY="$(python_bin)" || return 1
    "$PY" -B - "$FILE" <<'PY'
import json, re, sys
p=sys.argv[1]
try:
    d=json.load(open(p, encoding="utf-8"))
except Exception:
    raise SystemExit(2)
required=("schema", "source_repository", "source_branch", "source_sha", "index_sha256")
if any(k not in d for k in required):
    raise SystemExit(3)
if d["schema"] != 1:
    raise SystemExit(4)
if not isinstance(d["source_repository"], str) or not isinstance(d["source_branch"], str):
    raise SystemExit(5)
if not isinstance(d["source_sha"], str) or not re.fullmatch(r"[0-9a-f]{40}", d["source_sha"]):
    raise SystemExit(6)
if not isinstance(d["index_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", d["index_sha256"]):
    raise SystemExit(7)
print(d["source_repository"])
print(d["source_branch"])
print(d["source_sha"])
print(d["index_sha256"])
PY
}

load_manifest(){
    FILE="$1"
    [ -f "$FILE" ] || return 1
    VALUES="$(manifest_values "$FILE")" || return 1
    MANIFEST_REPOSITORY="$(printf '%s\n' "$VALUES" | sed -n '1p')"
    MANIFEST_BRANCH="$(printf '%s\n' "$VALUES" | sed -n '2p')"
    MANIFEST_SOURCE_SHA="$(printf '%s\n' "$VALUES" | sed -n '3p')"
    MANIFEST_INDEX_SHA="$(printf '%s\n' "$VALUES" | sed -n '4p')"
}

validate_payload(){
    load_manifest "$MANIFEST" || fail 'невалидный .ad5x-build.json'
    [ "$MANIFEST_REPOSITORY" = "$EXPECTED_REPOSITORY" ] || fail "неожиданный source_repository=$MANIFEST_REPOSITORY"
    [ "$MANIFEST_BRANCH" = "$EXPECTED_SOURCE_BRANCH" ] || fail "неожиданный source_branch=$MANIFEST_BRANCH"
    [ -f "$SOURCE_ROOT/index.html" ] || fail 'в deploy tree отсутствует index.html'
    [ -d "$SOURCE_ROOT/assets" ] || fail 'в deploy tree отсутствует assets/'
    [ "$(sha256_file "$SOURCE_ROOT/index.html")" = "$MANIFEST_INDEX_SHA" ] || fail 'hash index.html не совпадает с manifest'
    if [ -n "$REQUESTED_SOURCE_SHA" ]; then
        case "$MANIFEST_SOURCE_SHA" in
            "$REQUESTED_SOURCE_SHA"*) ;;
            *) fail "deploy source $MANIFEST_SOURCE_SHA не соответствует запрошенному $REQUESTED_SOURCE_SHA" ;;
        esac
    fi
    if find "$SOURCE_ROOT" -path "$SOURCE_ROOT/.git" -prune -o -type l -print | grep -q .; then
        fail 'deploy tree содержит symlink; отказ'
    fi
}

copy_payload(){
    DEST="$1"
    mkdir -p "$DEST"
    for P in "$SOURCE_ROOT"/* "$SOURCE_ROOT"/.[!.]* "$SOURCE_ROOT"/..?*; do
        [ -e "$P" ] || continue
        NAME="${P##*/}"
        case "$NAME" in
            .git|.ad5x) continue ;;
        esac
        cp -a "$P" "$DEST/"
    done
}

verify_live_http(){
    [ -f "$WEBROOT/index.html" ] || return 1
    load_manifest "$LIVE_MANIFEST" || return 1
    [ "$MANIFEST_REPOSITORY" = "$EXPECTED_REPOSITORY" ] || return 1
    [ "$MANIFEST_BRANCH" = "$EXPECTED_SOURCE_BRANCH" ] || return 1
    DISK_SHA="$(sha256_file "$WEBROOT/index.html")"
    [ "$DISK_SHA" = "$MANIFEST_INDEX_SHA" ] || return 1
    CURL="$(curl_bin)" || return 1
    TMP="/tmp/ad5x-fluidd-served-index.$$"
    rm -f "$TMP"
    if ! "$CURL" -f -sS -m 10 "$HTTP_URL" -o "$TMP"; then
        rm -f "$TMP"
        return 1
    fi
    SERVED_SHA="$(sha256_file "$TMP")"
    rm -f "$TMP"
    [ "$SERVED_SHA" = "$DISK_SHA" ]
}

http_process_running(){
    ps 2>/dev/null | grep -q '[z]mod_httpd'
}

stop_http(){
    "$HTTP_SERVICE" stop >/dev/null 2>&1 || true
    N=0
    while [ "$N" -lt 10 ]; do
        if ! http_process_running; then
            return 0
        fi
        N=$((N + 1))
        sleep 1
    done
    return 1
}

start_http(){
    "$HTTP_SERVICE" start >/dev/null 2>&1 || true
    N=0
    while [ "$N" -lt 10 ]; do
        if http_process_running; then
            return 0
        fi
        N=$((N + 1))
        sleep 1
    done
    return 1
}

rollback_swap(){
    OLD="$1"
    stop_http || true
    rm -rf "$WEBROOT"
    if [ -d "$OLD" ]; then
        mv "$OLD" "$WEBROOT"
    fi
    start_http || true
}

deploy(){
    validate_payload
    [ -x "$HTTP_SERVICE" ] || fail "HTTP service не найден: $HTTP_SERVICE"
    [ -d "$WEBROOT" ] || fail "Z-Mod Fluidd webroot не найден: $WEBROOT"
    [ -f "$WEBROOT/config.json" ] || fail 'live Z-Mod config.json не найден; безопасное обновление запрещено'

    mkdir -p "$BACKUP_ROOT" "$STATE_ROOT"
    SHORT="$(printf '%s' "$MANIFEST_SOURCE_SHA" | cut -c1-12)"
    STAMP="$(date +%Y%m%d-%H%M%S 2>/dev/null || printf unknown)"
    BACKUP="$BACKUP_ROOT/fluidd-git-$SHORT-$STAMP-$$"
    NEW="$WEBROOT.new.$$"
    OLD="$WEBROOT.old.$$"
    rm -rf "$NEW" "$OLD"

    mkdir -p "$BACKUP/live"
    cp -a "$WEBROOT/." "$BACKUP/live/"
    printf '%s\n' "$MANIFEST_SOURCE_SHA" >"$BACKUP/source-sha.txt"

    copy_payload "$NEW"
    cp -p "$WEBROOT/config.json" "$NEW/config.json"
    [ -f "$NEW/index.html" ] || fail 'staged webroot потерял index.html'
    [ "$(sha256_file "$NEW/index.html")" = "$MANIFEST_INDEX_SHA" ] || fail 'staged index hash mismatch'

    stop_http || fail 'не удалось остановить Z-Mod HTTP service'
    mv "$WEBROOT" "$OLD" || { start_http || true; fail 'не удалось отложить старый webroot'; }
    if ! mv "$NEW" "$WEBROOT"; then
        mv "$OLD" "$WEBROOT" || true
        start_http || true
        fail 'не удалось активировать новый webroot'
    fi
    if ! start_http; then
        rollback_swap "$OLD"
        fail 'новый webroot установлен, но Z-Mod HTTP service не стартовал; выполнен rollback'
    fi
    sleep 1
    if ! verify_live_http; then
        rollback_swap "$OLD"
        fail 'post-deploy HTTP/hash verification failed; выполнен rollback'
    fi

    rm -rf "$OLD"
    printf '%s\n' "$BACKUP" >"$LAST_BACKUP"
    {
        printf 'source_sha=%s\n' "$MANIFEST_SOURCE_SHA"
        printf 'index_sha256=%s\n' "$MANIFEST_INDEX_SHA"
        printf 'backup=%s\n' "$BACKUP"
    } >"$CURRENT_STATE"

    echo "[OK] Fluidd git deploy complete"
    echo "source_sha=$MANIFEST_SOURCE_SHA"
    echo "index_sha256=$MANIFEST_INDEX_SHA"
    echo "backup=$BACKUP"
    echo "webroot=$WEBROOT"
}

status(){
    if [ ! -f "$LIVE_MANIFEST" ]; then
        echo 'status=unmanaged'
        exit 1
    fi
    load_manifest "$LIVE_MANIFEST" || fail 'live manifest invalid'
    DISK_SHA="$(sha256_file "$WEBROOT/index.html" 2>/dev/null || true)"
    echo 'status=managed'
    echo "source_repository=$MANIFEST_REPOSITORY"
    echo "source_branch=$MANIFEST_BRANCH"
    echo "source_sha=$MANIFEST_SOURCE_SHA"
    echo "index_expected=$MANIFEST_INDEX_SHA"
    echo "index_disk=$DISK_SHA"
    [ "$DISK_SHA" = "$MANIFEST_INDEX_SHA" ] || exit 1
}

rollback(){
    [ -f "$LAST_BACKUP" ] || fail 'нет last-backup state'
    BACKUP="$(cat "$LAST_BACKUP")"
    [ -d "$BACKUP/live" ] || fail "backup отсутствует: $BACKUP/live"
    [ -x "$HTTP_SERVICE" ] || fail "HTTP service не найден: $HTTP_SERVICE"

    NEW="$WEBROOT.rollback.new.$$"
    OLD="$WEBROOT.rollback.old.$$"
    rm -rf "$NEW" "$OLD"
    mkdir -p "$NEW"
    cp -a "$BACKUP/live/." "$NEW/"
    [ -f "$NEW/index.html" ] || fail 'backup не содержит index.html'

    stop_http || fail 'не удалось остановить Z-Mod HTTP service'
    mv "$WEBROOT" "$OLD" || { start_http || true; fail 'не удалось отложить текущий webroot'; }
    if ! mv "$NEW" "$WEBROOT"; then
        mv "$OLD" "$WEBROOT" || true
        start_http || true
        fail 'не удалось восстановить backup webroot'
    fi
    if ! start_http; then
        rollback_swap "$OLD"
        fail 'rollback tree не стартовал; восстановлен текущий webroot'
    fi
    sleep 1
    CURL="$(curl_bin)" || { rollback_swap "$OLD"; fail 'curl недоступен после rollback'; }
    if ! "$CURL" -f -sS -m 10 "$HTTP_URL" >/dev/null; then
        rollback_swap "$OLD"
        fail 'rollback HTTP verification failed; восстановлен текущий webroot'
    fi
    rm -rf "$OLD"
    echo "[OK] Fluidd rollback complete"
    echo "restored=$BACKUP"
}

case "$MODE" in
    install|update|deploy) deploy ;;
    status) status ;;
    rollback) rollback ;;
    *) echo "usage: $0 {install|update|deploy|status|rollback}" >&2; exit 2 ;;
esac
