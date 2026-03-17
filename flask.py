from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import pickle

app = Flask(__name__)

model = pickle.load(open('model.pkl', 'rb'))

data = pd.read_csv('traffic_data.csv')  

@app.route('/')
def welcome():
    """Welcome Page"""
    return render_template('welcome.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard Page"""
    summary = data.groupby('Location').agg({
        'Speed': 'mean',
        'Bus_Movement': 'sum',
        'Congestion': 'mean',
        'Avg_Speed': 'mean'
    }).reset_index()

    locations = summary['Location'].tolist()
    speed_freq = summary['Speed'].tolist()
    bus_move = summary['Bus_Movement'].tolist()
    congestion = summary['Congestion'].tolist()
    avg_speed = summary['Avg_Speed'].tolist()

    return render_template(
        'index.html',
        locations=locations,
        speed_freq=speed_freq,
        bus_move=bus_move,
        congestion=congestion,
        avg_speed=avg_speed
    )

@app.route('/predict', methods=['POST'])
def predict():
    """Predict traffic based on input features"""
    try:
        features = [
            int(request.form['day']),
            int(request.form['month']),
            int(request.form['year']),
            int(request.form['hour']),
            int(request.form['minute']),
            float(request.form['temperature']),
            float(request.form['humidity']),
            float(request.form['visibility']),
            float(request.form['windspeed'])
        ]
        prediction = model.predict([features])[0]
        return render_template('result.html', prediction_text=f"Predicted Traffic Volume: {round(prediction, 2)} vehicles/hour")
    except Exception as e:
        return render_template('result.html', prediction_text=f"Error: {str(e)}")

if __name__ == "__main__":
    app.run(debug=True)
