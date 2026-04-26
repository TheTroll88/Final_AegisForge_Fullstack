"""Quick BEMP bridge test — pure WebSocket, per protocol docs."""

import asyncio
import json
import uuid

import websockets


async def test():
    uri = "ws://localhost:8765/ws"
    async with websockets.connect(uri) as ws:
        rid = str(uuid.uuid4())
        prompt = {
            "action": "sendPrompt",
            "requestId": rid,
            "model": "venice",
            "text": "Say hello",
            "newChat": False,
        }
        await ws.send(json.dumps(prompt))
        print(f"Sent prompt (id: {rid[:8]}...)")

        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=90)
                data = json.loads(msg)
                if data.get("requestId") == rid:
                    t = data.get("type", "")
                    if t == "stream":
                        chunk = data.get("chunk", "")
                        print(chunk, end="", flush=True)
                    elif t == "response":
                        text = data.get("text", "")
                        print(f"\n\nFINAL: {text[:500]}")
                        break
                    elif t == "status":
                        print(f"[STATUS] {data.get('status', '')}")
                    else:
                        print(f"[OTHER] {data}")
            except asyncio.TimeoutError:
                print("\nTimed out after 90s")
                break


asyncio.run(test())
