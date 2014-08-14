var fractal = new Worker('fractal.js'),
	fractal_parameters;

var imgData, huePreviewImgData;
var countBuffer;

function start() {
	changeWindow();

	// Create event listener for web worker
	fractal.addEventListener('message', fractalPostedMessage, false);

	// create the image data objects
	imgData = context.createImageData(canvasWidth, canvasHeight);
	huePreviewImgData = context.createImageData(huePreviewCanvasWidth, huePreviewCanvasHeight);
}

function fractalPostedMessage(event) {
	// I should have an event listener in the view controller and have
	// that change this
	if (event.data.message == 'iteration update') {
		updateStatus("iteration " + event.data.iteration + " of " + iterations);
	} else if (event.data.message == 'rendered') {
		count = event.data.count;
		draw();
	}
}

function draw () {
	// clear the canvas
	context.clearRect(0, 0, canvasWidth, canvasHeight);

	// does this need to be called every time we redraw?
	// imgData = context.createImageData(canvasWidth, canvasHeight);

	minMax = findMinMax(count, canvasWidth, canvasHeight);
	min = minMax[0];
	max = minMax[1];
	color(); // this is setting the imgData object


	// paint on the canvas
	updateCanvas();
	isRunning = false;
}

function updateCanvas() {
	updateStatus("Putting image on canvas");
	context.putImageData(imgData, 0, 0);
	huePreviewContext.putImageData(huePreviewImgData, 0, 0);
	updateStatus("Done");
}

function changeWindow() {
	// Update parameters
	fractal_parameters = {
		msg: 'update_parameters',
		startReal: startReal,
		endReal: endReal,
		startComplex: startComplex,
		endComplex: endComplex,
		width: canvasWidth,
		height: canvasHeight,
		iterations: iterations,
		exponent: exponent
	};
	fractal.postMessage(fractal_parameters);

	// tell fractal to render
	fractal.postMessage({ msg: 'render' });
	isRunning = true;
}

function recolor () {
	color();
	updateCanvas();
}

function findMinMax (arr, w, h) {
	var min = 1000000;
	var max = 0;

	for (var x = 0; x < count.length; x++) {
		if (arr[x] < min)
			min = arr[x];
		if (arr[x] > max)
			max = arr[x];
	}

	return [min,max];
}

// If I wanted to be super sneaky I could probably do some
// function passing thing here instead of two identical
// for loops
function color () {
	updateStatus("Coloring");
	range = max - min;
	var rgbArray;

	if (coloringType == 0) {
		for (var y = 0; y < canvasHeight; y++) {
			for (var x = 0; x < canvasWidth; x++) {
				rgbArray = heatMapColorForValue((count[x + canvasWidth * y] - min) / range);
				pixSet(y, x, imgData, canvasWidth, rgbArray);
			}
		}
	} else if (coloringType == 1) {
		var maxTemp = 0;
		for (var y = 0; y < canvasHeight; y++) {
			for (var x = 0; x < canvasWidth; x++) {
				rgbArray = heatMapColorForOffset(count[x + canvasWidth * y] / iterations,
												 (count[x + canvasWidth * y] - min) / range);
				pixSet(y, x, imgData, canvasWidth, rgbArray);
			}
		}
	}

	colorHuePreview();
}


function colorHuePreview() {
	console.log("min: " + min);
	console.log("max: " + max);
	if (coloringType == 0) {
		for (var x = 0; x < huePreviewCanvasWidth; x++) {
			for (var y = 0; y < huePreviewCanvasHeight; y++) {
				rgbArray = heatMapColorForValue(x / huePreviewCanvasWidth);
				pixSet(x, y, huePreviewImgData, huePreviewCanvasWidth, rgbArray);
			}
		}
	} else {
		for (var x = 0; x < huePreviewCanvasWidth; x++) {
			for (var y = 0; y < huePreviewCanvasHeight; y++) {
				rgbArray = heatMapColorForOffset(x / huePreviewCanvasWidth, 0); // 0 not doing anything
				pixSet(x, y, huePreviewImgData, huePreviewCanvasWidth, rgbArray);
			}
		}
	}
}

function pixSet (x, y, _imgData, w, rgbArray) {
	_imgData.data[(x + y * w) * 4] = rgbArray[0];
	_imgData.data[(x + y * w) * 4 + 1] = rgbArray[1];
	_imgData.data[(x + y * w) * 4 + 2] = rgbArray[2];
	_imgData.data[(x + y * w) * 4 + 3] = 255;
}

function heatMapColorForValue (value) {
	// h = (Math.sqrt(value)*.75 + hueOffset) % 1;
	h = (value + hueOffset) % 1;
	s = 1;
	l = .5;

	if (value == 1.0)
		l = 0;

	// l = .5 * (1-value*value*1.3);
	//l = .5 * (1-(value*value*1.5));

  return hslToRgb(h,s,l);
}

function heatMapColorForOffset (offset, normalizedValue) {
	// h = (Math.sqrt(offset)*.75 + hueOffset + offset) % 1;
	h = (offset + normalizedValue + hueOffset) % 1;
	s = 1;
	l = .5;

	if (normalizedValue == 1.0)
		l = 0;

	// l = .5 * (1-normalizedValue*normalizedValue);
	//l = .5 * (1-(value*value*1.5));

  return hslToRgb(h,s,l);
}


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
