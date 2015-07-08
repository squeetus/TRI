/////////////////////////////////////////////////////////////////////////////
//      
//          TRI Dataset Visualization 
//          version 1.2
//
//          Created by 
//              David Burlinson
//              Spring 2015 (v1.1)
//
//              Modified July 2015 (v1.2)
//
//                                             _
//                                            | \
//                                            | |
//                                            | |
//                       |\                   | |
//                      /, ~\                / /
//                     X     `-.....-------./ /
//                      ~-. ~  ~              |
//                         \             /    |
//                          \  /_     ___\   /
//                          | /\ ~~~~~   \ |
//                          | | \        || |
//                          | |\ \       || )
//                         (_/ (_/      ((_/
//
//
//
//
//
/////////////////////////////////////////////////////////////////////////////       
    

/////////////////////////////////////////////////////////////////////////////
//      
//          P R O T O T Y P E S
//
/////////////////////////////////////////////////////////////////////////////

//Move to front
d3.selection.prototype.moveToFront = function() { 
    return this.each(function() { 
      this.parentNode.appendChild(this); 
    }); 
}; 

/////////////////////////////////////////////////////////////////////////////
//      
//          G L O B A L S
//
/////////////////////////////////////////////////////////////////////////////

var scaleFactor = 1;                                                        // initial scale factor
var translate = [0,0];                                                      // initial translation tuple
var nodeSize = 2;                                                           // base radius size for facilities
var strokeWidth = 0.5;                                                      // base stroke width for facilities
var fac = null;                                                             // selection global for facilities
var states = null;                                                          // selection global for states
var stateLines = null;                                                      // size variable for stateLines
var brushing = false;                                                       // is the user currently brushing (sentinel)
var selectingState = false;                                                 // is the user currently selecting a state (sentinel)
var selectedState = null;                                                   // selected state id
var toolContext = "select";                                                 // context of interaction (select, brush)
var total = null; resetTotal();                                             // create and initialize total 
var width = window.innerWidth - 15,                                         // width and height values 
    height = window.innerHeight - 15,
    height1 = height - 200;
var x_scale = d3.scale.linear().domain([0, width]).range([0, width]);       // X and Y scales for line chart
var y_scale = d3.scale.linear().domain([0, height1]).range([0, height1]);   //

// Zoom behavior
var zoom = d3.behavior.zoom()
    .scaleExtent([0.75,100])
    .x(x_scale)
    .y(y_scale)
    .on("zoom", zoomHandler)
    .on("zoomstart", zoomstart)
    .on("zoomend", zoomend)
    zoom.scale(1)
    zoom.translate(translate);

// Quadtree for facility mapping
var quadtree = d3.geom.quadtree()
    .extent([[-1, -1], [width + 1, height1 + 1]])
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    });

// Color scale for facilities
var color = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

// ALBERSUSA projection function
var projection = d3.geo.albersUsa()
    .scale(1500)
    .translate([width / 2, height1 / 2]);

// Path global
var path = d3.geo.path()
    .projection(projection);




/////////////////////////////////////////////////////////////////////////////
//      
//          T O O L T I P
//
/////////////////////////////////////////////////////////////////////////////


var tooltip = d3.select('#tooltip')
     .attr('class', 'popupMessage')
     .style('opacity', 0);

function popupTooltip(message) {
    tooltip.text(message);
    tooltip.transition().delay(50).style('opacity', 0.9).duration(300).transition().delay(1500).style('opacity', 0.0).duration(750);
}



/////////////////////////////////////////////////////////////////////////////
//      
//          L A Y E R S
//
/////////////////////////////////////////////////////////////////////////////

// Parent SVG element
var svg = d3.select("#map")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height1)
    .call(zoom);

// MAP layer
var usaLayer = svg.append("g")
    .style("stroke-width", "1.5px");

// Facility Layer
var quadTreeLayer = svg.append("g")
    .style("stroke-width", "1.5px");
    
// Background rectangle
var backgroundRect = quadTreeLayer.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height1)
    .on("click", clickedBackground);


function clickedBackground() {
//    console.log("clickedBackground");
    clearState();
};

function reorderLayers() {
    console.log("reorder layers");
    //backgroundLayer.moveToFront();
    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
    brushLayer.moveToFront();
}



/////////////////////////////////////////////////////////////////////////////
//      
//          Z O O M   E V E N T S
//
/////////////////////////////////////////////////////////////////////////////

function zoomstart() { 
//    console.log("zoomstart");
     if (toolContext == ("brush") && event.shiftKey) 
         d3.select("#graph")
            .style("opacity", 0);
}
        
