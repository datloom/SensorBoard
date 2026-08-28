import './assets/js/stomp.js'; // [Taehoon Add (for STOMP)]
// var bef = 0;

/* for storing data */
var Layers = [];
var Data = [];

/* for OSD */
var OSD_MODE = '';
var SETTING_LAYER = null;

/* for update management */
var InitialTimes = [];
var LatestUpdateTimes = [];
var LatestWindowTimes = [];

/* for aggregation display */
var AggrDict = {};
var ColorRanges = [];
var ColorDomains = [];
var AGGREGATION_TYPE = null;

/* for unsubscription */
var RAW_SUBSCRIPTION = null;

var AGGR_SUBSCRIPTION = null;

/* for layer filtering */
var LAYER_LIST_FILTER = null;

/* for raw data (initial input) */
var RETENTION_PERIOD = null;
var ACTIVE_PERIOD = null;
var TRAIL_LENGTH = null;

/* for drop queries */
var dropSequence = [];

var aggrSequence = [];

/* for layer properties setting */
var RAW_WIDTH = null;

var AGGR_OPACITY = null;

/* to get stream data */
var STREAM_NAME = null;

/* for tracking boundary value */
const UR = {
	lon: null,
	lat: null
}
const LL = {
	lon: null,
	lat: null
}

/* boundary value used to create stream */
const StreamUR = {
	lon: null,
	lat: null
}
const StreamLL = {
	lon: null,
	lat: null
}

const methodSelect = document.querySelector('#aggr .method');
const resolutionInput = document.querySelector('#aggr .resolution');

methodSelect.addEventListener('change', () => {
    resolutionInput.value =
        methodSelect.value === 'GeoHash' ? 7 : 17;
});
/* ========== MAPBOX ========== */

const deckgl = new deck.DeckGL({
	// mapStyle: 'mapbox://styles/mapbox/dark-v9',
	// mapStyle: 'mapbox://styles/mapbox/light-v9',
	mapStyle: 'mapbox://styles/mapbox/streets-v11',
  	mapboxApiAccessToken: "pk.eyJ1IjoieWVyaW5uaSIsImEiOiJjbGJkY3hrd3gwMDQzM3BzOWNveWM0dnpoIn0.Uv5OJEdkhK8XCT9HM7PJqg",
  	onViewStateChange: ({viewState}) => {
		// [YERIN ADD] Get Coordinates : HAVE TO FIX
		const viewport = new deck.WebMercatorViewport(viewState);
		const SW = viewport.unproject([0, viewport.height]);
		const NE = viewport.unproject([viewport.width, 0]);
		
		// console.log(viewport.getDistanceScales())

		LL.lon = SW[0];
		LL.lat = SW[1];
		UR.lon = NE[0];
		UR.lat = NE[1];
  	},
  	initialViewState: {
		longitude: -73.984553, 
		latitude: 40.761895,
    	zoom: 13,
		maxZoom: 30,
		minZoom: 3,
    	pitch: 30,
    	bearing: 0
	},
	getTooltip: ({layer}) => layer && layer.id,
	
  	controller: true
});

/* ========== CHANGE VIEWSTATE FUNCTIONS [NOT YET USED] ========== */

function setInitialViewState(lon, lat) {
	deckgl.setProps({
    	initialViewState: {
      		longitude: lon,
      		latitude: lat,
			zoom: 15,
			maxZoom: 30,
			minZoom: 3,
    		pitch: 30,
    		bearing: 0,
      		transitionInterpolator: new deck.FlyToInterpolator()
      	}
    });
}

/* ========== REFRESH FUNCTIONS ========== */

