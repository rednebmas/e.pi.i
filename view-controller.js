var zoomBox, locationDiv; // DOM elements
var zoomBoxSize, savedLocations; 

/**
 *  This sets up the look of the page.
 *  It is called from common.js when the document has loaded.
 */
function setupView() {;

	/*** GET DOM ELEMENTS & THEIR CSS ***/
	zoomBox 	= $('#zoomBox');
	locationDiv = $('#location');
	zoomBoxSize = 100; // $('#zoomBox').width(); <- weird bug where it set size > 1000 sometimes

	/*** EVENT HANDLERS ***/
	$(window).mousemove(mouseMoved); // makes the zoom box follow the mouse

	$('#zoomBox').click(mouseClick); // change fractal window
	$('#saveImageButton').click(saveImage); // save image on canvas
	$('#saveLocationButton').click(saveLocation); // save current location on canvas
	$('#redrawButton').click(changeWindow); 
	$('#resetButton').click(reset);
	$('#fullscreenCheckbox').click(fullscreen);
	$("input[name='coloringRadio']").click(changeColoringType);

	$('#iterationSlider').on("input change", iterationSlider);
	$('#exponentSlider').on("input change", exponentSlider);
	$(window).on('DOMMouseScroll mousewheel', mouseScroll); // change the size of the zoom box on scroll

	$('#hueSlider').change(hueSlider);


	/*** VIEW CUSTOMIZATION ***/
	positionCanvas();
	retinaEnable();

	/*** SAVED LOCATIONS ***/
	// get cookie
	var cookieValue = $.cookie("saved-locations");

	// the cookie doesn't exist, create a fake one so we can add to it
	// and so that json.parse doesn't error
	if (!cookieValue) {
		cookieValue = '[]';
		console.log("No saved locations found.");
	}

	// parse json
	savedLocations = JSON.parse(cookieValue);

	// put values into drop down list
	loadSavedLocations();


	// update info boxes
	updateSizeDiv();
	updateLocationDiv();

	/*** BEGIN COMPUTATION ***/
	start();
}

/**/
/*** EVENT HANDLERS ***/
/**/

function mouseMoved (event) {
	if (!isRunning) {
		$(zoomBox).animate({'top': event.clientY - zoomBoxSize/2 + 'px',
						 'left': event.clientX - zoomBoxSize/2 + 'px'}, 0, function(){});
	}

	// find the value of the count array under the cursor
	var mousePos = mousePositionInCanvas(event);

	if (count && pointIsIn(mousePos[0], mousePos[1], 0, 0, canvasWidth, canvasHeight)) {
		// var value = imgData[(mousePosInCanvasX + mousePosInCanvasY * canvasWidth) * 4];
		var value = "count[" + (mousePos[0] + mousePos[1] * canvasWidth) + "] = ";
		value += count[mousePos[0] + mousePos[1] * canvasWidth];
		document.getElementById("countValue").innerHTML = value;
		document.getElementById("cursorLocation").innerHTML = "(" + mousePos[0] + ", " + mousePos[1] + ")";
		var countValueColor = document.getElementById("countValueColor");
		rgbArray = heatMapColorForOffset(count[mousePos[1] + canvasWidth * mousePos[0]] / iterations,
										 (count[mousePos[1] + canvasWidth * mousePos[0]] - min) / range);
		countValueColor.style.backgroundColor = "rgb(" + rgbArray[0] + "," + rgbArray[1] + "," + rgbArray[2] + ")";
	}
}

function mouseScroll(event) {
	if(event.originalEvent.detail > 0 || event.originalEvent.wheelDelta < 0) { 
		/// scrolled down
		// otherwise zoom box size could become negative or zero
		if (zoomBoxSize > 10)
			zoomBoxSize = zoomBoxSize - 2; 
	} else {
		/// scroll up
		if (zoomBoxSize < canvasHeight)
			zoomBoxSize += 2;
	}

	// change the size
	zoomBox.css('width', zoomBoxSize);
	zoomBox.css('height', zoomBoxSize);

	// this re-centers the zoom box
	mouseMoved(event);

	//prevent page fom scrolling
	return false;
}