function zoomHandler() {
    
    if (toolContext == ("brush") && event.shiftKey) {
        d3.select(".brush")
            .style("display", "block"); 
        d3.select("#graph")
            .style("opacity", 1);
        d3.select("#key")
            .style("opacity", 1);
        zoom.translate(translate);
        zoom.scale(scaleFactor);
    } else if(toolContext == ("brush")) {
        d3.select(".brush")
            .style("display", "none"); 
       
        translate = d3.event.translate;
        scaleFactor = d3.event.scale;
    } else {
        clearBrush();
        translate = d3.event.translate;
        scaleFactor = d3.event.scale;
//        d3.select(".brush")
//            .style("display", "none"); 
//        brush.clear();   
    }
    
    
    quadTreeLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    usaLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    fac.attr("r", nodeSize/scaleFactor );
    fac.attr("stroke-width", strokeWidth/scaleFactor);
    stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
}
    
function zoomend() {  
    if(toolContext == ("brush") && !event.shiftKey) {
        clearEffects();
        brushLayer.moveToFront();
        d3.selectAll(".brush").call(brush.clear());
        d3.select(".brush")
            .style("display", "block"); 
        toolContext = "brush";
    }
}



/////////////////////////////////////////////////////////////////////////////
//      
//          U S A
//
/////////////////////////////////////////////////////////////////////////////
    
///TRI/project2/data/us.json
d3.json("data/us.json", function(error, us) {
  states = usaLayer.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return; 
        clickedState(d);
      });
    
    //Counties
    //    usaLayer.insert("path", ".graticule")
    //      .datum(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b && !(a.id / 1000 ^ b.id / 1000); }))
    //      .attr("class", "countyMesh")
    //      .attr("d", path);
  
    stateLines = usaLayer.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "stateMesh")
      .attr("d", path)
      .attr("stroke-width", strokeWidth*2);
      
});


function clickedState(d) {
    highlightState(d);
}

function highlightState(d) {
    var thisState = d.id;
    if(thisState == selectedState) {
        states.classed("fade", false);
        fac.classed("fade", function(d) { return false; });
        selectedState = null;
    } else { 
        states.classed("fade", function(d) { return d.id != thisState;  });
        fac.classed("fade", function(d) { return true; });
        selectedState = thisState;
    }
}

function clearState() {
    selectedState = null;
    selectingState = false;
    states.classed("fade", false);
    //console.log("clearing state");
    fac.classed("fade", function(d) { return false; });
}


    
/////////////////////////////////////////////////////////////////////////////
//      
//          F A C I L I T I E S
//
/////////////////////////////////////////////////////////////////////////////    
    


//var facilityLayer = svg.append("g")
//    .style("stroke-width", "1.5px");

d3.json("data/facilities.json", function(error, f) {
    //console.log(error);
    var arr = [];
    var x, y;
    var domain = [];
    var flag = true;
    var totalRelease, totalTreatment, totalRecycling, totalRecovery, totals;
    
    for(facility in f.facilities) {
        if(projection([f.facilities[facility].long, f.facilities[facility].lat]) == null) {
            f.facilities[facility].x = f.facilities[facility].y = null;   
        } else {
            f.facilities[facility].x = projection([f.facilities[facility].long, f.facilities[facility].lat])[0];
            f.facilities[facility].y = projection([f.facilities[facility].long, f.facilities[facility].lat])[1];
            
            totalRecovery = totalRecycling = totalTreatment = totals = totalRelease = 0;
            
            var badYears = 0;
            for(i = 0; i < 27; i++) {
                totalRelease += f.facilities[facility].releases[i];
                totalTreatment += f.facilities[facility].treatment[i];
                totalRecycling += f.facilities[facility].recycling[i];
                totalRecovery += f.facilities[facility].recovery[i];
            }
            totals += totalRelease + totalTreatment + totalRecycling + totalRecovery; 
        
            if(totals > 0)
                totals = totalRelease / totals;

            f.facilities[facility].colorIndex = totals;
            domain.push(totals);           
            arr.push(f.facilities[facility]);
        }
    }
     color.domain([d3.max(domain), d3.mean(domain), d3.min(domain)])
//console.log(d3.extent(domain));
    
    quadtree = quadtree(arr);
    
    quadTreeLayer = usaLayer.selectAll(".node")
    // quadTreeLayer.selectAll(".node")
        .data(nodes(quadtree))
      .enter().append("rect")
        .attr("class", "node")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.width; })
        .attr("height", function(d) { return d.height; })
        .attr("pointer-events", "none");

//    facilityLayer = quadTreeLayer.selectAll(".facility")
    fac = usaLayer.selectAll(".facility")
        .data(arr)
      .enter().append("circle")
        .attr("class", "facility")
        .attr("fill", function(d, i) { return color(d.colorIndex); }) 
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", nodeSize)
        .attr("stroke-width", strokeWidth)
        .attr("id", function(d) {return "f" + d.facilityName;})
        .on("mouseover", hover)
        .on("mouseout", out)
        .call(zoom);
    
});  

