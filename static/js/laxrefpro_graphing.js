











var SITE_BLUE = "rgb(24, 154, 211)";
var SITE_BLUE_LIGHT = "rgb(54, 184, 241)";
var GRAY = "rgb(128, 128, 128)";
var LIGHT_GRAY = "rgb(200, 200, 200)";
var VERY_LIGHT_GRAY = "rgb(245, 245, 245)";

function hello(world=null){
    /***
    This function was used to confirm that I have an understanding of JS modules.
    ***/
        
    if(world == null){ console.log("Hello world!"); }
    else{ console.log("Hello " + world + "!"); }
    
}

var TRACKING_TAG='LRE20dkxls9jfus'

function copy_specs(src, target, overwrite){
    /***
    In cases where we have animation in a graph, there would be two distinct versions of specs. If there is no animation, we still want to use the dual-specs construct, we just want both verions of specs to be the same.
    ***/
    for(k in src){
        
        if(!(k in target) || overwrite){
            if( src[k] == null){ target[k] == null; }
            else if(["string", "number", "boolean"].indexOf(typeof src[k]) > -1){ target[k] = src[k]; }
            else if( !(src[k] instanceof Array)){ // It's a dict
                target[k] = copy_specs(src[k], target[k], overwrite)
            }
            else if( (src[k] instanceof Array)){ // It's an array
                target[k] = [];
                for(var a = 0;a<src[k].length;a++){
                    target[k].push(src[k][a]);
                }
            }
            else{
                console.log("Uncaught type: " + (typeof src[k]));
            }
        }
    }
    return target;
}

function get_client_width(elem_name){
    /***
    This function receives the id of the (usually) div that is having a graphics element written to it and it returns the width of that element. This is always needed to size the new graph, but it can be overwritten if 'width' is sent as an element of the specs.
    ***/
    var client_width = $("#" + elem_name).width();//document.getElementById(elem_name).clientWidth;
    //console.log("Element: " + elem_name); console.log("Client width: " + client_width);
    return client_width;
}
function get_client_height(elem_name){
    /***
    This function receives the id of the (usually) div that is having a graphics element written to it and it returns the height of that element. This is always needed to size the new graph, but it can be overwritten if 'height' is sent as an element of the specs.
    ***/
    var client_height = $("#" + elem_name).height();//document.getElementById(elem_name).clientWidth;
    //console.log("Element: " + elem_name); console.log("Client height: " + client_height);
    return client_height;
}

function pixel_map(x, y){
  /***
  This function generates an empty (all zeros) 2D array of "pixels" that is used when trying to figure out a non-overlapping position set for labels on a scatter plot.
  ***/
  var arr = new Array(x);
  for (var i=0; i<x; i++) {
    arr[i] = new Array();
    for( var j = 0;j<y;j++){
        arr[i].push(0);
    }
  }
  return arr;
}

// on_mobile is set by default on the PRO site, but not on LR Embed partner sites
var reset_on_mobile = 0;
if(typeof on_mobile =="undefined"){ reset_on_mobile = 1; var on_mobile = null; }

function finish_specs(specs){
    /***
    Rather than require logic to check is a certain spec is set, we just set any unset spec to a default value here.
    ***/
    
    var defaults = []
    var d;
    //console.log(specs);
    
    defaults.push({'tag': 'n_cols', 'val': 1});
    defaults.push({'tag': 'animate', 'val': 0});
    defaults.push({'tag': 'is_stacked', 'val': 0});
    defaults.push({'tag': 'x_label_rotate_degrees', 'val':0});
    defaults.push({'tag': 'use_opp_logos', 'val':0});
    defaults.push({'tag': 'opp_logo_width', 'val':20});
    defaults.push({'tag': 'embedded', 'val': 0});
    defaults.push({'tag': 'rotated', 'val': 0});
    defaults.push({'tag': 'margin_top', 'val': 5});
    defaults.push({'tag': 'highlight_team', 'val': 0});
    defaults.push({'tag': 'highlight_color', 'val': "orange"});
    defaults.push({'tag': 'margin_right', 'val': 10});
    defaults.push({'tag': 'margin_left', 'val': 30});
    defaults.push({'tag': 'has_data_table', 'val': 0});
    defaults.push({'tag': 'data_table_offset', 'val': 0});
    defaults.push({'tag': 'data_table_y_offset', 'val': 0});
    defaults.push({'tag': 'tooltip', 'val': 0});
    defaults.push({'tag': 'margin_bottom', 'val': 65});
    defaults.push({'tag': 'chart_size', 'val': "normal"});
    defaults.push({'tag': 'shading_vars', 'val': null});
    defaults.push({'tag': 'vertical_lines', 'val': []});
    defaults.push({'tag': 'flip_y', 'val': false});
    defaults.push({'tag': 'flip_x', 'val': false});
    defaults.push({'tag': 'fill', 'val': '#88F'});
    defaults.push({'tag': 'embed_code', 'val': null});
    defaults.push({'tag': 'menu', 'val': null});
    /***
    Harvey ball and up/down/sideways arrow graphics have unique default specs for margins.
    ***/
    if('chart_type' in specs && ['harvey', 'arrow'].indexOf(specs.chart_type) > -1){
        defaults.filter(r=> r.tag=="margin_top")[0]['val'] = 0;
        defaults.filter(r=> r.tag=="margin_left")[0]['val'] = 0;
        defaults.filter(r=> r.tag=="margin_right")[0]['val'] = 0;
        defaults.filter(r=> r.tag=="margin_bottom")[0]['val'] = 0;
    }
    
    for(var a = 0;a<defaults.length;a++){
        d = defaults[a];
        if(!(d['tag'] in specs)){
            specs[d['tag']] = d['val'];
        }
    }
   
    if((on_mobile == null || reset_on_mobile) && specs.embedded){
        on_mobile = window.innerWidth <= 800 ? 1 : 0;
    }
    return specs
}

function initiate_svg(id, data, specs, initial_specs){
    /***
    Standard function to create an svg in the right size for any graphical element. Returns 5 elements including the actual svg object and dimensions.
    ***/
    
    
    
    //time_log.push({'tag': "Finish Specs", 'start': new Date().getTime()});
    specs = finish_specs(specs)
    //console.log("initiate_svg.specs"); console.log(specs);
    
    
    // If we don't have a pixel for sending messages, add it
    if(specs.embedded){
        $("body").append("<img id='LREMBED_pixel' src='' style='display:none;' />");
        $("body").append("<input type=hidden id='LREMBED_tt' value='" + specs.tt + "' />")
        $("body").append("<input type=hidden id='LREMBED_nhca' value='" + specs.nhca + "' />")
    }
    
    //time_log.push({'tag': "Finished Initial Copy", 'start': new Date().getTime()});
    /* Set up the specs, including any transitions */
    if([null, {}].indexOf(initial_specs) > -1){
        specs.transition = false;
        initial_specs = JSON.parse(JSON.stringify(specs));
    }
    else{
        specs.transition = true;
        initial_specs = copy_specs(specs, initial_specs, false);
    }
    
    initial_specs.final_margin_top = initial_specs.margin_top;
    //console.log("pt.specs.margin_top:4 =  " + initial_specs.margin_top);
    specs.final_margin_top = specs.margin_top;
    //console.log("wpcx.data"); console.log(data);
    if(data != null && typeof data.axis_labels != "undefined"){
        //console.log(data.axis_labels.y);
        if(typeof data.axis_labels.y != "undefined" && [null, ''].indexOf(data.axis_labels.y) == -1 && !initial_specs.rotated){
            initial_specs.final_margin_top = initial_specs.margin_top + 25;
            specs.final_margin_top = specs.margin_top + 25;
            
        }
    }
    //console.log("p.initial_specs"); console.log(initial_specs);
    
    //time_log[time_log.length-1].end = new Date().getTime();
    
    /* Create graph */
    
    var client_width = get_client_width(id);
    var client_height = get_client_height(id);
    
    if('width' in initial_specs){ client_width = initial_specs.width; }
    if('height' in initial_specs){ client_height = initial_specs.height; }
    
    
    
    var width = client_width - initial_specs.margin_left - initial_specs.margin_right,
                height = client_height - initial_specs.final_margin_top - initial_specs.margin_bottom;
    
    if(client_height > 50 && initial_specs.chart_type != "arrow" && initial_specs.chart_type != "spark"){ height -= 5; }
    
    if(width < 0){ console.error("Error in initiate_svg(): svg width error because it is supposed to have a negative width! (id given: " + id + ")"); }
    
    //console.log("ID: " + id + "  SVG Width: " + width + "  SVG Height: " + height);
    //console.log(client_height, initial_specs.final_margin_top, initial_specs.margin_bottom, initial_specs.final_margin_left, initial_specs.margin_right);
    var svg = null;

    if(width >= 0){
    
    
        d3.select("#" + id).selectAll("*").remove();          
        
        svg = d3.select("#" + id).append("svg").attr("id", "svg_obj" + id)
                    .attr("embed_code", initial_specs.embed_code)
                    .attr("width", width + initial_specs.margin_left + initial_specs.margin_right)
                    .attr("height", height + initial_specs.final_margin_top + initial_specs.margin_bottom)
                    .style("background-color", 'svg_bg_color' in specs ? specs.svg_bg_color : "#FFF")
                    .append("g")
                    .attr("transform", "translate(" + initial_specs.margin_left + "," + initial_specs.final_margin_top + ")");
        if(!specs.embedded){ svg.attr("onclick", 'hide_graphic_menus(\"' + ("svg_obj" + id) + '\")'); }
    }
    
    return {width, height, specs, initial_specs, svg};
}

function graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, chart, initial_specs){
    /***
    Creates a standard x-axis for any graph that needs one. Basic features include axis label, axis line, and axis tick-labels.
    ***/
    
    
    if(!('data_table_offset' in initial_specs)){ initial_specs.data_table_offset = 0; }
    if(!('opp_logo_width' in data) || data.opp_logo_width == null){ data.opp_logo_width = 20; }
    var font_size, tp, y_offset;
    
    //console.log("mna.initial_specs"); console.log(initial_specs);
    //console.log("mna.data"); console.log(data);
    
    if('x_ticks' in data){
        svg .append("line")
            .attr("x1", x(min_x_val)).attr("y1", height - initial_specs.data_table_offset)
            .attr("x2", width).attr("y2", height - initial_specs.data_table_offset)
            .style("stroke-width", 1.5).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
        
        var x_n = data.data[0].points.length;
        for(var a = 0;a<data.x_ticks.length;a++){
            var tick = data.x_ticks[a];
            
            function tick_placement(x, loc, chart){
                /***
                Ticks need to be centered within the bar on bar charts (loc is the start of the bar on these), otherwise, it's just at the location of loc.
                ***/
                if(['vertical_bars'].indexOf(chart.type) > -1){
                    return chart.bandwidth_offset + chart.bandwidth/2 + x(loc);
                }
                else{
                    return x(loc);
                }
            }
            
            font_size = get_axis_tick_size(initial_specs, on_mobile);
            
            tp=tick_placement(x, tick.x, chart)
            
            if(tp <= 0){
                console.log("TPFAIL", a, tp);
            }
            else{
                if(data.use_opp_logos){
                    console.log("data.opp_logo_width: " + data.opp_logo_width)
                    var img_w = data.opp_logo_width;
                    if('width' in initial_specs && typeof x_n != "undefined" && initial_specs.width != null){
                        img_w = data.opp_logo_width;
                        var w_per_img = initial_specs.width / x_n;
                        while(img_w + 5 > w_per_img && img_w > 0){ img_w -=1; }
                        if(img_w < 5){ img_w = 5; }
                    }
					//console.log("[288]"); console.log(data.data[0].points[a])
                    svg.append("svg:image").attr("xlink:href", get_team_gif(data.data[0].points[a], true))
                        .attr("class", "team-gif").attr("y", height + 15 - initial_specs.data_table_offset).attr("x", tp - img_w/2).attr("width", img_w).attr("height", img_w);
                }
                else{
                    if(initial_specs.x_label_rotate_degrees > 0){
                        svg.append("text")
                        .attr("x", 0).attr("y", 0)
                        .attr("text-anchor", function (d) { return "start"; }  )
                        .attr("class", 'lightish chart-tick-label')
                        .style('font-size', font_size)
                        .attr("transform", "translate(" + (tp - 10) + ", " + (height + 15 - initial_specs.data_table_offset) + ")rotate(30)")
                        //.attr("dy", tp)
                        //.attr("dy", )
                        .text(tick.label);
                    }
                    else{
                        svg.append("text")
                        .attr("x", tp + ('bar_x_shift_px' in initial_specs ? initial_specs.bar_x_shift_px : 0)).attr("y", height + 15 - initial_specs.data_table_offset)
                        .attr("text-anchor", function (d) { return "middle"; }  )
                        .attr("class", 'lightish chart-tick-label')
                        .style('font-size', font_size)
                        .text(tick.label);
                    }                        
                }
            }
        }
        
    }
    
    font_size = get_axis_label_size(initial_specs, on_mobile);
    
    
    if( 'x' in data.axis_labels && data.axis_labels.x != null){
        svg.append("text")
            .attr("x", (width - x(min_x_val))/2).attr("y", height + 44 - initial_specs.data_table_offset)
            .attr("text-anchor", function (d) { return "middle";  }  )
            .attr("class", 'lightish chart-axis-label')
            .style("font-size", font_size)
            .text(data.axis_labels.x);
    }
    else if( 'high_x' in data.axis_labels && data.axis_labels.high_x != null){
        svg.append("text")
            .attr("x", 20).attr("y", height + 44 - initial_specs.data_table_offset)
            .attr("text-anchor", function (d) { return "start";  }  )
            .attr("class", 'lightish chart-axis-label')
            .style("font-size", font_size)
            .text(initial_specs.flip_x ? data.axis_labels.high_x : data.axis_labels.low_x);
            
            
        svg.append("text")
            .attr("x", width - 20).attr("y", height + 44 - initial_specs.data_table_offset)
            .attr("text-anchor", function (d) { return "end";  }  )
            .attr("class", 'lightish chart-axis-label')
            .style("font-size", font_size)
            .text(initial_specs.flip_x ? data.axis_labels.low_x : data.axis_labels.high_x);
    }

    return svg;
}
    
function get_axis_tick_size(initial_specs, on_mobile){
    /***
    This function determines the font-size for axis tick text. The resulting size is based on mobile/non-mobile and initial_specs_dot_chart_size small/not-small.
    ***/
    var font_size;
    if(on_mobile){
        font_size = initial_specs.chart_size == "small" ? 8 : 10;
    }
    else{
        font_size = initial_specs.chart_size == "small" ? 9 : 13;
    }
    return font_size;
}

function get_axis_label_size(initial_specs, on_mobile){
    /***
    This function determines the font-size for axis label text. The resulting size is based on mobile/non-mobile and initial_specs_dot_chart_size small/not-small.
    ***/
    var font_size;
    if(on_mobile){
        font_size = initial_specs.chart_size == "small" ? 11 : 13;
    }
    else{
        font_size = initial_specs.chart_size == "small" ? 13: 15;
    }
    return font_size;
}
    
function graph_add_shading_ranges(svg, data, x, y, initial_specs){
    /***
    Some graphs need a shaded region around a line (i.e. for the RPI projections chart), typically to show the likely range of outcomes around a mean or median outcome.  The variable names that represent the top and bottom of the range are set in specs as specs_dot_shading_vars[0] and [1]. Obviously, the data point for this type of graph must contain a y-value and these additional 2 vars.
    ***/
    var low_v = initial_specs.shading_vars[0];
    var high_v = initial_specs.shading_vars[1];
    
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
    
        for(var a = 0;a<tmp_data.points.length;a++){
            var g = tmp_data.points[a];
            
            rect_height = y(g[high_v]) - y(g[low_v])
            svg.append("rect")
                .attr("x", Math.max(1, x(g.x) - initial_specs.shading_vars_rect_width)).attr("y", y(g[low_v]))
                .attr("width", initial_specs.shading_vars_rect_width).attr("height", rect_height)
                .style("fill", "#FEE");
        }
        
    }

    return svg;
}
    
function graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs){
    /***
    Where there is a shading section created (in graph_add_shading_ranges), this function creates the legend below the chart to describe what the shading signifies. Prints a colored rectangle and the label.
    ***/
    svg.append("rect")
        .attr("x", -initial_specs.margin_left + 5)
        .attr("y", height + initial_specs.margin_bottom - 18)
        .attr("width", 15).attr("height", 8)
        .style("fill", "#FDD")
        ;
    svg.append("text")
        .attr("x", -initial_specs.margin_left + 25).attr("y",  height + initial_specs.margin_bottom - 10)
        .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
        .attr("text-anchor", function (d) { return "start";  }  )
        .text("90% of outcomes");return svg;
}
    
function graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs){
    /***
    This function adds the y-axis to a plot. The default is to display the y-axis label below the chart title as opposed to having it displayed at 90 degrees next to the axis itself.  Better for spacing since we usually have more room vertically than horizontally.
    ***/
    
    
    if(!('data_table_offset' in initial_specs)){ initial_specs.data_table_offset = 0; }
    
    //console.log("h.initial_specs"); console.log(initial_specs);
    var y_offset; var dim = null;
    if('y_ticks' in data){
        y_offset = 0;
        if('type' in initial_specs && ["horizontal_bars", "list_graphic"].indexOf(initial_specs.type) > -1){ y_offset = initial_specs.bandwidth_offset * 4; }
        
        if(!('gifs_and_names' in initial_specs) || !initial_specs.gifs_and_names){
            svg.append("line")
                .attr("x1", initial_specs.flip_x ? width - x(min_x_val) : x(min_x_val)).attr("y1", y(min_y_val) + y_offset - initial_specs.data_table_offset)
                .attr("x2", initial_specs.flip_x ? width - x(min_x_val) : x(min_x_val)).attr("y2", y(max_y_val) + y_offset - initial_specs.data_table_offset)
                .style("stroke-width", 1.5).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
        }    
        
        var n = data.y_ticks.length;
        for(var a = 0;a<n;a++){
            var tick = data.y_ticks[a];
            y_offset = 3;
            
            
            if(tick.y >= min_y_val){
                if('type' in initial_specs && ["horizontal_bars"].indexOf(initial_specs.type) > -1 && tick.img_src == null){
                    
                    svg.append("text")
                            .attr("y", y(tick.y) + initial_specs.label_font_size / 2 + initial_specs.bandwidth/2 - initial_specs.data_table_offset).attr("x", 10 - initial_specs.margin_left)
                            .attr("text-anchor", "start" )
                            .style('font-size', initial_specs.bandwidth/3)
                            .attr("class", 'lightish chart-tick-label').text(tick.label);
                }
                else if('label' in tick && tick.label != null){
                    //console.log("label: " + tick.label, min_x_val, x(min_x_val) - 5);
                    if(y(tick.y) + y_offset >= 5 - initial_specs.margin_top && (!('height' in initial_specs) || y(tick.y) + y_offset < initial_specs.height - initial_specs.margin_bottom - initial_specs.margin_top) && ( y(tick.y) - initial_specs.data_table_offset >= 0)){
                        svg.append("text")
                            .attr("y", y(tick.y) + y_offset - initial_specs.data_table_offset).attr("x", initial_specs.flip_x ? width - x(min_x_val) + 5 : x(min_x_val) - 5)
                            .attr("text-anchor", function (d) { return "end";  }  )
                            .style('font-size', get_axis_tick_size(initial_specs, on_mobile))
                            .attr("class", 'lightish chart-tick-label').text(tick.label);
                    }
                }
                else if(tick.img_src != null){
                    
                    var tmp_tick_y = tick.y;
                    if(initial_specs.n_cols > 1){
                        tmp_tick_y = tick.y % (Math.floor(n/initial_specs.n_cols));
                    }
                    //console.log(tick.y, y(tick.y), tmp_tick_y, y(tmp_tick_y));
                    dim = initial_specs.per_bar_height * .75 * .8;
                    if(dim > initial_specs.margin_left - 30){ dim = initial_specs.margin_left - 30; }
                    
                    var x_loc = -(initial_specs.margin_left - 15);
                    if(initial_specs.n_cols > 1){
                        if(initial_specs.n_cols == 2){
                            x_loc += (width/initial_specs.n_cols + 50) * Math.floor(a / (n/initial_specs.n_cols));
                        }
                        else{
                            x_loc += (width/initial_specs.n_cols + 30) * Math.floor(a / (n/initial_specs.n_cols));
                        }
                    }
                    svg.append("svg:image").attr("xlink:href", tick.img_src)
                        .attr("class", "team-gif")
                        .attr("y", y(tmp_tick_y) + y_offset*1.5 + (initial_specs.bandwidth - dim)/2 - initial_specs.data_table_offset).attr("x", x_loc).attr("width", dim).attr("height", dim);
                }
                if(!('no_grid' in initial_specs) || !initial_specs.no_grid){
                    
                    // Don't print if the y value is less than zero (i.e. it would be above the chart)
                    if( y(tick.y) - initial_specs.data_table_offset >= 0){
                        
                        svg.append("line")
                        .attr("x1", x(min_x_val)).attr("y1", y(tick.y) - initial_specs.data_table_offset)
                        .attr("x2", width).attr("y2", y(tick.y) - initial_specs.data_table_offset)
                        .style("stroke-width", 1).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
                    }
                }
            }
        
        }
    }
    /***
    We default to having the y-axis above the chart. If rotated in specs as set to 1 or true, then it would show up to the left of the chart. Spacing concerns usually dictate that it be displayed above.
    ***/
    if(initial_specs.rotated){
        if( 'y' in data.axis_labels && data.axis_labels.y != null){
            svg.append("text")
                .attr("text-anchor", function (d) { return "middle";  }  )
                .attr("class", "lightish chart-axis-label")
                .style('font-size', get_axis_label_size(initial_specs, on_mobile))
                .attr("transform", "rotate(-90)").attr("letter-spacing", .9)
                .attr("y", 0 - initial_specs.data_table_offset).attr("dy", -initial_specs.margin_left+20)
                .attr("x", 0 - initial_specs.data_table_offset).attr("dx", -y((min_y_val + max_y_val)/2))
                .text(data.axis_labels.y);
        }
        else if( 'high_y' in data.axis_labels && data.axis_labels.high_y != null){
            svg.append("text")
                .attr("text-anchor", function (d) { return initial_specs.flip_y ? "end" : "start";  }  )
                .attr("class", "lightish chart-axis-label")
                .style('font-size', get_axis_label_size(initial_specs, on_mobile))
                .attr("transform", "rotate(-90)").attr("letter-spacing", .1)
                .attr("y", 0 - initial_specs.data_table_offset).attr("dy", -initial_specs.margin_left+20)
                .attr("x", 0 - initial_specs.data_table_offset).attr("dx", -y(min_y_val) + (initial_specs.flip_y ? -20 : 20))
                .text(data.axis_labels.low_y);
                
            svg.append("text")
                .attr("text-anchor", function (d) { return initial_specs.flip_y ? "start" : "end";  }  )
                .attr("class", "lightish chart-axis-label")
                .style('font-size', get_axis_label_size(initial_specs, on_mobile))
                .attr("transform", "rotate(-90)").attr("letter-spacing", .1)
                .attr("y", 0).attr("dy", -initial_specs.margin_left+20)
                .attr("x", 0).attr("dx", -y(max_y_val) - (initial_specs.flip_y ? -20 : 20))
                .text(data.axis_labels.high_y);
        }
    }
    else{
        svg.append("text")
            .attr("text-anchor", function (d) { return "start";  }  )
            .attr("class", "lightish chart-axis-label " + initial_specs.chart_size)
            .attr("y", initial_specs.embedded ? -20 : -initial_specs.final_margin_top + 15)
            .attr("x", -initial_specs.margin_left + 0)
            .text(data.axis_labels.y);
    }
    return svg;
}

function graph_print_median_lines(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs){
    /***
    This function adds the y-axis to a plot. The default is to display the y-axis label below the chart title as opposed to having it displayed at 90 degrees next to the axis itself.  Better for spacing since we usually have more room vertically than horizontally.
    ***/
    var mid_x = null; var mid_y = null;
    
    if('y_ticks' in data){
        
        
        svg.append("line")
            .attr("x1", x(max_x_val)).attr("y1", y(min_y_val))
            .attr("x2", x(max_x_val)).attr("y2", y(max_y_val))
            .style("stroke-width", 1.5).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
            
        svg.append("line")
            .attr("x1", x(min_x_val)).attr("y1", y(min_y_val))
            .attr("x2", x(max_x_val)).attr("y2", y(min_y_val))
            .style("stroke-width", 1.5).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
        
        svg.append("line")
            .attr("x1", x(min_x_val)).attr("y1", y(max_y_val))
            .attr("x2", x(max_x_val)).attr("y2", y(max_y_val))
            .style("stroke-width", 1.5).style("stroke", "rgb(233, 233, 233)").style("fill", "none");
                
        mid_x = (max_x_val - min_x_val)/2 + min_x_val;
        mid_y = (max_y_val - min_y_val)/2 + min_y_val;
        svg.append("line")
            .attr("x1", x(mid_x)).attr("y1", y(min_y_val))
            .attr("x2", x(mid_x)).attr("y2", y(max_y_val))
            .style("stroke-width", 1.5).style("stroke", "rgb(153, 153, 153)").style("fill", "none");
            
            
        svg.append("line")
            .attr("x1", x(min_x_val)).attr("y1", y(mid_y))
            .attr("x2", x(max_x_val)).attr("y2", y(mid_y))
            .style("stroke-width", 1.5).style("stroke", "rgb(153, 153, 153)").style("fill", "none");
            
            
        
    }
    
    return svg;
}

function graph_print_vertical_lines(svg, x, height, initial_specs){
    /***
    This function takes in initial_specs_dot_vertical_lines (a list), and prints a vertical line (full-height) on the svg. The line can be specified by an x value, which is raw coordinates or an x_scaled value, which assumes that you'll use the d3 scale (initial_specs_dot_x_scale) on it to determine the raw location.
    ***/
    if(!('vertical_lines' in initial_specs) || initial_specs.vertical_lines == null){ return svg; }
    for(var a = 0;a<initial_specs.vertical_lines.length;a++){
        var l = initial_specs.vertical_lines[a];
        
        
        l.x = ('x' in l) ? l.x : initial_specs.x_scale(l.x_scaled);
        //console.log("line at " + l.x, x(l.x));        
        svg.append("line")
            .attr("x1", x(l.x)).attr("y1", 0)
            .attr("x2", x(l.x)).attr("y2", height)
            .style("stroke-width", 1).style("stroke-dasharray", "2,2").style("stroke", "rgb(213, 213, 213)").style("fill", "none");
            
        if('label' in l){
            svg.append("text")
                .attr("x", function(d){ if(l.align == "end"){ return x(l.x) - 5;} else {return x(l.x) + 5;}})
                .attr("y", 10)
                .attr("text-anchor", function (d) { return l.align;  }  )
                .attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                //style('font-size', '10px').style('font-family', 'Arial')
                .style('font-style', 'italic')
                .text(l.label);
        }
    }
    return svg;
}

function graph_print_freeform_lines(svg, x, height, initial_specs){
    /***
    This function takes in initial_specs_dot_freeform_lines (a list), and prints a line on the svg depending on the endpoints provided. The line can be specified by an x/y value, which is raw coordinates or an x_scaled/y_scaled value, which assumes that you'll use the d3 scale (initial_specs_dot_x_scale / initial_specs_dot_y_scale) on it to determine the raw location.
    ***/
    if(!('freeform_lines' in initial_specs) || initial_specs.freeform_lines == null){ return svg; }
    for(var a = 0;a<initial_specs.freeform_lines.length;a++){
        var l = initial_specs.freeform_lines[a];
        
        
        l.x1 = ('x1' in l) ? l.x1 : initial_specs.x_scale(l.x1_scaled);
        l.y1 = ('y1' in l) ? l.y1 : initial_specs.y_scale(l.y1_scaled);
        l.x2 = ('x2' in l) ? l.x2 : initial_specs.x_scale(l.x2_scaled);
        l.y2 = ('y2' in l) ? l.y2 : initial_specs.y_scale(l.y2_scaled);
        console.log("line from (" + l.x1 + ", " + l.y1 + ") to (" + l.x2 + ", " + l.y2 + ")");        
        svg.append("line")
            .attr("x1", l.x1 + 0*initial_specs.margin_left).attr("y1", l.y1 + 0*initial_specs.margin_bottom)
            .attr("x2", l.x2 + 0*initial_specs.margin_left).attr("y2", l.y2 + 0*initial_specs.margin_bottom)
            .style("stroke-width", 1).style("stroke-dasharray", "2,2").style("stroke", "rgb(213, 213, 213)").style("fill", "none");
       
    }
    return svg;
}

function graph_print_horizontal_lines(svg, y, width, initial_specs){
    /***
    This function takes in initial_specs_dot_horizontal_lines (a list), and prints a horizontal line (full-width) on the svg. The line is specified by an y value which assumes that you'll use the d3 scale on it to determine the actual raw location.
    ***/
    if(!('horizontal_lines' in initial_specs) || initial_specs.horizontal_lines == null){ return svg; }
    for(var a = 0;a<initial_specs.horizontal_lines.length;a++){
        var l = initial_specs.horizontal_lines[a];
        
        svg.append("line")
            
            .attr("y1", y(l.y)).attr("x1", 0)
            .attr("y2", y(l.y)).attr("x2", width)
            .style("stroke-width", 1).style("stroke-dasharray", "2,2").style("stroke", "rgb(213, 213, 213)").style("fill", "none");
            
        if('label' in l){
            svg.append("text")
                .attr("x", function(d){ if(l.align == "end"){ return x(l.x) - 5;} else {return x(l.x) + 5;}})
                .attr("y", 10)
                .attr("text-anchor", function (d) { return l.align;  }  )
                .attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .style('font-style', 'italic')
                .text(l.label);
        }
    }
    return svg;
}

function graph_add_link_icon(icon_offset, svg, data, initial_specs){
    /***
    This function adds an icon/image directing a user to follow a related link somewhere. The link is specified by data_dot_detail_url.
    ***/
    svg.append("svg:image").attr("xlink:href", "static/img/popout15.png")
        .attr("x", x(max_x_val)+icon_offset).attr("y", -initial_specs.final_margin_top + 5).attr("width", "15")
        .attr("height", "15").attr("onclick", "window.location='" + data.detail_url + "';");
    return svg;
}

function graph_add_footer(svg, data, initial_specs){
    /***
    This function adds an image as a footer at the bottom of a graph or visualization. (Partially deprecated by the addition of branding logic elsewhere in this file.)
    ***/
    svg.append("svg:image").attr("xlink:href", data.footer.src)
        .attr("class", "footer-img")
        .attr("x", -initial_specs.margin_left).attr("y", initial_specs.height - initial_specs.margin_top - data.footer.height).attr("width", initial_specs.width)
        .attr("height", data.footer.height);
    return svg;
}

function graph_add_data_table_icon(svg, data, x_loc, y_loc, id, initial_specs){
    /***
    This function adds an icon that allows the user to unhide the data-table associated with a given graph.
    ***/
    //console.log("Add icon");
    //console.log("ert.data"); console.log(data)
    var n_rows = 2;
	if('n_rows' in initial_specs){ n_rows = initial_specs.n_rows; }
    //console.log("Add datatable " + id + " with " + initial_specs.n_rows + " rows");
    svg.append("svg:image").attr("xlink:href", '/static/img/Gray_Plus_Skinny150.png')
        .attr("x", x_loc).attr("y", y_loc).attr("width", 15)
        .attr("height", 15).attr("onclick", "unhide_data_table(\"" + id + "\", " + n_rows + ", \"" + initial_specs.redraw_tag + "\");");
    return svg;
}


function graph_add_data_table(svg, data, width, height, x, y, initial_specs){
    /***
    This function adds a data table somewhere in relation to a graph.
    ***/
    
    var n_rows = data.data_table.length;
    //var tmp_id = data.data_table_id.replace("_graph_div", "");
    //$("#" + tmp_id + "_graph_div").addClass("data-table-" + 2);
    //console.log("Set #" + tmp_id + "_graph_div class to " + "data-table-" + n_rows);
    
    
    //console.log("data['data_table']"); console.log(data['data_table'][0]['data']);
    //console.log("iqt.data"); console.log(data);
    //console.log("v.initial_specs"); console.log(initial_specs);
    var start_loc_y = y(0) - initial_specs.data_table_offset + initial_specs.data_table_y_offset + 70;
    
    svg.append("line")
        .attr("x1", -initial_specs.margin_left).attr("x2", width + initial_specs.margin_right)
        .attr("y1", start_loc_y - 20).attr("y2", start_loc_y - 20)
        .style("stroke", "#55F").style("stroke-width", ".08em").style("fill", null);
    
    for(var a = 0;a<n_rows;a++){ var row = data.data_table[a];
        var label_txt = "";
        var row_stroke = "";
        if('label' in row){ 
            label_txt = row.label; 
            row_stroke = "#CCC";
        }
        else if('header' in row){ 
            label_txt = row.header; 
            row_stroke = "#999";
        }
        
        svg.append('text')
            .attr("x", -initial_specs.margin_left).attr("y", start_loc_y - 7).attr("text-anchor", "start")
            .style("font-size", 10).style("font-family", "Arial")
            .text(label_txt)
            .attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
            
            
        if('data' in row && row.data != null){    
            for(var b = 0;b<row.data.length;b++){ var pt = row.data[b];
                
                svg.append('text')
                    .attr("x", x(pt.x) + initial_specs.data_table_column_offset).attr("y", start_loc_y - 7).attr("text-anchor", "middle")
                    .style("font-size", 10).style("font-family", "Arial")
                    .text(pt.val == null ? "---" : jsformat(pt.val, row.fmt))
                    .attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
            }
        }
        
        svg.append("line")
            .attr("x1", -initial_specs.margin_left).attr("x2", width + initial_specs.margin_right)
            .attr("y1", start_loc_y).attr("y2", start_loc_y)
            .style("stroke", row_stroke).style("stroke-width", 1).style("fill", null);
        start_loc_y += 23;
    }
    return svg;
}

