import asyncio
import httpx
import json

async def test():
    headers = {'Authorization': 'Bearer sk-8f11375580f545e7bc1117416c16417e', 'Content-Type': 'application/json'}
    payload = {
        'model': 'deepseek-chat',
        'messages': [{'role': 'user', 'content': 'hello'}],
        'stream': True
    }

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', 'https://api.deepseek.com/v1/chat/completions', json=payload, headers=headers) as resp:
            print('Status:', resp.status_code)
            print('Content-Type:', resp.headers.get('content-type'))

            chunks = []
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue

                # 使用 OpenAICompatibleBuilder 的解析逻辑
                if line.startswith('data: '):
                    data_str = line[6:]
                    if data_str != '[DONE]':
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                delta = data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    chunk = delta['content']
                                    chunks.append(chunk)
                                    print('Chunk:', repr(chunk))
                        except json.JSONDecodeError as e:
                            print('JSON error:', e)

            print('Total chunks:', len(chunks))
            print('Full text:', ''.join(chunks))

asyncio.run(test())