function refreshLayers() {
	const time_now = Date.now();
	const newLayers = [];
	const queryLayers = [];

	for (let key in Layers) {
		let theID = key;

		if (key == "aggregation") {
			if ($('#'+theID).hasClass('layer_list_element_hidden') == false) {
				queryLayers.unshift(Layers[key]);
			}
		}
		else {
			if (time_now - LatestUpdateTimes[key] > ACTIVE_PERIOD) {
				if ($('#'+theID).hasClass('layer_list_element_outdated') == false) {
					$('#'+theID).addClass('layer_list_element_outdated');
					$('#'+theID).find('.layer_title>i').addClass('fas fa-window-close');
				}
			}
			else {		
				if ($('#'+theID).hasClass('layer_list_element_outdated')) {
					$('#'+theID).removeClass('layer_list_element_outdated');
					$('#'+theID).find('.layer_title>i').removeClass('fas fa-window-close');
				}
			}

			if ($('#'+theID).hasClass('layer_list_element_hidden') == false) {
				if ($('#'+theID).hasClass('layer_list_element_outdated') == false) {
					newLayers.unshift(Layers[key]);
				}
			}	
		}
	}

	for (let key in queryLayers) {
		newLayers.unshift(queryLayers[key]);
	}

	deckgl.setProps({layers: newLayers});
	setLayerListFilter(LAYER_LIST_FILTER);
}

function refreshLayer(id, timestamp) {
	var arr = Data[id].slice();

	const type = $('#'+id).data('type');

	const r = parseInt($('#'+id).data('r'));
	const g = parseInt($('#'+id).data('g'));
	const b = parseInt($('#'+id).data('b'));
	
	const rgb = [r, g, b];

	if (type == "raw") {
		const current_time = timestamp - InitialTimes[id];
		let newLayer = Layers[id].clone({id: id, data: [arr], currentTime: current_time, getColor: d => rgb});
		Layers[id] = newLayer;
	}
	else if (type == "aggregation") {
		let newLayer = Layers[id].clone({id: id, data: arr, opacity: AGGR_OPACITY});
		Layers[id] = newLayer;
	}

	refreshLayers();
}

/* ========== SET COLOR FUNCTIONS ========== */


function setAggrColor(aggr_value) {
	for (let i=0; i<ColorRanges.length; i++) {
		if (ColorDomains[i] <= aggr_value && aggr_value < ColorDomains[i+1]) {
			const ColorRange = ColorRanges[i];
			return [ColorRange.r, ColorRange.g, ColorRange.b];
		} 
	}

	if (aggr_value >= ColorDomains[-1]) {
		const ColorRange = ColorRanges[-1];
		return [ColorRange.r, ColorRange.g, ColorRange.b];
	}
}

/* ========== SOCKET ========== */

/* for drop queries */ 
function drop_request(name, sync){
	const xhr = new XMLHttpRequest();
	const bridge_server_url = "http://127.0.0.1:8888";
	xhr.onload = () => {
		if (xhr.readyState == 4 && xhr.status == 200) {
			console.log(`Success: ${xhr.responseText}`)
		} else {
			console.log(`Error: ${xhr.responseText}`);
		}
	};


	var type = name.split('_')[0];
	switch(type){
		/* only drop specific one query */
		case 'STREAM':
		case 'TABLE':
			xhr.open("POST", bridge_server_url+"/ksql/drop/queries", sync);
			xhr.setRequestHeader("Content-Type", "application/json");
			var body = JSON.stringify({
				queries: [name]
			});

			xhr.send(body);

			$(".drop_name option:contains('"+name+"')").remove();
			$('.running_list #'+name).remove();
			break;

		/* drop several quries that created automatically and have dependencies */
		case "ALL":
			xhr.onload = () => {
				var xhr2 = new XMLHttpRequest();
				xhr2.open("POST", bridge_server_url+"/ksql/drop/queries", sync);
				xhr2.onload = () => {
					if (xhr2.readyState == 4 && xhr2.status == 200) {
						dropSequence = [];

						// RAW_SUBSCRIPTION.unsubscribe();
						RAW_SUBSCRIPTION = null;
						$(".drop_name option:contains('ALL_STREAM')").remove();
						$('.running_list #ALL_STREAM').remove();
						console.log(`Success: ${xhr2.responseText}`)
					} else {
						console.log(`Error: ${xhr2.responseText}`);
					}
				};
				xhr2.setRequestHeader("Content-Type", "application/json");
				var body = JSON.stringify({
					queries: [name]
				});
				xhr2.send(body);
				
			};

			xhr.open("POST", bridge_server_url+"/ksql/terminate/queries", sync);
			xhr.setRequestHeader("Content-Type", "application/json");
			var body = JSON.stringify({
				queries: dropSequence
			});
			xhr.send(body);

			break;
		/* drop several quries that created automatically and have dependencies */
		case "aggregation":
		
			xhr.onload = () => {
				if (xhr.readyState == 4 && xhr.status == 200) {
					
					aggrSequence = [];

					// AGGR_SUBSCRIPTION.unsubscribe();
					AGGR_SUBSCRIPTION = null;
					$(".drop_name option:contains('aggregation')").remove()
					$('.running_list #aggregation_query').remove();
					$('.aggr_loading').hide();
					console.log(`Success: ${xhr.responseText}`)
				} else {
					console.log(`Error: ${xhr.responseText}`);
				}
			};
			xhr.open("POST", bridge_server_url+"/ksql/drop/queries", sync);
			xhr.setRequestHeader("Content-Type", "application/json");
			var body = JSON.stringify({
				queries: aggrSequence
			});
			xhr.send(body);
			

			break;
		/* drop all several quries that created automatically and have dependencies */
		case "clear":
			var len = $('.drop_name option').length;
			for(var i =len-1; i>=1; i--){
				var name = $('.drop_name option:eq('+i+')').val()
				console.log("REMOVE: " + name);
				drop_request(name, false);
			}

			break;
	}
	swal({
		title: "Remove process",
		text: "Finished."
	});
}