function graph_add_subheader(svg, data, initial_specs){
    /***
    This function adds a subheader image to an svg (left-justified). y-location is specified in data_dot_subheader_dot_y and height is specified in data_dot_subheader_dot_height. initial_specs contains other attributes.
    ***/
    svg.append("svg:image").attr("xlink:href", data.subheader.src)
        .attr("class", "subheader-img")
        .attr("x", -initial_specs.margin_left).attr("y", data.subheader.y).attr("width", initial_specs.width)
        .attr("height", data.subheader.height);
    return svg;
}

function embedded_explanation(data, initial_specs, svg_id){
    /***
    This function is triggered when a user clicks on an embedded graphic help-icon. It generates an svg element that contains a div with the text coming from data_dot_explanation. The explanation also includes links, with tracking tags, to various PRO destinations.
    ***/
    var tmp_svg = d3.select("#svg_obj" + svg_id);
    

    var g = tmp_svg.select("g"); var g_x_start = -10; var g_y_start = -10;

    try{
        
        g_x_start = -1*parseFloat(g.attr("transform").replace("translate(", "").split(",")[0].trim());
    }catch(err){  }
    try{
        
        g_y_start = -1*parseFloat(g.attr("transform").replace(")", "").split(",")[1].trim());
    }catch(err){  }
    
    var exp_x = g_x_start + 20; var exp_y = g_y_start + 30; 
    var exp_h = parseFloat(tmp_svg.attr("height")) - 60 + g_y_start; 
    var exp_w = parseFloat(tmp_svg.attr("width")) - 40;
    
    var close_x = exp_x + exp_w - 25
    var close_y = exp_y + 10;
    
    g.append("rect").attr("class", "explanation-rect").attr("x", exp_x - 15).attr("y", exp_y - 15).attr('width', exp_w + 30).attr('height', exp_h + 30).attr("fill", "#FFF").attr("stroke", null).attr("opacity", .8);
                
    
    g.append("rect").attr("class", "explanation-rect").attr("x", exp_x).attr("y", exp_y).attr('width', exp_w).attr('height', exp_h).attr("rx", 5).attr("ry", 5)
    .attr("fill", "#FFF").attr("stroke", "rgb(24, 154, 211)");
    
    g.append("text").attr("class", "explanation-rect").attr("x", exp_x + 10).attr("y", exp_y + 5 + 24).text(data.explanation_description)
    .style("font-size", 22).style("font-family", "Arial")
    .attr("stroke", null).attr("fill", "rgb(24, 154, 211)");
    
    var SHOW_EXPLANATION_LINKS = 0;
    
    g.append("foreignObject").attr("class", "explanation-rect").attr("x", exp_x + 10).attr("y", exp_y + 5 + 34)
      .attr("width", exp_w - 20)
      .attr("height", exp_h - 44)
      .html(function(d) {
        var exp_html = "<div style='overflow-y: auto; max-height: " + (exp_h - 44) + "px; line-height:22px; padding:10px 5px 10px 0px; width:100%;'>"
        exp_html += "<div class=''><span style='font-size:13px; display:contents;'>" + data.explanation + "</span></div>";
        if(SHOW_EXPLANATION_LINKS){
            exp_html += "<div class='' style='text-align:center'><span style='font-size:13px; display:contents;'><a href='https://pro.lacrossereference.com/basic_glossary?t=" + TRACKING_TAG + "'>GLOSSARY</a></span><span>&#183;</span><span style='font-size:13px; display:contents;'><a href='https://pro.lacrossereference.com/about?t=" + TRACKING_TAG + "'>LR EMBEDDED</a></span><span>&#183;</span><span style='font-size:13px; display:contents;'><a href='https://pro.lacrossereference.com/about?t=" + TRACKING_TAG + "'>ABOUT LR PRO</a></span></div>";
        }
        exp_html += "</div>";
        return exp_html;
      })
    
    g.append("svg:image").attr("class", "explanation-rect").attr("xlink:href", "https://storage.googleapis.com/images.pro.lacrossereference.com/Close24.png")
                .attr("id", svg_id + "explanation_button").attr("x", close_x).attr("y", close_y).attr("width", "15")
                .attr("height", "15")
                
    $( "#" + svg_id + "explanation_button").click(function( event ) { event.stopPropagation(); hide_explanation_rect();  }); 
                
}

function graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs){
    /***
    This function prints a help-icon (question mark) image onto a graph or visualization so that a viewer can click it and get an explanation of the content. If it's an embed, then the pathway is different than if it's a general visualization on the PRO site itself. In the later stage, the "icon-15 explanation" class is given a click action (via jquery). If it's an embed, we have a separate function (embedded_explanation) that generates an explanation window over top of the graphic and includes some marketing content.
    ***/
    //console.log("graph_add_explanation_icon.initial_specs"); console.log(initial_specs);
    //console.log("initial_specs.embedded: " + initial_specs.embedded);
    if(initial_specs.embedded){ // This is an API call, explanation must come from this script
        svg.append("svg:image").attr("xlink:href", "https://pro.lacrossereference.com/static/img/Gray_Info150.png").attr("class", "icon-15")
            .attr("x", 'x_explanation_icon_offset' in initial_specs ? initial_specs.x_explanation_icon_offset : initial_specs.width+icon_offset - initial_specs.margin_left)
            .attr("y", 'y_explanation_icon_offset' in initial_specs ? initial_specs.y_explanation_icon_offset : -30).attr("width", "15")
            .attr("height", "15").attr("id", id + '_helpicon');
        $( "#" + id + '_helpicon' ).click(function( event ) { event.stopPropagation(); embedded_explanation(data, initial_specs, id);  });   
    }
    else{ // This is a normal call, so use the existing pathway in laxrefpro.js
        svg.append("svg:image").attr("xlink:href", "https://pro.lacrossereference.com/static/img/Gray_Info150.png").attr("class", "icon-15 explanation")
            .attr("x", initial_specs.width+icon_offset - initial_specs.margin_left)
            .attr("y", -initial_specs.final_margin_top + 5).attr("width", "15")
            .attr("height", "15").attr("value", data.explanation);            
    }
    return svg;
}

function display_embed_graphic(resp){
    /***
    This function displays a build-from-scratch chart or graphic (as opposed to an admin_viz vizualization/infographic). It uses the built in graphical functions and assumes the source data is contained in resp_dot_content_dot_data_series.
    ***/
    console.log("display_embed_graphic...");
    
    var specs = 'chart_specs' in resp.content ? resp.content.chart_specs: {};
    var graphic = 'graphic' in resp.content ? resp.content.graphic : null;
    var branding = 'branding' in resp.content ? resp.content.branding : null;
    var metadata = 'metadata' in resp.content ? resp.content.metadata : null;
    //console.log("misc");console.log(misc);
    //console.log("resp");console.log(resp);
    //console.log("graphic");console.log(graphic);
    //console.log("metadata");console.log(metadata);
    //console.log("specs");console.log(specs);
    //console.log("Stat: " + graphic.explanation_description + " ID: " + graphic.ID);
    specs.tt = resp.target_template;
    
    if(graphic != null && graphic.success){
        
        var final_embed_ID = resp.lr_embed_id.indexOf("LR") == 0 ? resp.lr_embed_id : ("LR" + resp.lr_embed_id);
        var data = {'axis_labels': specs.axis_labels, 'data': []};
        
        
        data.use_opp_logos = 0;
        if(metadata == null && graphic.dimension == "by_game"){
            data.use_opp_logos = 1;
        }
        else if(metadata != null && metadata.use_opp_logos){
            data.use_opp_logos = 1;
        }
        
        if('flip_y' in graphic && graphic['flip_y'] != null){ specs.flip_y = graphic.flip_y; }
        if('js_fmt' in graphic && graphic['js_fmt'] != null){ specs.js_fmt = graphic.js_fmt; }
        
        for(var k in graphic){
            if([null, ''].indexOf(graphic[k]) == -1){
               data[k] = graphic[k];
            }
        }
        for(var k in metadata){
            if([null, ''].indexOf(metadata[k]) == -1){
               data[k] = metadata[k];
            }
        }
        
        data.data = resp.content.data_series
        var x_ticks = create_game_x_ticks(data.data);
        data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
        var y_ticks = null;
        if('y_fmt' in specs && specs.y_fmt.indexOf("%") > -1){
            y_ticks = create_pct_y_ticks(data.data, {})
        }
        else{
            y_ticks = create_numeric_y_ticks(data.data, specs);
        }
                
        data['y_ticks'] = y_ticks.ticks; data['max_y'] = y_ticks.max;  data['min_y'] = y_ticks.min;
        if(!('width' in specs)){
            specs.width = parseFloat($("#" + final_embed_ID).width());
        }
        if(!('height' in specs)){
            if(specs.chart_type == "table"){
                specs.height = (1 + data.data[0].points.length) * (15 + 8) + 10 + 25;
            }
            else{
                specs.height = 300;
            }
        }
        
        
        if(specs.chart_type == "horizontal_line"){
            horizontal_line(data, final_embed_ID, specs);
        }
        else if(specs.chart_type == "table"){
            lr_graphical_table(data, final_embed_ID, specs);
        }
        
        if(branding != null){
            if(specs.width - 100 > branding.img_width){
                var brand_html = "<div class='' style='width:100%; font-size:0; line-height:0; text-align:right; padding:0; background-color: " + branding.bgColor + ";'>";
                brand_html += "<a href='" + branding.brand_url + "'><img style='height:" + branding.height + "px;' src='" + branding.img_src + "' /></a></div>";
                brand_html += "</div>"; 
                $("#" + final_embed_ID).append(brand_html)
            }
        }
    }
    return resp;
}

function pre_process_viz_data(misc, tmp_specs){
    /***
    This function converts a data set from the original named fields into the 'x' and 'y' named fields that the graphical functions are expecting. For example, a team line chart might show offensive efficiency on the y-axis, but the data object includes the 'off_efficiency' field. This function would convert 'off_efficiency' into 'y' in the data so that the graphics functions can process it.
    ***/
    var d = null;
    if(misc.data != null){
        
        for(var a = 0;a<misc.data.length;a++){
            d = misc.data[a];
            d.seq = misc.data.length - a - 1;
            if(!('x' in d)){ d.x = d[tmp_specs.x_var]; }
            if(!('y' in d)){ d.y = d[tmp_specs.y_var]; }
        }
        if('reference_data' in misc){
            for(var a = 0;a<misc.reference_data.length;a++){
                d = misc.reference_data[a];
                d.seq = misc.reference_data.length - a - 1;
                if(!('x' in d)){ d.x = d[tmp_specs.x_var]; }
                if(!('y' in d)){ d.y = d[tmp_specs.y_var]; }
            }
        }
    }
    return misc;
}

function create_graphic_explanation(ms, specs){
    /***
    The explanation for a visualization is stored in the DB as a paragraph. This function takes into account the length of the available space and segments the paragraph into rows that should allow it all to fit. This variant is for graphics, where the explanation appears before the content.
    ***/
    
    var title_font = 32;
    if('title_font' in specs && specs.title_font != null){ title_font = specs.title_font; }
    var title_family = "Arial Black";
    if('title_font_family' in specs && specs.title_font_family != null){ title_family = specs.title_font_family; }
    var justify_center = 1;
    if('left_justify' in specs && specs.left_justify == 1){ justify_center = 0; }
    
    
    var res = []; var tokens = null; var n_tokens = null;
    if(ms.explanations == null){ return res; }
    
    var svg = d3.select("#" + ms.target_elem).append("svg"); var w, h;
    
    //console.log(ms);
    //console.log(specs);
    

    w = specs.width - ms.margin_left - ms.margin_right;
    console.log("w", w, "h", h);
    console.log("w = " + specs.width + ' - ' + ms.margin_left + ' - ' + ms.margin_right + " = " + (specs.width - ms.margin_left - ms.margin_right));

    h = ($('#' + ms.target_elem).width() - 10) * 1.25 - 5;

    tokens = ms.explanations.split(" ").filter(r => r.trim().length > 0);
    console.log("exp.tokens"); console.log(tokens)
    n_tokens = tokens.length;
    
    
    
    
    
    var title_obj = null;
    
    title_obj = svg.append("text").text(ms.final_chart_title).attr("opacity", 0).style("font-size", title_font).attr("font-family", title_family).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); }); 
    
    while(obj_w(title_obj) > w && title_font > 0){
        title_font -= 1;
        
        title_obj = svg.append("text").text(ms.final_chart_title).style("font-size", title_font).attr("font-family", title_family).attr("opacity", 0).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
        
    }
    //console.log("title width: " + obj_w(title_obj));
    //console.log("title x: " + (w - ms.margin_left)/2);
    
    if(justify_center){
        res.push({'width': obj_w(title_obj), 'color': "#000080", 'font_family': title_family, 'type': 'title', 'x': (w - ms.margin_left)/2, 'y': 0, 'font_size': title_font, 'align': 'middle', 'text': ms.final_chart_title});
    }
    else{
        res.push({'width': obj_w(title_obj), 'color': "#000080", 'font_family': title_family, 'type': 'title', 'x': -ms.margin_left + 10, 'y': 0, 'font_size': title_font, 'align': 'start', 'text': ms.final_chart_title});
        
    }
    
    var font_size = ms.explanation_font * (on_mobile || 1 ? .8 : 1.0);
    var lh = font_size * 1.5;
    var y_start = 0;
    
    var loc = 0; var rows = 0; var loops = 0; var full_height = 0;
    var row_widths = []
    while( loc < n_tokens && loops < 1000){
    
        var txt = tokens.slice(0, loc).join(" ");
        
        var obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
        if(obj.attr("width") > w){
            txt = tokens.slice(0, loc-1).join(" ");
        
            obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
            
            if(justify_center){
                res.push({'type': 'explanation', 'width': obj_w(obj), 'x': (w - ms.margin_left)/2, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'middle', 'text': tokens.slice(0, loc-1).join(" ")});
            }
            else{
                res.push({'type': 'explanation', 'width': obj_w(obj), 'x': -ms.margin_left + 10, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'start', 'text': tokens.slice(0, loc-1).join(" ")});
            }
            tokens = tokens.slice(loc-1); loc = 0;
            n_tokens = tokens.length;
            row_widths.push(obj.attr("width"));
            rows += 1;
            full_height += lh;
        }
        loc += 1;
        loops += 1;
    }
    if(tokens.length > 0){
        
        txt = tokens.join(" ");
        obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });

        if(justify_center){
            res.push({'width': obj_w(obj), 'x': (w - ms.margin_left)/2, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'middle', 'text': tokens.join(" ")});
        }
        else{
            res.push({'width': obj_w(obj), 'x': -ms.margin_left + 10, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'start', 'text': tokens.join(" ")});
        }
        full_height += lh;
        row_widths.push(obj.attr("width"));
    }
    //console.log("row_widths"); console.log(row_widths);
    
    
    // Add the source data
    
    if('subheader' in ms){
        full_height += data.subheader.height - 10;
    }
    console.log("Full exp height: " + full_height);
    console.log("lh: " + lh);
    res[0].y -= (full_height - 10 + 3*lh);
    
    for(var a = 1;a<res.length;a++){
        //console.log("move up " + (full_height - lh*1.5));
        res[a].y -= (full_height + lh*.5);
    }
    
    return res;
}

function create_table_footnote(ms, specs){
    /***
    The explanation for a visualization is stored in the DB as a paragraph. This function takes into account the length of the available space and segments the paragraph into rows that should allow it all to fit. This variant is for tables, where the explanation appears as a footnote after the content.
    ***/
    
    var title_font = 24;
    var res = []; var tokens = null; var n_tokens = null;
    if(ms.explanations == null){ return res; }
    
    var svg = d3.select("#" + ms.target_elem).append("svg"); var w, h;
    
    //console.log(ms);
    //console.log(specs);
    
    w = specs.width - ms.margin_left - ms.margin_right - 15;
    h = ($('#' + ms.target_elem).width() - 10) * 1.25 - 5;

    tokens = ms.table_footnote == null ? [] : ms.table_footnote.split(" ").filter(r => r.trim().length > 0);
    n_tokens = tokens.length;
    
    //console.log("w", w, "h", h);
    
    var title_obj = null;
    
    title_obj = svg.append("text").text(ms.final_chart_title).attr("opacity", 0).style("font-size", title_font).attr("font-family", "Arial Black").attr("width", function(d){ return parseFloat(this.getComputedTextLength()); }); 
    
    while(obj_w(title_obj) > w && title_font > 0){
        title_font -= 1;
        title_obj = svg.append("text").text(ms.final_chart_title).style("font-size", title_font).attr("font-family", "Arial Black").attr("opacity", 0).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });

    }
    //console.log("title width: " + obj_w(title_obj));
    //console.log("title x: " + (w - ms.margin_left)/2);
    
    res.push({'color': "#000080", 'font_family': "Arial Black", 'type': 'title', 'x': -ms.margin_left + 10, 'y': 0, 'font_size': title_font, 'align': 'start', 'text': ms.final_chart_title});
    
    
    var font_size = ms.explanation_font * (on_mobile || 1 ? .7 : .9);
    var lh = font_size * 1.5;
    var y_start = 0;
    
    var loc = 0; var rows = 0; var loops = 0; var full_height = 0;
    var row_widths = []
    while( loc < n_tokens && loops < 1000){
    
        var txt = tokens.slice(0, loc).join(" ");
        
        var obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
        if(obj.attr("width") > w){
            txt = tokens.slice(0, loc-1).join(" ");
        
            obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
            
            res.push({'type': 'explanation', 'width': obj_w(obj), 'x': -ms.margin_left + 10, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'start', 'text': tokens.slice(0, loc-1).join(" ")});
            tokens = tokens.slice(loc-1); loc = 0;
            n_tokens = tokens.length;
            row_widths.push(obj.attr("width"));
            rows += 1;
            full_height += lh;
        }
        loc += 1;
        loops += 1;
    }
    if(tokens.length > 0){
        
        txt = tokens.join(" ");
        obj = svg.append("text").text(txt).attr("opacity", 0).style("font-size", font_size).attr("font-family", 'Arial').attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });

        
        res.push({'width': obj_w(obj), 'x': -ms.margin_left + 10, 'y': y_start + lh * rows, 'font_size': font_size, 'align': 'start', 'text': tokens.join(" ")});
        full_height += lh;
        row_widths.push(obj.attr("width"));
    }
    //console.log("row_widths"); console.log(row_widths);
    
    
    // Add the source data
    
 
    //console.log("Full exp height: " + full_height);
    res[0].y = -ms.margin_top - 20;
    
    for(var a = 1;a<res.length;a++){
        //console.log("move down " + (specs.table_height));
        res[a].y += specs.table_height + 20;
    }
    
    return res;
}

