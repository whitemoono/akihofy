import asyncio
import sys

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    messages = [
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': 'Say hello'}
    ]

    chunks = []
    count = 0
    async for chunk in prov.chat_stream(messages, model='deepseek-chat', max_tokens=20):
        count += 1
        chunks.append(chunk)
        print(f'Got chunk {count}: {repr(chunk)}')

    print(f'Total: {len(chunks)}, result: {repr("".join(chunks))}')

asyncio.run(test())