// [Taehoon Revise (make as function)]
function onMessageReceived(payload, data_type) {
	const time_now = Date.now();
	
	// Delete expired data and layer
	for (let key in Layers) {
		const type = $('#'+key).data('type');

		if (type == "raw") {
			if (time_now - LatestUpdateTimes[key] > RETENTION_PERIOD) {
				$('#'+key).remove();

				delete Layers[key];
				delete Data[key];
			}
		}
	}

	const data = JSON.parse(payload.body);

	const id = data_type + "_" + data.ID;
	// const id = data_type + "_" + data.id;
	const timestamp = new Date(data.properties.TIME);
	// temp for timezone
	timestamp.addHours(9);
	// const timestamp = new Date(data.properties.time);
	// console.log(timestamp);
	const milliSeconds = Date.parse(timestamp.toISOString());

	const obj = {
		id: id,
		type: data_type,
		caption: id,
	};

	// If object layer doens't exist, make it.
	if (!checkLayer(obj)) {
		makeLayer(obj);
		InitialTimes[id] = milliSeconds;
	}

	LatestUpdateTimes[id] = Date.now();
	
	const vals = {
		coordinates: [data.GEOMETRY.COORDINATES[0], data.GEOMETRY.COORDINATES[1]],
		timestamp: milliSeconds
	};

	Data[id].push(vals);

	var selector = `#${id} .layer_datetime`;
	$(selector).text(timestamp.toUTCString());

	refreshLayer(id, milliSeconds);
}


Date.prototype.addHours = function(h) {
	this.setTime(this.getTime() + (h*60*60*1000));
	return this;
}

function onMessageReceivedForAggr(payload, data_type) {
	const data = JSON.parse(payload.body);
	data.geometry = JSON.parse(data.GEOMETRY);

	const coords = data.geometry.coordinates;
	const aggr_value = data.PROPERTIES[AGGREGATION_TYPE];

	const id = data_type;
	var timestamp = new Date(data.TIME);
	// temp for timezone
	timestamp.addHours(-9);
	const milliSeconds = Date.parse(timestamp.toISOString());
	var timestamp = new Date(milliSeconds);
	timestamp = timestamp.toLocaleString()

	const obj = {
		id: data_type,
		type: data_type,
		caption: data_type,
	};
	
	// If object layer doens't exist, make it.
	if (!checkLayer(obj)) {
		makeLayer(obj);
		LatestWindowTimes[data_type] = milliSeconds;
	}

	// Set Data
	if (LatestWindowTimes[data_type] < milliSeconds) {
		// Initialize
		LatestWindowTimes[data_type] = milliSeconds;
		Data[id] = [data];

		AggrDict = {};
		AggrDict[coords] =  aggr_value;
	} 
	else if (LatestWindowTimes[data_type] == milliSeconds) {
		if (coords in AggrDict) {			
			AggrDict[coords] = aggr_value;
		}
		else {
			Data[id].push(data);
			AggrDict[coords] = aggr_value;
		}
	}

	LatestUpdateTimes[id] = Date.now();

	var selector = `#${id} .layer_datetime`;
	$(selector).text(timestamp);

	refreshLayer(id, milliSeconds);
}

