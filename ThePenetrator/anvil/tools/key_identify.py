import hashlib, base64

target = "17bed27124d81bef265c1b17a0b806056c21fea66f15ea17569061278d590ea0"

# Ollama pubkey
pubkey_hex = "885cf0284fe507d505a3c40808a2d43948aab7d52b3eccd774dce51306ab491e"
pubkey_bytes = bytes.fromhex(pubkey_hex)

tests = {
    "SHA256(pubkey_raw)": hashlib.sha256(pubkey_bytes).hexdigest(),
}

with open(r"C:\Users\natha\.ollama\id_ed25519.pub", "r") as f:
    pub_text = f.read().strip()
tests["SHA256(pubkey_text)"] = hashlib.sha256(pub_text.encode()).hexdigest()

key_b64 = pub_text.split()[1]
key_blob = base64.b64decode(key_b64 + "==")
tests["SHA256(key_blob)"] = hashlib.sha256(key_blob).hexdigest()

with open(r"C:\Users\natha\.ollama\id_ed25519", "r") as f:
    priv_text = f.read().strip()
tests["SHA256(privkey)"] = hashlib.sha256(priv_text.encode()).hexdigest()

for label, h in tests.items():
    print(f"{label}: {h}")
    print(f"  Match: {h == target}")

# Brute force common strings
print("\n--- String hashes ---")
strings = [
    "gemma", "gemma3", "gemma3:4b", "ollama", "7333", "port7333",
    "localhost:7333", "Nates_PC", "nathanielcrigger66@gmail.com",
    "kimi-k2.5:cloud", "openclaw", "the sixth", ".sixth", "sixth",
    "bridge", "tunnel", "venice_tunnel", "anvil", "logos", "aegis",
    "Gemma", "Ollama", "Easter egg", "easter egg",
    "17bed27124d81bef265c1b17a0b806056c21fea66f15ea17569061278d590ea0",
]
for s in strings:
    h = hashlib.sha256(s.encode()).hexdigest()
    match = "<<< MATCH!" if h == target else ""
    if match:
        print(f"  SHA256('{s}') = {h} {match}")

# XOR pubkey with target
target_bytes = bytes.fromhex(target)
xor = bytes(a ^ b for a, b in zip(target_bytes, pubkey_bytes))
print(f"\nXOR(target, pubkey): {xor.hex()}")
printable = sum(1 for b in xor if 32 <= b < 127)
print(f"Printable: {printable}/32")
if printable > 10:
    ascii_xor = "".join(chr(b) if 32 <= b < 127 else "." for b in xor)
    print(f"ASCII: {ascii_xor}")

# Check if it could be an ed25519 PRIVATE key seed
print(f"\nTarget as potential ed25519 seed: {target}")
print(f"Length: {len(target_bytes)} bytes (32 = valid ed25519 seed)")

# Derive ed25519 public key from target as seed
try:
    from hashlib import sha512
    # Ed25519 key derivation: SHA-512(seed)[:32] with bit clamping
    h = sha512(target_bytes).digest()
    # Clamp
    a = bytearray(h[:32])
    a[0] &= 248
    a[31] &= 127
    a[31] |= 64
    print(f"Derived key scalar: {bytes(a).hex()}")
    print(f"Matches pubkey: {bytes(a).hex() == pubkey_hex}")
except Exception as e:
    print(f"Ed25519 derivation error: {e}")
