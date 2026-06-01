from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import json

app = Flask(__name__)

tokenizer = AutoTokenizer.from_pretrained("elliottescalante/tuned-flan-t5")
model = AutoModelForSeq2SeqLM.from_pretrained("elliottescalante/tuned-flan-t5")
model.eval()

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    outputs = model.generate(**inputs, max_new_tokens=256)
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return jsonify({"output": result})

if __name__ == "__main__":
    app.run(port=8000)