// [Yerin Add (for STOMP) Start]
const openSocket = (ws_url, destination, data_type) => {
	var stomp_client = Stomp.client(ws_url);

	var connect_callback = function() {
		swal({
			title: "Success!",
			text: "STOMP Socket conneted.",
			icon: "success"
		});
		console.log('STOMP Socket conneted');
		if (data_type == "raw"){
			RAW_SUBSCRIPTION = stomp_client.subscribe(destination, response => onMessageReceived(response, data_type));
		}
		else if (data_type == "aggregation") {
			AGGR_SUBSCRIPTION = stomp_client.subscribe(destination, response => onMessageReceivedForAggr(response, data_type));
		}
	};

	var error_callback = function(error) {
		swal({
			title: "Error!",
			text: 'STOMP Socket cannot conneted.',
			icon: "error"
		})
		console.log('STOMP Socket cannot conneted');
		console.log(error.headers?.message);
	};

	let connectHeader = {};
	stomp_client.connect({}, connect_callback, error_callback);
	// [Yerin Add End]
};

/* ========== LAYER CLASS ========== */

const renderLayerRawStream = (id, data) => {
	const tripslayer = new deck.TripsLayer({
		id: id,
		data: data,
		getPath: d => d.map(p => p.coordinates),
		getTimestamps: d => d.map(p => p.timestamp - d[0].timestamp),
		getColor: d => [d[0], d[1], d[2]],
		widthMinPixels: 5,
		widthMaxPixels: 10,
		widthScale: RAW_WIDTH,
		capRounded: true,
		trailLength: TRAIL_LENGTH,
		pickable: true,
	});
	Layers[id] = tripslayer;

	refreshLayers();
}


const renderLayerAggregationStream = (id, data) => {
	const geojsonlayer = new deck.GeoJsonLayer({
		id: id,
		data: data,
		stroked: false,
		widthMinPixels: 5,
		widthMaxPixels: 10,
		opacity: 1.0,
		getFillColor: d => setAggrColor(AggrDict[d.geometry.coordinates]),
  	});
  	Layers[id] = geojsonlayer;
  
 	refreshLayers();
}

/* ========== Make Layer ========== */

const getRandomInt = (max) => {
	const value =  Math.floor(Math.random() * max);
	return value;
}

function makeLayer(Obj) {
	let ID = Obj.id;
	Data[ID] = [];

	/* ----- Layer list ----- */

	let clone = $('#layer_template').clone(true, true);
	
	if (Obj.type == "raw") {
		$('.layer_list').append(clone);
	}
	else if (Obj.type == "aggregation") {
		$('.aggr_loading').hide();
		$('.aggr_layer').append(clone);
	}
	
	clone.show();
	clone.attr('id', ID);
	clone.data('type', Obj.type);

	/* ----- Set initial color -----*/
	const r = getRandomInt(255);
	const g = getRandomInt(255);
	const b = getRandomInt(255);

	/* ----- deck.gl color (on map) -----*/
	clone.data('r', r);
	clone.data('g', g);
	clone.data('b', b);

	/* ----- layer color ----- */
	if (Obj.type == "raw") {
		const rgbstr = `rgb(${r}, ${g}, ${b})`;
		$('#'+ID).css('border-left-color', rgbstr);
	}
	else {
		$('#'+ID).css('border-left-color', 'rgb(40, 40, 40)');
	}

	clone.find('.layer_title>span').text(Obj.caption);

	/* ----- Socket Measure ----- */
	if (Obj.type == "raw") {
		renderLayerRawStream(ID, Data[ID]);
	}

	else if (Obj.type == "aggregation") {
		renderLayerAggregationStream(ID, Data[ID]);
	}
}

