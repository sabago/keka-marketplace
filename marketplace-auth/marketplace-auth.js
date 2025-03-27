(function($) {
    "use strict";
    
    $(document).ready(function() {
        var container = $("#marketplace-container");
        
        // Always load the marketplace, but with or without token based on login status
        var marketplaceUrl = mpauthData.marketplaceUrl;
        
        // If user is logged in, get auth token and add it to the URL
        if (mpauthData.isLoggedIn) {
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
                        
                        // Add token to marketplace URL
                        if (marketplaceUrl.indexOf("?") > -1) {
                            marketplaceUrl += "&token=" + encodeURIComponent(data.token);
                        } else {
                            marketplaceUrl += "?token=" + encodeURIComponent(data.token);
                        }
                        
                        // Load marketplace in iframe with token
                        loadMarketplaceIframe(marketplaceUrl);
                    }
                },
                error: function(xhr) {
                    // If token retrieval fails, still load marketplace but without token
                    loadMarketplaceIframe(marketplaceUrl);
                    console.error("Failed to get authentication token:", xhr);
                }
            });
        } else {
            // User is not logged in, load marketplace without token
            loadMarketplaceIframe(marketplaceUrl);
        }
        
        // Function to load the marketplace iframe
        function loadMarketplaceIframe(url) {
            container.html(
                '<iframe src="' + url + '" ' +
                'id="marketplace-iframe" ' +
                'width="100%" ' +
                'height="800" ' +
                'style="border:none; min-height:800px; width:100%; max-width:100%; overflow:hidden;" ' +
                'allow="clipboard-read; clipboard-write" ' +
                'scrolling="yes" ' +
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
    });
})(jQuery);
