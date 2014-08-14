var iterations, exponent;
var width, height;
var realLattice, complexLattice, realLattice_0, complexLattice_0;
var startReal, endReal, startComplex, endComplex;
var count; // this is a buffer

self.addEventListener('message', function(e) {
  	if (e.data.msg == 'update_parameters') {
  		startReal = e.data.startReal;
  		endReal = e.data.endReal;
  		startComplex = e.data.startComplex;
  		endComplex = e.data.endComplex;

		width = e.data.width;
		height = e.data.height;
		console.log("Width: " + width);

		iterations = e.data.iterations;
		exponent = e.data.exponent;

		console.log("Real: [" + startReal + ", " + endReal+  "]");
		console.log("Complex: [" + startComplex + ", " + endComplex + "]");
	} else if (e.data.msg == 'render') {
		render();
	}
}, false);

function render() {
	// These will be modified
	realLattice = createRealLattice();
	complexLattice = createComplexLattice();

	// it looks like the latices are being filled correctly
	// console.log("realLattice[0] = " + realLattice[0] + ", realLattice[realLattice.length-1] = " +
	// 			realLattice[realLattice.length-1]);
	// console.log("realLattice[width-1] = " + realLattice[width-1] + ", realLattice[width] = " +
	// 			realLattice[width]);
	// console.log("complexLattice[0] = " + complexLattice[0] + ", complexLattice[length-1] = " +
	// 			complexLattice[complexLattice.length-1]);
	// console.log("complexLattice[width-1] = " + complexLattice[width-1] + ", complexLattice[width] = " +
	// 			complexLattice[width]);

	// These will be used for reference
	realLattice_0 = createRealLattice();
	complexLattice_0 = createComplexLattice();

	// remember, count is a buffer
	count = mandlebrotIterate();

	var message = { 
		message: 'rendered',
		count : count
	};
	self.postMessage(message, [count.buffer]);
}

/**
 * Computes f(x) = x^2 + x_0 for each point in the complex plane iteration times
 * @return: arraybuffer of f(x)
 */
function mandlebrotIterate () {
	// keeps track of how many iterations it took for the point went out of bounds
	var countBuffer = new ArrayBuffer(width*height*2), // Uint16Array is 2 bytes
		count = new Uint16Array(countBuffer)
		validPointBuffer = new ArrayBuffer(width*height),
		validPoint = new Uint8Array(validPointBuffer); // psuedo true false array

	// for keeping track of our place in the lattice
	var x, 
		y,
		r,
		theta,
		power,
		quadrant,
		realPart,
		complexPart,
		message,
		currentIndex;

	var start = performance.now();

	/*** DO AN EXTRA ITERATION WITH A DIFFERENT F(X) ***/

	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			currentIndex = x + width * y; // converts 2D array index to 1D index
			// if this point has not gone out of bounds
			if (validPoint[currentIndex] == 0) {
				realPart 	= realLattice[currentIndex];
				complexPart = complexLattice[currentIndex];

				// point is not out of bounds
				if (realPart < 2 && complexPart < 2) {
					// figure out which quadrant the point is in
					if (complexPart > 0) {
						if (realPart > 0) {
							quadrant = 0;
						} else {
							quadrant = Math.PI;
						}
					} else {
						if (realPart > 0) {
							quadrant = 0;
						} else {
							quadrant = -Math.PI;
						}
					}

					r = Math.sqrt(realPart * realPart + complexPart * complexPart);
					theta = Math.atan(complexPart / realPart) + quadrant;
					power = Math.pow(r, exponent);

					realLattice[currentIndex] = power * Math.cos(exponent * theta) + realLattice_0[currentIndex];
					complexLattice[currentIndex] = power * Math.sin(exponent * theta) + complexLattice_0[currentIndex];

					count[currentIndex] += 1;
				} else {
					// max of uint8 is 255, and in binary 255 is all ones
					// so maybe a comparison of 255 to 0 would be faster
					validPoint[currentIndex] = 255;
				}
			}
		}
	}

	/***************************************************/


	/*

	Not the same position within the lattice, they should have the same width
	and height and I do not think they do.

	*/

	for (i = 0; i < iterations; i++) {
		for (y = 0; y < height; y++) {
			for (x = 0; x < width; x++) {
				currentIndex = x + width * y; // converts 2D array index to 1D index
				// if this point has not gone out of bounds
				if (validPoint[currentIndex] == 0) {
					realPart 	= realLattice[currentIndex];
					complexPart = complexLattice[currentIndex];

					// point is not out of bounds
					if (realPart < 2 && complexPart < 2) {
						realLattice[currentIndex] = (realPart * realPart)
													- (complexPart * complexPart)
													+ realLattice_0[currentIndex];
						complexLattice[currentIndex] = 2 * complexPart * realPart
											   		   + complexLattice_0[currentIndex];

						// figure out which quadrant the point is in
						// if (complexPart > 0) {
						// 	if (realPart > 0) {
						// 		quadrant = 0;
						// 	} else {
						// 		quadrant = Math.PI;
						// 	}
						// } else {
						// 	if (realPart > 0) {
						// 		quadrant = 0;
						// 	} else {
						// 		quadrant = -Math.PI;
						// 	}
						// }

						// r = Math.sqrt(realPart * realPart + complexPart * complexPart);
						// theta = Math.atan(complexPart / realPart) + quadrant;
						// power = Math.pow(r, exponent);

						// realLattice[currentIndex] = power * Math.cos(exponent * theta) + realLattice_0[currentIndex];
						// complexLattice[currentIndex] = power * Math.sin(exponent * theta) + complexLattice_0[currentIndex];

						count[currentIndex] += 1;
					} else {
						// max of uint8 is 255, and in binary 255 is all ones
						// so maybe a comparison of 255 to 0 would be faster
						validPoint[currentIndex] = 255;
					}
				}
			}
		}

		// updating the DOM a lot and probably sending messages is relatively
		// computationally intensive so only let the view know every 10 iterations
		// if (i % 3 == 0) {
			message = { 
				message: 'iteration update',
				iteration : i + 1
			};
			self.postMessage(message);
		// }
	}	

	// post message when we finish so the iteration count looks good
	message = { 
		message: 'iteration update',
		iteration : i
	};
	self.postMessage(message);

	var end = performance.now();
	console.log("Iterations took: " + (end-start) + " ms");

	return count;
}

