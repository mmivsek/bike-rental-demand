# Bike Rental ML App — Architecture

## Mermaid Source

```mermaid
flowchart LR
    subgraph Offline["Offline - done once on your machine"]
        CSV[("Bike Rental Dataset CSV")] --> CLEAN["Clean + EDA\nhandle missing values, outliers, scaling"]
        CLEAN --> FE["Feature Engineering\ntime features, ratios, binning"]
        FE --> TRAIN_C["Train Classifier\nXGBoost - High or low demand?"]
        FE --> TRAIN_R["Train Regressor\nXGBoost - How many rentals?"]
        TRAIN_C --> MODEL_C["classifier.pkl"]
        TRAIN_R --> MODEL_R["regressor.pkl"]
    end

    subgraph Runtime["Runtime - the live app"]
        WEATHER["Weather API\nOpenWeatherMap\nlive temp, humidity, wind"] -->|live weather data| BACKEND
        MODEL_C -->|loaded at startup| BACKEND["Backend\nStreamlit app\nloads models + fetches weather"]
        MODEL_R -->|loaded at startup| BACKEND
        USER(["User"]) --> FRONTEND["Frontend\nStreamlit UI"]
        FRONTEND -->|date, time, season, holiday| BACKEND
        BACKEND -->|High or Low demand prediction| FRONTEND
        BACKEND -->|predicted rental count| FRONTEND
    end
```

## Written Explanation

The models are trained **offline, once**, on the local machine using the bike rental CSV dataset.
After cleaning, EDA, and feature engineering, two XGBoost models are fitted — a classifier
(high vs. low demand) and a regressor (predicted rental count) — and saved as `classifier.pkl`
and `regressor.pkl`.

At **runtime**, the Streamlit app loads both model files once on startup (no retraining ever
happens live). When the user submits inputs (date, time, season, holiday flag), the backend
simultaneously fetches live weather data from the OpenWeatherMap API (temperature, humidity,
wind speed) and combines it with the user inputs to form the full feature vector.
The backend then calls `model.predict()` on both models and returns the classification result
and the regression estimate to the frontend — the weather API is the only live external call.
