import hashlib, binascii, struct, base64, re, os

h = '17bed27124d81bef265c1b17a0b806056c21fea66f15ea17569061278d590ea0'
raw = bytes.fromhex(h)

print('=== HEX STRING ANALYSIS ===')
print(f'Hex: {h}')
print(f'Length: {len(h)} hex chars = {len(raw)} bytes')
print()

# 1. Direct hex to ASCII
print('--- Direct hex->ASCII ---')
ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in raw)
print(f'  Printable: {ascii_str}')
print(f'  Raw bytes: {list(raw)}')
print()

# 2. Check for 7333 embedded in hex
print('--- 7333 search in hex string ---')
idx = h.find('7333')
if idx >= 0:
    print(f'  FOUND "7333" at position {idx} in hex string!')
    print(f'  Before: ...{h[max(0,idx-8):idx]}')
    print(f'  After:  {h[idx+4:idx+12]}...')
else:
    print('  Not found as substring')

# Check numeric representations
for i in range(len(raw)-1):
    val_be = struct.unpack('>H', raw[i:i+2])[0]
    val_le = struct.unpack('<H', raw[i:i+2])[0]
    if val_be == 7333:
        print(f'  Found 7333 as big-endian uint16 at byte {i}')
    if val_le == 7333:
        print(f'  Found 7333 as little-endian uint16 at byte {i}')
print()

# 3. XOR with various keys
print('--- XOR single-byte keys ---')
for key in range(256):
    result = bytes([b ^ key for b in raw])
    printable_count = sum(1 for b in result if 32 <= b < 127)
    if printable_count > len(raw) * 0.7:
        txt = ''.join(chr(b) if 32 <= b < 127 else '.' for b in result)
        print(f'  XOR 0x{key:02x} ({printable_count}/{len(raw)} printable): {txt}')
print()

# 4. XOR with "7333" as repeating key
print('--- XOR with "7333" as key ---')
key_7333 = b'7333'
result = bytes([raw[i] ^ key_7333[i % len(key_7333)] for i in range(len(raw))])
txt = ''.join(chr(b) if 32 <= b < 127 else '.' for b in result)
print(f'  Result: {txt}')
print(f'  Hex: {result.hex()}')
print()

# 5. Reverse the hex
print('--- Reverse operations ---')
rev_hex = h[::-1]
print(f'  Reversed: {rev_hex}')
try:
    rev_bytes = bytes.fromhex(rev_hex)
    rev_ascii = ''.join(chr(b) if 32 <= b < 127 else '.' for b in rev_bytes)
    print(f'  Reversed->ASCII: {rev_ascii}')
except:
    print('  Reversed hex invalid')

# Byte-reverse (endian swap)
byte_rev = raw[::-1]
print(f'  Byte-reversed hex: {byte_rev.hex()}')
byte_rev_ascii = ''.join(chr(b) if 32 <= b < 127 else '.' for b in byte_rev)
print(f'  Byte-reversed ASCII: {byte_rev_ascii}')
print()

# 6. Chunk analysis
print('--- Chunk analysis ---')
chunks4 = [h[i:i+4] for i in range(0, len(h), 4)]
print(f'  4-char chunks: {" ".join(chunks4)}')
print(f'  As decimals: {" ".join(str(int(c, 16)) for c in chunks4)}')
chunks8 = [h[i:i+8] for i in range(0, len(h), 8)]
print(f'  8-char chunks: {" ".join(chunks8)}')
print(f'  As decimals: {" ".join(str(int(c, 16)) for c in chunks8)}')
print()

# 7. Known hash check
print('--- Known hash brute force ---')
wordlist = [
    '7333', 'port7333', 'ollama', 'gemma', 'gemma3', 'gemma3:4b',
    'easter', 'egg', 'easteregg', 'open', 'openclaw', 'venice',
    'aegis', 'logos', 'anvil', 'nate', 'nathan', 'nathaniel',
    'hello', 'password', 'admin', 'key', 'secret', 'bridge',
    'tunnel', 'daemon', 'app', 'server', 'port', 'start',
    'noiseAsset', 'NoiseAsset', 'noise', 'asset',
    'nathanielcrigger66', 'nathanielcrigger66@gmail.com',
    'kael', 'rune', 'wren', 'sage', 'vixen', 'llama', 'foreman',
    'localhost:7333', 'http://localhost:7333', 'http://127.0.0.1:7333',
    'ws://127.0.0.1:7333', 'http://0.0.0.0:7333',
    '0.0.0.0:7333', '127.0.0.1:7333', 'localhost',
    'ThePenetrator', 'penetrator', 'sixth', '.sixth',
]
for w in wordlist:
    sha = hashlib.sha256(w.encode()).hexdigest()
    if sha == h:
        print(f'  SHA256("{w}") = MATCH!')
    sha1 = hashlib.sha1(w.encode()).hexdigest()
    md5 = hashlib.md5(w.encode()).hexdigest()
print('  (no SHA256 matches found)' if not any(hashlib.sha256(w.encode()).hexdigest() == h for w in wordlist) else '')
print()

