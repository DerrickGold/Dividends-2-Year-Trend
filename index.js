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

function createLegend(sectors, filterFn) {
	var legendContentWidth = 1000;
	var legendContentHeight = 40;
	var textSpacing = 10;
	var containerWd = (window.innerWidth/3)*2;
	
	var sideBar = d3.select("#sectorBox").style("right", function(){
						return (window.innerWidth - containerWd)/2 + "px";
					}).append("svg")
					.attr("class", "sidebar")
					.attr("width", containerWd)
					.attr("viewBox", "0 0 " + legendContentWidth + " " +
						  legendContentHeight);

	sideBar.append("rect").attr("width", "100%").attr("height", "100%")
			.attr("fill", "black").append("g");


	function sectColor(d) { return d[d3.keys(d)[0]]; }

	var sectorIDNum = 0;
	var nextPos = textSpacing;
	var labels = sideBar.selectAll("text").data(sectors).enter()
					.append("text").text(function(d) {
						return d3.keys(d);
					})
					.attr("fill", sectColor)
					.attr("class", "sectorText")
					.attr("id", function(d) {
						var id = "sectorLegend" + 	sectorIDNum;
						d.cssID = "#" + id;
						sectorIDNum++;
						return id;
					})
					.each(function(d) {
						d.this = sideBar.select(d.cssID);
					})
					.attr("x", function(d) {
						var pos = nextPos;
						nextPos += this.getComputedTextLength() + textSpacing;
						return pos;
					})
					.attr("y", function(d){ return (legendContentHeight + this.getBBox().height)/2;})
					.on("mouseover", function(d) {
						if(d.this.attr("enabled") != "yes")
							d.this.attr("fill", "white");
						else
							d.this.attr("fill", sectColor);
					})
					.on("mouseout", function(d) {
						var obj = d.this
						if(d.this.attr("enabled") == "yes")
							d.this.attr("fill", "white");
						else
							d.this.attr("fill", function(){ return sectColor(d); });
					})
					.on("click", function(d) {
						if(d.this.attr("enabled")) {
							d.this.attr("enabled", null);
							d.this.style("text-decoration", null);
						} else {
							d.this.attr("enabled", "yes");
							d.this.style("text-decoration", "line-through");
						}
						filterFn(d);
					});

}


