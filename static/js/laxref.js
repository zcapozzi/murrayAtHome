var show_offense = true;
var stat_type = "rate";
var panel = "standard";
var sort_by = null;
 
var team_stats_clicks = [];

var sort_tag = {'generic': null, 'by_opponents': 'cnt', 'standard': 'date', 'all_games': 'date'};
var sort_dir = {'generic': 'desc', 'by_opponents': 'desc', 'standard': 'desc', 'all_games': 'desc'};

function jsformat(val, fmt){
    /***
    This function takes in a number and a format string; the result is the value formatted according to that format string.
    ***/
    var orig_fmt = fmt;
    var pct = false; var seconds = false; var val_is_positive = val > 0 ? 1 : 0;
    var plus_minus = false; var plus_minus_sign = ""; var money = false;
    if(fmt.startsWith("$")){ money = true; fmt = fmt.substr(1); }
    if(fmt.startsWith("+/-")){ plus_minus = true; fmt = fmt.replace("+/-", ""); }
	var is_simple_integer = fmt == "0" ? 1 : 0;
    if(fmt.endsWith("%")){ pct = true; fmt = fmt.replace("%", ""); }
    if(fmt.endsWith("s")){ seconds = true; fmt = fmt.replace("s", ""); }
    
    var decimals = null;
    try{
        decimals = parseInt(fmt); 
    }
    catch(error){  }
    
    var res = null;
    if(["", "{}"].indexOf(fmt) > -1){
        res = val;
    }
	else if(is_simple_integer){ res = parseInt(val).toLocaleString(); }
    else if (typeof val == "string"){ res = val; }
    else if (decimals != null && !pct && !seconds){ res = val.toFixed(decimals); }
    else if (decimals == null && pct){ res = val*100.0  + "%"; }
    else if (decimals != null && pct){ res = (val*100.0).toFixed(decimals)  + "%"; }
    else if (decimals == null && seconds){ res = val + "s"; }
    else if (decimals != null && seconds){ res = (val).toFixed(decimals) + "s"; }
    
    if(plus_minus){
        if(res == 0){ 
            res = "---";
        }
        else if (val_is_positive){ res = "+" + res; }
        else if (!val_is_positive){ res = res; }
    }
    else if(money){
        res = "$" + res;
    }
    //console.log(val, orig_fmt, res);
    return res
}

function add_suffix(n){
    m = n % 10;
    m100 = n % 100;
    
    //if 4 <= i <= 20 or i % 10 > 3:
    //    return "th"
    if(4 <= n && n <= 20){ return n + "th"; }
    if(m100 == 12){ return n + "th"; }
    if([1].indexOf(m) > -1){ return n + "st"; }
    if([2].indexOf(m) > -1){ return n + "nd"; }
    if([3].indexOf(m) > -1){ return n + "rd"; }
    if([4, 5, 6, 7, 8, 9, 0].indexOf(m) > -1){ return n + "th"; }
}

function generic_format(row, field, fmt){
    var debug = false;
    
    var val = null;
    
    if (typeof row[field.tag] == "undefined"){ if(!misc.on_server){ console.error(field.tag + " is not defined in row"); }  return ""; }
    if( row[field.tag] == null){ 
        //if(!misc.on_server){ console.error(field.tag + " is null in row"); }   
        return ""; 
    }
    if(["string","number"].indexOf(typeof row[field.tag]) == -1){ val = row[field.tag].val; }
    else{ val = row[field.tag]; }
    
    if(val == null){ return ""; }
    var format = fmt.fmt;
    if(debug){ console.log("Format " + val + " via " + format); }
    return jsformat(val, format);
    
}

function generic_format_list_and_keys(row, field, fmt, lk_keys){
    var debug = false;
    
    var val = null;
    
	field_loc = lk_keys.indexOf(field.tag);
    if (typeof row[field_loc] == "undefined"){ if(!misc.on_server){ console.error(field.tag + " is not defined in row"); }  return ""; }
    if( row[field_loc] == null){ 
        //if(!misc.on_server){ console.error(field.tag + " is null in row"); }   
        return ""; 
    }
    if(["string","number"].indexOf(typeof row[field_loc]) == -1){ val = row[field_loc].val; }
    else{ val = row[field_loc]; }
    
    if(val == null){ return ""; }
    var format = fmt.fmt;
    if(debug){ console.log("Format " + val + " via " + format); }
    return jsformat(val, format);
    
}


// Generic

var generic_td = {};
var generic_specs = {};
function generic_sort_by_tag(tag, id){
    /***
    This function responds to a user clicking the header row of a data table. It sorts the table according to the column selected. The direction is based on the current direction. The actual sort is split out into two paragraphs because the data objects that make up a data table can come in multiple flavors. But the sort itself is the same; it's just a question of what keys to act on.
    ***/
    
    //console.log("Sort " + id + " data by " + sort_tag.generic + " " + sort_dir.generic);
	
	if(typeof n_sort_actions != "undefined"){
		n_sort_actions += 1;
		console.log("n sort actions: " + n_sort_actions);
		if('target_template' in misc){
			console.log("misc.target_template: " + misc.target_template);
			if(n_sort_actions > 3 && misc.target_template == "rpi.html"){
				console.log("Unhide the " + misc.target_template + " CTA...");
				$("#cta_div").removeClass('hidden');
			}
		}
	}
    
    if(sort_tag.generic == tag){
        sort_dir.generic = ((sort_dir.generic == "desc") ? "asc" : "desc");
    }
    else{
        sort_tag.generic = tag;
        sort_dir.generic = "desc";
    }
    //console.log(typeof generic_td[id].data[0][sort_tag.generic]);
    //console.log(typeof generic_td[id].data[0][sort_tag.generic] == "object", 'val' in generic_td[id].data[0][sort_tag.generic], typeof generic_td[id].data[0][sort_tag.generic] == "object" && 'val' in generic_td[id].data[0][sort_tag.generic])
    if (typeof generic_td[id].data[0][sort_tag.generic] == "object" && 'val' in generic_td[id].data[0][sort_tag.generic]){

        generic_td[id].data.sort(function(first, second) {
        
            if(sort_dir.generic == "desc"){
                return second[sort_tag.generic].val - first[sort_tag.generic].val;
            }
            else{
                return first[sort_tag.generic].val - second[sort_tag.generic].val;
            }
     
        });
    }
    else{
        generic_td[id].data = generic_td[id].data.sort(function(first, second) {
        
            if(sort_dir.generic == "desc"){
                return second[sort_tag.generic] - first[sort_tag.generic];
            }
            else{
                return first[sort_tag.generic] - second[sort_tag.generic];
            }
     
        });
    }
    
    //console.log("First element");
    //console.log(generic_td[id].data[0]);
    //console.log("sorted by " + sort_tag.generic + " " + sort_dir.generic);
    if(typeof generic_specs[id] == "object" && 'id' in generic_specs[id]){
		
        generic_create_table(generic_td[id], {'add_expansion_row': generic_specs[id].add_expansion_row, 'id':generic_specs[id].id, 'target_elem': generic_specs[id].target_elem});
    }
    else{
        generic_create_table(generic_td[id], {'id':generic_specs[id]});
    }
}

