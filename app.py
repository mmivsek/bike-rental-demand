import json
import pickle
import urllib.request
from datetime import date, datetime, timezone, timedelta

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

st.set_page_config(
    page_title="D.C. Bike Rental Demand",
    page_icon="🚲",
    layout="wide",
)

# ── Washington D.C. constants ──────────────────────────────────────────────────

DC_LAT = 38.9072
DC_LON = -77.0369

# WMO weather code → UCI weathersit (1=clear, 2=cloudy/mist, 3=rain/snow)
def _wmo_to_weathersit(code: int) -> int:
    if code in {0, 1, 2}:
        return 1
    if code in {3, 45, 48, 51, 53, 61, 80}:
        return 2
    return 3  # heavy rain, snow, thunderstorm, etc.

def _month_to_season(month: int) -> int:
    return {12: 4, 1: 4, 2: 4, 3: 1, 4: 1, 5: 1,
            6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3}[month]

_SEASON_NAMES = {1: "🌸 Spring", 2: "☀️ Summer", 3: "🍂 Autumn", 4: "❄️ Winter"}

_WEATHER_NAMES = {
    1: "☀️ Clear / few clouds",
    2: "🌥️ Mist / cloudy",
    3: "🌧️ Light rain or snow",
}

# ── Model loading ──────────────────────────────────────────────────────────────

@st.cache_resource
def load_models():
    with open("models/classifier.pkl", "rb") as f:
        clf = pickle.load(f)
    with open("models/regressor.pkl", "rb") as f:
        reg = pickle.load(f)
    with open("models/metadata.json") as f:
        meta = json.load(f)
    return clf, reg, meta


# ── Feature engineering ────────────────────────────────────────────────────────

def build_feature_row(selected_date, hr, weathersit, temp_c, hum_pct, wind_kmh, feature_names):
    season = _month_to_season(selected_date.month)
    holiday = False  # could extend with holiday calendar later
    yr = min(1, selected_date.year - 2011)
    mnth = selected_date.month
    weekday = selected_date.weekday()          # Monday=0, Sunday=6
    workingday = int(not holiday and weekday < 5)

    # UCI 0-1 normalization
    temp = temp_c / 41.0
    hum = hum_pct / 100.0
    windspeed = (wind_kmh / 1.609) / 67.0     # km/h → mph → normalized

    # Cyclical encodings
    hr_sin = np.sin(2 * np.pi * hr / 24)
    hr_cos = np.cos(2 * np.pi * hr / 24)
    mnth_sin = np.sin(2 * np.pi * mnth / 12)
    mnth_cos = np.cos(2 * np.pi * mnth / 12)
    weekday_sin = np.sin(2 * np.pi * weekday / 7)
    weekday_cos = np.cos(2 * np.pi * weekday / 7)

    # Boolean flags
    rush_hour = int(hr in {7, 8, 17, 18})
    is_night = int(hr < 6 or hr > 22)
    is_weekend = int(weekday >= 5)
    peak_season = int(season in {2, 3})
    bad_weather = int(weathersit == 3)

    # Interaction terms
    rush_workday = rush_hour * workingday
    temp_workday = temp * workingday
    comfort = temp * (1 - hum) * (1 - windspeed)

    row = {
        "bad_weather": bad_weather, "comfort": comfort, "holiday": int(holiday),
        "hr": hr, "hr_cos": hr_cos, "hr_sin": hr_sin, "hum": hum,
        "is_night": is_night, "is_weekend": is_weekend, "mnth": mnth,
        "mnth_cos": mnth_cos, "mnth_sin": mnth_sin, "peak_season": peak_season,
        "rush_hour": rush_hour, "rush_workday": rush_workday, "season": season,
        "temp": temp, "temp_workday": temp_workday, "weathersit": weathersit,
        "weekday": weekday, "weekday_cos": weekday_cos, "windspeed": windspeed, "yr": yr,
    }
    return pd.DataFrame([row])[feature_names]


# ── Live weather from Open-Meteo ───────────────────────────────────────────────