document.addEventListener("DOMContentLoaded", function(e) {
	

	

	var width = window.innerWidth,
		height = window.innerHeight,
		xPadding = 40, yPadding = 20;

	//configure plot data size
	var pointWidth = 0.5, pointHeight = 0.5,
		pointContentWidth = 150, pointContentHeight = 150,
		cullMin = pointWidth, cullMax = 600,
		epsScaleFactor = 10;

	var XTitleX = 500,
		XTitleY = height/2 + 20;

	var SectorColors = [
		{"Consumer Discretionary" : "red"},
		{"Consumer Staples": "blue" },
		{"Energy": "DarkGoldenRod" },
		{"Financials": "green"},
		{"Health Care": "DarkOrange" },
		{"Industrials": "grey" },
		{"Information Tech": "LightSkyBlue" },
		{"Materials": "Magenta" },
		{"Telecommunications": "Yellow" },
		{"Utilities": "SpringGreen" }
	];



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
	bg.append("g").attr("class", "axis").attr("id", "xaxis")
		//create title for axis
	bg.append("text").attr("id", "xAxisTitle").text("This Years EPS Growth (%)").style("font-size", "20px");

	bg.append("g").attr("class", "axis").attr("id", "yaxis");
	bg.append("text").attr("id", "yAxisTitle").text("Next Years EPS Growth (%)")
		.attr("transform", "rotate(-90)")
		.style("font-size", "20px");


	var overLay = svg.append("svg");
	var circlePopup = overLay.append("g");

	var Title = overLay.append("text").text("2-Year EPS Growth Overview")
					.attr("x", function(){
						return (window.innerWidth - this.getComputedTextLength())/2;
					}).attr("y", "5%")
					.style("font-size", "20")
					.style("text-decoration", "underline");



	/*overLay.append("text").attr("id", "xAxisTitle").text("This Years EPS Growth (%)")
			.attr("x", "20%").attr("y", "20%");

	overLay.append("text").attr("id", "yAxisTitle").text("Next Years EPS Growth (%)")
			.attr("x", "40%").attr("y", "40%").attr("transform", "rotate(-90)");	*/



	function draw(translation, scale) {
		chartScaler.scale(scale);

		//redraw axis
		d3.select("#xaxis").attr("transform", "translate("+
				  translation[0] + ", " + parseFloat(chartScaler.yScale(0) + translation[1]) + ")" ).call(chartScaler.xAxis);

		d3.select("#yaxis").attr("transform", "translate(" +
				  parseFloat(chartScaler.xScale(0) + translation[0]) + "," +  translation[1]+")").call(chartScaler.yAxis);

		//redraw axis title
		d3.select("#xAxisTitle").attr("transform", "translate(" +
				  parseFloat(chartScaler.xScale(chartScaler.xDomain[1] / 2) + translation[0]) + "," +
				parseFloat(chartScaler.yScale(chartScaler.yDomain[1] / 8) +  translation[1])+")");

		//redraw axis title
		d3.select("#yAxisTitle").attr("transform", "translate(" +
				parseFloat(chartScaler.xScale(chartScaler.xDomain[0] - 1) + translation[0]) + "," +
				parseFloat(chartScaler.yScale(0) +  translation[1])+"), rotate(-90)");

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
						cloneSelection(circlePopup, data.this, "popup").on("mouseout", function(){
							overLay.select(".popup").remove();
						});

				})(d);
			}).each(function(d) {
				var temp = scale * (d.EPS/epsScaleFactor/pointWidth);


				if(temp < cullMin || temp > cullMax || d.drawPosX < -temp || d.drawPosY < -temp ||
				   d.drawPosX > window.innerWidth || d.drawPosY > window.innerHeight)
					d.this.attr("display", "none");
				else
					d.this.attr("display", "block");

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
					return d.TY != "n/a" && d.NY != "n/a" && d.EPS != "n/a" && d.Sector != "n/a";
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

				//text-anchor is broken on everything but chrome on windows?
				anchor = (function textAnchoring() {
					if(navigator.userAgent.match(/chrome/i) && navigator.platform.match(/win/i)) {
						return "middle";
					}
					return "inherit";
				})();

				//create a scalable container for display data
				var idNumber = 0;
				var dataCache = bg.selectAll("svg").data(dataset).enter().append("svg")
								.attr("class", "scaledData")
								.attr("id", function(d){

									var id = "plotPoint" + idNumber;
									d.cssID = "#" + id;
									idNumber+=1;
									return id;
								})
								.each(function(d) {
									d.this = bg.select(d.cssID);
								})
								.attr("sector", function(d) { return d.Sector; })
								.attr("width", pointWidth).attr("height", pointHeight)
								.attr("viewBox", "0 0 " + pointContentWidth + " " + pointContentHeight);

				dataCache.append("circle").attr("class", "companyPlot")
							.attr("cx","50%").attr("cy", "50%").attr("r", "48%")
							.attr("fill", function(d) {
								 var tmp = SectorColors.filter(function(a) {
									if(a[d.Sector] != undefined) return a[d.Sector];
								})[0][d.Sector];

								return tmp;
							});


				dataCache.append("text").attr("class", "plotDataName")
						.text(function(d) { return d.Name; })
						.attr("x", function() {
							return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/2;
						}).attr("y", "22%").attr("text-anchor", anchor);

				dataCache.append("text").attr("class", "tickerLabel")
							.text( function(d) { return d.Ticker; })
							.attr("x", function(){
								return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/ 2;
							}).attr("y", "40%").attr("text-anchor", anchor);



				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "EPS%: " + d.EPS; })
							.attr("x", function() {
								return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/2;
							}).attr("y", "55%").attr("text-anchor", anchor);

				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "TY%: " + d.TY; })
							.attr("x", function() {
								return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/2;
							}).attr("y", "65%").attr("text-anchor", anchor);


				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "NY%: " + d.NY; })
							.attr("x", function() {
								return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/2;
							}).attr("y", "75%").attr("text-anchor", anchor);

				dataCache.append("text").attr("class", "plotDataText")
							.text(function(d) { return "P/E%: " + d.PE; })
							.attr("x", function() {
								return (pointContentWidth - (this.getBBox().width || this.getComputedTextLength()))/2;
							}).attr("y", "85%").attr("text-anchor", anchor);






				draw(zoomHandler.offset, zoomHandler.zoom);
		});

	}

	loadData('data1.csv');

	createLegend(SectorColors, function(d) {
		var sectorFilter = d3.keys(d)[0];

		bg.selectAll("svg[sector=\"" + sectorFilter + "\"]")
		.each(function(d) {
				var obj = bg.select(d.cssID);
				if(obj.attr("visibility") == "hidden")
					obj.attr("visibility", "visible");
				else
					obj.attr("visibility", "hidden");
		});

	});



	d3.select(window).on("resize", function(){
		chartScaler.xRange = [xPadding, window.innerWidth - xPadding];
		chartScaler.yRange = [yPadding, window.innerHeight - yPadding];
		d3.select("body svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
		draw(zoomHandler.offset, zoomHandler.zoom);
	});


});




