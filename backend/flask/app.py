from flask import Flask, jsonify, request
from flask_cors import CORS
from model_carrier import model_p

app = Flask(__name__)
CORS(app)

@app.route('/run-python', methods=['GET'])
def run_python_code():
    input_sample = request.args.getlist('data[]')  # Get array from query param
    input_sample = list(map(int, input_sample))    # Convert to integers
    result = {"message": model_p(input_sample)}
    print(result)
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5001, debug=True)