function setLayerListFilter(layer_list_filter) {
	if (layer_list_filter == "All") {
		$('#btn_ui_all').css('background-color', 'red');
		$('#btn_ui_active').css('background-color', 'rgba(40, 40, 40)');
		$('#btn_ui_hidden').css('background-color', 'rgba(40, 40, 40)');

		$(".layer_list_element").show();
	}
	else if (layer_list_filter == "Active") {
		$('#btn_ui_all').css('background-color', 'rgba(40, 40, 40)');
		$('#btn_ui_active').css('background-color', 'red');
		$('#btn_ui_hidden').css('background-color', 'rgba(40, 40, 40)');

		$(".layer_list_element").show();
		$('.layer_list_element').filter(".layer_list_element_hidden").hide();
		$('.layer_list_element').filter(".layer_list_element_outdated").hide();
	}
	else if (layer_list_filter == "Hidden") {
		$('#btn_ui_all').css('background-color', 'rgba(40, 40, 40)');
		$('#btn_ui_active').css('background-color', 'rgba(40, 40, 40)');
		$('#btn_ui_hidden').css('background-color', 'red');

		$(".layer_list_element").hide();
		$('.layer_list_element').filter(".layer_list_element_hidden").show();
	}

}

/* +++++++++++++++++++++++++++++++++++++++++++++++++++

					JQuery

+++++++++++++++++++++++++++++++++++++++++++++++++++ */