function generic_sort_by_tag_list_and_keys(tag, id){
    /***
    This function responds to a user clicking the header row of a data table. It sorts the table according to the column selected. The direction is based on the current direction. The actual sort is split out into two paragraphs because the data objects that make up a data table can come in multiple flavors. But the sort itself is the same; it's just a question of what keys to act on.
    ***/
    
    //console.log("Sort " + id + " data by " + sort_tag.generic + " " + sort_dir.generic);
	console.log("specs");
	console.log(generic_specs[id]);
	tmp_keys = generic_specs[id].lk_keys;
	
	if(typeof n_sort_actions != "undefined"){
		n_sort_actions += 1;
		console.log("n sort actions: " + n_sort_actions);
		if('target_template' in misc){
			console.log("misc.target_template: " + misc.target_template);
			if(n_sort_actions > 3 && misc.target_template == "rpi.html"){
				console.log("Unhide the " + misc.target_template + " CTA...");
				$("#cta_div").removeClass('hidden');
			}
		}
	}
    
    if(sort_tag.generic == tag){
        sort_dir.generic = ((sort_dir.generic == "desc") ? "asc" : "desc");
    }
    else{
        sort_tag.generic = tag;
        sort_dir.generic = "desc";
    }
    //console.log(typeof generic_td[id].data[0][sort_tag.generic]);
    //console.log(typeof generic_td[id].data[0][sort_tag.generic] == "object", 'val' in generic_td[id].data[0][sort_tag.generic], typeof generic_td[id].data[0][sort_tag.generic] == "object" && 'val' in generic_td[id].data[0][sort_tag.generic])
    if (typeof generic_td[id].data[0][sort_tag.generic] == "object" && 'val' in generic_td[id].data[0][sort_tag.generic]){

        generic_td[id].data.sort(function(first, second) {
        
            if(sort_dir.generic == "desc"){
                return second[sort_tag.generic].val - first[sort_tag.generic].val;
            }
            else{
                return first[sort_tag.generic].val - second[sort_tag.generic].val;
            }
     
        });
		//console.log("v1")
    }
    else{
        generic_td[id].data = generic_td[id].data.sort(function(first, second) {
			//console.log(`tag: ${sort_tag.generic}`);
			//console.log("tmp_keys"); console.log(tmp_keys)
			fld_loc = tmp_keys.indexOf(sort_tag.generic);
			//console.log("fld_loc: " + fld_loc);
            if(sort_dir.generic == "desc"){
                return second[fld_loc] - first[fld_loc];
            }
            else{
                return first[fld_loc] - second[fld_loc];
            }
     
        });
		//console.log("v2")
    }
    
    //console.log("First element");
    //console.log(generic_td[id].data[0]);
    //console.log("sorted by " + sort_tag.generic + " " + sort_dir.generic);
    if(typeof generic_specs[id] == "object" && 'id' in generic_specs[id]){
		
        generic_create_table_list_and_keys(generic_td[id], {'lk_keys': tmp_keys, 'add_expansion_row': generic_specs[id].add_expansion_row, 'id':generic_specs[id].id, 'target_elem': generic_specs[id].target_elem});
    }
    else{
        generic_create_table_list_and_keys(generic_td[id], {'lk_keys': tmp_keys, 'id':generic_specs[id]});
    }
}



