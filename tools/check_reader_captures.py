"""Catch the opaque scroll-layer regression in actual rendered reader captures."""
from pathlib import Path
from PIL import Image
files=list(Path('qa-reports/codex').glob('reader-*.png'))
assert len(files)>=12, 'Missing reader captures'
for path in files:
    image=Image.open(path).convert('RGB')
    black=sum(1 for r,g,b in image.getdata() if max(r,g,b)<3)
    assert black/(image.width*image.height)<.05, f'{path}: black compositing artifact'
print(f'Checked {len(files)} rendered reader captures for the opaque scroll-layer regression.')
