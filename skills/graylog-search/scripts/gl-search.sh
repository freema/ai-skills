#!/usr/bin/env bash
# Usage: gl-search.sh '<query>' [range_seconds] [limit]
# Example: gl-search.sh 'service:checkout AND level:<=3' 3600 100
#
# Required env: GRAYLOG_URL, GRAYLOG_API_TOKEN
# Optional env: GRAYLOG_STREAM_ID (scope searches to one stream),
#               GRAYLOG_FIELDS (default: timestamp,level,source,message)
set -euo pipefail

if [[ -z "${GRAYLOG_URL:-}" ]]; then
  echo "GRAYLOG_URL is not set, e.g. export GRAYLOG_URL=https://graylog.example.com" >&2
  exit 2
fi
if [[ -z "${GRAYLOG_API_TOKEN:-}" ]]; then
  echo "GRAYLOG_API_TOKEN is not set. Generate one in Graylog UI: System -> Users -> Edit tokens." >&2
  exit 2
fi

QUERY="${1:?query required, e.g. 'service:checkout AND level:<=3'}"
RANGE="${2:-3600}"
LIMIT="${3:-100}"
FIELDS="${GRAYLOG_FIELDS:-timestamp,level,source,message}"

FILTER_ARGS=()
if [[ -n "${GRAYLOG_STREAM_ID:-}" ]]; then
  FILTER_ARGS=(--data-urlencode "filter=streams:${GRAYLOG_STREAM_ID}")
fi

curl -sS --fail -G "${GRAYLOG_URL%/}/api/search/universal/relative" \
  -u "${GRAYLOG_API_TOKEN}:token" \
  -H "Accept: application/json" \
  -H "X-Requested-By: cli" \
  "${FILTER_ARGS[@]}" \
  --data-urlencode "query=${QUERY}" \
  --data-urlencode "range=${RANGE}" \
  --data-urlencode "limit=${LIMIT}" \
  --data-urlencode "sort=timestamp:desc" \
  --data-urlencode "fields=${FIELDS}" \
| jq -r '.messages[].message | "\(.timestamp) [\(.level)] \(.source // "-") | \(.message // .short_message | tostring | .[0:200])"'
