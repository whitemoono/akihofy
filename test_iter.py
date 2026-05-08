import asyncio
import sys
import httpx

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    messages = [{'role': 'user', 'content': 'hello'}]
    headers = prov._builder.build_headers(prov.config)
    payload = prov._builder.build_payload(prov.config, messages, stream=True, max_tokens=10)

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', f'{prov.config.base_url}{prov._chat_endpoint}', json=payload, headers=headers) as response:
            print('Testing aiter_text():')
            async for text in response.aiter_text():
                print(f'Got text chunk: {repr(text)[:100]}')
                break

            print()
            print('Testing aiter_lines() with delimiter:')
            async for line in response.aiter_lines():
                print(f'Line: {repr(line)[:100]}')
                break

asyncio.run(test())
