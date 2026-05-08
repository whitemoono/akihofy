import asyncio
import sys

async def test():
    sys.path.insert(0, '/app')
    from engine.llm import get_llm_manager

    mgr = get_llm_manager()
    prov = mgr.get_provider()

    print('Provider type:', type(prov).__name__)
    print('Builder type:', type(prov._builder).__name__)
    print('Config:', prov.config)

    # 测试 builder
    test_line = 'data: {"choices":[{"delta":{"content":"hello"}}]}'
    result = prov._builder.parse_stream_chunk(test_line)
    print('Builder test:', repr(result))

asyncio.run(test())
