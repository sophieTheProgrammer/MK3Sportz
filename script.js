// TODO: Turn data into JSON file and fetch using jquery
const templateData = {
  pickleball: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3346.6298044568607!2d-117.12904727116396!3d32.98716739999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf79db619602b%3A0xa749cc8af5beff27!2sBlack%20Mountain%20Pkwy%2C%20San%20Diego%2C%20CA%2092127!5e0!3m2!1sen!2sus!4v1747597126506!5m2!1sen!2sus",
  },
  basketball: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3346.6298044568607!2d-117.12904727116396!3d32.98716739999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf79db619602b%3A0xa749cc8af5beff27!2sBlack%20Mountain%20Pkwy%2C%20San%20Diego%2C%20CA%2092127!5e0!3m2!1sen!2sus!4v1747597126506!5m2!1sen!2sus",
  },
  soccer: {
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5724687824327!2d-117.14753092399751!3d32.96229527449391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80dbf823ed0906fb%3A0xb1a24410dbbd9fe0!2sMesa%20Verde%20Middle%20School!5e0!3m2!1sen!2sus!4v1747598974537!5m2!1sen!2sus",
  },
};
$(function () {
  $("#header").load("/components/header.html", function () {
    $("#navbar").load("/components/navbar.html");
  });
  $("#footer").load("/components/footer.html");
  $("#gallery").load("/components/gallery.html");
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
