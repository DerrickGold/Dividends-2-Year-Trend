/*=====================================================
Color Schemes for Chart data and legends
=====================================================*/
var regularColors = [{
	label: "Consumer Discretionary",
	color: "#a6cee3"
}, {
	label: "Consumer Staples",
	color: "#1f78b4"
}, {
	label: "Energy",
	color: "#b2df8a"
}, {
	label: "Financials",
	color: "#33a02c"
}, {
	label: "Health Care",
	color: "#fb9a99"
}, {
	label: "Industrials",
	color: "#e31a1c"
}, {
	label: "Information Tech",
	color: "#fdbf6f"
}, {
	label: "Materials",
	color: "#ff7f00"
}, {
	label: "Telecommunications",
	color: "#ccbb33"
}, {
	label: "Utilities",
	color: "#7c3f18"
}];


var deuteranopia = [{
	label: "Consumer Discretionary",
	color: "#a6aae3"
}, {
	label: "Consumer Staples",
	color: "#1f78b4"
}, {
	label: "Energy",
	color: "#990099"
}, {
	label: "Financials",
	color: "#0000ff"
}, {
	label: "Health Care",
	color: "#fb9a99"
}, {
	label: "Industrials",
	color: "#555555"
}, {
	label: "Information Tech",
	color: "#009900"
}, {
	label: "Materials",
	color: "#00cc00"
}, {
	label: "Telecommunications",
	color: "#cccccc"
}, {
	label: "Utilities",
	color: "#aaaaaa"
}];	

var AllColors = {
	Normal: regularColors, 
	Deuteranopia: deuteranopia
};


//from http://stackoverflow.com/questions/18517376/d3-append-duplicates-of-a-selection
function cloneSelection(appendTo, toCopy, className) {
    toCopy.each(function() {
        var clone = appendTo.node().appendChild(this.cloneNode(true));
        d3.select(clone).attr("class", className);
    });
    return appendTo;
}

//convert ( ) to negative numbers
function accountingValues(val) {
    if (val.match(/^\([\d,\.]*\)$/)) {
        val = "-" + val.replace(/[\(\)]/g, '');
    }
    return parseFloat(val);
}