function display_viz_graphic(misc, dvg_specs){
    /***
    This function takes an infographic object, prepares the data required for the various graph types OR for the custom graphics (i.e. lifetime_laxelo), and then uses the rest of the generic laxrefpro_graphing functions to display the infographic elements.
    ***/
    
    
    console.log("display_viz_graphic...");
    // In some cases, the data to be processed is in misc.data (adminViz), othertimes it's in misc.content.graphic.data (mediaEmbed)
    
    
    
    if('data' in misc){
        misc = pre_process_viz_data(misc, misc.specs);
    }
    else{
        misc.content.graphic = pre_process_viz_data(misc.content.graphic, misc.content.graphic);
    }

    
    var ms = misc.specs;

    if(typeof ms == "undefined"){
        ms = misc.content.graphic;
        misc.data = misc.content.graphic.data;
        if('extra_data' in misc.content.graphic){
            misc.extra_data = misc.content.graphic.extra_data;
        }
    }
    var title_font = on_mobile || 1 ? 32 : 40;
    var pt = null;
    
    var final_embed_ID = misc.lr_embed_id.indexOf("LR") == 0 ? misc.lr_embed_id : ("LR" + misc.lr_embed_id);
    ms.target_elem = final_embed_ID;
    
    var branding = null;
    console.log("c.misc"); console.log(misc);
    if(typeof misc != "undefined"){
        //console.log("1.0 misc != undefined");
        if('content' in misc && misc.content != null && 'branding' in misc.content){
            console.log("1.1.1 branding in misc.content");
            branding = misc.content.branding;
        }
        else if('specs' in misc && misc.specs != null && 'branding' in misc.specs){
            console.log("1.1.1 branding in misc.specs");
            branding = misc.specs.branding;
        }
        else if('graphic' in misc.content && misc.content.graphic != null && 'branding' in misc.content.graphic){
            console.log("1.1.2 branding in misc.content.graphic");
            branding = misc.content.graphic.branding;    
        }
        //console.log("branding"); console.log(branding);
    }
    else{
        
        console.log("1.0 misc and resp == undefined");
    }
    
    //console.log('misc'); console.log(misc);
    console.log('ms'); console.log(ms);
    var success = null;
    
    /* This section enhances/prepares the data required to generate the graphic; that could be because certain graph types need specific fields OR because custom graphics have other specific needs. */
    
    if('data' in misc && misc.data != null){
        var specs = null; var k = null; var data = null;
        var axis_labels = null; var tmp = null;
        var x_ticks = null; var y_ticks = null;
        var xdiff = null; var ydiff = null;
        if(['scatter'].indexOf(ms.chart_type) > -1){

            specs = {};
            for(k in {'embedded':'', 'min_x_val':'', 'max_x_val':'', 'min_y_val':'', 'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '', 'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if(k ==  "show_counts_label"){
                    specs[k] = ms[k];
                }
                else if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    specs[k] = ms[k.replace("_label", "")];
                }
            }
            specs.chart_type = ms.chart_type;
            
            axis_labels = ms.y != null ? {'y': ms.y, 'x': ms.x} : {'high_y': ms.high_y, 'high_x': ms.high_x, 'low_y': ms.low_y, 'low_x': ms.low_x};
            data = {'axis_labels': axis_labels, 'data': []};
            tmp = {'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            if('reference_data' in misc){
                data.data.push({'reference': 1, 'opacity': .3, 'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': misc.reference_data})
            }
            
            
            x_ticks = create_numeric_x_ticks(data.data, {'fmt': ms.x_fmt});
            data['x_ticks'] = x_ticks.ticks; xdiff = x_ticks.max - x_ticks.min; data['max_x'] = x_ticks.max+diff*.05; data['min_x'] = x_ticks.min-xdiff*.05;
            
            y_ticks = create_numeric_y_ticks(data.data, {'fmt': ms.y_fmt})
            data['y_ticks'] = y_ticks.ticks; ydiff = y_ticks.max - y_ticks.min; data['max_y'] = y_ticks.max+diff*.05; data['min_y'] = y_ticks.min-ydiff*.05;
            
            
            data.min_x = d3.min(tmp.points, function(d){ return d[ms.x_var]; }) - xdiff * .10;
            data.max_x = d3.max(tmp.points, function(d){ return d[ms.x_var]; }) + xdiff * .10;
            data.min_y = d3.min(tmp.points, function(d){ return d[ms.y_var]; }) - ydiff * .10;
            data.max_y = d3.max(tmp.points, function(d){ return d[ms.y_var]; }) + ydiff * .10;
            if('reference_data' in misc){
            
                var ref_min_x = d3.min(misc.reference_data, function(d){ return d[ms.x_var]; }) - xdiff * .10;
                var ref_max_x = d3.max(misc.reference_data, function(d){ return d[ms.x_var]; }) + xdiff * .10;
                var ref_min_y = d3.min(misc.reference_data, function(d){ return d[ms.y_var]; }) - ydiff * .10;
                var ref_max_y = d3.max(misc.reference_data, function(d){ return d[ms.y_var]; }) + ydiff * .10;
                
                data.min_x = Math.min(data.min_x, ref_min_x);
                data.max_x = Math.max(data.max_x, ref_max_x);
                data.min_y = Math.min(data.min_y, ref_min_y);
                data.max_y = Math.max(data.max_y, ref_max_y);
                
            }
            

            if(on_mobile){
                //specs.width = (819  - 50)* .7; //$('#' + ms.target_elem).width() - 10;
                specs.width = $('#' + ms.target_elem).width() - 10;
                specs.height = specs.width * 1.25;
            }
            else{
                specs.width = (819  - 50)* .7; //$('#' + ms.target_elem).width() - 10;
                if(specs.width > $('#' + ms.target_elem).width() - 10){
                    specs.width = $('#' + ms.target_elem).width() - 10;
                }
                specs.height = specs.width * 1.25;
            }
			
			if('height' in dvg_specs && dvg_specs.height != null){ specs.height = dvg_specs.height; }
		
            
            if('footer' in ms){ data.footer = ms.footer; }
            if('subheader' in ms){ data.subheader = ms.subheader; }

            if('explanations' in ms && ms.explanations != null){
                data.text = [];
                
                data.text = create_graphic_explanation(ms, specs);
                
            }
            
            if(["efficiency_vs_production"].indexOf(ms.tag) > -1){
                data.text.push({'color': "#444", 'font_family': "Arial", 'type': 'footnote', 'x': specs.width - 50, 'y': 490, 'font_size': 12, 'align': 'end', 'text': "Bubble size = EGA/gm"})
            }
            else if(["efficiency_vs_assists"].indexOf(ms.tag) > -1){
                data.text.push({'color': "#444", 'font_family': "Arial", 'type': 'footnote', 'x': specs.width - 50, 'y': 605, 'font_size': 12, 'align': 'end', 'text': "Bubble size = EGA/gm"})
            }
            
        }
        else if(['lifetime_laxelo'].indexOf(ms.tag) > -1){
            
            var laxelo_dates = [];
            
            //console.log("lifetime_laxelo misc"); console.log(misc)
            
            specs = {};
            for(k in {'embedded':'', 'row_descriptor': '',  'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '',  'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            
            //specs['margin_bottom'] = 40;
            specs.chart_size= 'small';
            specs.flip = 0;
            
            misc = process_laxelo_history(misc, false);
            data = {'axis_labels': {'y': '', 'x': ''}, 'data': []};
            data.data = misc.all_teams_laxelo_history;
            
            
            x_ticks = create_game_x_ticks(data.data);
            data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
            
            for(var a = 0;a<misc.all_teams_laxelo_history.length;a++){
                var tmp_data = data.data[a];
                
                for(var c = 0;c<tmp_data.points.length;c++){
                    pt = tmp_data.points[c];
                    if(laxelo_dates.indexOf(pt.dt) == -1){
                        laxelo_dates.push(pt.dt);
                    }
                    
                }
            }
        
            laxelo_dates = laxelo_dates.sort(function(first, second) {
                    return first - second;
            });
            var slider_start = null;
            for(var a = 0;a<laxelo_dates.length;a++){
                
                if(laxelo_dates[a] >= misc.laxelo_movement_start_date){
                    
                    slider_start = a/laxelo_dates.length;
                    break;
                }
            }
            if(slider_start == null){ slider_start = 1; }
            
            
            y_ticks = create_numeric_y_ticks(data.data)
            
            data['y_ticks'] = y_ticks.ticks;
            data['max_y'] = y_ticks.max;  data['min_y'] = y_ticks.min;
            
            if(on_mobile || 1){
                specs.width = $('#' + ms.target_elem).width() - 10;
            }
            else{
                specs.width = (819  - 50)* .7;
            }
            specs.height = specs.width / 2.0 + 100;
            
            
            if('explanations' in ms){
                data.text = [];
                data.text = create_graphic_explanation(ms, specs);
            }
            
            success = true;
            
        }
        else if(['game_win_probability'].indexOf(ms.tag) > -1){
            
            
            
            specs = {'no_y_axis': 1};
            specs.y_explanation_icon_offset = -40;
            specs.title_font = 24;
            specs.title_font_family = "Arial";
            specs.left_justify = 1;
            for(k in {'embedded':'', 'row_descriptor': '',  'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '',  'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            //ms.final_chart_title = misc.data.teams[0].display_name + " vs. " + misc.data.teams[1].display_name;

            console.log("pt.specs.margin_top:1 =  " + specs.margin_top);
            
            specs.chart_size= 'small';
            specs.flip = 0;
            specs.x_graph_margin = 0.0;
            
            tmp = misc.data.results.WinProbabilityChart;
            
            misc.data.results.WinProbabilityChart.alt_points = [];
            for(var a = 0;a<misc.data.results.WinProbabilityChart.points.length;a++){
                var tmp = misc.data.results.WinProbabilityChart.points[a];
                misc.data.results.WinProbabilityChart.alt_points.push({'x': tmp.x, 'y': 1.0 - tmp.y});
            }
            
            var tmp_goals = misc.data.results.BasicSummaryCounting.filter( r=> r.tag == "goals");
            //console.log("misc.data.results.BasicSummaryCounting"); console.log(misc.data.results.BasicSummaryCounting);
            //console.log("misc.data.teams"); console.log(misc.data.teams);
            var winner_team = null; // 0 or 1 depending on which team won the game
            var team0_stroke_width = 2.1;
            var team1_stroke_width = 2.1;
            var winner_bg = null;
            var away_won = null;
            if(tmp_goals.length > 0){
                tmp_goals = tmp_goals[0];
                away_won = tmp_goals.away_val > tmp_goals.home_val;
                if(away_won){
                    winner_team = misc.data.away_ID == misc.data.teams[0].ID ? 0 : 1;
                    
                }
                else{
                    winner_team = misc.data.home_ID == misc.data.teams[0].ID ? 0 : 1;
                }
                winner_bg = "rgb" + misc.data.teams[winner_team].bg_color;
            }
            if(winner_bg == null){
                winner_bg = SITE_BLUE;
            }
            //console.log("winner id", winner_team)
            var wp_stroke_width = 2.5;
            data = {'axis_labels': {'y': '', 'x': ''}, 'ball_r': 3, 'ball_stroke': "#FFF", 'ball_stroke_width': 1, 'ball_fill': "#CCF", 'stroke': "#FFF", 'data': []};
            
            
            if(away_won){
                var n_points = misc.data.results.WinProbabilityChart.alt_points.length;
                var last_x = misc.data.results.WinProbabilityChart.alt_points[n_points-1].x;
                var final_x = last_x < 1.0 ? 1.0 : last_x + .001;
                misc.data.results.WinProbabilityChart.alt_points.push({'x': final_x, 'y': 1.0})
                data.data.push({'stroke-width': wp_stroke_width, 'stroke': winner_bg, 'points': misc.data.results.WinProbabilityChart.alt_points});
            }
            else{
                
                var n_points = misc.data.results.WinProbabilityChart.points.length;
                var last_x = misc.data.results.WinProbabilityChart.points[n_points-1].x;
                var final_x = last_x < 1.0 ? 1.0 : last_x + .001;
                
                misc.data.results.WinProbabilityChart.points.push({'x': final_x, 'y': 1.0})
                data.data.push({'stroke-width': wp_stroke_width, 'stroke': winner_bg, 'points': misc.data.results.WinProbabilityChart.points});
            }
            //console.log("wp chart misc.data.teams"); console.log(misc.data.teams);
            
            data.explanation = "The LacrosseReference win probability algorithm starts the game by using each team's LaxElo ratings to calculate pre-game win odds. As the game progresses, the time and score becomes the predominant factor. You can read more <a href='https://lacrossereference.com/2018/04/18/from-linear-to-log-a-win-probability-evolutionary-story/'>here</a>.";
            
            x_ticks = create_game_x_ticks(data.data);
            data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
            
            y_ticks = create_pct_y_ticks(data.data, {'min': 0.0, 'max': 1.0})
            
            data['y_ticks'] = y_ticks.ticks;
            data['max_y'] = 1.0;  data['min_y'] = 0.0;
            
            specs.width = $('#' + ms.target_elem).width() - 10;
            specs.height = specs.width / 2.0 + 100;

            //console.log("wp chart specs.margin_bottom =  " + specs.margin_bottom);
            
            console.log("pt.specs.margin_top:2 =  " + specs.margin_top);
            data.graphic_images = [];
            if(winner_team == 0){
                data.graphic_images.push({'width': 25, 'height': 25, 'src': get_team_gif(misc.data.teams[0], true), 'x': specs.width - specs.margin_right - specs.margin_left + 20, 'y_scaled': 1.0})
                data.graphic_images.push({'width': 25, 'height': 25, 'src': get_team_gif(misc.data.teams[1], true), 'x': specs.width - specs.margin_right - specs.margin_left + 20, 'y_scaled': 0.0})
            }
            else{
                data.graphic_images.push({'width': 25, 'height': 25, 'src': get_team_gif(misc.data.teams[1], true), 'x': specs.width - specs.margin_right - specs.margin_left + 20, 'y_scaled': 1.0})
                data.graphic_images.push({'width': 25, 'height': 25, 'src': get_team_gif(misc.data.teams[0], true), 'x': specs.width - specs.margin_right - specs.margin_left + 20, 'y_scaled': 0.0})
            }
            
            data.text = [];
            if('explanations' in ms){
                
                var tmp_exp = create_graphic_explanation(ms, specs);
                for(var bh = 0;bh<tmp_exp.length;bh++){
                    data.text.push(tmp_exp[bh]);
                }
            }
            console.log("data.text");console.log(data.text);
            
       
            specs.vertical_lines = []
            
            for(var a = 0;a<4;a++){
                
                data.text.push({'x_scaled': (1 + a*2)/8 * 100, 'y_scaled': -.09, 'align': 'middle', 'text': "Q" + (a+1)});
                if(a == 1){
                    specs.vertical_lines.push({'x': ((a*2 + 2)/8 * 100)})
                }
            }
            if(data['max_x'] > 102){
                data.text.push({'x_scaled': (100 + data['max_x'])/2, 'y_scaled': -.09, 'align': 'middle', 'text': "OT"});
                
            }
            
            console.log("pt.specs.margin_top:3 =  " + specs.margin_top);
            
            specs.horizontal_lines = [];
            specs.horizontal_lines.push({'y': .00});
            specs.horizontal_lines.push({'y': .25});
            specs.horizontal_lines.push({'y': .50});
            specs.horizontal_lines.push({'y': .75});
            specs.horizontal_lines.push({'y': 1.0});
            
            data.text.push({'x': -5, 'y_scaled': 0, 'align': 'end', 'text': "0%"});
            data.text.push({'x': -5, 'y_scaled': .25, 'align': 'end', 'text': "25%"});
            data.text.push({'x': -5, 'y_scaled': .5, 'align': 'end', 'text': "50%"});
            data.text.push({'x': -5, 'y_scaled': .75, 'align': 'end', 'text': "75%"});
            data.text.push({'x': -5, 'y_scaled': 1.0, 'align': 'end', 'text': "100%"});
            
            console.log("gwp.specs"); console.log(specs);
            success = true;
            console.log("pt.specs.margin_top:4 =  " + specs.margin_top);
        }
        else if(['in_game_win_probability'].indexOf(ms.tag) > -1){
            
            ms.chart_type = "horizontal_line";
            ms.final_chart_title = "Win Probability";
            ms.explanation_font = 15;
            ms.is_viz = 1;
            
            specs = {'no_y_axis': 1};
            specs.chart_type = 'horizontal_line';
            specs.chart_title = "Win Probability";
            specs.final_chart_title = "Win Probability";
            specs.chart_size = 'small';
            specs.margin_left = 40; 
            specs.margin_bottom = 50;
            specs.margin_right = 45;
            specs.margin_top = 0;
            ms.margin_left = 40; 
            ms.margin_bottom = 50;
            ms.margin_right = 45;
            ms.margin_top = 0;
            specs.title_font = 24;
            
            specs.y_explanation_icon_offset = -40;
            specs.title_font_family = "Arial";
            specs.left_justify = 1;
            specs.flip_x = 0;
            specs.flip = 0;
            specs.flip_y = 0;
            specs.max_y_val = 1;
            specs.rotated = 0;
            specs.show_counts = "";
            specs.use_gifs = 0;
            
            for(k in {'embedded':''}){
                
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }

            //ms.final_chart_title = misc.data.teams[0].display_name + " vs. " + misc.data.teams[1].display_name;

            console.log("pt.specs.margin_top:1 =  " + specs.margin_top);
            
            specs.chart_size= 'small';
            specs.flip = 0;
            specs.x_graph_margin = 0.0;
            
            var tmp_tokens = misc.data.pts;
            //console.log(tmp_tokens);
            var wp_points = [];
            var token = null;
            var cur_loc = 0; var final_loc = tmp_tokens.length;
            var increment = null;
            while(cur_loc < final_loc){ token = tmp_tokens.substr(cur_loc, cur_loc + 8);
                increment = 8;
                // Overtime because the x value is greater than 1.00
                if(token[0] == "1"){
                    increment = 9
                    //console.log(token.substr(0, 5), token.substr(5, 9));
                    wp_points.push({'x': parseFloat(token.substr(0, 5)), 'y': parseFloat(token.substr(5, 4))})
                }
                else{
                    //console.log(token.substr(0, 4), token.substr(4, 4));
                    wp_points.push({'x': parseFloat(token.substr(0, 4)), 'y': parseFloat(token.substr(4, 4))})
                }
                
                
                cur_loc += increment;
            }
            //console.log("ingwp.wp_points"); console.log(wp_points);
            /*
            
            misc.data.results.WinProbabilityChart.alt_points = [];
            for(var a = 0;a<misc.data.results.WinProbabilityChart.points.length;a++){
                var tmp = misc.data.results.WinProbabilityChart.points[a];
                misc.data.results.WinProbabilityChart.alt_points.push({'x': tmp.x, 'y': 1.0 - tmp.y});
            }
            
            var tmp_goals = misc.data.results.BasicSummaryCounting.filter( r=> r.tag == "goals");
            //console.log("misc.data.results.BasicSummaryCounting"); console.log(misc.data.results.BasicSummaryCounting);
            //console.log("misc.data.teams"); console.log(misc.data.teams);
            var winner_team = null; // 0 or 1 depending on which team won the game
            var team0_stroke_width = 2.1;
            var team1_stroke_width = 2.1;
            var winner_bg = null;
            var away_won = null;
            if(tmp_goals.length > 0){
                tmp_goals = tmp_goals[0];
                away_won = tmp_goals.away_val > tmp_goals.home_val;
                if(away_won){
                    winner_team = misc.data.away_ID == misc.data.teams[0].ID ? 0 : 1;
                    
                }
                else{
                    winner_team = misc.data.home_ID == misc.data.teams[0].ID ? 0 : 1;
                }
                winner_bg = "rgb" + misc.data.teams[winner_team].bg_color;
            }
            if(winner_bg == null){
                winner_bg = SITE_BLUE;
            }
            //console.log("winner id", winner_team)
            
            */
            
            var wp_stroke_width = 2.5;
            data = {'axis_labels': {'y': '', 'x': ''}, 'ball_r': 3, 'ball_stroke': "#FFF", 'ball_stroke_width': 1, 'ball_fill': "#CCF", 'stroke': "#FFF", 'data': []};
            
            
            data.data.push({'stroke-width':  2.5, 'stroke': SITE_BLUE, 'points': wp_points});
            
            //console.log("wp chart misc.data.teams"); console.log(misc.data.teams);
            
            
            
            x_ticks = create_game_x_ticks(data.data);
            data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
            
            y_ticks = create_pct_y_ticks(data.data, {'min': 0.0, 'max': 1.0})
            
            data['y_ticks'] = y_ticks.ticks;
            data['max_y'] = 1.0;  data['min_y'] = 0.0;
            if(data['max_x'] < 1.0){ data['max_x'] = 1.0; }
            
            specs.width = $('#' + ms.target_elem).width() - 10;
            specs.height = specs.width / 2.0 + 100;

            //console.log("wp chart specs.margin_bottom =  " + specs.margin_bottom);
            
            console.log("pt.specs.margin_top:2 =  " + specs.margin_top);
            data.graphic_images = [];
            
            var top_src = "https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/" + misc.data.a_logo;
            data.graphic_images.push({'width': 25, 'height': 25, 'src': top_src, 'x': -30, 'y_scaled': 0.0})
            
            var bottom_src = "https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/" + misc.data.h_logo;
            data.graphic_images.push({'width': 25, 'height': 25, 'src': bottom_src, 'x': -30, 'y_scaled': 1.0})
            
            var winner_src = "https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/" + misc.data.w_logo;
            data.graphic_images.push({'width': 15, 'height': 15, 'src': winner_src, 'x': specs.width - specs.margin_right - specs.margin_left - 20, 'y': -50})
            
            
            data.text = [];
            if('explanations' in ms){
                
                var tmp_exp = create_graphic_explanation(ms, specs);
                for(var bh = 0;bh<tmp_exp.length;bh++){
                    data.text.push(tmp_exp[bh]);
                }
            }
            console.log("data.text");console.log(data.text);
            
            var title_width = null;
            if(data.text.length > 0){
                if('width' in data.text[0]){
                    title_width = data.text[0].width;
                    specs.x_explanation_icon_offset = title_width - 20;
                    specs.y_explanation_icon_offset = -60;
                }
            }
            data.explanation = "The LacrosseReference win probability algorithm starts the game by using each team's LaxElo ratings to calculate pre-game win odds. As the game progresses, the time and score becomes the predominant factor. You can read more <a target='_blank' href='https://lacrossereference.com/2018/04/18/from-linear-to-log-a-win-probability-evolutionary-story/'>here</a>.";
            
            data.text.push({'align': "start", 'class_str': "lightish chart-tick-label", 'color': "#000080", 'font_family': "Arial", 'font_size': 12, 'text': misc.data.wp, x: specs.width - specs.margin_right - specs.margin_left, 'y': -46});
            
       
            specs.vertical_lines = []
            
            for(var a = 0;a<4;a++){
                
                data.text.push({'x_scaled': (1 + a*2)/8 * 1.00, 'y_scaled': -.09, 'align': 'middle', 'text': "Q" + (a+1)});
                if(a == 1){
                    specs.vertical_lines.push({'x': ((a*2 + 2)/8 * 1.00)})
                }
            }
            if(data['max_x'] > 1.02){
                data.text.push({'x_scaled': (1.00 + data['max_x'])/2, 'y_scaled': -.09, 'align': 'middle', 'text': "OT"});
                
            }
            
            console.log("pt.specs.margin_top:3 =  " + specs.margin_top);
            
            specs.horizontal_lines = [];
            specs.horizontal_lines.push({'y': .00});
            specs.horizontal_lines.push({'y': .25});
            specs.horizontal_lines.push({'y': .50});
            specs.horizontal_lines.push({'y': .75});
            specs.horizontal_lines.push({'y': 1.0});
            
            /*data.text.push({'x': -5, 'y_scaled': 0, 'align': 'end', 'text': "0%"});
            data.text.push({'x': -5, 'y_scaled': .25, 'align': 'end', 'text': "25%"});
            data.text.push({'x': -5, 'y_scaled': .5, 'align': 'end', 'text': "50%"});
            data.text.push({'x': -5, 'y_scaled': .75, 'align': 'end', 'text': "75%"});
            data.text.push({'x': -5, 'y_scaled': 1.0, 'align': 'end', 'text': "100%"});
            */
            
            var pct_x_loc = specs.width - specs.margin_right - specs.margin_left + 20;
            data.text.push({'x': pct_x_loc, 'y_scaled': 0, 'align': 'start', 'text': "100%"});
            data.text.push({'x': pct_x_loc, 'y_scaled': .25, 'align': 'start', 'text': "75%"});
            data.text.push({'x': pct_x_loc, 'y_scaled': .5, 'align': 'start', 'text': "50%"});
            data.text.push({'x': pct_x_loc, 'y_scaled': .75, 'align': 'start', 'text': "75%"});
            data.text.push({'x': pct_x_loc, 'y_scaled': 1.0, 'align': 'start', 'text': "100%"});
            
            
            console.log("ingwp.specs"); console.log(specs);
            success = true;
            console.log("pt.specs.margin_top:4 =  " + specs.margin_top);
        }
        else if(['horizontal_bars'].indexOf(ms.chart_type) > -1){
            
            
            //title_elem.append("<span class='site-logo'>"+ ms.final_chart_title + "</span>");
            specs = {};
            for(k in {'embedded':'', 'min_x_val':'', 'max_x_val':'', 'min_y_val':'', 'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '',  'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            
            
            
            data = {'bandwidth_pct': .6, 'show_counts_fmt': ms.show_counts_fmt, 'show_counts_label': ms.show_counts_label, 'show_counts': ms.show_counts, 'axis_labels': {'y': ms.y_label, 'x': ms.x_label}, 'data': []};
            tmp = {'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            
                      
            data.min_x = 0;
            data.max_x = null;
            for(var ab=0;ab< misc.data.length;ab++){ var tmp = misc['data'][ab][ms.x_var];
                if(data.max_x == null || data.max_x < tmp){
                    data.max_x = tmp;
                }
            }
            
            if(["offensive_rating", "defensive_rating"].indexOf(misc.viz) > -1){ data.min_x = misc.data[misc.data.length-1][ms.x_var] - 50; }
            
            if('min_x' in specs){ data.min_x = ms.min_x; }
            if('max_x' in specs){ data.max_x = ms.max_x; }
            
            /*x_ticks = create_numeric_x_ticks(data.data, {'fmt': ms.x_fmt});
            data['x_ticks'] = x_ticks.ticks; diff = x_ticks.max - x_ticks.min; data['max_x'] = x_ticks.max+diff*.05; data['min_x'] = x_ticks.min-diff*.05;*/
            
            y_ticks = create_sequential_y_ticks(data.data, {'show_counts_label': ms.show_counts_label, 'use_gifs': ms.use_gifs, 'fmt': ms.y_fmt})
            data['y_ticks'] = y_ticks.ticks; var diff = y_ticks.max - y_ticks.min; data['max_y'] = y_ticks.max+diff*.05; data['min_y'] = y_ticks.min-diff*.05;
            
            data['max_y'] = misc.data.length - 1; data['min_y'] = 0;
            
            if('footer' in ms){ data.footer = ms.footer; }
            if('subheader' in ms){ data.subheader = ms.subheader; }
            
            specs.no_grid = 1;
            //


            specs.width = $('#' + ms.target_elem).width() - 10;
            specs.height = specs.width * 1.25;
            if('height' in ms && ms.height != null){ specs.height = ms.height; }
            
            // Because I want to show more than 10 teams (McMichael)
            //specs.height = specs.width * 1.70;

            if('explanations' in ms){
                data.text = [];
                data.text = create_graphic_explanation(ms, specs);
            }
        }
        else if(['horizontal_line'].indexOf(ms.chart_type) > -1){
            
            
            //title_elem.append("<span class='site-logo'>"+ ms.final_chart_title + "</span>");
            specs = {};
            
        
            for(k in {'js_fmt':'', 'embedded':'', 'min_x_val':'', 'max_x_val':'', 'y_fmt':'', 'min_y_val':'', 'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '',  'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            
            
            
            data = {'show_counts_fmt': ms.show_counts_fmt, 'show_counts_label': ms.show_counts_label, 'show_counts': ms.show_counts, 'axis_labels': {'y': ms.y_label, 'x': ms.x_label}, 'data': []};
            tmp = {'ball_r': 4, 'ball_stroke': "#FFF", 'ball_stroke_width': 1, 'ball_fill': "#189ad3", 'stroke-width': 2, 'stroke': "rgb(24, 154, 211)", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            
                      
            data.min_y = null;
            data.max_y = null;
            for(var ab=0;ab< misc.data.length;ab++){ var tmp = misc['data'][ab][ms.y_var];
                if(data.max_y == null || data.max_y < tmp){
                    data.max_y = tmp;
                }
                if(data.min_y == null || data.min_y > tmp){
                    data.min_y = tmp;
                }
            }
            //console.log("1) Interim min y: " + data.min_y);
            //console.log("1) Interim max y: " + data.max_y);
            data.min_x = null;
            data.max_x = null;
            for(var ab=0;ab< misc.data.length;ab++){ 
                if(data.max_x == null || data.max_x < misc['data'][ab][ms.x_var]){
                    data.max_x = misc['data'][ab][ms.x_var];
                }
                if(data.min_x == null || data.min_x > misc['data'][ab][ms.x_var]){
                    data.min_x = misc['data'][ab][ms.x_var];
                }
            }
            
            var y_diff = data.max_y - data.min_y; 
            //console.log("1) y_diff: " + y_diff);
            //console.log(specs);
            if('y_fmt' in specs && specs.y_fmt != null && specs.y_fmt.indexOf("%") > -1){
                data['max_y'] = data.max_y+y_diff*.3; data['min_y'] = data.min_y-y_diff*.3;
            }
            else{
                if(y_diff < .1){
                    data['max_y'] = data.max_y+y_diff*.3; data['min_y'] = data.min_y-y_diff*.3;
                }
                else{
                    data['max_y'] = Math.round(data.max_y+y_diff*.2); data['min_y'] = Math.round(data.min_y-y_diff*.2);
                }
            }
            
           
            if('min_x' in specs){ data.min_x = ms.min_x; }
            if('max_x' in specs){ data.max_x = ms.max_x; }
            
            x_ticks = create_numeric_x_ticks(data.data, {'num_ticks': misc.data.length});
            data['x_ticks'] = x_ticks.ticks; 
            data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
            
            specs.fmt = specs.y_fmt
            specs.max = data.max_y; specs.min = data.min_y;
            console.log("yt.specs.max: " + specs.max + "  yt.specs.min: " + specs.min);
            
            if('y_fmt' in specs && specs.y_fmt != null && specs.y_fmt.indexOf("%") > -1){
                y_ticks = create_pct_y_ticks(data.data, {});
            }
            else{
                y_ticks = create_numeric_y_ticks(data.data, specs);
            }
            
            data['y_ticks'] = y_ticks.ticks;

            //data['max_y'] = 1.0;  data['min_y'] = 0.0;
            //console.log("2) Interim min y: " + data.min_y);
            //console.log("2) Interim max y: " + data.max_y);
            //console.log("zz.data"); console.log(data);
            
            if(on_mobile || 1){
                specs.width = $('#' + ms.target_elem).width() - 10;
            }
            else{
                specs.width = (819  - 50)* .7;
            }
            specs.height = specs.width / 2.0 + 100;
            
            if('explanations' in ms){
                data.text = [];
                data.text = create_graphic_explanation(ms, specs);
            }
            
        }
        else if(['horizontal_comparison_bars'].indexOf(ms.chart_type) > -1){
            
            console.log("horizontal_comparison_bars misc.data"); console.log(misc.data)
            
            //title_elem.append("<span class='site-logo' id='final_chart_title_span'>"+ ms.final_chart_title + "</span>");
            specs = {};
            for(k in {'embedded':'', 'min_x_val':'', 'max_x_val':'', 'min_y_val':'', 'row_descriptor': '',  'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '','show_counts_bubble':'', 'show_counts': '', 'show_counts_label': '',  'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k ==  "show_counts_label"){
                        specs[k] = ms[k];
                    }
                    else if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            
            data = {'bandwidth_pct': .6, 'show_counts_fmt': ms.show_counts_fmt, 'show_counts_label': ms.show_counts_label, 'show_counts': ms.show_counts, 'axis_labels': {'y': ms.y_label, 'x': ms.x_label}, 'data': []};
            tmp = {'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            
                      
            data.min_x = 0;
            data.max_x1 = misc.data.sort(function (a, b){ return b.x1 - a.x1;} )[0]['x1']
            data.max_x2 = misc.data.sort(function (a, b){ return b.x2 - a.x2;} )[0]['x2']
            data.max_x = data.max_x2 > data.max_x1 ? data.max_x2 : data.max_x1;
            
            /*x_ticks = create_numeric_x_ticks(data.data, {'fmt': ms.x_fmt});
            data['x_ticks'] = x_ticks.ticks; diff = x_ticks.max - x_ticks.min; data['max_x'] = x_ticks.max+diff*.05; data['min_x'] = x_ticks.min-diff*.05;*/
            
            y_ticks = create_sequential_y_ticks(data.data, {'use_gifs': ms.use_gifs, 'fmt': ms.y_fmt})
            data['y_ticks'] = y_ticks.ticks; diff = y_ticks.max - y_ticks.min; data['max_y'] = y_ticks.max+diff*.05; data['min_y'] = y_ticks.min-diff*.05;
            
            data['max_y'] = misc.data.length*(1+misc['n_splits']) - 1; data['min_y'] = 0;
            
            if('footer' in ms){ data.footer = ms.footer; }
            if('subheader' in ms){ data.subheader = ms.subheader; }
            
            specs.no_grid = 1;
            //

            if(on_mobile || 1){
                specs.width = $('#' + ms.target_elem).width() - 10;
                specs.height = specs.width * 1.25;
            }
            else{
                specs.width = (819  - 50)* .7;
                specs.height = (1024 - 120) * .7;
            }
            if('explanations' in ms){
                data.text = [];
                data.text = create_graphic_explanation(ms, specs);
            }
            
        }
        else if(['list_graphic'].indexOf(ms.chart_type) > -1){
            
            
            //title_elem.append("<span class='site-logo' id='final_chart_title_list'>"+ ms.final_chart_title + "</span>");
            specs = {};
            for(k in {'min_x_val':'', 'svg_bg_color': '', 'max_x_val':'', 'min_y_val':'', 'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '', 'use_gifs': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'margin_left': '', 'margin_bottom': '', 'margin_top': '', 'chart_size': '', 'margin_right': '', 'flip_y': '', 'flip_x': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            
            data = {'show_counts_fmt': ms.show_counts_fmt, 'show_counts_label': ms.show_counts_label, 'show_counts': ms.show_counts, 'axis_labels': {'y': ms.y_label, 'x': ms.x_label}, 'data': []};
            tmp = {'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            
                      
            data.min_x = 0;
            data.max_x = misc.data[0][ms.x_var];
            
            if('min_x' in specs){ data.min_x = ms.min_x; }
            if('max_x' in specs){ data.max_x = ms.max_x; }
            
            y_ticks = create_sequential_y_ticks(data.data, {'use_gifs': ms.use_gifs, 'fmt': ms.y_fmt})
            data['y_ticks'] = y_ticks.ticks; 
            
            data['max_y'] = misc.data.length - 1; data['min_y'] = 0;
            
            
            specs.no_grid = 1;
            
            if('footer' in ms){ data.footer = ms.footer; }
            if('subheader' in ms){ data.subheader = ms.subheader; }

        
            specs.width = $('#' + ms.target_elem).width() - 10;
            specs.height = specs.width * 1.25;
            if('height' in ms && ms.height != null){ specs.height = ms.height; }
            
            
            if('explanations' in ms){
                data.text = [];
                data.text = create_graphic_explanation(ms, specs);
            }
        }
        else if(['table'].indexOf(ms.chart_type) > -1){
            
            //console.log("f.ms"); console.log(ms)
    
            specs = {};
            for(k in {'min_x_val':'', 'max_x_val':'', 'min_y_val':'', 'max_y_val':'', 'is_stacked': '', 'no_grid': '', 'group_descriptor_font': '', 'group_descriptor_color': '', 'n_cols': '','group_descriptor': '', 'sort_asc': '', 'gifs_and_names': '', 'rotated': '', 'chart_size': '', 'flip_y': '', 'flip_x': '', 'x_fmt': '', 'x_var': '', 'y_fmt': '', 'y_var': ''}){
                if([null, ''].indexOf(ms[k.replace("_label", "")]) == -1){
                    if(k.indexOf("margin") > -1 && (on_mobile || 1)){
                        specs[k] = ms[k.replace("_label", "")];
                        //if([null, ''].indexOf(specs[k]) == -1){ specs[k] *= .8; }
                    }
                    else{
                        specs[k] = ms[k.replace("_label", "")];
                    }
                }
                else{
                    specs[k] = '';
                }
            }
            specs.chart_type = ms.chart_type;
            specs.margin_left = 0;
            specs.margin_top = 0;
            specs.margin_bottom = 0;
            specs.margin_right = 0;
            ms.margin_left = 0;
            ms.margin_top = 0;
            ms.margin_bottom = 0;
            ms.margin_right = 0;
            
            specs.table_fields = 'table_fields' in ms ? ms.table_fields : [];
            
            data = {'show_counts_fmt': ms.show_counts_fmt, 'show_counts_label': ms.show_counts_label, 'show_counts': ms.show_counts, 'axis_labels': {'y': ms.y_label, 'x': ms.x_label}, 'data': []};
            tmp = {'ball_r': 4, 'ball_fill': "#189ad3", 'stroke': "#ccc", 'points': []}
            tmp.points = misc.data;
            data.data.push(tmp)
            
                      
            data.min_x = 0;
            data.max_x = misc.data[0][ms.x_var];
            
            if('min_x' in specs){ data.min_x = ms.min_x; }
            if('max_x' in specs){ data.max_x = ms.max_x; }
            
            y_ticks = create_sequential_y_ticks(data.data, {'use_gifs': 0, 'fmt': ms.y_fmt})
            data['y_ticks'] = y_ticks.ticks; 
            
            data['max_y'] = misc.data.length - 1; data['min_y'] = 0;
            
            
            specs.no_grid = 1;
            
            if('footer' in ms){ data.footer = ms.footer; }
            if('subheader' in ms){ data.subheader = ms.subheader; }

            var table_height = (1+misc.data.length) * 25;
            if(on_mobile || 1){
                specs.width = $('#' + ms.target_elem).width() - 10;
                specs.height = misc.data.length * 30 + 70;
                
                // Because I want to show more than 10 teams (McMichael)
                //specs.height = specs.width * 1.70;
            }
            else{
                specs.width = (819  - 50)* .7;
                specs.height = (1024 - 120) * .7;
            }
            var explanation_height = 0;
            specs.table_height = table_height;
            data.text = create_table_footnote(ms, specs);
            var n_text = data.text.length;
            var exp_lh = (ms.explanation_font * (on_mobile || 1 ? .6 : .8) ) * 1.5;
            if(n_text > 1){
                explanation_height = (n_text-1) * exp_lh + 15;
            }
            //console.log("explanation_height: " + explanation_height);
            specs.height += explanation_height;
            //console.log("table.data.text"); console.log(data.text);
        }
        
        // To account for the presence of an explanator paragraph above the actual content in all non-table graphics, we need to re-adjust sizing to account for the explanation height.
        if(specs != null){
            
            console.log("title_font: " + title_font);
            specs.margin_top = title_font + 10;
            if('is_viz' in ms && ms.is_viz){
                specs.margin_top += 20;   
            }
            console.log("pt.specs.margin_top:3.1 =  " + specs.margin_top);
            if(['table'].indexOf(ms.chart_type) == -1){
                if('text' in data && data.text != null){
                    var font_size = ms.explanation_font * (on_mobile || 1 ? .8 : 1.0);
                    console.log("font_size: " + font_size);
                    var lh = font_size * 1.5;
                    if(ms.tag == "game_win_probability" || ms.tag == "in_game_win_probability"){
                        
                    }
                    else if(data.text.length > 1){
                        specs.margin_top += lh * (data.text.filter(r=> ['explanation'].indexOf(r.type) > -1).length - 1) + 3 * lh;
                    }
                    
                }
                if('footer' in ms){
                    specs.margin_bottom += data.footer.height;
                }
            }
            if('subheader' in ms){
                specs.margin_top += (data.subheader.height - 10);
                data.subheader.y = - (data.subheader.height + 10);
            }
        }
        
        
        // This section calls the actual graphic generation functions
        if(ms.chart_type == 'scatter'){

            scatter(data, ms.target_elem, specs);
        }
        else if(ms.chart_type == 'horizontal_bars'){
        
            horizontal_bars(data, ms.target_elem, specs);
        }
        else if(ms.chart_type == 'horizontal_comparison_bars'){
            horizontal_comparison_bars(data, ms.target_elem, specs);
        }
        else if(ms.chart_type == 'list_graphic'){
        
            list_graphic(data, ms.target_elem, specs);
        }
        else if(ms.chart_type == 'table'){
        
            graphic_table(data, ms.target_elem, specs);
        }
        
        else if(ms.chart_type == 'horizontal_line'){
            console.log("Create horizontal line graph...");
            horizontal_line(data, ms.target_elem, specs);
        }
        
        
            
        if(branding != null){
            console.log("branding.specs"); console.log(specs);
            if(specs.width - 100 > branding.img_width){
                var brand_html = "<div class='' style='width:" + specs.width + "px; font-size:0; line-height:0; text-align:right; padding:0; background-color: " + branding.bgColor + ";'>";
                brand_html += "<a href='" + branding.brand_url + "'><img style='height:" + branding.height + "px;' src='" + branding.img_src + "' /></a></div>";
                brand_html += "</div>"; 
                $("#" + final_embed_ID).append(brand_html)
            }
        }
    }
    return misc;
}

function display_graphic_menu(x_loc, y_loc, svg_id, menu_options, initial_specs){
    /***
    This function creates an overlay menu in the upper right hand corner of a visualization. The contents of the menu are provided in the menu_options argument and these function as strings that determine what action is taken when each is clicked by the user. Menu options are stored in the initial_specs_dot_menu object. This function is triggered when the user clicks on an object with id ending in 'verticaldotmenuicon'.
    ***/
    menu_options = menu_options.split("|");
    
    tmp_svg = d3.select("#" + svg_id);
    embed_code = tmp_svg.attr("embed_code");
    if(embed_code == null){ // If there is no embed code, don't show an EMBED menu option`
        menu_options = menu_options.filter(r=> r.toUpperCase() != "EMBED");
    }
    n = menu_options.length;
    
    
    menu = {};
    menu.line_h = 20
    menu.h = n * menu.line_h + 2;
    menu.w = 125;
    menu.x = x_loc - menu.w + 7;
    menu.y = y_loc + 20
    
    //console.log("menu"); console.log(menu);
    
    g = tmp_svg.select("g");
    g.append("rect").attr("id", svg_id + "_verticaldotmenu").attr("class", "lr-graphic-menu").attr("x", menu.x).attr("y", menu.y).attr("width", menu.w).attr("height", menu.h).style("fill", "#FFF").attr("stroke", "#AAA").attr("stroke-width", 1);
    
    cur_y = menu.y + 1;
    cur_x = menu.x + 10;
    font_size = 14;
    for(var a = 0;a<n;a++){ opt = menu_options[a].toUpperCase().trim();
        
        g.append("rect").attr("class", svg_id + opt + " lr-graphic-menu-link-rect").attr("click_func", opt).attr("id", "lr-graphic-menu-link-rect" + a).attr("x", menu.x + 2).attr("y", cur_y).attr("width", menu.w - 4).attr("height", menu.line_h).style("fill", a % 2 == 0 ? "#EEE" : "#FFF").attr("stroke", null);
        
        
        g.append("text").attr("id", "lr-graphic-menu-link" + a).attr("click_func", opt).attr("class", svg_id + opt + " lr-graphic-menu-link mouseover-link").attr("x", cur_x).attr("y", cur_y + font_size)
        .style("font-size", font_size).style("font-family", "Arial").style("stroke", null).style("fill", "#444").text(opt);
        
        cur_y += menu.line_h;
        
        
        

        $( "." + svg_id + opt ).click(function( event ) { event.stopPropagation(); 
        
            func = d3.select(this).attr("click_func");
            //console.log(func);
            
            hide_graphic_menus(svg_id);
                
            if(func == "EMBED"){
                console.log("Embed: " + embed_code);
                embed_w = obj_w(tmp_svg) - 50;
                embed_y = 50;
                embed_x = -initial_specs.margin_left + 25;
                close_x = embed_x + embed_w - 25
                close_y = embed_y + 10;
                
                g.append("rect").attr("class", "embed-rect").attr("x", embed_x - 25).attr("y", embed_y - 25).attr('width', embed_w + 50).attr('height', 175)
                .attr("fill", "#FFF").attr("stroke", null).attr("opacity", .8);
                
                
                g.append("rect").attr("class", "embed-rect").attr("x", embed_x).attr("y", embed_y).attr('width', embed_w).attr('height', 125).attr("rx", 5).attr("ry", 5)
                .attr("fill", "#FFF").attr("stroke", "rgb(24, 154, 211)");
                
                g.append("text").attr("class", "embed-rect").attr("x", embed_x + 10).attr("y", embed_y + 5 + 24).text(on_mobile ? "LR Embedded" : "LacrosseReference PRO Embedded")
                .style("font-size", 22).style("font-family", "Arial")
                .attr("stroke", null).attr("fill", "rgb(24, 154, 211)");
                
                embed_code_str = "<div class='lr-embed-div' id='LR" + embed_code + "' style='width:inherit; height:inherit;'></div><script src='https://pro.lacrossereference.com/static/js/d3.v4.min.js'></script>"
                embed_code_str += "<script async type='module' src='https://pro.lacrossereference.com/static/js/laxrefmedia.js' charset='utf-8'></script>";
                
                g.append("foreignObject").attr("class", "embed-rect").attr("x", embed_x + 10).attr("y", embed_y + 5 + 34)
                  .attr("width", embed_w - 20)
                  .attr("height", 50)
                  .html(function(d) {
                    input_html = "<div class='inline-flex col-12'>";
                    input_html += '<textarea disabled style="overflow:hidden; margin-right:10px; width: ' + (embed_w - 150) + 'px; resize: none;" id="embed_text' + svg_id + '" rows=1>' + embed_code_str + '</textarea>';
                    input_html += "<button class='action-button blue' onclick=\"copy_embed(\'" + svg_id + "\')\">COPY</button>"
                    input_html += "</div>";
                    
                    return input_html;
                  })

                // Closes the embed rect form
                g.append("svg:image").attr("class", "embed-rect").attr("xlink:href", "https://storage.googleapis.com/images.pro.lacrossereference.com/Close24.png")
                .attr("x", close_x).attr("y", close_y).attr("width", "15")
                .attr("height", "15").attr("onclick", "hide_embed_rect()");   
                
                
                // Shown when a user successfully copies the code to their clipboard
                g.append("text").attr("class", "embed-rect transition-message").attr("text-anchor", "middle").attr("x", embed_w/2).attr("y", embed_y + 5 + 108).text("Embed code has been copied to clipboard")
                .style("font-size", 15).style("font-family", "Arial")
                .attr("stroke", null).attr("fill", "rgb(24, 154, 211)");
            }
            else if(func == "GLOSSARY"){
                window.location = "/basic_glossary"
            }
            else if(func == "HELP"){
                window.location = "/help"
            }
            else if(func == "CONTACT"){
                window.location = "/contact"
            }
            
        }); 
    
    }
    
}

function copy_embed(svg_id){
    /***
    This function takes in the id of a visualization and copies the associated embed snippet to the user's clipboard so that they do not have to copy and paste manually. It is triggered by clicking a button with onclick set to copy_embed.
    ***/
    orig_val = document.getElementById('embed_text' + svg_id).value;
    orig_el = document.getElementById('embed_text' + svg_id);
    console.log(orig_val);
    const el = document.createElement('textarea');
      el.value = orig_val;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    el.setAttribute('readonly', '');
    el.select();
    console.log(el)
    document.execCommand('copy');
    
    $(".transition-message").addClass("shown");
}

function hide_embed_rect(){
    d3.selectAll(".embed-rect").remove();
}
function hide_explanation_rect(){
    d3.selectAll(".explanation-rect").remove();
}

function hide_graphic_menus(svg_id=null){
    
    if(svg_id == null){ // This is a general click on the body of the document
    
    }
    else{ // This is a specific click on a particular svg
        elem_tag = "#" + svg_id + "_verticaldotmenu";
        d3.select(elem_tag).remove();
        d3.selectAll(".lr-graphic-menu-link").remove();
        d3.selectAll(".lr-graphic-menu-link-rect").remove();
    }
}
function graph_add_menu_icon(icon_offset, svg, data, initial_specs){
    /***
    This function displays a menu icon image (vertical 3 dots) on an svg when there is a menu that the user can click. Obviously, the menu is hidden until the object generated by this function is clicked.
    ***/
    
    //console.log(initial_specs);
    x_loc = initial_specs.width+icon_offset - initial_specs.margin_left;
    y_loc =  -initial_specs.final_margin_top + 5;
    svg.append("svg:image").attr("xlink:href", "https://storage.googleapis.com/images.pro.lacrossereference.com/verticaldotmenu.png").attr("id", initial_specs.svg_id + "verticaldotmenuicon").attr("class", "icon-15 menu")
            .attr("x", x_loc).attr("y", y_loc).attr("width", "5")
            .attr("height", "15");            
    
    if(initial_specs.menu.length > 0){
        $( "#" + initial_specs.svg_id + "verticaldotmenuicon" ).click(function( event ) { event.stopPropagation(); display_graphic_menu(x_loc, y_loc, 'svg_obj' + initial_specs.svg_id, initial_specs.menu.join("|"), initial_specs); }); 
    }
    return svg;
}

function graph_add_brand_icon(icon_offset, svg, data, initial_specs){
    /***
    This function adds a branding image to an svg (left-justified). y-location is the very top of the image and height is specified in data_dot_subheader_dot_height. initial_specs contains other attributes.
    ***/
    svg.append("svg:image").attr("xlink:href", data.branding.src).attr("class", data.branding.class)
            .attr("x", initial_specs.width + icon_offset - initial_specs.margin_left - 15).attr("y", -initial_specs.final_margin_top).attr("width", data.branding.width)
            .attr("height", data.branding.height);            
    return svg;
}

function graph_add_images(svg, data, initial_specs){
    /***
    This function adds a list of images to an svg.  All the attributes are stored in the data_dot_graphic_images list objects. y-location can be d3-scaled or not-scaled.
    ***/
    for(var a = 0;a<data.graphic_images.length;a++){ var img = data.graphic_images[a];
        img.y = 'y' in img ? img.y : initial_specs.y_scale(img.y_scaled);
        svg.append("svg:image").attr("xlink:href", img.src)
                .attr("x", img.x).attr("y", img.y - img.height/2).attr("width", img.width)
                .attr("height", img.height);       
    }            
    return svg;
}

function graph_add_title(svg, data, svg_id, initial_specs){
    /***
    This function adds a title to a plot (located above the chart).
    ***/
    
    while(data.title.indexOf("&quot;") > -1){ data.title = data.title.replace("&quot;", '"'); }
    
    if(initial_specs.embedded){
        var TITLE_LH = 28;    
        var TITLE_FONTSIZE = 21; 
        
        var start_svg_h = parseFloat(d3.select("#svg_obj" + svg_id).attr("height"));
        var svg_w = parseFloat(d3.select("#svg_obj" + svg_id).attr("width")) - initial_specs.margin_left - 10;
        var start_x = -initial_specs.margin_left;
        var start_y = -initial_specs.final_margin_top + 5 + TITLE_FONTSIZE;
        
        // 1. Create list of tokens with widths
        var tokens = tokenize_text(data.title, svg, TITLE_FONTSIZE, TITLE_LH, svg_w, start_x, start_y);
        
        // 2. Calculate how many rows needed
        var title_rows = tokens[tokens.length-1].row + 1;
        var title_h = (title_rows) * TITLE_LH + ('chart_type' in initial_specs && initial_specs.chart_type == "table" ? 0 : 20);
        
        // 3. Move the g object down to account for the height of the title and increase svg size
        transform_g_height(svg_id, title_h);
        console.log("initial_specs"); console.log(initial_specs)
        console.log("start_svg_h: " + start_svg_h);
        console.log("title_h: " + title_h);
         
        d3.select("#svg_obj" + svg_id).attr("height", start_svg_h + title_h);
        
        // 4. Print title tokens to the screen
        for(var a =0;a<title_rows;a++){ 
            var tmp = tokens.filter(r=> r.row == a);
            var row_tokens = [];
            var row_y = a * TITLE_LH + -initial_specs.final_margin_top + 5 + TITLE_FONTSIZE - title_h;
            for(var b = 0;b<tmp.length;b++){ row_tokens.push(tmp[b].txt); }
            
            svg.append("text").text(row_tokens.join(" ")).attr("x", start_x).attr("y", row_y)
            .style("font-size", TITLE_FONTSIZE).style("font-family", "Arial").attr("fill", "#333");
        }
        
    }
    else{
        svg.append("text")
        .attr("x", -initial_specs.margin_left).attr("y", -initial_specs.final_margin_top + 20)
        .attr("text-anchor", function (d) { return "start";  }  )
        .attr("class", ('chart_type' in initial_specs && ["horizontal_trainmap"].indexOf(initial_specs.chart_type) > -1) ? "lightish chart-axis-label small" : ("lightish chart-title-label " + initial_specs.chart_size))
        .text(data.title);
        
        svg.attr("title_h", 25);
    }
    return svg;
}

function tokenize_text(txt, svg, font_size, lh, w, start_x, start_y){
    /***
    This function takes a string of text and splits the individual words into tokens that are assigned a location based on the size of the resulting text and the space available to print it in. This function assumes that when you reach the end of the row, you simply start the text anew on the next line (like a book).
    ***/
    var tokens = [];
    var tmp = txt.split(' '); 
    for(var a =0;a<tmp.length;a++){ tokens.push({'txt': tmp[a]}); }
    var footnote_rows = 0; 
        
    var cur_x = start_x;
    for(var a =0;a<tokens.length;a++){ var token = tokens[a]; 
        
        tmp = svg.append("text").text(token.txt).attr("x", 0).attr("y", 0).attr("opacity", 0)
        .style("font-size", font_size).style("font-family", "Arial")            
        .attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
        token.width = obj_w(tmp) + 4; tmp.remove();
        
        var end_x = cur_x + token.width;
        if(end_x >= w){
            token.x = start_x; footnote_rows += 1;
            cur_x = start_x + token.width;
        }
        else{
            token.x = cur_x;
            cur_x = end_x;
        }
        token.row = footnote_rows; 
        token.y = token.row * lh + start_y + (lh * 1.6);
        
    }
    
    return tokens;
}

function graph_add_footnote(svg, data, svg_id, initial_specs){
    /***
    This function adds a footnote below a plot (not yet implemented). It is done by splitting the footnote into tokens and laying them out one by one, switching to a new line when the end of the available width is reached.
    ***/
    var footnote = on_mobile && 'mobile_footnote' in data && [null, ''].indexOf(data.mobile_footnote) == -1 ? data.mobile_footnote : data.footnote; 
    
    if(initial_specs.embedded){
        var start_svg_h = parseFloat(d3.select("#svg_obj" + svg_id).attr("height"));
        var svg_w = parseFloat(d3.select("#svg_obj" + svg_id).attr("width")) - initial_specs.margin_left - 10;
        var start_x = -initial_specs.margin_left + 10;
        var start_y = start_svg_h - initial_specs.final_margin_top;
        
        // 1. Create list of tokens with widths
        var FOOTNOTE_LH = 20; 
        var FOOTNOTE_FONTSIZE = 13; 
        var tokens = tokenize_text(footnote, svg, FOOTNOTE_FONTSIZE, FOOTNOTE_LH, svg_w, start_x, start_y);
        //console.log("tokens"); console.log(tokens);
        
        // 2. Calculate how many rows needed
        var footnote_rows = tokens[tokens.length-1].row + 1;
        var footnote_h = (footnote_rows) * FOOTNOTE_LH +(FOOTNOTE_LH * 1.0);
        
        // 3. Increase height of SVG to support full footnote height
        d3.select("#svg_obj" + svg_id).attr("height", start_svg_h + footnote_h);
        
        // 4. Print footnote tokens to the screen
        for(var a =0;a<footnote_rows;a++){ 
            var tmp = tokens.filter(r=> r.row == a);
            var row_tokens = [];
            //console.log(start_svg_h, -initial_specs.final_margin_top, (FOOTNOTE_LH * .5), a * FOOTNOTE_LH + start_svg_h -initial_specs.final_margin_top + (FOOTNOTE_LH * .5));
            var row_y = a * FOOTNOTE_LH + start_svg_h -initial_specs.final_margin_top + (FOOTNOTE_LH * 1.6)
            for(var b = 0;b<tmp.length;b++){ row_tokens.push(tmp[b].txt); }
            
            svg.append("text").text(row_tokens.join(" ")).attr("x", start_x).attr("y", row_y)
            .style("font-size", FOOTNOTE_FONTSIZE).style("font-family", "Arial").attr("fill", "#555");
        }
        
        // 5. Add a top and bottom line to delineate footnote from other stuff
        var lh1 = start_svg_h - initial_specs.final_margin_top + 15;
        var lh2 = start_svg_h + footnote_h*2.0 - initial_specs.final_margin_top - 15;
        svg.append("line").attr("x1", -initial_specs.margin_left).attr("x2", svg_w).attr("y1", lh1).attr("y2", lh1)
            .attr("stroke", "#CCC").attr("fill", "null");
        svg.append("line").attr("x1", -initial_specs.margin_left).attr("x2", svg_w).attr("y1", lh2).attr("y2", lh2)
            .attr("stroke", "#EEE").attr("fill", "null");
        
        
    }
    else{
        
    }
    return svg;
}

function graph_add_text(svg, data, initial_specs){
    /***
    This function takes in the data_dot_text list object and prints each element according to its text, size, and location. The location is calculated based on whether the text object is defined with raw locations or locations that need to be scaled first.
    ***/

    var res = svg.selectAll("label").data(data.text).enter().append("text").each(function(d){
			
                d.type = 'type' in d ? d.type : null;
                d.class_str = "lightish chart-tick-label"; // " + initial_specs.chart_size;
                d.font_family = 'font_family' in d ? d.font_family : "Arial";
                d.color = 'color' in d ? d.color : "#333";
				d.color = 'fill' in d ? d.fill : d.color;
                    
                d.font_size = 'font_size' in d ? d.font_size : (initial_specs.chart_size == "small" ? 10 : 15);
                
                d.x = ('x' in d) ? d.x : initial_specs.x_scale(d.x_scaled);
                d.y = ('y' in d) ? d.y : initial_specs.y_scale(d.y_scaled);
            
                
            })
        .attr("x", function(d){ return d.x  })
        .attr("y", function(d){ return d.y; })
        .style("font-family", function(d){ return d.font_family; })
        .style('fill', function(d){ return d.color; })
        .attr("text-anchor", function (d) { return d.align;  }  )
        .attr("class", function(d){ return d.class_str; })
        .style("font-size", function(d){ return d.font_size; })
		.attr("transform", function(d){ return 'font_style' in d && d.font_style == "italic" ? "skewX(-15)" : "" })
        .text(function(d){ return d.text; });
		
	
    return svg;
}

function get_show_counts_max_mins(data, initial_specs){
    /***
    In some cases, we need a d3 scale to determine how big a bubble or some other non-axis element will be. This scale is not based on an x,y data convention, but on the field specified in initial_specs_dot_show_counts. The min/max of this specific field is the output of this function.
    ***/
    var min_val = null; var max_val = null; 
    console.log("data"); console.log(data)
    for(var a = 0;a<data.data.length;a++){    
        var tmp_data = data.data[a];
        if(min_val == null || min_val > d3.min(tmp_data.points, function(d) { return d[initial_specs.show_counts]; })){
            min_val = d3.min(tmp_data.points, function(d) { return d[initial_specs.show_counts]; });
        }
        if(max_val == null || max_val < d3.max(tmp_data.points, function(d) { return d[initial_specs.show_counts]; })){
            max_val = d3.max(tmp_data.points, function(d) { return d[initial_specs.show_counts]; });
        }
        
    }
    return {min_val, max_val};
    
}
function get_max_mins(data){
    /***
    This function goes through a list of data lists and returns the min and max values for both axes. (For example, this is necessary for a multiple line chart when the beginning and ending points may be different but all lines need to be viewable on the graph.)
    ***/
    var min_x_val = null; var min_y_val = null; var max_x_val = null; var max_y_val = null;
    if('max_x' in data){
        min_x_val = data.min_x; max_x_val = data.max_x;
    }
    else{
        for(var a = 0;a<data.data.length;a++){    
            var tmp_data = data.data[a];
            
			if(tmp_data.points.length > 0){
				if('x1' in tmp_data.points[0]){
					
					if(min_x_val == null || min_x_val > d3.min(tmp_data.points, function(d) { return d.x1; })){
						min_x_val = d3.min(tmp_data.points, function(d) { return d.x1; });
					}
					if(max_x_val == null || max_x_val < d3.max(tmp_data.points, function(d) { return d.x1; })){
						max_x_val = d3.max(tmp_data.points, function(d) { return d.x1; });
					}
					if(min_x_val == null || min_x_val > d3.min(tmp_data.points, function(d) { return d.x2; })){
						min_x_val = d3.min(tmp_data.points, function(d) { return d.x2; });
					}
					if(max_x_val == null || max_x_val < d3.max(tmp_data.points, function(d) { return d.x2; })){
						max_x_val = d3.max(tmp_data.points, function(d) { return d.x2; });
					}
				}
				else{
					if(min_x_val == null || min_x_val > d3.min(tmp_data.points, function(d) { return d.x; })){
						min_x_val = d3.min(tmp_data.points, function(d) { return d.x; });
					}
					if(max_x_val == null || max_x_val < d3.max(tmp_data.points, function(d) { return d.x; })){
						max_x_val = d3.max(tmp_data.points, function(d) { return d.x; });
					}
				}
			}
        }
    }
    //console.log("max mins data"); console.log(data);
    if('max_y' in data){
        min_y_val = data.min_y; max_y_val = data.max_y;
    }
    else{
        for(var a = 0;a<data.data.length;a++){ 
            var tmp_data = data.data[a];
            if(min_y_val == null || min_y_val > d3.min(tmp_data.points, function(d) { return d.y; })){
                min_y_val = d3.min(tmp_data.points, function(d) { return d.y; });
            }
            if(max_y_val == null || max_y_val < d3.max(tmp_data.points, function(d) { return d.y; })){
                max_y_val = d3.max(tmp_data.points, function(d) { return d.y; });
            }
            
        }
    }
   
    return {min_x_val, min_y_val, max_x_val, max_y_val};
}

function transform_g_height(svg_id, h_move){
    /***
    This function moves the entire g object (which contains the actual graph) down to account for the height of the title. It also increases the size of the svg accordingly so that the bottom components do not have to be shifted.
    ***/
    var tmp_svg = d3.select("#svg_obj" + svg_id);
    var g = tmp_svg.select("g"); var cur_g_y = null; var cur_g_x = null;
    
    try{
        var tmp_transform = g.attr("transform")
        cur_g_y = parseFloat(tmp_transform.replace(")", "").split(",")[1].trim());
        cur_g_x = parseFloat(tmp_transform.replace("translate(", "").split(",")[0].trim());
        //console.log("Current is " + cur_g_x + "," + cur_g_y);
        g.attr("transform", "translate(" + cur_g_x + "," + (cur_g_y + h_move) + ")");
        
    }catch(err){ 
        //report_js_visualization_issue("transform_g_height|" + svg_id + "|-1"); 
    }
    
}

function horizontal_line(data, id, arg_specs, arg_initial_specs = null){
    
    
    var icon_offset, tmp_data; 
    
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    //console.log(" svg is null: " + (svg == null));
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
    initial_specs.x_scale = x; initial_specs.y_scale = y; 
    if(debug.on && debug.data){ console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    var x_diff = parseFloat(max_x_val) - parseFloat(min_x_val);
    var x_graph_margin = .10;
    if('x_graph_margin' in initial_specs && initial_specs.x_graph_margin != null){
        x_graph_margin = initial_specs.x_graph_margin;
    }
    
    if(x_diff > 0){
        x.domain([min_x_val - parseFloat(x_diff) * x_graph_margin, max_x_val + parseFloat(x_diff) * x_graph_margin]);
    }
    else{
        x.domain([min_x_val, max_x_val]);
    }
    
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // Print any horizontal lines, if necessary
    svg = graph_print_horizontal_lines(svg, y, width, initial_specs);

    // Add the Footnote text
    if('footnote' in data && [null, ''].indexOf(data.footnote)==-1){
        svg = graph_add_footnote(svg, data, id, initial_specs);
    }
    
    // Handle the Title
    if('title' in data && [null, ''].indexOf(data.title) == -1){ 
        svg = graph_add_title(svg, data, id, initial_specs); 
    }
    
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_line'}, initial_specs);
    
    // Handle the Y-Axis
    if(!('no_y_axis' in initial_specs) || !initial_specs.no_y_axis){
        svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val - x_diff * x_graph_margin, max_x_val + x_diff * x_graph_margin, min_y_val, max_y_val, initial_specs);
    }
    
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Create the menu icon
    if(initial_specs.menu != null){ initial_specs.svg_id = id;
         svg = graph_add_menu_icon(icon_offset, svg, data, initial_specs); 
         icon_offset -= 25;
    }
    
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    
    // Add a branding logo
    if('branding' in data && data.branding != null){ svg = graph_add_brand_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add any images that need to be printed
    if('graphic_images' in data){ svg = graph_add_images(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Print the data
    var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x); }).y(function(d){ return y(d.y); });

    

    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        tmp_data.points = tmp_data.points.sort(function(a, b){ return a.x - b.x; }); 
        
        svg.append("path")
          .datum(tmp_data.points)
          .attr("fill", "none") .attr("stroke", tmp_data['stroke'])
          .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
          .style("stroke-dasharray", tmp_data['stroke-dasharray'])
          .attr("stroke-width", tmp_data['stroke-width'])
          .attr("d", line);
          
        // Add the balls if necessary
        if('ball_r' in tmp_data){
           
            svg.selectAll().data(tmp_data.points)
              .enter().append("circle").each(function(d){
                
                d.final_fill = ('ball_fill' in tmp_data) ? tmp_data.ball_fill : "#33F";
                d.final_stroke = ('ball_stroke' in tmp_data) ? tmp_data.ball_stroke : "#33F";
                d.final_stroke_width = ('ball_stroke_width' in tmp_data) ? tmp_data.ball_stroke_width : "0";
                
                if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
            }).attr("cx", function(d) { return x(d.x); })
              .attr("r", tmp_data.ball_r)
              .attr("cy", function(d) { return y(d.y); })
              .style("fill", function(d){ return d.final_fill; }).style("stroke-width", function(d){ return d.final_stroke_width; }).style("stroke", function(d){ return d.final_stroke; });
        }
        
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                pt.label_y = y(pt.y)-15; pt.color_class = "lightish";
                
                pt.label_x = x(pt.x);
            }
            
            svg.selectAll().data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return "site-blue chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return d[data.show_counts]; });
                
   
            
        }            
        
    }
    
    
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
}

function lr_graphical_table(data, id, arg_specs, arg_initial_specs = null){
    
    var icon_offset, tmp_data; 
    
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    //var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
    //if(debug.on && debug.data){ console.log(data); }
    
    // ID the range of possible values
    //let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    //if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    //x.domain([min_x_val, max_x_val]);
    //if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    //if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    //else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    //else{ y.domain([min_y_val, max_y_val]); }
    
    // Print shading if necessary
    //if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    //svg = graph_print_vertical_lines(svg, x, height, initial_specs);


    // Add the Footnote text
    if('footnote' in data && [null, ''].indexOf(data.footnote)==-1){
        svg = graph_add_footnote(svg, data, id, initial_specs);
    }
    
    // Handle the Title
    if('title' in data && [null, ''].indexOf(data.title) == -1){ 
        svg = graph_add_title(svg, data, id, initial_specs); 
    }
    
    
    // Handle the X-Axis
    //svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_line'}, initial_specs);
    
    // Handle the Y-Axis
    //svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    
    var icon_offset = -15;
    // Add the link icon to see more
    //if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Create the menu icon
    if(initial_specs.menu != null){ initial_specs.svg_id = id;
         svg = graph_add_menu_icon(icon_offset, svg, data, initial_specs); 
         icon_offset -= 25;
    }
    
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    
    // Add a branding logo
    if('branding' in data && data.branding != null){ svg = graph_add_brand_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }

    // Add the footer image
    //if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    
    // Add the legend if necessary
    //if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    
    /*if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }*/
    
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Print the data
    //var line = d3.line()
    //    .curve(d3.curveLinear)
    //    .x(function(d){ return x(d.x); }).y(function(d){ return y(d.y); });

    
    

        tmp_data = data.data[0];
        
        var cols = null; var col_headers = null;
        if(tmp_data.points.length > 0){
            if('opp_short_code' in tmp_data.points[0]){ // It's a game by game
                cols = ['opp_short_code', 'y'];
                col_headers = ['Game', data.stat_short_code];
            }
            else if('endpoint' in tmp_data.points[0]){ // It's the API endpoint table
                cols = ['endpoint', 'y'];
                col_headers = ['Endpoint', "Requests"];
            }
            else if('API_token' in tmp_data.points[0]){ // It's the API endpoint table
                cols = ['API_token', 'y'];
                col_headers = ['Token', "Requests"];
            }
            else if('year' in tmp_data.points[0]){ // It's a yearly thing
                cols = ['year', 'y'];
                col_headers = ['Season', data.stat_short_code];
            }
            else{ // It's a random table of data
                console.log(tmp_data.points);
                cols = []; col_headers = [];
                // First add non n and pct fields; then make sure those come next
                for(k in tmp_data.points[0]){
                    if(k != "n" && k != "pct"){
                        cols.push(k);
                        col_headers.push(k.replace("_", " "));
                    }
                }
                for(k in tmp_data.points[0]){
                    if(k == "n"){
                        cols.push(k);
                        col_headers.push(k.replace("_", " "));
                    }
                }
                for(k in tmp_data.points[0]){
                    if(k == "pct"){
                        cols.push(k);
                        col_headers.push(k.replace("_", " "));
                    }
                }
            }
            var col_starts = [10]; var col_width = 100;
            for(var b = 0;b<cols.length;b++){
                col_starts.push(width - col_width * b - 10);
            }
            var col_widths = [null, null, null];
            var fs = 15; var longest = null;
            if('font_size' in initial_specs){ fs = initial_specs.font_size; }
            
            for(var a = 0;a<tmp_data.points.length;a++){ var pt = tmp_data.points[a];
                for(var b = 0;b<cols.length;b++){
                    var tmp_txt = pt[cols[b]];

                    if(cols[b] == "y" || cols[b] == "n"){ tmp_txt = pt[cols[b]] == null ? "---" : jsformat(pt[cols[b]], data.js_fmt); }
                    if(cols[b] == "pct"){ tmp_txt = pt[cols[b]] == null ? "---" : jsformat(pt[cols[b]], "0%"); }
                    
                    console.log(tmp_txt);
                    var tmp = svg.append("text").attr("class", "lr-width-text").text(tmp_txt).style("font-size", fs).style("font-family", 'Arial').style('fill', "#FFF").style("stroke", null).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
                    if(col_widths[b] == null || obj_w(tmp) > col_widths[b]){
                        col_widths[b] = obj_w(tmp);
                        if(b == 0){ longest = pt[cols[b]]; }
                            
                    }
                }
            }
            
            
            
        

            d3.selectAll(".lr-width-text").remove();
            
            // Check if there is sufficient room to draw what we need to draw
            var required_width = 20;
            for(var b = 0;b<cols.length;b++){ required_width += (col_widths[b] + 10); }
            if(required_width < width){
                console.log("Sufficient room...");
            }
            var use_alternating_fills = 0;
            var y_loc = 10; var lh = fs + 8;
            
            for(var b = 0;b<cols.length;b++){
                svg.append("text").attr("x", col_starts[b]).attr("y", y_loc).style("font-family", 'Arial').style("font-size", fs).text(col_headers[b]).attr("text-anchor", b > 0 ? "end" : "start");
            }
            svg.append("line").attr("x1", 0).attr("x2", width).attr("y1", y_loc + 6).attr("y2", y_loc + 6).attr("stroke-width", 2).attr("stroke", "#666").attr("fill", null);
            y_loc += lh + (use_alternating_fills ? 5 : 2);
            
            // Display the headers, row data and dividing lines
            for(var a = 0;a<tmp_data.points.length;a++){ var pt = tmp_data.points[a];
                if(use_alternating_fills){
                  svg.append("rect")
                    .attr("x", 0)
                    .attr("y", y_loc - fs - 2)
                    .attr("width", width)
                    .attr("height", lh)
                    .style("fill", a % 2 == 0 ? "#FFF" : "#EEE");
                }
                else{
                    svg.append("line").attr("x1", 0).attr("x2", width).attr("y1", y_loc + 5).attr("y2", y_loc + 5).attr("stroke-width", .5).attr("stroke", "#CCC").attr("fill", null);
                }
                for(var b = 0;b<cols.length;b++){ 
                    var tmp_txt = pt[cols[b]];

                    if(cols[b] == "y" || cols[b] == "n"){ tmp_txt = jsformat(pt[cols[b]], data.js_fmt); }
                    if(cols[b] == "pct"){ tmp_txt = jsformat(pt[cols[b]], "0%"); }
                    
                    svg.append("text").attr("x", col_starts[b]).attr("y", y_loc).style("font-family", 'Arial').style("font-size", fs).text(tmp_txt).attr("text-anchor", b > 0 ? "end": "start");
                }
                y_loc += lh;
            }
        }
}

function radial_locs(pos, rx, ry){
    var label_anchor = null;
    var label_x_off = null; var label_y_off = null;
    /***
    When trying to place a label on a scatter plot, we need to loop through the various radial locations that the label could go to find one where it doesn't overlap with anything. This function returns the d3 anchor label as well as the x/y coordinates for a given location (there are 8 possible; like a clock with 8 hours).
    ***/
    if([0, 4].indexOf(pos) > -1){ 
        label_anchor = "middle";
    }
    else if([5, 6, 7].indexOf(pos) > -1){ 
        label_anchor = "end";
    }
    else{
        label_anchor = "start";
    }
    
    if(pos == 0){
        label_x_off = 0;
        label_y_off = - (ry + 12);
    }
    else if(pos == 1){
        label_x_off = rx * .75 + 4;
        label_y_off = - (ry * .75 + 4);
    }
    else if(pos == 2){
        label_x_off = rx + 4;
        label_y_off = 0;
    }
    else if(pos == 3){
        label_x_off = rx * .75 + 4;
        label_y_off = (ry * .75 + 4);
    }
    else if(pos == 4){
        label_x_off = 0;
        label_y_off = (ry + 8);
    }
    else if(pos == 5){
        label_x_off = - (rx * .75 + 4);
        label_y_off = (ry * .75 + 4);
    }
    else if(pos == 6){
        label_x_off = - (rx + 4);
        label_y_off = 0;
    }
    else if(pos == 7){
        label_x_off = - (rx * .75 + 4);
        label_y_off = - (ry * .75 + 4);
    }
    
    return { label_anchor, label_x_off, label_y_off };
}


function scatter(data, id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
	initial_specs.x_scale = x; initial_specs.y_scale = y;
    if(debug.on && debug.data){ console.log(data); }
    
    // If bubble-size is dependent on something
    if('show_counts_bubble' in initial_specs && initial_specs.show_counts_bubble){
        var bubble = d3.scaleLinear().range([3, 10]);
        let {min_val, max_val} = get_show_counts_max_mins(data, initial_specs);
        bubble.domain([min_val, max_val]);
    }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
	
    // Print any freeform lines, if necessary
    svg = graph_print_freeform_lines(svg, x, height, initial_specs);
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'scatter'}, initial_specs);
    
    // Handle the Y-Axis
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    // Handle the Median Lines
    svg = graph_print_median_lines(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add a branding logo
    if('branding' in data && data.branding != null){ svg = graph_add_brand_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the text, if any
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    
    // Add the sub-header image
    if('subheader' in data){ svg = graph_add_subheader(svg, data, initial_specs); }
    
    // Print the data
    var pixels = null; var pixel_width = null; var pixel_height = null;
    var mid_x = null; var mid_y = null; var max_dot_x = null; var max_dot_y = null; var min_dot_x = null; var min_dot_y = null;
    for(var a = 0;a<data.data.length;a++){
        var tmp_data = data.data[a];
        var opacity = 'opacity' in tmp_data ? tmp_data.opacity : 1.0;
        var reference = 'reference' in tmp_data ? tmp_data.reference : 0;
        
        //tmp_data.points = tmp_data.points.sort(function(a, b){ return a.x - b.x; }); 
        
        
        if('use_gifs' in initial_specs && initial_specs.use_gifs){
 
            svg.selectAll().data(tmp_data.points)
              .enter().append("svg:image").attr("xlink:href", function(d){ return get_team_gif(d, true); })
                        .attr("class", "team-gif").attr("y", function(d){ return y(d.y) + -17.5; }).attr("x", function(d){ return x(d.x) - 17.5; }).attr("width", function(d){ return tmp_data.points.length > 10 ? "18": "25"; }).attr("height", function(d){ return tmp_data.points.length > 10 ? "18": "25"; }).style("opacity", opacity);
        
            if (reference){
                var lg = svg.append("defs").append("linearGradient")
                    .attr("id", "mygrad")//id of the gradient
                    .attr("x1", "0%")
                    .attr("x2", "100%")//since its a vertical linear gradient 
                    .attr("y1", "0%") .attr("y2", "0%");
                    
                    lg.append("stop").attr("offset", "0%").style("stop-color", "#EEE").style("stop-opacity", opacity)

                    lg.append("stop").attr("offset", "100%").style("stop-color", "rgb(24, 154, 211)") .style("stop-opacity", 1)
                    
    
                    for(var ab = 0;ab<tmp_data.points.length;ab++){
                        pt = tmp_data.points[ab];
       
                        
                        orig = data.data[a-1].points.filter(r=> r.team_ID == pt.team_ID)[0];
                        
                        console.log(orig.x + " --> " + orig.y);
                        
                       
                        center_offset =  tmp_data.points.length > 10 ? 5: 9; 
                        svg.append("line")
                          .attr("x1", function(d){ return x(orig.x)  - center_offset; })
                          .attr("x2", function(d){ return x(pt.x) - center_offset; })
                          .attr("y1", function(d){ return y(orig.y) - center_offset; })
                          .attr("y2", function(d){ return y(pt.y) - center_offset; })
                          
                          .style("stroke-width", 2).style("stroke-dasharray", "2,2")
                          .attr("stroke", "#AAA").attr("fill", null);
                    }
            }
         
        }
        else{
            if('show_counts_label' in initial_specs && [null,''].indexOf(initial_specs.show_counts_label) == -1){
                pixels = pixel_map(parseInt(width), parseInt(height));
                
                pixel_width = pixels.length;
                pixel_height = pixels[0].length;
                mid_x = pixel_width /  2;
                mid_y = pixel_height / 2;
                /*for(var x1=mid_x-1;x1<=mid_x + 1;x1++){
                    for(var y1=0;y1<pixel_height;y1++){
                        pixels[x1][y1]= 1;
                    }
                }
                
                for(var x1=mid_y-1;x1<=mid_y + 1;x1++){
                    for(var y1=0;y1<pixel_width;y1++){
                        pixels[y1][x1]= 1;
                    }
                }*/
            }
            var dots = svg.selectAll().data(tmp_data.points)
              .enter().append("ellipse").each(function(d){
                d.final_fill = ('ball_fill' in tmp_data) ? tmp_data.ball_fill : "#33F";
				if('ball_fill' in d && d.ball_fill != null){ d.final_fill = d.ball_fill; }
                d.final_stroke = ('ball_stroke' in tmp_data) ? tmp_data.ball_stroke : "#33F";
                d.final_stroke_width = ('ball_stroke_width' in tmp_data) ? tmp_data.ball_stroke_width : "0";
                
                d.debug = 0;
                //if([189, 1015].indexOf(d.player_ID) > -1){ d.debug = 1; }
                
                if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
                
                d.ball_r1 = d.ball_r2 = tmp_data.ball_r;
                if('show_counts_bubble' in initial_specs && initial_specs.show_counts_bubble){
                    d.ball_r1 = bubble(d[initial_specs.show_counts]);
                    d.ball_r2 = d.ball_r1 / 1.618;
                }   
                
                if('show_counts_label' in initial_specs && [null,''].indexOf(initial_specs.show_counts_label) == -1){ 
                    d.labeled= 0; 
                    min_dot_x = parseInt(x(d.x) - d.ball_r1 - 0);
                    max_dot_x = parseInt(x(d.x) + d.ball_r1 + 0);
                    min_dot_y = parseInt(y(d.y) - d.ball_r2 - 0);
                    max_dot_y = parseInt(y(d.y) + d.ball_r2 + 0);
                    if(d.debug){
                        console.log("Player Dot: " + d.player);
                        console.log(min_dot_x, max_dot_x, min_dot_y, max_dot_y);
                    }
                    
                    for(var x1=min_dot_x;x1<=max_dot_x;x1++){
                        for(var y1=min_dot_y;y1<=max_dot_y;y1++){
                            pixels[x1][y1]= 1;
                        }
                    }
                }
            }).attr("cx", function(d) { return x(d.x); })
              .attr("rx", function(d) { return d.ball_r1; })
              .attr("ry", function(d) { return d.ball_r2; })
              .attr("cy", function(d) { return y(d.y); })
              .style("fill", function(d){ return d.final_fill; }).style("stroke-width", function(d){ return d.final_stroke_width; }).style("stroke", function(d){ return d.final_stroke; });
              
            // Display labels on the scatter plot
            if('show_counts_label' in initial_specs && [null,''].indexOf(initial_specs.show_counts_label) == -1){
                
                    var starting_font = parseInt(get_axis_label_size(initial_specs, on_mobile)) - 1;
                    var loops_left = starting_font - 5; var font_offset = null;
                    while(loops_left > 0){
                        loops_left -= 1;
                        starting_font -= 1;
                        //console.log("Starting font: " + starting_font);
                        
                        font_offset = starting_font / 4 +  1;
                        //font_offset = 0;
                        dots.each(function(d){
                                
                            if(!d.labeled){ // && d.debug){
                                //console.log(d);
                            
                                
                                
                                if(d.debug){    
                                    console.log("Try and process "+ d.player);
                                }
                                for(var z = 0;z<8;z++){
                                    let { label_anchor, label_x_off, label_y_off } = radial_locs(z, d.ball_r1, d.ball_r2);
                                    //console.log(z, label_anchor, label_x_off, label_y_off);
                                    var o = svg.append('text')
                                        .attr("x", -150).attr("y", -150).attr("text-anchor", label_anchor)
                                        .style("font-size", starting_font).style("font-family", "Arial")
                                        .text(d[initial_specs.show_counts_label]).attr("class", "ghost-label")
                                        .attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
                                    
                                    
                                    if(label_anchor == "middle"){
                                        min_dot_x = parseInt(x(d.x) - parseFloat(o.attr("width"))/2 + label_x_off);
                                        max_dot_x = parseInt(x(d.x) + parseFloat(o.attr("width"))/2 + label_x_off);
                                    }
                                    else if(label_anchor == "start"){
                                        min_dot_x = parseInt(x(d.x) + label_x_off);
                                        max_dot_x = parseInt(x(d.x) + parseFloat(o.attr("width")) + label_x_off);
                                        
                                    }
                                    else if(label_anchor == "end"){
                                        min_dot_x = parseInt(x(d.x) - parseFloat(o.attr("width")) + label_x_off);
                                        max_dot_x = parseInt(x(d.x) + label_x_off);
                                    }
                                    
                                  
                                    min_dot_y = parseInt(y(d.y) + label_y_off - (starting_font + 2) + font_offset);
                                    max_dot_y = parseInt(y(d.y) + label_y_off + font_offset);
                                    
                                    if(d.debug){
                                        console.log(z, "min_dot_x: "+ min_dot_x, "max_dot_x: "+ max_dot_x, "min_dot_y: "+ min_dot_y, "max_dot_y: "+ max_dot_y);
                                    }
                                    if(min_dot_y >= 0 && max_dot_y < pixel_height && min_dot_x >= 0 && max_dot_x < pixel_width){
                                        
                                    
                                        var cleared = 1;
                                        for(var x1=min_dot_x;x1<=max_dot_x;x1++){
                                            for(var y1=min_dot_y;y1<=max_dot_y;y1++){
                                                if(pixels[x1][y1]){ cleared = 0; break; }
                                            }
                                        }
                                        if(!cleared){
                                            if(loops_left == 0){
                                                console.log("Unlabeled player: " + d.player);
                                            }
                                        }
                                        else{
                                            
                                            svg.append("rect")
                                                .attr("x", min_dot_x - 1)
                                                .attr("y", min_dot_y - 1)
                                                .attr("width", max_dot_x - min_dot_x + 2)
                                                .attr("height", max_dot_y - min_dot_y + 4)
                                                .style("fill", "#FFF").attr("opacity", .8);
                                                
                                                
                                            svg.append('text')
                                            .attr("x", x(d.x) + label_x_off).attr("y", y(d.y) + label_y_off + font_offset).attr("text-anchor", label_anchor)
                                            .style("font-size", starting_font).style("font-family", "Arial")
                                            .text(d[initial_specs.show_counts_label]);
                                            d.labeled = 1;
                                            
                                            
                                            //console.log("Found a space (pos=" + z + " anchor="+ label_anchor + ") for " + d[initial_specs.show_counts_label]);
                                            //console.log(min_dot_x, max_dot_x, min_dot_y, max_dot_y);
                                            for(var x1=min_dot_x;x1<=max_dot_x;x1++){
                                                for(var y1=min_dot_y;y1<=max_dot_y;y1++){
                                                    pixels[x1][y1] = 1;
                                                }
                                            }
                                            
                                            
                                            
                                            break;
                                        }
                                    }
                                }
                            
                            }
                        });
                    }
                    
                
            }
                        
        }
    }
    
    
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
}

function obj_w(obj_to_measure){ return parseFloat(obj_to_measure.attr("width")); }

function get_team_gif(team, big=false){
    
    var tmp = team['gif_path'].split(".");
    var tokens = team['gif_path'].split(".")
    var fname = tokens[0];
    
    for(var abc = 1;abc<tokens.length-1;abc++){
        fname += "." + tokens[abc];
    }
    team.ext = tmp[tmp.length-1];
    var tmp = team.seq
    
    team['src'] = 'team_ID' in team ? "" + team['team_ID'] : ('opp_ID' in team ? "" + team['opp_ID'] : "" + team['ID']);
    while(team.src.length < 4){ team.src = "0" + team.src; }
    team['fname'] = "team" + team.src + "_" + ('team' in team ? team['team']: ('opp' in team ? team['opp'] : team['name']));
    team['fname'] = fname;
    
    //while(team['fname'].indexOf(".") > -1){ team['fname'] = team['fname'].replace(".", ""); }
    while(team['fname'].indexOf("-") > -1){ team['fname'] = team['fname'].replace("-", ""); }
    while(team['fname'].indexOf("'") > -1){ team['fname'] = team['fname'].replace("'", ""); }
    while(team['fname'].indexOf(" ") > -1){ team['fname'] = team['fname'].replace(" ", ""); }
    
    team.fname = team.fname + (big ?  "_big." : "." ) + team.ext;
    
    var img_src = "https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/" + team.fname.replaceAll("big_big", "big");
    //console.log(img_src);
    

    return img_src;        
}

function spark_line(data, id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
    if(debug.on && debug.data){ console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else if('y_min' in initial_specs && 'y_max' in initial_specs){ y.domain([initial_specs.y_max, initial_specs.y_min]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    // Print the data
    var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x); }).y(function(d){ return y(d.y); });
    var tmp_data = null; var pt = null; var tmp = null;

    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        svg.append("path")
          .datum(tmp_data.points)
          .attr("fill", "none") .attr("stroke", tmp_data['stroke'])
          .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
          .attr("stroke-dasharray", tmp_data['stroke-dasharray'])
          .attr("stroke-width", tmp_data['stroke-width'])
          .attr("d", line);
          
    }
    
}

function vertical_bars(data, id, arg_specs, arg_initial_specs = null){
    
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    var has_x_axis_label =  'x' in data.axis_labels && [null, ''].indexOf(data.axis_labels.x) == -1;
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("\n\nSVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    per_bar_width = width/data.data[0].points.length;
	if('bandwidth_pct' in initial_specs && initial_specs.bandwidth_pct != null){
		bandwidth = per_bar_width * initial_specs.bandwidth_pct; // Padding = .1
	}
	else{
		bandwidth = per_bar_width * .8; // Padding = .1
	}
    bandwidth_offset = per_bar_width * .1;
    
    /* Create graph */
    var show_data_table = 0;
    if('data_table' in data && data.data_table != null){
        show_data_table = 1;
    }
    
    var x = d3.scaleLinear().range([0, width - per_bar_width]);
    var y = null; initial_specs.data_table_offset = 0;initial_specs.data_table_column_offset = 0;
    if(show_data_table){
        
        initial_specs.data_table_offset = data.data_table.length * 25;
		console.log("data.data_table.length: " + data.data_table.length);
		console.log("initial_specs.data_table_offset: " + initial_specs.data_table_offset);
        
        if(!has_x_axis_label){
        
            initial_specs.data_table_y_offset = -25;
        }
        initial_specs.data_table_column_offset = per_bar_width/2;
        y = d3.scaleLinear().range([height, initial_specs.data_table_offset]);    
    }
    else{
        y = d3.scaleLinear().range([height, 0]);
    }
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_width + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // If there is a data-table, add it here
    if('data_table' in data && data.data_table != null){
            
        svg = graph_add_data_table(svg, data, width, height, x, y, initial_specs);     
    }
	
	// Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'data_table_offset': initial_specs.data_table_offset, 'type': 'vertical_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    // Add an expand icon if there is a hidden data-table
    if(initial_specs.has_data_table && !show_data_table){
        var x_loc = null; var y_loc = null;
        if(has_x_axis_label){
            x_loc = 2 - initial_specs.margin_left;
            y_loc = y(0) + 20;
        }
        else{
            x_loc = width - initial_specs.margin_right - 15;
            y_loc = y(0) + 20;
        }
        
        svg = graph_add_data_table_icon(svg, data, x_loc, y_loc, id, initial_specs);
    }
    
    // Handle the Y-Axis
    //console.log("jq.data"); console.log(data);
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the sub-header image
    if('footer' in data){ svg = graph_add_subheader(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    
    
    // Create the menu icon
    if(initial_specs.menu != null){ initial_specs.svg_id = id;
         svg = graph_add_menu_icon(icon_offset, svg, data, initial_specs); 
         icon_offset -= 25;
    }
    
	
    // Print the bars
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        
        var bars = svg.selectAll("bar").data(tmp_data.points)
          .enter().append("rect");
				  
        bars.each(function(d){
			if('fill' in d && d.fill!=null){
				d.final_fill = d.fill;
			}
			else{
				d.final_fill = initial_specs.fill;
				
				if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
			}
			
			if('stroke' in d && d.stroke!=null){
				d.final_stroke = d.stroke;
			}
			else{
				d.final_stroke = initial_specs.fill;
				
				if(initial_specs.highlight && d.highlight){ d.final_stroke = initial_specs.highlight_color; } 
			}
        });
          
        // --- Tooltip setup (only once per chart) ---
		var svgTooltip = svg.append("text")
		.attr("class", "bar-tooltip-text")
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("font-family", "sans-serif")
		.style("display", "none");

		var permanent_svgTooltip = svg.append("text")
		.attr("class", "bar-tooltip-text")
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("font-family", "sans-serif")
		.style("display", "none");
		
		bars.each(function(datum, i) {
		const bar = d3.select(this);

		
		
		bar.on("mouseover", function(d) {
			if (!d.tooltipText) return;


			
			const barX = +bar.attr("x") + (+bar.attr("width") / 2);
			const barY = +bar.attr("y");
			const barHeight = +bar.attr("height");
			const insideThreshold = 35; // px threshold for inside placement

			let tooltipY, fillColor;

			if (barHeight > insideThreshold) {
				// Place inside the bar
				tooltipY = barY + 15;  // 15 px down from top of bar
				fillColor = d.tooltipInsideColor || "#000";
			} else {
				// Place just above the bar
				tooltipY = barY - 5;   // 5 px above top of bar
				fillColor = d.tooltipOutsideColor || "#fff";
			}

			// Clear any previous tspans
		svgTooltip.selectAll("*").remove();

		// Split text by newline and create a tspan for each line
		const lines = d.tooltipText.split("\n");
		lines.forEach((line, i) => {
			svgTooltip.append("tspan")
				.attr("x", barX)
				.attr("dy", i === 0 ? 0 : "1.2em") // first line stays at tooltipY, others offset
				.text(line);
		});

		svgTooltip
			.attr("x", barX)
			.attr("y", tooltipY)
			.style("fill", fillColor)
			.style("display", "block")
			.style("font-size", 'tooltipFontSize' in d ? d.tooltipFontSize : 10);
			});

			bar.on("mouseout", function() {
				svgTooltip.style("display", "none");
			});
		});

        bars.attr("class", "bar")
          .attr("x", function(d) { return x(d.x) + bandwidth_offset + ('bar_x_shift_px' in initial_specs ? initial_specs.bar_x_shift_px : 0); })
          .attr("width", bandwidth)
          .attr("y", function(d) { return y(d.y) - initial_specs.data_table_offset; })
          .style("fill", function(d){ return d.final_fill; })
          .style("stroke", function(d){ return d.final_stroke; })
          .attr("height", function(d, i) { return height - y(d.y); });
          
		bars.each(function(datum, i) {
			const bar = d3.select(this);  
			const barX = +bar.attr("x") + (+bar.attr("width") / 2);
			if('noDataDisplayText' in datum && datum.noDataDisplayText != null){
				console.log("noDataDisplayText: " + datum.noDataDisplayText);
				console.log(datum);
				console.log(bar);
				console.log("barX: " + barX);
				//permanent_svgTooltip.selectAll("*").remove();

				// Split text by newline and create a tspan for each line
				const lines = datum.noDataDisplayText.split("\n");
				lines.forEach((line, i) => {
					permanent_svgTooltip.append("tspan")
						.attr("x", barX)
						.attr("dy", i === 0 ? 0 : "1.2em") // first line stays at tooltipY, others offset
						.text(line);
				});

				permanent_svgTooltip
					.attr("x", barX)
					.attr("y", y(0) - 5)
					.style("fill", "#333")
					.style("display", "block")
					.style("font-size", 'tooltipFontSize' in d ? d.tooltipFontSize : 10);
			
				
			}
		});
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){
			
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                if(y(0) - 15 < y(pt.y)){
                    pt.label_y = y(pt.y)-5 - initial_specs.data_table_offset; pt.color_class = "lightish";
                }
                else{
                    pt.label_y = y(0) - 5 - initial_specs.data_table_offset; pt.color_class = "white";
                }
               
                pt.label_x = x(pt.x) + bandwidth/2 + bandwidth_offset;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return d.color_class + " chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x + ('bar_x_shift_px' in initial_specs ? initial_specs.bar_x_shift_px : 0); })
				.attr("y", function(d) { return d.label_y; })
                .text(function(d) { 
					if(!('ignore_zero' in data) || !data.ignore_zero){
						return (('show_counts_no_n' in data && data.show_counts_no_n ? "" : "n = ") + (d[data.show_counts] == null ? 0 : d[data.show_counts])); 
					}
					else{
						return d[data.show_counts] == 0 ? "" : (('show_counts_no_n' in data && data.show_counts_no_n ? "" : "n = ") + (d[data.show_counts] == null ? 0 : d[data.show_counts])); 
					}
				
				});
            
            
        }            
        if('show_pcts' in data && [null, false].indexOf(data.show_pcts) == -1){
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                
                if(y(pt.y) + 30 > height){
                    pt.label_y = y(pt.y)-5 - initial_specs.data_table_offset; pt.color_class = "lightish";
                }
                else{
                    pt.label_y = y(pt.y) + 17 - initial_specs.data_table_offset; pt.color_class = "white";
                }
                pt.label_x = x(pt.x) + bandwidth/2 + bandwidth_offset;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return d.color_class + " chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return jsformat(d[data.show_pcts], "1%"); });
                
            
        }            
    }
    
    // Add the comparison line
    var tmp_data = null; var pt = null; var tmp = null;
    if('show_comparison_line' in data && [null, false].indexOf(data.show_comparison_line) == -1){ 
        var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x) + bandwidth/2 + bandwidth_offset; }).y(function(d){ return y(d[data.show_comparison_line]) - initial_specs.data_table_offset; });

        for(var a = 0;a<data.data.length;a++){
            tmp_data = data.data[a];
            
            svg.append("path")
              .datum(tmp_data.points)
              .attr("fill", "none") .attr("stroke", "orange")
              .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
              .attr("stroke-dasharray", "5,5")
              .attr("stroke-width", 3)
              .attr("d", line);
        }
    
    }
    
    
}

function stacked_vertical_bars(data, id, arg_specs, arg_initial_specs = null){
    
    var debug = {'on': true, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
	SITE_MAROON = "rgb(128, 0, 0)"
	SITE_BLUE = "rgb(24, 154, 211)"
	SITE_PURPLE = "rgb(132, 68, 238)"
	SITE_RED = "rgb(240, 0, 0)"
	SITE_GREEN = "rgb(67, 143, 77)"
	SITE_YELLOW = "rgb(200, 200, 0)"
	bar_colors = [SITE_BLUE, SITE_GREEN, SITE_RED, SITE_PURPLE, SITE_MAROON, SITE_YELLOW];

    var has_x_axis_label =  'x' in data.axis_labels && [null, ''].indexOf(data.axis_labels.x) == -1;
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    per_bar_width = width/data.data[0].points.length;
	if('bandwidth_pct' in initial_specs && initial_specs.bandwidth_pct != null){
		bandwidth = per_bar_width * initial_specs.bandwidth_pct; // Padding = .1
	}
	else{
		bandwidth = per_bar_width * .8; // Padding = .1
	}
    bandwidth_offset = per_bar_width * .1;
    
    /* Create graph */
    var show_data_table = 0;
    if('data_table' in data && data.data_table != null){
        show_data_table = 1;
    }
    
    var x = d3.scaleLinear().range([0, width - per_bar_width]);
    var y = null; initial_specs.data_table_offset = 0;initial_specs.data_table_column_offset = 0;
    if(show_data_table){
        
        initial_specs.data_table_offset = data.data_table.length * 25;
		if(!has_x_axis_label){
        
            initial_specs.data_table_y_offset = -25;
        }
        initial_specs.data_table_column_offset = per_bar_width/2;
        y = d3.scaleLinear().range([height, initial_specs.data_table_offset]);    
    }
    else{
        y = d3.scaleLinear().range([height, 0]);
    }
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_width + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // If there is a data-table, add it here
    if('data_table' in data && data.data_table != null){
            
        svg = graph_add_data_table(svg, data, width, height, x, y, initial_specs);     
    }
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'data_table_offset': initial_specs.data_table_offset, 'type': 'vertical_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    // Add an expand icon if there is a hidden data-table
    if(initial_specs.has_data_table && !show_data_table){
        var x_loc = null; var y_loc = null;
        if(has_x_axis_label){
            x_loc = 2 - initial_specs.margin_left;
            y_loc = y(0) + 20;
        }
        else{
            x_loc = width - initial_specs.margin_right - 15;
            y_loc = y(0) + 20;
        }
        
        svg = graph_add_data_table_icon(svg, data, x_loc, y_loc, id, initial_specs);
    }
    
    // Handle the Y-Axis
    //console.log("jq.data"); console.log(data);
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the sub-header image
    if('footer' in data){ svg = graph_add_subheader(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    
    
    // Create the menu icon
    if(initial_specs.menu != null){ initial_specs.svg_id = id;
         svg = graph_add_menu_icon(icon_offset, svg, data, initial_specs); 
         icon_offset -= 25;
    }
    
    // Print the bars
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        for(var b = 0;b<data.y_fields.length;b++){ var y_field = data.y_fields[b];
			
			var is_top_bar = b == data.y_fields.length-1 ? 1 : 0;
			var bars = svg.selectAll("bar").data(tmp_data.points)
			  .enter().append("rect");
			  
			bars.each(function(d){
				
				d.final_fill = bar_colors[b % 6];
				 
			});
			
			 
			bars.attr("class", "bar")
			  .attr("x", function(d) { 
			  console.log("\n\ny_field: " + y_field);
			  console.log(d);
			  console.log("initial_specs.data_table_offset: " + initial_specs.data_table_offset);
			console.log("bandwidth: " + bandwidth);
			console.log(d[y_field], d[y_field + "_y_start"]);
			console.log("y: " + y(d[y_field] + d[y_field + "_y_start"]) - initial_specs.data_table_offset);
			
			  return x(d.x) + bandwidth_offset + ('bar_x_shift_px' in initial_specs ? initial_specs.bar_x_shift_px : 0); })
			  .attr("width", bandwidth)
			  .attr("y", function(d) { return y(d[y_field] + d[y_field + "_y_start"]) - initial_specs.data_table_offset; })
			  .style("fill", function(d){ return d.final_fill; })
			  .attr("height", function(d, i) { return height - y(d[y_field]); });
		}
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];

                pt.label_y = y(pt.y)-5 - initial_specs.data_table_offset; pt.color_class = "lightish";

                pt.label_x = x(pt.x) + bandwidth/2 + bandwidth_offset;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return d.color_class + " chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x + ('bar_x_shift_px' in initial_specs ? initial_specs.bar_x_shift_px : 0); })
				.attr("y", function(d) { return d.label_y; })
                .text(function(d) { // Print the label on top of the stacked bar chart
					if('show_counts' in data && data.show_counts){
						if(!('ignore_zero' in data) || !data.ignore_zero){
							return (('show_counts_no_n' in data && data.show_counts_no_n ? "" : "n = ") +  d[data.show_counts]); 
						}
						else{
							return d[data.show_counts] == 0 ? "" : (('show_counts_no_n' in data && data.show_counts_no_n ? "" : "n = ") +  d[data.show_counts]); 
						}
					}
					else{
						return "";
					}
				});
            
            
        }            
        if('show_pcts' in data && [null, false].indexOf(data.show_pcts) == -1){
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                
                if(y(pt.y) + 30 > height){
                    pt.label_y = y(pt.y)-5 - initial_specs.data_table_offset; pt.color_class = "lightish";
                }
                else{
                    pt.label_y = y(pt.y) + 17 - initial_specs.data_table_offset; pt.color_class = "white";
                }
                pt.label_x = x(pt.x) + bandwidth/2 + bandwidth_offset;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return d.color_class + " chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return jsformat(d[data.show_pcts], "1%"); });
                
            
        }            
    }
    
    // Add the comparison line
    var tmp_data = null; var pt = null; var tmp = null;
    if('show_comparison_line' in data && [null, false].indexOf(data.show_comparison_line) == -1){ 
        var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x) + bandwidth/2 + bandwidth_offset; }).y(function(d){ return y(d[data.show_comparison_line]) - initial_specs.data_table_offset; });

        for(var a = 0;a<data.data.length;a++){
            tmp_data = data.data[a];
            
            svg.append("path")
              .datum(tmp_data.points)
              .attr("fill", "none") .attr("stroke", "orange")
              .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
              .attr("stroke-dasharray", "5,5")
              .attr("stroke-width", 3)
              .attr("d", line);
        }
    
    }
    
    
}

function list_graphic(data, id, arg_specs, arg_initial_specs = null){
    
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    
    var per_bar_height = height/data.data[0].points.length;
    
    // If the list graphic has multiple columns, use the bars will be taller than expected
    if(initial_specs.n_cols > 1){
        per_bar_height *= initial_specs.n_cols;
    }
    
    var bandwidth = per_bar_height * .8; // Padding = .1
    var bandwidth_offset = per_bar_height * .1;
    initial_specs.per_bar_height = per_bar_height;
    initial_specs.bandwidth = bandwidth;
    initial_specs.bandwidth_offset = bandwidth_offset;
    
    
    
    
    var font_size = Math.min(bandwidth/2, 36);
    
    /* Create graph */
    
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height - per_bar_height, 0]);
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // If the list graphic has more than one column, then we would expect the max y value for coordinate purposes to be smaller
    if(initial_specs.n_cols > 1){
        max_y_val /= initial_specs.n_cols;
    }
    
    var test1 = 'use_gifs' in initial_specs && initial_specs.use_gifs && 'gifs_and_names' in initial_specs && initial_specs.gifs_and_names;
    var test2 = (!('use_gifs' in initial_specs) || !initial_specs.use_gifs) && (!('gifs_and_names' in initial_specs) || !initial_specs.gifs_and_names);
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_height + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
   
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    // Handle the Y-Axis
    initial_specs.type = 'list_graphic';
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    
    // Print the rows
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        
        var bars = svg.selectAll("bar").data(tmp_data.points).enter().append("rect");
        
        bars.each(function(d){
            d.final_fill = initial_specs.fill;
            
            if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
        });
          
          
          
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];

                pt.label_x = width - 15;
                pt.anchor = "end";
                pt.fill = "#444";
                pt.label_y = y(pt.y) + font_size + bandwidth_offset + bandwidth / 6 - 2;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", font_size).style("fill", function(d) { return d.fill; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return jsformat(d[data.show_counts], 'show_counts_fmt' in data ? data.show_counts_fmt:""); });
                
            if(test1 || test2){
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return "start"; })
                .attr("class", function(d){ return "lightish chart-tick-label "; })
                .style("font-size", font_size)
                .attr("x", function(d) { return x(min_x_val) + (on_mobile ? 0 : 10); }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return 'player' in d ? d.player : d.team; });
            }

            
        }       
        else{
            var n = tmp_data.points.length;
            for(var a = 0;a<n;a++){
                pt = tmp_data.points[a];

                pt.label_x = width - 15;
                pt.anchor = "end";
                pt.fill = "#444";
                if(initial_specs.n_cols == 1){
                    pt.label_y = y(pt.y) + font_size + bandwidth_offset + bandwidth / 6 - 2;
                    pt.x = x(min_x_val) + (on_mobile ? 0 : 10);
                }
                else{
                    
                    pt.label_y = y(pt.y % Math.floor(n/2)) + font_size + bandwidth_offset + bandwidth / 6 - 2;
                    pt.x = -15 + x(min_x_val) + (on_mobile ? 0 : 10) + (width/initial_specs.n_cols + 50) * Math.floor(a/(n/initial_specs.n_cols));
                }
            }
             
            if(test1 || test2){
                svg.selectAll("bar").data(tmp_data.points)
                    .enter().append("text").attr("text-anchor", function(d) { return "start"; })
                    .attr("class", function(d){ return "lightish chart-tick-label "; })
                    .style("font-size", font_size)
                    .attr("x", function(d) { return d.x; }).attr("y", function(d) { return d.label_y; })
                    .text(function(d) { return 'player' in d ? d.player : d.team; });
            }
        }
    }
    
}