# 8. Base encodings
print('--- Base encodings ---')
print(f'  Base64 of raw: {base64.b64encode(raw).decode()}')
print(f'  Base64 of hex string: {base64.b64encode(h.encode()).decode()}')
try:
    b64dec = base64.b64decode(h)
    print(f'  Hex as base64 decoded: {b64dec[:50]}...')
except:
    print('  Hex string is not valid base64')
print()

# 9. Ethereum/blockchain interpretation
print('--- Blockchain ---')
print(f'  As ETH address (20 bytes): 0x{raw[:20].hex()}')
print(f'  As uint256: {int(h, 16)}')
print(f'  As tx hash: 0x{h}')
print()

# 10. Hex string letter analysis
print('--- Pattern analysis ---')
alpha_runs = re.findall(r'[a-f]{3,}', h)
print(f'  Alpha runs (3+): {alpha_runs}')
# bed, bef, dead, face, cafe etc
hex_words = {'dead': True, 'beef': True, 'face': True, 'cafe': True, 'babe': True, 'fade': True, 'feed': True, 'deed': True, 'bed': True, 'bad': True, 'add': True, 'ace': True}
for w in hex_words:
    if w in h:
        print(f'  Found hex-word: "{w}" at position {h.index(w)}')

# Leet speak decode
leet_map = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g'}
leet = ''.join(leet_map.get(c, c) for c in h)
print(f'  Leet decode: {leet}')
print()

# 11. Try splitting at meaningful points
print('--- Split at "17" (appears multiple times) ---')
parts = h.split('17')
print(f'  Parts split on "17": {parts}')
for i, p in enumerate(parts):
    if p:
        try:
            b = bytes.fromhex(p) if len(p) % 2 == 0 else None
            if b:
                txt = ''.join(chr(x) if 32 <= x < 127 else '.' for x in b)
                print(f'    Part {i} hex->ascii: {txt}')
        except:
            pass
print()

# 12. Check if any 4-byte chunk is a port number
print('--- Port number search in bytes ---')
for i in range(len(raw)-1):
    port_be = struct.unpack('>H', raw[i:i+2])[0]
    port_le = struct.unpack('<H', raw[i:i+2])[0]
    if 1000 <= port_be <= 65535:
        if port_be in [7333, 8777, 11434, 8080, 8000, 3000, 4000, 5000]:
            print(f'  Byte {i}: port {port_be} (big-endian)')
    if 1000 <= port_le <= 65535:
        if port_le in [7333, 8777, 11434, 8080, 8000, 3000, 4000, 5000]:
            print(f'  Byte {i}: port {port_le} (little-endian)')
print()

# 13. AES decryption attempt with 7333 as key
print('--- AES attempt with "7333" derived keys ---')
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    # Pad 7333 to 16/32 bytes
    for key_base in [b'7333', b'73337333', b'7333733373337333', b'73337333733373337333733373337333']:
        if len(key_base) in [16, 32]:
            try:
                # Try ECB mode (no IV needed)
                cipher = Cipher(algorithms.AES(key_base), modes.ECB(), backend=default_backend())
                dec = cipher.decryptor()
                plain = dec.update(raw) + dec.finalize()
                txt = ''.join(chr(b) if 32 <= b < 127 else '.' for b in plain)
                printable = sum(1 for b in plain if 32 <= b < 127)
                print(f'  AES-ECB key={key_base}: {txt} ({printable}/{len(plain)} printable)')
            except Exception as e:
                print(f'  AES-ECB key={key_base}: {e}')
except ImportError:
    print('  cryptography not installed, skipping AES')
print()

# 14. Try the hex as a file path component
print('--- Search for files/folders containing 7333 ---')
ollama_dir = r'C:\Users\natha\OneDrive\GitHub\Ollama'
for root, dirs, files in os.walk(ollama_dir):
    for f in files + dirs:
        if '7333' in f or '17bed' in f:
            print(f'  Found: {os.path.join(root, f)}')

# Also search the db for 7333 in content
import sqlite3
db = sqlite3.connect(os.path.join(ollama_dir, 'db.sqlite'))
print()
print('--- Database search for "7333" ---')
for row in db.execute("SELECT rowid, role, SUBSTR(content, 1, 200) FROM messages WHERE content LIKE '%7333%'"):
    print(f'  Row {row[0]} ({row[1]}): {row[2][:150]}')

print()
print('--- Database search for "17bed" ---')
for row in db.execute("SELECT rowid, role, SUBSTR(content, 1, 200) FROM messages WHERE content LIKE '%17bed%'"):
    print(f'  Row {row[0]} ({row[1]}): {row[2][:150]}')

print()
print('--- Database search for "port" in messages ---')
for row in db.execute("SELECT rowid, role, SUBSTR(content, 1, 200) FROM messages WHERE content LIKE '%port%' AND content LIKE '%7333%'"):
    print(f'  Row {row[0]} ({row[1]}): {row[2][:150]}')

# 15. Full attachment listing
print()
print('--- ALL ATTACHMENTS ---')
for row in db.execute("SELECT id, chat_id, name, type, size, created_at FROM attachments ORDER BY created_at"):
    print(f'  [{row[5]}] {row[2]} ({row[3]}, {row[4]} bytes) chat={row[1][:8]}')

db.close()