$(document).ready(function(){

	/* ------ MENU ON/OFF ------ */

	$('#btn_ui_open').on('click', function() {
		$('#ui_base').animate({'marginLeft':'0px'}, 300).addClass('on');
		return false;
	});

	$('#btn_ui_fold').on('click', function() {
		const w = '-' + $('#ui_base').width() + 'px';
		$('#ui_base').animate({'marginLeft':w}, 300).removeClass('on');
		return false;
	});

	/* ------ YERIN ADD FOR FILTERING RAW LAYERS ------ */

	$('#btn_ui_all').on('click', function() {
		LAYER_LIST_FILTER = "All"
		setLayerListFilter(LAYER_LIST_FILTER)
		return false;
	});

	$('#btn_ui_active').on('click', function() {
		LAYER_LIST_FILTER = "Active"
		setLayerListFilter(LAYER_LIST_FILTER)
		return false;
	});

	$('#btn_ui_hidden').on('click', function() {
		LAYER_LIST_FILTER = "Hidden"
		setLayerListFilter(LAYER_LIST_FILTER)
		return false;
	});

	/* ------ YERIN ADD FOR LOAD DATA ------ */

	$('#btn_ui_query').on('click', function(){
		const query = $('#query_textarea').val(); //textarea
		
		const xhr = new XMLHttpRequest();
		const bridge_server_url = "http://127.0.0.1:8888";
		xhr.open("POST", bridge_server_url+"/ksql/query", true);
		xhr.setRequestHeader("Content-Type", "application/json");

		const body = JSON.stringify({
			query: query
		});
		
		xhr.onload = () => {
			if (xhr.readyState == 4 && xhr.status == 200) {
				swal({
					title: "Query Executed",
					text: "success.",
					icon: "success"
				});
				console.log(`Success: ${xhr.responseText}`)
			} else {
				swal({
					title: "Query Executed",
					text: "failed.",
					icon: "warning"
				});
				console.log(`Error: ${xhr.responseText}`);
			}
		};
		console.log("send query: " +query);
		xhr.send(body);
	})
		

	$('#btn_ui_raw').on('click', function() {
		// Get parameter for layer
		const retention_period = Number($('#retention_period').val());
		const active_period = Number($('#active_period').val());
		const trail_length = Number($('#trail_length').val());
		const raw_width = Number($('#raw_width').val());

		// Check validation
		if(!isValidNum(retention_period, "retention_period")){
			return false;
		} 
		if(!isValidNum(active_period, "active_period")){
			return false;
		} 
		if (!isValidNum(trail_length, "trail_length")) {
			return false;
		}
		if (!isValidNum(raw_width, "line_width")) {
			return false;
		}

		// Warning
		if (retention_period < active_period) {
			swal({
				title: "Warning!",
				text: "Data will be deleted before it is deactivated.",
				icon: "warning"
			});
		}

		// After successful validation, set global variables
		RETENTION_PERIOD = retention_period;
		ACTIVE_PERIOD = active_period;
		TRAIL_LENGTH = trail_length;
		RAW_WIDTH = raw_width;
	
		// Request raw data
		if (RAW_SUBSCRIPTION == null) { // First click
			// requestRawStreamTest(); // For test : later, you should change it to requestRawStream()
			requestRawStream();
			// Save stream name to local storage
			localStorage.setItem("stream_name", STREAM_NAME);
		}
		else {
			resetAll();

			if (!isInnerBoundary()){	
				RAW_SUBSCRIPTION.unsubscribe();
				RAW_SUBSCRIPTION = null;

				// requestRawStreamTest(); // For test : later, you should change it to requestRawStream()
				requestRawStream();
				// Save stream name to local storage
				localStorage.setItem("stream_name", STREAM_NAME);
			}
		}

        // Initialize
	    LAYER_LIST_FILTER = "All";
	    setLayerListFilter(LAYER_LIST_FILTER);

	    $('.layer_list_tab').show();
	    $('#aggr').show();

        setAggregationColorLegend();
	});


	$('#btn_ui_aggr').on('click', function() {
		// Notify to delete layer before make new one
		if (AGGR_SUBSCRIPTION != null) {
			swal({
				title: "Error!",
				text: "Delete aggregation layer first.",
				icon: "error"
			});
			return false;
		}

		// Get parameter for layer
		AGGR_OPACITY = Number($('#aggr_opacity').val());
		const method = $('#aggr_param .method').val();
		const resolution = Number($('#aggr_param .resolution').val());
		const aggregation_type = $('#aggr_param .type').val();
		const window_size = Number($('#aggr_param .window_size').val());
		const window_step = Number($('#aggr_param .window_step').val());

		// Check validation
		if(!isValidInt(resolution, "resolution")) {
			return false;
		}
		if(!isValidNum(window_size, "window_size")){
			return false;
		} 
		if (!isValidNum(window_step, "window_step")) {
			return false;
		}

		const xhr = new XMLHttpRequest();
		const bridge_server_url = "http://127.0.0.1:8888";
		xhr.open("POST", bridge_server_url+"/process/aggregation", true);
		xhr.setRequestHeader("Content-Type", "application/json");

		const body = JSON.stringify({
			stream_name: STREAM_NAME,
			method: method,
			resolution: resolution,
			type: aggregation_type,
			window_size: window_size,
			window_step: window_step
		});

		AGGREGATION_TYPE = aggregation_type;
		
		xhr.onload = () => {
			if (xhr.readyState == 4 && xhr.status == 200) {
				const response_text = JSON.parse(xhr.responseText);
				openSocket(response_text.ws_url, response_text.destination, "aggregation");
				// for drop quries
				aggrSequence.push(...response_text.stream_names);

				$('.drop_name').append("<option value=\""+"aggregation"+"\">"+"aggregation"+"</option>");	
				$('.running_list').append("<span id='aggregation_query'>aggregation_query&nbsp</prediction>")

				// show loading screen for aggregation
				$('.aggr_loading').show();
			} else {
				console.log(`Error: ${xhr.responseText}`);
			}
		};
		
		xhr.send(body);
	});

	$('#btn_ui_drop').on('click', function(){
		const name = $('.drop_name').val();
		
		drop_request(name, true);

	})
	

	/* ------ SET AGGREGATION COLOR ------ */ 

	$('#btn_ui_acl').on('click', setAggregationColorLegend); 

	/* ------ LAYER ON/OFF ------ */

	$('.layer_control').on('click', function() {

		let $list = $(this).parent().parent();

		if ($list.hasClass('layer_list_element_hidden')) {
			$list.removeClass('layer_list_element_hidden');
			$(this).find('i').removeClass('fa-eye-slash');
			$(this).find('i').addClass('fa-eye');
		} else {
			$list.addClass('layer_list_element_hidden');
			$(this).find('i').removeClass('fa-eye');
			$(this).find('i').addClass('fa-eye-slash');
		}
		refreshLayers();
		return false;
	});

	/* ------ LAYER DELETE ------ */

	$('.layer_control_delete').on('click', function() {

		if (window.confirm('Are you sure you want to delete it?')) {
			let ID = $(this).parent().parent().attr('id');
			$('#'+ID).remove();

			delete Data[ID];
			delete Layers[ID];

			if (ID == "aggregation") {
				AGGR_SUBSCRIPTION.unsubscribe();
				AGGR_SUBSCRIPTION = null; // Initialization
				drop_request(ID, true);
				// "here"
			}

			refreshLayers();
		}
		return false;
	});

	/* ------ LAYER SETTING ------ */

	$('.layer_control_config').on('click', function() {
		SETTING_LAYER = $(this).parent().parent();
		const id = SETTING_LAYER.attr('id');


		if (id == "aggregation") {
			$('#osd_title').text();
			selectOSD('osd_aggregation_layer_setting');
		}
		else {
			$('#osd_title').text('Layer settings');
			selectOSD('osd_layer_setting');
		}
		refreshLayer(id, null);
		return false;
	});

	/* ------ OSD ------ */

	$('#btn_osd_close').on('click', function() {
		$('#osd_base').fadeOut(200);
	});

	/* ------ OSD OK ------ */

	$('.osd_ok').on('click', function() {

		let ID = SETTING_LAYER.attr('id');

		if (OSD_MODE == 'osd_layer_setting') {
			let r = $('#range_r').val();
			let g = $('#range_g').val();
			let b = $('#range_b').val();

			$('#'+ID).data('r', r);
			$('#'+ID).data('g', g);
			$('#'+ID).data('b', b);
			let rgbstr = `rgb(${r}, ${g}, ${b})`;
			$('#'+ID).css('border-left-color', rgbstr);
		}

		else if (OSD_MODE == 'osd_aggregation_layer_setting') {
			const aggr_opacity =  Number($('#aggr_opacity').val());

			// Check validation
			if (!isValidNum(aggr_opacity, "aggr_opacity")) {
				return false;
			}

			// After successful validation, set global variables
			AGGR_OPACITY = aggr_opacity; 
		}

		refreshLayer(ID, null)
		$('#osd_base').fadeOut(200);
		return false;
		
	});
	
	/* ------ Functions ------ */

	function resetAll() {
		// Reset and Initialize
		if (window.confirm('Would you like to reset and receive data from this area?')) {

			// Clear Array
			Data = [];
			Layers = [];

			// Delete all child nodes of layer(list) element
			$('.layer_list').empty();
			$('.aggr_layer').empty();


			if (AGGR_SUBSCRIPTION != null) {
				AGGR_SUBSCRIPTION.unsubscribe();
				AGGR_SUBSCRIPTION = null; 
			}

			// Refresh Layers
			refreshLayers();

			// Change Button
			$('.layer_list_tab').hide();
		}
	}

	function setAggregationColorLegend() {
		const color_legend_container = document.getElementById('color_legend_container')
		const old_color_legend = document.getElementById("color_legend");
		color_legend_container.removeChild(old_color_legend);

		var scheme_value = $(".scheme_value").val();
		var range_value = $(".range_value").val();
		var range = JSON.stringify(d3[scheme_value][range_value]);

		var domain_start = Number($(".domain_start").val());
		var domain_finish = Number($(".domain_finish").val());
		var domain = JSON.stringify([domain_start, domain_finish]);

		// Set global variables for FillColor
		ColorRanges = d3[scheme_value][range_value].map(x => d3.rgb(x))
		// console.log(d3)
		// console.log(scheme_value)
		// console.log(range_value)
		// console.log(ColorRanges)
		ColorDomains = [];
		for (let i=0; i <= range_value; i++) {
			ColorDomains.push((domain_finish-domain_start)*i/range_value);
		}

		// Renew color legend on the web
		const color_legend = document.createElement("color-legend");
		color_legend.id = "color-legend"

		color_legend.setAttribute("titletext", "Aggregation color legend")
		color_legend.setAttribute("scaletype", "discrete")
		color_legend.setAttribute("domain", domain)
		color_legend.setAttribute("range", range)

		const color_legend_div = document.createElement("div");
		color_legend_div.id = "color_legend"
		color_legend_div.append(color_legend)
		color_legend_container.appendChild(color_legend_div);
	}
});

