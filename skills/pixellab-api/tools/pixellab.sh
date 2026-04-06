#!/usr/bin/env bash
# PixelLab API v2 helper — wraps endpoints not available in MCP
# Usage: ./scripts/pixellab.sh <command> [args...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$SCRIPT_DIR/.env"

API="https://api.pixellab.ai/v2"
AUTH="Authorization: Bearer $PIXELLAB_API_KEY"
CT="Content-Type: application/json"
OUT_BASE="$SCRIPT_DIR/public/assets"

# ── helpers ──────────────────────────────────────────────────────

die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo "→ $*"; }

b64_encode() {
  local file="$1"
  [[ -f "$file" ]] || die "File not found: $file"
  base64 -i "$file" 2>/dev/null || base64 -w0 "$file"
}

img_size() {
  # returns "width height" from PNG/image using sips (macOS) or identify
  local file="$1"
  if command -v sips &>/dev/null; then
    local w h
    w=$(sips -g pixelWidth "$file" 2>/dev/null | tail -1 | awk '{print $2}')
    h=$(sips -g pixelHeight "$file" 2>/dev/null | tail -1 | awk '{print $2}')
    echo "$w $h"
  elif command -v identify &>/dev/null; then
    identify -format "%w %h" "$file"
  else
    die "Need sips (macOS) or ImageMagick identify to read image dimensions"
  fi
}

save_b64_image() {
  local b64="$1" outpath="$2"
  mkdir -p "$(dirname "$outpath")"
  echo "$b64" | base64 -d > "$outpath" 2>/dev/null || echo "$b64" | base64 -D > "$outpath"
  info "Saved: $outpath"
}

poll_job() {
  local job_id="$1" outdir="$2" prefix="${3:-image}"
  info "Polling job $job_id ..."
  local max_wait=120 elapsed=0
  while (( elapsed < max_wait )); do
    local resp
    resp=$(curl -sf "$API/background-jobs/$job_id" -H "$AUTH")
    local status
    status=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")

    if [[ "$status" == "completed" ]]; then
      mkdir -p "$outdir"
      echo "$resp" | python3 -c "
import sys, json, base64, os
data = json.load(sys.stdin)
images = data.get('last_response', {}).get('images', [])
outdir = '$outdir'
prefix = '$prefix'
for i, img in enumerate(images):
    path = os.path.join(outdir, f'{prefix}-{i}.png')
    with open(path, 'wb') as f:
        f.write(base64.b64decode(img['base64']))
    print(f'→ Saved: {path}')
print(f'✓ {len(images)} images saved')
"
      return 0
    elif [[ "$status" == "failed" ]]; then
      echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print('FAILED:', d.get('error', d))"
      return 1
    fi

    info "Status: $status (${elapsed}s / ${max_wait}s) ..."
    sleep 10
    elapsed=$((elapsed + 10))
  done
  die "Timeout after ${max_wait}s. Job ID: $job_id — poll manually with: $0 poll $job_id <outdir>"
}

# ── commands ─────────────────────────────────────────────────────

cmd_animate() {
  local sprite="$1" action="$2" frames="${3:-8}" outdir="${4:-}"

  [[ -f "$sprite" ]] || die "Sprite not found: $sprite"
  local b64
  b64=$(b64_encode "$sprite")

  if [[ -z "$outdir" ]]; then
    local name
    name=$(basename "$sprite" | sed 's/\.[^.]*$//')
    outdir="$OUT_BASE/test-api/animate-${name}"
  fi

  info "Animating: $sprite"
  info "Action: $action ($frames frames)"

  local resp
  resp=$(curl -sf -X POST "$API/animate-with-text-v3" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"first_frame\": {\"type\":\"base64\", \"base64\":\"$b64\", \"format\":\"png\"},
      \"action\": \"$action\",
      \"frame_count\": $frames,
      \"no_background\": true
    }")

  # Sync endpoint — images in response
  mkdir -p "$outdir"
  echo "$resp" | python3 -c "
import sys, json, base64, os
data = json.load(sys.stdin)
if 'images' in data:
    outdir = '$outdir'
    for i, img in enumerate(data['images']):
        path = os.path.join(outdir, f'frame-{i}.png')
        with open(path, 'wb') as f:
            f.write(base64.b64decode(img['base64']))
        print(f'→ Saved: {path}')
    print(f'✓ {len(data[\"images\"])} frames saved to {outdir}/')
elif 'error' in data or 'detail' in data:
    print(f'ERROR: {json.dumps(data, indent=2)}')
else:
    print(f'Unexpected: {list(data.keys())}')
"
}

