/*** GLOBALS ***/
var startReal,
	endReal,
	startComplex,
	endComplex,
	iterations,
	coloringType,
	hueOffset,
	exponent,
	count;

var isRunning;

var canvas,
	huePreviewCanvas,
	context,
	canvasWidth,
	canvasHeight,
	huePreviewCanvasWidth = 200,
	huePreviewCanvasHeight = 45;

$(document).ready(function() {
	// set initial window values
	resetWindow();
	exponent = 2;

	canvas 	= $('#canvas');
	context = $(canvas)[0].getContext("2d");

	huePreviewCanvas = $('#huePreviewCanvas');
	huePreviewContext = $(huePreviewCanvas)[0].getContext("2d");

	setupView();
});

function resetWindow() {
	startReal 	 = - 2.5;
	endReal 	 = 1.5;
	startComplex = - 2.1;
	endComplex 	 = 2.0;
	iterations   = 100;
	coloringType = 1;
	hueOffset = 0;
}

function pointIsIn(px, py, originX, originY, width, height) {
	if (px < originX || px > originX + width)
		return false;
	if (py < originY || py > originY + height)
		return false;
	return true;
}

function getRealIncrement() {
	return Math.abs(endReal - startReal) / (canvasWidth / window.devicePixelRatio);
}

function getImaginaryIncrement() {
	return Math.abs(endComplex - startComplex) / (canvasHeight / window.devicePixelRatio);
}