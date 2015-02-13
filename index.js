//from http://stackoverflow.com/questions/18517376/d3-append-duplicates-of-a-selection
function cloneSelection(appendTo,toCopy, className) {
  toCopy.each(function() {
		var clone = appendTo.node().appendChild(this.cloneNode(true));
		d3.select(clone).attr("class", className);
  });
  return appendTo;
}			



//create our zoomHandler so we can translate it by our 
//own drag position later on
var ZoomHandler = ( function() {
	var instance;

	function _init() {return {
		self: this,
		minZoom: 1,
		maxZoom: 60,
		zoom: 1,
		offset: [0,0],
		timer: 0,

		__zoomStartCb: 0,
		startZoom: function(v) { 
			instance.__zoomStartCb = function(z) {v(instance); };
		},

		__zoomEndCb: 0,
		endZoom: function(v) {
			instance.__zoomEndCb = function(z) { v(instance); };
		},

		__zoomDuring: 0,
		onZoom: function(v) {
			instance.__zoomDuring = function(z) { v(instance); };
		},

		zoomBehavior: function() {
				instance.__zoomStartCb();
				instance.zoom = d3.event.scale;
				instance.offset = d3.event.translate;

				//make sure text reappears after scrolling
				clearTimeout(instance.timer);
				instance.timer = setTimeout(instance.__zoomEndCb, 200);

				instance.__zoomDuring();					
		},
		z: d3.behavior.zoom().on("zoom", function(){instance.zoomBehavior();})	
	}}

	return {
		init: function(values) {
			if(!instance) {
				instance = _init();

				//initialization values
				for(var key in values) {
					if(values.hasOwnProperty(key))
						instance[key] = values[key];
				}

				instance.z.scaleExtent([instance.minZoom,instance.maxZoom]);
			}
			return instance;
		}
	}
})();


var ChartScaler = ( function() {
	var instance;

	function _init() {return {
			xAxis: d3.svg.axis(),
			xScale: d3.scale.linear(),
			xTickCount: 10,
			xTicks: function(e) {
				return instance.xAxis.ticks(e);
			},
			xRange: [0, 0],
			xDomain:[0, 100],

			yAxis: d3.svg.axis().orient("left"),	
			yScale: d3.scale.linear(),
			yTickCount: 10,
			yTicks: function(e) {
				return instance.yAxis.ticks(e);
			},
			yRange: [0, 0],
			yDomain: [0, 100],

			maxTicks: 20,

			scale: function(s) {

				var temp = instance.xTickCount * s;
				instance.xTicks((temp > instance.maxTicks) ? instance.maxTicks : temp);

				temp = instance.yTickCount * s;
				instance.yTicks((temp > instance.maxTicks) ? instance.maxTicks : temp);	



				var newXRange = [instance.xRange[0], instance.xRange[1] * s];	
				var newYRange = [instance.yRange[0], instance.yRange[1] * s];


				instance.xScale.domain(instance.xDomain).range(newXRange);
				instance.yScale.domain(instance.yDomain).range(newYRange);
				instance.xAxis.scale(instance.xScale);
				instance.yAxis.scale(instance.yScale);	
			}


	}}

	return {
		init: function(values) {
			if(!instance) {
				instance = _init();
				//initialization values
				for(var key in values) {
					if(values.hasOwnProperty(key))
						instance[key] = values[key];
				}

				//instance.xRange = [x1, x2];
				//instance.yRange = [y1, y2];
			}

			return instance;
		}
	}
})();



