import asyncio
import sys

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager
    import httpx
    import json

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    messages = [
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': 'Say hello in one word'}
    ]

    # 直接用 httpx 调用 API
    headers = {'Authorization': f'Bearer {prov.config.api_key}', 'Content-Type': 'application/json'}
    payload = {'model': 'deepseek-chat', 'messages': messages, 'stream': True}

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', 'https://api.deepseek.com/v1/chat/completions', json=payload, headers=headers) as resp:
            print('Status:', resp.status_code)

            lines_count = 0
            chunks_found = 0

            async for line in resp.aiter_lines():
                lines_count += 1
                if not line.strip():
                    continue

                # 测试 parse_stream_chunk
                result = prov._builder.parse_stream_chunk(line)
                if result is not None:
                    chunks_found += 1
                    print(f'Line {lines_count}: parsed = {repr(result)[:50]}')
                else:
                    if lines_count <= 5:
                        print(f'Line {lines_count}: returns None, line = {repr(line)[:80]}')

            print(f'Total lines: {lines_count}, chunks found: {chunks_found}')

asyncio.run(test())
