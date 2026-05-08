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

    # 直接获取生成器
    gen = prov.chat_stream(messages, model='deepseek-chat', max_tokens=20)

    print('Generator type:', type(gen))

    # 转换为列表
    try:
        chunks = []
        async for chunk in gen:
            chunks.append(chunk)
            print('chunk:', repr(chunk))

        print(f'Total: {len(chunks)}')
        print('Result:', repr(''.join(chunks)))
    except Exception as e:
        print('Error:', type(e).__name__, e)
        import traceback
        traceback.print_exc()

asyncio.run(test())
