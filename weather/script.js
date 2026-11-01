
const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const message = document.getElementById("message");
const content = document.getElementById("weatherContent");
const forecastGrid = document.getElementById("forecastGrid");
const searchBtn = form.querySelector("button");

let requestController;

// Weather code descriptions
function getWeather(code, isDay = true) {
    if (code === 0) {
        return { text: "Clear Sky", icon: isDay ? "☀️" : "🌙" };
    }
    if (code <= 3) {
        return { text: "Partly Cloudy", icon: "⛅" };
    }
    if (code <= 48) {
        return { text: "Foggy", icon: "🌫️" };
    }
    if (code <= 67) {
        return { text: "Rainy", icon: "🌧️" };
    }
    if (code <= 77) {
        return { text: "Snowy", icon: "❄️" };
    }
    if (code <= 82) {
        return { text: "Rain Showers", icon: "🌦️" };
    }
    if (code <= 86) {
        return { text: "Snow Showers", icon: "🌨️" };
    }
    if (code >= 95) {
        return { text: "Thunderstorm", icon: "⛈️" };
    }
    return { text: "Unknown", icon: "🌤️" };
}

// Reusable API request function
async function fetchJSON(url, signal) {
    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error("API request failed: " + response.status);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.reason || "Weather API error");
    }

    return data;
}

// Get city coordinates
async function getCoordinates(city, signal) {
    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +
        "?name=" + encodeURIComponent(city) +
        "&count=1&language=en&format=json";

    const data = await fetchJSON(url, signal);

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please try another name.");
    }

    return data.results[0];
}

// Get weather using coordinates
async function getWeatherData(latitude, longitude, signal) {
    const params = new URLSearchParams({
        latitude,
        longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "is_day"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min"
        ].join(","),
        timezone: "auto",
        forecast_days: "5"
    });

    const url =
        "https://api.open-meteo.com/v1/forecast?" + params;

    return await fetchJSON(url, signal);
}

// Display current weather
function displayWeather(location, data) {
    const current = data.current;
    const weather = getWeather(
        current.weather_code,
        current.is_day === 1
    );

    document.getElementById("cityName").textContent =
        `${location.name}, ${location.country}`;

    document.getElementById("dateTime").textContent =
        "Updated: " + current.time.replace("T", " ");

    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("weatherIcon").textContent =
        weather.icon;

    document.getElementById("description").textContent =
        weather.text;

    document.getElementById("feelsLike").textContent =
        `Feels like ${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("windSpeed").textContent =
        current.wind_speed_10m + " km/h";

    document.getElementById("precipitation").textContent =
        current.precipitation + " mm";

    document.getElementById("apparentTemp").textContent =
        Math.round(current.apparent_temperature) + "°C";

    document.querySelector(".weather-art").textContent =
        weather.icon;

    displayForecast(data.daily);
}

// Display 5-day forecast
function displayForecast(daily) {
    forecastGrid.innerHTML = "";

    daily.time.forEach((date, index) => {
        const weather = getWeather(daily.weather_code[index]);

        const card = document.createElement("div");
        card.className = "forecast-card";

        const day = document.createElement("h3");
        day.textContent = new Date(date + "T12:00:00")
            .toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric"
            });

        const icon = document.createElement("div");
        icon.className = "forecast-icon";
        icon.textContent = weather.icon;

        const temp = document.createElement("div");
        temp.className = "forecast-temp";
        temp.textContent =
            `${Math.round(daily.temperature_2m_max[index])}° / ` +
            `${Math.round(daily.temperature_2m_min[index])}°`;

        const desc = document.createElement("p");
        desc.textContent = weather.text;

        card.append(day, icon, temp, desc);
        forecastGrid.appendChild(card);
    });
}

// Main search function
async function searchWeather(city) {
    if (requestController) {
        requestController.abort();
    }

    const controller = new AbortController();
    requestController = controller;

    searchBtn.disabled = true;
    message.classList.remove("error");
    message.textContent = "Fetching weather data...";
    content.hidden = true;

    try {
        const location = await getCoordinates(
            city,
            controller.signal
        );

        const weatherData = await getWeatherData(
            location.latitude,
            location.longitude,
            controller.signal
        );

        if (!weatherData.current || !weatherData.daily) {
            throw new Error("Incomplete weather data received.");
        }

        displayWeather(location, weatherData);

        content.hidden = false;
        message.textContent = "";

    } catch (error) {
        if (error.name !== "AbortError") {
            message.classList.add("error");
            message.textContent = error.message;
        }
    } finally {
        if (requestController === controller) {
            searchBtn.disabled = false;
            requestController = null;
        }
    }
}

// Search event
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (city) {
        searchWeather(city);
    }
});

// Load Hyderabad weather initially
searchWeather("Hyderabad");
