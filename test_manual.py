import asyncio
import sys
import httpx

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager
    import json

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    messages = [
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': 'Say hello'}
    ]

    # 手动实现 chat_stream 逻辑
    headers = prov._builder.build_headers(prov.config)
    payload = prov._builder.build_payload(prov.config, messages, stream=True, max_tokens=20)

    print('Headers:', headers)
    print('Payload:', payload)

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', f'{prov.config.base_url}{prov._chat_endpoint}', json=payload, headers=headers) as response:
            print('Response status:', response.status_code)

            count = 0
            async for line in response.aiter_lines():
                count += 1
                if not line.strip():
                    continue

                # 直接调用 parse_stream_chunk
                result = prov._builder.parse_stream_chunk(line)
                print(f'Line {count}: parse result = {repr(result)[:30]}, original = {repr(line)[:50]}')

                # 测试 'if chunk:' 判断
                if result:
                    print(f'  -> Would yield: {repr(result)}')
                else:
                    print(f'  -> Would be skipped (None or empty)')

            print(f'Total lines: {count}')

asyncio.run(test())
