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
let currentCalc = null;   

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
        <h3>Local Time</h3>
        <p>${currentTime.time} (${currentTime.timezone})</p>
        <p>${currentTime.date}</p>
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

// ---------- 8. Family cost calculator ----------
const adultsInput = document.getElementById("adults");
const childrenInput = document.getElementById("children");
const infantsInput = document.getElementById("infants");
const daysInput = document.getElementById("days");
const packageSelect = document.getElementById("packageSelect");
const calcBtn = document.getElementById("calcBtn");
const calcMessage = document.getElementById("calcMessage");
const costResult = document.getElementById("costResult");

// Fill the package dropdown from data/packages.json (DOM manipulation)
function loadPackages() {
  const packages = window.appData.getPackages();
  packages.forEach(pkg => {
    const option = document.createElement("option");
    option.value = pkg.id;
    option.textContent = `${pkg.name} (RM ${pkg.pricePerAdult} per adult per day)`;
    packageSelect.appendChild(option);
  });
}
loadPackages();

// Calculation: adults pay full price, children 50%, infants free
// Returns { error } for invalid input, otherwise the cost results
function calculateFamilyCost(pkg, adults, children, infants, days) {
  if ([adults, children, infants, days].some(n => Number.isNaN(n) || !Number.isInteger(n))) {
    return { error: "Please enter whole numbers only." };
  }
  if (adults < 1) return { error: "At least 1 adult is required." };
  if (children < 0 || infants < 0) return { error: "Numbers cannot be negative." };
  if (days < 1) return { error: "Trip must be at least 1 day." };

  const dailyCost = adults * pkg.pricePerAdult + children * pkg.pricePerAdult * 0.5;
  const total = dailyCost * days;
  const people = adults + children + infants;

  return { total: total, perPerson: total / people, perDay: dailyCost };
}

calcBtn.addEventListener("click", () => {
  const adults = Number(adultsInput.value);
  const children = Number(childrenInput.value);
  const infants = Number(infantsInput.value);
  const days = Number(daysInput.value);

  const packages = window.appData.getPackages();
  const pkg = packages.find(p => p.id === Number(packageSelect.value));

  const result = calculateFamilyCost(pkg, adults, children, infants, days);

    if (result.error) {
    calcMessage.textContent = result.error;
    calcMessage.style.color = "red";
    costResult.innerHTML = "";
    return;
  }

  // Remember these values so "Save Plan" can store them
  currentCalc = {
    total: result.total,
    packageName: pkg.name,
    days: days,
    adults: adults,
    children: children,
    infants: infants
  };

  calcMessage.textContent = "Cost calculated.";
  calcMessage.style.color = "green";
  costResult.innerHTML = `
    <p><strong>Total:</strong> RM ${result.total.toFixed(2)}</p>
    <p><strong>Per person:</strong> RM ${result.perPerson.toFixed(2)}</p>
    <p><strong>Per day:</strong> RM ${result.perDay.toFixed(2)}</p>
  `;
});

// ---------- 9. Suggestion logic ----------
const seniorsInput = document.getElementById("seniors");
const suggestBtn = document.getElementById("suggestBtn");
const suggestionResult = document.getElementById("suggestionResult");

// Saved so the plan can store it in Local Storage later
let currentSuggestion = "";

// Decide an activity from the weather, the destination type and the family makeup
function suggestActivity(weather, guideType, children, infants, seniors) {
  const code = weather.code;
  const temp = weather.temperature;
  const wind = weather.wind;

  const isRainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isSnowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const hasVulnerable = infants > 0 || seniors > 0;

  if (code >= 95) {
    return "Thunderstorm expected. Stay indoors: visit a mall, museum or hotel pool.";
  } else if (isRainy && children > 0) {
    return "Rainy day: try an aquarium, kids' museum or indoor playground.";
  } else if (isRainy) {
    return "Rainy day: visit a museum, cafe or shopping centre.";
  } else if (isSnowy) {
    return "Snowy weather: enjoy a snow play area, or stay warm with an indoor food tour.";
  } else if (temp >= 30 && hasVulnerable) {
    return "Very hot: choose shaded parks, and go out only early morning or evening.";
  } else if (temp < 15 && hasVulnerable) {
    return "Cold weather: stick to indoor attractions and warm cafes.";
  } else if (wind > 40) {
    return "Strong wind: skip boat rides and high viewpoints. Try indoor attractions.";
  } else if (temp >= 15 && temp < 30) {
    switch (guideType) {
      case "themepark":
        return "Perfect weather for a theme park day with the whole family.";
      case "beach":
        return "Great beach day: swimming and sandcastles.";
      case "nature":
        return "Nice weather for a zoo visit or a family picnic.";
      case "city":
        return "Good for a walking tour with stroller-friendly stops.";
      default:
        return "Enjoy the mild weather with a relaxed day out.";
    }
  }

  return "No suitable suggestion available. Try another city or change your family details.";
}

suggestBtn.addEventListener("click", () => {
  if (currentWeather === null || currentCity === null) {
    suggestionResult.innerHTML = "<p style='color:red'>Search for a city first.</p>";
    return;
  }

  const children = Number(childrenInput.value);
  const infants = Number(infantsInput.value);
  const seniors = Number(seniorsInput.value);

  if ([children, infants, seniors].some(n => Number.isNaN(n) || n < 0)) {
    suggestionResult.innerHTML = "<p style='color:red'>Family numbers must be 0 or more.</p>";
    return;
  }

  const guide = getDestinationGuide(currentCity.name);
  const guideType = guide ? guide.type : "city";

  currentSuggestion = suggestActivity(currentWeather, guideType, children, infants, seniors);
  suggestionResult.innerHTML = `<h3>Suggested Activity</h3><p>${currentSuggestion}</p>`;
});

// ---------- 10. Save plan (CREATE) to Local Storage ----------
const notesInput = document.getElementById("notes");
const saveBtn = document.getElementById("saveBtn");
const saveMessage = document.getElementById("saveMessage");

saveBtn.addEventListener("click", () => {
  // Validation: make sure every step has been done
  if (currentCity === null) {
    saveMessage.textContent = "Search for a city first.";
    saveMessage.style.color = "red";
    return;
  }
  if (currentCalc === null) {
    saveMessage.textContent = "Calculate the cost first.";
    saveMessage.style.color = "red";
    return;
  }
  if (currentSuggestion === "") {
    saveMessage.textContent = "Get an activity suggestion first.";
    saveMessage.style.color = "red";
    return;
  }

  // Build the plan object
  const plan = {
    id: Date.now(),                       // unique id
    city: currentCity.name,
    country: currentCity.country,
    days: currentCalc.days,
    adults: currentCalc.adults,
    children: currentCalc.children,
    infants: currentCalc.infants,
    seniors: Number(seniorsInput.value),
    package: currentCalc.packageName,
    totalCost: currentCalc.total,
    suggestion: currentSuggestion,        // suggestion stored too (Task 5 requirement)
    notes: notesInput.value.trim()
  };

  // Read the old list, add the new plan, save the list back
  const plans = JSON.parse(localStorage.getItem("plans")) || [];
  plans.push(plan);
  localStorage.setItem("plans", JSON.stringify(plans));

  saveMessage.textContent = "Plan saved!";
  saveMessage.style.color = "green";
  notesInput.value = "";
});