#!/usr/bin/env bash
#
# Regenerate every recorded clip in src/assets/audio from scratch.
#
# The app speaks Gujarati through these files; speechSynthesis is only the
# fallback, because most devices ship no gu-IN voice at all (see src/lib/audio.js).
# 75 clips: one per letter, one per lesson line, seven fixed phrases.
#
#   letter_<id>.mp3   the bare syllable, e.g. ક
#   lesson_<id>.mp3   "<letter>. <word>." — the exact string TraceView speaks
#   phrase_<key>.mp3  the seven lines the games and the sandbox say
#
# The filenames and the phrase strings are the contract with src/lib/audio.js:
# resolveClip() builds its map from curriculum.js ids and the same seven texts.
# Change a phrase in a view and it must change in both places, or that line
# silently drops back to the synthesizer.
#
# Voice: gu-IN-DhwaniNeural via edge-tts (Microsoft Edge's online TTS, free, no
# key). Letters and lesson lines are slowed to -10% because a 6-year-old is
# tracing along with them; the phrases run at the default rate.
#
# Needs python3 and node (node reads curriculum.js — it is the source of truth
# for the ids and the words, and this script never hardcodes them).
#
# Usage: bash scripts/tts-generate.sh   (from the repo root)
#
# Rerunning overwrites in place. The clips are committed, so `git status` after
# a run is the diff: the audio is regenerable, not irreplaceable, but the bytes
# in the repo are what ships.

set -euo pipefail

OUT="src/assets/audio"
VOICE="gu-IN-DhwaniNeural"
LETTER_RATE="-10%"
PHRASE_RATE="+0%"

[ -f "src/curriculum.js" ] || { echo "run me from the repo root" >&2; exit 1; }
command -v node >/dev/null || { echo "node not found" >&2; exit 1; }

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null || PY=python
command -v "$PY" >/dev/null || { echo "python3 not found" >&2; exit 1; }

# edge-tts, in a venv beside the repo so the script owns its own dependency
# instead of asking for a global pip install.
VENV=".tts-venv"
if [ ! -d "$VENV" ]; then
  echo "creating $VENV and installing edge-tts"
  "$PY" -m venv "$VENV"
fi
VENV_PY="$VENV/bin/python"
[ -x "$VENV_PY" ] || VENV_PY="$VENV/Scripts/python.exe"   # Windows layout
"$VENV_PY" -m pip install --quiet --upgrade pip edge-tts

mkdir -p "$OUT"

# The tasks, as TSV: filename, text, rate. The letters come out of
# curriculum.js; the phrases are written here.
TASKS="$(mktemp)"
trap 'rm -f "$TASKS"' EXIT

node --input-type=module -e "
  const { CURRICULUM } = await import('./src/curriculum.js');
  const rows = [];
  for (const l of CURRICULUM) {
    rows.push([\`letter_\${l.id}.mp3\`, l.letter, '$LETTER_RATE']);
    rows.push([\`lesson_\${l.id}.mp3\`, \`\${l.letter}. \${l.word}.\`, '$LETTER_RATE']);
  }
  process.stdout.write(rows.map((r) => r.join('\t')).join('\n') + '\n');
" > "$TASKS"

# Keep these in sync with PHRASE_CLIPS in src/lib/audio.js.
cat >> "$TASKS" <<PHRASES
phrase_correct.mp3	સાચો જવાબ.	$PHRASE_RATE
phrase_wrong.mp3	ફરીથી પ્રયાસ કરો.	$PHRASE_RATE
phrase_correct_exclaim.mp3	સાચો જવાબ!	$PHRASE_RATE
phrase_congrats.mp3	અભિનંદન.	$PHRASE_RATE
phrase_wonderful_correct.mp3	અદ્ભુત! સાચું છે!	$PHRASE_RATE
phrase_picture_beautiful.mp3	તમારું ચિત્ર સુંદર છે!	$PHRASE_RATE
phrase_all_pairs.mp3	અદ્ભુત! બધી જોડી મળી ગઈ!	$PHRASE_RATE
PHRASES

echo "generating $(wc -l < "$TASKS") clips into $OUT with $VOICE"

# Four at a time with three retries each: edge-tts talks to a remote service,
# and a dropped connection halfway through a run should not mean starting over.
# A clip that fails all three attempts fails the script — a zero-byte mp3 in
# src/assets/audio is worse than no run at all, since the glob would pick it up
# and resolveClip would hand speak() a URL that never plays.
OUT="$OUT" VOICE="$VOICE" "$VENV_PY" - "$TASKS" <<'PY'
import asyncio, pathlib, os, sys
import edge_tts

out = pathlib.Path(os.environ["OUT"])
voice = os.environ["VOICE"]
tasks = [line.split("\t") for line in
         pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if line.strip()]

async def one(sem, name, text, rate):
    async with sem:
        for attempt in range(3):
            try:
                # Written to a temp name first: a half-written clip must never
                # replace a good one that is already committed.
                tmp = out / (name + ".part")
                await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))
                if tmp.stat().st_size == 0:
                    raise RuntimeError("empty file")
                tmp.replace(out / name)
                print(f"  {name}  <-  {text}", flush=True)
                return
            except Exception as e:
                print(f"  retry {name} ({e})", flush=True)
                await asyncio.sleep(2)
        raise SystemExit(f"failed after 3 attempts: {name}")

async def main():
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*[one(sem, *t) for t in tasks])

asyncio.run(main())
print("done:", len(tasks), "clips")
PY

# _sample.mp3 was a scratch file from the voice audition; it is not part of the
# set and must not land in src/assets/audio, where the glob would map it to
# nothing and precache it for no reason.
rm -f "$OUT/_sample.mp3"

echo
echo "$OUT now holds $(ls "$OUT"/*.mp3 | wc -l) clips, $(du -sh "$OUT" | cut -f1)"
echo "run 'npm test' — tests/audio.test.js checks every letter and lesson line resolves"
