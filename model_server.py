from transformers import T5ForConditionalGeneration, T5Tokenizer
from flask import Flask, request, jsonify

app = Flask(__name__)

print("Loading model...")
model_name = "fatimaw/flan-t5-calendar-parser-team10"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)
print("Model ready!")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    inputs = data.get("inputs", "")
    
    input_ids = tokenizer(inputs, return_tensors="pt").input_ids
    outputs = model.generate(
        input_ids, 
        max_new_tokens=256,
        num_beams=4,          # beam search for better output
        repetition_penalty=2.5,  # penalize repetition
        early_stopping=True
    )
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return jsonify([{"generated_text": generated_text}])

if __name__ == "__main__":
    app.run(port=8000)