// Collapse the quadtree into an array of rectangles.
function nodes(quadtree) {
  var nodes = [];
  quadtree.visit(function(node, x1, y1, x2, y2) {
    nodes.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
  });
  return nodes;
}

// Find the nodes within the specified rectangle.
function search(quadtree, x0, y0, x3, y3) {
  quadtree.visit(function(node, x1, y1, x2, y2) {
    var p = node.point;
    if (p) {
      p.scanned = true;
      p.selected = (p.x >= x0) && (p.x < x3) && (p.y >= y0) && (p.y < y3);
    }
    return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
  });
}

function hover(d) {
    if(brushing)
        return;

    d3.select("#graph")
            .style("opacity", 1);
    
    //Update position of dataView div
    var dataDiv = d3.select("#dataView")
        .style("left", function() {
            if(d3.event.pageX >= width/2)
                return d3.event.pageX-350 + "px"; 
            else
                return d3.event.pageX+50 + "px";
        })
        .style("top", d3.event.pageY - 25 + "px");
    
   //Style the selected facility
    d3.select(this)
        .classed("brushed", true);
    
    //Create line graph
    lineGraph(d);
 
    //Show data div
    showData(dataDiv, d);
}
        
function out() { 
    d3.select(this)
        .classed("brushed", false);

    showData(null, null);
    d3.select("#graph").selectAll("*").remove();
    
    d3.select("#key")
        .style("opacity", 0);
}

function showData(facility, d) {
    var dataView = d3.select("#dataView");
    if(facility == null) {
        dataView.style("opacity", "0");
        //dataView.text("");
    } else {  
        dataView.style("opacity", ".95");
        var info = "";
        info += "Facility Name: " + d.facilityName + "<br />";
        //info += "test: " + d.colorIndex + "<br />";
        dataView.html(info);
    }
}
    
function clearFacilities() {
    fac.each(function(d) { d.scanned = d.selected = false; });
    fac.classed("brushed", function(d) { return d.selected; } );
    
    hideGraph();
}



/////////////////////////////////////////////////////////////////////////////
//      
//          B R U S H
//
///////////////////////////////////////////////////////////////////////////// 

var brush = d3.svg.brush()
    .x(zoom.x())
    .y(zoom.y())
    .on("brush", brush)
    .on("brushstart", brushstart)
    .on("brushend", brushend);

var brushLayer = svg.append("g")
    .attr("class", "brush")
    .call(brush);

// Clear brush at first
d3.select(".brush")
    .style("display", "none"); 
d3.selectAll(".brush").call(brush.clear());

d3.select("#graph") 
    .style("opacity", 0);
d3.select("#key")
    .style("opacity", 0);

function brushstart() {
//    console.log("brushstart");
    brushing = true;
//    facilities.each(function(d) { d.scanned = d.selected = false; });
    clearFacilities();
//    resetTotal();
//    lineGraph(total);
}


function brushed() {
    console.log("brushed");
}

function brushend() {
    
    if(!event.shiftKey) {
        brushing = false;
        brush.clear();
        usaLayer.moveToFront();
        quadTreeLayer.moveToFront();
        brushLayer.moveToFront();   
        
        return;
    }
    
    var these = d3.select(null);
    var extent = brush.extent();
    fac.each(function(d) { d.scanned = d.selected = false; });
    search(quadtree, extent[0][0], extent[0][1], extent[1][0], extent[1][1]);
    fac.classed("brushed", function(d) { return d.selected; });
    fac.each(function(d, i) {
        if(!d.selected && total.contains.indexOf(i) >= 0) {
            total.contains.splice(total.contains.indexOf(i), 1);
            for(var j = 0; j < 27; j++) {
                total.releases[j] -= d.releases[j];
                total.recycling[j] -= d.recycling[j];
                total.treatment[j] -= d.treatment[j];
                total.recovery[j] -= d.recovery[j];
            }
        }
        
       if(d.selected && total.contains.indexOf(i) < 0) {
            total.contains.push(i);
            for(var i = 0; i < 27; i++) {
                total.releases[i] += d.releases[i];
                total.recycling[i] += d.recycling[i];
                total.treatment[i] += d.treatment[i];
                total.recovery[i] += d.recovery[i];
            }
       }
    });
    
    if(total.contains.length < 1) {
        resetTotal();
    }
    
    lineGraph(total);
    //console.log("brushend");
    brushing = false;
    brush.clear();
    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
    brushLayer.moveToFront();
}


function clearBrush() {
//    console.log("clearing brush");
    d3.select(".brush")
        .style("display", "none"); 
    d3.selectAll(".brush").call(brush.clear());
    fac.each(function(d) { d.scanned = d.selected = false; });
    fac.classed("brushed", function(d) { return d.selected; } );
    
    hideGraph();
}



