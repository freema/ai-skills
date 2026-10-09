#!/usr/bin/env bash
# Web encodes of a rendered master for self-hosting on a website: H.264 MP4 + VP9 WebM + a poster frame.
#   bash scripts/deliver.sh <master.mp4> <name-vN> [poster-seconds] [out-dir]
#   bash scripts/deliver.sh renders/trailer.mp4 trailer-v1 14.75     → renders/web/trailer-v1.{mp4,webm} + trailer-v1-poster.jpg
# Put the version in the name: sites usually cache static files as immutable, so a new cut needs a new URL.
set -euo pipefail
SRC=${1:?master mp4}
NAME=${2:?output name with a version, e.g. trailer-v1}
POSTER_T=${3:-1}
OUT=${4:-$(dirname "$SRC")/web}
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# H.264 High, AAC 160k, moov atom up front so playback starts before the download ends
ffmpeg -v error -y -i "$SRC" -c:v libx264 -preset veryslow -crf 23 -profile:v high -pix_fmt yuv420p -g 120 \
  -c:a aac -b:a 160k -movflags +faststart "$OUT/$NAME.mp4"
# VP9 + Opus, two-pass constrained quality
ffmpeg -v error -y -i "$SRC" -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -tile-columns 2 -g 120 -pass 1 \
  -passlogfile "$TMP/vp9" -an -f null /dev/null
ffmpeg -v error -y -i "$SRC" -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -tile-columns 2 -g 120 -pass 2 \
  -passlogfile "$TMP/vp9" -c:a libopus -b:a 128k "$OUT/$NAME.webm"
ffmpeg -v error -y -ss "$POSTER_T" -i "$SRC" -frames:v 1 -q:v 3 "$OUT/$NAME-poster.jpg"
ls -la "$OUT"/"$NAME"*