/*=============================================================================
ZoomHandler:
	A zoom behaviour that works independent of d3's drag events allowing for
	proper handling of zoom end and zoom start events.
=============================================================================*/
var ZoomHandler = (function() {
    var instance;

    function _init() {
        return {
            self: this,
            minZoom: 1,
            maxZoom: 60,
            zoom: 1,
            offset: [0, 0],
            timer: 0,

            __zoomStartCb: 0,
            startZoom: function(v) {
                instance.__zoomStartCb = function(z) {
                    v(instance);
                };
            },

            __zoomEndCb: 0,
            endZoom: function(v) {
                instance.__zoomEndCb = function(z) {
                    v(instance);
                };
            },

            __zoomDuring: 0,
            onZoom: function(v) {
                instance.__zoomDuring = function(z) {
                    v(instance);
                };
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
            z: d3.behavior.zoom().on("zoom", function() {
                instance.zoomBehavior();
            }),
			zoomScale: function(min, max) {
				if(min != undefined)instance.minZoom = min;
				if(max != undefined)instance.maxZoom = max;
				instance.z.scaleExtent([instance.minZoom, instance.maxZoom]);
			}
        }
    }

    return {
        init: function(values) {
            if (!instance) {
                instance = _init();

                //initialization values
                for (var key in values) {
                    if (values.hasOwnProperty(key))
                        instance[key] = values[key];
                }

               // instance.z.scaleExtent([instance.minZoom, instance.maxZoom]);
				instance.zoomScale();
            }
            return instance;
        }
    }
})();


/*=============================================================================
ChartScaler:
	Keep track of axis and plot scales. Resizes everything appropriately 
	according to zoom--objects are re-rendered as they are zoomed into rather
	upscaled from their initial low resolution.
=============================================================================*/
var ChartScaler = (function() {
    var instance;

    function _init() {
        return {
            xAxis: d3.svg.axis(),
            xScale: d3.scale.linear(),
            xTickCount: 10,
            xTicks: function(e) {
                return instance.xAxis.ticks(e);
            },
            xRange: [0, 0],
            xDomain: [0, 100],

            yAxis: d3.svg.axis().orient("left"),
            yScale: d3.scale.linear(),
            yTickCount: 10,
            yTicks: function(e) {
                return instance.yAxis.ticks(e);
            },
            yRange: [0, 0],
            yDomain: [0, 100],

            maxTicks: 20,
			
			dotScale: d3.scale.pow().clamp(true),
			dotRange: [0, 0],
			dotDomain: [0, 100],

            scale: function(s) {

                var temp = instance.xTickCount * s;
                instance.xTicks((temp > instance.maxTicks) ? instance.maxTicks : temp);

                temp = instance.yTickCount * s;
                instance.yTicks((temp > instance.maxTicks) ? instance.maxTicks : temp);

                var newXRange = [instance.xRange[0], instance.xRange[1] * s];
                var newYRange = [instance.yRange[0], instance.yRange[1] * s];

				var newDotRange = [instance.dotRange[0] + s, instance.dotRange[1] * s];

			
                instance.xScale.domain(instance.xDomain).range(newXRange);
                instance.yScale.domain(instance.yDomain).range(newYRange);
				instance.dotScale.domain(instance.dotDomain).range(newDotRange);
			
                instance.xAxis.scale(instance.xScale);
                instance.yAxis.scale(instance.yScale);
            }
        }
    }

    return {
        init: function(values) {
            if (!instance) {
                instance = _init();
                //initialization values
                for (var key in values) {
                    if (values.hasOwnProperty(key))
                        instance[key] = values[key];
                }
            }
            return instance;
        }
    }
})();



/*=============================================================================
ChartLegend:
	Creates a horizontal chart legend based on a given legend data which must
	consist of an array of json objects with the following fields:
	{
		label: "your legend label",
		color: #ff00ff
	}
	
	This same data set is used for plot data in the EPS Scatter chart.
=============================================================================*/
var ChartLegend = (function() {
	var instance;
	
	function _init() {
		return {
			//these control the internal resolution
			//of the legend box. The on screen space
			//occupied by this box is determined by
			//height and outerWidth
			width: 1000,
			height: 60,
			
			textSpacing: 10,
			legendTitleHeight: 20,
			outerWidth: 0,
			legendData: null,
			divSelector: null,
			bgColor: "#000000",
			container: null,
			legendLabels: null,
			textHiColor: "white",
			
			//color can be dynamically changed, so 
			//we have a look up here based on the legend label's
			//name
			getColor: function (d) { 
				var temp = instance.legendData.filter(function(a) {
					if(a.label == d.label) return a;
				});
				return temp[0].color;
			},
			
			//appy color changes on redraw
			//don't need to redraw every frame, so 
			//just call as necessary
			redraw: function() {
				//update the document object
				var dom = d3.select(instance.divSelector);
				dom.attr("width", dom.attr("width"));
				
				d3.selectAll(".legendText")
					.style("fill", instance.getColor);
			},
			swapColorScheme: function(newScheme) {
				this.legendData = newScheme;
				this.redraw();
			}
		}
	}
	
	return {
		init: function(values, filterFn) {
			if (!instance) {
				instance = _init();
		        for (var key in values) {
                    if (values.hasOwnProperty(key))
                        instance[key] = values[key];
                }	
				
				//Create our base SVG to draw the legend onto
				instance.container = d3.select(instance.divSelector)
					.append("svg")
					.attr("id", "legend")
        			.attr("viewBox", "0 0 " + instance.width + " " + instance.height);
					
				//color in the background of the legend box
				instance.container.append("rect").attr("width", "100%").attr("height", "100%")
        			.attr("fill", instance.bgColor)
					.append("g");
				
				

				
				var legendNumber = 0,
					nextPos = instance.textSpacing;
				
				//next, create labels
				instance.legendLabels = instance.container.selectAll("text")
					.data(instance.legendData).enter()
				
					.append("text").text(function(d) { return d.label; })
					//set up identification scheme for each legend label
					.attr("class", "legendText")
					.attr("id", function(d) {
						var id = "legend" + legendNumber;
						d.cssID = "#" + id;
						legendNumber++;
						return id;
					})
					//set up a reference to this object for itself in the dataset
					.each(function(d) { d.this = instance.container.select(d.cssID); })
				
					.attr("x", function(d) { 
						var pos = nextPos;
						nextPos += this.getComputedTextLength() + instance.textSpacing;
						return pos;
					})
					.attr("y", function(d) { 
						return instance.legendTitleHeight + 
								(instance.height - instance.legendTitleHeight
								 + this.getBBox().height)/2; 
					})
				
					.style("fill", instance.getColor)
				
					.on("mouseover", function(d) {
						if (!d.this.attr("legendEnabled")) 
							d.this.style("fill", instance.textHiColor);
						else 
							d.this.style("fill", instance.getColor);	
					}) 
					.on("mouseout", function(d) {
						if(!d.this.attr("legendEnabled")) 
							d.this.style("fill", instance.getColor);
						else 
							d.this.style("fill", instance.textHiColor);
					})
					.on("click", function(d) {
						if (d.this.attr("legendEnabled")) {
							d.this.attr("legendEnabled", null);
							d.this.style("text-decoration", null);
							d.this.style("fill", instance.getColor);
						} else {
							d.this.attr("legendEnabled", "yes");
							d.this.style("text-decoration", "line-through");
							d.this.style("fill", instance.textHiColor);
						}
						if (filterFn) filterFn(d);
					});	
				
				instance.container.append("text").text("Interactive Legend:")
					.style("text-decoration", "underline")
					.attr("fill", "white")
					.attr("x", function() {
						return (instance.width - this.getComputedTextLength()) /2;
					})
					.attr("y", "20").append("g");
			}
			return instance;
		}
	}
})();



/*=============================================================================
EPSScatter:
	Creates a 4 quadrant scatter plot for stats related to Earnings Per Share.
	Data source is a cvs file that must have the following columns as named:
		Name, Ticker, EPS, PE, TY, NY, Sector
	where:
		Name: Company's name
		Ticker: Company's ticker symbol
		EPS: Earnings Per Share percentage
		PE: Price per earnings percentage
		TY: This years estimated eps growth percent
		NY: Next years estimated eps growth percent
		Sector: Company's sector
	
=============================================================================*/
var EPSScatter = (function() {
	var instance;
	
	function _init() {
		return {
	    	width: window.innerWidth,
        	height: window.innerHeight,
        	xPadding: 20,
			yPadding: 10,
			
    		//internal resolution of dots
    		pointContentWidth: 200,
        	pointContentHeight: 200,

     		XTitleX: 500,
			XTitleY: function() { return this.height / 2 + 20; },
			
			colorScheme: null,
    		zoomHandler: ZoomHandler.init(),
    		chartScaler: null,
			
			cullMax: 300,
			
			
			divSelector: null,
			
			//svg surfaces
			svgDisplay: null,
			svgBG: null,
			svgFG: null,
			svgPopup: null,
			
			
			resize: function(wd, ht) {
				this.chartScaler.xRange = [this.xPadding, wd - this.xPadding];
				this.chartScaler.yRange = [this.yPadding, ht - this.yPadding];
				this.svgDisplay.attr("width", wd).attr("height", ht);
				this.draw(this.zoomHandler.offset, this.zoomHandler.zoom);	
			},
			
			deleteData: function() {
				var self = this;
				self.svgBG.selectAll(".scaledData").each(function(d){
					d.this.remove();
				});

				self.chartScaler.dotScale
					.domain(self.chartScaler.dotDomain)
					.range(self.chartScaler.dotRange);
				self.zoomHandler.zoom = self.zoomHandler.minZoom;
				self.zoomHandler.offset = [0,0];
				self.zoomHandler.z.scale(self.zoomHandler.minZoom);
				self.zoomHandler.z.translate(self.zoomHandler.offset);	
			}, 
			
			redraw: function() {
				this.draw(this.zoomHandler.offset, this.zoomHandler.zoom);	
			},
			
			swapColorScheme: function(newScheme) {
				var self = this;
				this.colorScheme = newScheme;
				
				this.svgBG.selectAll(".scaledData").select("circle")
					.attr("fill", function(d) {
						var tmp = self.colorScheme.filter(function(a) {
							if(a.label == d.Sector) return a;
						});
						return tmp[0].color;
					});	
			},
			
		/*=====================================================
		Draw
		=====================================================*/
			draw: function(translation, scale) {
				var self = this;
				self.chartScaler.scale(scale);
				//redraw axis
				d3.select("#xaxis").attr("transform", "translate(" +
					translation[0] + ", " + parseFloat(self.chartScaler.yScale(0) + translation[1]) + ")")
					.call(self.chartScaler.xAxis);

				d3.select("#yaxis").attr("transform", "translate(" +
					parseFloat(self.chartScaler.xScale(0) + translation[0]) + "," + translation[1] + ")")
					.call(self.chartScaler.yAxis);

				//redraw axis title
				d3.select("#xAxisTitle").attr("transform", "translate(" +
					parseFloat(self.chartScaler.xScale(self.chartScaler.xDomain[1] / 2) + translation[0]) + "," +
					parseFloat(self.chartScaler.yScale(self.chartScaler.yDomain[1] / 8) + translation[1]) + ")");

				//redraw axis title
				d3.select("#yAxisTitle").attr("transform", "translate(" +
					parseFloat(self.chartScaler.xScale(self.chartScaler.xDomain[0] - 1) + translation[0]) + "," +
					parseFloat(self.chartScaler.yScale(0) + translation[1]) + "), rotate(-90)");


				self.svgBG.selectAll(".scaledData")
					.attr('x', function(d) {
						d.drawPosX = translation[0] + self.chartScaler.xScale(d.TY) - 
							self.chartScaler.dotScale(d.EPS);
						return d.drawPosX;
					})
					.attr('y', function(d) {
						d.drawPosY = translation[1] + self.chartScaler.yScale(d.NY) - 
							self.chartScaler.dotScale(d.EPS);
						return d.drawPosY;
					})
					.attr("width", function(d) { return self.chartScaler.dotScale(d.EPS); })
					.attr("height", function(d) { return self.chartScaler.dotScale(d.EPS); })
					.on("click", function(d) {
						(function(data) {
							cloneSelection(self.svgPopup, data.this, "popup").on("mouseout", function() {
								self.svgFG.select(".popup").remove();
							});

						})(d);
					}).each(function(d) {
						var size = self.chartScaler.dotScale(d.EPS);
						if(size >= self.cullMax || d.drawPosX < -size || d.drawPosY < -size || 
						   d.drawPosX > window.innerWidth || d.drawPosY > window.innerHeight)
						{
							if( d.this.style("display") != "block") return;

							d.this.transition().style("opacity", "0.0").each("end", function() {
								d.this.style("display", "none");
							});
						}
						else  {
							if( d.this.style("display") != "none") return ;
							d.this.style("display", "block");
							d.this.transition().style("opacity", "1.0");
						}
					});
			},
	/*=====================================================
		Load data
		=====================================================*/
			loadData: function(filename, fn) {
				var self = this;
				d3.csv(filename, function(error, dataset) {

					//remove data that has no TY and NY attribute
					dataset = dataset.filter(function(d) {
						return d.TY != "n/a" && d.NY != "n/a" && d.EPS != "n/a" && d.Sector != "n/a";
					});

					dataset.forEach(function(d) {
						d.Name = d.Name;
						d.Ticker = d.Ticker;
						d.EPS = accountingValues(d.EPS);

						if (d.TY != "n/a" && d.NY != "n/a") {
							d.TY = accountingValues(d.TY);
							d.NY = accountingValues(d.NY);
						}
					});

					//sort data by EPS so larger dots will be drawn in the background first
					dataset.sort(function(a, b) { return a.EPS - b.EPS; });


					self.chartScaler.xDomain = [ d3.min(dataset, function(d){ return d.TY; }), 
											d3.max(dataset, function(d){ return d.TY; })];
					self.chartScaler.yDomain = [ d3.max(dataset, function(d){ return d.NY; }), 
											d3.min(dataset, function(d){ return d.NY; })];

					self.chartScaler.dotDomain = [d3.min(dataset, function(d) { return d.EPS; }),
											d3.max(dataset, function(d) { return d.EPS; })];




					//create a scalable container for display data
					var idNumber = 0;
					var dataCache = self.svgBG.selectAll("svg")
						.data(dataset).enter().append("svg")
						.attr("class", "scaledData")
						.attr("id", function(d) {
							var id = "plotPoint" + idNumber;
							d.cssID = "#" + id;
							idNumber += 1;
							return id;
						})
						//create a reference to this object through the dataset
						.each(function(d) { d.this = self.svgBG.select(d.cssID); })
						//create attribute to filter with
						.attr("sector", function(d) { return d.Sector; })
						.attr("viewBox", "0 0 " + self.pointContentWidth + " " + self.pointContentHeight)
						.style("display", "block");

					dataCache.append("circle").attr("class", "companyPlot")
						.attr("cx", "50%").attr("cy", "50%").attr("r", "48%");


					dataCache.append("text").attr("class", "plotDataName")
						.text(function(d) {
							return d.Name;
						})
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "22%");

					dataCache.append("text")
						.attr("class", "tickerLabel")
						.text(function(d) {
							return d.Ticker;
						})
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "40%");

					dataCache.append("text")
						.attr("class", "plotDataText")
						.text(function(d) { return "EPS%: " + d.EPS; })
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "55%");

					dataCache.append("text")
						.attr("class", "plotDataText")
						.text(function(d) { return "TY%: " + d.TY; })
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "65%");

					dataCache.append("text")
						.attr("class", "plotDataText")
						.text(function(d) { return "NY%: " + d.NY; })
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "75%");

					dataCache.append("text")
						.attr("class", "plotDataText")
						.text(function(d) { return "P/E: " + d.PE; })
						.attr("x", function() {
							return (self.pointContentWidth - (this.getBBox().width || this.getComputedTextLength())) / 2;
						})
						.attr("y", "85%");

					//apply colors
					self.swapColorScheme(self.colorScheme);
					
					//this ensures we can always zoom in to see every element regardless of the count
					var maxZoom = self.cullMax - self.chartScaler.dotScale(self.chartScaler.dotRange[0]) + 1;
					self.zoomHandler.zoomScale(self.zoomHandler.minZoom, maxZoom);
					self.draw(self.zoomHandler.offset, self.zoomHandler.zoom);
				});
			}
			

		}
	}
	
	return {
		self: this,
/*=====================================================
Initialization
=====================================================*/
		init: function(values) {
			if (!instance) {
				instance = _init();
		        for (var key in values) {
                    if (values.hasOwnProperty(key))
                        instance[key] = values[key];
                }
				
				instance.chartScaler = ChartScaler.init({
					xRange: [instance.xPadding, instance.width - instance.xPadding],
        			yRange: [instance.yPadding, instance.height - instance.yPadding],
					dotRange: [1, 30]
    			});			
				
				instance.svgDisplay = d3.select(instance.divSelector).append("svg")
					.attr("id", "svgSurface")
					.attr("width", instance.width)
					.attr("height", instance.height)
					.call(instance.zoomHandler.z)
					 //disable d3's zoom drag to override with my own
					.on("mousedown.zoom", null)
					.on("mousemove.zoom", null)
					.on("dblclick.zoom", null)
					.on("touchstart.zoom", null)
					//my own drag to override the zoom one
					.call(d3.behavior.drag().on("drag", function() {
						instance.zoomHandler.offset[0] += d3.event.dx;
						instance.zoomHandler.offset[1] += d3.event.dy;
						instance.zoomHandler.z.translate(instance.zoomHandler.offset);

						instance.svgFG.select(".popup").remove();
						instance.draw(instance.zoomHandler.offset, instance.zoomHandler.zoom);
					}));

				//create background and add axis to it
				instance.svgBG = instance.svgDisplay.append("svg");

				//create x axis title
				instance.svgBG.append("g")
					.attr("class", "axis").attr("id", "xaxis")
				instance.svgBG.append("text")
					.attr("id", "xAxisTitle")
					.text("This Years EPS Growth (%)");

				//create y axis title
				instance.svgBG.append("g")
					.attr("class", "axis").attr("id", "yaxis");
				instance.svgBG.append("text")
					.attr("id", "yAxisTitle")
					.text("Next Years EPS Growth (%)")
					.attr("transform", "rotate(-90)")
					.attr("x", function() {
						return -(this.getBBox().width/2);
					})
					.attr("y", function() {
						return -((instance.xPadding - this.getBBox().height)/2);
					});

				instance.svgFG = instance.svgDisplay.append("svg");
				instance.svgPopup = instance.svgFG.append("g");

				var Title = instance.svgFG.append("text")
					.text("2-Year EPS Growth Overview")
					.attr("id", "chartTitle")
					.attr("x", function() {
						return (instance.width - this.getBBox().width) / 2;
					})
					.attr("y", "5%");


				instance.zoomHandler.startZoom(function(e) {
					instance.svgFG.select(".popup").remove();
					instance.svgBG.selectAll("text")
						.attr("display", "none");
				});

				instance.zoomHandler.endZoom(function(e) {
					instance.svgBG.selectAll("text").attr("display", "block");
				});

				instance.zoomHandler.onZoom(function(e) {
					instance.draw(e.offset, e.zoom);
				});
				
			}
			return instance;
		}
	}
})();


