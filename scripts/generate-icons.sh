#!/usr/bin/env bash
#
# Regenerate the PWA icon set in public/icons from the app's own mark.
#
# Source of truth: src/assets/icon-source.jpg — the 1024x1024 original that
# used to sit in public/ as icon.jpg, and as a byte-identical copy called
# icon.png that was a JPEG with the wrong extension. The manifest pointed both
# its 192 and its 512 entry at that one 1024 file, so every size the browser
# asked for was a lie and 534 KB of it was precached twice.
#
# ffmpeg does the rasterising, so this needs no npm dependency and no canvas
# build. Lanczos for the downscale; a 256-colour palette because the mark is
# flat illustration, which cuts each file to roughly a tenth of the truecolour
# size with no visible difference at icon scale.
#
# The maskable variant sits the art at 80% inside the frame on the background
# teal sampled from the source's own corner (#7BDBC9), so an Android circle or
# squircle mask crops padding and never the elephant.
#
# Usage: bash scripts/generate-icons.sh   (from the repo root)

set -euo pipefail

SRC="src/assets/icon-source.jpg"
OUT="public/icons"
BG="0x7BDBC9"

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }
mkdir -p "$OUT"

# Scale, then quantise: palettegen/paletteuse in one graph so the palette is
# built from the already-downscaled frame rather than the 1024 original.
quantise='split[a][b];[a]palettegen=max_colors=256:stats_mode=single[p];[b][p]paletteuse=dither=sierra2_4a'

for size in 192 512; do
  ffmpeg -v error -y -i "$SRC" \
    -vf "scale=${size}:${size}:flags=lanczos,${quantise}" \
    -frames:v 1 "$OUT/icon-${size}.png"
done

# 80% of 512 is 409.6; 410 keeps it even after the 51px inset on each side.
ffmpeg -v error -y -i "$SRC" \
  -vf "scale=410:410:flags=lanczos,pad=512:512:51:51:color=${BG},${quantise}" \
  -frames:v 1 "$OUT/icon-maskable-512.png"

ls -l "$OUT"