cmd_generate() {
  local desc="$1" size="${2:-64x64}" outdir="${3:-}"
  local w="${size%x*}" h="${size#*x}"

  if [[ -z "$outdir" ]]; then
    local slug
    slug=$(echo "$desc" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
    outdir="$OUT_BASE/test-api/gen-${slug}"
  fi

  info "Generating: $desc (${w}x${h})"

  local resp
  resp=$(curl -sf -X POST "$API/generate-image-v2" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"description\": \"$desc\",
      \"image_size\": {\"width\": $w, \"height\": $h},
      \"no_background\": true
    }")

  local job_id
  job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('background_job_id',''))")
  [[ -n "$job_id" ]] || die "No job ID in response: $resp"

  poll_job "$job_id" "$outdir" "image"
}

cmd_generate_ui() {
  local desc="$1" size="${2:-256x256}" palette="${3:-}" outdir="${4:-}"
  local w="${size%x*}" h="${size#*x}"

  if [[ -z "$outdir" ]]; then
    local slug
    slug=$(echo "$desc" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
    outdir="$OUT_BASE/test-api/ui-${slug}"
  fi

  local palette_json=""
  [[ -n "$palette" ]] && palette_json=", \"color_palette\": \"$palette\""

  info "Generating UI: $desc (${w}x${h})"

  local resp
  resp=$(curl -sf -X POST "$API/generate-ui-v2" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"description\": \"$desc\",
      \"image_size\": {\"width\": $w, \"height\": $h},
      \"no_background\": true
      $palette_json
    }")

  local job_id
  job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('background_job_id',''))")
  [[ -n "$job_id" ]] || die "No job ID in response: $resp"

  poll_job "$job_id" "$outdir" "ui"
}

cmd_edit() {
  local sprite="$1" desc="$2" outdir="${3:-}"

  [[ -f "$sprite" ]] || die "Sprite not found: $sprite"
  local b64
  b64=$(b64_encode "$sprite")
  read -r w h <<< "$(img_size "$sprite")"

  if [[ -z "$outdir" ]]; then
    local name
    name=$(basename "$sprite" | sed 's/\.[^.]*$//')
    outdir="$OUT_BASE/test-api/edit-${name}"
  fi

  info "Editing: $sprite → $desc"

  local resp
  resp=$(curl -sf -X POST "$API/edit-images-v2" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"method\": \"edit_with_text\",
      \"edit_images\": [{\"image\":{\"base64\":\"$b64\"}, \"width\":$w, \"height\":$h}],
      \"image_size\": {\"width\":$w, \"height\":$h},
      \"description\": \"$desc\",
      \"no_background\": true
    }")

  local job_id
  job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('background_job_id',''))")
  [[ -n "$job_id" ]] || die "No job ID in response: $resp"

  poll_job "$job_id" "$outdir" "edited"
}

cmd_remove_bg() {
  local sprite="$1" outpath="${2:-}"

  [[ -f "$sprite" ]] || die "Sprite not found: $sprite"
  local b64
  b64=$(b64_encode "$sprite")
  read -r w h <<< "$(img_size "$sprite")"

  if [[ -z "$outpath" ]]; then
    local name dir
    name=$(basename "$sprite" | sed 's/\.[^.]*$//')
    dir=$(dirname "$sprite")
    outpath="${dir}/${name}-nobg.png"
  fi

  info "Removing background: $sprite"

  local resp
  resp=$(curl -sf -X POST "$API/remove-background" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"image\": {\"base64\":\"$b64\"},
      \"image_size\": {\"width\":$w, \"height\":$h},
      \"background_removal_task\": \"remove_simple_background\"
    }")

  echo "$resp" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'image' in data:
    with open('$outpath', 'wb') as f:
        f.write(base64.b64decode(data['image']['base64']))
    print(f'→ Saved: $outpath')
else:
    print(f'ERROR: {json.dumps(data, indent=2)[:300]}')
"
}

cmd_rotate() {
  local sprite="$1" from_dir="$2" to_dir="$3" outpath="${4:-}"

  [[ -f "$sprite" ]] || die "Sprite not found: $sprite"
  local b64
  b64=$(b64_encode "$sprite")
  read -r w h <<< "$(img_size "$sprite")"

  if [[ -z "$outpath" ]]; then
    local name dir
    name=$(basename "$sprite" | sed 's/\.[^.]*$//')
    dir=$(dirname "$sprite")
    outpath="${dir}/${name}-${to_dir}.png"
  fi

  info "Rotating: $sprite ($from_dir → $to_dir)"

  local resp
  resp=$(curl -sf -X POST "$API/rotate" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"image_size\": {\"width\":$w, \"height\":$h},
      \"from_image\": {\"base64\":\"$b64\"},
      \"from_direction\": \"$from_dir\",
      \"to_direction\": \"$to_dir\",
      \"image_guidance_scale\": 3.0
    }")

  echo "$resp" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'image' in data:
    with open('$outpath', 'wb') as f:
        f.write(base64.b64decode(data['image']['base64']))
    print(f'→ Saved: $outpath')
else:
    print(f'ERROR: {json.dumps(data, indent=2)[:300]}')
"
}

