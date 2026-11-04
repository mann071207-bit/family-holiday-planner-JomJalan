// ---------- 1. HTML elements ----------
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const message = document.getElementById("message");
const cityInfo = document.getElementById("cityInfo");
const timeInfo = document.getElementById("timeInfo");
const weatherInfo = document.getElementById("weatherInfo");
const guideInfo = document.getElementById("guideInfo");

// Saved here so the suggestion logic can use them later
let currentCity = null;
let currentWeather = null;
let currentTime = null;

// ---------- 2. Messages ----------
function showMessage(text, isError = true) {
  message.textContent = text;
  message.style.color = isError ? "red" : "green";
}

// ---------- 3. Geocoding API: find the city ----------
async function searchCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding server error");

  const data = await response.json();
  if (!data.results) return null;     
  return data.results[0];
}

// ---------- 4. Local time at the destination ----------
// Uses the timezone from the Geocoding API (e.g. "Asia/Tokyo")
function getLocalTime(timezone) {
  const now = new Date();

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

return { time: time, date: date, timezone: timezone };
}

// ---------- 5. Weather API ----------
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

async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather server error");

  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    code: data.current.weather_code,
    wind: data.current.wind_speed_10m,
    tempUnit: data.current_units.temperature_2m,
    windUnit: data.current_units.wind_speed_10m
  };
}

// ---------- 6. (local JSON file) ----------
function getDestinationGuide(cityName) {
  const destinations = window.appData.getDestinations();
  const found = destinations.find(
    d => d.city.toLowerCase() === cityName.toLowerCase()
  );
  return found || null;
}

// ---------- 7. Search button ----------
searchBtn.addEventListener("click", async () => {
  const name = cityInput.value.trim();

  // Clear old results
  cityInfo.innerHTML = "";
  timeInfo.innerHTML = "";
  weatherInfo.innerHTML = "";
  guideInfo.innerHTML = "";
  currentCity = null;
  currentWeather = null;
  currentTime = null;

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

    currentCity = city;
    showMessage("");
    cityInfo.innerHTML = `
      <h2>${city.name}, ${city.country}</h2>
      <p>Country code: ${city.country_code}</p>
      <p>Latitude: ${city.latitude}</p>
      <p>Longitude: ${city.longitude}</p>
      <p>Timezone: ${city.timezone}</p>
    `;

    // World Time: own try/catch
    try {
      currentTime = getLocalTime(city.timezone);
            timeInfo.innerHTML = `
        <h2>Local Time</h2>
        <p>${currentTime.time} (${currentTime.timezone})</p>
        <p>${currentTime.day}, ${currentTime.date}</p>
      `;
    } catch (timeError) {
      console.error("Time error:", timeError);
      timeInfo.innerHTML = "<p>Local time is not available right now.</p>";
    }

    // Weather: own try/catch
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
      weatherInfo.innerHTML = "<p>Weather data is not available right now.</p>";
    }

    // Guide from our local file: own try/catch
    try {
      const guide = getDestinationGuide(city.name);
      if (guide === null) {
        guideInfo.innerHTML = "<p>No travel guide is available for this city yet.</p>";
      } else {
        guideInfo.innerHTML = `
          <h3>Travel Guide: ${guide.city}</h3>
          <img src="${guide.image}" alt="Photo of ${guide.city}" width="300">
          <p>${guide.description}</p>
          <p><strong>Family tips:</strong> ${guide.familyTips}</p>
          <p><strong>Best season:</strong> ${guide.bestSeason}</p>
        `;
      }
    } catch (guideError) {
      console.error("Guide error:", guideError);
      guideInfo.innerHTML = "<p>Travel guide could not be loaded.</p>";
    }

  } catch (error) {
    console.error("City search error:", error);
    showMessage("Could not load data. Please check your internet connection.");
  }
});