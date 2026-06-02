from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import json

app = Flask(__name__)

tokenizer = AutoTokenizer.from_pretrained("elliottescalante/tuned-flan-t5")
model = AutoModelForSeq2SeqLM.from_pretrained("elliottescalante/tuned-flan-t5")
model.eval()

import re, json
from datetime import datetime

TIME_PATTERNS = [
    r'\b\d{1,2}:\d{2}\s*(?:am|pm)?\b',
    r'\b\d{1,2}\s*(?:am|pm)\b',
    r'\b(?:noon|midnight|morning|afternoon|evening)\b',
]

DURATION_PATTERN = r'\b\d+\s*(?:min|minute|minutes|hour|hours|hr|hrs)\b|\bhalf\s+an?\s+hour\b|\ban?\s+hour\b|\btwo\s+hours\b|\bthree\s+hours\b|\bfour\s+hours\b'

LOCATION_PATTERN = r'\b(?:at|@|in)\s+\w'

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    year = datetime.now().year
    prompt = f"Convert to calendar event JSON. If a field is not mentioned in the input, output null for that field. Current year is {year}. Input: {text}"

    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=256)
    outputs = model.generate(**inputs, max_new_tokens=256, num_beams=4)
    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)

    result = json.loads("{" + decoded + "}")
    input_lower = text.lower()

    if not any(re.search(p, input_lower) for p in TIME_PATTERNS):
        result["time"] = None
    if not re.search(DURATION_PATTERN, input_lower, re.IGNORECASE):
        result["duration_minutes"] = None
    if not re.search(LOCATION_PATTERN, input_lower, re.IGNORECASE):
        result["location"] = None

    return jsonify({"output": result})


if __name__ == "__main__":
    app.run(port=8000)
