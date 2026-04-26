import base64, struct

# The key from the Ollama connect URL
b64_key = "c3NoLWVkMjU1MTkgQUFBQUMzTnphQzFsWkRJMU5URTVBQUFBSUloYzhDaFA1UWZWQmFQRUNBaWkxRGxJcXJmVkt6N00xM1RjNVJNR3Ewa2U="
raw = base64.b64decode(b64_key)
print("Full SSH key (hex):", raw.hex())

# Extract 32-byte raw public key
type_len = struct.unpack(">I", raw[:4])[0]
key_start = 4 + type_len + 4
key_bytes = raw[key_start:key_start+32]
hex_key = key_bytes.hex()
target = "17bed27124d81bef265c1b17a0b806056c21fea66f15ea17569061278d590ea0"

print(f"Raw 32-byte pubkey: {hex_key}")
print(f"Hex string target:  {target}")
print(f"MATCH: {hex_key == target}")

# Read id_ed25519.pub
with open(r"C:\Users\natha\.ollama\id_ed25519.pub", "r") as f:
    pub = f.read().strip()
print(f"\nid_ed25519.pub: {pub}")

# Extract key from pub file too
parts = pub.split()
if len(parts) >= 2:
    pub_raw = base64.b64decode(parts[1])
    pub_type_len = struct.unpack(">I", pub_raw[:4])[0]
    pub_key_start = 4 + pub_type_len + 4
    pub_key_bytes = pub_raw[pub_key_start:pub_key_start+32]
    print(f"Pubkey from file:   {pub_key_bytes.hex()}")
    print(f"MATCH with target:  {pub_key_bytes.hex() == target}")

# Now try: what if the hex string XOR'd with pub key gives something?
print("\n--- XOR Analysis ---")
target_bytes = bytes.fromhex(target)
xor_result = bytes(a ^ b for a, b in zip(target_bytes, key_bytes))
print(f"target XOR pubkey = {xor_result.hex()}")
printable = sum(1 for b in xor_result if 32 <= b < 127)
print(f"Printable chars: {printable}/32")
if printable > 20:
    print(f"ASCII: {''.join(chr(b) if 32 <= b < 127 else '.' for b in xor_result)}")

# Check if 7333 appears anywhere
print("\n--- 7333 hunting ---")
print(f"7333 in hex_key: {'7333' in hex_key}")
print(f"7333 in target: {'7333' in target}")
print(f"0x1CA5 = {0x1CA5} (decimal for 7333)")
print(f"1CA5 in target: {'1ca5' in target}")

# Try: is there a byte pair that equals 7333?
for i in range(0, len(target_bytes)-1):
    val = (target_bytes[i] << 8) | target_bytes[i+1]
    if val == 7333:
        print(f"FOUND 7333 at byte offset {i}: {target_bytes[i]:02x}{target_bytes[i+1]:02x}")

# Try: decimal values of bytes that contain 7, 3, 3, 3
digits_733 = []
for i, b in enumerate(target_bytes):
    d = str(b)
    if "7" in d or "3" in d:
        digits_733.append((i, b, hex(b), chr(b) if 32<=b<127 else "."))
print(f"\nBytes with digits 7 or 3 in decimal: {digits_733}")