function graphic_table(data, id, arg_specs, arg_initial_specs = null){
    
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    
    var font_size = ('font_size' in arg_specs) && arg_specs.font_size != null ? arg_specs.font_size : 15; 
    var per_bar_height = font_size;
    var bandwidth = 15;
    var bandwidth_offset = 0;
    initial_specs.per_bar_height = per_bar_height;
    initial_specs.bandwidth = bandwidth;
    initial_specs.bandwidth_offset = bandwidth_offset;
    
    
    /* Create graph */
    
    var x = d3.scaleLinear().range([0, width]);
    var header_offset = 20;
    var y = d3.scaleLinear().range([initial_specs.table_height - per_bar_height - 10, header_offset]);
    
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    
    console.log("table.data"); console.log(data.data[0].points);
    //console.log("min.y " + min_y_val + "  max.y " + max_y_val);
    //if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    //else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    //else{ y.domain([min_y_val, max_y_val]); }
    
    y.domain([0, data.data[0].points.length - 1]); 
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_height + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
   
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    // Handle the Y-Axis
    initial_specs.type = 'table'; 
    initial_specs.gifs_and_names = 1;
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    //console.log("initial_specs"); console.log(initial_specs);
    // Print the rows
    var pt = null; var tmp_data = null; var field_locs = {};
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];      
        
        
        
        var bars = svg.selectAll("bar").data(tmp_data.points).enter().append("rect");
        
        bars.each(function(d){
            d.final_fill = initial_specs.fill;
            
            if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
        });
          
        //console.log("initial_specs.table_fields"); console.log(initial_specs.table_fields);
          
        svg.selectAll("bar").data(tmp_data.points)
            .enter().append("line")
            .attr("x1", -initial_specs.margin_left).attr("x2", width + initial_specs.margin_right)
            .attr("y1", header_offset-bandwidth/4).attr("y2", header_offset-bandwidth/4)
            .style("stroke", "#555").style("stroke-width", ".08em").style("fill", null);
            
            // Draw the left-most table column
            var left_obj_boundary = null; var left_obj = null;
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                
                
                pt.fill = "#444";
                pt.label_y = y(a) + font_size + bandwidth_offset + bandwidth / 6 - 2;
                var header_label = ""; var tmp_y = 0;
                if(a == 0){
                    // Print the labels
                    //console.log("Header"); console.log(pt);
                    
                    if('player' in pt && pt.player != null){
                        header_label = "Player";    
                    }
                    if('team' in pt && pt.team != null){
                        header_label = "Team";    
                    }
                    if('conf' in pt && pt.conf != null){
                        header_label = "Conference";    
                    }
                    
                    tmp_y = font_size - header_offset + 10;
                    
                    left_obj = svg.append("text")
                    .style('font-weight', 700).attr('font-family', "Arial")
                    .style("font-size", font_size).style("fill", pt.fill)
                    .attr("x", initial_specs.margin_left + 10).attr("y", tmp_y)
                    .text(header_label).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
                    
                    // We will fill in columns from the right until no more columns fit; left_obj_boundary is the left-most limit for table fields
                    if(left_obj_boundary == null || left_obj_boundary < initial_specs.margin_left + 10 + 10 + obj_w(left_obj)){
                        left_obj_boundary = initial_specs.margin_left + 10 + 10 + obj_w(left_obj);
                    }
                        
                        
                }    
                
                header_label = 'player' in pt ? pt.player : pt.team ;
                tmp_y = pt.label_y ;
                
                
                left_obj = svg.append("text")
                .style('font-weight', 400).attr('font-family', "Arial")
                .style("font-size", font_size).style("fill", pt.fill)
                .attr("x", initial_specs.margin_left + 10).attr("y", tmp_y)
                .text(header_label).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
                
                // We will fill in columns from the right until no more columns fit; left_obj_boundary is the left-most limit for table fields
                if(left_obj_boundary == null || left_obj_boundary < initial_specs.margin_left + 10 + 10 + obj_w(left_obj)){
                    left_obj_boundary = initial_specs.margin_left + 10 + 10 + obj_w(left_obj);
                }
                    
                    
                    
                

                /*svg.append("text").attr("text-anchor", "start")
                .attr("class", "lightish chart-tick-label ")
                .style("font-size", font_size)
                .attr("x", initial_specs.margin_left + 10).attr("y", )
                .text();*/
                
            }
            
            
            // Draw the other table columns
            var tmp_x = specs.width - 15; var tmp_obj = null;
            for(var b = 0;b<initial_specs.table_fields.length;b++){
                var c = initial_specs.table_fields.length - 1 - b;
                var fld = initial_specs.table_fields[c];
                tmp_obj = svg.append("text")
                    .style('font-weight', 700).attr("text-anchor", "end").attr('font-family', "Arial")
                    .style("font-size", font_size).style("color", "#FFF").style("fill", "#FFF")
                    .attr("x", tmp_x).attr("y", font_size - header_offset + 10)
                    .text(initial_specs.table_fields[c].label).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });
                
                var max_w = obj_w(tmp_obj);
                
                for(var a = 0;a<tmp_data.points.length;a++){
                    pt = tmp_data.points[a];
                    tmp_obj = svg.append("text")
                    .style('font-weight', 400).attr("text-anchor", "end").attr('font-family', "Arial")
                    .style("font-size", font_size).style("color", "#FFF").style("fill", "#FFF")
                    .attr("x", tmp_x).attr("y", font_size - header_offset + 10)
                    .text(jsformat(pt[fld.tag], fld.fmt)).attr("width", function(d){ return parseFloat(this.getComputedTextLength()); });    
                    if(obj_w(tmp_obj) > max_w){ max_w = obj_w(tmp_obj); }
                }
                
                // If the width of the next column extends beyond the boundary set by the first column, don't print it and exit the column loop.
                if(tmp_x - max_w < left_obj_boundary){
                    break;
                }
                else{
                
                    tmp_obj = svg.append("text")
                        .style('font-weight', 700).attr("text-anchor", "end").attr('font-family', "Arial")
                        .style("font-size", font_size).style("fill", pt.fill)
                        .attr("x", tmp_x).attr("y", font_size - header_offset + 10)
                        .text(initial_specs.table_fields[c].label);
                    
                    
                    for(var a = 0;a<tmp_data.points.length;a++){
                        pt = tmp_data.points[a];
                        tmp_obj = svg.append("text")
                        .style('font-weight', 400).attr("text-anchor", "end").attr('font-family', fld.fmt == "" ? "Arial" : "Lucida Console")
                        .style("font-size", font_size).style("fill", pt.fill)
                        .attr("x", tmp_x).attr("y", pt.label_y)
                        .text(jsformat(pt[fld.tag], fld.fmt));
                    }
                }
                tmp_x -= (max_w + 20);
                
            }
            
           
            
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("line")
                .attr("x1", -initial_specs.margin_left).attr("x2", width + initial_specs.margin_right)
                .attr("y1", function(d) { return d.label_y + bandwidth/2; }).attr("y2", function(d) { return d.label_y + bandwidth/2; })
                .style("stroke", "#AAA").style("stroke-width", ".04em").style("fill", null);
            
                 
    }
    
}