@st.cache_data(ttl=1800, show_spinner=False)
def fetch_dc_weather():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={DC_LAT}&longitude={DC_LON}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
        "&wind_speed_unit=kmh"
        "&timezone=America%2FNew_York"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BikeRentalApp/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.load(resp)
        current = data["current"]
        dc_time_str = current["time"]          # "2026-06-29T05:30"
        dc_time = datetime.fromisoformat(dc_time_str)
        return {
            "temp_c":     round(current["temperature_2m"]),
            "hum_pct":    int(current["relative_humidity_2m"]),
            "wind_kmh":   round(current["wind_speed_10m"]),
            "weathersit": _wmo_to_weathersit(current["weather_code"]),
            "dc_hour":    dc_time.hour,
            "dc_date":    dc_time.date(),
            "fetched_at": dc_time_str,
        }
    except Exception as exc:
        return {"error": str(exc)}


# ── Session state defaults ─────────────────────────────────────────────────────

def _init_state():
    defaults = {
        "temp_c": 20, "hum_pct": 60, "wind_kmh": 15,
        "weathersit": 1, "weather_source": "manual",
        "fetched_at": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init_state()


# ── Static data ────────────────────────────────────────────────────────────────

@st.cache_data
def load_chart_data():
    return pd.read_csv("dataset/hour_engineered.csv")


CLF_LEADERBOARD = pd.DataFrame([
    {"Model": "Dummy (majority)",     "Test Acc": 0.491, "Precision": 0.491, "Recall": 1.000, "F1": 0.659, "ROC-AUC": 0.500},
    {"Model": "Logistic Regression",  "Test Acc": 0.903, "Precision": 0.896, "Recall": 0.907, "F1": 0.901, "ROC-AUC": 0.968},
    {"Model": "Decision Tree (d=11)", "Test Acc": 0.915, "Precision": 0.906, "Recall": 0.923, "F1": 0.915, "ROC-AUC": 0.938},
    {"Model": "XGBoost (tuned)",      "Test Acc": 0.951, "Precision": 0.949, "Recall": 0.952, "F1": 0.950, "ROC-AUC": 0.989},
])

REG_LEADERBOARD = pd.DataFrame([
    {"Model": "Dummy (mean)",         "Test R²": -0.001, "Test MAE": 140.5, "Test RMSE": 178.0},
    {"Model": "Ridge Regression",     "Test R²":  0.731, "Test MAE":  68.7, "Test RMSE":  92.3},
    {"Model": "Decision Tree (d=12)", "Test R²":  0.887, "Test MAE":  34.7, "Test RMSE":  59.9},
    {"Model": "XGBoost (tuned)",      "Test R²":  0.955, "Test MAE":  22.8, "Test RMSE":  37.8},
])


# ── Load models ────────────────────────────────────────────────────────────────

clf, reg, meta = load_models()
FEATS = meta["feature_names"]


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════════

st.title("🚲 Washington D.C. Bike Rental Demand")
st.caption(
    "Capital Bikeshare demand predictor · "
    "XGBoost model trained on 2011–2012 hourly data · "
    "Test accuracy 95.1% · Test R² 0.955"
)

tab1, tab2, tab3, tab4 = st.tabs(["🔮 Predictor", "📊 Model Leaderboard", "📈 Demand Patterns", "ℹ️ About"])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 · PREDICTOR
# ═══════════════════════════════════════════════════════════════════════════════

with tab1:

    # ── Live weather button ────────────────────────────────────────────────────
    btn_col, status_col = st.columns([1, 3])
    with btn_col:
        fetch_clicked = st.button("🌤️ Get real-time D.C. weather", use_container_width=True)

    if fetch_clicked:
        with st.spinner("Fetching current conditions from Open-Meteo…"):
            weather = fetch_dc_weather()
        if "error" in weather:
            st.error(f"Could not reach Open-Meteo: {weather['error']}")
        else:
            st.session_state["temp_c"]        = weather["temp_c"]
            st.session_state["hum_pct"]       = weather["hum_pct"]
            st.session_state["wind_kmh"]      = weather["wind_kmh"]
            st.session_state["weathersit"]    = weather["weathersit"]
            st.session_state["weather_source"] = "live"
            st.session_state["fetched_at"]    = weather["fetched_at"]
            st.session_state["dc_hour"]       = weather["dc_hour"]
            st.session_state["dc_date"]       = weather["dc_date"]
            st.rerun()

    with status_col:
        if st.session_state["weather_source"] == "live" and st.session_state["fetched_at"]:
            st.success(
                f"✅ Live D.C. weather loaded · as of {st.session_state['fetched_at']} EST "
                f"· refreshes every 30 min · source: [Open-Meteo](https://open-meteo.com/)"
            )
        else:
            st.info("👆 Click to load current Washington D.C. conditions automatically")

    st.divider()

    col_in, col_out = st.columns([1, 1], gap="large")

    with col_in:
        st.subheader("Conditions")

        # Date/hour — default to D.C. time when weather was fetched
        default_date = st.session_state.get("dc_date", date.today())
        default_hour = st.session_state.get("dc_hour", datetime.now().hour)

        selected_date = st.date_input("Date", value=default_date)
        hr = st.slider("Hour of day (D.C. time)", 0, 23, default_hour, format="%d:00")

        # Season auto-derived — just display it
        season = _month_to_season(selected_date.month)
        st.markdown(f"**Season:** {_SEASON_NAMES[season]} _(auto-detected from month)_")

        st.markdown("---")
        st.markdown("**Weather**")

        weathersit_options = [1, 2, 3]
        weathersit_idx = weathersit_options.index(
            max(1, min(3, st.session_state["weathersit"]))
        )
        weathersit = st.selectbox(
            "Conditions",
            options=weathersit_options,
            index=weathersit_idx,
            format_func=lambda w: _WEATHER_NAMES[w],
            label_visibility="collapsed",
        )

        temp_c   = st.slider("Temperature (°C)", -5, 40,
                              int(np.clip(st.session_state["temp_c"], -5, 40)))
        hum_pct  = st.slider("Humidity (%)", 0, 100,
                              int(np.clip(st.session_state["hum_pct"], 0, 100)))
        wind_kmh = st.slider("Wind speed (km/h)", 0, 80,
                              int(np.clip(st.session_state["wind_kmh"], 0, 80)))

        if st.session_state["weather_source"] == "live":
            st.caption("_Weather pre-filled from Open-Meteo live data. Adjust sliders to explore scenarios._")

    with col_out:
        st.subheader("Prediction")

        X_input = build_feature_row(
            selected_date, hr, weathersit, temp_c, hum_pct, wind_kmh, FEATS
        )

        demand_class = clf.predict(X_input)[0]
        demand_prob  = clf.predict_proba(X_input)[0][1]
        rental_count = max(0, int(reg.predict(X_input)[0]))

        if demand_class == 1:
            st.markdown(
                '<div style="background:#d4edda;border-radius:8px;padding:18px 22px;margin-bottom:14px">'
                '<span style="font-size:2rem;font-weight:600">⬆ HIGH demand</span><br>'
                f'<span style="color:#4a7c5e;font-size:1.05rem">Confidence: {demand_prob:.0%}</span>'
                "</div>",
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<div style="background:#fff3cd;border-radius:8px;padding:18px 22px;margin-bottom:14px">'
                '<span style="font-size:2rem;font-weight:600">⬇ LOW demand</span><br>'
                f'<span style="color:#856404;font-size:1.05rem">Confidence: {1 - demand_prob:.0%}</span>'
                "</div>",
                unsafe_allow_html=True,
            )

        st.metric(
            label="Estimated rentals / hour",
            value=f"{rental_count:,}",
            delta=f"±{meta['regressor']['test_mae']:.0f} typical error (test MAE)",
            delta_color="off",
        )

        st.progress(float(demand_prob), text=f"High-demand probability: {demand_prob:.0%}")

        # Context summary
        weekday_name = selected_date.strftime("%A")
        rush = hr in {7, 8, 17, 18}
        workday = selected_date.weekday() < 5

        st.markdown(f"""
| | |
|---|---|
| **Date** | {selected_date.strftime('%B %d, %Y')} ({weekday_name}) |
| **Hour** | {hr:02d}:00 {'🚌 Rush hour' if rush else '🕐 Off-peak'} |
| **Day type** | {'💼 Working day' if workday else '🏖️ Weekend'} |
| **Season** | {_SEASON_NAMES[season]} |
| **Weather** | {_WEATHER_NAMES[weathersit]} · {temp_c}°C · {hum_pct}% humidity · {wind_kmh} km/h wind |
""")

        st.caption(
            "_Model trained on 2011–2012 Washington D.C. Capital Bikeshare data. "
            "Predictions reflect historical patterns; they cannot account for special events, "
            "system growth since 2012, or station-level variation._"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 · LEADERBOARD
# ═══════════════════════════════════════════════════════════════════════════════

with tab2:
    st.subheader("Classification — is this hour high or low demand?")
    st.caption(
        "Threshold: 142 rentals/hour (training-set median). "
        "Evaluated once on the held-out test set (2,607 hours, never seen during training or tuning)."
    )
    st.dataframe(
        CLF_LEADERBOARD.style.highlight_max(
            subset=["Test Acc", "F1", "ROC-AUC"], color="#d4edda"
        ),
        hide_index=True,
        use_container_width=True,
    )
    st.caption(
        "**XGBoost** reaches 95.1% accuracy and AUC 0.989 — near-perfect demand ranking. "
        "The Dummy baseline always predicts HIGH; its real floor is 49.1% accuracy."
    )

    st.divider()

    st.subheader("Regression — how many bikes will be rented this hour?")
    st.caption("Same held-out test set. Average demand ≈ 190 rentals/hour.")
    st.dataframe(
        REG_LEADERBOARD.style.highlight_max(
            subset=["Test R²"], color="#d4edda"
        ).highlight_min(
            subset=["Test MAE", "Test RMSE"], color="#d4edda"
        ),
        hide_index=True,
        use_container_width=True,
    )
    st.caption(
        "**XGBoost** explains 95.5% of hourly demand variance with a typical error of 22.8 rentals — "
        "roughly 12% of average demand. Useful for fleet planning at the system level."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 · DEMAND PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

with tab3:
    st.markdown(
        "Historical patterns from **17,379 hours** of Washington D.C. Capital Bikeshare data (2011–2012). "
        "These charts show what the model learned."
    )
    df_c = load_chart_data()

    # ── Figure 1: demand by hour ───────────────────────────────────────────────
    fig1, ax1 = plt.subplots(figsize=(10, 4))
    for wd, label, color in [
        (1, "Working day", "#4C72B0"),
        (0, "Weekend / holiday", "#DD8452"),
    ]:
        sub = df_c[df_c["workingday"] == wd].groupby("hr")["cnt"].mean()
        ax1.plot(sub.index, sub.values, marker="o", markersize=4,
                 linewidth=1.8, label=label, color=color)
    ax1.set_xlabel("Hour of day (D.C. local time)")
    ax1.set_ylabel("Avg rentals / hour")
    ax1.set_title("Demand by hour of day — Capital Bikeshare D.C.")
    ax1.set_xticks(range(0, 24))
    ax1.legend()
    ax1.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    st.pyplot(fig1)
    plt.close(fig1)
    st.caption(
        "Commuter double-peak at 8am and 5–6pm on working days. "
        "Weekends show a gentler leisure peak around midday. "
        "This `rush_workday` pattern is the single strongest predictor in XGBoost."
    )

    st.divider()

    # ── Figure 2: seasonal box plot ────────────────────────────────────────────
    fig2, ax2 = plt.subplots(figsize=(8, 4))
    season_data = [df_c[df_c["season"] == s]["cnt"].values for s in [1, 2, 3, 4]]
    bp = ax2.boxplot(
        season_data, tick_labels=["Spring", "Summer", "Autumn", "Winter"],
        patch_artist=True, medianprops=dict(color="#333", linewidth=2),
    )
    for patch, c in zip(bp["boxes"], ["#AEC6E8", "#4C72B0", "#DD8452", "#C5D9F0"]):
        patch.set_facecolor(c)
    ax2.set_ylabel("Rentals / hour")
    ax2.set_title("Demand by season — Washington D.C.")
    ax2.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    st.pyplot(fig2)
    plt.close(fig2)
    st.caption("Summer and Autumn see roughly double the median demand of Winter.")

    st.divider()

    # ── Figure 3: weather impact ───────────────────────────────────────────────
    fig3, ax3 = plt.subplots(figsize=(6, 4))
    weather_means = df_c.groupby("weathersit")["cnt"].mean().reindex([1, 2, 3])
    bars = ax3.bar(
        ["Clear", "Mist /\ncloudy", "Light rain\n/ snow"],
        weather_means.values,
        color=["#4C72B0", "#AEC6E8", "#DD8452"],
        width=0.55,
    )
    for bar, val in zip(bars, weather_means.values):
        ax3.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 2,
                 f"{val:.0f}", ha="center", va="bottom", fontsize=10)
    ax3.set_ylabel("Avg rentals / hour")
    ax3.set_title("Weather impact on D.C. bike demand")
    ax3.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    st.pyplot(fig3)
    plt.close(fig3)
    st.caption("Clear weather drives ~60% more rentals than light rain or snow.")


# =============================================================================
# TAB 4 . ABOUT
# =============================================================================

with tab4:

    st.markdown("## Capital Bikeshare, Washington D.C.")
    st.caption(
        "The dataset captures the entire Capital Bikeshare system aggregated hourly. "
        "Launched September 2010, it was one of the first large-scale bike-share systems in the U.S."
    )

    # ---- Key system metrics --------------------------------------------------
    st.markdown("### System at a glance")
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Launch date",      "Sep 20, 2010")
    c2.metric("Stations (2011)",  "114")
    c3.metric("Bikes (2011)",     "1,100")
    c4.metric("Stations (2012)",  "199")
    c5.metric("Bikes (2012)",     "1,670")

    st.divider()

    # ---- Photos --------------------------------------------------------------
    st.markdown("### The bikes & stations")
    ph1, ph2 = st.columns(2)
    with ph1:
        st.image("assets/bike.jpg",
                 caption="Capital Bikeshare bike  |  Wikimedia Commons (CC BY-SA)",
                 use_container_width=True)
    with ph2:
        st.image("assets/monument_station.jpg",
                 caption="Station near the Washington Monument  |  Wikimedia Commons (CC BY-SA)",
                 use_container_width=True)

    st.image("assets/station.jpg",
             caption="Docking station at Eastern Market Metro  |  Wikimedia Commons (CC BY-SA)",
             use_container_width=True)

    st.divider()

    # ---- Dataset summary -----------------------------------------------------
    st.markdown("### Dataset")
    info_col, fact_col = st.columns(2)

    with info_col:
        st.markdown("**Source & structure**")
        st.dataframe(
            pd.DataFrame({
                "Field":  ["Source", "Period", "Granularity", "Total rows",
                           "Original columns", "Engineered columns",
                           "Classification target", "Regression target"],
                "Value":  ["UCI ML Repository", "Jan 2011 - Dec 2012",
                           "Hourly (system-wide)", "17,379",
                           "17", "27",
                           "demand_high (cnt > 142)", "cnt (rentals / hour)"],
            }),
            hide_index=True,
            use_container_width=True,
        )

    with fact_col:
        st.markdown("**Demand statistics**")
        st.dataframe(
            pd.DataFrame({
                "Metric":  ["Min rentals / hour", "Median (threshold)",
                            "Mean", "Max", "Year-over-year growth",
                            "Busiest hour", "Quietest hour"],
                "Value":   ["1", "142  (used as HIGH/LOW split)",
                            "~190", "977",
                            "+60% from 2011 to 2012",
                            "17:00 - 18:00 on weekdays",
                            "04:00 - 05:00"],
            }),
            hide_index=True,
            use_container_width=True,
        )

    st.divider()

    # ---- Station map ---------------------------------------------------------
    st.markdown("### Station locations (2011-2012 era)")
    st.caption(
        "Approximate locations of ~110 Capital Bikeshare stations active in 2011-2012, "
        "covering Washington D.C. and parts of Arlington, VA. "
        "The dataset does not include per-station breakdowns -- all data is system-wide hourly totals."
    )

    # Representative Capital Bikeshare station coordinates (2011-2012 era)
    _stations = [
        # National Mall
        (38.8895, -77.0495), (38.8888, -77.0450), (38.8876, -77.0178),
        (38.8867, -77.0399), (38.8921, -77.0193), (38.8905, -77.0320),
        # Downtown / Penn Quarter
        (38.8997, -77.0203), (38.9024, -77.0290), (38.9004, -77.0397),
        (38.9001, -77.0310), (38.9015, -77.0385), (38.8970, -77.0320),
        (38.8965, -77.0261), (38.8960, -77.0350), (38.9041, -77.0249),
        # Capitol Hill
        (38.8898, -77.0009), (38.8875, -77.0013), (38.8858, -77.0012),
        (38.8946, -77.0059), (38.8946, -77.0132), (38.8832, -77.0160),
        (38.8907, -77.0085), (38.8869, -77.0052),
        # Union Station area
        (38.8975, -77.0066), (38.9001, -77.0131), (38.9010, -77.0090),
        # Georgetown
        (38.9046, -77.0620), (38.9093, -77.0648), (38.9039, -77.0547),
        (38.9069, -77.0587), (38.9055, -77.0565), (38.9025, -77.0600),
        # Dupont Circle
        (38.9097, -77.0434), (38.9142, -77.0453), (38.9127, -77.0483),
        (38.9073, -77.0401), (38.9060, -77.0420),
        # Foggy Bottom
        (38.8992, -77.0497), (38.9008, -77.0546), (38.9037, -77.0479),
        (38.9020, -77.0520),
        # Adams Morgan / U Street
        (38.9166, -77.0319), (38.9197, -77.0356), (38.9218, -77.0258),
        (38.9199, -77.0420), (38.9185, -77.0390),
        # Logan Circle / Shaw
        (38.9093, -77.0297), (38.9112, -77.0249), (38.9069, -77.0258),
        (38.9080, -77.0210),
        # Columbia Heights
        (38.9288, -77.0315), (38.9260, -77.0340), (38.9240, -77.0300),
        # Navy Yard / SE
        (38.8763, -77.0052), (38.8733, -77.0038), (38.8704, -76.9982),
        (38.8795, -77.0010),
        # Woodley Park / Cleveland Park
        (38.9259, -77.0538), (38.9341, -77.0538), (38.9380, -77.0590),
        # Eastern D.C.
        (38.9002, -76.9877), (38.8954, -76.9874), (38.8920, -76.9900),
        # Southwest
        (38.8817, -77.0195), (38.8790, -77.0250), (38.8770, -77.0150),
        # K Street / West End
        (38.9039, -77.0456), (38.9050, -77.0510), (38.9030, -77.0460),
        # Arlington VA
        (38.8914, -77.0805), (38.8966, -77.0852), (38.9000, -77.0884),
        (38.9037, -77.0968), (38.8847, -77.0744), (38.8803, -77.1057),
        (38.8618, -77.0524), (38.8615, -77.0586), (38.8575, -77.0500),
        (38.8640, -77.0610), (38.8660, -77.0680),
        # Friendship Heights / Tenleytown
        (38.9533, -77.0777), (38.9480, -77.0820),
        # Additional D.C.
        (38.9050, -77.0180), (38.9150, -77.0150), (38.8850, -77.0300),
        (38.8930, -77.0430), (38.9120, -77.0350), (38.9190, -77.0190),
    ]

    station_df = pd.DataFrame(_stations, columns=["lat", "lon"])
    st.map(station_df, zoom=11, size=30, color="#C0392B")

    st.caption(
        "**Note:** The training data aggregates ALL stations into a single system-wide count per hour. "
        "The model predicts total system demand, not individual station occupancy."
    )