/////////////////////////////////////////////////////////////////////////////
//      
//          L I N E   G R A P H
//
///////////////////////////////////////////////////////////////////////////// 

function lineGraph(d) {
    d3.select("#key")
        .style("opacity", 1);
    
    var graph = d3.select("#graph")
        //.attr("id", "graph")
        .attr("width", width)
        .attr("height", 200);
        
    graph.selectAll("*").remove();
        
    var xScale = d3.scale.linear().range([100, width-50]).domain([1986, 2013]),
        
    yScale = d3.scale.linear().range([200-25, 25]).domain(
        [
            Math.min(d3.min(d.releases), d3.min(d.recycling), d3.min(d.recovery), d3.min(d.treatment)),
            Math.max(d3.max(d.releases), d3.max(d.recycling), d3.max(d.recovery), d3.max(d.treatment))
        ]),
                        
    xAxis = d3.svg.axis()
        .scale(xScale)
        .tickFormat(d3.format("####")),
                        
    yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    graph.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (200 - 25) + ")")
        .call(xAxis);
    graph.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (100) + ",0)")
        .call(yAxis);
    var lineGen = d3.svg.line()
        .x(function(d,i) {
            return xScale(i + 1986);
        })
        .y(function(d) {
            return yScale(d);
        })
        .interpolate("linear");
    
    // Add a y-axis label.
    graph.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Chemical Usage (lbs)");
    
    graph.append('svg:path')
        .attr('d', lineGen(d.releases))
        .attr('stroke', 'red')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
    graph.append('svg:path')
        .attr('d', lineGen(d.recycling))
        .attr('stroke', 'green')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
   graph.append('svg:path')
        .attr('d', lineGen(d.treatment))
        .attr('stroke', 'purple')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
   graph.append('svg:path')
        .attr('d', lineGen(d.recovery))
        .attr('stroke', 'lightblue')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
}
    
function resetTotal() {
    total = {
        "releases":     [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0], 
        "recycling":    [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0], 
        "treatment":    [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0], 
        "recovery":     [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        "contains":     [] 
    }
}

function hideGraph() {
//    console.log("hidegraph");
    d3.select("#graph") 
        .style("opacity", 0);
    d3.select("#key")
        .style("opacity", 0);
}




/////////////////////////////////////////////////////////////////////////////
//      
//          U T I L I T Y   M E T H O D S
//
/////////////////////////////////////////////////////////////////////////////
    
function clearEffects() {
    //console.log("clearEffects ");
    if(brush)
        clearBrush();
    
    if(states)
        clearState();
    
    d3.select("#graph") 
        .style("opacity", 0);
};



////////////////////////////////////////////////////////////
//
//              I N I T   F U N C T I O N S
//
////////////////////////////////////////////////////////////

function init() {
//    console.log("init!");
    bindKeys();
    
    usaLayer.moveToFront();
}



function bindKeys() {
    
    d3.select("body").on( 'keydown', function () { 
        // SPACE
        if ( d3.event.keyCode === 32 ) {
            //reorderLayers();
            
            clearBrush();
            clearState();
            d3.select("#graph") 
                .style("opacity", 0);
        }

        // SHIFT
        if ( d3.event.keyCode === 16 ) { 
//            d3.selectAll(".brush").call(brush.clear());
//            d3.select(".brush")
//                .style("display", "block"); 
        }
        
        // ONE
        if ( d3.event.keyCode === 49 ) {
//            console.log("ONE");   
            popupTooltip("select");
            clearEffects();
            usaLayer.moveToFront();
            quadTreeLayer.moveToFront();
            backgroundRect.moveToFront();
            toolContext = "select";
        }
        // TWO
        if ( d3.event.keyCode === 50 ) {
//            console.log("TWO");   
            popupTooltip("brush");
            clearEffects();
            brushLayer.moveToFront();
            d3.selectAll(".brush").call(brush.clear());
            d3.select(".brush")
                .style("display", "block"); 
            toolContext = "brush";
        }
        // THREE
        if ( d3.event.keyCode === 51 ) {
            clearEffects();
            console.log("THREE");   
        }
        
    }); 
}



////////////////////////////////////////////////////////////
//
//                      M A I N   
//        
//
//                _                        
//                \`*-.                    
//                 )  _`-.                 
//                .  : `. .                
//                : _   '  \               
//                ; *` _.   `*-._          
//                `-.-'          `-.       
//                  ;       `       `.     
//                  :.       .        \    
//                  . \  .   :   .-'   .   
//                  '  `+.;  ;  '      :   
//                  :  '  |    ;       ;-. 
//                  ; '   : :`-:     _.`* ;
//               .*' /  .*' ; .*`- +'  `*' 
//               `*-*   `*-*  `*-*'        
//
//
////////////////////////////////////////////////////////////

(function main() {
//    console.log("main!"); 
    
    init(); 
})();

    