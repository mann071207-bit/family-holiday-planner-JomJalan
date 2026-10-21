// js/explore.js
// Explore page: search a city using the Open-Meteo Geocoding API

// 1. Get the HTML elements by their id
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const message = document.getElementById("message");
const cityInfo = document.getElementById("cityInfo");

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

// 4. When the Search button is clicked
searchBtn.addEventListener("click", async () => {
  const name = cityInput.value.trim();    // trim() removes extra spaces
  cityInfo.innerHTML = "";                // clear the old result

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
      <p>Latitude: ${city.latitude}</p>
      <p>Longitude: ${city.longitude}</p>
      <p>Timezone: ${city.timezone}</p>
    `;
  } catch (error) {
    // Failed request (no internet, server down)
    showMessage("Could not load data. Please check your internet connection.");
  }
});