document.addEventListener("DOMContentLoaded", function(e) {
	
	var width = window.innerWidth, height = window.innerHeight,
		xPadding = 40, yPadding = 20

	//configure plot data size
	var pointWidth = 0.5, pointHeight = 0.5, 
		pointContentWidth = 150, pointContentHeight = 150,
		cullMin = pointWidth, cullMax = 600,
		epsScaleFactor = 10;

	var colors = {
		"Consumer Discretionary" : "red",
		"Consumer Staples": "blue",
		"Energy": "DarkGoldenRod",
		"Financials": "green",
		"Health Care": "DarkOrange",
		"Industrials": "grey",
		"Information Tech": "LightSkyBlue",
		"Materials": "Magenta",
		"Telecommunications": "Yellow",
		"Utilities": "SpringGreen"

	};



	var zoomHandler = ZoomHandler.init({
		maxZoom: 100
	});
	var chartScaler = ChartScaler.init({
		xRange: [xPadding,  width - xPadding], 
		yRange: [yPadding, height - yPadding]
	});



	var svg = d3.select(".chartContainer").append("svg")
		.attr("width", width)
		.attr("height", height)
		.call(zoomHandler.z)
		//disable d3's zoom drag to override with my own
		.on("mousedown.zoom", null)
		.on("mousemove.zoom", null)
		.on("dblclick.zoom", null)
		.on("touchstart.zoom", null)
		//my own drag to override the zoom one
		.call(d3.behavior.drag().on("drag", function() {
			zoomHandler.offset[0] += d3.event.dx;
			zoomHandler.offset[1] += d3.event.dy;
			zoomHandler.z.translate(zoomHandler.offset);

			overLay.select(".popup").remove();
			draw(zoomHandler.offset, zoomHandler.zoom);		
		}));

	//create background and add axis to it
	var bg = svg.append("svg");
	bg.append("g").attr("class", "axis").attr("id", "xaxis");
	bg.append("g").attr("class", "axis").attr("id", "yaxis");


	var overLay = svg.append("svg");
	var circlePopup = overLay.append("g");


	function draw(translation, scale) {
		chartScaler.scale(scale);

		d3.select("#xaxis").attr("transform", "translate("+ 
				  translation[0] + ", " + parseFloat(chartScaler.yScale(0) + translation[1]) + ")" ).call(chartScaler.xAxis);
		d3.select("#yaxis").attr("transform", "translate(" +  
				  parseFloat(chartScaler.xScale(0) + translation[0]) + "," +  translation[1]+")").call(chartScaler.yAxis);	


		bg.selectAll(".scaledData")
		.attr('x', function(d){
				d.drawPosX = translation[0] + chartScaler.xScale(d.TY) 
				- (scale *(d.EPS/epsScaleFactor/pointWidth/2));	

				return d.drawPosX;
			}).attr('y', function(d) {
				 d.drawPosY = translation[1] + chartScaler.yScale(d.NY) 
				 - (scale *(d.EPS/epsScaleFactor/pointHeight/2));
				return d.drawPosY;
			})
			.attr("width", function(d) { return scale * (d.EPS/epsScaleFactor/pointWidth)})
			.attr("height", function(d) { return scale * (d.EPS/epsScaleFactor/pointHeight)})
			.on("click", function(d) {
				(function(data) {
						var plot = bg.select(data.cssID);
						cloneSelection(circlePopup, plot, "popup").on("mouseout", function(){ 
							overLay.select(".popup").remove();
						});

				})(d);							
			}).each(function(d) {
				var temp = scale * (d.EPS/epsScaleFactor/pointWidth);


				if(temp < cullMin || temp > cullMax || d.drawPosX < -temp || d.drawPosY < -temp || 
				   d.drawPosX > window.innerWidth || d.drawPosY > window.innerHeight) 
					d3.select(d.cssID).attr("display", "none");
				else
					d3.select(d.cssID).attr("display", "block");

			});

	}


	zoomHandler.startZoom(function(e) {
		overLay.select(".popup").remove();
		bg.selectAll("text").attr("display", "none");
	});

	zoomHandler.endZoom( function(e) {
		bg.selectAll("text").attr("display", "block");
	});

	zoomHandler.onZoom( function(e) {
		draw(e.offset, e.zoom);	
	});



	function accountingValues(val) {
		//convert ( ) to negative numbers
		if(val.match(/^\([\d,\.]*\)$/)) {
			val = "-" + val.replace(/[\(\)]/g, '');
		}	
		return parseFloat(val);
	}



	function xData(d) { return d.TY; }
	function yData(d) { return d.NY; }


	function loadData(filename) {
		d3.csv(filename, function(error, dataset) {
				bg.selectAll(".scaledData").remove();

				//remove data that has no TY and NY attribute
				dataset = dataset.filter(function(d) {
					return d.TY != "n/a" && d.NY != "n/a" && d.EPS != "n/a";
				});

				dataset.forEach(function(d) {
						d.Name  =  d.Name;
						d.Ticker = d.Ticker;
						d.EPS = accountingValues(d.EPS);

						if(d.TY != "n/a" && d.NY != "n/a") {
							d.TY = accountingValues(d.TY);
							d.NY = accountingValues(d.NY);	
						}
				});					


				dataset.sort(function(a,b) { return b.EPS - a.EPS; });

				chartScaler.xDomain = [d3.min(dataset, xData), d3.max(dataset, xData)];
				chartScaler.yDomain = [d3.max(dataset, yData), d3.min(dataset, yData)];


				//create a scalable container for display data
				var idNumber = 0;
				var dataCache = bg.selectAll("svg").data(dataset).enter().append("svg")
								.attr("class", "scaledData")
								.attr("id", function(d){
									d.cssID = "#plotPoint" + idNumber;
									var id = "plotPoint" + idNumber;
									idNumber+=1;
									return id;
								})
								.attr("width", pointWidth).attr("height", pointHeight)
								.attr("viewBox", "0 0 " + pointContentWidth + " " + pointContentHeight);

				dataCache.append("circle").attr("class", "companyPlot")
							.attr("cx","50%").attr("cy", "50%").attr("r", "48%")
							.attr("fill", function(d) {
								/*if(d.TY > 0 && d.NY > 0) return "green";
								else if (d.TY > 0 && d.NY <= 0) return "orange";
								else if (d.TY <= 0 && d.NY <= 0) return "red";
								return "yellow";*/
								if(!colors[d.Sector])colors[d.Sector] = d.Sector;
								return colors[d.Sector];
							});


				dataCache.append("text").attr("class", "plotDataName")
						.text(function(d) { return d.Name; })
						.attr("x", function() {
							return (pointContentWidth - this.getComputedTextLength())/2;
						}).attr("y", "22%");		

				dataCache.append("text").attr("class", "tickerLabel")
							.text( function(d) { return d.Ticker; })
							.attr("x", function(){
								return (pointContentWidth - this.getComputedTextLength())/ 2;	
							}).attr("y", "40%");



				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "EPS%: " + d.EPS; })
							.attr("x", function() {
								return (pointContentWidth - this.getComputedTextLength())/2;
							}).attr("y", "55%");

				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "TY%: " + d.TY; })
							.attr("x", function() {
								return (pointContentWidth - this.getComputedTextLength())/2;
							}).attr("y", "65%");


				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "NY%: " + d.NY; })
							.attr("x", function() {
								return (pointContentWidth - this.getComputedTextLength())/2;
							}).attr("y", "75%");

				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "P/E%: " + d.PE; })
							.attr("x", function() {
								return (pointContentWidth - this.getComputedTextLength())/2;
							}).attr("y", "85%");						



				draw(zoomHandler.offset, zoomHandler.zoom);
				console.log(colors);
		});

	}

	loadData('data1.csv');
	d3.select(window).on("resize", function(){
		chartScaler.xRange = [xPadding, window.innerWidth - xPadding];
		chartScaler.yRange = [yPadding, window.innerHeight - yPadding];
		d3.select("body svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
		draw(zoomHandler.offset, zoomHandler.zoom);	
	});	
	
	
});




