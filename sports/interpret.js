document.addEventListener("DOMContentLoaded", () => {
  const jsonName = document.body.dataset.json;
  console.log(jsonName); // e.g., "pickleball"
  fetch(`/sports/${jsonName}.json`)
    .then((response) => response.json())
    .then((data) => {
      console.log("Loaded JSON data:", data);
      // Do something with the data...
    })
    .catch((error) => console.error("Error loading JSON:", error));
});