/* +++++++++++++++++++++++++++++++++++++++++++++++++++

					Functions

+++++++++++++++++++++++++++++++++++++++++++++++++++ */

function selectOSD(screen) {
	const id = SETTING_LAYER.attr('id');

	$('.osd_content').hide();
	$('#'+screen).show();

	if (screen == 'osd_layer_setting') {
		const r = $('#'+id).data('r');
		const g = $('#'+id).data('g');
		const b = $('#'+id).data('b');

		$('#range_r').val(r);
		$('#range_g').val(g);
		$('#range_b').val(b);
	}

	$('#osd_base').fadeIn(200);

	OSD_MODE = screen;
}

function requestRawStream() {
	setStreamBoundary()

	const bridge_server_url = "http://127.0.0.1:8888"
	const xhr = new XMLHttpRequest();
	xhr.open("GET", 
		bridge_server_url
		+`/fullStream?bbox=${StreamLL.lon},${StreamLL.lat},${StreamUR.lon},${StreamUR.lat}`, 
		true);
	xhr.send();

	xhr.onerror = () => {
		swal({
			title: "Error!",
			text: "Connection refused.",
			icon: "error"
		});
	}
	
	xhr.onload = () => {
		if (xhr.readyState == 4 && xhr.status == 200) {
			const response_text = JSON.parse(xhr.responseText);
			STREAM_NAME = response_text.stream_name
			openSocket(response_text.ws_url, response_text.destination, "raw");
			// for drop quries
			$('.drop_name').append("<option value=\""+STREAM_NAME+"\">"+STREAM_NAME+"</option>");
			$('.running_list').append("<span id='ALL_STREAM'>ALL_STREAM&nbsp</prediction>")
			dropSequence = response_text.terminate_query;
		} else {
			console.log(`Error: ${xhr.responseText}`);
		}
	}
}