function mouseClick (event) {
	if (!isRunning) {
		// find the position of the cursor in canvas
		var canvasLeftOffset = (window.innerWidth-canvas.width())/2,
			canvasTopOffset = (window.innerHeight-canvas.height())/2;
		var clickPosInCanvasX = event.pageX - canvasLeftOffset - zoomBoxSize / 2,
			clickPosInCanvasY = event.pageY - canvasTopOffset - zoomBoxSize / 2;

		// get the increment for each plane
		var realIncrement = getRealIncrement(),
			complexIncrement = getImaginaryIncrement();

		// calculate the new start and end for each plane
		startReal = startReal + clickPosInCanvasX * realIncrement,
		endReal   =  startReal + zoomBoxSize * realIncrement;
		startComplex = startComplex + clickPosInCanvasY * complexIncrement,
		endComplex 	 = startComplex + realIncrement * zoomBoxSize;

		updateLocationDiv();
		changeWindow();
	}
}

function reset() {
	// reset fractal window
	resetWindow();

	// update view
	updateSlider('exponentSlider', exponent, 100);
	updateSlider('iterationSlider', iterations, 1);
	updateSlider('hueSlider', Math.floor(hueOffset * 360), 1);

	// render
	changeWindow();
}

function fullscreen() {
	// if the user wants fullscreen
	if (this.checked) {
		// get the increment for each plane and current margins
		var realIncrement = getRealIncrement(),
			complexIncrement = getImaginaryIncrement(),
			marginLeft = parseInt($(canvas).css('margin-left')),
			marginTop = parseInt($(canvas).css('margin-top'));

		// change the fractal window
		startReal -= realIncrement * marginTop;
		endReal += realIncrement * marginTop;
		startComplex -= complexIncrement * marginLeft;
		endComplex += complexIncrement * marginLeft;


		// make the canvas fullscreen
		//$(canvas).width(window.innerWidth);
		//$(canvas).height(window.innerHeight);

		// change the global variables
		canvasWidth = window.innerWidth;
		canvasHeight = window.innerHeight;
		canvasWidth *= window.devicePixelRatio;
		canvasHeight *= window.devicePixelRatio;

		// create new imgData
		imgData = context.createImageData(canvasWidth, canvasHeight);

		centerCanvas();

		// update view
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		changeWindow();
		updateLocationDiv();
	} else {
		positionCanvas();
	}
}

function saveImage() {
	var strDataURI = $(canvas)[0].toDataURL("image/png");
	window.open(strDataURI, '_blank');
}

function saveLocation() {
	var locationName = prompt("Name this location: ");

	if (locationName) {
		// create associative array of location information
		var location = {
						startReal : startReal,
						endReal : endReal,
						startComplex : startComplex,
						endComplex : endComplex,
						name: locationName,
						exponent: exponent,
						iterations: iterations,
						hueOffset: hueOffset,
						coloringType: coloringType
					   };

		// add new location to our list of saved locations
		savedLocations.push(location);
		// save cookie in json format
		$.cookie("saved-locations", JSON.stringify(savedLocations));
		console.log("Location saved.");

		// empty table and reload it
		$("#savedLocationsTable").html("");
		loadSavedLocations();
	}
}

function deleteLocation(index) {
	// delete location from our array
	savedLocations.splice(index, 1);

	// delete from cookies
	$.cookie("saved-locations", JSON.stringify(savedLocations));

	// empty table and reload it
	$("#savedLocationsTable").html("");
	loadSavedLocations();
}

