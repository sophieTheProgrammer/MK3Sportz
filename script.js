// TODO: Turn data into JSON file and fetch using jquery
const templateData = {
  pickleball: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2534.5812215290503!2d-117.12620491733509!3d32.969389924035596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf9d4b54a622b%3A0x8655b733612322d6!2sBlack%20Mountain%20Middle%20School!5e0!3m2!1sen!2sus!4v1747603059312!5m2!1sen!2sus",
  },
  basketball: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2534.5812215290503!2d-117.12620491733509!3d32.969389924035596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf9d4b54a622b%3A0x8655b733612322d6!2sBlack%20Mountain%20Middle%20School!5e0!3m2!1sen!2sus!4v1747603059312!5m2!1sen!2sus",
  },
  soccer: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5724687824327!2d-117.14753092399751!3d32.96229527449391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf823ed0906fb%3A0xb1a24410dbbd9fe0!2sMesa%20Verde%20Middle%20School!5e0!3m2!1sen!2sus!4v1747598974537!5m2!1sen!2sus",
  },
  "#badminton": {
    sportName: "Badminton",
    heroImg:
      "https://optimumbadmintonacademy.com/assets/images/news/5d83aa61620ef8dbf56bc8f5e711f536.jpg",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5724687824327!2d-117.14753092399751!3d32.96229527449391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf823ed0906fb%3A0xb1a24410dbbd9fe0!2sMesa%20Verde%20Middle%20School!5e0!3m2!1sen!2sus!4v1747598974537!5m2!1sen!2sus",
    coaches: [
      { name: "Amy Lee", favorite: "Drop shot" },
      { name: "Oscar Liu", favorite: "Smash" },
      { name: "Chris Livelo" },
      { name: "Niah Watson" },
      { name: "Venice Roque" },
      { name: "Caleb Lapp" },
      { name: "Aidan Lee" },
      { name: "Supported by local high school students" },
    ],
    privateLessons: {
      coaches: [
        { name: "Amy Lee" },
        { name: "Oscar Liu" },
        { name: "Chris Livelo", last: true },
      ],
      rates: [
        {
          option: "1-on-1",
          hourlyRate: "120",
        },
        {
          option: "1-on-2",
          hourlyRate: "160",
        },
      ],
      schedules: [
        {
          day: "Fridays",
          time: "6:30 PM – 8:30 PM",
        },
        {
          day: "Saturdays",
          time: "4:30 PM – 8:30 PM",
        },
      ],
    },
  },
  "#basketball": {
    sportName: "Basketball",
    heroImg:
      "https://t3.ftcdn.net/jpg/00/90/01/44/360_F_90014458_fR48dBcf1KuoMTJV48vTl9dGyhQ8kYqF.jpg",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5724687824327!2d-117.14753092399751!3d32.96229527449391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf823ed0906fb%3A0xb1a24410dbbd9fe0!2sMesa%20Verde%20Middle%20School!5e0!3m2!1sen!2sus!4v1747598974537!5m2!1sen!2sus",
    coaches: [
      { name: "Michael Jordan", favorite: "Layout" },
      { name: "Kobe Bryant", favorite: "3-point" },
    ],
    privateLessons: {
      coaches: [{ name: "Michael Jordan", last: true }],
      rates: [
        {
          option: "1-on-1",
          hourlyRate: "100,000",
        },
      ],
      schedules: [
        {
          day: "Fridays",
          time: "6:30 PM – 8:30 PM",
        },
      ],
    },
  },
};
$(function () {
  $("#navbar").load("/components/navbar.html");
  $("#footer").load("/components/footer.html");
  $("#gallery").load("/components/gallery.html");
});

function renderContent() {
  var pageData = templateData[window.location.hash];
  if (pageData) {
    var rendered = Mustache.render($("#content-template").html(), pageData);
    $("#content").html(rendered);
  }
}
renderContent();
window.addEventListener("hashchange", function () {
  renderContent();
});

$.get("/components/location.html", function (templateContent) {
  var rendered = Mustache.render(templateContent, templateData[findPathKey()]);
  $("#location").html(rendered);
});

function findPathKey() {
  const path = window.location.pathname;

  for (let property in templateData) {
    if (path.includes(property)) {
      console.log(property);
      return property;
    }
  }
  return "pickleball"; // Fallback
}