function valArray(arr, w, h, val) {
	for (var x = 0; x < w; x++) {
		for (var y = 0; y < h; y++) {
			arr[x][y] = val;
		}
	}
}

function twoDimArray (w, h) {
	var master = new Array(w);
	for (var i = 0; i < w; i++) {
		master[i] = new Array(h);
	}

	return master;
}

/**
 * Returns an array buffer of var length that starts with the value specified
 * and each consecutive value is the previous plus the increment.
*/
function incrementedArray(start, increment, length) {
	var view = dynamicFloatBufferView(length);

	for (var i = 0; i < view.length; i++) {
		view[i] = start;
		start += increment;
	}

	return view;
}

/**
 * The real values are incremented in the y plane
 * @return: an Float64Array view
 */
function createRealLattice() {
	// this is the same when on fullscreen and regular as it should be
	// console.log("realLattice increment = " + Math.abs(startReal-endReal)/width);
	//

	var incrementedView = incrementedArray(startReal, Math.abs(startReal-endReal)/height, height),
		realLatticeView = dynamicFloatBufferView(width * height);

	// console.log("realLattice().incrementedView.length = " + incrementedView.length);

	// this is correct, it is the same as endReal
	// console.log("createRealLattice().incrementedView[incrementedView.length-1] = " 
	// 			+ incrementedView[incrementedView.length-10]);
	//

	// for (var x = 0; x < width; x++) {
	// 	for (var y = 0; y < height; y++) {
	// 		realLatticeView[y + width * x] = incrementedView[x];
	// 	}
	// }

	for (var x = 0; x < width; x++) {
		for (var y = 0; y < height; y++) {
		realLatticeView[x + y * width] = incrementedView[y];
		}
	}


	return realLatticeView;
}

/**
 * The real values are incremented in the x plane
 * @return: an Float64Array view
 */
function  createComplexLattice() {
	// this is correct, it says the same when going full screen
	// console.log("complexLattice increment = " + Math.abs(startComplex-endComplex)/width);
	//

	var incrementedView = incrementedArray(startComplex, Math.abs(startComplex-endComplex)/width, width),
		complexLatticeView = dynamicFloatBufferView(width * height);

	// console.log("complexLattice().incrementedView.length = " + incrementedView.length);
	// console.log("incrementedView[incrementedView.length-1] = " + incrementedView[incrementedView.length-1]);

	// for (var i = 0; i < complexLatticeView.length; i++) {
	// 	complexLatticeView[i] = incrementedView[i % width];
	// }

	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			complexLatticeView[x + y * width] = incrementedView[x];
		}
	}

	return complexLatticeView;
}

/**
 * This function decides if we need more precision
 * in our floating point numbers. If we don't have enough
 * precision the fractal quickly detiorates.
 * @return: Float64 or Float32 buffer view
 */
function dynamicFloatBufferView(length) {
	var range = startReal - endReal,
		buffer,
		view;

	// if we need more precision
	if (Math.abs(range / iterations) < .000001) {
		buffer = new ArrayBuffer(length * 8); // float64 is 8 bytes long
		view = new Float64Array(buffer);
	} else {
		buffer = new ArrayBuffer(length * 4); // float64 is 8 bytes long
		view = new Float32Array(buffer);
	}

	return view;
}