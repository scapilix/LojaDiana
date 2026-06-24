import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'C:\Users\ricardo.souzamarques\Downloads\LojaDiana-master\LojaDiana-master\src\pages\POS.tsx'

with open(path, 'rb') as f:
    raw = f.read()

# Find "product.pvp" price display
idx = raw.find(b'product.pvp || 0).toFixed')
if idx >= 0:
    segment = raw[max(0,idx-30):idx+40]
    print(f'Bytes: {segment.hex()}')
    print(f'Text: {repr(segment.decode("utf-8", errors="replace"))}')

# Count all occurrences of euro in file
import re
# Look for properly encoded euro (e282ac) vs something else
euro_proper = raw.count(b'\xe2\x82\xac')  # € in UTF-8
print(f'\nProperly encoded euro (e2 82 ac): {euro_proper} occurrences')

# Look for any other pattern that could be euro-like
# â = c3a2, ‚ = e2809a, ¬ = c2ac
weird_euro = raw.count(b'\xc3\xa2\xe2\x80\x9a\xc2\xac')
print(f'Double-encoded euro (c3a2 e2809a c2ac): {weird_euro} occurrences')