function horizontal_bars(data, id, arg_specs, arg_initial_specs = null){
    /***
    This function takes in data and produces a graph with horizontal bars.
    ***/
    
    var debug = {'on': true, 'spacing': false, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    
    var per_bar_height = height/data.data[0].points.length;
    if(debug.on && debug.spacing){ console.log("Per Bar Height: " +  height + " / " + data.data[0].points.length + " = " + per_bar_height); }
    per_bar_height = per_bar_height > 80 ? 80 : per_bar_height;
    
    var bandwidth = per_bar_height * .8; // Padding = .1
    var bandwidth_offset = per_bar_height * .1;
    initial_specs.per_bar_height = per_bar_height;
    initial_specs.bandwidth = bandwidth;
    initial_specs.bandwidth_offset = bandwidth_offset;
    var font_size = Math.min(36, bandwidth / 2);
    
    /* Create graph */
    
    var y = d3.scaleLinear().range([height - per_bar_height, 0]);
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("Min: (" + min_x_val + ", " + min_y_val + ") Max: (" + max_x_val + "," + max_y_val + ")"); }
    
    
    // Figure out the maximum name length
    var tmp_data = null; var pt = null; var tmp = null;
    initial_specs.max_name_length = 0;
    var test1 = 'use_gifs' in initial_specs && initial_specs.use_gifs && 'gifs_and_names' in initial_specs && initial_specs.gifs_and_names;
    var test2 = (!('use_gifs' in initial_specs) || !initial_specs.use_gifs) && (!('gifs_and_names' in initial_specs) || !initial_specs.gifs_and_names);
        
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        
        //console.log(test1, test2);
        if(test1 || test2){
            /**
            Since we are printing names along side the team gifs, we need to figure out how long the longest name is
            **/
            
            var measure_font = font_size;
            if(!('show_counts_label' in data && [null, -1, ''].indexOf(data.show_counts_label) == -1)){
                measure_font = bandwidth / 3;
            }
            for(var b = 0;b<tmp_data.points.length;b++){ tmp = tmp_data.points[b];
                var o = svg.append('text')
                    .attr("x", -150).attr("y", -150).attr("opacity", 0)
                    .attr("class", function(d){ return "lightish chart-tick-label "; })
                    .style("font-size", measure_font)
                    .text(tmp.player)
                    .attr("width", function(d){ return this.getComputedTextLength(); })
                if (initial_specs.max_name_length < obj_w(o)){
                    //console.log(tmp.player, obj_w(o));
                    initial_specs.max_name_length = obj_w(o);
                }
            }
            if(!on_mobile){
                initial_specs.max_name_length += 20;
            }
            else{
                initial_specs.max_name_length += 20;
            }
        }
    }
    if(test1){ initial_specs.max_name_length += 60; }
    
    console.log("initial_specs.max_name_length: " + initial_specs.max_name_length);
    
    // Set the domains
    var x = null;
    if('show_counts_label' in data && [null, false].indexOf(data.show_counts_label) == -1){
        console.log("show_counts_label.A");
        x = d3.scaleLinear().range([initial_specs.max_name_length, width*3/4]);
    }
    else{
        console.log("show_counts_label.B");
  
        x = d3.scaleLinear().range([initial_specs.max_name_length, width]);
    }
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_height + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    // Handle the Y-Axis
    initial_specs.type = 'horizontal_bars';
    initial_specs.label_font_size = font_size;
    initial_specs.bandwidth = bandwidth;
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    
    
    // Print the bars
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        console.log('tmp_data'); console.log(tmp_data);
        var bars = svg.selectAll("bar").data(tmp_data.points)
          .enter().append("rect");
          
        bars.each(function(d){
            d.final_fill = initial_specs.fill;
            
            if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
        });
          

          
        bars.attr("class", "bar")
          .attr("x", function(d) { console.log("minx", min_x_val, x(min_x_val)); return x(min_x_val); })
          .attr("height", bandwidth)
          .attr("y", function(d) { return y(d.y) + bandwidth_offset; })
          .style("fill", function(d){ return d.final_fill; })
          .attr("width", function(d, i) { console.log("d.x", d.x, x(d.x), x(d.x) - initial_specs.max_name_length); return x(d.x) - initial_specs.max_name_length; });
    
        
        if('show_counts_label' in data && [null, false].indexOf(data.show_counts_label) == -1){

            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                
                pt.label_x = width - 5
                pt.anchor = "end";
                pt.fill = "#333";
                
                pt.label_y = y(pt.y) + bandwidth/2 + bandwidth_offset + bandwidth / 6 + 1;
            }
                
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", font_size).style("fill", function(d) { return d.fill; })
                .attr("x", pt.label_x ).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return d[data.show_counts_label]; });
            
        }
        
        for(var a = 0;a<tmp_data.points.length;a++){
            pt = tmp_data.points[a];
            if(x(pt.x) - initial_specs.max_name_length < 60){
                pt.label_x = x(pt.x) + 10;
                pt.anchor = "start";
                pt.fill = "#444";
            }
            else{
                pt.label_x = x(pt.x)- (on_mobile ? 10 : 15);
                pt.anchor = "end";
                pt.fill = "#FFF";
            }
            pt.label_y = y(pt.y) +  font_size + bandwidth_offset + bandwidth / 6 - 2;
            //console.log(pt.player, pt.label_x, pt.y, pt.label_y);
        }
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){

            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", bandwidth / 3).style("fill", function(d) { return d.fill; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return jsformat(d[data.show_counts], 'show_counts_fmt' in data ? data.show_counts_fmt:""); });
                
            if('use_gifs' in initial_specs && initial_specs.use_gifs && 'gifs_and_names' in initial_specs && initial_specs.gifs_and_names){

                svg.selectAll("bar").data(tmp_data.points)
                    .enter().append("text").attr("text-anchor", function(d) { return "start"; })
                    .attr("class", function(d){ return "lightish chart-tick-label "; })
                    .style("font-size", font_size)
                    .attr("x", function(d) { return - initial_specs.margin_left + 35 + 15 + 10; }).attr("y", function(d) { return d.label_y; })
                    .text(function(d) { return d.player; });
            }
            
        }
        else if('show_counts_label' in data && [null, -1, ''].indexOf(data.show_counts_label) == -1){
 
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return "start"; })
                .attr("class", function(d){ return "lightish chart-tick-label "; })
                .style("font-size", font_size)
                .attr("x", function(d) { return - initial_specs.margin_left + 10; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return d.player; });

        }        
        if('show_pcts' in data && [null, false].indexOf(data.show_pcts) == -1){
     
            for(var a = 0;a<tmp_data.points.length;a++){
                pt = tmp_data.points[a];
                
                if(y(pt.y) + 30 > height){
                    pt.label_y = y(pt.y)-5; pt.color_class = "lightish";
                }
                else{
                    pt.label_y = y(pt.y) + 17; pt.color_class = "white";
                }
                pt.label_x = x(pt.x) + bandwidth/2 + bandwidth_offset;
            }
            
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", "middle")
                .attr("class", function(d){ return d.color_class + " chart-tick-label " + initial_specs.chart_size; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return jsformat(d[data.show_pcts], "1%"); });
                
            
        }            
    }
    
    // Add the comparison line
    var tmp_data = null; var pt = null; var tmp = null;
    if('show_comparison_line' in data && [null, false].indexOf(data.show_comparison_line) == -1){ 
        var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x) + bandwidth/2 + bandwidth_offset; }).y(function(d){ return y(d[data.show_comparison_line]); });

        for(var a = 0;a<data.data.length;a++){
            tmp_data = data.data[a];
            
            svg.append("path")
              .datum(tmp_data.points)
              .attr("fill", "none") .attr("stroke", "orange")
              .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
              .attr("stroke-dasharray", "5,5")
              .attr("stroke-width", 3)
              .attr("d", line);
        }
    }
}

