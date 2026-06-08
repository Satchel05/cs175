from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import json, re

app = Flask(__name__)

tokenizer = AutoTokenizer.from_pretrained("elliottescalante/tuned-flan-t5")
model = AutoModelForSeq2SeqLM.from_pretrained("elliottescalante/tuned-flan-t5")
model.eval()

DURATION_PATTERN = r'\b\d+\s*(?:min|minute|minutes|hour|hours|hr|hrs)\b|\bhalf\s+an?\s+hour\b|\ban?\s+hour\b|\btwo\s+hours\b|\bthree\s+hours\b|\bfour\s+hours\b'
# Matches "at/in/@ <word>" but NOT when followed by a digit or a known time word
LOCATION_PATTERN = r'\b(?:at|@|in)\s+(?!\d|noon|midnight|morning|afternoon|evening)([A-Za-z])'

def extract_json(decoded: str) -> dict:
    """Try multiple strategies to get a dict from raw model output."""
    # Strategy 1: valid JSON as-is
    try:
        return json.loads(decoded)
    except json.JSONDecodeError:
        pass

    # Strategy 2: wrap with braces (model outputs bare key:val pairs)
    try:
        return json.loads("{" + decoded + "}")
    except json.JSONDecodeError:
        pass

    # Strategy 3: pull out the first {...} block
    m = re.search(r'\{[^{}]*\}', decoded, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass

    # Strategy 4: regex over quoted key:value pairs
    result = {}
    for key, val in re.findall(r'"(\w+)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|null|true|false)', decoded):
        try:
            result[key] = json.loads(val)
        except Exception:
            pass
    if result:
        return result

    # Strategy 5: unquoted key: value lines (last resort)
    for key, val in re.findall(r'\b(\w+)\s*:\s*([^\n,{}]+)', decoded):
        val = val.strip().strip('"\'')
        if val.lower() == 'null':
            result[key] = None
        elif re.fullmatch(r'-?\d+', val):
            result[key] = int(val)
        else:
            result[key] = val
    return result  # may be empty dict; route.ts fills date/time from user text

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        prompt = f"""
        Convert the following calendar request into JSON.

        Fields:
        - title
        - date
        - time
        - duration_minutes
        - location
        - recurrence

        Use null for missing fields.

        Input: {text}

        Output:
        """

        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(**inputs, max_new_tokens=256, num_beams=4)
        decoded = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

        # Strip markdown code fences if present
        decoded = re.sub(r'^```(?:json)?\s*|\s*```$', '', decoded, flags=re.MULTILINE).strip()
        print("DECODED:", decoded)
        result = extract_json(decoded)

        # Extract the user's original input from after "Input:" if the full prompt was sent
        input_match = re.search(r'\bInput:\s*(.+)$', text, re.IGNORECASE | re.DOTALL)
        input_text = input_match.group(1).strip() if input_match else text
        input_lower = input_text.lower()

        if not re.search(DURATION_PATTERN, input_lower, re.IGNORECASE):
            result["duration_minutes"] = None
        if not re.search(LOCATION_PATTERN, input_lower, re.IGNORECASE):
            result["location"] = None

        return jsonify({"output": result})
    except Exception as e:
        return jsonify({"error": f"Model inference failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(port=8000)
