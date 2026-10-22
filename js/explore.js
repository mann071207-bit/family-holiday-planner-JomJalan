// Explore page: search a city using the Open-Meteo Geocoding API

// 1. Get the HTML elements by their id
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const message = document.getElementById("message");
const cityInfo = document.getElementById("cityInfo");
const weatherInfo = document.getElementById("weatherInfo");

// Will be used later by the suggestion logic
let currentWeather = null;

// 2. Show a message to the user (red for errors, green for success)
function showMessage(text, isError = true) {
  message.textContent = text;
  message.style.color = isError ? "red" : "green";
}

// 3. Ask the API for the city. Returns the city object, or null if not found
async function searchCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Server error");      // goes to the catch block below
  }

  const data = await response.json();
  console.log(data);                      // look at this in DevTools (Ctrl+Shift+I)

  if (!data.results) {
    return null;                          // API found nothing
  }
  return data.results[0];
}

// ---------- 4. Turn Open-Meteo's weather code into readable text ----------
function getWeatherText(code) {
  if (code === 0) return "Clear sky";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

// ---------- 5. Weather: fetch current weather for a latitude and longitude ----------
async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Weather server error");
  }

  const data = await response.json();
  console.log(data);

  return {
    temperature: data.current.temperature_2m,
    code: data.current.weather_code,
    wind: data.current.wind_speed_10m,
    tempUnit: data.current_units.temperature_2m,
    windUnit: data.current_units.wind_speed_10m
  };
}

// ---------- 6. When the Search button is clicked ----------
searchBtn.addEventListener("click", async () => {
  const name = cityInput.value.trim();    // trim() removes extra spaces
  cityInfo.innerHTML = "";                // clear the old city result
  weatherInfo.innerHTML = "";             // clear the old weather result

  // Input validation
  if (name === "") {
    showMessage("Please enter a city name.");
    return;
  }

  showMessage("Searching...", false);

  try {
    const city = await searchCity(name);

    // Empty result
    if (city === null) {
      showMessage("City not found. Please check the spelling.");
      return;
}

    // Success: display the data on the page (DOM manipulation)
    showMessage("");
    cityInfo.innerHTML = `
      <h2>${city.name}, ${city.country}</h2>
      <p>Country code: ${city.country_code}</p>
      <p>Latitude: ${city.latitude}</p>
      <p>Longitude: ${city.longitude}</p>
      <p>Timezone: ${city.timezone}</p>
    `;

    // Weather: in its own try/catch so a weather failure doesn't hide the city
    try {
      currentWeather = await getWeather(city.latitude, city.longitude);
      weatherInfo.innerHTML = `
        <h3>Current Weather</h3>
        <p>Condition: ${getWeatherText(currentWeather.code)}</p>
        <p>Temperature: ${currentWeather.temperature} ${currentWeather.tempUnit}</p>
        <p>Wind speed: ${currentWeather.wind} ${currentWeather.windUnit}</p>
      `;
    } catch (weatherError) {
      console.error("Weather error:", weatherError);
      currentWeather = null;
      weatherInfo.innerHTML = "<p>Weather data is not available right now.</p>";
    }

  } catch (error) {
    // Failed request (no internet, server down)
    console.error("City search error:", error);
    showMessage("Could not load data. Please check your internet connection.");
  }
});