function loadSavedLocations() {
	var savedLocationsTbl = $("#savedLocationsTable");

	$.each(savedLocations, function(index, value) {
		var row = $("<tr>");

		// name of location
		row.append($("<td>").text(value.name));

		// delete button
		var deleteButton = $('<button>X</button>').click(function () { 
			deleteLocation(this.value);
		});
		$(deleteButton).val(index);
		row.append(deleteButton);

		// draw button
		var drawButton = $('<button>Draw</button>').click(function () {
			// set global start and end parameters
			startReal = savedLocations[this.value].startReal;
			endReal = savedLocations[this.value].endReal;
			startComplex = savedLocations[this.value].startComplex;
			endComplex = savedLocations[this.value].endComplex;
			exponent = savedLocations[this.value].exponent;
			iterations = savedLocations[this.value].iterations;
			hueOffset = savedLocations[this.value].hueOffset;

			// update interface
			updateLocationDiv();
			updateSlider('exponentSlider', exponent, 100);
			updateSlider('iterationSlider', iterations, 1);
			updateSlider('hueSlider', Math.floor(hueOffset * 360), 1);

			// render
			changeWindow();
		});
		$(drawButton).val(index);
		row.append(drawButton);

	    savedLocationsTbl.append(row);
	});	
}

function changeColoringType() {
	updateStatus("Changing coloringType");
	coloringType = this.value;
	recolor();
}

function hueSlider() {
	var sliderValueElement = document.getElementById(this.id + 'Value');
	sliderValueElement.innerHTML = this.value;

	hueOffset = this.value / 360;
	recolor();
}

function iterationSlider() {
	var sliderValueElement = document.getElementById(this.id + 'Value');
	sliderValueElement.innerHTML = this.value;

	iterations = this.value;
}

function exponentSlider() {
	var exponentValueElement = document.getElementById(this.id + 'Value');
	exponentValueElement.innerHTML = this.value / 100;

	exponent = this.value / 100;
}

function updateSizeDiv() {
	$('#size').html("Size: " + canvasWidth + " px");
}

function updateStatus(text) {
	document.getElementById("status").innerHTML = "Status: " + text;
}

function updateLocationDiv() {
	$('#locationStartReal').html(startReal.toFixed(5));
	$('#locationEndReal').html(endReal.toFixed(5));
	$('#locationStartImaginary').html(startComplex.toFixed(5));
	$('#locationEndImaginary').html(endComplex.toFixed(5));
}

/**
 * @param value: what the text should say
 * @param factor: factor for slider
 */
function updateSlider(id, value, factor) {
	$('#' + id).val(value * factor);
	$('#' + id + 'Value').html(value);
}

/**/
/*** HELPER METHODS ***/
/**/

/**
 * Returns an array of the position of the mouse in the canvas
 */
function mousePositionInCanvas(event) {
	var mousePosInCanvasX = event.pageX - parseInt($(canvas).css('margin-left')),
		mousePosInCanvasY = event.pageY - parseInt($(canvas).css('margin-top'));
	return [mousePosInCanvasX * window.devicePixelRatio,
			mousePosInCanvasY * window.devicePixelRatio];
}

/**/
/*** VIEW SETUP ***/
/**/

/**
 *  Makes the canvas a square
 */
function positionCanvas () {
	// find minimum of window width and height
	var size = Math.min(window.innerWidth, window.innerHeight);

	// set canvas width and height to be square
	$(canvas).width(size);
	$(canvas).height(size);

	// change the global variables
	canvasWidth = size;
	canvasHeight = size;

	centerCanvas();
}

/**
 * Centers canvas using css
 */
function centerCanvas() {
	$(canvas).css('margin-left', (window.innerWidth-$(canvas).width())/2 + 'px');
	$(canvas).css('margin-top', (window.innerHeight-$(canvas).height())/2 + 'px');
}

/**
 *	If retina device, increase pixel ratio for the canvas
 */
function retinaEnable () {
	if (window.devicePixelRatio) {
		$(canvas).attr('width', canvasWidth * window.devicePixelRatio);
		$(canvas).attr('height', canvasHeight * window.devicePixelRatio);
		$(canvas).css('width', canvasWidth);
		$(canvas).css('height', canvasHeight);

		canvasWidth *= window.devicePixelRatio;
		canvasHeight *= window.devicePixelRatio;

		context.scale(window.devicePixelRatio, window.devicePixelRatio);   
	}
}