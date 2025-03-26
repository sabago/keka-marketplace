(function($) {
  "use strict";
  
  $(document).ready(function() {
      var container = $("#marketplace-container");
      
      // If user is not logged in, show login message
      if (!mpauthData.isLoggedIn) {
          container.html(
              '<div class="login-required" style="padding: 20px; text-align: center; border: 1px solid #ddd;">' +
              '<h3>Login Required</h3>' +
              '<p>Please <a href="' + mpauthData.loginUrl + '">login</a> to access the marketplace.</p>' +
              '</div>'
          );
          return;
      }
      
      // User is logged in, get auth token
      $.ajax({
          url: mpauthData.apiUrl,
          method: "GET",
          beforeSend: function(xhr) {
              xhr.setRequestHeader('X-WP-Nonce', mpauthData.nonce);
          },
          success: function(data) {
              if (data.token) {
                  // Store token in sessionStorage (more secure than localStorage)
                  sessionStorage.setItem("wp_marketplace_token", data.token);
                  
                  // Load marketplace in iframe with token
                  var marketplaceUrl = mpauthData.marketplaceUrl;
                  if (marketplaceUrl.indexOf("?") > -1) {
                      marketplaceUrl += "&token=" + encodeURIComponent(data.token);
                  } else {
                      marketplaceUrl += "?token=" + encodeURIComponent(data.token);
                  }
                  
                  container.html(
                      '<iframe src="' + marketplaceUrl + '" ' +
                      'id="marketplace-iframe" ' +
                      'width="100%" ' +
                      'height="800" ' +
                      'style="border:none; min-height:800px;" ' +
                      'allow="clipboard-read; clipboard-write" ' +
                      '></iframe>'
                  );
                  
                  // Setup message listener for iframe communication
                  window.addEventListener('message', function(event) {
                      // Verify origin
                      var marketplaceOrigin = new URL(mpauthData.marketplaceUrl).origin;
                      if (event.origin !== marketplaceOrigin) return;
                      
                      // Handle login required message
                      if (event.data.action === 'requireLogin') {
                          window.location.href = mpauthData.loginUrl;
                      }
                      
                      // Handle resize iframe
                      if (event.data.action === 'resize' && event.data.height) {
                          $('#marketplace-iframe').height(event.data.height);
                      }
                  });
              }
          },
          error: function() {
              container.html(
                  '<div class="error" style="padding: 20px; text-align: center; border: 1px solid #f00;">' +
                  '<h3>Error</h3>' +
                  '<p>Could not authenticate with the marketplace. Please try again later.</p>' +
                  '<p><a href="' + window.location.href + '">Refresh</a> to try again.</p>' +
                  '</div>'
              );
          }
      });
  });
})(jQuery);