function horizontal_comparison_bars(data, id, arg_specs, arg_initial_specs = null){
    
    var debug = {'on': true, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    
    per_bar_height = height/(data.data[0].points.length * 3) * .8;
    bandwidth = per_bar_height * .8; // Padding = .1
    bandwidth_offset = per_bar_height * .1;
    initial_specs.per_bar_height = per_bar_height;
    initial_specs.bandwidth = bandwidth;
    initial_specs.bandwidth_offset = bandwidth_offset;
    
    /* Create graph */
    
    var x = d3.scaleLinear().range([0, width - 75]);
    var y = d3.scaleLinear().range([height - per_bar_height, 0]);
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("Mins: (" + min_x_val + ", " + min_y_val + ") Maxs: (" + max_x_val + "," + max_y_val + ")"); }
    
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_height + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_bars', 'bandwidth_offset': bandwidth_offset, 'bandwidth': bandwidth}, initial_specs);
    
    initial_specs.type = 'horizontal_comparison_bars';
    
    var icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    icon_offset = -15;
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    var pt = null;
    // Print the bars
    for(var a = 0;a<data.data.length;a++){
        var tmp_data = data.data[a];
        
        var combined_points = [];
        for(var b = 0;b<tmp_data.points.length;b++){ var pt = tmp_data.points[b];
            combined_points.push({'x': pt.x1, 'y': pt.y + 1, 'context': pt.context1, 'label': pt.label1, 'player': pt.split1});
            combined_points.push({'x': pt.x2, 'y': pt.y + 2, 'context': pt.context2, 'label': pt.label2, 'player': pt.split2});
        }
        
        
        var bars = svg.selectAll("bar").data(combined_points)
          .enter().append("rect");
        
        var max_name_length = 0;
        if(!('use_gifs' in initial_specs && initial_specs.use_gifs) || ('use_gifs' in initial_specs && initial_specs.use_gifs && 'gifs_and_names' in initial_specs && initial_specs.gifs_and_names)){
            /**
            Since we are printing names along side the team gifs, we need to figure out how long the longest name is
            **/
            for(var b = 0;b<combined_points.length;b++){ tmp = combined_points[b];
                var o = svg.append('text')
                    .attr("x", -150).attr("y", -150)
                    .attr("class", function(d){ return "spacer lightish chart-tick-label "; })
                    .attr("opacity", 0)
                    .style("font-size", bandwidth * 2 / 3)
                    .text(tmp.player)
                    .attr("width", function(d){ return this.getComputedTextLength(); })
                if (max_name_length < parseFloat(o.attr("width"))){
                    max_name_length = parseFloat(o.attr("width"));
                }
            }
            if(!on_mobile){
                max_name_length += 20;
            }
            else{
                max_name_length += 20;
            }
        }
            
        bars.each(function(d){
            d.final_fill = initial_specs.fill;
            
            if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
        });
          
          
        bars.attr("class", "bar")
          .attr("x", function(d) { return x(min_x_val) + max_name_length; })
          .attr("height", bandwidth)
          .attr("y", function(d) { return y(d.y) + bandwidth_offset; })
          .style("fill", function(d){ return d.final_fill; })
          .attr("width", function(d, i) { return x(d.x) - max_name_length; });
        
        if('show_counts_label' in data && [null, false].indexOf(data.show_counts_label) == -1){
            for(var a = 0;a<combined_points.length;a++){
                pt = combined_points[a];
                
                pt.label_x = width - 5
                pt.anchor = "end";
                pt.fill = "#333";
                
                pt.label_y = y(pt.y) + bandwidth/2 + bandwidth_offset + bandwidth / 6 + 1;
            }
                
            svg.selectAll("bar").data(combined_points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", bandwidth * 2 / 3).style("fill", function(d) { return d.fill; })
                .attr("x", pt.label_x ).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return d.context; });
            
        }
        
        if('show_counts' in data && [null, false].indexOf(data.show_counts) == -1){
            for(var a = 0;a<combined_points.length;a++){
                pt = combined_points[a];
                if(x(pt.x) - max_name_length < 60){
                    pt.label_x = x(pt.x) + 10;
                    pt.anchor = "start";
                    pt.fill = "#444";
                }
                else{
                    pt.label_x = x(pt.x) - (on_mobile ? 5 : 10);
                    pt.anchor = "end";
                    pt.fill = "#FFF";
                }
                pt.label_y = y(pt.y) + bandwidth/2 + bandwidth_offset + bandwidth / 6 + 1;
            }
            
            console.log("initial_specs");console.log(initial_specs);
            svg.selectAll("bar").data(tmp_data.points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", bandwidth * 2 / 3).style("fill", function(d) { return d.fill; })
                .attr("x", function(d) { return x(0); }).attr("y", function(d) { console.log(d.vrl, d.y, y(d.y + 2)); return y(d.y + 2) - 5; })
                .text(function(d) { return d.vrl + ": " + d[initial_specs.row_descriptor]; });
                
            svg.selectAll("bar").data(combined_points)
                .enter().append("text").attr("text-anchor", function(d) { return d.anchor; })
                .attr("class", function(d){ return " chart-tick-label "; })
                .style("font-size", bandwidth * 2 / 3).style("fill", function(d) { return d.fill; })
                .attr("x", function(d) { return d.label_x; }).attr("y", function(d) { return d.label_y; })
                .text(function(d) { return d.label; });
                
            if(!('use_gifs' in initial_specs && initial_specs.use_gifs) || ('use_gifs' in initial_specs && initial_specs.use_gifs && 'gifs_and_names' in initial_specs && initial_specs.gifs_and_names)){
                svg.selectAll("bar").data(combined_points)
                    .enter().append("text").attr("text-anchor", function(d) { return "start"; })
                    .attr("class", function(d){ return "lightish chart-tick-label "; })
                    .style("font-size", bandwidth * 2 / 3)
                    .attr("x", function(d) { return x(min_x_val) + (on_mobile ? 0 : 10); }).attr("y", function(d) { return d.label_y; })
                    .text(function(d) { return d.player; });
            }
        }            
                    
    }
    
    
}

function horizontal_trainmap(data, id, arg_specs, arg_initial_specs = null){
    /***
    This function displays a single continuous variable along a single axis with each team represented by a single circle+label. The intent of this visualization is to give the viewer a sense of whether teams are bunched or how far from the group a single team might be. The alternative to this layout is a single-column table.
    ***/
    
    var debug = {'on': true, 'spacing': false, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, data, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    initial_specs.chart_type='horizontal_trainmap';
    per_bar_width = width/data.data[0].points.length;
    bandwidth = per_bar_width * .8; // Padding = .1
    bandwidth_offset = per_bar_width * .1;
    
    
    /* Create graph */
    
    var x = d3.scaleLinear().range([0, width - per_bar_width]);
    var y = d3.scaleLinear().range([height, 0]);
    if(debug.on && debug.data){ console.log("Data"); console.log(data); }
    
    // ID the range of possible values
    let {min_x_val, min_y_val, max_x_val, max_y_val} = get_max_mins(data);
    if(debug.on && debug.spacing){ console.log("X: (" + min_x_val + ", " + min_y_val + ") Y: (" + max_x_val + "," + max_y_val + ")"); }
    
    // Set the domains
    x.domain([min_x_val, max_x_val]);
    if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
    
    if(initial_specs.flip_y){ y.domain([max_y_val, min_y_val]); }
    else if('flip' in initial_specs && initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    if(debug.on && debug.spacing){ console.log("Per Bar: " + per_bar_width + " & w/ padding: " + bandwidth); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // Handle the X-Axis
    svg.append("line")
        .attr("x1", -initial_specs.margin_left).attr("x2", width + initial_specs.margin_right)
        .attr("y1", height/2).attr("y2", height/2)
        .style("stroke", "#AAA").style("fill", null);
    // Handle the Y-Axis
    svg = graph_add_title(svg, data, id, initial_specs);
    
    icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(id, icon_offset, svg, data, initial_specs); icon_offset -= 20; }

    // Add the footer image
    if('footer' in data){ svg = graph_add_footer(svg, data, initial_specs); }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, id, initial_specs); }
    
    // Add any text
    if('text' in data){ svg = graph_add_text(svg, data, initial_specs); }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, initial_specs, data); }
    
    // Add the team labels
    if('show-data-labels' in data){
        svg = graph_add_trainmap_data_labels(svg, x, y, width, height, {'type': 'horizontal_trainmap'}, initial_specs, data);
    }
    
    // Print the bubbles
    var tmp_data = null; var pt = null; var tmp = null;
    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        tmp_data.points = tmp_data.points.sort(function(a, b){ return b.highlight - a.highlight; });
        
        
        var circles = svg.selectAll("circle").data(tmp_data.points)
          .enter().append("circle");
          
        circles.each(function(d){
            d.final_fill = initial_specs.fill;
            
            if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
        });
          
          
        circles.attr("class", "circle")
          .attr("cx", function(d) { return x(d.x); })
          .attr("r", function(d) { return d.radius; })
          .attr("cy", function(d) { return height/2; })
          .style("fill", function(d){ return d.final_fill; })
          .style("stroke", "#FFF");
    }
}

function create_pct_y_ticks(series, specs){
    /***
    This function generates the appropriate ticks/labels/spacing for the y-axis when the axis is a percentage. The big benefit of this function is that it IDs round number percentages to show on the axis rather than just showing whatever falls between the highest/lowest value at some consisten interval.
    ***/
    var debug = false;
    var res = {'ticks': [], 'max': null, 'min':  null};
    var max_eff = null; var min_eff = null;
    for(var b = 0;b<series.length;b++){
        var points = series[b].points;
        
        for(var a = 0;a<points.length;a++){
            var g = points[a];
            if(max_eff == null || max_eff < g.y){ max_eff = g.y; }
            if(min_eff == null || min_eff > g.y){ min_eff = g.y; }
        }
    }
    if('min' in specs && specs.min != null){ min_eff = specs.min; }
    if('max' in specs && specs.max != null){ max_eff = specs.max; }
    
    var diff = max_eff - min_eff
    if(debug){ console.log("Eff Range: " + min_eff + " - " + max_eff + " ( diff=" + diff + ")"); }
    
    if('min' in specs && specs.min != null){ 
        var alt_min_eff = min_eff;
    }
    else{ var alt_min_eff = min_eff - diff*.2; }
    
    if('max' in specs && specs.max != null){ 
        var alt_max_eff = max_eff;
    }
    else{ var alt_max_eff = max_eff + diff*.2; }
    if(debug){ console.log("Alt Eff Range: " + alt_min_eff + " - " + alt_max_eff); }
    
    var rounded_min_eff = null; var rounded_max_eff = null; 
    var extra = 0.0;
    
    var rounding_factor1 = 100.0;
    
    var extra_inc = .1;
    var decimals = "0";
    if(diff < .025){
        rounding_factor1 = 1000.0;
        extra_inc = .001;
        decimals = "1";
    }
    else if(diff < .05){
        rounding_factor1 = 500.0;
        extra_inc = .01;
    }
    //console.log("extra_inc: " + extra_inc);
    var rounding_factor2 = parseInt(rounding_factor1 / 10);
    
        
    while(rounded_min_eff == null || rounded_min_eff > min_eff){
        rounded_min_eff = Math.round((alt_min_eff - extra) * rounding_factor1 / 10)/rounding_factor2;
        extra += extra_inc;
    }
    extra = 0.0;
    
    while(rounded_max_eff == null || rounded_max_eff < max_eff){
        rounded_max_eff = Math.round((alt_max_eff + extra) * rounding_factor1 / 10)/rounding_factor2;
        extra += extra_inc;
    }
    
    if(rounded_min_eff == rounded_max_eff){
        rounded_max_eff += diff;
    }

    if(debug){ console.log("Rounded Eff Range: " + rounded_min_eff + " - " + rounded_max_eff); }
    diff = rounded_max_eff - rounded_min_eff;
    var num_ticks = null;
    if('cnt' in specs){
        num_ticks = specs.cnt;
    }
    else{
        num_ticks = 5;
    
        if(Math.abs(diff -.1) < .001){ num_ticks = 5; }
        else if(Math.abs(diff -.2) < .001){ num_ticks = 5; }
        else if(Math.abs(diff -.3) < .001){ num_ticks = 4; }
        else if(Math.abs(diff -.4) < .001){ num_ticks = 5; }
        else if(Math.abs(diff -.5) < .001){ num_ticks = 6; }
        else if(Math.abs(diff -.6) < .001){ num_ticks = 4; }
        else if(Math.abs(diff -.7) < .001){ num_ticks = 8; }
        else if(Math.abs(diff -.8) < .001){ num_ticks = 5; }
        else if(Math.abs(diff -.9) < .001){ num_ticks = 4; }
        else if(Math.abs(diff -1.0) < .001){ num_ticks = 6; }
    }
    
    var inc = (diff) / (num_ticks-1);
    //console.log("Diff: " + diff + "   Inc: " + inc);
    
    for(var a = 0;a<num_ticks;a++){
        
        //var tmp_y = rounded_min_eff + inc*a;
        var tmp = rounded_min_eff + inc*a;
        //res.ticks.push({'y': rounded_min_eff + inc*a, 'label': Math.round(100.0 * (rounded_min_eff + inc*a)) + "%"});
        res.ticks.push({'y': rounded_min_eff + inc*a, 'label': jsformat((rounded_min_eff + inc*a), decimals + "%")});
        if(res.min == null || res.min > tmp){ res.min = tmp; }
        if(res.max == null || res.max < tmp){ res.max = tmp; }
    }

    //console.log("pct y ticks"); console.log(res);
    
    return res;
}

function create_sequential_y_ticks(series, specs = {}){
    /***
    This function generates the appropriate ticks/labels/spacing for the y-axis when the axis is a sequence written on the server-side. This function is different than the create_pct_y_ticks function because it can be used to create graphics that list teams (and therefore might use logo icons) rather than the pct version, which is never used for this type of list graphic.
    ***/
    var res = {'ticks': [], 'max': null, 'min':  null};
    var max_eff = null; var min_eff = null; var label = null;
    for(var b = 0;b<series.length;b++){
        var points = series[b].points;
        
        for(var a = 0;a<points.length;a++){
            var g = points[a];
            if(max_eff == null || max_eff < g.seq){ max_eff = g.seq; }
            if(min_eff == null || min_eff > g.seq){ min_eff = g.seq; }
        }
     
        if('shading_vars' in specs){
            for(var b = 0;b<specs.shading_vars.length;b++){
                var v = specs.shading_vars[b];
                for(var a = 0;a<points.length;a++){
                    var g = points[a];
                    if(max_eff == null || max_eff < g[v]){ max_eff = g[v]; }
                    if(min_eff == null || min_eff > g[v]){ min_eff = g[v]; }
                }
            }
        }
    }
    if('y_inc' in specs){ max_eff += specs.y_inc; }
    //console.log("Eff Range: " + min_eff + " - " + max_eff);
    
    
    var inc = (max_eff - min_eff) * .05;
    //console.log("Numeric inc: " + inc);
    var alt_min_eff = min_eff - inc;
    var alt_max_eff = max_eff + inc;
    //console.log("Alt Eff Range: " + alt_min_eff + " - " + alt_max_eff);
    var rounded_min_eff = null; var rounded_max_eff = null;
    var rounding_factor = null;
    var decimals = "0";
    if(inc < .05){
        rounding_factor = .05;
        decimals = "2";
    }
    else if(inc < 1){
        rounding_factor = 1;
    }
    else if (inc < 5){
        rounding_factor = 20;
    }
    else{
        rounding_factor = 50;
    }
    
    var extra = 0.0;
    while(rounded_max_eff == null || rounded_max_eff < max_eff){
        rounded_max_eff = Math.round(alt_max_eff/rounding_factor + extra)*rounding_factor;
        extra += .01;
    }
    extra = 0.0;
    while(rounded_min_eff == null || rounded_min_eff > min_eff){
        rounded_min_eff = Math.round(alt_min_eff/rounding_factor - extra)*rounding_factor;
        extra += .01;
    }
        
    //console.log("Rounded Eff Range: " + rounded_min_eff + " - " + rounded_max_eff);
    var diff = rounded_max_eff - rounded_min_eff;
    
    var num_ticks = 5;
    
    if(diff <= 10){ num_ticks = 5; }
    else if(diff <= 20){ num_ticks = 5; }
    else if(diff <= 30){ num_ticks = 4; }
    else if(diff <= 40){ num_ticks = 5; }
    else if(diff <= 50){ num_ticks = 6; }
    else if(diff <= 60){ num_ticks = 7; }
    else if(diff <= 70){ num_ticks = 8; }
    else if(diff <= 80){ num_ticks = 5; }
    else if(diff <= 90){ num_ticks = 7; }
    else if(diff <= 100){ num_ticks = 6; }
    
    
    var inc = (diff) / (num_ticks-1);
    //console.log("Diff: " + diff + "   Inc: " + inc);
    
    //console.log('kl.specs'); console.log(specs);
    //console.log("kl.points"); console.log(points);
    //console.log('show_counts_label' in specs, [null, -1, ''].indexOf(specs.show_counts_label) == -1, 'show_counts_label' in specs && [null, -1, ''].indexOf(specs.show_counts_label) == -1)
    if('use_gifs' in specs && specs.use_gifs){
            
        for(var ab = 0;ab<points.length;ab++){
            
            res.ticks.push({'y': points[ab].seq, 'img_src': get_team_gif(points[ab], true), 'label': null});
            
            
            if(res.min == null || res.min > tmp){ res.min = tmp; }
            if(res.max == null || res.max < tmp){ res.max = tmp; }
        }
    }
    else if('show_counts_label' in specs && [null, -1, ''].indexOf(specs.show_counts_label) == -1){
            
        for(var ab = 0;ab<points.length;ab++){
            var g = points[ab];
            var tmp = g.seq;
            
            res.ticks.push({'y': tmp, 'img_src': null, 'label': null});
            
            if(res.min == null || res.min > tmp){ res.min = tmp; }
            if(res.max == null || res.max < tmp){ res.max = tmp; }
        }
     
    }
    else{
        
        
        for(var ab = 0;ab<points.length;ab++){
                
            
            var g = points[ab];
            var tmp = g.seq
            if('fmt' in specs && specs.fmt != null){ 
                label = jsformat(rounded_min_eff + inc*a, specs.fmt );
            }
            else{
                label = jsformat(rounded_min_eff + inc*a, decimals );
            }
            
            res.ticks.push({'y': tmp, 'img_src': null, 'label': g.player});
            
            if(res.min == null || res.min > tmp){ res.min = tmp; }
            if(res.max == null || res.max < tmp){ res.max = tmp; }
        }
    }
    //console.log("era.res"); console.log(res);
    return res;
}

function create_numeric_y_ticks(series, specs = {}){
    /***
    This function generates the appropriate ticks/labels/spacing for the y-axis when the axis is a decimal value. This function is different than the create_pct_y_ticks function because it can be used to create graphics that list teams (and therefore might use logo icons) rather than the pct version, which is never used for this type of list graphic.
    ***/
    var res = {'ticks': [], 'max': null, 'min':  null};
    var max_eff = null; var min_eff = null;
    var points, inc, label, diff, alt_max_eff, alt_min_eff, rounded_min_eff, rounded_max_eff, rounding_factor, n_decimals, extra;
    for(var b = 0;b<series.length;b++){
        points = series[b].points;
        
        for(var a = 0;a<points.length;a++){
            var g = points[a];
            if(max_eff == null || max_eff < g.y){ max_eff = g.y; }
            if(min_eff == null || min_eff > g.y){ min_eff = g.y; }
        }

        if('shading_vars' in specs && specs.shading_vars != null){
            for(var b = 0;b<specs.shading_vars.length;b++){
                var v = specs.shading_vars[b];
                for(var a = 0;a<points.length;a++){
                    var g = points[a];
                    if(max_eff == null || max_eff < g[v]){ max_eff = g[v]; }
                    if(min_eff == null || min_eff > g[v]){ min_eff = g[v]; }
                }
            }
        }
    }
    
    
    if('min' in specs && specs.min != null){ min_eff = specs.min; }
    if('max' in specs && specs.max != null){ max_eff = specs.max; }
    
    if('y_inc' in specs){ max_eff += specs.y_inc; }
    
    diff = max_eff - min_eff;
    inc = (max_eff - min_eff) * .05;
    //console.log("create_numeric_y_ticks.specs"); console.log(specs);
    //console.log("Eff Range: " + min_eff + " - " + max_eff);
    //console.log("Numeric diff: " + diff);
    //console.log("Numeric inc: " + inc);
    alt_min_eff = min_eff - inc;
    alt_max_eff = max_eff + inc;
    //console.log("Alt Eff Range: " + alt_min_eff + " - " + alt_max_eff);
    rounded_min_eff = null; rounded_max_eff = null;
    rounding_factor = null;
    n_decimals = "0";
    if(inc < .01){
        rounding_factor = .01;
        n_decimals = "2";
    }
    else if(inc < .05){
        rounding_factor = .05;
        n_decimals = "2";
    }
    else if(inc < 1){
        rounding_factor = 1;
        n_decimals = "1";
    }
    else if (inc < 5){
        rounding_factor = 20;
        n_decimals = "1";
    }
    else{
        rounding_factor = 50;
    }
    
    extra = 0.0;
    while(rounded_max_eff == null || rounded_max_eff < max_eff){
        rounded_max_eff = Math.round(alt_max_eff/rounding_factor + extra)*rounding_factor;
        extra += .01;
    }
    extra = 0.0;
    while(rounded_min_eff == null || rounded_min_eff > min_eff){
        rounded_min_eff = Math.round(alt_min_eff/rounding_factor - extra)*rounding_factor;
        extra += .01;
    }
        
    //console.log("Rounded Eff Range: " + rounded_min_eff + " - " + rounded_max_eff);
    diff = rounded_max_eff - rounded_min_eff;
    
    var num_ticks = 5;
    
    if(diff <= 10){ num_ticks = 5; }
    else if(diff <= 20){ num_ticks = 5; }
    else if(diff <= 30){ num_ticks = 4; }
    else if(diff <= 40){ num_ticks = 5; }
    else if(diff <= 50){ num_ticks = 6; }
    else if(diff <= 60){ num_ticks = 7; }
    else if(diff <= 70){ num_ticks = 8; }
    else if(diff <= 80){ num_ticks = 5; }
    else if(diff <= 90){ num_ticks = 7; }
    else if(diff <= 100){ num_ticks = 6; }
    
    
    inc = (diff) / (num_ticks-1);
    //console.log("Diff: " + diff + "   Inc: " + inc);
    
    
    if(('use_gifs' in specs && specs.use_gifs) || ('show_counts_label' in specs && [null, -1, ''].indexOf(specs.show_counts_label) == -1)){

            
        for(var ab = 0;ab<points.length;ab++){
            
            
            var g = points[ab]; g.ext = g['gif_path'].split(".")[1];
            var tmp = rounded_min_eff + inc*(g.seq);
            
            g['src'] = "" + g['team_ID'];  g.gif_y = tmp;
            while(g.src.length < 4){ g.src = "0" + g.src; }
            g['fname'] = "team" + g.src + "_" + g.team.replace(" ", "").replace(".", "").replace("-", "").replace("'", "") + "_big." + g.ext;
            img_src = "https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/" + g.fname;
            
            res.ticks.push({'y': tmp, 'img_src': get_team_gif(g, true), 'label': null});
            
            if(res.min == null || res.min > tmp){ res.min = tmp; }
            if(res.max == null || res.max < tmp){ res.max = tmp; }
        }
     
    }
    else{
        
        //console.log("pd.specs"); console.log(specs);
        for(var a = 0;a<num_ticks;a++){
            
            var tmp = rounded_min_eff + inc*a;
            if('fmt' in specs && specs.fmt != null){ 
                label = jsformat(rounded_min_eff + inc*a, specs.fmt );
            }
            else if('js_fmt' in specs && specs.js_fmt != null){ 
                label = jsformat(rounded_min_eff + inc*a, specs.js_fmt );
            }
            else{
                label = jsformat(rounded_min_eff + inc*a, n_decimals );
            }
            
            res.ticks.push({'y': tmp, 'img_src': null, 'label': label});
            
            if(res.min == null || res.min > tmp){ res.min = tmp; }
            if(res.max == null || res.max < tmp){ res.max = tmp; }
        }
    }
    
    //console.log("create_numeric_y_ticks"); console.log(res);
    
    return res;
}

