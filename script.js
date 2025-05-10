$(function () {
  $("#header").load("/components/header.html", function () {
    $("#navbar").load("/components/navbar.html");
  });
  $("#footer").load("/components/footer.html");
  $("#gallery").load("/components/gallery.html");
});
