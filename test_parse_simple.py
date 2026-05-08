import json

# 直接复制解析逻辑
def parse_stream_chunk(line):
    if not line.startswith("data: "):
        return None
    data_str = line[6:]
    if data_str == "[DONE]":
        return None
    try:
        data = json.loads(data_str)
        if "choices" in data and len(data["choices"]) > 0:
            delta = data["choices"][0].get("delta", {})
            if "content" in delta:
                return delta["content"]
    except json.JSONDecodeError:
        pass
    return None

# 测试
line = 'data: {"choices":[{"delta":{"content":"hello"}}]}'
print('Input:', repr(line))
result = parse_stream_chunk(line)
print('Result:', repr(result))

# 模拟 DeepSeek 返回的真实格式
line2 = 'data: {"id":"xxx","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}'
print('Input2:', repr(line2))
result2 = parse_stream_chunk(line2)
print('Result2:', repr(result2))