function create_numeric_x_ticks(series, specs = {}){
    /***
    This function creates a list of tick locations as well as the max/min locations for a set of points on an x axis that is specified only by it's range. As opposed to create_game_x_ticks, this function places ticks evenly spaced depending with a total n that is determined based on the desire to have ticks at regular normal intervals and numbers (i.e .35 instead of .37).
    ***/
        
    var res = {'ticks': [], 'max': null, 'min':  null};
    var max_eff = null; var min_eff = null;
	var has_labels = 0;
	var user_labels = [];
    for(var b = 0;b<series.length;b++){
        var points = series[b].points;
        
        for(var a = 0;a<points.length;a++){
            var g = points[a];
			
			// If the user provided labels on the data, create a list of the non blank ones to display later (assuming the counts line up)
			if(!has_labels && 'label' in g){ has_labels = 1; }
			if(has_labels && [null, ''].indexOf(g.label) == -1){ user_labels.push(g.label); }
				
            if(max_eff == null || max_eff < g.x){ max_eff = g.x; }
            if(min_eff == null || min_eff > g.x){ min_eff = g.x; }
        }
     
        if('shading_vars' in specs){
            for(var b = 0;b<specs.shading_vars.length;b++){
                var v = specs.shading_vars[b];
                for(var a = 0;a<points.length;a++){
                    var g = points[a];
                    if(max_eff == null || max_eff < g[v]){ max_eff = g[v]; }
                    if(min_eff == null || min_eff > g[v]){ min_eff = g[v]; }
                }
            }
        }
    }
    
    if('min' in specs && specs.min != null){ min_eff = specs.min; }
    if('max' in specs && specs.max != null){ max_eff = specs.max; }
    
    if('x_inc' in specs){ max_eff += specs.x_inc; }
    //console.log("Eff Range: " + min_eff + " - " + max_eff);
    
    
    var inc = (max_eff - min_eff) * .05;
    //console.log("Numeric inc: " + inc);
    var alt_min_eff = min_eff - inc;
    var alt_max_eff = max_eff + inc;
    //console.log("Alt Eff Range: " + alt_min_eff + " - " + alt_max_eff);
    var rounded_min_eff = null; var rounded_max_eff = null;
    var rounding_factor = null;
    var decimals = "0";
    if(inc < .05){
        rounding_factor = .05;
        decimals = "2";
    }
    else if(inc < 1){
        rounding_factor = 1;
    }
    else if (inc < 5){
        rounding_factor = 20;
    }
    else{
        rounding_factor = 50;
    }
    
    var extra = 0.0;
    while(rounded_max_eff == null || rounded_max_eff < max_eff){
        rounded_max_eff = Math.round(alt_max_eff/rounding_factor + extra)*rounding_factor;
        extra += .01;
    }
    extra = 0.0;
    while(rounded_min_eff == null || rounded_min_eff > min_eff){
        rounded_min_eff = Math.round(alt_min_eff/rounding_factor - extra)*rounding_factor;
        extra += .01;
    }
        
    //console.log("Rounded Eff Range: " + rounded_min_eff + " - " + rounded_max_eff);
	console.log("user_labels"); console.log(user_labels);
    var diff = rounded_max_eff - rounded_min_eff;
    var num_ticks = 5;
    
    if(diff <= 10){ num_ticks = 5; }
    else if(diff <= 20){ num_ticks = 5; }
    else if(diff <= 30){ num_ticks = 4; }
    else if(diff <= 40){ num_ticks = 5; }
    else if(diff <= 50){ num_ticks = 6; }
    else if(diff <= 60){ num_ticks = 7; }
    else if(diff <= 70){ num_ticks = 8; }
    else if(diff <= 80){ num_ticks = 5; }
    else if(diff <= 90){ num_ticks = 7; }
    else if(diff <= 100){ num_ticks = 6; }
    if('num_ticks' in specs && specs.num_ticks != null){
        num_ticks = specs.num_ticks;
    }
    
    
    inc = (diff) / (num_ticks-1);
    //console.log("Diff: " + diff + "   Inc: " + inc);
    var label = null;
    for(var a = 0;a<num_ticks;a++){
        var tmp = rounded_min_eff + inc*a;
		if(has_labels && user_labels.length == num_ticks){
			label = user_labels[a];
		}
		else{
			//var tmp_y = rounded_min_eff + inc*a;
			
			if('fmt' in specs && specs.fmt != null){ 
				label = jsformat(rounded_min_eff + inc*a, specs.fmt );
			}
			else{
				label = jsformat(rounded_min_eff + inc*a, decimals );
			}
		}
        res.ticks.push({'x': rounded_min_eff + inc*a, 'label': label});
        if(res.min == null || res.min > tmp){ res.min = tmp; }
        if(res.max == null || res.max < tmp){ res.max = tmp; }
    }
    console.log("res"); console.log(res);
    return res;
}

function create_game_x_ticks(series, fn_specs={}){
    /***
    This function creates a list of tick locations as well as the max/min locations for a set of points on an x axis that represents evenly spaced things (like games). Note that a tick is only created if there is a label associated with the point; otherwise, no tick is created because there is nothing to show.
    ***/
    var res = {'ticks': [], 'max': null, 'min':  null};
    var used_labels = [];
    var points, tick;
    //var long_series_ID = null;
    //var longest_series= null;
    for(var b = 0;b<series.length;b++){
        
        points = series[b].points;
        /*if(long_series_ID == null || longest_series < points.length){
            long_series_ID = b; longest_series = points.length;
        }*/
        
        for(var a = 0;a<points.length;a++){
            tick = points[a];
            //console.log("tick.x: " + tick.x + " cur min: " + res.min);
            if((res.min == null || res.min > tick.x) && tick.x != null){ res.min = tick.x; }
            if((res.max == null || res.max < tick.x) && tick.x != null){ res.max = tick.x; }
        }
        
            
        for(var a = 0;a<points.length;a++){ var g = points[a];
            if(used_labels.indexOf(g.label) == -1 && typeof g.label != "undefined" && g.label != ""){ 
                res.ticks.push({'x': g.x, 'label': g.label}); used_labels.push(g.label); 
            }
        }
    }
    
    var diff = null; var diff_inc = null;
    //console.log("A) min: " + res.min);
    //console.log("A) max: " + res.max);
    if(res.ticks.length == 2){
        diff = res.max-res.min; diff_inc = diff * .1;
        res.min -= diff_inc;
        res.max += diff_inc;
    }
    else if(res.ticks.length > 2){
        diff = res.max-res.min; diff_inc = diff * .025;
        res.min -= diff_inc;
        res.max += diff_inc;
    }
    //console.log("n: " + res.ticks.length);
    //console.log("diff: " + diff);
    //console.log("B) min: " + res.min);
    //console.log("B) max: " + res.max);
    
    return res;
}

function graph_create_legend(svg, x, y, width, height, initial_specs, data){
    /***
    This function prints a legend at the bottom of a visualization. The location is based on the height - margins, but can be adjusted by included a y_offset key in the data_dot_legend arg. The legend is arrayed horizontally or vertically depending on the data_dot_legend_dot_layout field and each element in the legend_dot_items list is styled depending on it's icon_type value.
    ***/
    
    
    if(!('data_table_offset' in initial_specs)){ initial_specs.data_table_offset = 0; }
    
    var legend = data.legend;
    //console.log("legend"); console.log(legend)
    var start_loc_x = -initial_specs.margin_left + 5;
    var start_loc_y = height + initial_specs.margin_bottom + initial_specs.margin_top + (initial_specs.chart_size == "small" ? -8 : -13 );
    if('y_offset' in legend){ start_loc_y += legend.y_offset; }


    
    for(var a = 0;a<legend.items.length;a++){
        var item = legend.items[a];
        item.loc_x = start_loc_x;
        item.loc_y = start_loc_y;
        var icon_w = 0; var icon_h = 0;
        
        if(item.icon_type == "line"){
            icon_w = 20;
            icon_h = 20;
            item.icon = svg.append("line")
            .attr("x1", item.loc_x + 2).attr("y1", item.loc_y - 2)
            .attr("x2", item.loc_x + 20).attr("y2", item.loc_y - 2)
            .attr("stroke", item.color).attr("stroke-dasharray", item['stroke-dasharray']).attr("stroke-width", item['stroke-width']);
        }
        if(item.icon_type == "rect"){
            icon_w = 25;
            icon_h = icon_w/1.61803398875;
            item.icon = svg.append("rect")
            .attr("width", icon_w).attr("height", icon_h)
            .attr("x", item.loc_x - 5).attr("y", item.loc_y - 10)
            .attr("fill", item.fill)
            .attr("stroke", 'stroke' in item ? item.stroke : item.fill);
        }
        if(item.icon_type == "circle"){
            icon_w = 15; 
            var r = 5;
            icon_h = icon_w;
            item.icon = svg.append("circle")
            .attr("r", r)
            .attr("cx", item.loc_x + r*2).attr("cy", item.loc_y - r)
            .attr("fill", item.fill).attr("stroke", item.stroke);
        }
        
        
        item.object = svg.append("text")
        .attr("x", item.loc_x + icon_w + 5).attr("y", item.loc_y)
        //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
        .attr("class", "font-11").style("font-size", "11px").attr("font-family", "Arial")
        .text(item.label)
        .attr("width", function(d){ return this.getComputedTextLength(); });
        
            
        item.width = obj_w(item.object);
        
        if(legend.layout == "horizontal"){
            if(start_loc_x + item.width < width){
                start_loc_x += item.width + icon_w + 25;
            }
            else{
                start_loc_y -= 18
                item.object.attr("x", -specs.margin_left + icon_w + 10).attr("y", start_loc_y);
                if(item.icon_type == "line"){
                    item.icon.attr("x1", -specs.margin_left + 7).attr("x2", -specs.margin_left + 25).attr("y1", start_loc_y).attr("y2", start_loc_y);
                }
                else if(item.icon_type == "rect"){
                    item.icon.attr("x", -specs.margin_left + 7).attr("y", start_loc_y);
                }
                else if(item.icon_type == "circle"){
                    item.icon.attr("cx", -specs.margin_left + 7).attr("cy", start_loc_y);
                }
                start_loc_x = item.width + icon_w + 10
            }
        }
        else if(legend.layout == "vertical"){
            start_loc_y += icon_h;
        }
        
    }
    return svg;
}

function deadgraph_create_slider(svg, x, y, width, height, initial_specs, data){
    slider = data.slider;
    svg = display_slider(data.slider, svg, initial_specs);
    
    return svg;
}
function deadgraph_create_slider2(svg, initial_specs, data){
    svg = display_slider(svg, initial_specs, data);
    return svg;
}

function graph_add_trainmap_data_labels(svg, x, y, width, height, chart_type, initial_specs, data){
    /***
    This function determines the appropriate location for labels on the trainmap viz and then prints them so that they do not overlap. The challenge here is that trainmap bubbles can be very close to each other, so finding a way to lay out the labels is challenging.
    ***/
    function overlap(locs){
        
        var solution = null; var found_overlap = null;

        attempts = 0;
        while(attempts < 1000 && (found_overlap == null || found_overlap == true)){
            found_overlap = false;
            for(var a = 0;a<locs.length;a++){
                loc = locs[a];
                if(attempts == 0) { // If it's the first time through, just try and default values
            
                    loc.y = loc.cy;
                
                }
                else if(attempts == 1) { // If it's the first time through, just try a standard up and down shift
                    tmp_rnd = Math.random();
                    sign = (a % 2 == 0) ? 1 : -1;
                    adj_rnd = .25;
                    loc.y_offset = height * adj_rnd * sign;
                    loc.y = height/2 + 7 + loc.y_offset;
                }
                else if(attempts < 50) { // If it's the first time through, just try a standard up and down shift
                    tmp_rnd = Math.random(); 
                    sign = (a % 2 == 0) ? 1 : -1;
                    adj_rnd = .25 + tmp_rnd*.15;
                    loc.y_offset = height * adj_rnd * sign;
                    loc.y = height/2 + 7 + loc.y_offset;
                }
                else{
                    
                    tmp_rnd = Math.random();
                    sign = (a % 2 == 0) ? 1 : -1;
                    adj_rnd = .20 + tmp_rnd*.26;
                    loc.y_offset = height * adj_rnd * sign;
                    loc.y = height/2 + 7 + loc.y_offset;
                }
            }    
            for(var a = 0;a<locs.length;a++){
                loc = locs[a];
                
                for(var b = 0;b<locs.length;b++){if(a != b){
                    loc_b = locs[b];
                    
                    //console.log(loc.display, zFormat(loc.y), loc.h, "vs", loc_b.display, zFormat(loc_b.y), loc_b.h);
                    if(loc.y + loc.h < loc_b.y - 25){ // It's above the other label completely
                        //console.log("  A");
                    }
                    else if(loc.y > loc_b.y + loc_b.h + 25){ // It's below the other label
                        //console.log("  B");
                    }
                    else{ // We need to check whether it's overlapping on the x since it could be on the y
                        //console.log("Possible overlap " + loc.display + " & " + loc_b.display);
                        if(loc.cx + loc.w < loc_b.cx - 10){ // It's fully to the left
                        
                        }
                        else if(loc.cx > loc_b.cx + loc_b.w + 10){ // It's fully to the right
                        
                        }
                        else{
                            //console.log("  Yep, " + loc.display + " is overlapping with " + loc_b.display);
                            found_overlap = true; break
                        }
                    }
                }}
                if(found_overlap){ break; }
            }
            attempts += 1; 
            //console.log("Done attempt " + attempts);
        }
             
        
        time_log[time_log.length-1].end = new Date().getTime();
        return locs;
    }
    
    tag = data['show-data-labels']
    locs = [];
    for(var a = 0;a<data.data.length;a++){
        var pts = data.data[a].points;
        
        for(var b = 0;b<pts.length;b++){
            pt = pts[b];
            pt.y_offset = ((b%2 == 0) ? height * .25 : height * -.25) + 7;
            
            pt.x_offset = 0;
            
            pt.object1 = svg.append("text")
                .attr("x", x(pt.x) + pt.x_offset).attr("y", height*.5 + pt.y_offset)
                //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .attr("class", "graph-data-label font-11").attr("font-family", "Arial")
                .attr("text-anchor", "middle" )
                .text(pt[tag])
                .attr("width", function(d){ return this.getComputedTextLength(); });
            pt.object2 = svg.append("text")
                .attr("x", x(pt.x) + pt.x_offset).attr("y", height*.5 + pt.y_offset)
                //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .attr("class", "graph-data-label font-11").attr("font-family", "Arial")
                .attr("text-anchor", "middle" )
                .text(pt.val_str)
                .attr("width", function(d){ return this.getComputedTextLength(); });
            pt.w1 = parseFloat(pt.object1.attr("width"));
            pt.w2 = parseFloat(pt.object2.attr("width"));
            pt.w = Math.max(pt.w1, pt.w2);
            pt.cx = parseFloat(pt.object1.attr("x"));
            pt.cy = parseFloat(pt.object1.attr("y"));
            pt.h = 14;
        
            locs.push(pt);
        }
        
        
        
    }
    
    svg.selectAll(".graph-data-label").remove();

    if(overlap(locs) != null){
        // Remove the labels?
        
        for(var b = 0;b<locs.length;b++){
            pt = locs[b];
            pt.cy = pt.y;
            svg.append("line")
                .attr("x1", x(pt.x) + pt.x_offset)
                .attr("x2", x(pt.x) + pt.x_offset)
                .attr("y1", function(d){ if(pt.y < height/2){ return pt.y + 25; } else { return pt.y - 20; } } )
                    .attr("y2", height/2)
                .style("stroke", "#AAA").style("fill", null)
            ;
            
        }
        for(var b = 0;b<locs.length;b++){
            pt = locs[b];
            pt.cy = pt.y;
           
            svg.append("rect")
                .attr("x", x(pt.x) - pt.w/2).attr("y", pt.y - 8)
                .attr("width", pt.w).attr("height", 23)
                .style("fill", "#FFF")
                //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .attr("class", "graph-data-label-rect");
            
            svg.append("text")
                .attr("x", x(pt.x) + pt.x_offset).attr("y", pt.y)
                //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .attr("class", "graph-data-label font-11").attr("font-family", "Arial")
                .attr("text-anchor", "middle" )
                .text(pt[tag])
            ;
            svg.append("text")
                .attr("x", x(pt.x) + pt.x_offset).attr("y", pt.y + 15)
                //.attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size)
                .attr("class", "graph-data-label font-11").attr("font-family", "Arial")
                .attr("text-anchor", "middle" )
                .text(pt.val_str)
            ;

            
        }
        
    }
    return svg;
}


function custom_last_game_tile(misc, id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, misc, arg_specs, arg_initial_specs);
    
    var tags = [];
    tags.push({'if_populated': null, 'label': 'Offense', 'var': 'off_efficiency_exclusive', 'league_var': 'off_efficiency'});
    tags.push({'if_populated': 1, 'label': 'Defense', 'var': 'def_efficiency_inverted_exclusive', 'league_var': 'def_efficiency_inverted'});
    tags.push({'if_populated': 0, 'label': 'Defense', 'var': 'def_efficiency_exclusive', 'league_var': 'def_efficiency'});
    tags.push({'if_populated': null, 'label': 'Faceoffs', 'var': 'faceoff_win_rate_exclusive', 'league_var': 'faceoff_win_rate'});
    
    var tags_populated = 0
    for(var a=0;a<tags.length;a++){
        var tag = tags[a];
        tag.game = misc.data.last_game[tag.league_var];
        tag.my_avg = misc.data[tag.var];
        tag.league_avg = misc.data["league_" + tag.league_var];
        tag.league_low = null; tag.league_high = null;
        tag.populated = 0;
        if(misc.data["10_90_range_" + tag.league_var] != null){
            tag.populated = 1; tags_populated += 1;
            tag.league_low = misc.data["10_90_range_" + tag.league_var][0];
            tag.league_high = misc.data["10_90_range_" + tag.league_var][1];
            
            tag.rng = tag.league_high - tag.league_low;
            tag.ranges = []

            tag.inc = tag.rng * .01;
            
            for(var b = 0;b<1000;b++){
                tag.ranges.push({'extension': b, 'high': misc.data["10_90_range_" + tag.league_var][1] + tag.inc*b, 'low': misc.data["10_90_range_" + tag.league_var][0] - tag.inc*b})
                
                
            }
                    
            tag.game_relative = tag.game-tag.league_low;
            tag.my_avg_relative = tag.my_avg-tag.league_low;
            tag.game_relative_to_range_as_pct = tag.game_relative/tag.rng;
            tag.my_avg_relative_to_range_as_pct = tag.my_avg_relative/tag.rng;
            tag.cutoff = null;
            for(var b = 0;b<tag.ranges.length;b++){
                rng = tag.ranges[b]; rng.diff = rng.high - rng.low;
                game_relative = tag.game-rng.low;
                my_avg_relative = tag.my_avg-rng.low;
                game_relative_to_range_as_pct = game_relative/rng.diff;
                my_avg_relative_to_range_as_pct = my_avg_relative/rng.diff;
                if(game_relative_to_range_as_pct >= 0 && game_relative_to_range_as_pct <= 1 && my_avg_relative_to_range_as_pct >= 0 && my_avg_relative_to_range_as_pct <= 1){
                    if(tag.cutoff == null){ tag.cutoff = b; }
                    rng.success = 1;
                }
                else{
                    rng.success = 0;
                }
            }
        }
    }
    
    //console.log("tags");console.log(tags);
    for(var a = 0;a<tags.length;a++){
        var tag = tags[a];
        if(tag.populated && tag.cutoff in tag.ranges && tag.ranges[tag.cutoff] != null){
            rng = tag.ranges[tag.cutoff]; rng.diff = rng.high - rng.low;
            tag.game_relative = tag.game-rng.low;
            tag.my_avg_relative = tag.my_avg-rng.low;
            tag.game_relative_to_range_as_pct = tag.game_relative/rng.diff;
            tag.my_avg_relative_to_range_as_pct = tag.my_avg_relative/rng.diff;
        }
    }
    
    var max_cutoff = null;
    for(var a= 0;a<tags.length;a++){
        if(tags[a].cutoff != null && (max_cutoff == null || max_cutoff < tags[a].cutoff)){
            max_cutoff = tags[a].cutoff;
        }
    }
    
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);
    x.domain([0, 1]);
    y.domain([0, height]);
    
    if(tags_populated > 0){
        
        tags = tags.filter(r=> r.if_populated == 1 || r.if_populated == null);
        for(var a=0;a<tags.length;a++){
            var tag = tags[a];
            tag.height = 50 * a + 20;
        }
        svg.append("line")
                .attr("x1", x(.60)).attr("y1", 35)
                .attr("x2", x(.60)).attr("y2", height-35)
                .style("stroke-width", 1.5).style("stroke", "rgb(173, 173, 173)").style("fill", "none").style('stroke-dasharray', '2,2');
        
        svg.append("text")
                .attr("x", x(.60)).attr("y", height-20)
                .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                .attr("text-anchor", function (d) { return "middle";  }  )
                .text("Median Team");
        
        // Legend
        svg.append("line")
            .attr("x1", x(.03)).attr("y1", height - 26)
            .attr("x2", x(.08)).attr("y2", height - 26)
            .style("stroke-width", 2.5).style("stroke", "#F00").style("fill", "none").style('stroke-dasharray', '3,3');

        svg.append("text")
                .attr("x", x(.10)).attr("y", height - 23)
                .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                .attr("text-anchor", function (d) { return "start";  }  )
                .text("vs " + misc.data.last_game.opp_short_code);
            
        svg.append("line")
            .attr("x1", x(.03)).attr("y1", height - 11)
            .attr("x2", x(.08)).attr("y2", height - 11)
            .style("stroke-width", 2.5).style("stroke", "#00F").style("fill", "none").style('stroke-dasharray', '3,3');

        svg.append("text")
                .attr("x", x(.10)).attr("y", height - 8)
                .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                .attr("text-anchor", function (d) { return "start";  }  )
                .text("Season Avg.");
                
                
        
        
        for(var a= 0;a<tags.length;a++){
            var tag = tags[a];
        
            svg.append("text")
                .attr("x", 0).attr("y", tag.height)
                .attr("text-anchor", function (d) { return "start";  }  )
                .attr("class", "lightish chart-axis-label " + initial_specs.chart_size)
                .text(tag.label);  
            /*svg.append("text")
                .attr("x", width).attr("y", tag.height)
                .attr("text-anchor", function (d) { return "end";  }  )
                .attr("class", "light chart-tick-label " + initial_specs.chart_size)
                .text(Math.round(100*tag.game) + "% / " + Math.round(100*tag.my_avg) + "% / (" + Math.round(100*tag.league_low) + "%" +  + Math.round(100*tag.league_avg) + "%" +  + Math.round(100*tag.league_high) + "%" + ")");  
            */
            // Print the default rect
            svg.append("rect")
                .attr("x", x(.30))
                .attr("y", tag.height + 15)
                .attr("width", x(.6))
                .attr("height", 10)
                .style("fill", "#FFF")
                .style('stroke', '#888');
            
            // Print the game result
            svg.append("line")
                .attr("x1", x(tag.game_relative_to_range_as_pct*.6 + .30)).attr("y1", tag.height + 0)
                .attr("x2", x(tag.game_relative_to_range_as_pct*.6 + .30)).attr("y2", tag.height + 40)
                .style("stroke-width", 1.5).style("stroke", "#F00").style("fill", "none").style('stroke-dasharray', '3,3');
        
            // Print your average result
            svg.append("line")
                .attr("x1", x(tag.my_avg_relative_to_range_as_pct*.6 + .30)).attr("y1", tag.height + 10)
                .attr("x2", x(tag.my_avg_relative_to_range_as_pct*.6 + .30)).attr("y2", tag.height + 30)
                .style("stroke-width", 1.5).style("stroke", "#00F").style("fill", "none").style('stroke-dasharray', '1,1');
        
            
            
        }
    }
    else{
        
        tags = tags.filter(r=> r.if_populated == 0 || r.if_populated == null);
        for(var a=0;a<tags.length;a++){
            var tag = tags[a];
            tag.height = 50 * a + 50;
        }
        
                
        for(var a= 0;a<tags.length;a++){
            var tag = tags[a];
            console.log(tag);
        
            svg.append("text")
                .attr("x", x(.15)).attr("y", tag.height)
                .attr("text-anchor", function (d) { return "start";  }  )
                .attr("class", "lightish chart-axis-label font-18")
                .text(tag.label); 


        
            svg.append("text")
                .attr("x", x(.85)).attr("y", tag.height)
                .attr("text-anchor", function (d) { return "end";  }  )
                .attr("class", "lightish chart-axis-label font-18")
                .text(jsformat(tag.game, "1%"));                 
                
            /*svg.append("text")
                .attr("x", width).attr("y", tag.height)
                .attr("text-anchor", function (d) { return "end";  }  )
                .attr("class", "light chart-tick-label " + initial_specs.chart_size)
                .text(Math.round(100*tag.game) + "% / " + Math.round(100*tag.my_avg) + "% / (" + Math.round(100*tag.league_low) + "%" +  + Math.round(100*tag.league_avg) + "%" +  + Math.round(100*tag.league_high) + "%" + ")");  
            */
            
        }
    
    }
    
    if(debug.on && debug.spacing){
        console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height));
    }
    
    data = misc.data;
}

function custom_conditional_RPI_tile(misc, id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': false};
    
    var games = misc.data.future_games;
    
    row_height = 29;
    calc_height = 65 + row_height * games.length;
    
    arg_specs.height = calc_height;
    
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, misc, arg_specs, arg_initial_specs);
    if(width <= 0){ return; }

    var check1 = !('last_sim' in misc.data) || misc.data.last_sim == null
	var check2 = !('alt_last_sim' in misc.data) || misc.data.alt_last_sim == null
    if(check1 && check2){
        var single_stat = "<div class='col-12'><span class='lightish contents font-20'>[header]</span></div>";
        single_stat += "<div class='col-12 centered ' style='padding-top:65px;'><span class='tile-message font-18'>[stat]</span></div>";
        $("#conditional_rpi_div").empty(); 
        $("#conditional_rpi_div").append(single_stat.split("</div>")[1].replace('[stat]', "Check back later. Simulations have not been run yet."));
    }
    else{
		var tmp_rpi_data = 'alt_last_sim' in misc.data && misc.data.alt_last_sim != null ? misc.data.alt_last_sim : misc.data.last_sim;
        var cur_projected_RPI = tmp_rpi_data.y;
		var cur_projected_RPI_str = Math.round(cur_projected_RPI);
        
        var min_x_val = null;
        var max_x_val = null;
        
        
        if(games.length == 0){
            min_x_val = 0;
            max_x_val = cur_projected_RPI_str*2;
        }
        

        for(var a=0;a<games.length;a++){
            var gm = games[a];
            gm.height = row_height * a + 30;
            gm.diff = gm.avg_RPI_with_loss - gm.avg_RPI_with_win;
            
            if(min_x_val == null || min_x_val > gm.avg_RPI_with_loss){ min_x_val = gm.avg_RPI_with_loss; }
            if(min_x_val == null || min_x_val > gm.avg_RPI_with_win){ min_x_val = gm.avg_RPI_with_win; }
            if(max_x_val == null || max_x_val < gm.avg_RPI_with_loss){ max_x_val = gm.avg_RPI_with_loss; }
            if(max_x_val == null || max_x_val < gm.avg_RPI_with_win){ max_x_val = gm.avg_RPI_with_win; }
        }
        
        
        
        var x = d3.scaleLinear().range([160, width-30]);
        var y = d3.scaleLinear().range([height, 0]);
        x.domain([min_x_val, max_x_val]);
        if(initial_specs.flip_x){ x.domain([max_x_val, min_x_val]); }
        
        y.domain([0, height]);
        if(initial_specs.flip_y){ x.domain([height, 0]); }
        
        
        
        svg.append("text")
                .attr("x", x(cur_projected_RPI_str)).attr("y", height-20)
                .attr("class", "lightish chart-axis-label " + initial_specs.chart_size)
                .attr("text-anchor", function (d) { return "middle";  }  )
                .text("Current Projected RPI: " + zFormat(cur_projected_RPI_str, 0));
        
        jsfmt = (max_x_val - min_x_val < 10) ? "1" : "0";
        // Header
        svg.append("text")
            .attr("x", 10).attr("y", 15)
            .attr("text-anchor", function (d) { return "start";  }  )
            .attr("class", "lightish chart-axis-label bold " + initial_specs.chart_size)
            .text("Opponent"); 
        svg.append("text")
            .attr("x", x(cur_projected_RPI_str) - 20).attr("y", 15)
            .attr("text-anchor", function (d) { return "end";  }  )
            .attr("class", "lightish chart-axis-label bold " + initial_specs.chart_size)
            .text("Proj w/ W"); 
        svg.append("text")
            .attr("x", x(cur_projected_RPI_str) + 20).attr("y", 15)
            .attr("text-anchor", function (d) { return "start";  }  )
            .attr("class", "lightish chart-axis-label bold " + initial_specs.chart_size)
            .text("Proj w/ L"); 
                
        svg.append("line")
                .attr("x1", 5).attr("y1", 22)
                .attr("x2", width-5).attr("y2", 22)
                .style("stroke-width", 1.5).style("stroke", "rgb(133, 133, 133)").style("fill", "none");
        
        
        // Legend
        for(var a=0;a<games.length;a++){
            var gm = games[a];
            
            
            gm.cur_x = x(cur_projected_RPI_str);
            gm.win_x = x(gm.avg_RPI_with_win);
            gm.loss_x = x(gm.avg_RPI_with_loss);

            
            svg.append("text")
                .attr("x", 10).attr("y", gm.height + 27)
                .attr("text-anchor", function (d) { return "start";  }  )
                .attr("class", "mouseover-link pointer lightish chart-axis-label " + initial_specs.chart_size)
                .attr("onclick", "submit_team_form_from_conditional_rpi(" + gm.opponentID + ");")
                .text(gm.opp_short_code);

           

            svg.append("foreignObject")
                .attr("width", 0)
                .attr("height", 0)
                .attr("class", "input")
                .append("xhtml:form")
                .attr("id", 'conditional_rpi_game_form' + gm.opponentID)
                .attr("action", "/team_detail")
                .attr("method", "POST")
                //.html(function(d) {return "<strong>Name:</strong>"}) 
                .append("input")
                .attr("value", gm.opponentID)
                .attr("name", 'detail_team_ID')
                .attr("type", "hidden")
                .append("input")
                .attr("value", misc.came_from)
                .attr("name", 'came_from')
                .attr("type", "hidden");
                        

            if([gm.avg_RPI_with_win, gm.avg_RPI_with_loss].indexOf(null) == -1){
                // Print the full range rect
                svg.append("rect")
                    .attr("x", x(gm.avg_RPI_with_win))
                    .attr("y", gm.height + 15)
                    .attr("width", gm.loss_x - gm.win_x)
                    .attr("height", 10)
                    .style("fill", "#FFF")
                    .style('stroke', '#888');
                
                win_width = null; loss_width = null;
                win_start = null; loss_start = null;
                
                
                
                if(gm.loss_x < gm.cur_x){ // RPI improves with a loss
                    
                    if(gm.win_x > gm.cur_x){ // RPI gets worse with a win
                        /*loss_start = x(cur_projected_RPI_str) + 1;
                        loss_width = gm.loss_x - gm.cur_x - 1;
                        win_width = (gm.win_x - gm.loss_x - 1)
                        win_start = x(cur_projected_RPI_str) + 1;*/
                    }
                    else{  // RPI improves with a win
                        rect_width = x(gm.avg_RPI_with_loss) -  gm.win_x;
                        
                        win_start = x(gm.avg_RPI_with_win) + 1;
                        loss_start = win_start + rect_width/2;
                        win_width = rect_width/2;
                        loss_width = rect_width/2;
                    }
                }
                else{// RPI gets worse with a loss
                    if(gm.win_x > gm.cur_x){ // RPI gets worse with a win
                        rect_width = x(gm.avg_RPI_with_loss) -  gm.win_x;
                        
                        win_start = x(gm.avg_RPI_with_win) + 1;
                        loss_start = win_start + rect_width/2;
                        win_width = rect_width/2;
                        loss_width = rect_width/2;
                    }
                    else{// RPI improves with a win
                        win_width = (gm.cur_x - gm.win_x - 1)
                        win_start = x(gm.avg_RPI_with_win) + 1;
                        loss_start = x(cur_projected_RPI_str) + 1;
                        loss_width = gm.loss_x - gm.cur_x - 1;
                    }
                }
                    // Print the win rect
                    if(win_width != null){
                        svg.append("rect")
                        .attr("x", win_start)
                        .attr("y", gm.height + 15 + 1)
                        .attr("width", win_width)
                        .attr("height", 8)
                        .attr("class", "green");
                    }
                    
                    // Print the loss rect
                    if(loss_width != null){
                        svg.append("rect")
                        .attr("x", loss_start)
                        .attr("y", gm.height + 15 + 1)
                        .attr("width", loss_width)
                        .attr("height", 8)
                        .attr("class", "red");
                    }
                    
                    svg.append("text")
                        .attr("x", x(gm.avg_RPI_with_loss) + 5).attr("y", gm.height + 23)
                        .attr("text-anchor", function (d) { return "start";  }  )
                        .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                        .text(jsformat(gm.avg_RPI_with_loss, jsfmt));  
                        
                    svg.append("text")
                        .attr("x", 
                            function(){ 
                                if(gm.win_x > gm.cur_x){ return x(gm.avg_RPI_with_win); } 
                                else{ return x(gm.avg_RPI_with_win) - 5; } 
                        
                            }
                        )
                        .attr("y", 
                            function(){ 
                                if(gm.win_x > gm.cur_x){ return gm.height + 10; } 
                                else{ return gm.height + 23; } }
                        )
                        .attr("text-anchor", function (d) { if(gm.win_x > gm.cur_x){ return "start"; } else{ return "end"; }  }  )
                        .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                        .text(jsformat(gm.avg_RPI_with_win, jsfmt));  
                    
            }
            else{
                svg.append("text")
                    .attr("x",  width-20 )
                    .attr("y", 
                        function(){ 
                            if(gm.win_x > gm.cur_x){ return gm.height + 10; } 
                            else{ return gm.height + 23; } }
                    )
                    .attr("text-anchor", "end"  )
                    .attr("class", "lightish chart-tick-label " + initial_specs.chart_size)
                    .text("N/A");  
            }
        }
        
        svg.append("line")
                .attr("x1", x(cur_projected_RPI_str)).attr("y1", 35)
                .attr("x2", x(cur_projected_RPI_str)).attr("y2", height-35)
                .style("stroke-width", 1.5).style("stroke", "rgb(173, 173, 173)").style("fill", "none").style('stroke-dasharray', '2,2');
        
        if(debug.on && debug.spacing){
            console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height));
        }
    }
}

