if(!window.jQuery) {
	console.error("The twopi.js plugin requires the jquery plugin as a dependency.");
} else {
	(function($) {

		$.fn.twopi = function( options ) {
			var opts = $.extend( {}, $.fn.twopi.defaults, options );

			function initializeLoadingBar($this) {
				// Initalize a hidden loading bar container.
				var $loadingBarContainer = $("<div class='twopi-loading-bar-container'></div>")
					.css({
						position: 'absolute',
						'border-width': opts.loadingBarBorderWidth,
						'border-style': 'solid',
						'border-color': 'rgba(0, 0, 0, 0.25)',
						height: opts.loadingBarHeight - 2*opts.loadingBarBorderWidth,
					})
					.hide()
					.appendTo(document.body);
				var $loadingBar = $("<div class='twopi-loading-bar'></div>")
					.css({
						width: '0%',
						height: '100%',
						background: 'rgba(0, 0, 0, 0.25)',
						'-webkit-transition': 'width 0.1s',
						'transition': 'width 0.1s',
					})
					.appendTo($loadingBarContainer);

				$this.data('loading-bar-container', $loadingBarContainer);
				// Update the loading bar position, when window is resized.
				$(window).on('resize', { $this: $this }, function(e) {
					updateLoadingBarPosition( e.data.$this );
				}).resize();
				// Update this only when the preview image has been loaded.
				$this.on('load', function(e) {
					updateLoadingBarPosition( $(this) );
				});
			}

			function updateLoadingBarPosition($this) {
				var $loadingBarContainer = $this.data('loading-bar-container');
				if($loadingBarContainer) {
					var position = $this.offset();
					var width = $this.width();
					var height = $this.height();
					$loadingBarContainer.css({
						left: position.left,
						width: width - 2*opts.loadingBarBorderWidth,
						top: position.top + height - opts.loadingBarHeight - 2*opts.loadingBarBorderWidth,
					}).fadeIn(); // Making sure the loading bar is shown.
				}
			}

			function updateLoadingBarValue($this, value) {
				var $loadingBarContainer = $this.data('loading-bar-container');
				if($loadingBarContainer) {
					var $loadingBar = $('.twopi-loading-bar', $loadingBarContainer);
					$loadingBar.css({
						width: Math.round(value * 100) + "%"
					});
				}
			}

			function removeLoadingBar($this) {
				var $loadingBarContainer = $this.data('loading-bar-container');
				if($loadingBarContainer) {
					$loadingBarContainer.stop(true, true).fadeOut(function() {
						$(this).remove(); // Remove the loading bar.
						$this.data('loading-bar-container', null);
					});
				}
			}

			function preloadImages($this, imageSrcs, done_callback) {
				// TODO: Consider checking that the image dimensions match.
				$this.data('twopi-images-loaded', 0);
				var images = [];
				if(performance.now) {
					var startTime = performance.now();
				}
				for( var i in imageSrcs ) {
					var imageSrc = imageSrcs[i];
					// var image = new Image();
					var $image = $("<img>").appendTo($this);
					$image.on('load', { $this: $this, done_callback: done_callback }, function(e) {
						var $this = e.data.$this;
						var images_count = $this.data('twopi-images').length;
						var images_loaded = $this.data('twopi-images-loaded') + 1;
						$this.data('twopi-images-loaded', images_loaded);
						updateLoadingBarValue($this, images_loaded / images_count);
						if(images_loaded >= images_count) {
							if(performance.now) {
								var elapsedTime = performance.now() - startTime;
								console.debug( "2π of", $this.get(0), "loading took", Math.round(elapsedTime), "milliseconds" );
							}
							e.data.done_callback( $this );
						}
					});
					$image.attr('src', imageSrc).hide();
					images[i] = $image;
				}
				$this.data('twopi-images', images);
			}

			function fromAngleToIndex(image_count, angle) {
				// How great an arc is allocated pr image index.
				var anglePrIndex = Math.PI * 2.0 / image_count;
				// Making an offset to the angle, such that the image is front facing.
				angle += anglePrIndex / 2.0;
				// Remove any multiplum of 2π
				angle %= 2*Math.PI;
				// Make sure the angle is never negative.
				if(angle < 0.0) {
					angle += 2*Math.PI;
				}
				// Now angle is in [0.0, 2π[
				// The actual index in the array of images.
				return Math.floor(angle / anglePrIndex);
			}

			function showImage($this, angle) {
				var images = $this.data('twopi-images');
				if($this.data('twopi-images-loaded') >= images.length) {
					var image_index = fromAngleToIndex(images.length, angle);
					var $image = images[image_index];
					// Hide all images
					$('img', $this).not($image).hide();
					$image.show();
				} else {
					console.error("Please wait for all images to load.");
				}
			}

			function registerEventListeners($wrapper) {
				$wrapper.on('mousemove', {$wrapper: $wrapper}, function(e) {
					var $wrapper = e.data.$wrapper;
					var width = $wrapper.width();
					var angle = 2 * Math.PI * (e.offsetX - width/2) / width;
					showImage( $wrapper, angle);
				}).on('touchmove', {$wrapper: $wrapper}, function(e) {
					e.preventDefault();
      		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
					var $wrapper = e.data.$wrapper;
					var width = $wrapper.width();
					var left = $wrapper.offset().left;
					var offsetLeft = touch.pageX - left;
					var angle = 2 * Math.PI * (offsetLeft - width/2) / width;
					showImage( $wrapper, angle);
				});
			}

			return this.one('load', function(e) {
				$image = $(e.target);
				// Replace this element with a wrapper.
				var $wrapper = $("<div class='twopi-wrapper'>")
					.css({
						display: 'block',
						width: $image.width(),
						height: $image.height()
					});
				// Replace the image with the wrapper, in the dom.
				$image.replaceWith($wrapper);
				$wrapper.append($image);

				if(opts.showLoadingBar === true) {
					// Show the loading bar if applicable.
					initializeLoadingBar( $wrapper );
					updateLoadingBarValue( $wrapper, 0.0 );
				}

				// TODO: Consider checking if the initial image is loaded.
				preloadImages($wrapper, opts.images, function( $wrapper ) {
					// Remove the loading bar, if any
					removeLoadingBar( $wrapper );
					if(typeof(opts.loadedCallback) === 'function') {
						opts.loadedCallback( $wrapper );
					}
					// TODO: Consider registering these events before the images are loaded,
					// such that the images that are ready can be used and the missing images
					// fails gracefully.
					registerEventListeners($wrapper);
				});
			}).each(function() {
				if(this.complete) {
					// Trigger a load, if the load was already completed.
					$(this).load();
				}
			});
		};

		$.fn.twopi.defaults = {
			showLoadingBar: true,
			loadingBarHeight: 3,
			loadingBarBorderWidth: 1,
			loadedCallback: null,
			images: []
		};

	})(window.jQuery);
}
