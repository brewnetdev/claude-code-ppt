#!/usr/bin/env bash
# 도판 생성 → 덱 빌드 → 검증. 어느 단계든 실패하면 멈춘다.
#
#   docs/ppt/scripts/build.sh
#
# 산출물 2종 — 에디터 덱(docs/html/study/) · 단독 실행본(docs/html/*-slides.html).
# 둘 다 손으로 고치지 않는다. 고칠 곳은 MANIFEST(문구) · build_deck.py(배치) ·
# study.css(모양, 두 산출물 공용) · make_figures.py(도판) 넷 중 하나다.
set -euo pipefail
cd "$(dirname "$0")/../../.."

python3 docs/ppt/scripts/make_figures.py
python3 docs/ppt/scripts/build_deck.py
node docs/ppt/scripts/verify.mjs
node docs/ppt/scripts/verify-sa.mjs