function custom_next_game_tile(misc, id, arg_specs, arg_initial_specs = null){
    /***
    On the teams home page, the next game tile shows the current team's next opponent along with a visualization showing, of the opponent's recent games, how they performed. Idea is to give the user a quick at-a-glance view of which game film they should see, depending on whether they want to see their next opponent doing well or poorly.
    ***/
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, misc, arg_specs, arg_initial_specs);
    
    var tags = [];
    tags.push({'label': 'Off', 'var': 'off_efficiency'});
    tags.push({'label': 'Def', 'var': 'def_efficiency_inverted'});
    tags.push({'label': 'FO%', 'var': 'faceoff_win_rate'});
    
    
    var game_list = misc.data.next_game.history.filter(gm => gm.this_year);
    var num_games = game_list.length;
    
    for(var a = 0;a<num_games;a++){
        
        var game = game_list[a];
        
        game.show = 1;
        game.bottom_indicator = 0;
        if(specs.version == "aggregate"){
            if(a < 2 || a > num_games - 3){
                game.show = 1;
            }
            else{
                game.show = 0;
            }
            if(a == 2){
                game.bottom_indicator = 1;
            }
        }
        
        
        game.top_indicator = null;
        
        if(specs.version == "aggregate"){
            if(a == 0){ game.top_indicator = "2 Best Games"; }
            if(a == num_games - 2){ game.top_indicator = "2 Worst Games"; }
        }
    }
    
    var elem = $("#" + id); elem.empty();
    var header = "";
    header += "<div id='next_game_header_row' class='bbottom flex no-padding' style='margin-top:0px; margin-bottom: 3px;'>";
    header += "<div class='col-3'><span class='font-14 bold'>Opp.</span></div>"
    for(var b = 0;b<tags.length;b++){
        var tag = tags[b];
        header += "<div class='col-3 centered'><span class='font-14 bold'>" + tag.label + "</span></div>"
    }
    header += "</div>"
    
    elem.append(header);
    
    var which = "top";
    for(var a = 0;a<misc.data.next_game.history.length;a++){
        var game = misc.data.next_game.history[a];
        if(game.show){
            //console.log(game);
        
            if(which == "top" && game.top_indicator != null){
                html = "";
                html += "<div class='no-padding'>";
                html += "<div class='col-12 no-padding'><span class='font-12' style='font-style:italic;'>" + game.top_indicator + "</span></div>"
                html += "</div>"
                elem.append(html);
            }
            
            html = "";
            html += "<div class='flex opp-game-row' style='padding:4px;'>";
            html += "<div class='col-3 no-padding'><FORM id='future_form" + game.ID + "' action='/team_detail' method=POST><input type=hidden name='detail_team_ID' value='" + game.opponentID + "'><input type=hidden name='came_from' value='home' /><span class='mouseover-link pointer font-14 contents' onclick=\"document.getElementById('future_form" + game.ID + "').submit();\">" + game.opp_short_code + "</span></FORM></div>"
            for(var b = 0;b<tags.length;b++){
                var tag = tags[b];
                html += "<div class='col-3 no-padding centered'><span class='large-dot' style='background-color: " + game['color_' + tag.var] + ";'>" + "</span></div>";
            
            }
            html += "</div>"
            elem.append(html);
        }
    }
    
    if(misc.data.next_game.history.length == 4){
        html = "";
        html += "<div class='flex opp-game-row' style='padding:4px;'>";
        html += "<div class='col-3 no-padding'><span class='font-14'></span></div>"
        for(var b = 0;b<tags.length;b++){
            var tag = tags[b];
            html += "<div class='col-3 no-padding centered'></div>";
        
        }
        html += "</div>"
        elem.append(html);
    }
}


function rnd(a){ return Math.round(a); }

function spark_bar(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
   
    
    if('show_border' in initial_specs){
        var border_rect = svg.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", width).attr("height", specs.height)
            .attr("rx", 3).attr("ry", 3)
            .attr('id', id + "-spark-bar-div")
            .style("fill", specs.bar_fill)
            .attr("class", "spark-bar-background");
    }
    var tmp_width = specs.bar_width*width - 2;
    tmp_width = tmp_width < 0 ? 0 : tmp_width;
    var left_from_origin = ('left_from_origin' in specs && specs.left_from_origin) ? 1 : 0;
    var value_rect = svg.append("rect")
		.attr("x", left_from_origin ? width - tmp_width : 1).attr("y", 1)
		.attr("width", tmp_width).attr("height", specs.height-2)
		.attr("rx", 1).attr("ry", 1)
		.attr('id', id + "-spark-bar")
        .style("fill", specs.fill).style("stroke-width", 0)
		.attr("class", "spark-bar-fill");
        
    if(specs.bar_width < 1.0){
        var tmp_x_loc = specs.bar_width*width - 2;
        tmp_x_loc = tmp_x_loc < 0 ? 0 : tmp_x_loc;
        var tmp_height_val = specs.height - 2;
        tmp_height_val = tmp_height_val < 0 ? 0 : tmp_height_val;
        
        svg.append("rect")
            .attr("x", left_from_origin ? width - tmp_x_loc : tmp_x_loc).attr("y", 1)
            .attr("width", 1).attr("height", tmp_height_val)
            .attr('id', id + "-spark-bar")
            .style("fill", specs.fill).style("stroke-width", 0)
            .attr("class", "spark-bar-fill");
    }
    
    // Add data labels if necessary
    if('label' in initial_specs && initial_specs.label != null){
        anchr = "end"; clr = 'color' in specs ? specs.color : "white";
        label = svg.append("text").attr("text-anchor", anchr )
            .attr("x", specs.bar_width*width - 5).attr("y", specs.height - 4)
            .attr("font-size", 'label-font-size' in initial_specs ? initial_specs['label-font-size'] : 10).attr("font-family", "Arial").style("fill", clr).style("opacity", 0)
            .text(initial_specs.label);

		
            
        if(specs.bar_width < .35){
			if(left_from_origin){
				anchr = "end"; clr = 'color' in specs ? specs.color : "#666";
				label.attr("x", width - tmp_width - 5).attr("text-anchor", anchr ).style("fill", clr);
				
			}
			else{
				anchr = "start"; clr = 'color' in specs ? specs.color : "#666";
				label.attr("x", specs.bar_width*width + 2).attr("text-anchor", anchr ).style("fill", clr);
			}
        }
		else{
			if(left_from_origin){
				anchr = "start";
				label.attr("x", width - tmp_width + 10).attr("text-anchor", anchr ).style("fill", clr);
			}
			else{
				anchr = "end";
				label.attr("x", specs.bar_width*width - 10).attr("text-anchor", anchr ).style("fill", clr);
				
			}
		}
        label.style("opacity", 1);
    }
    
}

function pct_of_circle(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
	if(typeof specs.val == "undefined"){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
   
    
    // background circle
	svg.append("circle")
		.attr("parent_id", id)
		.attr("r", specs.r)
		.attr("fill", "none")
		.attr("stroke", "#fff")
		.attr("stroke-width", specs.line_width);

	// arc generator
	var arc = d3.arc()
		.innerRadius(specs.r - specs.line_width)
		.outerRadius(specs.r)
		.startAngle(0);
	var endArc = d3.arc()
		.innerRadius(specs.r - specs.line_width)
		.outerRadius(specs.r)
		.endAngle(2 * Math.PI);

	// foreground arc (progress)
	tmp_pct = [null, 'N/A'].indexOf(specs.val) > -1 ? null : specs.val / 100
	//tmp_pct = 1;
	arc_color = "rgb(24, 154, 211)";
	arc_background_color = "rgb(245, 245, 245)";
	if(tmp_pct != null && 'scale_color' in specs && specs.scale_color == "red-to-site-blue"){
		
		r = parseInt(255 - tmp_pct * 231)
		g = parseInt(tmp_pct * 154)
		b = parseInt(tmp_pct * 211)
		arc_color = "rgb(" + r + ", " + g + "," + b + ")";
		//console.log(tmp_pct, arc_color)
		
		if(tmp_pct < .33){ // Make the background slightly red
			arc_background_color = "rgb(255, 245, 245)";
		}
		else if(tmp_pct < .66){ // Make the background slightly purple
			arc_background_color = "rgb(255, 245, 255)";
		}
		else if(tmp_pct <= 1.0){ // Make the background slightly blue
			arc_background_color = "rgb(245, 245, 255)";
		}
	}
	
	if(tmp_pct != null){
		svg.append("path")
			.datum({endAngle: tmp_pct * 2 * Math.PI})
			.attr("fill", arc_color)
			.attr("d", arc);
		
	
		svg.append("path")
			.datum({startAngle: tmp_pct * 2 * Math.PI})
			.attr("fill", arc_background_color)
			.attr("d", endArc);
	}
	// text in the middle; first make it white and then shrink it to fit in the space, then turn it visible
	var max_available_space = (specs.r - specs.line_width) * 2 - 2;
	var tmp_text = 'text' in specs && specs.text != null ? (specs.text + "") : (specs.val + "");
	var tmp_fs = 'font_size' in specs ? specs.font_size: 12
	//console.log("6513. tmp_text", tmp_text, "max avail", max_available_space);
	
	var tmp_label = svg.append("text")
		.attr("text-anchor", "middle")
		.attr("dy", ".35em")
		.style("color", "#FFF")
		//.attr("x", specs.r)
		//.attr("y", 30)
		//.attr("height", specs.r * 2 - 20)
		//.attr("width", specs.r * 2 - 20)
		.attr("font-family", "arial")
		.style("font-size", tmp_fs)
		.style("cursor", 'pointer')
		.text(tmp_text + "").attr("width", function(d){ return this.getComputedTextLength(); });
	
	//console.log(tmp_text, parseFloat(tmp_label.attr("width")), max_available_space);
	while(parseFloat(tmp_label.attr("width")) > max_available_space && tmp_fs > 3){
		tmp_label.style("font-size", tmp_fs);
		tmp_label.attr("width", function(d){ return this.getComputedTextLength(); });
		//console.log(tmp_text, tmp_fs, tmp_label.attr("width"));
		tmp_fs -= 1
	}
	tmp_label.style("fill", "#333");
    
}

function reference_arrow(id, arg_specs, arg_initial_specs = null){
    /***
    This function displays an arrow that is centered at the midpoint and goes left or right depending on whether the value in question is larger or smaller than the reference value.
    ***/
    
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
   
    if('padding_pct' in specs){
        specs.value = specs.value * specs.padding_pct;
    }
    else{
        specs.value = specs.value * .90;
    }
    
    if('show_border' in initial_specs){
        svg.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", width).attr("height", specs.height - specs.margin_top - specs.margin_bottom)
            .attr("rx", 3).attr("ry", 3)
            .attr('id', id + "-spark-bar-div")
            .style("fill", specs.bar_fill)
            .attr("class", "spark-bar-background");
    }
    var tmp_width = specs.bar_width*width - 2;
    tmp_width = tmp_width < 0 ? 0 : tmp_width;
    //console.log("refarrow.specs"); console.log(specs);
    
    
    
    // specs.value is on a -1.0 to 1.0 scale
    if(specs.value > 0){ // Positive value; move to the right; filled rectangle
        svg.append("rect")
            .attr("x", specs.width/2).attr("y", 2)
            .attr("width", specs.width * Math.abs(specs.value) / 2.0).attr("height", specs.height - specs.margin_top - 4)
            .attr("rx", 1).attr("ry", 1)
            .attr('id', id + "-reference-arrow")
            .style("fill", specs.fill).style("stroke-width", 0)
            .attr("class", "reference-arrow-fill");
        svg.append("circle")
            .attr("cx", specs.width/2).attr("cy", (specs.height - specs.margin_top)/2)
            .attr("r", (specs.height - specs.margin_top) / 2 - 1.5)
            .style("stroke", specs.fill).style("stroke-width", 3)
            .style("fill", "white")
            .attr("class", "reference-arrow-circle");
     
    }
    else{ // Negative value; move to the left; outlined rectangle
        svg.append("rect")
            .attr("x", specs.width/2 - specs.width * Math.abs(specs.value) / 2.0).attr("y", 2)
            .attr("width", specs.width * Math.abs(specs.value) / 2.0).attr("height", specs.height - specs.margin_top - 4)
            .attr("rx", 1).attr("ry", 1)
            .attr('id', id + "-reference-arrow")
            .style('fill', 'white')
            .style("stroke", specs.fill).style("stroke-width", 2)
            .attr("class", "reference-arrow-fill");
            
        svg.append("circle")
            .attr("cx", specs.width/2).attr("cy", (specs.height - specs.margin_top)/2)
            .attr("r", (specs.height - specs.margin_top) / 2 - 1.5)
            .style("stroke", specs.fill).style("stroke-width", 3)
            .style("fill", specs.fill)
            .attr("class", "reference-arrow-circle");
     
    }   
    
    
    // Center Line     
    /*svg.append("line")
            .attr("x1", specs.width/2).attr("x2", specs.width/2)
            .attr("y0", 0).attr("y2", specs.height)
            .style('fill', null)
            .style("stroke", "#00F").style("stroke-width", 1);
    */
    
}

function split_bar(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
   
    

    svg.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", width).attr("height", specs.height)
        .attr("rx", 3).attr("ry", 3)
        .attr('id', id + "-split-bar-div")
        .style("fill", specs.bar_fill)
        .attr("class", "split-bar-background");

    
    svg.append("rect")
		.attr("x", 1).attr("y", 1)
		.attr("width", specs.split_point * width - 2).attr("height", specs.height-2)
		.attr("rx", 1).attr("ry", 1)
		.attr('id', id + "-split-bar")
        .style("fill", specs.fill).style("stroke-width", 0)
		.attr("class", "split-bar-fill");
        
    if(specs.split_point < 1.0){
        svg.append("rect")
            .attr("x", specs.split_point*width - 2).attr("y", 1)
            .attr("width", 1).attr("height", specs.height-2)
            .attr('id', id + "-split-bar")
            .style("fill", specs.fill).style("stroke-width", 0)
            .attr("class", "split-bar-fill");
    }
    
    // Add data labels if necessary
    if('label1' in initial_specs && initial_specs.label1 != null){
        
        // Away Label
        teams = {"away": 1, 'home': 1}
        for(k in teams){
            if(k == "away"){
                anchr = "end"; clr = "white";
                txt = initial_specs.label1;
                x = specs.split_point*width - 5;
                alt_x = specs.split_point*width + 2;
            }
            else{
                anchr = "start"; clr = specs.fill;
                txt = initial_specs.label2;
                
                x = specs.split_point*width + 5;
                alt_x = width - 50;
            }
            
            label = svg.append("text").attr("text-anchor", anchr )
            .attr("x", x).attr("y", specs.height - 4)
            .attr("font-size", 10).attr("font-family", "Arial").style("fill", clr).style("opacity", 0)
            .text(txt);
            
            if((on_mobile && specs.split_point < .25) || (!on_mobile && specs.split_point < .10)){
                anchr = "start"; clr = "#666";
                label.attr("x", alt_x).attr("text-anchor", anchr ).style("fill", clr);
            }
            label.style("opacity", 1);
        }
    }
    
}

function harvey_ball(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
    if(debug.on && debug.data){ console.log(data); }
    
        
    svg.append('circle')
    .attr('cx', x(.5)).attr('cy', specs.harvey_width/2 + 2 )
    .attr('r', specs.harvey_width/2)
    .style('fill', specs.fill[0]).style('stroke', specs.fill[0]);

    if('label' in specs && [null, ''].indexOf(specs.label) == -1){
        svg.append('text')
        .attr('x', x(.5)).attr('y', y(.13))
        .text(specs.label).attr("text-anchor", "middle" )
        .style('fill', specs.color).attr("font-weight",  "bold")
        .attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size);
    }
    

        
   
}

function labeled_arrow(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': false};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    /* Create graph */
    var x = d3.scaleLinear().range([0, width]); var y = d3.scaleLinear().range([height, 0]);
    if(debug.on && debug.data){ console.log(data); }
    arrow_ratio = .55; // This is how much of the arrow is base vs arrow shape
    if(specs.dir != null){
    
        var trianglePoints = null;
        if(specs.dir == "up"){
            tmp = [
              x(.5) + ' ' + y(1)
            , (x(.5) - specs.arrow_width/2 - 10) + ' ' + y(arrow_ratio)
            , (x(.5) + specs.arrow_width/2 + 10) + ' ' + y(arrow_ratio)
            , x(.5) + ' ' + y(1)]
        
            trianglePoints = [tmp.join(", ")];
            rect_y = y(arrow_ratio);
            rect_height = height*arrow_ratio;
            text_y = y(.23);
        }   
        else if(specs.dir == "down"){
            tmp = [
              x(.5) + ' ' + y(0)
            , (x(.5) - specs.arrow_width/2 - 10) + ' ' + (height - y(arrow_ratio))
            , (x(.5) + specs.arrow_width/2 + 10) + ' ' + (height - y(arrow_ratio))
            , x(.5) + ' ' + y(0)]
        
            trianglePoints = [tmp.join(", ")];
            rect_y = y(1);
            rect_height = height*arrow_ratio;
            text_y = y(.40);
        }  

        else if(specs.dir == "sideways"){
            tmp1 = [
              x(.25) + ' ' + y(.5)
            , (x(.5) - specs.arrow_width/2) + ' ' + y(1.0)
            , (x(.5) - specs.arrow_width/2) + ' ' + y(0.0)
            , x(.25) + ' ' + y(.5)]
            
            
            tmp2 = [
              x(.75) + ' ' + y(.5)
            , (x(.5) + specs.arrow_width/2) + ' ' + y(1.0)
            , (x(.5) + specs.arrow_width/2) + ' ' + y(0.0)
            , x(.75) + ' ' + y(.5)]
            
        
            trianglePoints = [tmp1.join(", "), tmp2.join(", ")];
            rect_y = y(.83);
            rect_height = height * .66;
            text_y = y(.30);
        }          
        
        for(var b = 0;b<trianglePoints.length;b++){
            svg.append('polyline')
            .attr('points', trianglePoints[b])
            .style('fill', specs.fill).style('stroke', specs.fill);
        }
        
        svg.append('rect')
        .attr('x', x(.5) - specs.arrow_width/2).attr('y', rect_y)
        .attr('width', specs.arrow_width).attr('height', rect_height)
        .style('fill', specs.fill).style('stroke', specs.fill);

        if('label' in specs && [null, ''].indexOf(specs.label) == -1){
            svg.append('text')
            .attr('x', x(.5)).attr('y', text_y)
            .text(specs.label).attr("text-anchor", "middle" )
            .style('fill', specs.color).attr("font-weight",  "bold")
            .attr("class", 'lightish chart-tick-label ' + initial_specs.chart_size);
        }
        

        
    }
}



function comparison_bar(id, arg_specs, arg_initial_specs = null){
    var debug = {'on': false, 'spacing': true, 'data': true};
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    if(width <= 0){ return; }
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
   
    
    var better = (specs.value > specs.comp_value);

    var gap = Math.abs(specs.value - specs.comp_value);
    
    
    if(better){
        
        svg.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", specs.value * width).attr("height", specs.height)
            .attr("rx", 3).attr("ry", 3)
            .attr('id', id + "-spark-bar-div")
            .style("fill", "#88F")
            .attr("class", "spark-bar-background");
            
        svg.append("line")
            .attr("x1", specs.comp_value * width).attr("y1", 1)
            .attr("x2", specs.comp_value * width).attr("y2", specs.height - 1)
            .style("stroke", "#FFF").style("stroke-width", 2);
            
        // Add data labels if necessary
        if('show_labels' in initial_specs && initial_specs.show_labels != null){
            label = svg.append("text").attr("text-anchor", "start" )
            .attr("x", specs.value * width + 3).attr("y", specs.height - 2)
            .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#666")
            .text(initial_specs.label);
            
            if(gap < .2){
                if(specs.comp_value > .2){
                    comp_label = svg.append("text").attr("text-anchor", "end" )
                    .attr("x", specs.comp_value * width - 3).attr("y", specs.height - 2)
                    .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#FFF")
                    .text(initial_specs.comp_label);
                }
                else{ 
                    // There wouldn't be enough room to squeeze it in
                }
            }
            else{
                
                comp_label = svg.append("text").attr("text-anchor", "start" )
                .attr("x", specs.comp_value * width + 3).attr("y", specs.height - 2)
                .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#FFF")
                .text(initial_specs.comp_label);
            }
        }
    }
    else{
        svg.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", specs.comp_value * width).attr("height", specs.height)
            .attr("rx", 3).attr("ry", 3)
            .attr('id', id + "-spark-bar-div")
            .style("fill", "#FFF").style("stroke", "#88F")
            .attr("class", "spark-bar-background");
            
        svg.append("rect")
            .attr("x", 0).attr("y", 1)
            .attr("width", specs.value*width - 2).attr("height", specs.height-2)
            .attr("rx", 1).attr("ry", 1)
            .attr('id', id + "-spark-bar")
            .style("fill", specs.fill).style("stroke-width", 0)
            .attr("class", "spark-bar-fill");
            
        // Add data labels if necessary
        if('show_labels' in initial_specs && initial_specs.show_labels != null){
            comp_label = svg.append("text").attr("text-anchor", "start" )
            .attr("x", specs.comp_value * width + 3).attr("y", specs.height - 2)
            .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#666")
            .text(initial_specs.comp_label);
            
            if(gap < .2){
                if(specs.value > .2){
                    label = svg.append("text").attr("text-anchor", "end" )
                    .attr("x", specs.value * width - 3).attr("y", specs.height - 2)
                    .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#FFF")
                    .text(initial_specs.label);
                }
                else{ 
                    // There wouldn't be enough room to squeeze it in
                }
            }
            else{
                
                label = svg.append("text").attr("text-anchor", "start" )
                .attr("x", specs.value * width + 3).attr("y", specs.height - 2)
                .attr("font-size", 10).attr("font-family", "Arial").style("fill", "#666")
                .text(initial_specs.label);
            }
        }
    }
    
    
       
   
    
    
    
}
function graph_create_slider(svg, initial_specs, data){
	/***
    This function builds a slider input as a collection of SVG components, including the background bar, the slider ball, and labels.
    ***/
    
    slider = data.slider;
    function pct_to_loc(pct, specs){
        var loc = null;
        var comp = null;
        if(specs.orientation == "horizontal"){
            comp = specs.width;
        }
        else{
            comp = specs.height;
        }
        loc = pct*comp;
        return loc;
    }
    id = slider.id;
    specs = slider;
    if(!('stops' in specs)){ specs.stops = 10; }
	
    val = 5;
	
    height = specs.height; 
    width = specs.width;
    event_var = null;
    if(specs.orientation == "vertical"){
        circle_x = width/2;
        circle_y = height/2;
        event_var = "y"
        max_loc = height + specs.loc_y; min_loc = specs.loc_y;
        specs.inc = (specs.height-specs.stops)/(specs.stops-1);
	
    }
    else if(specs.orientation == "horizontal"){
        circle_x = specs.loc_x + pct_to_loc(specs.pct_loc, specs);
        circle_y = specs.loc_y + specs.height/2;
        event_var = "x"
        max_loc = width + specs.loc_x; min_loc = specs.loc_x;
        specs.inc = (specs.width-specs.stops)/(specs.stops-1);
    }
    
    if('start_label' in specs && [null, ''].indexOf(specs.start_label) == -1){
        var end_point_labels = []
        var epl = {'label': specs.end_label};
        var spl = {'label': specs.start_label};
        end_point_labels.push(spl);end_point_labels.push(epl);
        if(specs.orientation == "vertical"){
            spl.anchor = elp.anchor = "middle";
            
        }
        else{
            spl.anchor = "end"; epl.anchor = "start";
            spl.y = epl.y = circle_y + 3;
            spl.x = specs.loc_x - 10;
            epl.x = specs.loc_x + width + 10;
        }
        svg.selectAll("label").data(end_point_labels).enter().append("text")
            .attr("text-anchor", function (d) { return d.anchor;  }  )
            .attr("y", function(d){return d.y;}).attr("x", function(d){return d.x;})
            .text(function(d){  return d.label; })
            .attr("class", "label lightish chart-tick-label small");
        
    }
    
	// Display the outer rectangle of the slider
	svg.append("rect")
		.attr("x", specs.loc_x).attr("y", specs.loc_y)
		.attr("width", width).attr("height", height)
		.attr("rx", 4)
		.attr("ry", 4)
		.attr('id', id + "-slider")
		.attr("class", "slider-background");
	
    // Allow for the value of the slider to be shown when the user drags the ball
    if('show_value_on_drag' in specs && specs.show_value_on_drag){
        
        svg.append("rect")
            .attr("x", circle_x - 30).attr("y", circle_y + 10 - 50)
            .attr("rx", 4).attr("ry", 4)
            .attr("width", 60).attr("height", 30)
            .attr('id', id + "-overlay")
            .attr("class", "slider-overlay hidden");
        
        svg.append("text").attr("text-anchor", "middle")
            .attr("x", circle_x).attr("y", circle_y + 30 - 50)
            .attr('id', id + "-overlay-text")
            .text('')
            .attr("class", "label lightish chart-tick-label small hidden");
        
    }
	
    // Add the end of the slider (rounded) clear fill
	svg.append("rect")
		.attr("x", circle_x + 1).attr("y", specs.loc_y+1)
		.attr("width", specs.loc_x + width - circle_x - 2).attr("height", height-2)
		.attr("rx", 6)
		.attr("ry", 6)
		.attr('id', 'rect_' + id + '_primary')
		.style("fill", "#FFF");
    
    
	// Add the slider ball
	svg.append("circle")
		.attr("cx", circle_x).attr("cy", circle_y)
        .attr("width", width)
        .attr('offset_x', specs.loc_x).attr('offset_y', specs.loc_y)
        .attr("height", height)
        .attr("orientation", specs.orientation)
		.attr("r", 7)
		.style("fill", "#AAA").attr('id', id)
		.call(d3.drag().on("start", slider.dragStarted).on("drag", slider.drag).on("end", slider.dragEnded));
	
   
    return svg;
}


function display_toggle(toggle, id, arg_specs, arg_initial_specs = null){
    /***
    I created a custom toggle object that is clicked by the user to toggle back and forth between two views. Typically only used on mobile. When the object is clicked, the laxrefpro.toggler function is called and runs the appropriate code based on the class value sent in the specs object.
    ***/
	var debug = {'on': false, 'spacing': true, 'data': false};
    if(!('disabled' in arg_specs)){
		arg_specs.disabled = 0;
	}
	//console.log(arg_specs);
    arg_specs.margin_left = arg_specs.margin_top = arg_specs.margin_right = arg_specs.margin_bottom = 0;
    arg_specs.width = toggle.start_x + toggle.end_x + 10 + arg_specs.height*2;
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    height = specs.height; 
    width = specs.width;
    toggle_width = height*2;
    toggle_x = toggle.start_x + (width - toggle.start_x - toggle.end_x - toggle_width)/2;
    
    extra_class = "";
    if('class' in specs){ extra_class = specs.class; }
    val = 0;
    
    event_var = null;
    circle_x = 0 + height/2;
    circle_y = height/2;
    event_var = "x"
    
	//console.log("toggler specs"); console.log(specs);
    var on_click_action = misc.target_template.indexOf("basic") == 0 ? toggler_basic : toggler;
    if('async' in specs){
        
        on_click_action = async_collect_args;
        
    }
    
    var toggle_label_font_size = 11;
    if('label_font_size' in specs && [null, ''].indexOf(specs.label_font_size) == -1){
        toggle_label_font_size = specs.label_font_size;
    }
        
    var end_point_labels = []
    var epl = {'label': toggle.end_label};
    var spl = {'label': toggle.start_label};
    end_point_labels.push(spl);end_point_labels.push(epl);
    epl.anchor = "end"; spl.anchor = "start";
    spl.y = epl.y = circle_y + 3;
    spl.x = 1;
    epl.x = width - 1;
    label_width = 0.0;
    for(var a = 0;a<end_point_labels.length;a++){
        item = end_point_labels[a];

        item.object = svg.append("text")
        .attr("x", item.x).attr("y", item.y)
        .attr("text-anchor", item.anchor  )
        .attr("class", 'font-' + toggle_label_font_size).attr("font-family", "Arial")
        .attr("is_disabled", arg_specs.disabled)
        .text(item.label);

        
    }   
    
    
    
	// Display the outer rectangle of the slider
	var toggle_space = svg.append("rect")
		.attr("x", toggle_x).attr("y", 0)
		.attr("width", toggle_width).attr("height", height)
		.attr("rx", (height/2))
		.attr("ry", (height/2))
		.attr('id', id + "-toggle-background")
		.attr("class", extra_class + " toggle-background" + (toggle.val ? " set" : ""))
        .attr("is_disabled", arg_specs.disabled)
        .on('click', on_click_action);
        
    
	
    // Add the slider ball
	var toggle_circle = svg.append("circle")
		.attr("cx", toggle_x + height/2 + (toggle.val ? height : 0)).attr("cy", circle_y)
        .attr("width", width)
        .attr("height", height)
        .attr("nonce", toggle.val)
		.attr("r", (height/2)-1)
		.attr('id', id)
        .attr("class", extra_class + " toggle-ball" +  (toggle.val ? "" : " set"))
        .attr("is_disabled", arg_specs.disabled)
        .on('click', on_click_action);
	
    if('async_str' in specs && [null, ''].indexOf(specs.async_str) == -1){
        toggle_space.attr("async_str", specs.async_str);
        toggle_circle.attr("async_str", specs.async_str);
    }
    return svg;
}

function display_inside_toggle(toggle, id, arg_specs, arg_initial_specs = null){
    /***
    I created a custom toggle object that is clicked by the user to toggle back and forth between two views. Typically only used on mobile. When the object is clicked, the laxrefpro.toggler function is called and runs the appropriate code based on the class value sent in the specs object.
    ***/
	var debug = {'false': true, 'spacing': true, 'data': false};
    
    arg_specs.margin_left = arg_specs.margin_top = arg_specs.margin_right = arg_specs.margin_bottom = 0;
    let {width, height, specs, initial_specs, svg} = initiate_svg(id, null, arg_specs, arg_initial_specs);
    
    
    text1 = svg.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("text-anchor", 'start'  )
        .attr("class", 'font-11').attr("font-family", "Arial")
        .text(toggle.start_label).attr("width", function(d){ return this.getComputedTextLength(); });
    text2 = svg.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("text-anchor", 'end'  )
        .attr("class", 'font-11').attr("font-family", "Arial")
        .text(toggle.end_label).attr("width", function(d){ return this.getComputedTextLength(); }); 
    //console.log(toggle.start_label + ": " + parseFloat(text1.attr("width")) + " or " + parseFloat(text1.attr("width")));
    //console.log(toggle.end_label + ": " + parseFloat(text2.attr("width")) + " or " + parseFloat(text2.attr("width")));
    
    // If the text label isn't immediately shown to the user, then the width field will be 0 and we need to have a default that is higher than zero.
    if(parseFloat(text1.attr("width")) == 0){
	    if('max_text_width' in specs){
			max_text_width = specs.max_text_width;
		}
		else{
			max_text_width = 20;
		}
    }
    else{
        max_text_width = parseFloat(text1.attr("width")) > parseFloat(text2.attr("width")) ? parseFloat(text1.attr("width")) : parseFloat(text2.attr("width"));
    }
    if(!('is_on_off' in toggle)){ toggle.is_on_off = 0; }
    
    if(debug.on && debug.spacing){ console.log("SVG Width x Height: " + rnd(width) + " x " + rnd(height)); }
    
    if(!('start_x' in toggle)){ toggle.start_x = 0; }
    if(!('end_x' in toggle)){ toggle.end_x = 0; }
    
    height = specs.height; 
    width = specs.width;
	//console.log("max_text_width: " + max_text_width);
	//console.log("text1.attr('width'): " + parseFloat(text1.attr("width")));
    //console.log("text2.attr('width'): " + parseFloat(text2.attr("width")));
    toggle_width = max_text_width * 2 + 84;
    toggle_x = toggle.start_x + (width - toggle.start_x - toggle.end_x - toggle_width)/2;
    //console.log(toggle.start_x,  width, toggle.start_x , toggle.end_x, toggle_width)
    //console.log("toggle_x: " + toggle_x);
    extra_class = "";
    if('class' in specs){ extra_class = specs.class; }
    val = 0;
    
    /*event_var = null;
    circle_x = 0 + height/2;
    circle_y = height/2;
    event_var = "x"*/

    // Display the outer rectangle of the slider
	svg.append("rect")
		.attr("x", toggle_x).attr("y", 0)
		.attr("width", toggle_width).attr("height", height)
		.attr("rx", (height/2))
		.attr("ry", (height/2))
		.attr('id', id + "-inside-toggle-background")
		.attr("class", extra_class + " inside-toggle-background" + (toggle.val ? " set" : "") + (toggle.is_on_off ? " on-off" : ""))
        .on('click', toggle_pricing);
	
    
    // Add the slider ball
	svg.append("rect")
		.attr("x", toggle_x + (toggle.val ? 2 : (toggle_width - 2 - (max_text_width + 40)))).attr("y", 2)
        .attr("width", max_text_width + 40)
		.attr("rx", (height/2))
		.attr("ry", (height/2))
        .attr("height", height-4)
        .attr("nonce", toggle.val)
		.attr('id', id)
        .attr("class", extra_class + " inside-toggle-ball" +  (toggle.val ? "" : " set") + (toggle.is_on_off ? " on-off" : ""))
        .on('click', toggle_pricing);
        
    var text_fs = 'font-15'; var text_y_loc = 25;
    if('font_size' in toggle){ 
        text_fs = 'font-' + toggle.font_size; 
        text_y_loc -= (15 - toggle.font_size) * 2.5;
    }
    
    svg.append("text")
        .attr("x", toggle_x + (20 + max_text_width/2)).attr("y", text_y_loc)
        .attr("text-anchor", 'middle').style('font-family', 'Arial').attr('id', id + "-label-" + (toggle.val ? 1 : 0))
        .attr("class", extra_class + ' ' + text_fs + ' pointer' + " inside-toggle-text" +  (!toggle.val ? "" : " set"))
        .text(toggle.start_label).attr("width", function(d){ return this.getComputedTextLength(); })
        .on('click', toggle_pricing);
	
    svg.append("text")
        .attr("x", toggle_x + (toggle_width/2 + 20 + max_text_width/2)).attr("y", text_y_loc)
        .attr("text-anchor", 'middle').style('font-family', 'Arial').attr('id', id + "-label-" + (toggle.val ? 0 : 1))
        .attr("class", extra_class + ' ' + text_fs + ' pointer' + " inside-toggle-text" +  (toggle.val ? "" : " set"))
        .text(toggle.end_label).attr("width", function(d){ return this.getComputedTextLength(); })
        .on('click', toggle_pricing);
	
   
    return svg;
}

