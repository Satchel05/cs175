import json
import re
from datetime import datetime

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

MODEL_NAME = "elliottescalante/tuned-flan-t5"
TEST_FILE = "test_set.jsonl"  # change if needed

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
model.eval()

TIME_PATTERNS = [
    r'\b\d{1,2}:\d{2}\s*(?:am|pm)?\b',
    r'\b\d{1,2}\s*(?:am|pm)\b',
    r'\b(?:noon|midnight|morning|afternoon|evening)\b',
]

DURATION_PATTERN = r'\b\d+\s*(?:min|minute|minutes|hour|hours|hr|hrs)\b|\bhalf\s+an?\s+hour\b|\ban?\s+hour\b|\btwo\s+hours\b|\bthree\s+hours\b|\bfour\s+hours\b'

LOCATION_PATTERN = r'\b(?:at|@|in)\s+\w'


def predict(text):
    year = datetime.now().year

    prompt = (
        f"Convert to calendar event JSON. "
        f"If a field is not mentioned in the input, output null for that field. "
        f"Current year is {year}. Input: {text}"
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    outputs = model.generate(
        **inputs,
        max_new_tokens=128,
        num_beams=1
    )

    decoded = tokenizer.decode(
        outputs[0],
        skip_special_tokens=True
    )

    try:
        pred = json.loads("{" + decoded + "}")
    except json.JSONDecodeError:
        raise ValueError(f"Invalid model output: {decoded}")

    input_lower = text.lower()

    if not any(re.search(p, input_lower) for p in TIME_PATTERNS):
        pred["time"] = None

    if not re.search(DURATION_PATTERN, input_lower, re.IGNORECASE):
        pred["duration_minutes"] = None

    if not re.search(LOCATION_PATTERN, input_lower, re.IGNORECASE):
        pred["location"] = None

    return pred


FIELDS = [
    "title",
    "date",
    "time",
    "duration_minutes",
    "location",
    "recurrence",
]


total_examples = 0
exact_match = 0

field_correct = {f: 0 for f in FIELDS}

for idx, line in enumerate(open(TEST_FILE, encoding="utf-8"), start=1):
    if idx % 10 == 0:
        print(f"Processed {idx} examples...")
    line = line.strip()

    if not line:
        continue

    try:
        item = json.loads(line)
    except json.JSONDecodeError:
        print(f"Skipping invalid JSON on line {idx}")
        continue

    text = item["input"]
    gold = item["output"]

    try:
        pred = predict(text)

        total_examples += 1

        all_correct = True

        for field in FIELDS:
            if pred.get(field) == gold.get(field):
                field_correct[field] += 1
            else:
                all_correct = False

        if all_correct:
            exact_match += 1

    except Exception as e:
        print("ERROR:", text)
        print(e)


print("\n===== RESULTS =====")
print(f"Examples: {total_examples}")

if total_examples > 0:
    print(f"Exact Match Accuracy: {exact_match/total_examples:.4f}")

    print("\nField Accuracy:")
    for field in FIELDS:
        acc = field_correct[field] / total_examples
        print(f"{field:20s} {acc:.4f}")
else:
    print("No successful predictions.")

with open("evaluation_results.txt", "w") as f:
    f.write(f"Examples: {total_examples}\n")

    if total_examples > 0:
        f.write(f"Exact Match Accuracy: {exact_match/total_examples:.4f}\n\n")

        for field in FIELDS:
            acc = field_correct[field] / total_examples
            f.write(f"{field}: {acc:.4f}\n")