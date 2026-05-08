from engine.llm import OpenAICompatibleBuilder
import json

b = OpenAICompatibleBuilder()

# 测试
line = 'data: {"choices":[{"delta":{"content":"hello"}}]}'
print("Input line:", repr(line))
print("Starts with 'data: ':", line.startswith("data: "))
print("After removing prefix:", repr(line[6:]))

# 手动解析
data_str = line[6:]
data = json.loads(data_str)
print("Parsed JSON:", data)
print("Has 'choices':", "choices" in data)
print("Delta content:", data["choices"][0].get("delta", {}).get("content"))

# 使用函数
result = b.parse_stream_chunk(line)
print("Function result:", repr(result))
