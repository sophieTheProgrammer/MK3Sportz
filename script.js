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