/*=============================================================================
Program Start
=============================================================================*/
document.addEventListener("DOMContentLoaded", function(e) {
	var dataSet = 1, 
		baseDir = "./",
		defaultScheme = "Normal";

	var chart = EPSScatter.init({
		xPadding: 40,
		yPadding: 40,
		divSelector: ".chartContainer",
		colorScheme: AllColors[defaultScheme]
	});

	var legend = ChartLegend.init({
			legendData: AllColors[defaultScheme],
			divSelector: "#sectorBox",
			outerWidth: (window.innerWidth / 3) * 2,
		}, 
		function(d) {
			var sectorFilter = d.label;

			chart.svgBG.selectAll("svg[sector=\"" + sectorFilter + "\"]")
				.each(function(d) {
					var obj = chart.svgBG.select(d.cssID);
					if (obj.attr("visibility") == "hidden")
						obj.attr("visibility", "visible");
					else
						obj.attr("visibility", "hidden");
				});			
		});	
	
	
	
	d3.select("#colorOptions").on("change", function(e) {
		var scheme = d3.select(this).property('value');
		chart.swapColorScheme(AllColors[scheme]);
		legend.swapColorScheme(AllColors[scheme]);
	});
	
    d3.select(window).on("resize", function() {
		legend.redraw();
		chart.resize(window.innerWidth, window.innerHeight);
    });
	
	
	chart.loadData(baseDir+"data1.csv");
	
	
	
	
	//Not official feature, just testing
	d3.select("#chartTitle").on('click', function() {
		chart.deleteData();
		dataSet++;
		if(dataSet > 2) dataSet = 1;
		chart.loadData(baseDir + "data" + dataSet + ".csv");
	});

});