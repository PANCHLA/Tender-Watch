import asyncio
import json
import httpx

async def test_search():
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer TEST_TOKEN" # We know auth is active, but we can see the exact error 
    }
    
    payload = {
        "keywords": "test",
        "portals": ["gem"]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", "http://localhost:8000/search", json=payload, headers=headers) as r:
                print(f"Status: {r.status_code}")
                async for line in r.aiter_lines():
                    print(line)
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test_search())
