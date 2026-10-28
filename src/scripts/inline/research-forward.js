// The sample-return missions, planetary field guide and published microscopy moved to
// ryugu-bennu.html in September 2026. Forward shared views and section links made before the move.
(function () {
  var hash = location.hash;
  if (/^#(?:missions-title|planetary-title|research-scale-title)$|^#(?:observe|mission-view)=/.test(hash)) location.replace("ryugu-bennu.html" + location.search + hash);
})();