cmd_resize() {
  local sprite="$1" target_size="$2" desc="${3:-pixel art sprite}" outpath="${4:-}"
  local tw="${target_size%x*}" th="${target_size#*x}"

  [[ -f "$sprite" ]] || die "Sprite not found: $sprite"
  local b64
  b64=$(b64_encode "$sprite")
  read -r w h <<< "$(img_size "$sprite")"

  if [[ -z "$outpath" ]]; then
    local name dir
    name=$(basename "$sprite" | sed 's/\.[^.]*$//')
    dir=$(dirname "$sprite")
    outpath="${dir}/${name}-${tw}x${th}.png"
  fi

  info "Resizing: $sprite (${w}x${h} → ${tw}x${th})"

  local resp
  resp=$(curl -sf -X POST "$API/resize" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"description\": \"$desc\",
      \"reference_image\": {\"base64\":\"$b64\"},
      \"reference_image_size\": {\"width\":$w, \"height\":$h},
      \"target_size\": {\"width\":$tw, \"height\":$th},
      \"no_background\": true
    }")

  echo "$resp" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'image' in data:
    with open('$outpath', 'wb') as f:
        f.write(base64.b64decode(data['image']['base64']))
    print(f'→ Saved: $outpath')
else:
    print(f'ERROR: {json.dumps(data, indent=2)[:300]}')
"
}

cmd_poll() {
  local job_id="$1" outdir="${2:-$OUT_BASE/test-api/poll-$1}"
  poll_job "$job_id" "$outdir" "image"
}

cmd_style() {
  local ref_sprite="$1" desc="$2" size="${3:-64x64}" outdir="${4:-}"
  local w="${size%x*}" h="${size#*x}"

  [[ -f "$ref_sprite" ]] || die "Reference sprite not found: $ref_sprite"
  local ref_b64
  ref_b64=$(b64_encode "$ref_sprite")
  read -r rw rh <<< "$(img_size "$ref_sprite")"

  if [[ -z "$outdir" ]]; then
    local slug
    slug=$(echo "$desc" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
    outdir="$OUT_BASE/test-api/style-${slug}"
  fi

  info "Style-matching: $ref_sprite → $desc (${w}x${h})"

  local resp
  resp=$(curl -sf -X POST "$API/generate-with-style-v2" \
    -H "$AUTH" -H "$CT" \
    -d "{
      \"style_images\": [{\"image\":{\"type\":\"base64\",\"base64\":\"$ref_b64\",\"format\":\"png\"}, \"width\":$rw, \"height\":$rh}],
      \"description\": \"$desc\",
      \"image_size\": {\"width\":$w, \"height\":$h},
      \"no_background\": true
    }")

  local job_id
  job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('background_job_id',''))")
  [[ -n "$job_id" ]] || die "No job ID in response: $resp"

  poll_job "$job_id" "$outdir" "styled"
}

# ── main ─────────────────────────────────────────────────────────

usage() {
  cat <<'HELP'
PixelLab API v2 Helper

Usage: ./scripts/pixellab.sh <command> [args...]

Commands:
  animate <sprite> <action> [frames] [outdir]
    Generate animation from static sprite (sync, 4-16 frames)
    Example: ./scripts/pixellab.sh animate player.png "walking forward" 8

  generate <description> [WxH] [outdir]
    Generate pixel art from text (async)
    Example: ./scripts/pixellab.sh generate "golden sword" 64x64

  generate-ui <description> [WxH] [palette] [outdir]
    Generate UI elements (async)
    Example: ./scripts/pixellab.sh generate-ui "health bar frame" 256x64 "red and gold"

  edit <sprite> <description> [outdir]
    Edit existing sprite with text (async)
    Example: ./scripts/pixellab.sh edit knight.png "add a red cape"

  style <ref-sprite> <description> [WxH] [outdir]
    Generate new sprite matching reference style (async)
    Example: ./scripts/pixellab.sh style player.png "enemy goblin" 48x48

  rotate <sprite> <from-dir> <to-dir> [outpath]
    Rotate sprite direction (sync)
    Example: ./scripts/pixellab.sh rotate char-south.png south east

  resize <sprite> <WxH> [description] [outpath]
    Smart pixel-art resize (sync)
    Example: ./scripts/pixellab.sh resize small.png 64x64 "wizard character"

  remove-bg <sprite> [outpath]
    Remove background (sync)
    Example: ./scripts/pixellab.sh remove-bg sprite-with-bg.png

  poll <job-id> [outdir]
    Poll async job and save result
    Example: ./scripts/pixellab.sh poll abc-123-def

HELP
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  animate)     cmd_animate "$@" ;;
  generate)    cmd_generate "$@" ;;
  generate-ui) cmd_generate_ui "$@" ;;
  edit)        cmd_edit "$@" ;;
  style)       cmd_style "$@" ;;
  rotate)      cmd_rotate "$@" ;;
  resize)      cmd_resize "$@" ;;
  remove-bg)   cmd_remove_bg "$@" ;;
  poll)        cmd_poll "$@" ;;
  help|--help|-h) usage ;;
  *) die "Unknown command: $cmd (try --help)" ;;
esac