/* ========== BOUNDARY ========== */

function setStreamBoundary() {
	const lat_diff = UR.lat - LL.lat;
	const lon_diff = UR.lon - LL.lon;

	StreamUR.lat = UR.lat + lat_diff;
	StreamUR.lon = UR.lon + lon_diff;
	StreamLL.lat = LL.lat - lat_diff;
	StreamLL.lon = LL.lon - lon_diff;
}

function isInnerBoundary() {
	if (UR.lat <= StreamUR.lat && UR.lon <= StreamUR.lon && LL.lat >= StreamLL.lat && LL.lon >= StreamLL.lon) {
		return true
	}
	else {
		return false
	}
}

/* ========== VALIDATION ========== */

function isValidInt(value, name) {
	if(!value) {
		swal({
			title: "Error!",
			text: `Fill in the ${name} with a integer!`,
			icon: "error"
		});
		return false;
	}

	if(!Number.isInteger(value)) {
		swal({
			title: "Error!",
			text: `Fill in the ${name} with a integer!`,
			icon: "error"
		});
		return false;
	}
	else {
		if (value <= 0) {
			swal({
				title: "Error!",
				text: `The ${name} must be positive.`,
				icon: "error"
			});
			return false;
		}
	}

	return true;
}

function isValidNum(value, name) {
	if(!value) {
		swal({
			title: "Error!",
			text: `Fill in the ${name} with a number!`,
			icon: "error"
		});
		return false;
	}
	else {
		if (value <= 0) {
			swal({
				title: "Error!",
				text: `The ${name} must be positive.`,
				icon: "error"
			});
			return false;
		}
	}

	return true;
}

function checkLayer(Obj) {
	return document.getElementById(Obj.id);
}