function generic_create_table_backup(td, specs={}){
    if(specs != null && specs != {} && 'id' in specs){
        td_id = specs.id;
    }
    else{
        td_id = 'default';
    }
    generic_td[td_id] = td;
    generic_specs[td_id] = specs;
	
	if(!('add_expansion_row' in specs)){ specs.add_expansion_row = 0; }
    
    //console.log("Print to ID="); console.log(td_id)
    

    var html = ""; var row_cnt = "";
    var target_elem = "#js_div";
    //console.log("zyc.specs"); console.log(specs);
    if( 'target_elem' in specs && typeof specs.target_elem != "undefined"){ target_elem = specs.target_elem; }
    cell_size = "large-cell-holder";
    if( 'cell_size' in td){ 
        cell_size = td.cell_size; 
    }
    else if( 'cell-size' in td){
        cell_size = td['cell-size']; 
    }
    
    var font_size = 12;
    if('font_size' in td){ font_size = td.font_size; }
    //console.log("font size: " + font_size);
    
    if(target_elem.indexOf("#") != 0){ target_elem = "#"+target_elem; }
    var elem = $(target_elem); elem.empty();
    //console.log(td.fields);
    // START HEADER ROW
    var fields_printed = 0; var field = null;
    html += "<div class='bbottom col-12 no-padding flex'>";
    for(var a = 0;a<td.classes.length;a++){
        var cl = td.classes[a];
        
        if('outer_class' in cl){
            if(cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
            html += "<div class='header maroon " + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
            for(var b = 0;b<cl.classes.length;b++){
                
                var sub_cl = cl.classes[b]; if(sub_cl.class.indexOf("no-padding") == -1){ sub_cl.class += " no-padding"; }
                sub_cl.class = sub_cl.class.replace("mouseover-link", "");
                
                var onclick = "";
				//console.log("show field at loc=" + fields_printed);
                field = td.fields[fields_printed];  fields_printed += 1; 
                if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
                html += "<li " + onclick + " style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";
                if('display' in field){
                    html += "<span class='no-padding col-12 font-" + font_size + "' style='font-family:Arial;'>" + field.display + "</span>";
                }
                else{
                    html += "<span class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop' style='font-family:Arial;'>" + field.dtop_display + "</span><span class='no-padding mob' style='font-family:Arial;'>" + field.mob_display + "</span></span>";
                }
                
                html += "</div></li>";
            }
            html += "</ul></div>";
        }
        else{
            //cl.class += " no-padding";
            header_cl_class = cl.class.replace("mouseover-link", "");
            var onclick = "";
            field = td.fields[fields_printed]; 
            //console.log(fields_printed);
            row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='no-padding font-12'  style='width:25px;'>&nbsp;</div>" : ""; 
            //console.log(row_cnt);
            if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
            html += "<div " + onclick + " class='header maroon " + header_cl_class + (!('no_row_count' in td) && (fields_printed == 0) ? " flex" : "") + "'>";
            if('display' in field){
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'>" + field.display + "</span>";
            }
            else{
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop'>" + field.dtop_display + "</span><span class='no-padding mob'>" + field.mob_display + "</span></span>";
            }
            html += "</div>";
            fields_printed += 1;
        }
    }
    html += "</div>";
    elem.append(html);
    // DONE WITH HEADER ROW
    
    // START DATA ROWS
    for(var c = 0;c<td.data.length;c++){
        var row = td.data[c];
        html = "";
        
        var fields_printed = 0; var field = null;
        var table_row_class = "table-row";

        if('row_style_class' in td){ table_row_class = td.row_style_class; }
        if(row.highlight_row){ table_row_class += " highlight-row"; }
        
        if('is_me' in row && row.is_me){
            table_row_class += " bold site-blue";
        }
        
        if('class' in row && table_row_class.indexOf(row.class) == -1){
            table_row_class += " " + row.class;
        }
        
        row_onclick = 'onclick' in row ? "onclick=\"" + row.onclick + "\"" : "";
                
        html += "<div " + row_onclick + " class='" + table_row_class + " col-12 no-padding'><div class='no-padding flex'>";
        for(var a = 0;a<td.classes.length;a++){
            var cl = td.classes[a];
            
            if('outer_class' in cl){

                if(cl.outer_class != null && cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
                
                html += "<div  class='" + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
                for(var b = 0;b<cl.classes.length;b++){
                    
                    var sub_cl = cl.classes[b]; sub_cl.class += " no-padding";
   
                    field = td.fields[fields_printed];
                    fmt = td.fmt[fields_printed]; fields_printed += 1;
                    html += "<li style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";

					if(field.tag == "expand"){
						
						if(row.expand.indexOf("view_icon100") > -1 && c % 2 == 0){ // It's a gray row, so we need a gray magnifying glass
							//console.log(row, field)
							html += ("<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>").replace("100.png", "100_gray.png");
						}
						else{
							html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
						}
					}
					else{
						html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
					}
                    html += "</div></li>";
                }
                html += "</ul></div>";
            }
            else{
                field = td.fields[fields_printed];
                fmt = td.fmt[fields_printed]; 
                row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='row-count no-padding font-" + font_size + "' style='width:25px; padding-left:5px;'>" + (c + 1) + "</div>" : ""; 
                html += "<div class='" + cl.class + ((fields_printed == 0) ? " flex" : "") + "'>";
                if('no_row_count' in td){ 
                    html += "<span " + ((fields_printed==0) ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
                }
                else{
                    html += "<span class='no-padding font-12'>" + row_cnt + "</span>";
                    html += "<span " + ((fields_printed==0 && row_cnt == "") ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
                }
                html += "</div>";
                fields_printed += 1;
            }
        }
        html += "</div>";
        elem.append(html);
		
		// Add expansion row if needed
		html = "";
		if(specs.add_expansion_row){
			html += "<div class='hidden' id='" + row.expansion_row_id + "'>";
				html += "Row " + row.expansion_row_id ;
			html += "</div>";
		}
		html += "</div>";
        elem.append(html);
    }
    // DONE WITH DATA ROWS
    $(".icon-10.explanation").click(function( event ) {  event.stopPropagation(); async_request_explanation(this.getAttribute("value")); });
        
    
}
function generic_create_table_list_and_keys(td, specs={}){
    if(specs != null && specs != {} && 'id' in specs){
        td_id = specs.id;
    }
    else{
        td_id = 'default';
    }
    generic_td[td_id] = td;
    generic_specs[td_id] = specs;
	
	
	if(!('add_expansion_row' in specs)){ specs.add_expansion_row = 0; }
    
    //console.log("Print to ID="); console.log(td_id)
    

    var html = ""; var row_cnt = "";
    var target_elem = "#js_div";
    //console.log("zyc.specs"); console.log(specs);
    if( 'target_elem' in specs && typeof specs.target_elem != "undefined"){ target_elem = specs.target_elem; }
    cell_size = "large-cell-holder";
    if( 'cell_size' in td){ 
        cell_size = td.cell_size; 
    }
    else if( 'cell-size' in td){
        cell_size = td['cell-size']; 
    }
    
    var font_size = 12;
    if('font_size' in td){ font_size = td.font_size; }
    //console.log("font size: " + font_size);
    
    if(target_elem.indexOf("#") != 0){ target_elem = "#"+target_elem; }
    var elem = $(target_elem); elem.empty();
    //console.log(td.fields);
    // START HEADER ROW
    var fields_printed = 0; var field = null;
    html += "<div class='bbottom col-12 no-padding flex'>";
    for(var a = 0;a<td.classes.length;a++){
        var cl = td.classes[a];
        
        if('outer_class' in cl){
            if(cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
            html += "<div class='header maroon " + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
            for(var b = 0;b<cl.classes.length;b++){
                
                var sub_cl = cl.classes[b]; if(sub_cl.class.indexOf("no-padding") == -1){ sub_cl.class += " no-padding"; }
                sub_cl.class = sub_cl.class.replace("mouseover-link", "");
                
                var onclick = "";
				//console.log("show field at loc=" + fields_printed);
                field = td.fields[fields_printed];  fields_printed += 1; 
                if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag_list_and_keys(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
                html += "<li " + onclick + " style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";
                if('display' in field){
                    html += "<span class='no-padding col-12 font-" + font_size + "' style='font-family:Arial;'>" + field.display + "</span>";
                }
                else{
                    html += "<span class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop' style='font-family:Arial;'>" + field.dtop_display + "</span><span class='no-padding mob' style='font-family:Arial;'>" + field.mob_display + "</span></span>";
                }
                
                html += "</div></li>";
            }
            html += "</ul></div>";
        }
        else{
            //cl.class += " no-padding";
            header_cl_class = cl.class.replace("mouseover-link", "");
            var onclick = "";
            field = td.fields[fields_printed]; 
            //console.log(fields_printed);
            row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='no-padding font-12'  style='width:25px;'>&nbsp;</div>" : ""; 
            //console.log(row_cnt);
            if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag_list_and_keys(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
            html += "<div " + onclick + " class='header maroon " + header_cl_class + (!('no_row_count' in td) && (fields_printed == 0) ? " flex" : "") + "'>";
            if('display' in field){
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'>" + field.display + "</span>";
            }
            else{
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop'>" + field.dtop_display + "</span><span class='no-padding mob'>" + field.mob_display + "</span></span>";
            }
            html += "</div>";
            fields_printed += 1;
        }
    }
    html += "</div>";
    elem.append(html);
    // DONE WITH HEADER ROW
    
    // START DATA ROWS
    for(var c = 0;c<td.data.length;c++){
        var row = td.data[c];
        html = "";
        
        var fields_printed = 0; var field = null;
        var table_row_class = "table-row";

        if('row_style_class' in td){ table_row_class = td.row_style_class; }
        if(row.highlight_row){ table_row_class += " highlight-row"; }
        
        if('is_me' in row && row.is_me){
            table_row_class += " bold site-blue";
        }
        
        if('class' in row && table_row_class.indexOf(row.class) == -1){
            table_row_class += " " + row.class;
        }
        
        row_onclick = 'onclick' in row ? "onclick=\"" + row.onclick + "\"" : "";
                
        html += "<div " + row_onclick + " class='" + table_row_class + " col-12 no-padding'><div class='no-padding flex'>";
        for(var a = 0;a<td.classes.length;a++){
            var cl = td.classes[a];
            
            if('outer_class' in cl){

                if(cl.outer_class != null && cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
                
                html += "<div  class='" + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
                for(var b = 0;b<cl.classes.length;b++){
                    
                    var sub_cl = cl.classes[b]; sub_cl.class += " no-padding";
   
                    field = td.fields[fields_printed];
                    fmt = td.fmt[fields_printed]; fields_printed += 1;
                    html += "<li style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";

					if(field.tag == "expand"){
						
						if(row.expand.indexOf("view_icon100") > -1 && c % 2 == 0){ // It's a gray row, so we need a gray magnifying glass
							//console.log(row, field)
							html += ("<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format_list_and_keys(row, field, fmt, specs.lk_keys) + "</span>").replace("100.png", "100_gray.png");
						}
						else{
							html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format_list_and_keys(row, field, fmt, specs.lk_keys) + "</span>";
						}
					}
					else{
						html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format_list_and_keys(row, field, fmt, specs.lk_keys) + "</span>";
					}
                    html += "</div></li>";
                }
                html += "</ul></div>";
            }
            else{
                field = td.fields[fields_printed];
                fmt = td.fmt[fields_printed]; 
				//console.log("")
				//console.log(row)
				//console.log(field)
				//console.log(fmt)
				//console.log(specs.lk_keys)
                row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='row-count no-padding font-" + font_size + "' style='width:25px; padding-left:5px;'>" + (c + 1) + "</div>" : ""; 
                html += "<div class='" + cl.class + ((fields_printed == 0) ? " flex" : "") + "'>";
                if('no_row_count' in td){ 
                    html += "<span " + ((fields_printed==0) ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format_list_and_keys(row, field, fmt, specs.lk_keys) + "</span>";
                }
                else{
                    html += "<span class='no-padding font-12'>" + row_cnt + "</span>";
                    html += "<span " + ((fields_printed==0 && row_cnt == "") ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format_list_and_keys(row, field, fmt, specs.lk_keys) + "</span>";
                }
                html += "</div>";
                fields_printed += 1;
            }
        }
        html += "</div>";
        //elem.append(html);
		
		// Add expansion row if needed
		//html = "";
		if(specs.add_expansion_row){
			html += "<div class='generic-table-expansion-row hidden bbottom' style='border-top:solid 1px #AAA; background-color: white;' id='" + row.expansion_row_id + "'>";
				html += row.expansion_row_html;
			html += "</div>";
		}
		html += "</div>";
        elem.append(html);
    }
    // DONE WITH DATA ROWS
    $(".icon-10.explanation").click(function( event ) {  event.stopPropagation(); async_request_explanation(this.getAttribute("value")); });
        
    
}



function generic_create_table(td, specs={}){
    if(specs != null && specs != {} && 'id' in specs){
        td_id = specs.id;
    }
    else{
        td_id = 'default';
    }
    generic_td[td_id] = td;
    generic_specs[td_id] = specs;
	
	if(!('add_expansion_row' in specs)){ specs.add_expansion_row = 0; }
    
    //console.log("Print to ID="); console.log(td_id)
    

    var html = ""; var row_cnt = "";
    var target_elem = "#js_div";
    //console.log("zyc.specs"); console.log(specs);
    if( 'target_elem' in specs && typeof specs.target_elem != "undefined"){ target_elem = specs.target_elem; }
    cell_size = "large-cell-holder";
    if( 'cell_size' in td){ 
        cell_size = td.cell_size; 
    }
    else if( 'cell-size' in td){
        cell_size = td['cell-size']; 
    }
    
    var font_size = 12;
    if('font_size' in td){ font_size = td.font_size; }
    //console.log("font size: " + font_size);
    
    if(target_elem.indexOf("#") != 0){ target_elem = "#"+target_elem; }
    var elem = $(target_elem); elem.empty();
    //console.log(td.fields);
    // START HEADER ROW
    var fields_printed = 0; var field = null;
    html += "<div class='bbottom col-12 no-padding flex'>";
    for(var a = 0;a<td.classes.length;a++){
        var cl = td.classes[a];
        
        if('outer_class' in cl){
            if(cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
            html += "<div class='header maroon " + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
            for(var b = 0;b<cl.classes.length;b++){
                
                var sub_cl = cl.classes[b]; if(sub_cl.class.indexOf("no-padding") == -1){ sub_cl.class += " no-padding"; }
                sub_cl.class = sub_cl.class.replace("mouseover-link", "");
                
                var onclick = "";
				//console.log("show field at loc=" + fields_printed);
                field = td.fields[fields_printed];  fields_printed += 1; 
                if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
                html += "<li " + onclick + " style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";
                if('display' in field){
                    html += "<span class='no-padding col-12 font-" + font_size + "' style='font-family:Arial;'>" + field.display + "</span>";
                }
                else{
                    html += "<span class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop' style='font-family:Arial;'>" + field.dtop_display + "</span><span class='no-padding mob' style='font-family:Arial;'>" + field.mob_display + "</span></span>";
                }
                
                html += "</div></li>";
            }
            html += "</ul></div>";
        }
        else{
            //cl.class += " no-padding";
            header_cl_class = cl.class.replace("mouseover-link", "");
            var onclick = "";
            field = td.fields[fields_printed]; 
            //console.log(fields_printed);
            row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='no-padding font-12'  style='width:25px;'>&nbsp;</div>" : ""; 
            //console.log(row_cnt);
            if('sort_by' in field){ onclick = 'onclick="generic_sort_by_tag(\'' + field.sort_by + '\', \'' + td_id + '\');"'; }
            html += "<div " + onclick + " class='header maroon " + header_cl_class + (!('no_row_count' in td) && (fields_printed == 0) ? " flex" : "") + "'>";
            if('display' in field){
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'>" + field.display + "</span>";
            }
            else{
                html += row_cnt + "<span " + ((fields_printed==0) ?  " style='font-family:Arial; padding-left:10px;'" : "")+ " class='no-padding col-12 font-" + font_size + "'><span class='no-padding dtop'>" + field.dtop_display + "</span><span class='no-padding mob'>" + field.mob_display + "</span></span>";
            }
            html += "</div>";
            fields_printed += 1;
        }
    }
    html += "</div>";
    elem.append(html);
    // DONE WITH HEADER ROW
    
    // START DATA ROWS
    for(var c = 0;c<td.data.length;c++){
        var row = td.data[c];
        html = "";
        
        var fields_printed = 0; var field = null;
        var table_row_class = "table-row";

        if('row_style_class' in td){ table_row_class = td.row_style_class; }
        if(row.highlight_row){ table_row_class += " highlight-row"; }
        
        if('is_me' in row && row.is_me){
            table_row_class += " bold site-blue";
        }
        
        if('class' in row && table_row_class.indexOf(row.class) == -1){
            table_row_class += " " + row.class;
        }
        
        row_onclick = 'onclick' in row ? "onclick=\"" + row.onclick + "\"" : "";
                
        html += "<div " + row_onclick + " class='" + table_row_class + " col-12 no-padding'><div class='no-padding flex'>";
        for(var a = 0;a<td.classes.length;a++){
            var cl = td.classes[a];
            
            if('outer_class' in cl){

                if(cl.outer_class != null && cl.outer_class.indexOf("no-padding") == -1){ cl.outer_class += " no-padding"; }
                
                html += "<div  class='" + cl.outer_class + "'><ul class='table-ul' style='background-color:inherit;'>";
                for(var b = 0;b<cl.classes.length;b++){
                    
                    var sub_cl = cl.classes[b]; sub_cl.class += " no-padding";
   
                    field = td.fields[fields_printed];
                    fmt = td.fmt[fields_printed]; fields_printed += 1;
                    html += "<li style='' class='table-li "+sub_cl.class+"'><div class='" + cell_size + " no-padding'>";

					if(field.tag == "expand"){
						
						if(row.expand.indexOf("view_icon100") > -1 && c % 2 == 0){ // It's a gray row, so we need a gray magnifying glass
							//console.log(row, field)
							html += ("<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>").replace("100.png", "100_gray.png");
						}
						else{
							html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
						}
					}
					else{
						html += "<span " + ((fields_printed==0) ?  "style='padding-left:5px;'" : "")+ "  class='col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
					}
                    html += "</div></li>";
                }
                html += "</ul></div>";
            }
            else{
                field = td.fields[fields_printed];
                fmt = td.fmt[fields_printed]; 
                row_cnt = (fields_printed == 0 && !('no_row_count' in td)) ? "<div class='row-count no-padding font-" + font_size + "' style='width:25px; padding-left:5px;'>" + (c + 1) + "</div>" : ""; 
                html += "<div class='" + cl.class + ((fields_printed == 0) ? " flex" : "") + "'>";
                if('no_row_count' in td){ 
                    html += "<span " + ((fields_printed==0) ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
                }
                else{
                    html += "<span class='no-padding font-12'>" + row_cnt + "</span>";
                    html += "<span " + ((fields_printed==0 && row_cnt == "") ?  "style='padding-left:10px;'" : "")+ "  class='no-padding col-12 font-" + font_size + "'>" + generic_format(row, field, fmt) + "</span>";
                }
                html += "</div>";
                fields_printed += 1;
            }
        }
        html += "</div>";
        //elem.append(html);
		
		// Add expansion row if needed
		//html = "";
		if(specs.add_expansion_row){
			html += "<div class='generic-table-expansion-row hidden bbottom' style='border-top:solid 1px #AAA; background-color: white;' id='" + row.expansion_row_id + "'>";
				html += row.expansion_row_html;
			html += "</div>";
		}
		html += "</div>";
        elem.append(html);
    }
    // DONE WITH DATA ROWS
    $(".icon-10.explanation").click(function( event ) {  event.stopPropagation(); async_request_explanation(this.getAttribute("value")); });
        
    
}


// Live Win Probability Pages

function live_win_probabilities_switch_to_recap(go_forward=false){
    if(!go_forward){ return null; }
    $("#recap").removeClass("inactive").addClass("active")
    $("#plays").removeClass("active").addClass("inactive")
    $("#recap_button").removeClass("inactive").addClass("active")
    $("#plays_button").removeClass("active").addClass("inactive")
    $("#win_probability_row").addClass("hidden");
    $("#refresh_button_row").addClass("hidden");
}

function live_win_probabilities_switch_to_halftime(go_forward=false){
    if(!go_forward){ return null; }
    $("#recap").removeClass("inactive").addClass("active")
    $("#plays").removeClass("active").addClass("inactive")
    $("#recap_button").removeClass("inactive").addClass("active")
    $("#plays_button").removeClass("active").addClass("inactive")
    $("#win_probability_row").addClass("hidden");
    $("#refresh_button_row").addClass("hidden");
}

function expand_plays_past_thirty(){
    /***
    The basic structure of the play log is to show the last 30 plays and include a label that the user can click to unhide the remaining rows. This function is what is run when that label is clicked.
    ***/
    try{
        var steps = "4";
        document.getElementById("show_span").innerHTML = "1/" + steps;
        document.getElementById("show_span").innerHTML = "2/" + steps;
        document.getElementById("hidden_plays").style.display = "block";

        document.getElementById("show_span").innerHTML = "3/" + steps;
        document.getElementById("show_all_button_row").style.display = "none";
        document.getElementById("show_span").innerHTML = "4/" + steps;
    }
    catch(err){
        document.getElementById("show_span").innerHTML = err.message;
        
    }
}

function jump_to(go_to_label){ 
    //__zgaTracker('send', 'event', 'JumpTo', 'move', go_to_label.replace("_dtop", "").replace("_mob", "")); 
    if(typeof mi_track_user == "undefined" || mi_track_user){
        ga('send', {
          eventCategory: 'JumpTo',
          hitType: 'event',
          eventAction: 'move',
        eventLabel: go_to_label.replace("_dtop", "").replace("_mob", "")});
    }
    
    location.href= ("#" + go_to_label); 
}

function auto_enable(src_page, label_str){
    label_str = label_str.toString();
    console.log("src_page: " + src_page + "\t\tlabel: " + label_str);
    console.log(label_str.includes("dtop"));
    if(src_page == "Bracketology" && label_str.includes("team") && label_str.includes("dtop")){
        console.log("Auto-jump to the " + "schedule_dtop" + " panel...");
        openCity("schedule_dtop");
    }
    else if(src_page == "Bracketology" && label_str.includes("team") && label_str.includes("mob")){
        console.log("Auto-jump to the " + "schedule_mob" + " panel...");
        openCity("schedule_mob");
    }
    else{
        openCity(label);
    }
    
}

function respond_to_survey(question, response){ 
    //__zgaTracker('send', 'event', 'SurveyResponse', question, response); 
    if(typeof mi_track_user == "undefined" || mi_track_user){
        ga('send', {
          eventCategory: 'SurveyResponse',
          hitType: 'event',
          eventAction: question,
        eventLabel: response});
    }
}

function openCity(cityName) {
   
   
    //__zgaTracker('send', 'event', 'PanelContent', 'enable', cityName.replace("_dtop", "").replace("_mob", ""));
    if(typeof mi_track_user == "undefined" || mi_track_user){
        ga('send', {
          eventCategory: 'PanelContent',
          hitType: 'event',
          eventAction: 'enable',
        eventLabel: cityName.replace("_dtop", "").replace("_mob", "")});
    }
    var button_elem = document.getElementById(cityName + "_button");
   
    var i;
    var x = document.getElementsByClassName("zctab");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
  
    document.getElementById(cityName).style.display = "block";

    if(button_elem != null){
       if(button_elem.classList.contains("zc_toggle_button")){
            var borderStyle = null;
            x = document.getElementsByClassName("zc_toggle_button");
            for (i = 0; i < x.length; i++) {
                if (x[i].style.borderBottom != "none"){ borderStyle = x[i].style.borderBottom; }
                x[i].style.borderBottom = "none";
                x[i].style.fontWeight = 400;
            }
         
            button_elem.style.borderBottom = borderStyle; button_elem.style.fontWeight = 700;
        }
    } 
}
 

function team_stats_set_offense(val){
    show_offense = val;
    console.log("Set show offense to " + show_offense);
    team_stats_clicks.push("off" + val);
    if(val){ 
        $("#offense_tag").removeClass("tag-off").addClass("tag-on"); 
        $("#defense_tag").removeClass("tag-on").addClass("tag-off"); 
    }
    else{ 
        $("#defense_tag").removeClass("tag-off").addClass("tag-on"); 
        $("#offense_tag").removeClass("tag-on").addClass("tag-off");  
    }
    team_stats_display();
}

function team_stats_set_rate(val){
    stat_type = val;
    
    team_stats_clicks.push("rate" + val);
    $(".stat_type_tag").removeClass("tag-on").addClass("tag-off"); 
    $("#" + val + "_tag").removeClass("tag-off").addClass("tag-on"); 
    team_stats_display();
}


function team_stats_set_panel(val){
    panel = val;
    team_stats_clicks.push("panel" + val);
    $(".panel_tag").removeClass("tag-on").addClass("tag-off"); 
    $("#" + val + "_view_tag").removeClass("tag-off").addClass("tag-on"); 

    $(".panel").removeClass("visible").addClass("hidden"); 
    $("#" + val + "_view").removeClass("hidden").addClass("visible"); 

    if(team_stats_clicks.length != 0){ 
        var send_val = team_stats_clicks.join('|');
        //__zgaTracker('send', 'event', 'TeamStatsContent', 'enable', send_val);
        if(typeof mi_track_user == "undefined" || mi_track_user){
            ga('send', {
              eventCategory: 'TeamStatsContent',
              hitType: 'event',
              eventAction: 'enable',
            eventLabel: send_val});
        }
    }
}

function team_stats_sort_by_tag(panel, tag){
    /***
    This function responds to a user's request to sort the team stats table on the public LR site. First check is what direction the column is sorted by; final sort direction is the opposite (or default to descending if the column is being clicked for the first time). The tactical change is to update the seq variable for the actual row objects so that the team_stats_display function will print them in the right order.
    ***/
    if(sort_tag[panel] == tag){
        sort_dir[panel] = ((sort_dir[panel] == "desc") ? "asc" : "desc");
    }
    else{
        sort_tag[panel] = tag;
        sort_dir[panel] = "desc";
        //if([""].indexOf(tag) > -1){ sort_dir[panel] = "asc"; }
    }
    team_stats_clicks.push("sort" + tag + sort_dir[panel]);
    
    var orig_sequence = [];
    for(var a = 0;a<misc.rows.length;a++){
        var row = misc.rows[a];
        
        if('data' in row && row.data != null){
            var val = null;
            
            for(var b = 0;b<row.data.length;b++){
                var cell = row.data[b];
                if(cell.tag == tag){ val = cell.val; break; }
            }
            var tup = {'seq': row.seq, 'ID': a, 'val': val};
            if(row.panel == panel && row.class == "data"){
                orig_sequence.push(tup);
            }
        }
    }
    //console.log(orig_sequence);
    var new_sequence = JSON.parse(JSON.stringify(orig_sequence));
    new_sequence.sort(function(first, second) {
        if(sort_dir[panel] == "desc"){
            return second.val - first.val;
        }
        else{
            return first.val - second.val;
        }
    });
    var cnt = new_sequence.length;
    var move_rows = [];
    //console.log(new_sequence);
    for(var a = 0;a<cnt;a++){
        move_rows.push(JSON.parse(JSON.stringify(misc.rows[new_sequence[a].seq])));
    }
    //console.log(move_rows);
    for(var a = 0;a<cnt;a++){
        var new_loc = orig_sequence[a].seq;
        misc.rows[new_loc] = (JSON.parse(JSON.stringify(move_rows[a])));
        misc.rows[new_loc].seq = new_loc;
    }
    //console.log("Sorted " + sort_dir[panel] + " by " + sort_tag[panel]);
    team_stats_display();
}


function team_stats_display(){
    /***
    This function displays the dynamic 3-panel stats table that appears on each LacrosseReference team page.
    ***/

    var html = {'all_games': '', 'standard': '', 'by_opponents': ''}
    var printed = {};
    var elem = $("#stats_box"); elem.empty();
    
    if(team_stats_clicks.length != 0){ 
        var send_val = team_stats_clicks.join('|');
        //__zgaTracker('send', 'event', 'TeamStatsContent', 'enable', send_val);
        if(typeof mi_track_user == "undefined" || mi_track_user){
            ga('send', {
              eventCategory: 'TeamStatsContent',
              hitType: 'event',
              eventAction: 'enable',
            eventLabel: send_val});
        }
    }
    console.log("Display stats with " + show_offense);
    for(var a = 0;a<misc.rows.length;a++){
        var row = misc.rows[a];
        //console.log(row);
        var display = false;
        if(show_offense && (row.offense == null || row.offense == 1)){ display = true; }
        else if(!show_offense && (row.offense == null || row.offense == 0)){ display = true; }
        
        if(display){
            if(row.class == "team-bg"){
                html[row.panel] += "<div class='" + row.class + " col-12 flex no-padding'>";
            }
            else{
                html[row.panel] += "<div class='table-row " + row.class + " col-12 flex no-padding'>";
            }
            if(row.data != null){
                html[row.panel] += "<div class='col-2-3 no-padding'><ul class='table-ul left' style='background-color:inherit;'>";
                for(var b = 0;b<1;b++){
                    var cell = row.data[b]; var txt = "";
                
                    var tmp = row.offense + row.panel;
                    //console.log(tmp)
                    if (!(tmp in printed)){ printed[tmp] = 1; }
                    
                    var txt = "<div  class='no-padding  " + cell.class + "'>";
                    
                    if(cell.class != 'header' && b == 0 && row.class == "data"){ txt += "<span style='padding-right:5px; ' class='font-12'>" + printed[tmp] + "</span>"; printed[tmp] += 1; }
                    else{ txt += "<span style='' class='font-12'></span>"; }
                    
                    if( 'dtop_str' in cell && cell.dtop_str != null){
                        txt += "<span style='' class='no-padding font-12 " + row.class + "'>";
                        txt += "<span style='' class='no-padding dtop'>"+ cell.dtop_str + "</span>";
                        txt += "<span style='' class='no-padding mob'>"+ cell.mob_str + "</span>";
                        txt += "</span>";
                    }
                    else{
                        txt += "<span style='' class='no-padding font-12 " + row.class + "'>" + cell.str + "</span>";
                    }
                    txt += "</div>";
                    
                    var onclick = "";
                    if('sort_by' in cell){ onclick = 'onclick="team_stats_sort_by_tag(\'' + row.panel + '\', \'' + cell.sort_by + '\');"'; }
                    html[row.panel] += "<li " + onclick + " style='' class='left'>" + txt + "</li>";
                    
                }
                html[row.panel] += "</ul></div>";
                html[row.panel] += "<div class='col-10-9 no-padding'><ul class='table-ul' style='background-color:inherit;'>";
                for(var b = 1; b<row.data.length;b++){
                    var cell = row.data[b];
                    var show_cell = false;
                    if(stat_type == "rate" && cell.stat_type == "rate"){ show_cell = true; }
                    else if(stat_type == "raw" && cell.stat_type == "raw"){ show_cell = true; }
                    else if(stat_type == "pace" && cell.stat_type == "pace"){ show_cell = true; }
                    else if(cell.stat_type == null){ show_cell = true; }
                    if(row.panel == "by_opponents" && cell.str == "Date"){ cell.str = ""; }
                    
                    var txt = "<div  class='no-padding cell-holder " + cell.class + "'>";
                    
                    if('mob_str' in cell && cell.mob_str != null){
                        txt += "<span style='' class='no-padding font-12 " + row.class + "'>";
                        txt += "<span class='no-padding dtop'>" + cell.dtop_str + "</span>";
                        txt += "<span class='no-padding mob'>" + cell.mob_str + "</span>";
                        txt += "</span>";
                    }
                    else{
                        txt += "<span style='' class='no-padding font-12 " + row.class + "'>" + cell.str + "</span>";
                    }
                    txt += "</div>";
                    if(show_cell){
                        var onclick = "";
                        if('sort_by' in cell){ onclick = 'onclick="team_stats_sort_by_tag(\'' + row.panel + '\', \'' + cell.sort_by + '\');"'; }
                        html[row.panel] += "<li " + onclick + " style='' class='center'>" + txt + "</li>";
                    }
                }
                html[row.panel] += "</ul></div>";
            }
            html[row.panel] += "</div>";
            
        }
    }
    
    
    html.standard = "<div id='standard_view' class='panel col-12" + ((panel == "standard") ? ' visible' : ' hidden') + "'>" + html.standard + "</div>";
    html.all_games = "<div id='all_games_view' class='panel col-12" + ((panel == "all_games") ? ' visible' : ' hidden') + "'>" + html.all_games + "</div>";
    html.by_opponents = "<div id='by_opponents_view' class='panel col-12" + ((panel == "by_opponents") ? ' visible' : ' hidden') + "'>" + html.by_opponents + "</div>";
    
    elem.append(html.standard);
    elem.append(html.all_games);
    elem.append(html.by_opponents);
}

function record_ad(code){
    //console.log("Record ad View: " + code + " Admin: " + !(typeof mi_track_user == "undefined" || mi_track_user));


    if(typeof mi_track_user == "undefined" || mi_track_user){
        ad_obj = {
          eventCategory: 'adView',
          hitType: 'event',
          eventAction: 'view',
        eventLabel: ("" + code)};
        //console.log("ad_obj"); console.log(ad_obj);
        ga('send', ad_obj);
    }
}

// Live Win Probability Pages
var lwp_split_row = null;
var lwp_sequence = [];

function click_play_row(game_stream_ID, pct_elapsed, tag){
    if(lwp_split_row == null || lwp_split_row != pct_elapsed){
        //console.log("New pct: " + pct_elapsed);
        lwp_sequence = [];
        lwp_split_row = pct_elapsed;
    }
    lwp_sequence.push(tag);
    var seq = lwp_sequence.join("|");
    //console.log(seq);
    if(seq == "time|play|prob"){
        //console.log("Set the split at " + lwp_split_row + " for game stream " + game_stream_ID);
        document.getElementById('pixel').src = "https://lacrossereference.com/pixel?arg=" + game_stream_ID + "|" + lwp_split_row;
    }
}

function wp_chart(data, id, arg_specs, arg_initial_specs = null){
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
    
    if(initial_specs.flip){ y.domain([max_y_val, min_y_val]); }
    else{ y.domain([min_y_val, max_y_val]); }
    
    // Print shading if necessary
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){ svg = graph_add_shading_ranges(svg, data, x, y, initial_specs); }
    
    // Print any vertical lines, if necessary
    svg = graph_print_vertical_lines(svg, x, height, initial_specs);
    
    // Handle the X-Axis
    svg = graph_print_x_axis(svg, x, data, width, height, min_x_val, max_x_val, {'type': 'horizontal_line'}, initial_specs);
    
    // Handle the Y-Axis
    svg = graph_print_y_axis(svg, x, y, data, width, height, min_x_val, max_x_val, min_y_val, max_y_val, initial_specs);
    
    icon_offset = -15;
    // Add the link icon to see more
    if('detail_url' in data && data.detail_url != null){ svg = graph_add_link_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }
    
    // Create the header section of the chart/tile
    if('explanation' in data && data.explanation != null){ svg = graph_add_explanation_icon(icon_offset, svg, data, initial_specs); icon_offset -= 20; }

    // Add the title
    if('title' in data){ svg = graph_add_title(svg, data, initial_specs); }
    
    // Create the menu icon
    if(initial_specs.menu != null){ initial_specs.svg_id = id;
         svg = graph_add_menu_icon(icon_offset, svg, data, initial_specs); 
         icon_offset -= 25;
    }
    
    // Add the legend if necessary
    if('legend' in data){ svg = graph_create_legend(svg, x, y, width, height, initial_specs, data); }
    if('shading_vars' in initial_specs && initial_specs.shading_vars != null){
        svg = graph_add_shading_legend(svg, x, data, height, min_x_val, max_x_val, initial_specs);
    }
    
    if('text' in data){ initial_specs.x_scale = x; svg = graph_add_text(svg, data, initial_specs); }
    
    // Print the data
    var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d){ return x(d.x); }).y(function(d){ return y(d.y); });

    for(var a = 0;a<data.data.length;a++){
        tmp_data = data.data[a];
        
        svg.append("path")
          .datum(tmp_data.points)
          .attr("fill", "none") .attr("stroke", tmp_data['stroke'])
          .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
          .attr("stroke-dasharray", tmp_data['stroke-dasharray'])
          .attr("stroke-width", tmp_data['stroke-width'])
          .attr("d", line);
          
        // Add the balls if necessary
        if('ball_r' in tmp_data){
           
            svg.selectAll().data(tmp_data.points)
              .enter().append("circle").each(function(d){
                
                d.final_fill = ('ball_fill' in tmp_data) ? tmp_data.ball_fill : "#33F";
                d.final_stroke = ('ball_stroke' in tmp_data) ? tmp_data.ball_stroke : "#33F";
                
                if(initial_specs.highlight && d.highlight){ d.final_fill = initial_specs.highlight_color; } 
            }).attr("cx", function(d) { return x(d.x); })
              .attr("r", tmp_data.ball_r)
              .attr("cy", function(d) { return y(d.y); })
              .style("fill", function(d){ return d.final_fill; }).style("stroke", function(d){ return d.final_stroke; });
        }
    }
    
    
    
    // Add the slider if necessary
    if('slider' in data){ svg = graph_create_slider(svg, x, y, width, height, initial_specs, data); }
    
}

