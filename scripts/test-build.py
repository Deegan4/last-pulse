#!/usr/bin/env python3
"""Native-build smoke test (referenced by docs/ARCHITECTURE.md's "Verification" list).

Builds LastPulseIOS for the generic iOS Simulator destination — this exercises the real
"Build Shared Game" preBuildScript (project.yml) end to end, not just build-game.py's own
--check, which only proves the *web* outputs are fresh. Then asserts the packaged
GameContent/ the script phase wrote actually looks like a working bundle: index.html is
present, and the tracked inventory (.generated-files.json) matches what's really on disk.

python3 scripts/test-build.py
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IOS_ROOT = ROOT / 'LastPulseIOS'
PROJECT = IOS_ROOT / 'LastPulse.xcodeproj'


def run(cmd, **kw):
    print('$ ' + ' '.join(str(c) for c in cmd))
    return subprocess.run(cmd, cwd=str(IOS_ROOT), **kw)


def main():
    if not PROJECT.exists():
        sys.exit(f'{PROJECT} not found — run xcodegen generate in LastPulseIOS/ first')

    result = run([
        'xcodebuild', '-project', 'LastPulse.xcodeproj', '-scheme', 'LastPulse',
        '-destination', 'generic/platform=iOS Simulator', 'build',
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if result.returncode != 0:
        # xcodebuild's own log is long; only the tail usually has the actual error.
        print('\n'.join(result.stdout.splitlines()[-80:]))
        sys.exit(f'xcodebuild failed (exit {result.returncode})')
    if 'BUILD SUCCEEDED' not in result.stdout:
        print('\n'.join(result.stdout.splitlines()[-80:]))
        sys.exit('xcodebuild did not report BUILD SUCCEEDED')

    # The preBuildScript writes into $TARGET_BUILD_DIR/.../GameContent, which lives under
    # DerivedData rather than a fixed path — find the inventory file xcodebuild just wrote.
    matches = list(Path.home().glob(
        '**/Build/Products/*/LastPulse.app/GameContent/.generated-files.json'
    ))
    if not matches:
        matches = list(Path('/tmp').glob(
            '**/Build/Products/*/LastPulse.app/GameContent/.generated-files.json'
        ))
    if not matches:
        sys.exit('build succeeded but no GameContent/.generated-files.json was found under DerivedData')
    inventory_path = max(matches, key=lambda p: p.stat().st_mtime)
    game_content = inventory_path.parent

    if not (game_content / 'index.html').exists():
        sys.exit(f'{game_content} is missing index.html')

    expected = set(json.loads(inventory_path.read_text()))
    on_disk = {
        str(p.relative_to(game_content)) for p in game_content.rglob('*')
        if p.is_file() and p.name != '.generated-files.json'
    }
    missing = expected - on_disk
    if missing:
        sys.exit('inventory references files that are missing on disk: ' + ', '.join(sorted(missing)))

    print(f'OK — build succeeded, {game_content} has {len(on_disk)} files matching its inventory')


if __name__ == '__main__':
    main()
