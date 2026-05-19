import anthropic
import json

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

SYSTEM_PROMPT = """Generate a synthetic training example for a calendar event parser.
Return ONLY a JSON object with exactly these two keys:
- "input": a natural language string describing a calendar event
- "output": the parsed JSON object with fields: title, date (YYYY-MM-DD or null), time (HH:MM 24h or null), duration_minutes (integer or null), location (string or null), recurrence ("none"|"daily"|"weekly"|"biweekly"|"monthly"|"yearly"|"custom")

No explanation, no markdown, just the raw JSON object."""

def generate_example():
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": "Generate one training example."}]
    )
    text = response.content[0].text.strip()
    return json.loads(text)

def generate_dataset(n=100, output_file="dataset.jsonl"):
    with open(output_file, "w") as f:
        for i in range(n):
            try:
                example = generate_example()
                f.write(json.dumps(example) + "\n")
                print(f"[{i+1}/{n}] Generated: {example['input'][:60]}...")
            except Exception as e:
                print(f"[{i+1}/{n}] Error: {e}")

generate_dataset(n=200)