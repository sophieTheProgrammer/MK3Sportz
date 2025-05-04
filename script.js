$(function (){
    $("#boilerplate1").load("/components/boilerplate1.html", function ()
    {
        $("#navbar").load("/components/navbar.html");
    });
    $("#boilerplate2").load("/components/boilerplate2.html");
    $("#gallery").load("/components/gallery.html");
}); tha