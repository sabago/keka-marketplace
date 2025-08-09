(function($) {
  "use strict";

  $(document).ready(function() {
    var container = $("#marketplace-container");
    var baseUrl = mpauthData.marketplaceUrl || 'https://keka-marketplace-production.up.railway.app';
    var origin = new URL(baseUrl).origin;

    function withCacheBust(url, ts) {
      var u = new URL(url, window.location.origin);
      u.searchParams.set('_v', ts || (mpauthData.visitTs || Date.now()));
      return u.toString();
    }

    function withToken(url, token) {
      var u = new URL(url, window.location.origin);
      if (token) u.searchParams.set('token', token);
      return u.toString();
    }

    function setIframe(src) {
      container.html(
        '<iframe src="' + src + '" id="marketplace-iframe" width="100%" height="800" ' +
        'style="border:none; min-height:800px; width:100%; max-width:100%; overflow:hidden;" ' +
        'allow="clipboard-read; clipboard-write" scrolling="yes"></iframe>'
      );
    }

    function load(initialUrl) {
      setIframe(withCacheBust(initialUrl));
      attachPostMessage();
    }

    function refreshMarketplaceAuth() {
      var iframe = document.getElementById('marketplace-iframe');
      if (!iframe) return;

      if (mpauthData.isLoggedIn) {
        $.ajax({
          url: mpauthData.apiUrl,
          method: "GET",
          beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', mpauthData.nonce); },
          success: function(data){
            var u = withToken(baseUrl, data && data.token);
            iframe.src = withCacheBust(u, Date.now()); // force new fetch
          },
          error: function(){
            iframe.src = withCacheBust(baseUrl, Date.now());
          }
        });
      } else {
        iframe.src = withCacheBust(baseUrl, Date.now());
      }
    }

    function attachPostMessage() {
      window.addEventListener('message', function(event) {
        if (event.origin !== origin) return;
        const action = event.data && event.data.action;

        if (action === 'requireLogin') {
          window.location.href = mpauthData.loginUrl;
        } else if (action === 'requestLogout') {
          window.location.href = mpauthData.loginUrl.replace('wp-login.php', 'wp-login.php?action=logout&_wpnonce=' + mpauthData.nonce);
        } else if (action === 'resize' && event.data.height) {
          $('#marketplace-iframe').height(event.data.height);
        } else if (action === 'checkLoginStatus') {
          event.source.postMessage({
            action: 'loginStatus',
            isLoggedIn: mpauthData.isLoggedIn,
            user: mpauthData.user || null
          }, event.origin);
        }
      });
    }

    // Initial load (with token if logged in)
    if (mpauthData.isLoggedIn) {
      $.ajax({
        url: mpauthData.apiUrl,
        method: "GET",
        beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', mpauthData.nonce); },
        success: function(data){
          var u = withToken(baseUrl, data && data.token);
          load(u);
        },
        error: function(){
          load(baseUrl);
          console.error("Failed to get authentication token.");
        }
      });
    } else {
      load(baseUrl);
    }

    // 1) When window regains focus
    $(window).on('focus', function(){ setTimeout(refreshMarketplaceAuth, 0); });

    // 2) When page is shown from bfcache (back/forward)
    window.addEventListener('pageshow', function(){ refreshMarketplaceAuth(); });

    // 3) When tab becomes visible again
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) refreshMarketplaceAuth();
    });
  });
})(jQuery);