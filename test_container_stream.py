import asyncio
import sys

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    messages = [
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': 'Say hello in one word'}
    ]

    chunks = []
    try:
        async for chunk in prov.chat_stream(messages, model='deepseek-chat', max_tokens=20):
            chunks.append(chunk)
            print('chunk:', repr(chunk))
    except Exception as e:
        print('Error:', type(e).__name__, str(e))

    print('Total:', len(chunks))
    print('Result:', repr(''.join(chunks)))

asyncio.run(test())
