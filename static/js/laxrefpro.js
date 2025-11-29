


	var js_viz_already_reported = 0;


	function isDict(v) {
		return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date);
	}
	
	function isList(v) {
		return typeof v==='object' && v!==null && (v instanceof Array) && !(v instanceof Date);
	}

	function toggle_statistical_comparison_detail_visibility(seq){
        /***
        This function expands a specific detail section for a specific statistical category. If the section was already open, it closes the section and sets misc_dot_category to null so that no sections are expanded on redraw.
        ***/
        
        var tmp_bucket = misc.data_buckets.filter(r=> r.seq == seq)[0];
        
        var is_open = $("#toggle_icon" + seq).attr("src").indexOf("Minus") > -1;
        //console.log("is open: " + is_open);
        show_all = 0;
        if(is_open){
            misc.category = null;
        }
        else{
            misc.category = tmp_bucket.arg;
        }
        draw_statistical_comparison();
        
    }
    
    function expand_all_statistical_comparison_rows(){
        //console.log("Set show all to 1")
        show_all = 1;
        redraw();
    }
    
    
	function draw_statistical_comparison(){
        /***
        This function generates the summary and detail data to show how a team stacks up against another team (or group of teams)
        ***/
        
        // Display the 5 statistical categories
		var comp_font_size = "large";
		if(misc.target_template == "team_my_schedule.html"){ comp_font_size = "small"; }
        console.log("\nstart draw_statistical_comparison...");
        id = 'statistical_comparison_div'; success = 0;
        try{
            
            
            
            
            // Print long-term legend
            
            // Print Results of the Comparisons
            
            // Calculate the long-term (12 months) state of the program information
            var max_abs_diff_positive = null; var min_abs_diff_positive = null;
            var max_abs_diff_negative = null; var min_abs_diff_negative = null;
            
            // Identify if the bucket in question is part of an expanded bucket category
            var no_focus = 1;
            for(var a = 0;a<misc.data_buckets.length;a++){ var bucket = misc.data_buckets[a];
                if(bucket.top_level){
                    bucket.in_focus = bucket.arg == misc.category ? 1 : 0;
                    if(bucket.arg == misc.category){ no_focus = 0; }
                    
                    bucket.n_children = misc.data_buckets.filter(r=> !r.top_level && r.parent == bucket.arg).length;
                }
                else{
                    bucket.in_focus = bucket.parent == misc.category ? 1 : 0;
                }
                
            }
            
			// Check if the next opponent has played zero games this season
			var next_opp_has_played_no_games = null;
			if('opp_team_season' in misc.data.next_game && misc.data.next_game.opp_team_season != null){
				if('games_played' in misc.data.next_game.opp_team_season && misc.data.next_game.opp_team_season.games_played != null){
					next_opp_has_played_no_games = misc.data.next_game.opp_team_season.games_played == 0 ? 1 : 0;
				}
			}
			var missing_or_empty_data_error = 0;
			
			
            for(var a = 0;a<misc.data_buckets.length;a++){ var bucket = misc.data_buckets[a];
                var tmp_prefix = bucket.raw ? "" : "adjusted_";
                var tmp_statistic = misc.extra_data.db_statistics.filter(r=> r.stat == bucket.tag)[0];
				
                //console.log("wp.tmp_statistic"); console.log(tmp_statistic);
                
                bucket.is_reversed = bucket.reverse == null ? tmp_statistic.reverse : bucket.reverse;
				//if(bucket.data_type == "defense" && bucket.tag == "clear_rate"){ bucket.is_reversed = 0; }
				
                var tmp_data = misc.data.peers_comparison.self_data.long_term.filter(r=> r.data_type == bucket.data_type)[0];
				
				if(typeof tmp_data == "undefined"){
					// No data, the fact that the data is not in the object is expected
					bucket.no_data_expected = 1;
				}
				else{
					//console.log("peer_selection: " + peer_selection);
					//console.log("display_next_game_benchmark.misc.data.peers_comparison"); console.log(misc.data.peers_comparison);
					bucket.no_data_expected = 0;
					bucket.missing_custom_groups = 0;
					if(peer_selection == "custom"){
						tmp_data1 = misc.data.peers_comparison.peers_data.filter(r=>r.data_type == bucket.data_type && r.grouping_type == "custom-1")
						tmp_data2 = misc.data.peers_comparison.peers_data.filter(r=>r.data_type == bucket.data_type && r.grouping_type == "custom-2")
						if(tmp_data1.length == 0 || tmp_data2.length == 0){
							// At least one of the custom groups doesn't have any teams in it
							bucket.missing_custom_groups = 1;
						}
						else{
						
							tmp_data1 = tmp_data1[0];
							tmp_data2 = tmp_data2[0];
							
							bucket.my_value = tmp_data1[tmp_prefix + bucket.tag];
							bucket.my_percentile = tmp_data1[tmp_prefix + bucket.tag + "_percentile"];
							
							if(bucket.one_minus){ bucket.my_value = 1.0 - bucket.my_value; }
							bucket.my_value_str = jsformat(bucket.my_value, tmp_statistic.js_fmt);
							bucket.peers_value = tmp_data2[tmp_prefix + bucket.tag];
							bucket.peers_percentile = tmp_data2[tmp_prefix + bucket.tag + "_percentile"];
							bucket.peers_value_str = jsformat(bucket.peers_value, tmp_statistic.js_fmt);
						}
					}
					else{
						bucket.my_value = tmp_data[tmp_prefix + bucket.tag];
						bucket.my_percentile = tmp_data[tmp_prefix + bucket.tag + "_percentile"];
						
						if(bucket.one_minus){ bucket.my_value = 1.0 - bucket.my_value; }
						bucket.my_value_str = jsformat(bucket.my_value, tmp_statistic.js_fmt);
				
						tmp_data = misc.data.peers_comparison.peers_data.filter(r=>r.data_type == bucket.data_type && r.grouping_type == peer_selection)
						if(tmp_data.length == 0){
							missing_or_empty_data_error = 1;
						}
						else{ 
							tmp_data = tmp_data[0];
						
							bucket.peers_value = tmp_data[tmp_prefix + bucket.tag];
							bucket.peers_percentile = tmp_data[tmp_prefix + bucket.tag + "_percentile"];
							if(bucket.one_minus){ bucket.peers_value = 1.0 - bucket.peers_value; }
							bucket.peers_value_str = jsformat(bucket.peers_value, tmp_statistic.js_fmt);
							if(bucket.tag == "clear_rate"){
								//console.log("dsa.my_value.adjusted_clear_rate"); console.log(bucket.my_value);
								//console.log("dsa.peer.adjusted_clear_rate"); console.log(bucket.peers_value);
							}
							if(bucket.tag == "off_faceoff_conversion_rate"){
								console.log("dsa.my_value.off_faceoff_conversion_rate"); console.log(bucket.my_value);
								console.log("dsa.peer.off_faceoff_conversion_rate"); console.log(bucket.peers_value);
							}
						}
					}
					
					
					
					bucket.percentile_diff_long_term = bucket.my_percentile - bucket.peers_percentile;
					
					bucket.diff_long_term = bucket.my_value/bucket.peers_value - 1;
					bucket.diff_long_term = bucket.my_value - bucket.peers_value;
					if(tmp_statistic.js_fmt.indexOf("%") > -1){
						bucket.diff_long_term = 100.0 * (bucket.my_value - bucket.peers_value);
					}
					else{
						bucket.diff_long_term = bucket.my_value - bucket.peers_value;
					}
					
					if(bucket.tag == "clear_rate"){
						//console.log("dsa.diff_long_term"); console.log(bucket.diff_long_term);
						//console.log("dsa.reversed"); console.log(bucket.is_reversed);
					}
					bucket.diff_long_term_str = jsformat(bucket.diff_long_term, "1%");
					
					var higher_is_better = null;
					if(bucket.data_type == "offense" && !bucket.is_reversed){
						// It's an offensive stat, but we don't need to reverse it, so higher is better
						higher_is_better = 1;
						bucket.abs_diff = bucket.diff_long_term;
					}
					else if(bucket.data_type == "offense" && bucket.is_reversed){
						// It's an offensive stat, and we are supposed to reverse-order teams on this stat, so lower is better
						higher_is_better = 0;
						bucket.abs_diff = -1.0 * bucket.diff_long_term;
					}
					else if(bucket.data_type == "defense" && !bucket.is_reversed){
						// It's an defensive stat, but we don't need to reverse it, so lower is better
						higher_is_better = 0;
						bucket.abs_diff = -1.0 * bucket.diff_long_term;
					}
					else if(bucket.data_type == "defense" && bucket.is_reversed){
						// It's an defensive stat, and we are supposed to reverse-order teams on this stat, so higher is better
						higher_is_better = 1;
						bucket.abs_diff = bucket.diff_long_term;
					}
					
					//console.log(bucket.tag + " (" + bucket.data_type + "): raw = " + bucket.my_value_str + "; abs_diff = " + bucket.abs_diff);
					
					if(bucket.abs_diff > 0){
						if(max_abs_diff_positive == null || bucket.abs_diff > max_abs_diff_positive){ max_abs_diff_positive = bucket.abs_diff; }
						if(min_abs_diff_positive == null || bucket.abs_diff < min_abs_diff_positive){ min_abs_diff_positive = bucket.abs_diff; }
					}
					else{
						if(max_abs_diff_negative == null || bucket.abs_diff > max_abs_diff_negative){ max_abs_diff_negative = bucket.abs_diff; }
						if(min_abs_diff_negative == null || bucket.abs_diff < min_abs_diff_negative){ min_abs_diff_negative = bucket.abs_diff; }
					
					}
					bucket.indicator_long_term = "<img class='icon-15' src='/static/img/yellow_dot_15.png' />";
					var tmp_diff = bucket.diff_long_term * (higher_is_better ? 1.0 : -1.0);
					if(tmp_diff < -.05){
						//The team is more than 10% worse than the peer group
						bucket.indicator_long_term = "<img class='icon-15' src='/static/img/red_dot_15.png' />";
					}
					else if(tmp_diff > 0){
						//The team is more than better than the peer group but not by much
						bucket.indicator_long_term = "<img class='icon-15' src='/static/img/green_outline_15.png' />";
					}
					
					else if(tmp_diff > .05){
						//The team is more than 10% better than the peer group
						bucket.indicator_long_term = "<img class='icon-15' src='/static/img/green_dot_15.png' />";
					}
					
					//console.log(bucket);
                }
            }
            
            // Calculate the abs diff on a -100 to 100 scale based on the min and max
            
            // Since we want an abs_diff=0 to be in the middle, we need to know whether the best value is farther right than the worst value is left. The range is set by the maximally far from 0 value.
            var max_abs_diff = null; var min_abs_diff = null;
            if(max_abs_diff_positive > (min_abs_diff_negative * -1.0)){
                max_abs_diff = max_abs_diff_positive;
                min_abs_diff = -1 * max_abs_diff_positive;
            }
            else{
                max_abs_diff = -1 * min_abs_diff_negative;
                min_abs_diff = min_abs_diff_negative;
            }
            
            var abs_diff_range = max_abs_diff - min_abs_diff;
            //console.log("Positives: " + jsformat(min_abs_diff_positive, "3") + " - " + jsformat(max_abs_diff_positive, "3"));
            //console.log("Negatives: " + jsformat(min_abs_diff_negative, "3") + " - " + jsformat(max_abs_diff_negative, "3"));
            //console.log("Combined: " + jsformat(min_abs_diff, "3") + " - " + jsformat(max_abs_diff, "3"));
            //console.log("abs_diff_range: " + jsformat(abs_diff_range, "3"));
            
            for(var a = 0;a<misc.data_buckets.length;a++){ var bucket = misc.data_buckets[a];
            
                
                bucket.abs_diff_100 = 0;
                if(abs_diff_range > 0){
                    bucket.abs_diff_100 = ((bucket.abs_diff - min_abs_diff) / abs_diff_range * 2.0 - 1.0);
                }
				
				
            }
            //console.log("rqpa.misc.data_buckets"); console.log(misc.data_buckets);
			var top_level_buckets = misc.data_buckets.filter(r=> r.top_level);
            var n_missing_data_buckets = top_level_buckets.filter(r=> 'no_data_expected' in r && r.no_data_expected).length;
			//console.log("706.n_missing_data_buckets: " + n_missing_data_buckets);
			var elem = $("#statistical_comparison_div"); elem.empty();
			if(n_missing_data_buckets > 0){
			    
				// No data, alert the user and suggest that they switch over to the 12-month report
				var missing_data_html = "<div class='no-padding flex'>";
					missing_data_html += "<div class='col-1 dtop no-padding'></div>";
					missing_data_html += "<div class='col-10-12 centered no-padding' style='padding:20px 0px;'>";
						missing_data_html += "<span class='font-15 lh-24 contents'>There is no data available for the current season. Click the &quot;Last 12-mo&quot; toggle to switch to the Last-12-months view.</span>"
					missing_data_html += "</div>";
					missing_data_html += "<div class='col-1 dtop no-padding'></div>";
				missing_data_html += "</div>";
				$("#statistical_comparison_div").append(missing_data_html);
			}
			else{
				// Print the Long-Term report
				var elem = $("#" + id); elem.empty();
				
				var expand_all_div = "<div class='col-12 right'><div class='' onclick='expand_all_statistical_comparison_rows();' style='margin-top:3px;'><span class='font-12 pointer'>Expand All </span></div></div>";
				
				elem.append(expand_all_div)
				
				
				for(var a = 0;a<top_level_buckets.length;a++){ var bucket = top_level_buckets[a];
					
					// Visible Summary Row
					bucket.html = "<div class='flex font-18" + (bucket.in_focus ? " bold": "") + "' style='border-bottom: solid 1px #EEE;'>"
						bucket.html += "<div class='col-2-4'><span class='pointer " + (comp_font_size == "large" ? "font-18": "font-15") + "' style='padding-left: 20px;' onclick='toggle_statistical_comparison_detail_visibility(" + bucket.seq + ");'>" + bucket.header + "</span></div>";
						bucket.html += "<div class='col-3 dtop'><div class='no-padding inline-flex'>";
							bucket.html += "<div class='no-padding' style=''>";
								if(bucket.abs_diff > 0){
									bucket.html += "<img class='icon-15' style='margin: 0px 10px;' src='/static/img/BlueCheck240.png' />";
								}
								else{
									bucket.html += "<img class='icon-15' style='margin: 0px 10px;' src='/static/img/RedXCircle240.png' />";
								}
							bucket.html += "</div>";
							bucket.html += "<div class='no-padding' style=''><span class='" + (comp_font_size == "large" ? "font-18": "font-15") + "'>" + bucket.my_value_str + " vs. " + bucket.peers_value_str + "</span></div>";
						bucket.html += "</div></div>";
						bucket.html += "<div class='col-6' id='team_comparison_stat_bucket" + bucket.seq + "'></div>";
						bucket.html += "<div class='col-1 centered'>";
							if(bucket.n_children > 0){
								bucket.html += "<img id='toggle_icon" + bucket.seq + "' class='icon-15' src='static/img/Gray_" + (bucket.in_focus || show_all ? "Minus" : "Plus") + "_Skinny150.png' onclick='toggle_statistical_comparison_detail_visibility(" + bucket.seq + ");' />";
							}
						bucket.html += "</div>";
						
					bucket.html += "</div>";
					
					// Hidden Detail Rows
					bucket.html += "<div style='margin-bottom:50px;' class='detail-section " + (bucket.in_focus || show_all ? "" : "hidden") + "' id='expand" + bucket.seq + "'>";
						var low_level_buckets = misc.data_buckets.filter(r=> r.parent == bucket.arg);   
						for(var b = 0;b<low_level_buckets.length;b++){ var lb = low_level_buckets[b];
					
							// Visible Summary Row
							bucket.html += "<div class='flex' style='border-bottom: solid 1px #EEE;'>"
								bucket.html += "<div class='col-2-4'><span class='" + (comp_font_size == "large" ? "font-18": "font-15") + "' style='padding-left: 30px;'>" + lb.header + "</span></div>";
								bucket.html += "<div class='col-3 dtop'><div class='no-padding inline-flex'>";
									bucket.html += "<div class='no-padding' style=''>";
										if(lb.abs_diff > 0){
											bucket.html += "<img class='icon-15' style='margin: 0px 10px;' src='/static/img/BlueCheck240.png' />";
										}
										else{
											bucket.html += "<img class='icon-15' style='margin: 0px 10px;' src='/static/img/RedXCircle240.png' />";
										}
									bucket.html += "</div>";
									bucket.html += "<div class='no-padding' style=''><span class='" + (comp_font_size == "large" ? "font-18": "font-15") + "'>" + lb.my_value_str + " vs. " + lb.peers_value_str + "</span></div>";
								bucket.html += "</div></div>";
								bucket.html += "<div class='col-6' id='team_comparison_stat_bucket" + lb.seq + "'></div>";
								bucket.html += "<div class='col-1 centered'></div>";
								
							bucket.html += "</div>";
						}
					bucket.html += "</div>";
				}
				var show_adjusted_msg = 1;
				for(var a = 0;a<top_level_buckets.length;a++){ var bucket = top_level_buckets[a];
					if(bucket.missing_custom_groups){
						missing_html = "<div class='col-12 centered'><span class=''>To compare groups of teams, click <a href='/'>here</a> and then use the 'Edit Peers' feature to select your comparison groups.</span></div>"
						if(a == 0){
							elem.append(missing_html);
							show_adjusted_msg = 0;
						}
					}
					else{
						if(next_opp_has_played_no_games && missing_or_empty_data_error){
							
						}
						else{
							elem.append(bucket.html);
						}
					}
				}
				
				// Print the spark bar graphic arrow lines
				for(var a = 0;a<misc.data_buckets.length;a++){ var bucket = misc.data_buckets[a];
					bar_id = "team_comparison_stat_bucket" + bucket.seq;
					
					
					//console.log("print reference arrow for " + bucket.tag + " (" + bar_id + ") diff = " + bucket.abs_diff + " (100 = " + bucket.abs_diff_100 + ") percentile diff=" + bucket.percentile_diff_long_term);
					//console.log(bucket);
					
					
					
					// value is on a -1.0 to 1.0 scale
					reference_arrow(bar_id, {'value': bucket.percentile_diff_long_term/100, 'bar_fill': "#FFF", 'margin_left': 0, 'margin_top': 3, 'margin_bottom': 0, 'margin_right': 0, 'width': full_w, 'height': 20, 'fill': no_focus || bucket.in_focus || show_all ? SITE_BLUE : VERY_LIGHT_GRAY});

				}

				// Suggest that the user switch to the LTM period since the team-in-question has not played a game this year
				if(peers_comparison_period == "CY" && next_opp_has_played_no_games && missing_or_empty_data_error){
						
				}
				
				if(show_adjusted_msg){
					if(next_opp_has_played_no_games && missing_or_empty_data_error){
						var exp_html = "<div class='centered'  style='padding-left: 20px;'>";
						exp_html += "<span class='msg contents font-18 lh-30'>We have not yet received any " + misc.data.next_game.opp_team_season.year + " game data for " + misc.data.next_game.opp_team_season.team + ". If you want to switch to a comparison of all games played in the last 12 months, click the &quot;Last 12-mo&quot; button above.</span>";
						exp_html += "</div>";
						elem.append(exp_html);
					}
					else{
						var exp_html = "<div class='italic error'  style='padding-left: 20px;'>";
						exp_html += "<span class='contents'>Note: all statistics presented here have been adjusted to account for opponent strength.</span>";
						exp_html += "</div>";
						elem.append(exp_html);
							
						if(!show_legend){
							var tmp_button_html = "<div class='' onclick='toggle_legend_visibility();' style='margin-top:13px;'><span class='font-12 pointer'>Show Legend</span></div>"
							elem.append(tmp_button_html);
						}
					}
				}
			}
            /* mark complete */
            success = true;
        }
        catch(err){ handle_js_fail(id, misc, err); }
        if(!success){
            $("#" + id).empty(); $("#" + id).append(single_stat.split("</div>")[1].replace('[stat]', "Data could not be displayed."));
            //report_js_visualization_issue(misc.target_template + "|" + id + "|" + misc.nhca);
        }
    }
    
    
	function update_explanation_text(){
    
        //console.log("peer selection: " + peer_selection);
        var elem = null; var txt = null;
        
        // Outstanding
        elem = $("#outstanding_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "The circle in the center of the range represents the Group B average; the average performance of the teams in Group B. If Group A has outperformed Group B, the line appears to the right. The farther right, the better their relative performance.";
        }
        else{
            txt = "The circle in the center of the range represents the benchmark; it is the average performance of the peer group (or the actual performance of the comparison team). If you have overperformed the benchmark, your team's line appears to the right. The farther right, the better your relative performance.";
        }
        
        elem.append(txt);
        
        // Good
        elem = $("#good_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "Group A is better than the Group B average, but not by a ton. Note that the scale is always better performance to the right. So if their offensive turnover rate is 4% less than that of Group B, then that is a good thing, and the line will appear to the right. Right = better. Left = worse.";
        }
        else{
            txt = "You are better than the benchmark, but not by a ton. Note that the scale is always better performance to the right. So if your offensive turnover rate is 4% less than the benchmark, then that is a good thing, and the line will appear to the right. Right = better. Left = worse.";
        }
        
        elem.append(txt);
        
        // Poor
        elem = $("#poor_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "When the line heads to the left of the benchmark circle, Group A is underperforming Group B.";
        }
        else{
            txt = "When the line heads to the left of the benchmark circle, you are underperforming the comparison group. Any stat with a line to the left of the circle is an area for improvement.";
        }
        
        elem.append(txt);
        
        // Urgent
        elem = $("#urgent_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "When the performance line for Group A extends this far to the left of the Group B average, Group A is seriously underperforming.";
        }
        else{
            txt = "When your performance line extends this far to the left of the benchmark, you are seriously underperforming the benchmark.";
        }
        
        elem.append(txt);
       
        // Blue check
        elem = $("#blue_check_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "The statistical performance for Group A is better than for Group B. Note, this does not always mean higher numbers. If their off. turnover rate is lower than that for Group B, they'd have a blue check.";
        }
        else{
            txt = "Your statistical performance is better than the benchmark. Note, this does not always mean higher numbers. If your off. turnover rate is lower than the benchmark, you'll get a blue check.";
        }
        
        elem.append(txt);
        
        // Red X
        elem = $("#red_x_explanation_span"); elem.empty();
        
        if(peer_selection == "custom"){
            txt = "The statistical performance for Group A is worse than for Group B.";
        }
        else{
            txt = "Your statistical performance is worse than the benchmark.";
        }
        
        elem.append(txt);
    }
    
    
function profile_object_size(obj, obj_name, offset){
    /***
    Takes in a dict or list object and calculates the size of the various components and then prints that information to the console.
    ***/
    //console.log("\n\nprofile_object_size=deactivated|null!!!!!\n\n"); return null;
    
    //console.log("Profile: " + obj_name);
    var show_total_misc_size = 'showTotalMisc' in misc && ['yes', 1, '1', 'Yes', 'y'].indexOf(misc.showTotalMisc) > -1

	if(!show_total_misc_size && (!('on_server' in misc) || misc.on_server)){ return; }
	
	
    var components = [];
    var local_offset = offset;
       
    // Identify the components
    var total_size = 0; var tmp_size = null;
    var it_is_a_dict = isDict(obj);
    var it_is_a_list = isList(obj);
	var per_item = null;
	//console.log("HERE!!!!", obj_name, it_is_a_list , isDict(obj[0]))
    if(it_is_a_dict){
	    
        for(k in obj){
            tmp_size = JSON.stringify(obj[k]).length
            components.push({'name': k, 'size': tmp_size, 'is_list': isList(obj[k]), 'is_dict': isDict(obj[k])})
            total_size += tmp_size;
        }            
    }
	else if(it_is_a_list && isDict(obj[0])){

        for(k in obj[0]){
			console.log(k);
            tmp_size = JSON.stringify(obj[0][k]).length
            components.push({'name': k, 'size': tmp_size, 'is_list': isList(obj[0][k]), 'is_dict': isDict(obj[0][k])})
            //total_size += tmp_size;
        }   
		total_size = JSON.stringify(obj).length
        per_item = total_size / obj.length;		
    }
    else{
	
        total_size = 1;
        if(obj != null){
            total_size = JSON.stringify(obj).length
            per_item = total_size / obj.length;
        }
    }
    
    if(offset == ""){
        if(per_item == null){
            console.log(local_offset + obj_name + ": " + jsformat(total_size / 1024, "2") + " kb; n components = " + components.length)
        }
        else{
            console.log(local_offset + obj_name + ": " + jsformat(total_size / 1024, "2") + " kb (" + jsformat(per_item / 1024, "2") + " kb per item; n components = " + components.length)
        }
    }
    
    
	if(show_total_misc_size){
		if(document.getElementById('miscObjSize') != null){
			document.getElementById('miscObjSize').value = total_size / 1024;
		}
	}
	else{
		// Only show the full list if we are on local and we are not just showing the total misc size
		components = components.sort(function(a, b){ return b.size - a.size; });
		
		// Sum total size for the current object and then print it

		for(var a = 0;a<components.length;a++){ var c = components[a];
			c.seq = a;
			c.pct_of_total = c.size / total_size;
			
			// Recursively go through large components to 
			if (local_offset.length <= 2 || c.seq <= 5){
				console.log(local_offset + "  " + c.name + " (is_list=" + c.is_list + "; is_dict=" + c.is_dict + "): " +  jsformat(c.size / 1024, "2") + " kb (" + jsformat(c.pct_of_total, "2%") + " of total)");
				
			}
			
			if (local_offset.length > 2 && c.seq == 5 && components.length - 5 > 0){
				console.log(local_offset + "  " + (components.length - 5) + " other objects not printed...>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
			}
			
			if (c.size > 15*1024 && isDict(obj[c.name]) && c.name != obj_name){
				profile_object_size(obj[c.name], c.name, offset + "  ");
			}
			else{
				//console.log(local_offset + "  " + c.name + ": " +  jsformat(c.size / 1024, "2") + " kb (" + jsformat(c.pct_of_total, "2%") + " of total)");
			}
		}
	}
		
}




function show_load_diagnostics(){
    /***
    Load diagnostics are stored in the time_log object (note: not every template creates or uses this feature, hence the type of check). These track how long various steps in the process of rendering a page are taking. Admins can see these timestamps by clicking their top-menu and selecting 'Load'. This function is triggered when that happens and it calculates the duration of each step and displays it in an easy-to-read table along with the total rendering time for the content.
    ***/
    var time_log_html = "No timelog created."
    if(typeof(time_log) != "undefined" && time_log.length > 0){
        console.log("h.time_log"); console.log(time_log);
        var total = 0;
        for(var a = 0;a<time_log.length;a++){
            var log = time_log[a];
            if(!('end' in log) && a+1 < time_log.length){
                next_start = time_log[a+1].start;
                log.end = next_start
            }
        }
    
    
        for(var a = 0;a<time_log.length-1;a++){
            var log = time_log[a];
            log.duration = log.end - log.start;
            total += log.duration;
        }    
        for(var a = 0;a<time_log.length-1;a++){
            var log = time_log[a];
            
            dur = jsformat(log.duration, "0") + "ms";
            
            log.duration_str = dur;
			log.pct_str = jsformat(log.duration/total, "1%");
			
        }
        
        
        time_log_html = ""
        
        time_log_html += "<div class='flex bbottom'>";
        time_log_html += "<div class='col-6'><span class='bold'>Task</span></div>";
        time_log_html += "<div class='col-3-6 right'><span class='bold'>Duration</span></div>";
        time_log_html += "<div class='col-3 right dtop'><span class='bold'>%</span></div>";
        time_log_html += "</div>";
        
        for(var a = 0;a<time_log.length-1;a++){
            var log = time_log[a];
            //console.log(log);
            time_log_html += "<div class='flex table-row'>";
            time_log_html += "<div class='col-6'><span class='' title='" + log.start + "'>" + log.tag + "</span></div>";
            time_log_html += "<div class='col-3-6 right'><span class=''>" + log.duration_str + "</span></div>";
			time_log_html += "<div class='col-3 right dtop'><span class='bold'>" + log.pct_str + "</span></div>";
            time_log_html += "</div>";
        }
        total = {'tag': "Total", 'duration_str': jsformat(total/1000.0, "2") + "s"};
        
        var log = time_log[time_log.length];
        time_log_html += "<div class='flex bold' style='border-top: solid 1px black;'>";
        time_log_html += "<div class='col-9-6'><span class='bold'>Total</span></div>";
        time_log_html += "<div class='col-3-6 right'><span class='bold'>" + total.duration_str + "</span></div>";
        time_log_html += "</div>";
        
    }
    
    
    html = '';
    html += '<div class="flex exp-scroll" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 font-12 popup-content">';
        html += time_log_html;
       
        
        html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>    ';
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    
    
    
    $("#overlay_panel").empty(); $("#overlay_panel").append(html); $("#overlay_panel").addClass("shown");
}

function d3toggle_click_orig(){
    
    toggle_obj = d3.select(this);
    id = toggle_obj.attr('id');
    balls_class = "." + toggle_obj.attr('class').split(" ").filter(r => r != "blue").join(".");
    background_class = balls_class.replace("ball", "background");
    
    tmp = id.replace("-toggle-ball", "") + "." + "toggle-ball";

    balls = d3.selectAll(balls_class);
    backgrounds = d3.selectAll(background_class);
    
    is_initial = parseInt(toggle_obj.attr("nonce"));
    console.log("Toggle: "+ id + "  Class: "+ balls_class + "    initial: " + is_initial);
    if(is_initial){
        $(balls_class).addClass("blue"); $(background_class).removeClass("blue");
    }
    else{
        $(background_class).addClass("blue"); $(balls_class).removeClass("blue");
    }
    direction = is_initial ? -1 : 1;
    balls.attr("cx", function(d){ return parseFloat(d3.select(this).attr("cx")) + direction* (parseFloat(toggle_obj.attr("r"))*2 + 2); } );
    
    if(id == "ranks_mob_calculation"){ 
        if(is_initial){ toggle_radio("off_radio2 offensive_calculation_radio", "off_radio2"); }
        else{ toggle_radio("off_radio1 offensive_calculation_radio", "off_radio1"); }
    }
    if(id == "ranks_mob_peers"){ 
        if(is_initial){ toggle_radio("off_radio3 offensive_peers_radio", "off_radio3mob"); }
        else{ toggle_radio("off_radio4 offensive_peers_radio", "off_radio4mob"); }
    }
    
    balls.attr("nonce", is_initial ? 0 : 1);
    
    
} 
            
function toggler(what=null){

    var this_id = null;
    if(what == null){ // If the thing that was clicked is a d3 toggle object
        this_class = d3.select(this).attr("class").split(" ").filter(r => ['set', 'toggle-ball'].indexOf(r) == -1);       
        this_id = d3.select(this).attr("id");
        if(this_id != null && this_id.indexOf('-label-') > -1){ this_id = this_id.split("-label-")[0]; }     
    }
    else{ // If the thing that was clicked is a basic old HTML input
        this_class = what.classList.value.split(" ");
    }
    
    // If we got a class list we weren't expecting, report it and exit
    if(this_class == []){ report_js_visualization_issue(misc.target_template + "|" + 'toggler' + "|" + misc.nhca); return; }
    this_class = this_class[0];
    
    
    

    // Select the toggles and input.radios that need to be processed
    balls = d3.selectAll(".toggle-ball." + this_class);
    backgrounds = d3.selectAll(".toggle-background." + this_class);
    radios = $("input." + this_class);

    
    // Toggle & move the toggle balls and identify whether the initial option is selected or not
    is_not_set = null;
    balls.each(function(d, i){ 
        obj = d3.select(this); 
        direction = parseInt(obj.attr("nonce")) ? -1 : 1;
        obj.attr("nonce", parseInt(obj.attr("nonce")) ? 0 : 1);
        
        if(i == 0){ is_not_set = parseInt(obj.attr("nonce")); }
        
        cur_class = obj.attr("class");
        if(cur_class.indexOf(" set") == -1){ obj.attr("class", cur_class + " set"); }
        else{ obj.attr("class", cur_class.replace(" set", "")); }
        obj.attr("cx", parseFloat(obj.attr("cx")) + direction* (parseFloat(obj.attr("r"))*2 + 2) );
    
    });
    
    // Switch the relevant backgrounds to whatever state they need to be moved to
    backgrounds.each(function(d){ 
        obj = d3.select(this);
        cur_class = obj.attr("class");
        if(cur_class.indexOf(" set" ) == -1){ obj.attr("class", cur_class + " set"); }
        else{ obj.attr("class", cur_class.replace(" set", "")); }
    });
    
    // Unless the radio input has the same name as the one clicked, switch its state
    radios.each(function(d, i){ if(what == null || what.name != $(this).prop("name")){ cur = $(this).prop("checked"); $(this).prop("checked", !cur); } });
    
    
    console.log("this_class: " + this_class + " ( is not set: " + is_not_set + ")");
    
    // Do whatever actual JS code is suggested by the object clicked
    
    if(this_class == "team_game_log_stat_type_adv_vs_trad"){
        console.log("game_log_stat_context: " + game_log_stat_context);
        game_log_stat_type_adv_vs_trad_specs[game_log_stat_context].stat_type = is_not_set ? "trad" : "adv";
        if(game_log_stat_context == "game_log"){ display_overview(null); }
    }
    if(this_class == "team_game_log_stat_type_adv_vs_trad"){
        console.log("game_log_stat_context: " + game_log_stat_context);
        game_log_stat_type_adv_vs_trad_specs[game_log_stat_context].stat_type = is_not_set ? "trad" : "adv";
        if(game_log_stat_context == "game_log"){ display_overview(null); }
    }
    if(this_class == "lines_roster_stat_type_adv_vs_trad"){
        lines_roster_specs.show_advanced = is_not_set ? 0 : 1;
        display_line_groupings("team_lines");
    }
    if(this_class == "roster_stat_type_adv_vs_trad"){
        roster_specs.show_advanced = is_not_set ? 0 : 1;
        display_roster("roster");
    }
    if(this_class == "roster_stat_type_adv_vs_trad_list_and_keys"){
        roster_specs.show_advanced = is_not_set ? 0 : 1;
        display_roster_list_and_keys("roster_overview_div", misc.data.next_game.opp_roster_list_and_keys, roster_specs);
    }
    if(this_class == "full_schedule_type_adj_vs_raw"){ // For logged in PRO subs or trial team
        full_schedule_type_adj_vs_raw_specs.stat_type = is_not_set ? "raw" : "adj";
        console.log("now " + full_schedule_type_adj_vs_raw_specs.stat_type)
        display_games("completed_games_list");
    }
    if(this_class == "full_schedule_type_adj_vs_raw_noauth"){ // For non-logged in users
        full_schedule_type_adj_vs_raw_specs.stat_type = is_not_set ? "adj" : "raw";
        console.log("now " + full_schedule_type_adj_vs_raw_specs.stat_type)
        display_games("completed_games_list");
    }
    if(this_class == "player_perspective_rate_vs_raw"){
        player_rate_vs_raw_specs.stat_type = is_not_set ? "raw" : "rate";
        display_player_stats(null);
    } 
    if(this_class == "admin-gpt-show-completed-content"){
        show_completed_items = show_completed_items ? 0 : 1;
        display_admin_llm_queue();
    } 
    
    if(this_class == "offensive_perspective_rate_vs_raw"){
        offensive_perspective_rate_vs_raw_specs.stat_type = is_not_set ? "raw" : "rate";
        display_last_game(null);
    }       
    else if(this_class == "defensive_perspective_rate_vs_raw"){
        defensive_perspective_rate_vs_raw_specs.stat_type = is_not_set ? "raw" : "rate";
        display_last_game(null);
    }
    if(this_class == "offensive_calculation_radio"){
        calc_specs.offense.calculation = is_not_set ? "adjusted" : "raw";
        display_primary_unit("offense", null);
        logger_str = [misc.target_template, misc.nhca, 'offensive_ranks_calculation', calc_specs.offense.calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "defensive_calculation_radio"){
        calc_specs.defense.calculation = is_not_set ? "adjusted" : "raw";
        display_primary_unit("defense", null);
        logger_str = [misc.target_template, misc.nhca, 'defensive_ranks_calculation', calc_specs.defense.calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "faceoffs_calculation_radio"){
        calc_specs.faceoffs.calculation = is_not_set ? "adjusted" : "raw";
        display_faceoffs("faceoffs", null);
        logger_str = [misc.target_template, misc.nhca, 'faceoffs_ranks_calculation', calc_specs.faceoffs.calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "goalkeepers_calculation_radio"){
        calc_specs.goalkeepers.calculation = is_not_set ? "adjusted" : "raw";
        display_goalkeepers("goalkeepers", null);
        logger_str = [misc.target_template, misc.nhca, 'goalkeepers_ranks_calculation', calc_specs.goalkeepers.calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    
    if(this_class == "stats_page_calculation_radio"){
        calc_specs.calculation = is_not_set ? "adjusted" : "raw";
        redraw(null);
    }
    
    if(this_class == "offensive_peers_radio"){
        calc_specs.offense.peers = is_not_set ? "conference" : "league";
        display_primary_unit("offense", null);
        logger_str = [misc.target_template, misc.nhca, 'offensive_ranks_peers', calc_specs.offense.peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "defensive_peers_radio"){
        calc_specs.defense.peers = is_not_set ? "conference" : "league";
        display_primary_unit("defense", null);
        logger_str = [misc.target_template, misc.nhca, 'defensive_ranks_peers', calc_specs.defense.peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "faceoffs_peers_radio"){
        calc_specs.faceoffs.peers = is_not_set ? "conference" : "league";
        display_faceoffs("faceoffs", null);
        logger_str = [misc.target_template, misc.nhca, 'faceoffs_ranks_peers', calc_specs.faceoffs.peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "goalkeepers_peers_radio"){
        calc_specs.goalkeepers.peers = is_not_set ? "conference" : "league";
        display_goalkeepers("goalkeepers", null);
        logger_str = [misc.target_template, misc.nhca, 'goalkeepers_ranks_peers', calc_specs.goalkeepers.peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "ranks_or_rate_toggle"){
        ranks_or_rate = is_not_set ? "ranks" : "rate";
        
        display_stats(selected_unit);
    }
} 
            
function toggler_basic(what=null){
    
	var is_disabled = 0;
    if(what == null){ // If the thing that was clicked is a d3 toggle object
        this_class = d3.select(this).attr("class").split(" ").filter(r => ['set', 'toggle-ball'].indexOf(r) == -1);  
		is_disabled = [1, '1'].indexOf(d3.select(this).attr("is_disabled")) > -1 ? 1 : 0;
    }
    else{ // If the thing that was clicked is a basic old HTML input
        this_class = what.classList.value.split(" ");
    }
    
    // If we got a class list we weren't expecting, report it and exit
    if(this_class == []){ report_js_visualization_issue(misc.target_template + "|" + 'toggler' + "|" + misc.nhca); return; }
    this_class = this_class[0];
    
    console.log("this_class (basic): " + this_class);
    

    // Select the toggles and input.radios that need to be processed
    balls = d3.selectAll(".toggle-ball." + this_class);
    backgrounds = d3.selectAll(".toggle-background." + this_class);
    radios = $("input." + this_class);

    
    // Toggle & move the toggle balls and identify whether the initial option is selected or not
	console.log("is_disabled: " + is_disabled);
	if(is_disabled){ // Some toggles are disabled (perhaps they are tease to make people aware of premium content); they should be available to click, but a click should not actually change which part of the toggle is displayed.
		is_not_set = null
	}
	else{
		is_not_set = null
		balls.each(function(d, i){ 
			obj = d3.select(this); 
			direction = parseInt(obj.attr("nonce")) ? -1 : 1;
			obj.attr("nonce", parseInt(obj.attr("nonce")) ? 0 : 1);
			console.log(i, parseInt(obj.attr("nonce")));
			if(i == 0){ is_not_set = parseInt(obj.attr("nonce")); }
			
			cur_class = obj.attr("class");
			if(cur_class.indexOf(" set") == -1){ obj.attr("class", cur_class + " set"); }
			else{ obj.attr("class", cur_class.replace(" set", "")); }
			obj.attr("cx", parseFloat(obj.attr("cx")) + direction* (parseFloat(obj.attr("r"))*2 + 2) );
		
		});
		
		// Switch the relevant backgrounds to whatever state they need to be moved to
		backgrounds.each(function(d){ 
			obj = d3.select(this);
			cur_class = obj.attr("class");
			if(cur_class.indexOf(" set" ) == -1){ obj.attr("class", cur_class + " set"); }
			else{ obj.attr("class", cur_class.replace(" set", "")); }
		});
		
		// Unless the radio input has the same name as the one clicked, switch its state
		radios.each(function(d, i){ if(what == null || what.name != $(this).prop("name")){ cur = $(this).prop("checked"); $(this).prop("checked", !cur); } });
	}
    
    //console.log(this_class);
    // Do whatever actual JS code is suggested by the object clicked
    if(this_class == "lines_roster_stat_type_adv_vs_trad"){
        lines_roster_specs.show_advanced = is_not_set ? 0 : 1;
        display_line_groupings("team_lines");
    }
    if(this_class == "roster_stat_type_adv_vs_trad"){
		console.log("is_not_set: " + is_not_set);
        roster_specs.show_advanced = is_not_set ? 0 : 1;
        display_roster("roster");
    }
    if(this_class == "trends_period_toggle"){
        //console.log("Is set: " + !is_not_set);
        trends_period = is_not_set ? "by_year" : "by_game";
        display_stats(null);
    }
    if(this_class == "ranks_or_rate_toggle"){
        ranks_or_rate = is_not_set ? "rank" : "rate";
        display_stats(null);
    }
    if(this_class == "calculation_radio"){
        calc_specs[selected_unit].calculation = is_not_set ? "adjusted" : "raw";
        display_stats(null);
        setting = null;
        if(selected_unit == "offense"){ setting = 'offensive_ranks_calculation'; }
        else if(selected_unit == "defense"){ setting = 'defensive_ranks_calculation'; }
        else if(selected_unit == "faceoffs"){ setting = 'faceoffs_ranks_calculation'; }
        else if(selected_unit == "goalkeepers"){ setting = 'goalkeepers_ranks_calculation'; }
        else if(selected_unit == "possession_margin" || selected_unit == "modified_possession_margin"){ setting = 'possession_margin_ranks_calculation'; }
        logger_str = [misc.target_template, misc.nhca, setting, calc_specs[selected_unit].calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    if(this_class == "stats_page_calculation_radio"){
        calc_specs.calculation = is_not_set ? "adjusted" : "raw";
        redraw(null);
    }
    if(this_class == "stats_page_calculation_radio_noauth"){
        //calc_specs.calculation = is_not_set ? "adjusted" : "raw";
        //redraw(null);
		
		if(user_events_logged.indexOf('stats_page_calculation_radio_noauth') == -1){
			user_events_logged.push("stats_page_calculation_radio_noauth");
			var tmp_str = "teamID=" + misc.data.ID + ".ttag=" + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? misc.tracking_tag : "NA");
			if('req_epoch_id' in misc && misc.req_epoch_id != null){
				tmp_str += ".rei=" + misc.req_epoch_id;
			}
			
			report_js_log_entry(misc.target_template + "|__noAuth__stats_page_calculation_radio_noauth|" + misc.nhca, tmp_str);
		}
		if(document.getElementById(active_panel + "_noauth_msg_div") != null){
			if(document.getElementById(active_panel + "_noauth_msg_div").className.indexOf("hidden") == -1){
				$("#" + active_panel + "_noauth_msg_div").addClass("hidden");
			}
			else{
				$("#" + active_panel + "_noauth_msg_div").removeClass("hidden");
			}
		}
    }
    
    if(this_class == "stat_type_adv_vs_trad"){
        stat_type_adv_vs_trad_specs[stat_context].stat_type = is_not_set ? "trad" : "adv";
        if(stat_context == "year_by_year"){ display_career(null); }
    }
    
    if(this_class == "full_schedule_type_adj_vs_raw"){ // For logged-in users
        full_schedule_type_adj_vs_raw_specs.stat_type = is_not_set ? "raw" : "adj";
        console.log("now " + full_schedule_type_adj_vs_raw_specs.stat_type)
        display_games("completed_games_list");
    }
	
    if(this_class == "full_schedule_type_adj_vs_raw_noauth"){ // For non-logged in users
        //full_schedule_type_adj_vs_raw_specs.stat_type = is_not_set ? "adj" : "raw";
        //console.log("now " + full_schedule_type_adj_vs_raw_specs.stat_type)
        //display_games("completed_games_list");
		if(user_events_logged.indexOf('full_schedule_type_adj_vs_raw_noauth') == -1){
			user_events_logged.push("full_schedule_type_adj_vs_raw_noauth");
			var tmp_str = "teamID=" + misc.data.ID + ".ttag=" + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? misc.tracking_tag : "NA");
			if('req_epoch_id' in misc && misc.req_epoch_id != null){
				tmp_str += ".rei=" + misc.req_epoch_id;
			}
			
			report_js_log_entry(misc.target_template + "|__noAuth__full_schedule_type_adj_vs_raw_noauth|" + misc.nhca, tmp_str);
		}
		//$("#completed_games_list_noauth_msg_div").removeClass("hidden");
		
		
		if(document.getElementById("completed_games_list_noauth_msg_div") != null){
			if(document.getElementById("completed_games_list_noauth_msg_div").className.indexOf("hidden") == -1){
				$("#completed_games_list_noauth_msg_div").addClass("hidden");
			}
			else{
				$("#completed_games_list_noauth_msg_div").removeClass("hidden");
			}
		}
    }
    if(this_class == "peers_radio"){
        calc_specs[selected_unit].peers = is_not_set ? "conference" : "league";
        display_stats(null);
        setting = null;
        if(selected_unit == "offense"){ setting = 'offensive_ranks_peers'; }
        else if(selected_unit == "defense"){ setting = 'defensive_ranks_peers'; }
        else if(selected_unit == "faceoffs"){ setting = 'faceoffs_ranks_peers'; }
        else if(selected_unit == "goalkeepers"){ setting = 'goalkeepers_ranks_peers'; }
        logger_str = [misc.target_template, misc.nhca, setting, calc_specs[selected_unit].peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }
    
} 
            
function toggle_pricing(what=null){
    /***
    Some of the pricing pages give users the ability to toggle (via my d3 toggle object) between monthly and annual pricing. This function is called when the user activates that toggle. The specs will be set to whatever the opposite value was and the pricing display function will be re-run. Most of the code in this function is to re-style the toggle element to reflect the change.
    ***/
    var this_id = null;
    if(what == null){ // If the thing that was clicked is a d3 toggle object
        this_class = d3.select(this).attr("class").split(" ").filter(r => ['set', 'toggle-ball'].indexOf(r) == -1);       
        this_id = d3.select(this).attr("id");
        if(this_id != null && this_id.indexOf('-label-') > -1){ this_id = this_id.split("-label-")[0]; }
        
    }
    else{ // If the thing that was clicked is a basic old HTML input
        this_class = what.classList.value.split(" ");
    }
    
    // If we got a class list we weren't expecting, report it and exit
    if(this_class == []){ report_js_visualization_issue(misc.target_template + "|" + 'toggle_pricing' + "|" + misc.nhca); return; }
    this_class = this_class[0];
    
    //console.log("this_class: " + this_class);
    

    // Select the toggles and input.radios that need to be processed
    balls = d3.selectAll(".inside-toggle-ball." + this_class);
    backgrounds = d3.selectAll(".inside-toggle-background." + this_class);
    text_labels = d3.selectAll(".inside-toggle-text." + this_class);

    
    // Toggle & move the toggle balls and identify whether the initial option is selected or not
    is_not_set = null;
    balls.each(function(d, i){ 
        obj = d3.select(this); 
		
        direction = parseInt(obj.attr("nonce")) ? -1 : 1;
        obj.attr("nonce", parseInt(obj.attr("nonce")) ? 0 : 1);
        
        if(i == 0 && this_id == null){ 
            is_not_set = parseInt(obj.attr("nonce")); 
        }
        else if(this_id != null && obj.attr('id') == this_id){
            //console.log("matched on ids");
            is_not_set = parseInt(obj.attr("nonce")); 
        }
        
        cur_class = obj.attr("class");
		//console.log("cur class: " + cur_class);
        if(cur_class.indexOf(" set") == -1){ 
			
            obj.attr("class", cur_class + " set"); 
            obj.attr('x', parseFloat(obj.attr('x')) + parseFloat(obj.attr('width')));
        }
        else{ 
            obj.attr("class", cur_class.replace(" set", "")); 
            obj.attr('x', parseFloat(obj.attr('x')) - parseFloat(obj.attr('width')));
        }
        obj.attr("cx", parseFloat(obj.attr("cx")) + direction* (parseFloat(obj.attr("r"))*2 + 2) );
		
		// Remove set or add set from the rect background
		if(this_id != null){
			//console.log("rect id: " + obj.attr('id') + "-inside-toggle-background");
			rect = d3.select("#" + obj.attr('id') + "-inside-toggle-background");
			cur_class = rect.attr("class");
			//console.log("rect class: " + cur_class);
			if(cur_class.indexOf(" set") == -1){ 
			
				rect.attr("class", cur_class + " set"); 
			}
			else{ 
				rect.attr("class", cur_class.replace(" set", "")); 
			}
		}
    
    });
    
    // Switch the relevant text to whatever state they need to be moved to
    text_labels.each(function(d){ 
        obj = d3.select(this);
        cur_class = obj.attr("class");
        if(cur_class.indexOf(" set" ) == -1){ obj.attr("class", cur_class + " set"); }
        else{ obj.attr("class", cur_class.replace(" set", "")); }
    });
    
    // Do whatever actual JS code is suggested by the object clicked
    console.log("[toggle_pricing] This class: " + this_class);
    if(this_class == "pricing-type"){
        pricing_type_to_show = is_not_set ? "monthly_price" : "price";
        document.getElementById("pricing_type_to_show").value = pricing_type_to_show;
        redraw(null);
        setting = null;
        logger_str = [misc.target_template, misc.nhca, setting, pricing_type_to_show].join("|");
        document.getElementById('pixel').src = "/logger-switch_pricing?c=" + logger_str;
    } 
	if(this_class .indexOf( "auto_scout_section_toggle_div" ) == 0){
		toggle_seq = parseInt(this_class.split("-")[1])
		doc_section = misc.auto_scout_data.settings.teamCustomization.doc_sections.find(r=> r.seq == toggle_seq);
		console.log("seq: " + toggle_seq);
        console.log(doc_section)
		doc_section.active = doc_section.active ? 0 : 1; 
		document.getElementById("auto_scout_section_span_div" + toggle_seq).classList.toggle("light");
		/*pricing_type_to_show = is_not_set ? "monthly_price" : "price";
        document.getElementById("pricing_type_to_show").value = pricing_type_to_show;
        redraw(null);
        setting = null;
        logger_str = [misc.target_template, misc.nhca, setting, pricing_type_to_show].join("|");
        document.getElementById('pixel').src = "/logger-switch_pricing?c=" + logger_str;*/
		async_run(null, misc.auto_scout_data.settings.team_ID, {'handler': "team_my_schedule", "action": "toggle_autoScout_doc_section_active", "league": id_auto_scout_league(), "key":toggle_seq, "year": misc.auto_scout_data.settings.reference_year})
    } 
	if(this_class == "team_home_current_state_toggle_div"){
		peers_comparison_period = is_not_set ? "LTM" : "CY";
        console.log("updated peers_comparison_period: " + peers_comparison_period);
		if(document.getElementById('current_state_data_div') != null){
			$("#current_state_data_div").empty();
			$("#current_state_data_div").append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
		}
		else if(document.getElementById('statistical_comparison_div') != null){
			$("#statistical_comparison_div").empty();
			$("#statistical_comparison_div").append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
		}
		
        async_run(null, misc.data.ID, "handler-team_home|action-edit_team_home_current_state_toggle_div|team_ID-" + misc.comp + "|field-status|val-" + peers_comparison_period + "|key-" + misc.data.league);
	}
	
	if(this_class.indexOf("eg_preferences") == 0){
		// Update the leagues that ahve been chosen by the user to be highlighted in their newsletter editions
		league_tag = this_class.replace("eg_preferences_", "");
		league = "NCAA " + league_tag.substr(0, 2).toUpperCase() + (league_tag[2] == "m" ? " Men" : " Women");

        //console.log("league_tag: " + league_tag, league, "is_not_set: " + is_not_set);
		if(!is_not_set){ // It needs to be added
			misc.chosen_leagues.push(league);
		}
		else{ // It needs to be removed
			misc.chosen_leagues = misc.chosen_leagues.filter(r=> r != league);
		}
		//console.log("fda.mosc.chosen_leagues"); console.log(misc.chosen_leagues);
		
		selected_leagues = []
		if(misc.chosen_leagues.indexOf("NCAA D1 Men") > -1){ selected_leagues.push("d1m"); }
		if(misc.chosen_leagues.indexOf("NCAA D2 Men") > -1){ selected_leagues.push("d2m"); }
		if(misc.chosen_leagues.indexOf("NCAA D3 Men") > -1){ selected_leagues.push("d3m"); }
		if(misc.chosen_leagues.indexOf("NCAA D1 Women") > -1){ selected_leagues.push("d1w"); }
		if(misc.chosen_leagues.indexOf("NCAA D2 Women") > -1){ selected_leagues.push("d2w"); }
		if(misc.chosen_leagues.indexOf("NCAA D3 Women") > -1){ selected_leagues.push("d3w"); }
		
		selected_leagues = selected_leagues.join("~")
	
        async_run(null, null, "handler-" + misc.handler.replace("?c=", "") + "|action-expected_goals_identify_favorite_leagues|val-" + selected_leagues + "|key-" + misc.nhca);
	}
	if(this_class == "admin-gpt-html-or-text"){
		show_text_version = is_not_set ? 1 : 0;
        console.log("show_text_version: " + show_text_version);
		if(show_text_version){
			$("#new_exgoals_content_html").addClass("hidden");
			$("#new_exgoals_content_textarea").removeClass("hidden");
		}
		else{
			$("#new_exgoals_content_html").removeClass("hidden");
			$("#new_exgoals_content_textarea").addClass("hidden");
		}		
	}
	if(this_class == "shot_quality_vs_shooting_percentage_toggle"){
		orig_shot_charting_specs.summary_stat = orig_shot_charting_specs.summary_stat == "shooting_pct" ? "shot_quality" : "shooting_pct";
        console.log("orig_shot_charting_specs.summary_stat: " + orig_shot_charting_specs.summary_stat);
		shot_charting_feature_draw_summary_report_table();
	}
	if(this_class == "team_vs_team_statistical_comparison_toggle_div"){
		peers_comparison_period = is_not_set ? "LTM" : "CY";
        console.log("updated peers_comparison_period: " + peers_comparison_period);
        
		if(document.getElementById('current_state_data_div') != null){
			$("#current_state_data_div").empty();
			$("#current_state_data_div").append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
		}
		else if(document.getElementById('statistical_comparison_div') != null){
			$("#statistical_comparison_div").empty();
			$("#statistical_comparison_div").append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
		}
		
		async_run(null, misc.data.ID, "handler-team_my_schedule|action-get_team_statistical_benchmark_data|field-" + misc.data.league + "|key-" + misc.benchmark_team_ID1 + "-" + misc.benchmark_team_ID2 + "|val-" + peers_comparison_period + "~editSettings");
	}
    if(['team_sim_results_controls'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        controls.teams_table_vs_tweet = controls.teams_table_vs_tweet == "table" ? "tweet" : "table";
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        redraw();
    }  
    if(['team_schedule_film_guide_toggle_offense', 'team_schedule_film_guide_toggle_defense'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
		var tmp_unit_tag = this_id.indexOf("offense") > -1 ? "offense" : "defense";
        console.log("tmp_unit: " + tmp_unit_tag);
		film_guide_view[tmp_unit_tag] = film_guide_view[tmp_unit_tag] == "bad" ? "good" : "bad";
		console.log("film_guide_view[" + tmp_unit_tag + "]: " + film_guide_view[tmp_unit_tag]);

		console.log("display_next_game_primary(\"next_game_" + tmp_unit_tag + "\");");
		display_next_game_primary("next_game_" + tmp_unit_tag);
    }  
    if(['team_detail_film_guide_toggle_offense', 'team_detail_film_guide_toggle_defense'].indexOf(this_class) > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
		var tmp_unit_tag = this_id.indexOf("offense") > -1 ? "offense" : "defense";
        //console.log("tmp_unit: " + tmp_unit_tag);
		film_guide_view[tmp_unit_tag] = film_guide_view[tmp_unit_tag] == "bad" ? "good" : "bad";
		//console.log("film_guide_view[" + tmp_unit_tag + "]: " + film_guide_view[tmp_unit_tag]);

		//console.log("display_primary_unit(\"" + tmp_unit_tag + "\");");
		display_primary_unit(tmp_unit_tag, null);
    }  
    if(['newsletter_conversion_funnel_by_day_or_month_toggle'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
		//var tmp_unit_tag = this_id.indexOf("offense") > -1 ? "offense" : "defense";
        //console.log("tmp_unit: " + tmp_unit_tag);
		funnel_summary_conversion_month_or_day = funnel_summary_conversion_month_or_day == "total" ? "by_day" : "total";
		console.log("funnel_summary_conversion_month_or_day: " + funnel_summary_conversion_month_or_day);

		//console.log("display_primary_unit(\"" + tmp_unit_tag + "\");");
		display_funnel(null);
    }  
	
    if(['retention_cohort_summary_toggle'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
		//var tmp_unit_tag = this_id.indexOf("offense") > -1 ? "offense" : "defense";
        //console.log("tmp_unit: " + tmp_unit_tag);
		cohort_summary_period = cohort_summary_period == "monthly" ? "annual" : "monthly";

		//console.log("display_primary_unit(\"" + tmp_unit_tag + "\");");
		display_retention(null);
    }  
    if(['engagement_by_leagues_followed_toggle'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
		//var tmp_unit_tag = this_id.indexOf("offense") > -1 ? "offense" : "defense";
        //console.log("tmp_unit: " + tmp_unit_tag);
		engagement_by_leagues_followed_unique_or_grouped = engagement_by_leagues_followed_unique_or_grouped == "grouped" ? "unique" : "grouped";
		console.log("engagement_by_leagues_followed_unique_or_grouped: " + engagement_by_leagues_followed_unique_or_grouped);

		//console.log("display_primary_unit(\"" + tmp_unit_tag + "\");");
		display_engagement(null);
    }  
    if(['conf_sim_results_controls'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        controls.conf_table_vs_tweet = controls.conf_table_vs_tweet == "table" ? "tweet" : "table";
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        redraw();
    } 
    if(this_class.indexOf('template_default_toggle') > -1){
        //console.log("this_id: " + this_id);
        
        
        var template_seq = parseInt(this_id.replace("template_default_toggle_div", ""))
        var tmp_template = misc.templates.filter(r=> r.seq == template_seq)[0];
        var user = null;
        if(current_panel == "individual"){
            console.log("selected_uID: " + selected_uID);
            user = misc.users.filter(r=> r.ID == selected_uID)[0];
        }
        else{
            console.log("selected_gID: " + selected_gID);
            user = misc.available_groups.filter(r=> r.group_ID == selected_gID)[0];
        }
        console.log("loi.current_panel"); console.log(current_panel);
        console.log("loi.tmp_template"); console.log(tmp_template);
        console.log("loi.user"); console.log(user);
        var n = user.template_settings.filter(r=> r.target_template == tmp_template.fname).length;
        
        //console.log("is_not_set: " + is_not_set + "; n=" + n);
        
        if(!is_not_set){
            if(n == 0){
                if(current_panel == "individual"){
                    user.template_settings.push({'ID': null, 'user_ID': selected_uID, 'target_template': tmp_template.fname, 'val': null})
                }
                else{
                    user.template_settings.push({'ID': null, 'group_ID': selected_gID, 'target_template': tmp_template.fname, 'val': null})
                }
            }
        }
        else{
            if(n > 0){
                tmp_rec = user.template_settings.filter(r=> r.target_template == tmp_template.fname)[0];
                tmp_rec.val = null;
            }
        }
        //console.log("loi.user.template_settings"); console.log(user.template_settings);
        
        //controls.conf_table_vs_tweet = controls.conf_table_vs_tweet == "table" ? "tweet" : "table";
        //d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        //redraw();
        if(current_panel == "individual"){
            draw_edit_user_tools("edit_user_div", selected_uID);
        }
        else{
            draw_edit_user_tools("edit_group_div", selected_gID);
        }
    } 
    if(this_class.indexOf('endpoint_access_active_toggle') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_id.replace("active_toggle_div", ""))
        var tmp_token_ID = parseInt(this_class.replace("endpoint_access_active_toggle-", ""))
        //console.log("token ID: " + tmp_token_ID);
        //console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.has_access = is_not_set ? 0 : 1;
        endpoint.status = endpoint.has_access ? "active" : "inactive";
        
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "active_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token_endpoint_access|field-status|val-" + endpoint.status + "|key-" + tmp_token_ID);
           
    } 
    if(this_class.indexOf('token_force_db_toggle_div') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_token_ID = parseInt(this_class.replace("token_force_db_toggle_div-", ""))
        console.log("token ID: " + tmp_token_ID);
        
        misc.api_token.force_db = is_not_set ? 0 : 1;
        
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "token_force_db_toggle_div", "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token|val-" + misc.api_token.force_db  + "|field-force_db|key-" + tmp_token_ID);
           
    } 
    if(this_class.indexOf('token_status_toggle_div') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_token_ID = parseInt(this_class.replace("token_status_toggle_div-", ""))
        console.log("token ID: " + tmp_token_ID);
        
        misc.api_token.status = is_not_set ? "inactive" : "active";
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "token_status_toggle_div", "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token|val-" + misc.api_token.status  + "|field-status|key-" + tmp_token_ID);
           
    } 
    if(this_class.indexOf('endpoint_token_force_db_toggle') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_id.replace("force_db_toggle_div", ""))
        var tmp_token_ID = parseInt(this_class.replace("endpoint_token_force_db_toggle-", ""))
        //console.log("token ID: " + tmp_token_ID);
        //console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.force_db = is_not_set ? 0 : 1;
        
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "force_db_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token_endpoint_force_db|val-" + endpoint.force_db + "|key-" + tmp_token_ID);
           
    } 
    if(this_class.indexOf('endpoint_update_toggle') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_class.replace("endpoint_update_toggle-", ""))
        //console.log("token ID: " + tmp_token_ID);
        console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.update = is_not_set ? 0 : 1;
        
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_endpoints();
        
        async_run(endpoint, "update_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_endpoint|field-update|val-" + endpoint.update + "|key-" + tmp_endpoint_ID);
           
    }  
    if(this_class.indexOf('endpoint_alltokens_force_db_toggle') > -1){
        //console.log("this_id: " + this_id);
        //console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_class.replace("endpoint_alltokens_force_db_toggle-", ""))
        //console.log("token ID: " + tmp_token_ID);
        console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.force_db = is_not_set ? 0 : 1;
        
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_endpoints();
        
        async_run(endpoint, "update_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_endpoint|field-force_db|val-" + endpoint.force_db + "|key-" + tmp_endpoint_ID);
           
    }  
    if(this_class.indexOf('endpoint_access_tier_toggle') > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_id.replace("tier_toggle_div", ""))
        var tmp_token_ID = parseInt(this_class.replace("endpoint_access_tier_toggle-", ""))
        console.log("token ID: " + tmp_token_ID);
        console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.access_tier = is_not_set ? 0 : 1;
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "tier_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token_endpoint_tier|val-" + endpoint.access_tier + "|key-" + tmp_token_ID);
           
    }   
    if(this_class.indexOf('endpoint_access_divisions_toggle') > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        var tmp_endpoint_ID = parseInt(this_id.replace("divisions_toggle_div", ""))
        var tmp_token_ID = parseInt(this_class.replace("endpoint_access_divisions_toggle-", ""))
        console.log("token ID: " + tmp_token_ID);
        console.log("endpoint ID: " + tmp_endpoint_ID);
        var endpoint = misc.api_endpoints.filter(r=> r.ID==tmp_endpoint_ID)[0];
        endpoint.all_divs = is_not_set ? 0 : 1;
        
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        display_access();
        
        async_run(endpoint, "tier_toggle_div" + tmp_endpoint_ID, "handler-" + misc.handler.replace("?c=", "") + "|action-edit_api_token_endpoint_divisions|val-" + endpoint.all_divs + "|key-" + tmp_token_ID);
           
    }  
    if(['skip_cockpit_toggle_div', 'debug_live_processing_cockpit_toggle_div'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        var action_str = this_id.split("_cockpit_toggle_div")[0];
        var game_ID = this_id.split("_cockpit_toggle_div")[1];
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        set_action(parseInt(game_ID), action_str, is_not_set ? 0 : 1)
    } 
    if(['ignore_duplicate_plays_error_toggle_div'].indexOf(this_class) > -1){
        console.log("this_id: " + this_id);
        console.log("is_not_set: " + is_not_set);
        var tmp_id = parseInt(this_id.replace(this_class, ""));
        console.log("game_ID: " + tmp_id);
        d3.select(this).attr("nonce", is_not_set ? 0 : 1);
        
        set_ignore_duplicate_plays_error(tmp_id);
    }  
    if(this_class.indexOf("player-watch-list-control-percentiles-vs-raw-div") > -1){
        console.log("is_not_set: " + is_not_set);
        misc.player_watch_list_percentiles_versus_raw = misc.player_watch_list_percentiles_versus_raw == "percentiles" ? "raw" : "percentiles"
        display_player_watch_list();
    }
    if(this_class.indexOf("win-totals-over-under-toggle") > -1){
        console.log("is_not_set: " + is_not_set);
        var team_ID = parseInt(this_class.replace("win-totals-over-under-toggle-",""));
        make_pick(team_ID, is_not_set);
    }
    if(this_class.indexOf("player-recap-games-list") > -1){
        console.log("player-recap-games-list is_not_set: " + is_not_set);
        var player_game_ID = parseInt(this_class.replace("player-recap-games-list-",""));
        game_list_toggle[player_game_ID] = is_not_set ? "player" : "team";
        redraw();
    }
    if(this_class.indexOf("player-recap-seasons-list") > -1){
        console.log("player-recap-seasons-list is_not_set: " + is_not_set);
        var player_game_ID = parseInt(this_class.replace("player-recap-seasons-list-",""));
        season_list_toggle[player_game_ID] = is_not_set ? "player" : "team";
        redraw();
    }
    if(this_class == "request-email-toggle"){
        request_email_specs.tier_to_show = is_not_set ? 0 : 1;
        redraw_draw_request_email_div();
    } 
} 
           
function display_returning_production_table(id, tmp_season_data){
	/***
	This function takes in a team's returning production data and displays a report above the team's roster page until they've playd their first game.
	***/
	stats = [];
	stats.push({'desc': 'Play Share', 'tag': 'returning_share_of_team_play_shares', 'help_tag': 'all_statistics|team_play_shares'})
	stats.push({'desc': 'Total Production (EGA)', 'tag': 'returning_share_of_EGA', 'help_tag': 'all_statistics|EGA'})
	stats.push({'desc': 'Goals', 'tag': 'returning_share_of_goals'})
	stats.push({'desc': 'Assists', 'tag': 'returning_share_of_assists'})
	stats.push({'desc': 'Offensive EGA', 'tag': 'returning_share_of_offensive_EGA', 'help_tag': 'stats|player_offensive_EGA'})
	stats.push({'desc': 'Defensive Games Played', 'tag': 'returning_share_of_defensive_games_appeared_in', 'help_tag': 'stats|returning_share_of_defensive_games_appeared_in'})
	if(misc.data.league.indexOf("Women") == -1){
		stats.push({'desc': 'Faceoff Production', 'tag': 'returning_share_of_faceoff_EGA', 'help_tag': 'stats|player_faceoff_EGA'})
	}
	else{
		stats.push({'desc': 'Draw Production', 'tag': 'returning_share_of_faceoff_EGA'})
	}
	stats.push({'desc': 'Points', 'tag': 'returning_share_of_points'})
	
	for(var a = 0;a<stats.length;a++){ stat = stats[a]; 
		stat.share = tmp_season_data[stat.tag];
		if('help_tag' in stat){
			stat.desc += "<img style='margin-left:5px;' class='icon-10 explanation' value='" + stat.help_tag + "' src='static/img/Gray_Info150.png'>";
		}
	}
	
	
	var js_data = {'no_row_count':1, 'fields': [], 'cell_size': 'large-cell-holder'}
	js_data.classes = [{'class': 'col-8 no-padding'}, {'outer_class': 'col-4', 'classes': [{'class': 'centered'}]}];
	js_data.fmt = [{'fmt': ""}, {'fmt': "1%"}];
	js_data.fields = [{'tag': 'desc', 'mob_display': '', 'dtop_display': ''}
	, {'sort_by': 'share', 'tag': 'share', 'mob_display': 'Returning', 'dtop_display': 'Returning Share'}];
	

	js_data.data = stats;
	
	generic_create_table(js_data, {'id': id + "_div", 'target_elem': id + "_div"});
}
                
				
function toggle_radio(this_class, this_id){
    /***
    This function is called when a user toggles a radio selection input. The class is all that is needed to know which toggle is being changed. Then the function checks the relevant calc_specs object to switch the value of the setting (i.e. by checking what it currently is and then switching to the alternative). It then reruns the display function and stores the user preference by sending a pixel message back to the Logger Handler.
    ***/
    
    $('.' + this_class.split(" ")[1]).prop('checked', false);
    $("." + this_class.replace(" ", ".")).prop('checked', true);
    
    if(this_class.split(" ")[1] == "offensive_calculation_radio"){
        
        if(['off_radio1', 'off_radio1mob', 'off_radio1a', 'off_radio1amob'].indexOf(this_id) > -1){ calc_specs[unit].calculation = "raw"; }
        else{ calc_specs[unit].calculation = "adjusted"; }
        display_primary_unit("offense", "offensive_ranks");
        logger_str = ["team_my_stats.html", misc.nhca, 'offensive_ranks_calculation', calc_specs[unit].calculation].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
        
    }
    if(this_class.split(" ")[1] == "offensive_peers_radio"){
        
        if(['off_radio3', 'off_radio3mob', 'off_radio3a', 'off_radio3amob'].indexOf(this_id) > -1){ calc_specs[unit].peers = "league"; }
        else{ calc_specs[unit].peers = "conference"; }
    
        display_primary_unit("offense", "offensive_ranks");
        logger_str = ["team_my_stats.html", misc.nhca, 'offensive_ranks_peers', calc_specs[unit].peers].join("|");
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
    }    
}

function parse_misc(output){
    /***
    In case we eventually need to do something to the misc object that is sent from the server, we'll do it here. But for now, this is just a pass-through
    ***/
    return output;
}

function show_console(){
    /***
    Since we can't see the console logs on mobile devices, this takes the individual messages that were stored in the console_log object and displays them on a panel that is viewable by clicking 'Console' (admins only) in the user menu
    ***/
    
    var time_log_html = "No timelog created."
    if(typeof(console_log) != "undefined" && console_log.length > 0){
        time_log_html = ""
        
        time_log_html += "<div class='flex bbottom'>";
        time_log_html += "<div class='col-9-6'><span class='font-15 bold'>Task</span></div>";
        time_log_html += "<div class='col-3-6 right'><span class='font-15 bold'>Duration</span></div>";
        time_log_html += "</div>";
        
        for(var a = 0;a<console_log.length-1;a++){
            var log = console_log[a];
            time_log_html += "<div class='flex table-row'>";
            time_log_html += "<div class='col-12'><span class='font-15'>" + log.msg + "</span></div>";
            time_log_html += "</div>";
        }
        
    }
    
    
    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content exp-scroll">';
        html += time_log_html;
       
        
        html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>    ';
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#overlay_panel").empty(); $("#overlay_panel").append(html); $("#overlay_panel").addClass("shown");
}


function hide_notification_div(){
    /***
    Most overlay panels (like the player card) have a x-out icon in the upper right hand corner. When clicked, it hides any open divs with the overlay css class.
    ***/
    $("#template_div").addClass("hidden");
}

function hide_overlay(){
    /***
    Most overlay panels (like the player card) have a x-out icon in the upper right hand corner. When clicked, it hides any open divs with the overlay css class.
    ***/
    $(".overlay").removeClass("shown");
	for(var a = 0;a<100;a++){
		if(a % 5 == 0){
			$(".overlay").removeClass("tall-" + a);
		}
	}
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function days_to_date(days, fmt, since=new Date(2015, 0, 1)){
    /***
    Takes in a date (or defaults to Jan 1, 2015) and adds a certain number of days then formats it into something nice. Used ( I believe ) for showing where the user is on the Lifetime LaxElo chart when they are setting a new start date.
    ***/
    var s = null;
    try{
        var dt = since.addDays(days);
        
        var s = null;
        if(fmt == "%b %d %Y"){
            s = dt.toString().substring(4);
            s = s.substring(0, 11);
            s = s.substring(0, 6) + ", " + s.substring(7);
            
        }
        else if(fmt == "%b %Y"){
            s = dt.toString().substring(4);
            s = s.substring(0, 4) + s.substring(7, 11);
            
        }
        else if(fmt == '%b %d \'%y'){
            s = dt.toString().substring(4);
            s = s.substring(0, 11);
            s = s.substring(0, 6) + " '" + s.substring(9);
            
        }
        s = s.replace(" 0", " ");

    }
    catch(err){ console_log.push({'msg': "Error converting days_to_date to string"}); }
    return s;
}

function process_time_log(time_log){
    /***
    Does some basic calculations to convert timestamps in the time log into an actual start/end/duration for each item. This output is used to generate the time log display when the user clicks the 'Load' item in the admin menu.
    ***/
    var total = 0;
    for(var a = 0;a<time_log.length;a++){
        var log = time_log[a];
        if(!('end' in log) && a+1 < time_log.length){
            next_start = time_log[a+1].start;
            log.end = next_start
        }
    }
    for(var a = 0;a<time_log.length;a++){
        var log = time_log[a];
        if(!('duration' in log)){
            log.duration = log.end - log.start;
        }
        total += log.duration;
    }    
    
    for(var a = 0;a<time_log.length;a++){
        var log = time_log[a];
        
        if(log.duration > 5000){ dur = Math.round(log.duration/1000.0*10.0)/10.0 + "s"; }
        else if(log.duration > 1000){ dur = Math.round(log.duration/1000.0*100.0)/100.0 + "s"; }
        else{ dur = log.duration + "ms"; }
        
        log.duration_str = dur;
    }
    
    time_log.push({'tag': "Total", 'duration_str': total/1000.0 + "s"});
    
    
}

function display_player_card(seq){
    /***
    In the roster view, there is a plus sign icon that allows you to do a level deeper on a particular player. When a user clicks that icon, a player card pops up which has a series of stats that are dependent on the position the player plays. The card is just rows of labels with the stat value underneath. The user can click through to the player's actual player page via a pop-out icon at the top. The card is an overlay that hovers above the actual page, so the user isn't actually leaving the roster page.
    ***/
    show_player_links = 1;
    var is_team_user = 0
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
        is_team_user = [3, 6, 9].indexOf(misc.product_i) ? 1 : 0;
    }

    
    
    //console.log("show_player_links: " + show_player_links);
    //console.log("user_obj.preferences.fpi"); console.log(user_obj.preferences.fpi);
	//console.log("roster"); console.log(roster);
    if(!(roster instanceof Array) && 'keys' in roster){
		// Create the object that is getting displayed as a dict because it's currently being stored as a list of values and the function below needs a dict.
		p = {}
		var keys_to_switch = ['role', 'EGA_per_game', 'EGA', 'shooting_pct', 'player', 'pro_url_tag', 'share_adjusted_assist_rate', 'excess_goals_scored', 'turnover_rate', 'weighted_team_play_shares', 'share_of_team_assists', 'share_of_team_shots', 'on_goal_shooting_pct', 'faceoff_wins', 'faceoff_losses', 'on_keeper_sog_faced', 'faceoff_win_rate', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'excess_saves_per_sog', 'goals_allowed', 'excess_goals_per_shot', 'goals', 'assists', 'shots', 'turnovers', 'devittes', 'weighted_play_shares_rank_str', 'usage_adjusted_EGA', 'faceoff_EGA_rank_str', 'gbs', 'faceoff_record', 'excess_saves', 'save_pct', 'save_pct_rank_str', 'shots_faced', 'saves', 'goals_allowed', 'player_ID', 'caused_turnover_share', 'caused_turnovers', 'penalties', 'defensive_EGA_rank_str'];
		var loc = roster.keys.indexOf('seq');
		var rk_specs = {'keys': roster.keys}
		for(var a = 0;a<roster.data.length;a++){
			if(get_field(roster.data[a], 'seq', {'loc': loc}) == seq){
				for(var b = 0;b<keys_to_switch.length;b++){
					p[keys_to_switch[b]] = get_field(roster.data[a], keys_to_switch[b], rk_specs)
				}
			}
		}
		
		p = [p];
	}
	else{
		p = roster.filter(r=> r.seq == seq)
	}
    if(p.length == 0){
        // Fail
        //report_js_visualization_issue(misc.target_template + "|display_player teamID=" + misc.data.ID + " seq=" + seq + "|" + misc.nhca);
        player_html = "";
    }
    else{
        p = p[0];
        if(show_player_links == 0 && typeof user_obj != "undefined" && 'preferences' in user_obj && user_obj.preferences != null && 'fpi' in user_obj.preferences && user_obj.preferences.fpi == p.ID){ show_player_links = 1;}
        //console.log("Display player"); console.log(p)
        
        loops = [{'tag': 'rate', 'div_style': 'padding-top:20px; padding-bottom:30px;', 'id': 'player_overlay_rate_stats'}, {'tag': 'cnt', 'div_style': '', 'id': 'player_overlay_cnt_stats'}];
        roles = []
        
        tmp = {'tag': 'offensive', 'desc': 'Offense', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'usage_adjusted_EGA', 'label': 'Usage-Adj EGA', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'EGA', 'label': 'Total EGA', 'jsfmt': "1"})
        tmp.fields.push({'type': 'rate', 'tag': 'weighted_play_shares_rank_str', 'dtop_label': 'Team Play Share Rank', 'mob_label': 'Team Share Rnk', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'shooting_pct', 'label': 'Shooting Pct', 'jsfmt': "1%"})
        tmp.fields.push({'type': 'rate', 'tag': 'share_of_team_shots', 'label': 'Shot Share', 'jsfmt': "1%"})
        tmp.fields.push({'type': 'cnt', 'tag': 'excess_goals_scored', 'label': 'Excess Goals', 'jsfmt': "2"})
        tmp.fields.push({'type': 'cnt', 'tag': 'excess_goals_per_shot', 'label': 'Excess Goals/Shot', 'jsfmt': "2"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        tmp.fields.push({'type': 'rate', 'tag': 'share_of_team_assists', 'label': 'Assist Share', 'jsfmt': "1%"})
        tmp.fields.push({'type': 'rate', 'tag': 'share_adjusted_assist_rate', 'label': 'Assist Rate', 'jsfmt': "2"})
        //tmp.fields.push({'type': 'cnt', 'tag': 'second_assists', 'label': '2nd Assists', 'jsfmt': "0"})
        //tmp.fields.push({'type': 'cnt', 'tag': 'missed_assists', 'label': 'Missed Assists', 'jsfmt': "0"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'shots', 'label': 'Shots Taken', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'turnovers', 'label': 'Turnovers', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'devittes', 'label': 'Devittes', 'jsfmt': "0"})
        
        
        roles.push(tmp);
        
        tmp = {'tag': 'defensive', 'desc': 'Defense', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'defensive_EGA_rank_str', 'label': 'Def EGA Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'penalties', 'label': 'Penalties', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'caused_turnover_share', 'label': 'Share of Team CTs', 'jsfmt': "0%"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'caused_turnovers', 'label': 'Caused Turnovers', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'gbs', 'label': 'Ground balls', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        roles.push(tmp);
        
        tmp = {'tag': 'faceoff', 'desc': 'Faceoff', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'faceoff_EGA_rank_str', 'label': 'FO EGA Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'season_faceoff_ELO_rank_str', 'label': 'FO ELO Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'faceoff_win_rate', 'label': 'Faceoff Win Rate', 'jsfmt': "1%"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'faceoff_record', 'label': 'Faceoff Record', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'gbs', 'label': 'Ground balls', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        roles.push(tmp);
        
        tmp = {'tag': 'goalkeeper', 'desc': 'Goalkeeper', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'excess_saves', 'label': 'Excess Saves', 'jsfmt': "2"})
        //tmp.fields.push({'type': 'rate', 'tag': 'excess_saves_rank_str', 'label': 'Excess Saves Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'save_pct', 'label': 'Save Pct', 'jsfmt': "1%"})
        //tmp.fields.push({'type': 'rate', 'tag': 'save_pct_rank_str', 'label': 'Save Pct Rank', 'jsfmt': "1%"})
        tmp.fields.push({'type': 'cnt', 'tag': 'shots_faced', 'label': 'Shots Faced', 'jsfmt': "0"})
        
		tmp.fields.push({'type': 'cnt', 'tag': 'on_keeper_sog_faced', 'label': 'S.O.G. Faced', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'saves', 'label': 'Saves', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals_allowed', 'label': 'Goals Allowed', 'jsfmt': "0"})
        roles.push(tmp);
        
        role = roles.filter(r=> r.tag == p.role || (r.tag == "offensive" && p.role == null))[0];
        
        loop_after = on_mobile ? 2 : 4;
        player_content = "";
        for(var b = 0;b<loops.length;b++){ loop = loops[b];
            
            player_content += "<div class='no-padding' id='" + loop.id + "' style='" + loop.div_style + "'>";
            
            loop_fields = role.fields.filter(r=> r.type == loop.tag);
            // Add rate/EGA data
            for(var a = 0;a<loop_fields.length;a++){
                f = loop_fields[a];
                if(a % loop_after == 0){
                    player_content += "<div class='player-card-row flex'>";
                }
                val = f.tag in p ? (p[f.tag] == null ? "N/A": p[f.tag]) : "N/A";
                
                player_content += "<div class='no-padding col-3-6'>";
                if('dtop_label' in f){
                    player_content += "<div class='no-padding'><span class='mob light font-15'>" + f.mob_label + "</span><span class='dtop light font-15'>" + f.dtop_label + "</span></div>";
                }
                else{
                    player_content += "<div class='no-padding'><span class='light font-15'>" + f.label + "</span></div>";
                }
                player_content += "<div class='no-padding'><span class='bold font-24'>" + jsformat(val, f.jsfmt) + "</span></div>";
                player_content += "</div>";
                
                if(a % loop_after == (loop_after-1) || a == role.fields.length-1){
                    player_content += "</div>";
                }
            }
            
            // Wrap-up
            player_content += "</div>";
        }    
            

        
        if(misc.target_template.indexOf("basic") == 0){
            player_link = "/basic_player_detail";
        }
        else if(misc.target_template.indexOf("team") == 0){
            player_link = "/team_player_detail";
        }
        player_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>" + p.player + "</span>";
        if(show_player_links){
            player_html += "<FORM id='player_detail_form" + p.player_ID + "' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "' /><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "' /><img class='font-36 popout-icon' style='padding-left:15px;' onclick=\"document.getElementById('player_detail_form" + p.player_ID + "').submit();\" src=\"static/img/popout25.png\" /></FORM>";
        }
        player_html += "</div>";
        player_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
        player_html += "<div class='col-12 exp-scroll bigger'>" + player_content + "</div>";
        
        
    }
   
    var logger_str = null;

    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += player_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    if('observe' in misc && misc.observe && (!('flagged_as_robot' in misc) || !misc.flagged_as_robot)){ report_user_view(misc.handler + "|player_card|" + misc.nhca); }
    document.getElementById('pixel').src = "/logger-jsEvent?c=" + [24, misc.nhca].join("|");
    
}

function fix_script_tags(s){
    /***
    In order to display content text with HTML tags, we need to do some escaping; this function reverses the escaping at the moment the text is displayed to the screen.
    ***/
    while(s.indexOf("<zscript") > -1){ s = s.replace("<zscript", '<script'); }    
    return s
}

function switch_lr_content_selection(){
    /***
    Some pages have multiple types of LaxRef_Content to choose from. This function responds to a change of the select by pulling up the right content object and updating the textarea.
    ***/
    
    var val = document.getElementById("content_select").value;
    console.log("User picked " + val);
    var content = null;
    if('player_data' in misc){
        content = misc.player_data.content;
    }
    else{
        content = misc.data.laxref_content;
    }
    var tmp = content.filter(r=> r.seq == val);
    if(tmp.length == 0){
        console.log("Error! No matching content record found matching seq=" + val);
    }
    else{
        var obj = tmp[0];
        console.log("content obj"); console.log(obj);
        
        var tmp_content = obj.content == null ? "" : ("" + obj.content);
                    
                    
        while(tmp_content.indexOf("\\n") > -1){ tmp_content = tmp_content.replace("\\n", "\n"); }
        while(tmp_content.indexOf("[zcnewline]") > -1){ tmp_content = tmp_content.replace("[zcnewline]", "\n"); }
        while(tmp_content.indexOf("[No.]") > -1){ tmp_content = tmp_content.replace("[No.]", "#"); }
   
        lr_content_specs.content_ID = document.getElementById('content_select').value
        
        console.log("Set lr_content_specs.content_ID to " + lr_content_specs.content_ID);
        if('object_type' in lr_content_specs && lr_content_specs.object_type == "game"){
            console.log("Reload game detail panel with ID=" + misc.ID);
            display_admin_game_panel(misc.ID);
        }
        //console.log("Set content to...");
        //console.log(fix_script_tags(tmp_content));
        //document.getElementById("content_obj").innerHTML = fix_script_tags(tmp_content);
        
        
    }
}

function display_admin_player_panel(player_ID){
    /***
    Admins have the ability to edit a LaxRef_Players record from the player detail templates. This function displays the edit panel. It is triggered when the admin clicks the edit (pencil) icon.
    ***/
    
    console.log("Edit player with ID=" + player_ID);
    show_player_links = 1;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
    }
    
    //console.log("show_player_links: " + show_player_links);
    //console.log("user_obj.preferences.fpi"); console.log(user_obj.preferences.fpi);
    
    var p = misc.player_data;
    console.log(p);
    var logger_str = null;
    

    var fc = "";
    fc += "<div class='' id='update_form_div'>";
    
        fc += "<div class='light font-11'><span class=''>Player Name</span></div>";
        fc += "<div class='flex'>";
            fc += "<div class='col-8 credentials-box'><input type=text class='text-input' value='" + p.player + "' style='margin-top:0px;' id='player_name_edit_input' onchange='async_run(this, this.id, \"handler-basic_player_detail|player_ID-" + p.ID + "|action-update_player_name|field-player|key-" + p.ID + "\");'></div>";
            fc += "<div class='col-4' id='player_name_edit_input_result'></div>"
        fc += "</div>";
        
        fc += "<div class='no-padding flex'>";
            fc += "<div class='col-6 no-padding'>";
                fc += "<div class='light font-11'><span class=''>Is Individual?</span></div>";

                fc += "<div class='flex'>";
                    fc += "<div class='inline-flex col-10' style='padding: 0px 10px 0px 5px;'>";
                        fc += "<span class='font-12'>Individual</span><div class='' style='padding: 5px 10px 0px 0px;'><input type=radio " + (p.is_individual ? " checked" : "") + "  value=1 name='is_individual' id='individual_radio' onclick='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|player_ID-" + p.ID + "|action-set_is_individual|field-player|key-" + p.ID + "\");' /></div>";
                        fc += "<span class='font-12'>Non-Individual</span><div class='' style='padding: 5px 0px 0px 0px;'><input type=radio " + (!p.is_individual ? " checked" : "") +  " value=0 name='is_individual' id='non_individual_radio' onclick='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|player_ID-" + p.ID + "|action-set_is_individual|field-player|key-" + p.ID + "\");' /></div>";
                    fc += "</div>"
                
                    fc += "<div class='col-1' id='individual_radio_result'></div>"
                    fc += "<div class='col-1' id='non_individual_radio_result'></div>"
                fc += "</div>";
            
            fc += "</div>";
            fc += "<div class='col-6 no-padding'>";
                fc += "<div class='light font-11'><span class=''>Is Unlocked?</span></div>";

                fc += "<div class='flex'>";
                    fc += "<div class='inline-flex col-10' style='padding: 0px 10px 0px 5px;'>";
                        fc += "<span class='font-12'>Unlocked</span><div class='' style='padding: 5px 10px 0px 0px;'><input type=radio " + (p.unlocked ? " checked" : "") + "  value=1 name='unlocked' id='unlocked_radio' onclick='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|player_ID-" + p.ID + "|action-set_unlocked|field-player|key-" + p.ID + "\");' /></div>";
                        fc += "<span class='font-12'>Locked</span><div class='' style='padding: 5px 0px 0px 0px;'><input type=radio " + (!p.unlocked ? " checked" : "") +  " value=0 name='unlocked' id='locked_radio' onclick='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|player_ID-" + p.ID + "|action-set_unlocked|field-player|key-" + p.ID + "\");' /></div>";
                    fc += "</div>"
                
                    fc += "<div class='col-1' id='unlocked_radio_result'></div>"
                    fc += "<div class='col-1' id='locked_radio_result'></div>"
                fc += "</div>";
            fc += "</div>";
        fc += "</div>";
    
        fc += "<div class='light font-11'><span class=''>Player URL</span></div>";

        fc += "<div class='light font-15'><span class=''>https://pro.lacrossereference.com/" + p.pro_url_tag + "?t=</span></div>";

        fc += "<div class='light font-11'><span class=''>Add Alternate Name</span></div>";

        if(typeof original_player_name != "undefined" && original_player_name != null){
            fc += "<div class='light font-15'><span class=''>INSERT INTO LaxRef_Alternate_Player_Names (ID, active, player_ID, alternate_name, actual_name) VALUES ((SELECT IFNULL(max(ID), 0) +1 from LaxRef_Alternate_Player_Names fds), 1, " + p.ID + ", '" + p.player + "', '')</span></div>";
        }

        // If there is are content objects for this player
        if('content' in misc.player_data && misc.player_data.content != null && misc.player_data.content.length > 0){
            
            fc += "<div class='no-padding' id='player_content_div'>";
                fc += "<div class='light font-11'><span class=''>LaxRef Content</span></div>";
                    fc += "<div class='inline-flex' style='padding: 0px 10px;'>";
                    fc += "<select onchange='switch_lr_content_selection();' id='content_select'>";
                        for(var a = 0;a<misc.player_data.content.length;a++){ var opt = misc.player_data.content[a];
                            var tmp_selected_tag = "";
                            if(typeof lr_content_specs != "undefined" && lr_content_specs.content_ID == null && a == 0){ 
                                tmp_selected_tag = "selected"; 
                                lr_content_specs.content_ID = opt.seq;
                            }
                            else if(typeof lr_content_specs != "undefined" && lr_content_specs.content_ID != null && opt.seq == lr_content_specs.content_ID){ 
                                tmp_selected_tag = "selected"; 
                            }
                            fc += "<option " + tmp_selected_tag + " value='" + opt.seq + "'>" + opt.content_type + "</option>";
                        }
                    fc += "</select>";
					if(typeof lr_content_specs == "undefined" || lr_content_specs == null){
						// This is supposed to show a subject's LaxRef_Content records, if they are provided
					}
					else{
						fc += "<span class='async-result-img' id='content_obj" + lr_content_specs.content_ID + "_result_msg'></span>";     
					}                 
                fc += "</div>";
                
                var content_obj = null;
				if(typeof lr_content_specs != "undefined" && lr_content_specs != null){
					tmp = misc.player_data.content.filter(r=> r.seq == lr_content_specs.content_ID);
					if(tmp.length > 0){
						content_obj = tmp[0];
						var tmp_content = content_obj.content == null ? "" : content_obj.content;
						
						
						while(tmp_content.indexOf("\\n") > -1){ tmp_content = tmp_content.replace("\\n", "\n"); }
						while(tmp_content.indexOf("[zcnewline]") > -1){ tmp_content = tmp_content.replace("[zcnewline]", "\n"); }
						while(tmp_content.indexOf("[No.]") > -1){ tmp_content = tmp_content.replace("[No.]", "#"); }
				   
						fc += "<div class='col-12' style='padding: 5px 10px 0px 0px;'><textarea style='font-size:10px;' class='col-12' rows=15 name='content_obj" + content_obj.ID + "' id='content_obj' onchange='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|action-update_player_content|field-content|key-" + content_obj.ID + "\");' >" + fix_script_tags(tmp_content) + "</textarea></div>";
					}
				}
            fc += "</div>";
        }
    var player_html = "";
    
    player_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>" + p.player + " (ID = " + p.ID + ")" + "</span></div>";
    
    player_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    player_html += "<div class='col-12 exp-scroll bigger'>" + fc + "</div>";
    
    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += player_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    if('observe' in misc && misc.observe && (!('flagged_as_robot' in misc) || !misc.flagged_as_robot)){ report_user_view(misc.handler + "|player_card|" + misc.nhca); }

}

function display_admin_team_panel(team_ID){
    /***
    Admins have the ability to edit a LaxRef_Team record from the team detail templates. This function displays the edit panel. It is triggered when the admin clicks the edit (pencil) icon.
    ***/
    
    console.log("Edit team with ID=" + team_ID);
    show_player_links = 1;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
    }
    
    //console.log("show_player_links: " + show_player_links);
    //console.log("user_obj.preferences.fpi"); console.log(user_obj.preferences.fpi);
    
    var team = misc.data;
    //console.log(team);
    var logger_str = null;
    

    var fc = "";
    fc += "<div class='' id='update_form_div'>";


        
        var content_tag = "season-preview";
        var cur_content = "";
    
        tmp = misc.data.laxref_content.filter(r=> r.year == misc.data.year && r.content_type == content_tag);
        if(tmp.length > 0){
            cur_content = tmp[0].content;
            
            
        }
        var extra_data = misc.extra_data.db_teams.filter(r=> r.ID==team.ID);
        team.pro_url_tag = null;
        if(extra_data.length == 1){
            console.log(extra_data[0]);
            team.pro_url_tag = extra_data[0].pro_url_tag;
        }
        
        while(cur_content.indexOf("\\n") > -1){ cur_content = cur_content.replace("\\n", "\n"); }
        while(cur_content.indexOf("[zcnewline]") > -1){ cur_content = cur_content.replace("[zcnewline]", "\n"); }
        while(cur_content.indexOf("[No.]") > -1){ cur_content = cur_content.replace("[No.]", "#"); }
                    
        fc += "<div class='no-padding inline-flex col-12 light font-15'><span class=''>" + (misc.year+1) + " Season Preview</span><span class=''> (# words)</span><div class='no-padding' id='" + content_tag + "_result'></div></div>";
        
        fc += "<div class='no-padding inline-flex col-12 light font-9'>";
            fc += "<div class='tag'><span class='no-padding font-11'>" + "oEff" + "</span></div>";
            fc += "<div class='tag'><span class='no-padding font-11'>" + "dEff" + "</span></div>";
            fc += "<div class='tag'><span class='no-padding font-11'>" + "FO%" + "</span></div>";
            fc += "<div class='tag'><span class='no-padding font-11'>" + "SH%" + "</span></div>";
            fc += "<div class='tag'><span class='no-padding font-11'>" + "TO%" + "</span></div>";
        fc += "</div>";

        fc += "<div class='col-12' style='padding: 5px 10px 0px 0px;'><textarea style='font-size:10px;' class='col-12' rows=15 name='" + content_tag + "' id='content_obj' onchange='async_run(this, this.id, \"handler-basic_team_detail|year-" + (misc.year+1) + "|team_ID-" + team_ID + "|action-update_team_content|field-content|key-" + content_tag + "\");' >" + fix_script_tags(cur_content) + "</textarea></div>";

    
    var team_html = "";
    
    team_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>" + team.display_name + " (ID=" + team.ID + ")</span></div>";
    
    team_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    team_html += "<div class='col-12'><span class='font-15 contents'>https://pro.lacrossereference.com/" + team.pro_url_tag + "?t=</span></div>";
    team_html += "<div class='col-12 exp-scroll bigger'>" + fc + "</div>";
    
    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += team_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    if('observe' in misc && misc.observe && (!('flagged_as_robot' in misc) || !misc.flagged_as_robot)){ report_user_view(misc.handler + "|player_card|" + misc.nhca); }

}

function display_PIL_log_panel(){
    /***
    When a graphic is created, this allows admins to see a panel with the logs from the graphic creation process. Especially useful for situations where we are using PIL to generate the graphic.
    ***/
    
    console.log("View PIL Log...")
    
    

    var fc = "";
    
    fc += "<div class='col-12 font-18 light bbottom' style='padding-top:40px;'><span class=''>Log</span></div>";
    if('PIL_log_msg' in misc && misc.PIL_log_msg != null){
        var tmp_content = misc.PIL_log_msg;
        while(tmp_content.indexOf("\n") > -1){ tmp_content = tmp_content.replace("\n", "<BR>"); }
        console.log("aef.tmp_content");console.log(tmp_content);
        fc += "<div class='col-12 font-10' style='padding-top:10px;'><span class='contents'>" + tmp_content + "</span></div>";
    }
    else{
        fc += "<div class='col-12 font-15' style='padding-top:10px;'><span class='contents'>None found</span></div>";
    }
    
    fc += "<div class='col-12 font-18 light bbottom' style='padding-top:40px;'><span class=''>Errors</span></div>";
    if('PIL_error_msg' in misc && misc.PIL_error_msg != null){
        var tmp_content = misc.PIL_error_msg;
        while(tmp_content.indexOf("\n") > -1){ tmp_content = tmp_content.replace("\n", "<BR>"); }
        fc += "<div class='col-12 font-10' style='padding-top:10px;'><span class='contents'>" + tmp_content + "</span></div>";
    }
    else{
        fc += "<div class='col-12 font-15' style='padding-top:10px;'><span class='contents'>None found</span></div>";
    }
    
    
    var team_html = "";
    
    team_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>Graphic Creation Log</span></div>";
    
    team_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    team_html += "<div class='col-12 exp-scroll bigger'>" + fc + "</div>";
    
    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += team_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    

}

function basic_toggle_team_stats_chart_type(chart_type){
	/***
	This function is triggered when a user switches the stats bar chart for a team from table to bar chart or back. They trigger it by clicking the icons that show up above the chart itself
	***/
	
	bar_or_table_specs.top_stats_chart = chart_type;
	//console.log("Set bar_or_table_specs.top_stats_chart to " + bar_or_table_specs.top_stats_chart);
	
	// Change the icons
	$(".data-type-view-icon").removeClass("selected");
	$("#stats_chart_" + bar_or_table_specs.top_stats_chart + "_icon_div").addClass("selected");
	display_stats("stats");
}

function team_toggle_team_stats_chart_type(chart_type){
	/***
	This function is triggered when a user switches the stats bar chart for a team from table to bar chart or back. They trigger it by clicking the icons that show up above the chart itself
	***/
	
	bar_or_table_specs.top_stats_chart = chart_type;
	//console.log("Set bar_or_table_specs.top_stats_chart to " + bar_or_table_specs.top_stats_chart);
	
	// Change the icons
	$(".data-type-view-icon").removeClass("selected");
	$("#offensive_ranks_stats_chart_" + bar_or_table_specs.top_stats_chart + "_icon_div").addClass("selected");
	$("#defensive_ranks_stats_chart_" + bar_or_table_specs.top_stats_chart + "_icon_div").addClass("selected");
	$("#faceoffs_ranks_stats_chart_" + bar_or_table_specs.top_stats_chart + "_icon_div").addClass("selected");
	$("#goalkeepers_ranks_stats_chart_" + bar_or_table_specs.top_stats_chart + "_icon_div").addClass("selected");
	
	// Re-run the stats display
	if(active_panel == "offense"){ display_primary_unit(active_panel, active_panel); }
	if(active_panel == "defense"){ display_primary_unit(active_panel, active_panel); }
	if(active_panel == "faceoffs"){ display_faceoffs(active_panel, active_panel); }
	if(active_panel == "goalkeepers"){ display_goalkeepers(active_panel, active_panel); }

	
	report_js_log_entry(misc.target_template + "|ChartTypeToggle|" + misc.nhca, chart_type);
}

function team_toggle_player_stats_panel_type(chart_type){
	/***
	This function is triggered when a user switches the stats insight icon to the data icon on a player tendencies report. Or vice versa
	***/
	
	data_or_insights_specs.tendencies = chart_type;
	n_chart_type_toggles += 1;
	//console.log("Set bar_or_table_specs.top_stats_chart to " + bar_or_table_specs.top_stats_chart);
	
	// Change the icons
	$(".data-type-view-icon").removeClass("selected");
	console.log("tendencies_and_splits_stats_" + data_or_insights_specs.tendencies + "_icon_div");
	console.log(document.getElementById("tendencies_and_splits_stats" + data_or_insights_specs.tendencies + "_icon_div") != null);
	$("#tendencies_and_splits_stats_" + data_or_insights_specs.tendencies + "_icon_div").addClass("selected");
	
	// Re-run the stats display
	display_overview(null); 
	
	report_js_log_entry(misc.target_template + "|ChartTypeToggle|" + misc.nhca, chart_type + "__" + n_chart_type_toggles + " toggle(s)");

}


function submit_contact_box_question(){
	/***
	If I've embedded a contact me box inside the site, somewhere other than the actual contact page, this function will submit that qusetion and let the user know that's it's been received.
	***/
	var go_on = 1;
	var elem = document.getElementById("submit_contact_box_question_textarea");
	var subj="Embedded Contact Submission";
	brief_hide_in_seconds("submit_contact_box_button", 1);
	
	$("#submit_contact_box_question_error_msg").addClass("hidden");
	$("#submit_contact_box_question_success_msg").addClass("hidden");
	var button_defined_subj = $("#submit_contact_box_button").attr("subj");
	if(!(typeof button_defined_subj == "undefined" || button_defined_subj == null || button_defined_subj == "")){
		subj = button_defined_subj;
	}
	console.log(button_defined_subj);
	if(elem == null){
		$("submit_contact_box_question_error_msg").removeClass("hidden");
		$("submit_contact_box_question_error_msg").text("<span class='error font-12'>Sorry, something went wrong. You can send your question or comment <a href='/contact'>here</a>.</span>");
		return;
	}
	
	var txt = elem.value.trim();
	if(txt.length == 0){ return; }
	
	
	async_run(null, misc.nhca, {"handler":"contact", "action": "submit_nonTemplate_Contact_Submission", "val": txt, "field": subj});
	
}
	
function display_admin_game_panel(game_ID){
    /***
    Admins have the ability to edit a LaxRef_Players record from the player detail templates. This function displays the edit panel. It is triggered when the admin clicks the edit (pencil) icon.
    ***/
    
    console.log("Edit game with ID=" + game_ID);
    show_player_links = 1;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
    }
    
    //console.log("show_player_links: " + show_player_links);
    //console.log("user_obj.preferences.fpi"); console.log(user_obj.preferences.fpi);
    
    var game = misc.data;
    //console.log("wpog.game"); console.log(game);
    var logger_str = null;
    

    var fc = "";
    fc += "<div class='' id='update_form_div'>";
        console.log(typeof lr_content_specs != "undefined", 'laxref_content' in misc.data, misc.data.laxref_content != null, misc.data.laxref_content.length > 0);
        // If there is are content objects for this game
        if(typeof lr_content_specs != "undefined" && 'laxref_content' in misc.data && misc.data.laxref_content != null && misc.data.laxref_content.length > 0){
            
            fc += "<div class='no-padding' id='gamecontent_div'>";
                fc += "<div class='light font-11'><span class=''>LaxRef Content</span></div>";
                    fc += "<div class='inline-flex' style='padding: 0px 10px;'>";
                    fc += "<select onchange='switch_lr_content_selection();' id='content_select'>";
                        for(var a = 0;a<misc.data.laxref_content.length;a++){ var opt = misc.data.laxref_content[a];
                            var tmp_selected_tag = "";
                            if(lr_content_specs.content_ID == null && a == 0){ 
                                tmp_selected_tag = "selected"; 
                                lr_content_specs.content_ID = opt.seq;
                            }
                            else if(lr_content_specs.content_ID != null && opt.seq == lr_content_specs.content_ID){ 
                                tmp_selected_tag = "selected"; 
                            }
                            fc += "<option " + tmp_selected_tag + " value='" + opt.seq + "'>" + opt.content_type + "</option>";
                        }
                    fc += "</select>";
                    fc += "<span style='padding:0px 30px;' class='async-result-img' id='content_obj_result_msg'></span>";                      
                fc += "</div>";
                
                var content_obj = null;
				fc += "<div class='centered pointer'>";
					fc += "<div class='inline-flex centered' >";
						fc += "<div class='league-toggle navy active' id='league_manual' onclick='toggle_league(\"manual\");'><span class=''>Manual</span></div>";
						//fc += "<div class='league-toggle navy' id='league_gpt' onclick='toggle_league(\"gpt\");'><span class=''>GPT</span></div>";       
					fc += "</div>";
				fc += "</div>";
				
				fc += "<div id='manual_panel' class='league-panel non-dashboard-landing'>";
				
                tmp = misc.data.laxref_content.filter(r=> r.seq == lr_content_specs.content_ID);
                if(tmp.length > 0){
                    content_obj = tmp[0];
                    console.log("cnx.content_obj"); console.log(content_obj);
                    var tmp_content = content_obj.content == null ? "" : content_obj.content;
                    
                    
                    while(tmp_content.indexOf("\\n") > -1){ tmp_content = tmp_content.replace("\\n", "\n"); }
                    while(tmp_content.indexOf("[zcnewline]") > -1){ tmp_content = tmp_content.replace("[zcnewline]", "\n"); }
                    while(tmp_content.indexOf("[No.]") > -1){ tmp_content = tmp_content.replace("[No.]", "#"); }
               
                    fc += "<div class='col-12' style='padding: 5px 10px 0px 0px;'><textarea style='font-size:14px;' class='col-12' rows=15 name='content_obj' id='content_obj' onchange='async_run(this, this.id, \"handler-" + misc.handler.replace("?c=", "") + "|action-update_game_content|game_ID-" + misc.ID + "|field-content|key-" + content_obj.content_type + "\");' >" + fix_script_tags(tmp_content) + "</textarea></div>";
                }
				fc += "</div>";
				//fc += "<div id='gpt_panel' class='hidden league-panel non-dashboard-landing'></div>";
            fc += "</div>";
        }
    var game_html = "";
    
    game_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-24 light contents'>" + "Game ID " + misc.ID + "</span></div>";
    
    game_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    game_html += "<div class='col-12 exp-scroll bigger'>" + fc + "</div>";
    
    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += game_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

	console.log("pwa.fc"); console.log(fc);
    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    if('observe' in misc && misc.observe && (!('flagged_as_robot' in misc) || !misc.flagged_as_robot)){ report_user_view(misc.handler + "|player_card|" + misc.nhca); }
	
	if(document.getElementById('gpt_panel') != null && typeof gpt_log != "undefined" && gpt_log != null){
		//redraw_gpt_convo();
	}
	
}

function redraw_gpt_convo(){
	/***
	This function takes the results of the conversation that is stored in gpt_log and displays it in the gpt_panel div
	***/
	
	console.log("in redraw_gpt_convo...")
	console.log("redraw_gpt_convo.gpt_log"); console.log(gpt_log);
	
	var html = "";
	var elem = $("#gpt_panel"); elem.empty();
	// Display the elements of the conversation
	for(var a = 0;a<gpt_log.length;a++){ var tmp_gpt = gpt_log[a];
		if(tmp_gpt.type == "response"){
			tmp_gpt.chars = tmp_gpt.html.length;
			tmp_gpt.words = tmp_gpt.html.split(" ").length;
			while(tmp_gpt.html.indexOf("\\n") > -1){ tmp_gpt.html = tmp_gpt.html.replace("\\n", "<BR>"); }
			while(tmp_gpt.html.indexOf("\n") > -1){ tmp_gpt.html = tmp_gpt.html.replace("\n", "<BR>"); }
			html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding gpt-" + tmp_gpt.type + "'>";
				html += "<div class=''><span class='contents font-12'>" + tmp_gpt.html + "</span></div>";
				html += "<div class='right inline-flex' style='padding-top:10px;'>";
					html += "<div id='approve_gpt" + tmp_gpt.seq + "' onclick='approve_gpt_for_publication(" + tmp_gpt.seq + ")' class='no-padding'><span class='contents font-12'>Approve</span></div>";
					html += "<div class='no-padding' style='padding-left:30px;'><span class='contents font-12'>" + tmp_gpt.words + " word(s) and " + tmp_gpt.chars + " char(s)</span></div>";
				html += "</div>";
			html += "</div>";
			
			
		}
		if(tmp_gpt.type == "prompt"){
			while(tmp_gpt.text.indexOf("\n") > -1){ tmp_gpt.text = tmp_gpt.text.replace("\n", "<BR>"); }
			while(tmp_gpt.text.indexOf("\\n") > -1){ tmp_gpt.text = tmp_gpt.text.replace("\\n", "<BR>"); }
			html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding gpt-" + tmp_gpt.type + "'>";
				html += "<div class=''><span class='contents font-12'>" + tmp_gpt.text + "</span></div>";
			html += "</div>";
		}
	}
	
	// Display the controls for me to enter new prompts
	html += "<div id='gpt_log_new_prompt' class='no-padding'>";
		html += "<div class=''><textarea id='gpt_log_new_prompt_input' rows=5 class='col-12'></textarea></div>";
		html += "<div class='hidden' id='gpt_response_msg_div'><span id='gpt_response_msg'></span></div>";
		html += "<div class='centered'><button id='submit_to_chatbot_button' onclick='submit_to_chatbot(\"game_ID\", " + misc.ID + ");' class='action-button blue'>SUBMIT</button></div>";
	html += "</div>";
	elem.append(html);
}

function show_response_details(seq, request_type){
	/***
	This function unhides the detail underlying an LLM-response; this could include the original prompt sent to the LLM or the adminEdit panel for making a final version of the original LLM output.
	***/
	if(request_type=='view_prompt'){
		$(".extra-content").addClass("hidden"); 
		$(".extra-content-" + seq + "").removeClass("hidden"); 
		$("#request_details" + seq + "_div").removeClass("hidden");
	}
	else if(request_type=='adminEdit'){
		$(".extra-content").addClass("hidden"); 
		$(".extra-content-" + seq + "").removeClass("hidden"); 
		$("#edit_response" + seq + "_div").removeClass("hidden"); 
		//$("#edit_rationale" + seq + "_div").removeClass("hidden"); 
		$("#create_laxref_content" + seq + "_div").removeClass("hidden"); 
		$("#request_details" + seq + "_div").removeClass("hidden");
		
		console.log("2218.gpt_paragraphs"); console.log(gpt_paragraphs);
		// Use the edited gpt_paragraphs object to make sure the current version of the paragraphs is being printed
		var current_version_text = ""
		var something_edited = 0;
		for(var ac=0;ac<gpt_paragraphs.length;ac++){ var pgh = gpt_paragraphs[ac];
		    if(pgh.current.trim().length > 0){
				current_version_text += "\n\n" + pgh.current.trim();
				if(pgh.p_section != null){
					current_version_text += pgh.p_section;
				}
				if(pgh.updated){ something_edited = 1; }
			}
		}
		current_version_text = current_version_text.trim();
		while(current_version_text.indexOf("</p>\n") > -1){
			current_version_text = current_version_text.replace("</p>\n", "</p>")
		}
		
		
		document.getElementById("edit_response" + seq + "_textarea").value = current_version_text
		
		if(something_edited){	
			// Triggers the request to update the edited version of this article in the JSON file (in the adminEditedVersion data holder)
			edit_gpt_response("adminEditedVersion", seq, current_version_text)
		}
	}
	
}

function capture_highlighted_text(seq){
	/***
	This function is triggered when a user clicks the highlight button. The idea is to identify the selected text in the edited content and then store it in an input that can be saved along with the LaxRef_Content record so that the external function that creates screenshots of ExpectedGoals articles can pull the right text to highlight from the DB rather than needing it sent along as a command-line argument.
	***/
	
	var text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
	console.log(text)
	document.getElementById("create_laxref_content" + seq + "_highlighted_text").value = text.trim();

}

function get_tmp_subjects_from_req(tmp_request){
	var tmp_subject_ID_val = null;
	var tmp_subject_ID = null;
	var tmp_subjects = ""
	if('player_ID' in misc && misc.player_ID != null){
		tmp_subjects += "|player_ID-" + misc.player_ID;			
		tmp_subject_ID = "player_ID";
		tmp_subject_ID_val = misc.player_ID;
	}
	else if('player_ID' in tmp_request && tmp_request.player_ID != null){
		tmp_subjects += "|player_ID-" + tmp_request.player_ID;
		tmp_subject_ID = "player_ID";
		tmp_subject_ID_val = tmp_request.player_ID;
	}	

	if('game_ID' in misc && misc.game_ID != null){
		tmp_subjects += "|game_ID-" + misc.game_ID;
		tmp_subject_ID = "game_ID";
		tmp_subject_ID_val = misc.game_ID;
	}
	else if('game_ID' in tmp_request && tmp_request.game_ID != null){
		tmp_subjects += "|game_ID-" + tmp_request.game_ID;
		tmp_subject_ID = "game_ID";
		tmp_subject_ID_val = tmp_request.game_ID;
	}

	if('team_ID' in misc && misc.team_ID != null){
		tmp_subjects += "|team_ID-" + misc.team_ID;
		tmp_subject_ID = "team_ID";
		tmp_subject_ID_val = misc.team_ID;
	}
	else if('team_ID' in tmp_request && tmp_request.team_ID != null){
		tmp_subjects += "|team_ID-" + tmp_request.team_ID;
		tmp_subject_ID = "team_ID";
		tmp_subject_ID_val = tmp_request.team_ID;
	}			
	
	return [tmp_subjects, tmp_subject_ID, tmp_subject_ID_val];
}


function brify(txt){
	/***
	Converts a normal string, with new line escapes, into an HTML-friendly string with <BR> tags instead
	***/
	var br_text = txt + "";
	while(br_text.indexOf("\n") > -1){ br_text = br_text.replace("\n", "<BR>"); }
	return br_text;
}
function gpt_head_to_head(){
	/***
	This function is designed to give admins the ability to run through a competitive (of sorts) process that would enable comparing different types of data presentation against different types of prompts to try and narrow in on the right combination for creating automated recaps or previews or whatever.
	***/
	
	console.log("in gpt_head_to_head...")
	console.log("gpt_head_to_head.gpt_log"); console.log(gpt_log);
	console.log("current_session_ts: " + current_session_ts);
	

	var html = "";
	var tmp_gpt_log = null;
	var elem = $("#gpt_panel"); elem.empty();

	if('analysis' in misc && misc.analysis != null){
		tmp_analysis_llms = gpt_log.filter(r=> ('analysis' in r && misc.analysis == r.analysis) &&  'gpt_panel' in r && r.gpt_panel == "v2");
		tmp_analysis_llms.sort(function(a, b){ return b.session_ts - a.session_ts; });
		last_analysis_ts = tmp_analysis_llms[0].session_ts;
		tmp_gpt_log = tmp_analysis_llms.filter(r=> r.session_ts == last_analysis_ts);

	}
	else{
		//console.log(gpt_log.filter(r=> (!('last_session_ts' in misc.data.gpt_log) || r.session_ts == current_session_ts) && 'gpt_panel' in r && r.gpt_panel == "v2"));
		tmp_gpt_log = gpt_log.filter(r=> (!('last_session_ts' in misc.data.gpt_log) || r.session_ts == current_session_ts) && 'gpt_panel' in r && r.gpt_panel == "v2");

		
	}
	tmp_gpt_log = tmp_gpt_log.filter(r=> r.type == "response");
	// Display an easy link to open the stretches tab in a new window
		
	// Determine whether this analysis comes with a graphic
	uploaded_image_url = subject_has_graphic(tmp_gpt_log, gpt_log);
	console.log("uploaded_image_url: " + uploaded_image_url)
				
		if(misc.target_template == "admin_game.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					html += "<span class=''>Open Stretches in <a href='/admin_game?game_ID=" + misc.ID + "&view=stretches&gpt_panel=v2' target='_blank'>new tab</a></span>"
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_game_ID' in misc.data.gpt_log && misc.data.gpt_log.next_game_ID != null){
						html += "<span class=''>Go to <a href='/admin_game?game_ID=" + misc.data.gpt_log.next_game_ID + "&view=recap_writing&gpt_panel=v2'>next game</a></span>"
					}
				html += "</div>"
			html += "</div>"
		}
		else if(misc.target_template == "admin_team.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.data.ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_team_ID' in misc.data.gpt_log && misc.data.gpt_log.next_team_ID != null){
						html += "<span class=''>Go to <a href='/admin_team?team_ID=" + misc.data.gpt_log.next_team_ID + "&view=team_yoy_writing&gpt_panel=v2'>next team</a></span>"
					}
				html += "</div>"
			html += "</div>"
		}
		else if(misc.target_template == "admin_gpt.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					if('team_ID' in misc){
						html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.team_ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
					}
					else if ('ID' in misc.data){
						html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.data.ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_team_ID' in misc.data.gpt_log && misc.data.gpt_log.next_team_ID != null){
						html += "<span class=''>Go to <a href='/admin_gpt?team_ID=" + misc.data.gpt_log.next_team_ID + "&view=" + misc.active_element + "&gpt_panel=v2'>next team</a></span>"
					}
					if('next_player_ID' in misc.data.gpt_log && misc.data.gpt_log.next_player_ID != null){
						if('analysis' in misc){
							html += "<span class=''>Go to <a href='/admin_gpt?player_ID=" + misc.data.gpt_log.next_player_ID + "&view=" + misc.active_element + "&gpt_panel=v2&analysis=" + misc.analysis + "'>next player</a></span>"
						}
						else{
							html += "<span class=''>Go to <a href='/admin_gpt?player_ID=" + misc.data.gpt_log.next_player_ID + "&view=" + misc.active_element + "&gpt_panel=v2'>next player</a></span>"
						}
					}
				html += "</div>"
			html += "</div>"
		}
		
	// Display the elements of the conversation
	
	
	
	
	tmp_gpt_log = tmp_gpt_log.slice(0,3);
	if(Math.floor(Date.now() / 1000) % 2 == 0){
		tmp_gpt_log = tmp_gpt_log.reverse();
	}
	var cols_str = "col-" + (12/tmp_gpt_log.length);
    //for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
	html += "<div  class='flex'>"
	
	
	
	for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
		tmp_gpt.request = null;
	    tmp_requests = gpt_log.filter(r=> r.id == tmp_gpt.request_id);
		if(tmp_requests.length > 0){
			tmp_gpt.request = tmp_requests[0];	
		}
		
			console.log(tmp_gpt);
			//console.log("qpa.tmp_gpt"); console.log(tmp_gpt)
			
			// If the user has requested a specific text-version/data-version to edit, check if this response matches
			if('editTV' in misc && [null, ''].indexOf(misc.editTV) == -1){
				if('request' in tmp_gpt){
					if(tmp_gpt.request['text-version'] == misc.editTV && tmp_gpt.request['data-version'] == misc.editDV){
						requested_edit_seq = tmp_gpt.seq;
					}
				}	
			}
			// Admin has edited the content, so we want to display that instead of default to showing the raw LLM response
			if('adminEditedVersion' in tmp_gpt && [''. null].indexOf(tmp_gpt.adminEditedVersion.text) == -1){
				tmp_gpt.edited_html = "" + tmp_gpt.adminEditedVersion.text;
			}
			else{
				tmp_gpt.edited_html = "" + tmp_gpt.html;
			}
			if('adminEditRationale' in tmp_gpt && [''. null].indexOf(tmp_gpt.adminEditRationale) == -1){
				tmp_gpt.edit_rationale = tmp_gpt.adminEditRationale;
			}
			else{
				tmp_gpt.edit_rationale = "";
			}
			tmp_gpt.chars = tmp_gpt.html.length;
			
			tmp_gpt.words = tmp_gpt.html.split(" ").length;
			
			var html_version = tmp_gpt.html;
			while(html_version.indexOf("\n") > -1){ html_version = html_version.replace("\n", "<BR>"); }
			while(html_version.indexOf("\\n") > -1){ html_version = html_version.replace("\\n", "<BR>"); }
			var html_paragraphs = html_version.split("<BR>");
			
			
			html += "<div class='" + cols_str + " no-padding'>";
				html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding'>";
					html += "<div class='gpt-" + tmp_gpt.type + "'>";
						CHUNK_INTO_PARAGRAPHS=1
						if(CHUNK_INTO_PARAGRAPHS){
							for(var ac=0;ac<html_paragraphs.length;ac++){ var pgh = html_paragraphs[ac];
								console.log("Paragraph " + (ac+1) + " / " + html_paragraphs.length);
								console.log(pgh);
								html += "<div id='paragraph_" + a + "_" + ac + "_div' class='no-padding' style='padding-top: " + (ac == 0 ? 0 : 20) + "px;' onclick='open_edit_paragraph_modal(\"" + a + "_" + ac + "\", \"" + tmp_gpt.request_id + "\", " + tmp_gpt.seq + ", "  + ac + ");'><span id='paragraph_" + a + "_" + ac + "_span' class='pointer contents font-12'>" + pgh + "</span></div>";
							}
						}
						else{
							html += "<span class='contents font-12'>" + html_version + "</span>";
						}
					html += "</div>";
					html += "<div class='right inline-flex' style='padding-top:10px;'>";
						html += "<div class='no-padding' style='padding-left:30px;'><span class='contents font-12'>" + tmp_gpt.words + " word(s) and " + tmp_gpt.chars + " char(s)</span></div>";
					html += "</div>";
					html += "<div class='no-padding shot-charting-tag-entry-div entry-div-data inline-flex'>"
						html += "<div class='light'><span class='font-12'>Ranking</span></div>";
						tmp_score = null;
						if('ranking' in tmp_gpt && tmp_gpt.ranking != null && tmp_gpt.ranking.length > 0){
							tmp_score = tmp_gpt.ranking[0].ranking;
						}
						for(var b = 1;b<=tmp_gpt_log.length;b++){
							if(tmp_score == null || tmp_score == b){
								html += "<div onclick='score_gpt_response(\"" + tmp_gpt.seq + "\", " + b + ");' class=''><span style='background-color: " + SITE_BLUE + ";' disabled class='machine-label ranking-tag" + tmp_gpt.seq + "' id='ranking-tag" + tmp_gpt.seq + "-" + b + "'>" + b + "</span></div>";
							}
							else{
								html += "<div onclick='score_gpt_response(\"" + tmp_gpt.seq + "\", " + b + ");' class=''><span style='background-color: " + SITE_BLUE + ";' disabled class='deselected machine-label ranking-tag" + tmp_gpt.seq + "' id='ranking-tag" + tmp_gpt.seq + "-" + b + "'>" + b + "</span></div>";
							}
						}
					html += "</div>";
					var tmp_tag = null; var tag_set = null;
					
					// Errorneous; information is inaccurate or completely made up
					tmp_tag = "erroneous"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Erroneous/Hallucination</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// Superfluous; bot added extra context or commentary that isn't appropriate for the section or request (i.e. not focused enough)
					tmp_tag = "superfluous"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Superfluous</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// Lacking; there is obvious extra explanation or context that the bot should have added, but didn't
					tmp_tag = "lacking"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Lacking</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// Debatable; the analysis or explanation is accurate in terms of information and appropriate in terms of level of detail; but it's not how I would have analyzed the data or I would have drawn a different conclusion; only for use if the analysis is obviously inferior to another interpretation.
					tmp_tag = "debatable"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Debatable</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// View / Edit Controls
					html += "<div style='' class='flex'>";
						html += "<div style='' class='col-6 centered'>";
							// View the original request sent to ChatGPT
							html += "<div style='padding-top:10px;' class='centered pointer' onclick='show_response_details(" + tmp_gpt.seq + ", \"view_prompt\");'>"
								html += "<span class=''>View Prompt Request</span><img id='view_request" + tmp_gpt.seq + "_imgicon'  class='icon-15' style='margin-right:5px;' src='/static/img/view_icon100.png' />"
							html += "</div>";
							
							
						html += "</div>";
						html += "<div style='' class='col-6 centered'>";
							// Edit and save an admin-approved version of the response
							html += "<div style='padding-top:10px;' class='centered pointer' onclick='show_response_details(" + tmp_gpt.seq + ", \"adminEdit\");'>"
								html += "<span class=''>Edit Response</span><img id='view_request" + tmp_gpt.seq + "_imgicon'  class='icon-15' style='margin-right:5px;' src='/static/img/edit_white.png' />"
							html += "</div>";
						html += "</div>";	
							
					html += "</div>";
				html += "</div>";
			html += "</div>";
	}
	html += "</div>";
	
	cols_str = "col-12";
	html += "<div  class='block'>"
	for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
			console.log("-->"); console.log(tmp_gpt);
			//console.log("-->"); console.log(tmp_db_team); 
			html += "<div class='" + cols_str + " no-padding'>";
				html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding'>";
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='request_details" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-15'>Data-Version: " + tmp_gpt.request['data-version'] + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>Text-Version: " + tmp_gpt.request['text-version'] + "</span></div>";
						if('pretendYouAre' in tmp_gpt.request){
							html += "<div class='no-padding' ><span class='font-15'>Pretend you are: " + (tmp_gpt.request.pretendYouAre == null ? "N/A" : tmp_gpt.request.pretendYouAre) + "</span></div>";
						}
						
					
						html += "<div class='no-padding' ><span class='font-15'>n Training Examples: " + (!('n_few_shot_training_examples' in tmp_gpt.request) || tmp_gpt.request['n_few_shot_training_examples'] == null ? "N/A" : tmp_gpt.request['n_few_shot_training_examples']) + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>LLM: " + tmp_gpt.LLM_model + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>Temperature: " + (tmp_gpt.request['temperature'] == null ? "N/A" : tmp_gpt.request['temperature']) + "</span></div>";
						html += "<div class='no-padding' ><textarea rows=20 class='col-12 font-10'>";
						if('system_context' in tmp_gpt.request && tmp_gpt.request['system_context'] != null){
							for(var ab = 0;ab<tmp_gpt.request['system_context'].length;ab++){ var tmp = tmp_gpt.request['system_context'][ab];
								html += "\n" + tmp.role.toUpperCase() + ":\n\n" + tmp.content;
							}
							html += "\nPROMPT:\n\n"
						}
						html += tmp_gpt.request['text'];
						html += "</textarea></div>";
						
					html += "</div>";
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='edit_response" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding flex' >"
							html += "<div class='no-padding col-9' ><span class='font-12 italic'>Edited Content</span></div>";
							html += "<div class='col-2 right' ><button id='request_auto_edit" + tmp_gpt.seq + "_button' type='button' onclick='request_auto_edit(" + tmp_gpt.seq + ");' class='action-button small' style='min-width:0px;'>Auto-Edit</button></div>";
							html += "<div class='no-padding right col-1' ><img style='margin-top:10px;' class='icon-15' src='/static/img/highlight25.png' onclick='capture_highlighted_text(" + tmp_gpt.seq + ");' /></div>";
						html += "</div>"	
						html += "<div class='no-padding' ><textarea onchange='edit_gpt_response(\"adminEditedVersion\", " + tmp_gpt.seq + ", this.value);' rows=16 class='col-12 font-10' id='edit_response" + tmp_gpt.seq + "_textarea'>" + tmp_gpt.edited_html + "</textarea></div>";
						
						html += "<div class='no-padding flex'>"
						if('team_ID' in tmp_gpt.request && tmp_gpt.request.team_ID != null){
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/admin_teams?team_ID=" + tmp_gpt.request.team_ID + "&year=" + tmp_gpt.request.year + "#team_div" + tmp_gpt.request.team_ID + "'>Team Admin Page</a></span></div>";
						}
						
						if('team_ID' in tmp_gpt.request && tmp_gpt.request.team_ID != null){
						    db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/" + db_team.pro_url_tag + "' target='_blank'>Team Page</a></span></div>";
			
						    html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='" + db_team.roster_url + "' target='_blank'>Team Roster</a></span></div>";
			
						    html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='" + db_team.schedule_url + "' target='_blank'>Team Schedule</a></span></div>";
						}
	
						
						if('db_player' in misc && misc.db_player != null){
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/" + misc.db_player.pro_url_tag + "' target='_blank'>Player Page</a></span></div>";
						}
						html += "</div>";
						
					html += "</div>";
					
					console.log(!('league_tag') in tmp_gpt || typeof tmp_gpt.league_tag == "undefined" || tmp_gpt.league_tag == null)
					console.log('league' in tmp_gpt && tmp_gpt.league != null)
					if(!('league_tag') in tmp_gpt || typeof tmp_gpt.league_tag == "undefined" || tmp_gpt.league_tag == null){
						if('league' in tmp_gpt.request && tmp_gpt.request.league != null){
							tmp_gpt.league_tag = tmp_gpt.request.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "");
						}
					}
					
					
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='edit_rationale" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-12 italic'>Rationale for Edit</span></div>";
						html += "<div class='no-padding' ><textarea onchange='edit_gpt_response(\"adminEditRationale\", " + tmp_gpt.seq + ", this.value);' rows=6 class='col-12 font-10'>" + tmp_gpt.edit_rationale + "</textarea></div>";
					html += "</div>";
					
					// Create a record in LaxRef_Content with this analysis
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='create_laxref_content" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-12 italic'>Add to LaxRef_Content</span></div>";
						html += "<div class='no-padding flex' >";
							html += "<div class='col-6' ><span class='light font-12'>Header/Title</span></div>";
							html += "<div class='col-3' ><span class='light font-12'>Publish Date</span></div>";
							html += "<div class='col-3 centered' ><span class='light font-12'>Audience Recommended</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-6' ><input placeholder='Summary Header / Title' type=text value='";
							if(tmp_gpt.analysis == "team_yoy"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Year-in-Review: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "defensive_profile"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Defensive Deep-Dive: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "keys_to_the_game"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Keys to Victory: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "team_opponent_scout_non_early"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								html += "Best Defensive Performances against " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "")
							}
							else if(tmp_gpt.analysis == "rising_star_analysis"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Rising Star: " + tmp_db_player.player.replace("'", "&apos;")
								
							}
							else if(tmp_gpt.analysis == "player_season_recap"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Year-in-Review: " + tmp_db_player.player.replace("'", "&apos;")
							}
							else if(tmp_gpt.analysis == "in_season_player_season_recap" || tmp_gpt.analysis == "negative_in_season_player_season_recap"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Year-to-Date: " + tmp_db_player.player.replace("'", "&apos;")
							}
							else if(tmp_gpt.analysis == "player_percentiles_graphic_summary"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Player of the Day"
							}
							else if(tmp_gpt.analysis == "schedule_preview"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Schedule Preview: " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "posted_roster_analysis"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Roster Analysis: " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "game_preview"){
								console.log("GP")
								console.log(tmp_gpt.request)
								tmp_db_team1 = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team1_ID)[0];
								tmp_db_team2 = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team2_ID)[0];
		
								html += "Game Preview: " + tmp_db_team1.team_league.replace(" MLAX", "").replace(" WLAX", "") + " vs "+ tmp_db_team2.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "early_season_game_summary" || tmp_gpt.analysis == "non_early_season_game_summary"){
							    
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_db_opp_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "") + " vs " + tmp_db_opp_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "stretches"){
							    
								tmp_gpt.league_tag = misc.data.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Key Stretch"
							}
							else if(tmp_gpt.analysis == "top_ega_performances"){
							    
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_db_opp_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Top EGA Performance: " + misc.data.player;
							}
							
							
							html += "' id='create_laxref_content" + tmp_gpt.seq + "_summary_header' style='width: 90%;' /></div>";
							html += "<div class='col-3' ><input placeholder='%Y-%m-%d' type=text  value='";
								console.log("team league tag: " + tmp_gpt.league_tag);
								html += (tmp_gpt.league_tag in misc.first_date_needing_content && misc.first_date_needing_content[tmp_gpt.league_tag] != null ? misc.first_date_needing_content[tmp_gpt.league_tag] : misc.today_dt)
							html += "' id='create_laxref_content" + tmp_gpt.seq + "_publish_date' style='width: 90%;' /></div>";
							html += "<div class='col-3 centered' ><input type=checkbox ";
								html += (tmp_gpt.request.audience_recommended ? " checked" : "")
							html += " id='create_laxref_content" + tmp_gpt.seq + "_audience_recommended' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-12' ><span class='light font-12'>Recommendation URL</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							//console.log("loa.tmp_gpt"); console.log(tmp_gpt);
							html += "<div class='col-12' ><input placeholder='Recommendation URL' type=text value='" + (!('recommendation_url' in tmp_gpt.request) || tmp_gpt.request.recommendation_url == null ? "" : tmp_gpt.request.recommendation_url) + "' id='create_laxref_content" + tmp_gpt.seq + "_recommendation_url' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-12' ><span class='light font-12'>Summary Teaser</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-11' ><input placeholder='Summary Teaser' type=text value='' id='create_laxref_content" + tmp_gpt.seq + "_summary_teaser' style='width: 90%;' /></div>";
							html += "<div class='col-1' ><button id='genAI_summary_teaser" + tmp_gpt.seq + "_button' type='button' onclick='request_LLM(\"summary_header\", " + tmp_gpt.seq + ");' title='request_LLM_suggestion_for_content' class='action-button small' style='min-width:0px;'>LLM</button></div>";
						html += "</div>";
						html += "<div class='no-padding hidden' id='request_LLM_summary_header" + tmp_gpt.seq + "' ></div>";
						
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-11' ><span class='light font-12'>Highlighted Snippet</span></div>";
							html += "<div class='col-1' ><span class='light font-12'>Intro?</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-11' ><input placeholder='Select text and click highlighter above' type=text value='' id='create_laxref_content" + tmp_gpt.seq + "_highlighted_text' style='width: 90%;' /></div>";
					
							html += "<div class='col-1 centered' ><input type=checkbox ";
								html += (tmp_gpt.request.is_intro ? " checked" : "")
							html += " id='create_laxref_content" + tmp_gpt.seq + "_is_intro' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding centered' >";
							html += "<div class='no-padding' ><button id='create_laxref_content" + tmp_gpt.seq + "_button' type='button' onclick='add_to_laxref_content(" + tmp_gpt.seq + ");' class='action-button blue'>Add to LR Content</button></div>";
						html += "</div>";
					html += "</div>";
					
					
				html += "</div>";
			html += "</div>";
	}
	html += "</div>";
	
	// Controls to go to the next session_ts
	var session_ts_loc = misc.data.gpt_log.all_session_tags.indexOf(current_session_ts);
	var session_ts_n = misc.data.gpt_log.all_session_tags.length;
	html += "<!--div  class='flex hidden'>"
		html += "<div class='col-6 centered'>"
			if(session_ts_loc > 0){
				html += "<span class=''><button class='action-button blue' onclick='move_between_session_ts(-1)';>Move Back</button</span>";
			}
		html += "</div>";
		html += "<div class='col-6 centered'>"
			if(session_ts_loc < session_ts_n - 1){
				html += "<span class=''><button class='action-button blue' onclick='move_between_session_ts(1)';>Move Ahead</button</span>";
			}
		html += "</div-->";
		
		
	html += "</div>";
	//console.log("ks.tmp_gpt"); console.log(tmp_gpt);
	//console.log(misc.admin_llm_queue);
	var queue_seq = null;
	if(misc.admin_llm_queue != null){
		if(['rising_star_analysis', 'negative_in_season_player_season_recap', 'in_season_player_season_recap', 'player_season_recap'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.player_ID == r.player_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['team_yoy', 'defensive_profile', 'schedule_preview', 'keys_to_the_game', 'posted_roster_analysis'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.team_ID == r.team_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['early_season_game_summary', 'non_early_season_game_summary', 'team_opponent_scout_non_early', 'defensive_profile', 'schedule_preview', 'keys_to_the_game', 'posted_roster_analysis'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.team_ID == r.team_ID && tmp_gpt.request.game_ID == r.game_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['game_preview'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.game_ID == r.game_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
	}
	
	console.log("queue_seq: " + queue_seq);
	if(queue_seq != null){
		html += '<div class="col-12 centered"><button class="font-15 action-button" type="button" id="cpy_cmd_button11' + queue_seq + '" onclick="copy_python_cmd(11, ' + queue_seq + ');" style="min-width:30px;"><span class="font-15 ">COPY LLM CMD</span></button></div>'
	}
	
	html += "<div class='no-padding'>"
		html += "<textarea rows=50 class='col-12'>"
		for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
	
			html += "Passage " + (String.fromCharCode(65 + a)) + "\n\n"
			html += tmp_gpt.html + "\n\n";
			//console.log(tmp_gpt);
			//console.log("qpa.tmp_gpt"); console.log(tmp_gpt)
		}
		html += "</textarea>"
	html += "</div>"
	
	// Display the controls for me to enter new prompts
	html += "<div id='gpt_log_new_prompt' class='hidden no-padding'>";
		html += "<div class=''><textarea id='gpt_log_new_prompt_input' rows=5 class='col-12'></textarea></div>";
		html += "<div class='hidden' id='gpt_response_msg_div'><span id='gpt_response_msg'></span></div>";
		html += "<div class='centered'><button id='submit_to_chatbot_button' onclick='submit_to_chatbot(\"game_ID\", " + misc.ID + ", \"v2\");' class='action-button blue'>SUBMIT</button></div>";
	html += "</div>";
	elem.append(html);
	
	
	
}

var gpt_paragraphs = null;
function gpt_incremental(){
	/***
	This function is designed to give admins the ability to take a single LLM output and iterate through in a process that uses the auto-editor LLM tools to suggest better versions of the content rather than forcing the user to pick one and then edit it manually. Manual editing is still possible here, but there are more iterative steps that reduce the overall cognitive burden.
	***/
	
	console.log("in gpt_incremental...")
	console.log("gpt_incremental.gpt_log"); console.log(gpt_log);
	console.log("current_session_ts: " + current_session_ts);
	

	var html = "";
	var tmp_gpt_log = null;
	var elem = $("#gpt_panel"); elem.empty();

	if('analysis' in misc && misc.analysis != null){
		tmp_analysis_llms = gpt_log.filter(r=> ('analysis' in r && misc.analysis == r.analysis) &&  'gpt_panel' in r && r.gpt_panel == "v2");
		if('seq' in misc && misc.seq != null){
			console.log("Search for seq=" + misc.seq);
			tmp_gpt_log = tmp_analysis_llms.filter(r=> r.seq == misc.seq);
		}
		else{
			tmp_analysis_llms.sort(function(a, b){ return b.session_ts - a.session_ts; });
			last_analysis_ts = tmp_analysis_llms[0].session_ts;
			tmp_gpt_log = tmp_analysis_llms.filter(r=> r.session_ts == last_analysis_ts);
		}
	}
	else{
		//console.log(gpt_log.filter(r=> (!('last_session_ts' in misc.data.gpt_log) || r.session_ts == current_session_ts) && 'gpt_panel' in r && r.gpt_panel == "v2"));
		tmp_gpt_log = gpt_log.filter(r=> (!('last_session_ts' in misc.data.gpt_log) || r.session_ts == current_session_ts) && 'gpt_panel' in r && r.gpt_panel == "v2");

		
	}
	tmp_gpt_log = tmp_gpt_log.filter(r=> r.type == "response");
	// Display an easy link to open the stretches tab in a new window
		
	// Determine whether this analysis comes with a graphic
	uploaded_image_url = subject_has_graphic(tmp_gpt_log, gpt_log);
	console.log("uploaded_image_url: " + uploaded_image_url)
				
		if(misc.target_template == "admin_game.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					html += "<span class=''>Open Stretches in <a href='/admin_game?game_ID=" + misc.ID + "&view=stretches&gpt_panel=v2' target='_blank'>new tab</a></span>"
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_game_ID' in misc.data.gpt_log && misc.data.gpt_log.next_game_ID != null){
						html += "<span class=''>Go to <a href='/admin_game?game_ID=" + misc.data.gpt_log.next_game_ID + "&view=recap_writing&gpt_panel=v2'>next game</a></span>"
					}
				html += "</div>"
			html += "</div>"
		}
		else if(misc.target_template == "admin_team.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.data.ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_team_ID' in misc.data.gpt_log && misc.data.gpt_log.next_team_ID != null){
						html += "<span class=''>Go to <a href='/admin_team?team_ID=" + misc.data.gpt_log.next_team_ID + "&view=team_yoy_writing&gpt_panel=v2'>next team</a></span>"
					}
				html += "</div>"
			html += "</div>"
		}
		else if(misc.target_template == "admin_gpt.html"){
			html += "<div class='centered flex no-padding'>"
				html += "<div class='col-6'>"
					if('team_ID' in misc){
						html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.team_ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
					}
					else if ('ID' in misc.data){
						html += "<span class=''>Open Stats in <a href='/admin_team?team_ID=" + misc.data.ID + "&view=stats&gpt_panel=v2' target='_blank'>new tab</a></span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('seq' in misc.data.gpt_log){
						html += "<span class=''>" + misc.data.gpt_log.seq + "</span>"
					}
				html += "</div>"
				html += "<div class='col-3'>"
					if('next_team_ID' in misc.data.gpt_log && misc.data.gpt_log.next_team_ID != null){
						html += "<span class=''>Go to <a href='/admin_gpt?team_ID=" + misc.data.gpt_log.next_team_ID + "&view=" + misc.active_element + "&gpt_panel=v2'>next team</a></span>"
					}
					if('next_player_ID' in misc.data.gpt_log && misc.data.gpt_log.next_player_ID != null){
						if('analysis' in misc){
							html += "<span class=''>Go to <a href='/admin_gpt?player_ID=" + misc.data.gpt_log.next_player_ID + "&view=" + misc.active_element + "&gpt_panel=v2&analysis=" + misc.analysis + "'>next player</a></span>"
						}
						else{
							html += "<span class=''>Go to <a href='/admin_gpt?player_ID=" + misc.data.gpt_log.next_player_ID + "&view=" + misc.active_element + "&gpt_panel=v2'>next player</a></span>"
						}
					}
				html += "</div>"
			html += "</div>"
		}
		
	// Display the elements of the conversation
	
	
	
	
	if(Math.floor(Date.now() / 1000) % 2 == 0){
		tmp_gpt_log = tmp_gpt_log.reverse();
	}
    //for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
	
	tmp_gpt_log = tmp_gpt_log.slice(0,1);
	var cols_str = "col-" + (12/tmp_gpt_log.length);
	html += "<div id='gpt_article_controls_div' class='no-padding' style='padding-top: 20px; margin-top:2px; position: relative; right: 0px; '>"
		html += "<div class='no-padding mouseover-image'><img src='/static/img/horizontaldotmenu.png' class='submenu-icon' menu='gpt_article_" + a + "_" + ac + "_controls' /></div>";
		html += "<div id='gpt_article_controls_red_flag_div' class=''>"
			
			html += "<div class='col-12' id='gpt_article_controls_red_flag_detail_div'>" + (red_flag_html == null ? "": red_flag_html) + "</div>"
			html += "<div class='inline-flex'>"
				html += "<div class='' style='padding-right:5px;'><button class='action-button font-10 small' id='gpt_article_controls_red_flag_button' onclick='request_red_flag_analysis(\"full-full\", " + tmp_gpt_log[0].seq + ");'>FULL-FULL</button></div>";
				html += "<div class='' style='padding-right:5px;'><button class='action-button font-10 small' id='gpt_article_controls_red_flag_button' onclick='request_red_flag_analysis(\"full-selected\", " + tmp_gpt_log[0].seq + ");'>FULL-SELECTED</button></div>";
				html += "<div class='' style='padding-right:5px;'><button class='action-button font-10 small' id='gpt_article_controls_red_flag_button' onclick='request_red_flag_analysis(\"selected-full\", " + tmp_gpt_log[0].seq + ");'>SELECTED-FULL</button></div>";
				html += "<div class='' style='padding-right:5px;'><button class='action-button font-10 small' id='gpt_article_controls_red_flag_button' onclick='request_red_flag_analysis(\"selected-selected\", " + tmp_gpt_log[0].seq + ");'>SELECTED-SELECTED</button></div>";
				html += "<div class='no-padding' style='padding-right:5px;'><input id='use_4o' checked type=checkbox /><span class='font-10'>Use larger gpt-4o</span></div>";
				html += "<div class='no-padding' style='padding-right:5px;'><input id='auto_edit_in_a_loop' " + (let_auto_edit_run ? "checked" : "") +  "  onchange='toggle_let_auto_edit_run();' type=checkbox /><span class='font-10'>Edit-on-Loop</span></div>";
				html += "<div class='no-padding font-10' id='auto_edit_in_a_loop_progress_div'>";
				if(auto_edit_loops.red_flag > 0){
					html += "<span class='contents'>Starting loop " + auto_edit_loops.red_flag + " of " + MAX_AUTO_LOOPS + "</span>";
				}
				html += "</div>";
				html += "<div class='font-10 italic' id='red_flag_GPT_cost_div'></div>";
			html += "</div>"
		html += "</div>";
	html += "</div>";

										
	html += "<div  class='flex'>"
	
	
	
	for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
		tmp_gpt.request = null;
	    tmp_requests = gpt_log.filter(r=> r.id == tmp_gpt.request_id);
		if(tmp_requests.length > 0){
			tmp_gpt.request = tmp_requests[0];	
		}
		
			console.log("qpa.tmp_gpt"); console.log(tmp_gpt)
			
			// If the user has requested a specific text-version/data-version to edit, check if this response matches
			if('editTV' in misc && [null, ''].indexOf(misc.editTV) == -1){
				if('request' in tmp_gpt){
					if(tmp_gpt.request['text-version'] == misc.editTV && tmp_gpt.request['data-version'] == misc.editDV){
						requested_edit_seq = tmp_gpt.seq;
					}
				}	
			}
			// Admin has edited the content, so we want to display that instead of default to showing the raw LLM response
			if('adminEditedVersion' in tmp_gpt && [''. null].indexOf(tmp_gpt.adminEditedVersion.text) == -1){
				tmp_gpt.edited_html = "" + tmp_gpt.adminEditedVersion.text;
			}
			else{
				tmp_gpt.edited_html = ""
			}
			if('adminEditRationale' in tmp_gpt && [''. null].indexOf(tmp_gpt.adminEditRationale) == -1){
				tmp_gpt.edit_rationale = tmp_gpt.adminEditRationale;
			}
			else{
				tmp_gpt.edit_rationale = "";
			}
			tmp_gpt.chars = tmp_gpt.html.length;
			
			tmp_gpt.words = tmp_gpt.html.split(" ").length;
			
			var html_version = tmp_gpt.html;
			//console.log("orig html"); console.log(html_version);
			while(html_version.indexOf("\n") > -1){ html_version = html_version.replace("\n", "<BR>"); }
			while(html_version.indexOf("\\n") > -1){ html_version = html_version.replace("\\n", "<BR>"); }
			var tmp_paragraphs = html_version.split("<BR>").filter(r=> r.trim() != "");
			var html_paragraphs = [];
			var tmp_p_sections = []; var p_section = null;
			for(var ac=0;ac<tmp_paragraphs.length;ac++){ var pgh = tmp_paragraphs[ac];
			
				tmp_pgh_txt = pgh;
				p_section = null;
				start_pos = 0;
				// The HTML received from the LLM output can have <p>...</p> tags that are not necessarily text (the initial example was images). We are separating the larger text into paragraphs by looking for consecutive newlines, but the p tags, for formatting reasons, are typically not laid out that way. So we need to identify situations where there is a <p> between two paragraphs so that both paragraphs can be added to the list. And we need to make sure that any HTML script tags (like the <p>...</p> mentioned above) are tagged to the text of the paragraph so they can be included in the ultimate edited output.
				
				if(tmp_pgh_txt.indexOf("</p>") == -1 && tmp_pgh_txt.indexOf("</div>") == -1){ // If there are no p tags, just add the entirety of the paragraph with a null p_section
					html_paragraphs.push(pgh);
					tmp_p_sections.push(p_section)
				}
				
				// If there are p tags present, we need to identify and remove them, treating each one as a virtual newline since it signifies the end of a paragraph. When we find one, add the preceding text to the paragraph list and then add the p_section to the associated list of p_sections.
				var tmp_loops = 0;
				while(tmp_pgh_txt.indexOf("</p>") > -1 || tmp_pgh_txt.indexOf("<!--/exblock-->") > -1){
			
					
						
					
						const regex = /<(?:p|\!\-\-exblock\-\-)[^>]*>(.*?)<(?:\/p|\!\-\-\/exblock\-\-)>/g;
						//console.log("\n\n[loop " + (tmp_loops + 1) + "] search " + tmp_pgh_txt)
						tmp_loops += 1;
						tmp_matches = tmp_pgh_txt.match(regex)
						//console.log("tmp_matches"); console.log(tmp_matches)
						p_section = tmp_matches.length == 0 ? null : tmp_matches[0];
						//console.log(p_section);
						
						
						tmp_tokens = tmp_pgh_txt.split(p_section);
						//console.log("tmp_tokens"); console.log(tmp_tokens);
						
						var pgh_section = tmp_tokens[0];
						//html_paragraphs.push(tmp_pgh_txt.substr(0, tmp_pgh_txt.indexOf(p_section)))
						//console.log("\n\nAdd " + pgh_section);
						html_paragraphs.push(pgh_section)
						
						//console.log("\n\np_section " + p_section);
						tmp_p_sections.push(p_section)
							
						
						
						if(tmp_pgh_txt == tmp_pgh_txt.substr(tmp_pgh_txt.indexOf(p_section))){ console.log("Did not find ", (p_section)); break; }
						//console.log("Found " + p_section + " at " + tmp_pgh_txt.indexOf(p_section))
						tmp_pgh_txt = tmp_pgh_txt.substr(tmp_pgh_txt.indexOf(p_section) + p_section.length).trim();
						//console.log("New pgh txt"); console.log(tmp_pgh_txt)
						
						// When we get to the end, there may be paragraph with no p_section; we need to grab that paragraph and add it to the final list since the loop will not come around again (since the last p section was removed).
						if((tmp_pgh_txt.indexOf("</p>") == -1 && tmp_pgh_txt.indexOf("<!--/exblock-->") == -1) && tmp_pgh_txt.length > 0){
							html_paragraphs.push(tmp_pgh_txt)
						
							tmp_p_sections.push(null)
						}
						
					
				}
				
			}
			if(gpt_paragraphs == null){
				console.log("GPT Paragraphs is null, populate them via html_paragraphs")
				console.log(html_paragraphs);
				gpt_paragraphs = [];
				for(var ac=0;ac<html_paragraphs.length;ac++){ var pgh = html_paragraphs[ac]; 
					d = {'seq': ac, 'red_flag_open': 0, 'updated': 0, 'paragraph_span_tag': a + "_" + ac, 'gpt_seq': tmp_gpt.seq, 'request_id': tmp_gpt.request_id, 'orig': pgh, 'current': pgh, 'p_section': tmp_p_sections[ac]};
					if('human_paragraph_edits' in tmp_gpt && tmp_gpt.human_paragraph_edits != null){
						// If there have been edits made to this particular paragraph, load them into the gpt_paragraphs record so that we can a) load them into the modal panel as needed and b) we can display the correct edited version
						tmp_pgh = tmp_gpt.human_paragraph_edits.filter( r=> r.paragraph_seq == ac );
						console.log(tmp_pgh);
						if(tmp_pgh.length > 0){
							tmp_pgh = tmp_pgh[0];
							d.orig = tmp_pgh.original_text;
							d.feedback = tmp_pgh.feedback;
							d.current = tmp_pgh.new_text;
							d.updated = 1;
						}
					}
					gpt_paragraphs.push(d)
				}
				//console.log("3557.gpt_paragraphs"); console.log(gpt_paragraphs);
			}
			
			html += "<div class='" + cols_str + " no-padding' id='gpt_log_feedback_control_div" + tmp_gpt.seq + "'>";
				html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding'>";
					html += "<div class='gpt-" + tmp_gpt.type + "'>";
						
						for(var ac=0;ac<gpt_paragraphs.length;ac++){ var pgh = gpt_paragraphs[ac];
							if(pgh.current != null && pgh.current.trim().length > 0){
								//console.log("Paragraph " + (ac+1) + " / " + gpt_paragraphs.length);
								console.log(pgh);
								console.log(pgh.flesch_score);
								html += "<div class='no-padding right col-12'><div class='inline-flex'>"
									tmp_flesch_style = ('flesch_score' in pgh && pgh.flesch_score != null && pgh.flesch_score < 48 ? "error bold": "")
									html += "<div class='no-padding' style='width:200px; padding-right: 15px;'><span id='display_flesch_span_" + pgh.seq + "' class='font-10 contents " + tmp_flesch_style + "'>Flesch score: " + ('flesch_score' in pgh && pgh.flesch_score != null ? jsformat(pgh.flesch_score, "0") : "???") + "</span></div>";
									html += "<div pghseq=" + pgh.seq + " id='gpt_paragraph_" + pgh.paragraph_span_tag + "_controls_div' class='no-padding col-12 right' style='padding-top: " + (pgh.seq == 0 ? 0 : 0) + "px; margin-top:2px; position: relative; right: 0px; '>"
										
										html += "<div class='no-padding zmouseover-image'><img src='/static/img/horizontaldotmenu.png' class='submenu-icon'  menu='gpt_paragraph_" + pgh.paragraph_span_tag + "_controls' /></div>";
									html += "</div>";
								html += "</div></div>";
								
								//onclick='open_edit_paragraph_modal(\"" + pgh.paragraph_span_tag + "\", \"" + pgh.request_id + "\", " + pgh.gpt_seq + ", "  + pgh.seq + ");'
								html += "<div id='paragraph_" + pgh.paragraph_span_tag + "_div' class='no-padding' onclick='request_gpt_paragraph_alternatives(\"" + pgh.paragraph_span_tag + "\", \"" + pgh.request_id + "\", " + pgh.gpt_seq + ", "  + pgh.seq + ");'><span id='paragraph_" + pgh.paragraph_span_tag + "_span' class='pointer contents font-12'>" + pgh.current + "</span></div>";
								
								if(pgh.p_section != null){
									//html += "<div id='p_section_" + pgh.paragraph_span_tag + "_div' class='no-padding'><span id='paragraph_" + pgh.paragraph_span_tag + "_p_section' class='pointer contents font-12'>" + pgh.p_section + "</span></div>";
									html += "<div id='p_section_" + pgh.paragraph_span_tag + "_div' class='no-padding' style='text-align:center;'>" + pgh.p_section + "</div>";
								}
							}
						}
						
					html += "</div>";
					html += "<div class='right inline-flex' style='padding-top:10px;'>";
						html += "<div class='no-padding' style='padding-left:30px;'><span class='contents font-12'>" + tmp_gpt.words + " word(s) and " + tmp_gpt.chars + " char(s)</span></div>";
					html += "</div>";
					html += "<div class='no-padding shot-charting-tag-entry-div entry-div-data inline-flex'>"
						html += "<div class='light'><span class='font-12'>Ranking</span></div>";
						tmp_score = null;
						if('ranking' in tmp_gpt && tmp_gpt.ranking != null && tmp_gpt.ranking.length > 0){
							tmp_score = tmp_gpt.ranking[0].ranking;
						}
						for(var b = 1;b<=tmp_gpt_log.length;b++){
							if(tmp_score == null || tmp_score == b){
								html += "<div onclick='score_gpt_response(\"" + tmp_gpt.seq + "\", " + b + ");' class=''><span style='background-color: " + SITE_BLUE + ";' disabled class='machine-label ranking-tag" + tmp_gpt.seq + "' id='ranking-tag" + tmp_gpt.seq + "-" + b + "'>" + b + "</span></div>";
							}
							else{
								html += "<div onclick='score_gpt_response(\"" + tmp_gpt.seq + "\", " + b + ");' class=''><span style='background-color: " + SITE_BLUE + ";' disabled class='deselected machine-label ranking-tag" + tmp_gpt.seq + "' id='ranking-tag" + tmp_gpt.seq + "-" + b + "'>" + b + "</span></div>";
							}
						}
					html += "</div>";
					var tmp_tag = null; var tag_set = null;
					
					// Errorneous; information is inaccurate or completely made up
					tmp_tag = "erroneous"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					alt_tmp_tag = "erroneous_rationale"
					alt_tag_val = null;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						alt_tag_val = tmp_gpt.tags.filter(r=> r.tag == alt_tmp_tag && ['', null].indexOf(r.val) == -1).length > 0 ? tmp_gpt.tags.filter(r=> r.tag == alt_tmp_tag && ['', null].indexOf(r.val) == -1)[0].val : null;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data'>"
						html += "<div class='no-padding flex'>"
							html += "<div class='no-padding inline-flex col-11'>"
								html += "<div class='light'><span class='font-12'>Erroneous/Hallucination</span></div>";
								html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
							html += "</div>";
							html += "<div class='no-padding col-1 right'>"
								html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
							html += "</div>";
						html += "</div>";
						html += "<div class='no-padding' id='erroneous_rationale_div'>"
							html += "<textarea rows=3 class='col-11 font-10' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "_rationale\", this.value);' id='' placeholder='If the article contains a hallucination, enter the offending text (and your explanation in parentheses)'>";
							if(alt_tag_val != null){
								html += alt_tag_val;
							}
							html += "</textarea>"
						html += "</div>";
					html += "</div>";
					
					// Superfluous; bot added extra context or commentary that isn't appropriate for the section or request (i.e. not focused enough)
					tmp_tag = "superfluous"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Superfluous</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// Lacking; there is obvious extra explanation or context that the bot should have added, but didn't
					tmp_tag = "lacking"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Lacking</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// Debatable; the analysis or explanation is accurate in terms of information and appropriate in terms of level of detail; but it's not how I would have analyzed the data or I would have drawn a different conclusion; only for use if the analysis is obviously inferior to another interpretation.
					tmp_tag = "debatable"
					tag_set = 0;
					if('tags' in tmp_gpt && tmp_gpt.tags != null){
						tag_set = tmp_gpt.tags.filter(r=> r.tag == tmp_tag && r.val == 1).length > 0 ? 1 : 0;
					}
					html += "<div class='no-padding col-12 shot-charting-tag-entry-div entry-div-data flex'>"
						html += "<div class='no-padding inline-flex col-11'>"
							html += "<div class='light'><span class='font-12'>Debatable</span></div>";
							html += '<div class="no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="laxgpt_response_tags' + tmp_tag + '_helpicon" class="icon-10 explanation" value="laxgpt_response_tags|' + tmp_tag + '" src="static/img/Gray_Info150.png"></div>';
						html += "</div>";
						html += "<div class='no-padding col-1 right'>"
							html += "<div class='no-padding right'><input  style='margin-top:10px;' onchange='tag_gpt_response(" + tmp_gpt.seq + ", \"" + tmp_tag + "\", this.checked);' type=checkbox " + (tag_set ? " checked" : "") + " /></div>";
						html += "</div>";
					html += "</div>";
					
					// View / Edit Controls
					html += "<div style='' class='flex'>";
						html += "<div style='' class='col-6 centered'>";
							// View the original request sent to ChatGPT
							html += "<div style='padding-top:10px;' class='centered pointer' onclick='show_response_details(" + tmp_gpt.seq + ", \"view_prompt\");'>"
								html += "<span class=''>View Prompt Request</span><img id='view_request" + tmp_gpt.seq + "_imgicon'  class='icon-15' style='margin-right:5px;' src='/static/img/view_icon100.png' />"
							html += "</div>";
							
							
						html += "</div>";
						html += "<div style='' class='col-6 centered'>";
							// Edit and save an admin-approved version of the response
							html += "<div style='padding-top:10px;' class='centered pointer' onclick='show_response_details(" + tmp_gpt.seq + ", \"adminEdit\");'>"
								html += "<span class=''>Edit Response</span><img id='view_request" + tmp_gpt.seq + "_imgicon'  class='icon-15' style='margin-right:5px;' src='/static/img/edit_white.png' />"
							html += "</div>";
						html += "</div>";	
							
					html += "</div>";
				html += "</div>";
			html += "</div>";
	}
	html += "</div>";
	
	cols_str = "col-12";
	html += "<div  class='block'>"
	for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
			console.log("-->"); console.log(tmp_gpt);
			//console.log("-->"); console.log(tmp_db_team); 
			html += "<div class='" + cols_str + " no-padding'>";
				html += "<div id='gpt_log" + tmp_gpt.seq + "' class='no-padding'>";
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='request_details" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-15'>Data-Version: " + tmp_gpt.request['data-version'] + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>Text-Version: " + tmp_gpt.request['text-version'] + "</span></div>";
						if('pretendYouAre' in tmp_gpt.request){
							html += "<div class='no-padding' ><span class='font-15'>Pretend you are: " + (tmp_gpt.request.pretendYouAre == null ? "N/A" : tmp_gpt.request.pretendYouAre) + "</span></div>";
						}
						
					
						html += "<div class='no-padding' ><span class='font-15'>n Training Examples: " + (!('n_few_shot_training_examples' in tmp_gpt.request) || tmp_gpt.request['n_few_shot_training_examples'] == null ? "N/A" : tmp_gpt.request['n_few_shot_training_examples']) + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>LLM: " + tmp_gpt.LLM_model + "</span></div>";
						html += "<div class='no-padding' ><span class='font-15'>Temperature: " + (tmp_gpt.request['temperature'] == null ? "N/A" : tmp_gpt.request['temperature']) + "</span></div>";
						html += "<div class='no-padding' ><textarea rows=20 class='col-12 font-10'>";
						if('system_context' in tmp_gpt.request && tmp_gpt.request['system_context'] != null){
							for(var ab = 0;ab<tmp_gpt.request['system_context'].length;ab++){ var tmp = tmp_gpt.request['system_context'][ab];
								html += "\n" + tmp.role.toUpperCase() + ":\n\n" + tmp.content;
							}
							html += "\nPROMPT:\n\n"
						}
						html += tmp_gpt.request['text'];
						html += "</textarea></div>";
						
					html += "</div>";
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='edit_response" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding flex' >"
							html += "<div class='no-padding col-5' ><span class='font-12 italic'>Edited Content</span></div>";
							html += "<div class='col-6 right inline-flex' ><button id='request_article_transitions" + tmp_gpt.seq + "_button' type='button' onclick='request_article_transitions(" + tmp_gpt.seq + ");' class='action-button small' style='min-width:0px;'>Add Transitions</button><button id='revert_article_transitions" + tmp_gpt.seq + "_button' type='button' onclick='revert_article_transitions(" + tmp_gpt.seq + ");' class='hidden action-button small' style='min-width:0px;'>Revert Transitions</button><button id='request_auto_edit" + tmp_gpt.seq + "_button' type='button' onclick='request_auto_edit(" + tmp_gpt.seq + ");' class='action-button small' style='min-width:0px;'>Auto-Edit</button></div>";
							html += "<div class='no-padding right col-1' ><img style='margin-top:10px;' class='icon-15' src='/static/img/highlight25.png' onclick='capture_highlighted_text(" + tmp_gpt.seq + ");' /></div>";
						html += "</div>"	
						html += "<div class='no-padding' ><textarea onchange='edit_gpt_response(\"adminEditedVersion\", " + tmp_gpt.seq + ", this.value);' rows=16 class='col-12 font-10' id='edit_response" + tmp_gpt.seq + "_textarea'>" + tmp_gpt.edited_html + "</textarea></div>";
						
						html += "<div class='no-padding flex'>"
						if('team_ID' in tmp_gpt.request && tmp_gpt.request.team_ID != null){
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/admin_teams?team_ID=" + tmp_gpt.request.team_ID + "&year=" + tmp_gpt.request.year + "#team_div" + tmp_gpt.request.team_ID + "'>Team Admin Page</a></span></div>";
						}
						
						if('team_ID' in tmp_gpt.request && tmp_gpt.request.team_ID != null){
						    db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/" + db_team.pro_url_tag + "' target='_blank'>Team Page</a></span></div>";
			
						    html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='" + db_team.roster_url + "' target='_blank'>Team Roster</a></span></div>";
			
						    html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='" + db_team.schedule_url + "' target='_blank'>Team Schedule</a></span></div>";
						}
	
						
						if('db_player' in misc && misc.db_player != null){
							html += "<div class='no-padding' style='padding:10px 0px;'><span class='font-15'><a href='https://pro.lacrossereference.com/" + misc.db_player.pro_url_tag + "' target='_blank'>Player Page</a></span></div>";
						}
						html += "</div>";
						
					html += "</div>";
					
					console.log(!('league_tag') in tmp_gpt || typeof tmp_gpt.league_tag == "undefined" || tmp_gpt.league_tag == null)
					console.log('league' in tmp_gpt && tmp_gpt.league != null)
					if(!('league_tag') in tmp_gpt || typeof tmp_gpt.league_tag == "undefined" || tmp_gpt.league_tag == null){
						if('league' in tmp_gpt.request && tmp_gpt.request.league != null){
							tmp_gpt.league_tag = tmp_gpt.request.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "");
						}
					}
					
					
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='edit_rationale" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-12 italic'>Rationale for Edit</span></div>";
						html += "<div class='no-padding' ><textarea onchange='edit_gpt_response(\"adminEditRationale\", " + tmp_gpt.seq + ", this.value);' rows=6 class='col-12 font-10'>" + tmp_gpt.edit_rationale + "</textarea></div>";
					html += "</div>";
					
					// Create a record in LaxRef_Content with this analysis
					html += "<div class='hidden no-padding col-12 extra-content extra-content" + tmp_gpt.seq + "' id='create_laxref_content" + tmp_gpt.seq + "_div'>"
						html += "<div class='no-padding' ><span class='font-12 italic'>Add to LaxRef_Content</span></div>";
						html += "<div class='no-padding flex' >";
							html += "<div class='col-6' ><span class='light font-12'>Header/Title</span></div>";
							html += "<div class='col-3' ><span class='light font-12'>Publish Date</span></div>";
							html += "<div class='col-3 centered' ><span class='light font-12'>Audience Recommended</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-6' ><input placeholder='Summary Header / Title' type=text value='";
							if(tmp_gpt.analysis == "team_yoy"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Year-in-Review: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "defensive_profile"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Defensive Deep-Dive: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "keys_to_the_game"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Keys to Victory: " + misc.data.display_name;
							}
							else if(tmp_gpt.analysis == "team_opponent_scout_non_early"){
								
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								html += "Best Defensive Performances against " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "")
							}
							else if(tmp_gpt.analysis == "rising_star_analysis"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Rising Star: " + tmp_db_player.player.replace("'", "&apos;")
								
							}
							else if(tmp_gpt.analysis == "player_season_recap"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Year-in-Review: " + tmp_db_player.player.replace("'", "&apos;")
							}
							else if(tmp_gpt.analysis == "in_season_player_season_recap" || tmp_gpt.analysis == "negative_in_season_player_season_recap"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Year-to-Date: " + tmp_db_player.player.replace("'", "&apos;")
							}
							else if(tmp_gpt.analysis == "player_percentiles_graphic_summary"){
								tmp_db_player = misc.extra_data.players.filter(r=> r.player_ID==tmp_gpt.request.player_ID)[0];
								tmp_gpt.league_tag = tmp_db_player.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Player of the Day"
							}
							else if(tmp_gpt.analysis == "schedule_preview"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Schedule Preview: " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "posted_roster_analysis"){
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += "Roster Analysis: " + tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "game_preview"){
								console.log("GP")
								console.log(tmp_gpt.request)
								tmp_db_team1 = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team1_ID)[0];
								tmp_db_team2 = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team2_ID)[0];
		
								html += "Game Preview: " + tmp_db_team1.team_league.replace(" MLAX", "").replace(" WLAX", "") + " vs "+ tmp_db_team2.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "early_season_game_summary" || tmp_gpt.analysis == "non_early_season_game_summary"){
							    
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_db_opp_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								if(!('display_name' in misc.data)){
									misc.data.display_name = tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
								}
								html += tmp_db_team.team_league.replace(" MLAX", "").replace(" WLAX", "") + " vs " + tmp_db_opp_team.team_league.replace(" MLAX", "").replace(" WLAX", "");
							}
							else if(tmp_gpt.analysis == "stretches"){
							    
								tmp_gpt.league_tag = misc.data.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Key Stretch"
							}
							else if(tmp_gpt.analysis == "top_ega_performances"){
							    
								tmp_db_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.team_ID)[0];
								tmp_db_opp_team = misc.extra_data.db_teams.filter(r=> r.ID==tmp_gpt.request.opp_team_ID)[0];
								tmp_gpt.league_tag = tmp_db_team.league.replace("NCAA ", "").toLowerCase().replace("omen", "").replace("en", "").replace(" ", "")
								html += "Top EGA Performance: " + misc.data.player;
							}
							
							
							html += "' id='create_laxref_content" + tmp_gpt.seq + "_summary_header' style='width: 90%;' /></div>";
							html += "<div class='col-3' ><input placeholder='%Y-%m-%d' type=text  value='";
								//console.log("team league tag: " + tmp_gpt.league_tag);
								html += (tmp_gpt.league_tag in misc.first_date_needing_content && misc.first_date_needing_content[tmp_gpt.league_tag] != null ? misc.first_date_needing_content[tmp_gpt.league_tag] : misc.today_dt)
							html += "' id='create_laxref_content" + tmp_gpt.seq + "_publish_date' style='width: 90%;' /></div>";
							html += "<div class='col-3 centered' ><input type=checkbox ";
								html += (tmp_gpt.request.audience_recommended ? " checked" : "")
							html += " id='create_laxref_content" + tmp_gpt.seq + "_audience_recommended' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-12' ><span class='light font-12'>Recommendation URL</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							//console.log("loa.tmp_gpt"); console.log(tmp_gpt);
							html += "<div class='col-12' ><input placeholder='Recommendation URL' type=text value='" + (!('recommendation_url' in tmp_gpt.request) || tmp_gpt.request.recommendation_url == null ? "" : tmp_gpt.request.recommendation_url) + "' id='create_laxref_content" + tmp_gpt.seq + "_recommendation_url' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-12' ><span class='light font-12'>Summary Teaser</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-11' ><input placeholder='Summary Teaser' type=text value='' id='create_laxref_content" + tmp_gpt.seq + "_summary_teaser' style='width: 90%;' /></div>";
							html += "<div class='col-1' ><button id='genAI_summary_teaser" + tmp_gpt.seq + "_button' type='button' onclick='request_LLM(\"summary_header\", " + tmp_gpt.seq + ");' title='request_LLM_suggestion_for_content' class='action-button small' style='min-width:0px;'>LLM</button></div>";
						html += "</div>";
						html += "<div class='no-padding hidden' id='request_LLM_summary_header" + tmp_gpt.seq + "' ></div>";
						
						
						html += "<div class='no-padding flex' >";
							html += "<div class='col-11' ><span class='light font-12'>Highlighted Snippet</span></div>";
							html += "<div class='col-1' ><span class='light font-12'>Intro?</span></div>";
						html += "</div>";
						html += "<div class='no-padding flex' >";
							
							html += "<div class='col-11' ><input placeholder='Select text and click highlighter above' type=text value='' id='create_laxref_content" + tmp_gpt.seq + "_highlighted_text' style='width: 90%;' /></div>";
					
							html += "<div class='col-1 centered' ><input type=checkbox ";
								html += (tmp_gpt.request.is_intro ? " checked" : "")
							html += " id='create_laxref_content" + tmp_gpt.seq + "_is_intro' style='width: 90%;' /></div>";
						html += "</div>";
						
						html += "<div class='no-padding centered' >";
							html += "<div class='no-padding' ><button id='create_laxref_content" + tmp_gpt.seq + "_button' type='button' onclick='add_to_laxref_content(" + tmp_gpt.seq + ");' class='action-button blue'>Add to LR Content</button></div>";
						html += "</div>";
					html += "</div>";
					
					
				html += "</div>";
			html += "</div>";
	}
	html += "</div>";
	
	// Controls to go to the next session_ts
	var session_ts_loc = misc.data.gpt_log.all_session_tags.indexOf(current_session_ts);
	var session_ts_n = misc.data.gpt_log.all_session_tags.length;
	html += "<!--div  class='flex hidden'>"
		html += "<div class='col-6 centered'>"
			if(session_ts_loc > 0){
				html += "<span class=''><button class='action-button blue' onclick='move_between_session_ts(-1)';>Move Back</button</span>";
			}
		html += "</div>";
		html += "<div class='col-6 centered'>"
			if(session_ts_loc < session_ts_n - 1){
				html += "<span class=''><button class='action-button blue' onclick='move_between_session_ts(1)';>Move Ahead</button</span>";
			}
		html += "</div-->";
		
		
	html += "</div>";
	//console.log("ks.tmp_gpt"); console.log(tmp_gpt);
	//console.log(misc.admin_llm_queue);
	var queue_seq = null;
	if(misc.admin_llm_queue != null){
		if(['rising_star_analysis', 'negative_in_season_player_season_recap', 'in_season_player_season_recap', 'player_season_recap'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.player_ID == r.player_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['team_yoy', 'defensive_profile', 'schedule_preview', 'keys_to_the_game', 'posted_roster_analysis'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.team_ID == r.team_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['early_season_game_summary', 'non_early_season_game_summary', 'team_opponent_scout_non_early', 'defensive_profile', 'schedule_preview', 'keys_to_the_game', 'posted_roster_analysis'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.team_ID == r.team_ID && tmp_gpt.request.game_ID == r.game_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
		else if(['game_preview'].indexOf(tmp_gpt.analysis) > -1 ){
			tmp_queue = misc.admin_llm_queue.filter(r=> tmp_gpt.request.game_ID == r.game_ID);
			if(tmp_queue.length > 0){
				queue_seq = tmp_queue[0].seq
			}
		}
	}
	
	//console.log("queue_seq: " + queue_seq);
	if(queue_seq != null){
		html += '<div class="col-12 font-12 centered"><div class="inline-flex no-padding">';
			html += '<button class="action-button" type="button" id="cpy_cmd_button11' + queue_seq + '" onclick="copy_python_cmd(11, ' + queue_seq + ');" style="min-width:30px;"><span class="">COPY LLM CMD</span></button>';
			html += '<button title="Re-evaluate pre-emptive LLM checks" class="action-button" type="button" id="cpy_cmd_button19' + queue_seq + '" onclick="copy_python_cmd(19, ' + queue_seq + ');" style="min-width:30px; margin-left:20px;"><span class="">RE-EVAL</span></button>';
		html += '</div></div>'
	}
	
	html += "<div class='no-padding'>"
		html += "<textarea rows=50 class='col-12'>"
		for(var a = 0;a<tmp_gpt_log.length;a++){ var tmp_gpt = tmp_gpt_log[a];
	
			html += "Passage " + (String.fromCharCode(65 + a)) + "\n\n"
			html += tmp_gpt.html + "\n\n";
			//console.log(tmp_gpt);
			//console.log("qpa.tmp_gpt"); console.log(tmp_gpt)
		}
		html += "</textarea>"
	html += "</div>"
	
	// Display the controls for me to enter new prompts
	html += "<div id='gpt_log_new_prompt' class='hidden no-padding'>";
		html += "<div class=''><textarea id='gpt_log_new_prompt_input' rows=5 class='col-12'></textarea></div>";
		html += "<div class='hidden' id='gpt_response_msg_div'><span id='gpt_response_msg'></span></div>";
		html += "<div class='centered'><button id='submit_to_chatbot_button' onclick='submit_to_chatbot(\"game_ID\", " + misc.ID + ", \"v2\");' class='action-button blue'>SUBMIT</button></div>";
	html += "</div>";
	elem.append(html);
	
	
	
}

function request_LLM(content_type, seq){
	/***
	This button is triggered when the user wants to trigger a request to an LLM for a specific type of content related to a specific LaxRef_Content object. (i.e. give me some summary header/headlines to choose from)
	***/
	
	brief_hide_in_seconds("genAI_summary_teaser" + seq + "_button", 1);
	console.log("request_LLM", content_type, seq);
	
	var content = document.getElementById("edit_response" + seq + "_textarea").value;
	var tmp_highlighted_text = document.getElementById("create_laxref_content" + seq + "_highlighted_text").value;
	
	var tmp_subject_ID = null;
	var tmp_subject_val = null;
	var tmp_subjects = "";
	
	var tmp_response = gpt_log.filter(r=> r.seq == seq)[0];
	
	console.log("tmp_response"); console.log(tmp_response);
	var tmp_request = tmp_response.request;
	
	console.log("tmp_request"); console.log(tmp_request);
	
	if (misc.target_template == "admin_gpt.html"){
					
		if('player_ID' in misc && misc.player_ID != null){
			tmp_subjects += "|player_ID-" + misc.player_ID;
			tmp_subject_ID = "player_ID";
		}
		else if('player_ID' in tmp_request && tmp_request.player_ID != null){
			tmp_subjects += "|player_ID-" + tmp_request.player_ID;
			tmp_subject_ID = "player_ID";
		}	

		if('game_ID' in misc && misc.game_ID != null){
			tmp_subjects += "|game_ID-" + misc.game_ID;
			tmp_subject_ID = "game_ID";
		}
		else if('game_ID' in tmp_request && tmp_request.game_ID != null){
			tmp_subjects += "|game_ID-" + tmp_request.game_ID;
			tmp_subject_ID = "game_ID";
		}

		if('team_ID' in misc && misc.team_ID != null){
			tmp_subjects += "|team_ID-" + misc.team_ID;
			tmp_subject_ID = "team_ID";
		}
		else if('team_ID' in tmp_request && tmp_request.team_ID != null){
			tmp_subjects += "|team_ID-" + tmp_request.team_ID;
			tmp_subject_ID = "team_ID";
		}			
	}
	

	
	$("#request_LLM_" + content_type + seq).empty()
	$("#request_LLM_" + content_type + seq).addClass("hidden");
	
	async_run(null, null, "handler-laxref_gpt|action-request_LLM_suggestion_for_content|val-" + content + "|field-" + seq + "~+" + tmp_response.analysis + "~+" + tmp_highlighted_text + "~+" + tmp_subject_ID + "|key-" + content_type);

}

function levenshteinDistance(s1, s2) {
	const len1 = s1.length, len2 = s2.length;
	let dp = Array.from(Array(len1 + 1), () => Array(len2 + 1).fill(0));

	for (let i = 0; i <= len1; i++) dp[i][0] = i;
	for (let j = 0; j <= len2; j++) dp[0][j] = j;

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			let cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,    // Deletion
				dp[i][j - 1] + 1,    // Insertion
				dp[i - 1][j - 1] + cost // Substitution
			);
		}
	}
	return dp[len1][len2];
}

// Computes FuzzyWuzzy-style similarity ratio (0-100)
function fuzzyRatio(s1, s2) {
	let distance = levenshteinDistance(s1, s2);
	let maxLength = Math.max(s1.length, s2.length);
	return maxLength === 0 ? 100 : Math.round((1 - distance / maxLength) * 100);
}

function fuzzyPartialRatio(s1, s2) {
	if (s1.length > s2.length) [s1, s2] = [s2, s1]; // Ensure s1 is shorter

	let bestScore = 0;
	for (let i = 0; i <= s2.length - s1.length; i++) {
		let substring = s2.substring(i, i + s1.length);
		let score = fuzzyRatio(s1, substring);
		bestScore = Math.max(bestScore, score);
	}
	return bestScore;
}

// Example Usage
//console.log(fuzzyPartialRatio("hello", "hello world")); // Output: 100
//console.log(fuzzyPartialRatio("fuzzy", "wuzzy wuzzy")); // Output: 80
//console.log(fuzzyRatio("hello world", "hello")); // Output: 62
//console.log(fuzzyRatio("fuzzy", "wuzzy")); // Output: 40

function add_to_laxref_content(seq){
	/***
	When the user is editing or reviewing an LLM output, this function allows that content to be converted into a LaxRef_Content record so that it can be published somewhere.
	***/
	
	brief_hide_in_seconds("create_laxref_content" + seq + "_button", 1);
	
	var tmp_publish_date = document.getElementById("create_laxref_content" + seq + "_publish_date").value;
	var tmp_audience_recommended = document.getElementById("create_laxref_content" + seq + "_audience_recommended").checked ? 1 : 0;
	var tmp_is_intro = document.getElementById("create_laxref_content" + seq + "_is_intro").checked ? 1 : 0;
	var tmp_recommendation_url = document.getElementById("create_laxref_content" + seq + "_recommendation_url").value;
	var tmp_summary_header = document.getElementById("create_laxref_content" + seq + "_summary_header").value;
	var tmp_summary_teaser = document.getElementById("create_laxref_content" + seq + "_summary_teaser").value;
	var tmp_highlighted_text = document.getElementById("create_laxref_content" + seq + "_highlighted_text").value;
	var content = document.getElementById("edit_response" + seq + "_textarea").value;
	console.log("Publish " + tmp_summary_header + " on " + tmp_publish_date);
	
	var tmp_subject_ID = null;
	var tmp_subject_val = null;
	var tmp_subjects = "";
	
	var tmp_response = gpt_log.filter(r=> r.seq == seq)[0];
	
	console.log("tmp_response"); console.log(tmp_response);
	var tmp_request = tmp_response.request;
	
	console.log("tmp_request"); console.log(tmp_request);
	
	if(misc.target_template == "admin_game.html"){
		tmp_subject_ID = "game_ID";
		tmp_subject_val = misc.ID;
		tmp_subjects = "|game_ID-" + misc.ID;
	}
	else if(misc.target_template == "admin_team.html"){
		tmp_subject_ID = "team_ID";
		tmp_subject_val = misc.data.ID;
		tmp_subjects = "|team_ID-" + misc.data.ID;
	}
	else if (misc.target_template == "admin_gpt.html"){
		if('player_ID' in misc && misc.player_ID != null){
			tmp_subjects += "|player_ID-" + misc.player_ID;
			tmp_subject_ID = "player_ID";
		}
		else if('player_ID' in tmp_request && tmp_request.player_ID != null){
			tmp_subjects += "|player_ID-" + tmp_request.player_ID;
			tmp_subject_ID = "player_ID";
		}	

		if('game_ID' in misc && misc.game_ID != null){
			tmp_subjects += "|game_ID-" + misc.game_ID;
			tmp_subject_ID = "game_ID";
		}
		else if('game_ID' in tmp_request && tmp_request.game_ID != null){
			tmp_subjects += "|game_ID-" + tmp_request.game_ID;
			tmp_subject_ID = "game_ID";
		}

		if('team_ID' in misc && misc.team_ID != null){
			tmp_subjects += "|team_ID-" + misc.team_ID;
			tmp_subject_ID = "team_ID";
		}
		else if('team_ID' in tmp_request && tmp_request.team_ID != null){
			tmp_subjects += "|team_ID-" + tmp_request.team_ID;
			tmp_subject_ID = "team_ID";
		}	

		if('opp_team_ID' in misc && misc.opp_team_ID != null){
			tmp_subjects += "|opp_team_ID-" + misc.opp_team_ID;

		}
		else if('opp_team_ID' in tmp_request && tmp_request.opp_team_ID != null){
			tmp_subjects += "|opp_team_ID-" + tmp_request.opp_team_ID;
		}			
	}
	
	tmp_subjects += "|year-" + tmp_request.year;
	tmp_league = ""
	if('data' in misc && 'league' in misc.data){
		tmp_league = misc.data.league;
	}	
	
	if(tmp_subject_ID != null){
		
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_add_to_content_table" + tmp_subjects + "|val-" + content + "|field-" + tmp_publish_date + "~-z~" + tmp_summary_header + "~-z~" + seq + "~-z~" + tmp_response.analysis + "~-z~" + misc.data.gpt_log.json_fname + "~-z~" + tmp_response.request_id + "~-z~" + misc.data.league + "~-z~" + tmp_summary_teaser + "~-z~" + tmp_highlighted_text + "~-z~" + tmp_audience_recommended + "~-z~" + tmp_recommendation_url + "~-z~" + uploaded_image_url + "~-z~" + tmp_is_intro);
	}
	else{
		console.log("No subject ID found!!!!!!!!!!")
	}
}

function escape_apostrophes(s){
	/***
	This function escapes apostrophes from text
	***/
	console.log("\n" + s);
	var res = [];
	var tmp_n = s.length;
	for(var a = 0;a<tmp_n;a++){
		if(s[a] == "'"){
			res.push("\\");	
		}
		res.push(s[a])
		
	}
	console.log(res);
	console.log(res.join(""));
	return res.join("");
}

function move_between_session_ts(dir){
	
	var session_ts_loc = misc.data.gpt_log.all_session_tags.indexOf(current_session_ts);
	var session_ts_n = misc.data.gpt_log.all_session_tags.length;
	console.log("loc=" + session_ts_loc + " n=" + session_ts_n + " dir=" + dir);
	console.log(misc.data.gpt_log.all_session_tags);
	
	if(dir == 1 && session_ts_loc < session_ts_n-1){
		// If we aren't at the end already, move to the next session and display the associated responses
		current_session_ts = misc.data.gpt_log.all_session_tags[session_ts_loc + dir];
		console.log("Move ahead to session_ts=" + current_session_ts);
		gpt_head_to_head();
	}
	else if(dir == -1 && session_ts_loc > 0){
		// If we aren't at the end already, move to the next session and display the associated responses
		current_session_ts = misc.data.gpt_log.all_session_tags[session_ts_loc + dir]
		console.log("Move back to session_ts=" + current_session_ts);
		gpt_head_to_head();
	}
}

function edit_gpt_response(field, seq, val){
	/***
	This function allows a user to edit a GPT response
	***/

	var tmp_response = gpt_log.filter(r=> r.seq == seq)[0];
	var tmp_request = tmp_response.request;
	
	//console.log("Set " + field + " to " + val);
	tmp_response.adminEdit = val;
	//console.log("tmp_response"); console.log(tmp_response);
	
	if(misc.target_template == "admin_game.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|game_ID-" + misc.ID + "|val-" + val + "|key-" + seq + "|field-" + field);
	}
	else if(misc.target_template == "admin_team.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|team_ID-" + misc.data.ID + "|val-" + val + "|key-" + seq + "|field-" + field);
	}
	else if(misc.target_template == "admin_gpt.html"){
		
		var tmp_subject_ID_val = null;
		var tmp_subject_ID = null;
		var tmp_subjects = ""
		if('player_ID' in misc && misc.player_ID != null){
			tmp_subjects += "|player_ID-" + misc.player_ID;			
			tmp_subject_ID = "player_ID";
			tmp_subject_ID_val = misc.player_ID;
		}
		else if('player_ID' in tmp_request && tmp_request.player_ID != null){
			tmp_subjects += "|player_ID-" + tmp_request.player_ID;
			tmp_subject_ID = "player_ID";
			tmp_subject_ID_val = tmp_request.player_ID;
		}	

		if('game_ID' in misc && misc.game_ID != null){
			tmp_subjects += "|game_ID-" + misc.game_ID;
			tmp_subject_ID = "game_ID";
			tmp_subject_ID_val = misc.game_ID;
		}
		else if('game_ID' in tmp_request && tmp_request.game_ID != null){
			tmp_subjects += "|game_ID-" + tmp_request.game_ID;
			tmp_subject_ID = "game_ID";
			tmp_subject_ID_val = tmp_request.game_ID;
		}

		if('team_ID' in misc && misc.team_ID != null){
			tmp_subjects += "|team_ID-" + misc.team_ID;
			tmp_subject_ID = "team_ID";
			tmp_subject_ID_val = misc.team_ID;
		}
		else if('team_ID' in tmp_request && tmp_request.team_ID != null){
			tmp_subjects += "|team_ID-" + tmp_request.team_ID;
			tmp_subject_ID = "team_ID";
			tmp_subject_ID_val = tmp_request.team_ID;
		}			
		//console.log("tmp_subject_ID: " + tmp_subject_ID);
		if(tmp_subject_ID != null){
			async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|" + tmp_subjects + "|val-" + val + "|key-" + seq + "|field-" + field);
		}
		else{
			console.log("\n\nNo subject identified!!!!!!!!!!!\n\n")
		}
	}
}
	


function score_gpt_response(seq, val){
	/***
	This function allows a user to score a GPT response when in head-to-head mode
	***/
	tag = "ranking"

	$("." + tag + "-tag" + seq + "").addClass("deselected");
	$("#" + tag + "-tag" + seq + "-" + val).removeClass("deselected");
	var tmp_response = gpt_log.filter(r=> r.seq == seq)[0];
	
	console.log("Set " + tag + " to " + val);
	var tmp_request = tmp_response.request;
	
	var n_by_user = tmp_response.ranking.filter(r=> r.uID==misc.nhca).length;
	if(n_by_user == 0){
		tmp_response.ranking.push({'uID': misc.nhca, 'ranking': val});
	}
	else{
		var tmp_r = tmp_response.ranking.filter(r=> r.uID==misc.nhca)[0];
		tmp_r.ranking = val;
	}
	console.log("tmp_response"); console.log(tmp_response);
	
	if(misc.target_template == "admin_game.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_score_response|game_ID-" + misc.ID + "|val-" + val + "|key-" + seq);
	}
	else if(misc.target_template == "admin_team.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_score_response|team_ID-" + misc.data.ID + "|val-" + val + "|key-" + seq);
	}
	else if(misc.target_template == "admin_gpt.html"){
	    var tmp_subject_ID_val = null;
		var tmp_subject_ID = null;
		var tmp_subjects = ""
		if('player_ID' in misc && misc.player_ID != null){
			tmp_subjects += "|player_ID-" + misc.player_ID;			
			tmp_subject_ID = "player_ID";
			tmp_subject_ID_val = misc.player_ID;
		}
		else if('player_ID' in tmp_request && tmp_request.player_ID != null){
			tmp_subjects += "|player_ID-" + tmp_request.player_ID;
			tmp_subject_ID = "player_ID";
			tmp_subject_ID_val = tmp_request.player_ID;
		}	

		if('game_ID' in misc && misc.game_ID != null){
			tmp_subjects += "|game_ID-" + misc.game_ID;
			tmp_subject_ID = "game_ID";
			tmp_subject_ID_val = misc.game_ID;
		}
		else if('game_ID' in tmp_request && tmp_request.game_ID != null){
			tmp_subjects += "|game_ID-" + tmp_request.game_ID;
			tmp_subject_ID = "game_ID";
			tmp_subject_ID_val = tmp_request.game_ID;
		}

		if('team_ID' in misc && misc.team_ID != null){
			tmp_subjects += "|team_ID-" + misc.team_ID;
			tmp_subject_ID = "team_ID";
			tmp_subject_ID_val = misc.team_ID;
		}
		else if('team_ID' in tmp_request && tmp_request.team_ID != null){
			tmp_subjects += "|team_ID-" + tmp_request.team_ID;
			tmp_subject_ID = "team_ID";
			tmp_subject_ID_val = tmp_request.team_ID;
		}			
		console.log("tmp_subject_ID: " + tmp_subject_ID);
		if(tmp_subject_ID != null){
			async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_score_response|" + tmp_subjects + "|val-" + val + "|key-" + seq);
		}
		else{
			console.log("\n\nNo subject identified!!!!!!!!!!!\n\n")
		}
	}
}
	
function tag_gpt_response(seq, tag, val){
	/***
	This function allows a user to score a GPT response when in head-to-head mode
	***/

	var tmp_response = gpt_log.filter(r=> r.seq == seq)[0];
	var tmp_request = tmp_response.request;
	if(tag.endsWith("rationale")){
		val = val;
	}
	else{
		val = val ? 1 : 0;
	}
	console.log("Set " + tag + " to " + val);
	
	var n_by_user = tmp_response.tags.filter(r=> r.uID==misc.nhca && r.tag == tag).length;
	if(n_by_user == 0){
		tmp_response.tags.push({'uID': misc.nhca, 'tag': tag, 'val': val});
	}
	else{
		var tmp_r = tmp_response.tags.filter(r=> r.uID==misc.nhca && r.tag == tag)[0];
		tmp_r.val = val;
	}
	console.log("tmp_response"); console.log(tmp_response);
	
	var tmp_subject_ID_val = null;
	var tmp_subject_ID = null;
	var tmp_subjects = ""
	if('player_ID' in misc && misc.player_ID != null){
		tmp_subjects += "|player_ID-" + misc.player_ID;			
		tmp_subject_ID = "player_ID";
		tmp_subject_ID_val = misc.player_ID;
	}
	else if('player_ID' in tmp_request && tmp_request.player_ID != null){
		tmp_subjects += "|player_ID-" + tmp_request.player_ID;
		tmp_subject_ID = "player_ID";
		tmp_subject_ID_val = tmp_request.player_ID;
	}	

	if('game_ID' in misc && misc.game_ID != null){
		tmp_subjects += "|game_ID-" + misc.game_ID;
		tmp_subject_ID = "game_ID";
		tmp_subject_ID_val = misc.game_ID;
	}
	else if('game_ID' in tmp_request && tmp_request.game_ID != null){
		tmp_subjects += "|game_ID-" + tmp_request.game_ID;
		tmp_subject_ID = "game_ID";
		tmp_subject_ID_val = tmp_request.game_ID;
	}

	if('team_ID' in misc && misc.team_ID != null){
		tmp_subjects += "|team_ID-" + misc.team_ID;
		tmp_subject_ID = "team_ID";
		tmp_subject_ID_val = misc.team_ID;
	}
	else if('team_ID' in tmp_request && tmp_request.team_ID != null){
		tmp_subjects += "|team_ID-" + tmp_request.team_ID;
		tmp_subject_ID = "team_ID";
		tmp_subject_ID_val = tmp_request.team_ID;
	}	

	if(misc.target_template == "admin_game.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|game_ID-" + misc.ID + "|field-" + tag + "|val-" + val + "|key-" + seq);
	}
	else if(misc.target_template == "admin_team.html"){
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|team_ID-" + misc.data.ID + "|field-" + tag + "|val-" + val + "|key-" + seq);
	}
	else{
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_tag_response|" + tmp_subjects + "|field-" + tag + "|val-" + val + "|key-" + seq);
	}
}
	
	

function approve_gpt_for_publication(seq){
	/***
	This function is triggered by a user clicking the approve button. It basically sets the value of the Manual panel's textarea to the approved GPT output and switches the panel. This updates the database and will lead to the recap being published.
	***/
	
	var tmp_gpt = gpt_log.filter(r=> r.seq == seq)[0];
	
	console.log(tmp_gpt);
	toggle_league("manual")
	document.getElementById('content_obj').value = tmp_gpt.html;
	
}

function submit_to_chatbot(tag, ID, gpt_panel="v1"){
	/***
	This button sends the content of the prompt to the both. 
	***/
	
	brief_hide_in_seconds('submit_to_chatbot_button', 1);
	var prompt_val = document.getElementById('gpt_log_new_prompt_input').value.trim();
	var val = prompt_val;
	var submit_prompt = 1;
	$("#gpt_response_msg_div").addClass("hidden");
	
	if(prompt_val == ""){
		submit_prompt = 0;
	}
	
	
	if(submit_prompt){
		gpt_log.push({'seq': gpt_log.length + 1, 'type': 'prompt', 'text': val, 'gpt_panel': gpt_panel});
		redraw_gpt_convo();
		async_run(null, null, "handler-laxref_gpt|action-laxref_gpt_request_conversation|" + tag + "-" + ID + "|val-" + val + "|key-" + gpt_panel);
	}
}

function display_player_card_noauth(seq){
    /***
    In the roster view, there is a plus sign icon that allows you to do a level deeper on a particular player. If the user is a noauth user, then they can see the card, but they won't see the actual numbers. The structure is exactly the same as in display_player_card, but the numbers are not visible.
    ***/
    

    
    
    //console.log("roster"); console.log(roster);
    if(!(roster instanceof Array) && 'keys' in roster){
		// Create the object that is getting displayed as a dict because it's currently being stored as a list of values and the function below needs a dict.
		p = {}
		var keys_to_switch = ['role', 'EGA_per_game', 'EGA', 'shooting_pct', 'player', 'pro_url_tag', 'share_adjusted_assist_rate', 'excess_goals_scored', 'turnover_rate', 'weighted_team_play_shares', 'share_of_team_assists', 'share_of_team_shots', 'on_goal_shooting_pct', 'faceoff_wins', 'faceoff_losses', 'on_keeper_sog_faced', 'faceoff_win_rate', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'excess_saves_per_sog', 'goals_allowed', 'excess_goals_per_shot', 'goals', 'assists', 'shots', 'turnovers', 'devittes', 'weighted_play_shares_rank_str', 'usage_adjusted_EGA', 'faceoff_EGA_rank_str', 'gbs', 'faceoff_record', 'excess_saves', 'save_pct', 'save_pct_rank_str', 'shots_faced', 'saves', 'goals_allowed', 'player_ID', 'caused_turnover_share', 'caused_turnovers', 'penalties', 'defensive_EGA_rank_str'];
		var loc = roster.keys.indexOf('seq');
		var rk_specs = {'keys': roster.keys}
		for(var a = 0;a<roster.data.length;a++){
			if(get_field(roster.data[a], 'seq', {'loc': loc}) == seq){
				for(var b = 0;b<keys_to_switch.length;b++){
					p[keys_to_switch[b]] = get_field(roster.data[a], keys_to_switch[b], rk_specs)
				}
			}
		}
		
		p = [p];
	}
	else{
		p = roster.filter(r=> r.seq == seq);
	}
    if(p.length == 0){
        // Fail
        //report_js_visualization_issue(misc.target_template + "|display_player teamID=" + misc.data.ID + " seq=" + seq + "|" + misc.nhca);
        player_html = "";
    }
    else{
        p = p[0];

        //console.log("Display player"); console.log(p)
        
        loops = [{'tag': 'rate', 'div_style': 'padding-top:20px; padding-bottom:30px;', 'id': 'player_overlay_rate_stats'}, {'tag': 'cnt', 'div_style': '', 'id': 'player_overlay_cnt_stats'}];
        roles = []
        
        tmp = {'tag': 'offensive', 'desc': 'Offense', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game_rank_str', 'label': 'EGA Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'play_shares_rank_str', 'dtop_label': 'Team Play Share Rank', 'mob_label': 'Team Share Rnk', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'shooting_pct', 'label': 'Shooting Pct', 'jsfmt': "1%"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'shots', 'label': 'Shots Taken', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'turnovers', 'label': 'Turnovers', 'jsfmt': "0"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'excess_goals_scored', 'label': 'Excess Goals', 'jsfmt': "2"})
        tmp.fields.push({'type': 'cnt', 'tag': 'excess_goals_per_shot', 'label': 'Excess Goals/Shot', 'jsfmt': "2"})
        
        roles.push(tmp);
        
        tmp = {'tag': 'defensive', 'desc': 'Defense', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'defensive_EGA_rank_str', 'label': 'Def EGA Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'penalties', 'label': 'Penalties', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'caused_turnover_share', 'label': 'Share of Team CTs', 'jsfmt': "0%"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'caused_turnovers', 'label': 'Caused Turnovers', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'gbs', 'label': 'Ground balls', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        roles.push(tmp);
        
        tmp = {'tag': 'faceoff', 'desc': 'Faceoff', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'EGA_per_game', 'label': 'EGA/gm', 'jsfmt': "2"})
        tmp.fields.push({'type': 'rate', 'tag': 'faceoff_EGA_rank_str', 'label': 'FO EGA Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'season_faceoff_ELO_rank_str', 'label': 'FO ELO Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'faceoff_win_rate', 'label': 'Faceoff Win Rate', 'jsfmt': "1%"})
        
        tmp.fields.push({'type': 'cnt', 'tag': 'faceoff_record', 'label': 'Faceoff Record', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'gbs', 'label': 'Ground balls', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals', 'label': 'Goals', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'assists', 'label': 'Assists', 'jsfmt': "0"})
        roles.push(tmp);
        
        tmp = {'tag': 'goalkeeper', 'desc': 'Goalkeeper', 'fields': []};
        tmp.fields.push({'type': 'rate', 'tag': 'excess_saves', 'label': 'Excess Saves', 'jsfmt': "2"})
        //tmp.fields.push({'type': 'rate', 'tag': 'excess_saves_rank_str', 'label': 'Excess Saves Rank', 'jsfmt': ""})
        tmp.fields.push({'type': 'rate', 'tag': 'save_pct', 'label': 'Save Pct', 'jsfmt': "1%"})
        //tmp.fields.push({'type': 'rate', 'tag': 'save_pct_rank_str', 'label': 'Save Pct Rank', 'jsfmt': "1%"})
        tmp.fields.push({'type': 'cnt', 'tag': 'shots_faced', 'label': 'Shots Faced', 'jsfmt': "0"})
        
		tmp.fields.push({'type': 'cnt', 'tag': 'on_keeper_sog_faced', 'label': 'S.O.G. Faced', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'saves', 'label': 'Saves', 'jsfmt': "0"})
        tmp.fields.push({'type': 'cnt', 'tag': 'goals_allowed', 'label': 'Goals Allowed', 'jsfmt': "0"})
        roles.push(tmp);
        
        role = roles.filter(r=> r.tag == p.role || (r.tag == "offensive" && p.role == null))[0];
        
        loop_after = on_mobile ? 2 : 4;
        player_content = "";

        player_content += "<div class='col-12 centered'><span class='centered font-24'>PRO's player cards make it easy to see all the relevant stats for a single player in one place, without having to navigate between pages.</span></div>";
        player_content += "<div class='col-12 centered' style='padding-top:30px;'><span class='centered font-24'>Until now, a player's information has been spread all over various sites with no easy single player view. PRO fixes that.</span></div>";


        for(var b = 0;b<loops.length;b++){ loop = loops[b];
            
            player_content += "<div class='no-padding' id='" + loop.id + "' style='" + loop.div_style + "'>";
            
            loop_fields = role.fields.filter(r=> r.type == loop.tag);
            // Add rate/EGA data
            for(var a = 0;a<loop_fields.length;a++){
                f = loop_fields[a];
                if(a % loop_after == 0){
                    player_content += "<div class='player-card-row flex'>";
                }
                val = f.tag in p ? (p[f.tag] == null ? "N/A": p[f.tag]) : "N/A";
                
                player_content += "<div class='no-padding col-3-6'>";
                if('dtop_label' in f){
                    player_content += "<div class='no-padding'><span class='mob light font-15'>" + f.mob_label + "</span><span class='dtop light font-15'>" + f.dtop_label + "</span></div>";
                }
                else{
                    player_content += "<div class='no-padding'><span class='light font-15'>" + f.label + "</span></div>";
                }
                player_content += "<div class='no-padding'><span class='bold font-24'>" + "###" + "</span></div>";
                player_content += "</div>";
                
                if(a % loop_after == (loop_after-1) || a == role.fields.length-1){
                    player_content += "</div>";
                }
            }
            
            // Wrap-up
            player_content += "</div>";
        }    
            
        
        
        if(misc.target_template.indexOf("basic") == 0){
            player_link = "/basic_player_detail";
        }
        else if(misc.target_template.indexOf("team") == 0){
            player_link = "/team_player_detail";
        }
        player_html = "<div class='col-12 flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>" + p.player + "</span>";
        //player_html += "<FORM id='player_detail_form" + p.player_ID + "' action='" + player_link + "' method=POST><img class='font-36 popout-icon' style='padding-left:15px;' src=\"static/img/popout25.png\" /></FORM>";
        
        player_html += "</div>";
        player_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
        player_html += "<div class='col-12 exp-scroll bigger'>" + player_content + "</div>";
        
        
    }
   
    var logger_str = null;

    html = '';
    html += '<div class="flex" style="max-height:450px; margin:5px;">';
        html += '<div class="col-1"></div>';
        html += '<div class="col-10 popup-content">';
        html += player_html;
       
        html += '</div>';
        html += '<div class="col-1"></div>';
    html += '</div>';

    $("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");

    if('observe' in misc && misc.observe && (!('flagged_as_robot' in misc) || !misc.flagged_as_robot)){ report_user_view(misc.handler + "|player_card|" + misc.nhca); }

}

    
    
function choose_left_menu_item(id){
    /***
    Many of the html pages use the left-menu, right-panels design to allow the user to go between the various content areas without having to reload anything. The id argument is coordinated so that we can both set the correct menu-item to be highlighted and set the correct right-panel to be active.
    ***/
    
    
    
    id = id.replace("_menu_item", "");
    //console.log("Enable " + id);
    if(typeof active_panel != "undefined"){ active_panel = id; }
    
    $(".left-menu-item").removeClass("active");
    $(".right-content-panel").removeClass("active");
    $("#" + id + "_menu_item").addClass("active");
    $("#" + id + "_panel").addClass("active");
    $("#top_menu_select").val(id);
    $("#active_element_input").val(id);
    
    
    
    redraw(id);
    if(id == "team_lines" && !post_requests['display_line_groupings']){
        async_run(null, null, "handler-team_my_roster|team_ID-" + misc.data.ID + "|action-display_line_groupings|year-" + misc.year);
    }
}

function acknowledge(IDs){
    /***
    When we display a notification for a user, they have the ability to acknowledge that they have seen it. This hides the message and triggers this function, which stores the notification in the database by sending a pixel message back to the logger Handler.
    ***/
    if(IDs != null && IDs != ""){ document.getElementById('pixel').src = "/logger-acknowledgeNotif?c=" + IDs; }
}

function display_notifications(notifications){

    /***
    If there are notifications for the user, they get visualized in a banner bar above their other content. This function creates that HTML/CSS and displays it. Not all notifications can be closed, which is why that logic exists. These persist, but others can be x'd out by the user.
    ***/
    
    
    var banner_elem = $("#banner"); banner_elem.empty();
    var template_acknowledge_elem = $("#template_notification_acknowledge_div"); template_acknowledge_elem.empty();
    
    //console.log('a) typeof notifications != "undefined": ' + (typeof notifications != "undefined"));
	//console.log('b) notifications != null: ' + (notifications != null));
	//if(notifications != null){
	//	console.log('c) notifications.length > 0: ' + (notifications.length > 0));
	//}
	
	
    if(typeof notifications != "undefined" && notifications != null && notifications.length > 0){
        var allow_banner_close = true; var allow_template_close = true;
        var show_banner_notification = 0; var show_template_notification = 0;
        var n = null; var banner_IDs = []; var template_IDs = [];
        for(var a = 0;a<notifications.length;a++){
            n = notifications[a];
            if(!('banner' in n) || n.banner){
                
                if(n.notification_target_template == null || misc.target_template == n.notification_target_template){
                    n.is_displayed = 1;
                    if(!n.seen){
                        n.seen = 1;
                        if(misc.target_template != "create_notification.html"){
                            console.log("User has now viewed notification ID " + n.ID);
                            mark_notification_seen(n);
                        }
                    }
                    // Is a banner notification
                    show_banner_notification = 1;
                    banner_IDs.push(n.ID)
                    if(n.persistent){ allow_banner_close = false; }
                    
                    if('nospan' in n && n.nospan==1){
                        n.final_html = "<div class='no-padding'>" + n.html + "</div>";
                    }
                    else{
                        n.final_html = "<div class='no-padding'><span style='padding-left:10px;' class='font-12'>" + n.html + "</span></div>";
                    }
                    banner_elem.append(n.final_html);
                }
            }
            else if(n.notification_target_div != null){
                // Check if the notification is tied to a specific template
                if(n.notification_target_template == null || misc.target_template == n.notification_target_template || misc.target_template == "create_notification.html"){
                    n.is_displayed = 1;
                    
                    
                    // Show the notification in the div specified by the notification_target_div field
                    var template_elem = $("#" + n.notification_target_div); template_elem.empty();
                    show_template_notification = 1;
                    template_elem.addClass("active");
                    
                    template_IDs.push(n.ID)
                    if(n.persistent){ allow_template_close = false; }
                    
                    if('nospan' in n && n.nospan==1){
                        n.final_html = "<div class='no-padding'>" + n.html + "</div>";
                    }
                    else{
                        n.final_html = "<div style='padding:10px;' class='no-padding'><span class='contents lh-30 font-18'>" + n.html + "</span></div>";
                    }
                    
                    if(allow_template_close){
                        var close_html = "";
                        close_html = "<a class='font-15 bold text-button site-blue'>OK</a>";
                        close_html = "<div class='no-padding right pointer'><span onclick='$(\"#" + n.notification_target_div + "\").removeClass(\"active\"); mark_notification_acknowledged(" + n.ID + ")' class='pointer' style='padding-right:20px;'>" + close_html + "</span></div>";
                        console.log(close_html);
                        n.final_html += close_html; //template_acknowledge_elem.append(close_html);
                    }
                    template_elem.append(n.final_html);
                    
                    // User can see the notification when it is printed
                    //if (template_elem.is(":visible")){
                    if (!n.seen && template_elem.is(":visible") && isScrolledIntoView(template_elem)){
                        // Mark the notification as having been viewed
                        
                        if(misc.target_template != "create_notification.html"){
                            console.log("User has now viewed notification ID " + n.ID);
                            mark_notification_seen(n);
                        }
                        n.seen = 1;
                
                    }
                    
                }
            }
        }
        
        if(show_banner_notification){
            banner_elem.css("background-color", "#EFE").css("text-align", "left").css("display", "block");
        }
        if(allow_banner_close && show_banner_notification){
            var close_html = "";
            close_html = "<a class='font-12 text-button' onclick='$(\"#banner\").addClass(\"closed\"); acknowledge(\"" + banner_IDs.join(".") + "\")'>OK</a>";
            close_html = "<div class='no-padding right pointer'><span class='pointer' style='padding-right:20px;'>" + close_html + "</span></div>";
            banner_elem.append(close_html);
        }
        if(allow_template_close && show_template_notification){
            var close_html = "";
            close_html = "<a class='font-12 text-button'>OK</a>";
            close_html = "<div class='no-padding right pointer'><span onclick='$(\"#template_notification_div\").addClass(\"hidden\"); acknowledge(\"" + template_IDs.join(".") + "\")' class='pointer' style='padding-right:20px;'>" + close_html + "</span></div>";
            template_acknowledge_elem.append(close_html);
        }
		if(!show_banner_notification){
			banner_elem.css("display", "none");
		}
    }
    else{
        banner_elem.css("display", "none");
    }
    
    
    
    
}

function check_notifications_for_visibility(){
    /***
    This function checks whether a user has scrolled in such a way that a notification that was not initially visible has been made visible.
    ***/
    if(typeof notifications == "undefined"){
        // this template needs a var notifications line instead of pulling user_obj.notifications|safe every time.
    }
    else{
        tmp_notifications = notifications.filter(r => !r.seen);
        for(var a = 0;a<tmp_notifications.length;a++){
            var n = tmp_notifications[a];
            template_elem = $("#" + n.notification_target_div);
            if(template_elem.is(":visible") && isScrolledIntoView(template_elem)){
                if(misc.target_template != "create_notification.html"){
                    console.log("User has now viewed notification ID " + n.ID);
                    mark_notification_seen(n);
                }
                
                n.seen = 1;
            }
        }
    }
}

function mark_notification_seen(notification){
    /***
    This function is triggered when a notification is made visible to a user. It calls a async POST that tells the backend to update the LRP_Notifications record for the appropriate notification record. This is important because some notifications are supposed to be show one time only.
    ***/
    
    //console.log("Mark notification seen...");
    //console.log(notification);
    
    // If the notification is from the one to many table structure (LRP_Notifications for definition; LRP_User_Notifications for routing to a user), we need to know that so that the right notification table can be updated
    var is_user_notification = notification.user_notification_ID != null ? 1 : 0;
    var relevant_ID = notification.user_notification_ID != null ? notification.user_notification_ID : notification.ID;
    async_run(null, 0, "handler-notifications|action-mark_notification_viewed|val-" + is_user_notification + "|field-" + relevant_ID + "|key-" + misc.nhca);
}

function mark_notification_acknowledged(notification_ID){
    /***
    This function is triggered when a notification is marked by the user as acknowledged. It calls a async POST that tells the backend to update the LRP_Notifications record for the appropriate notification record. This is important because some notifications are supposed to be shown until the user acknowledges them.
    ***/
    
    console.log("Mark notification seen...");
    async_run(null, 0, "handler-notifications|action-mark_notification_acknowledged|field-" + notification_ID + "|key-" + misc.nhca);
}

function preliminary_button_click(div_id_prefix){
	/***
	Instead of clicking a button and automatically having the associated action be done, I want to have users click a button and then get a chance to confirm that they intended the action to be taken. This function relies on having two versions of a button available. The first, when clicked, reveals a confirm version. This function handles that display process.
	***/
	console.log("confirm: " + div_id_prefix);
	
	// Hide preliminary button
	$("#" + div_id_prefix + "_preliminary_div").addClass("hidden");
	
	// If there is a message to be shown to the user as a nudge or context, display it here.
	if(document.getElementById(div_id_prefix + "_confirmation_div") != null){
		$("#" + div_id_prefix + "_confirmation_div").removeClass("hidden");
		$("#" + div_id_prefix + "_final_div").removeClass("hidden");
	}
	
}

function submenu_toggle(id, only_if_open=false){
	
	console.log("id=" + id);
    if(id != null){
        var elem_name = id + '_div';
        elem = $("#" + elem_name); elem.empty();
        
        html = "";
            
        
		if(id.indexOf("gpt_paragraph_") == -1 && id.indexOf("gpt_article_") == -1){
			html += "<img class='icon-5 submenu-icon' id='" + id + "_icon' menu='" + id + "' src='static/img/verticaldotmenu.png' />";
		}
		else{
			html += "<div class='no-padding mouseover-image'><img src='/static/img/horizontaldotmenu.png' class='submenu-icon' menu='" + id + "' /></div>";
		}
		
        html += "<div class='threedot-submenu' style='margin: 0; position: absolute; right: inherit; width: 150px; height: 100%;'>";
        
            
        
            html += '<div id="menu_modal_' + id + '" class="submenu-content" style="width:150px;">';
                
                if(id == "embed_preview"){
                    html += "<a class='font-15' id='fElo_link' href='/embed_docs'><span class='no-padding contents'>Embed Docs</span></a>";
                }
                else if(id == "embed_generator"){
                    html += "<a class='font-15' id='fElo_link' href='/'><span class='no-padding contents'>Home</span></a>";
                }
                else if(id == "embed_billing_header"){
                    html += "<a class='font-15' id='change_tier_link' href='/product-pricing-embed'><span class='no-padding contents'>Edit Tier</span></a>";
                    html += "<a class='font-15' id='update_payment_info' href='/payment-settings'><span class='no-padding contents'>Update Payment</span></a>";
                }
                else if(id == "embed_trial_header"){
                    html += "<a class='font-15' id='update_payment_info' href='/payment-settings'><span class='no-padding contents'>Add Payment</span></a>";
                }
                else if(id.indexOf("gpt_paragraph_") > -1){
					
		
					var pgh = gpt_paragraphs.filter(r=> r.seq == parseInt(elem.attr("pghseq")))[0];

                    html += "<div class='no-padding'><span class='pointer font-12' onclick='open_edit_paragraph_modal(\"" + pgh.paragraph_span_tag + "\", \"" + pgh.request_id + "\", " + pgh.gpt_seq + ", "  + pgh.seq + ");'>Edit + Feedback</span></div>";
					html += "<div class='no-padding'><span class='pointer font-12' onclick='request_gpt_paragraph_alternatives(\"" + pgh.paragraph_span_tag + "\", \"" + pgh.request_id + "\", " + pgh.gpt_seq + ", "  + pgh.seq + ");'>Request Revision</span></div>";html += "<div class='no-padding'><span class='pointer font-12' onclick='open_auto_edit_paragraph_modal(\"" + pgh.paragraph_span_tag + "\", \"" + pgh.request_id + "\", " + pgh.gpt_seq + ", "  + pgh.seq + ");'>View Auto-Log</span></div>";
                }
                else if(id.indexOf("gpt_article_") > -1){
                    html += "<div class='no-padding'><span class='pointer font-12' onclick=''>Regenerate</span></div>";
                }
                    
            html += "</div>";
        html += "</div>";
        elem.append(html);
        
        $( "#" + id + "_icon" ).click(function( event ) { event.stopPropagation(); submenu_toggle(this.getAttribute("menu")); });
    
    
        tags = {'explore': ''}; // 'dtop': 1, 'mob': 1};

        var elem_name = 'menu_modal_' + id;
        if(document.getElementById(elem_name) != null){
            var cur = document.getElementById(elem_name).style.display;
			//console.log("Cur style: " + cur);
            if(["none",""].indexOf(cur) > -1){
                if(!only_if_open){
                    document.getElementById(elem_name).style.display = "block";
                    document.getElementById('pixel').src = "/logger-jsEvent?c=" + [13, misc.nhca].join("|");
                }
            }
            else{
                document.getElementById(elem_name).style.display = "none";    
            }
        }
        else{
            console.log("Sub-menu objects have not been created correctly...");
        }
    }
    else{
        //console.log("Remove all threedot-submenus");
        $(".threedot-submenu").remove();
    }
	$( ".submenu-icon" ).click(function( event ) { event.stopPropagation(); submenu_toggle(this.getAttribute("menu")); });
    
}


function finish_load(notifications){
    /***
    There are some JS tasks that have to happen on every page (for the most part), by calling finish_load, we can define those tasks once, rather than have to define them on every page load
    ***/
    
    /*** 
    In many cases, when we click an icon, we don't want the click to flow through to the parent div (i.e. card in most cases), so we use the stopPropagation command to ensure that the action only gets triggered for the icon
    ***/
    console.log("Finish load");
    $( "#threedot" ).click(function( event ) { event.stopPropagation(); menu_toggle(); });
    $( ".submenu-icon" ).click(function( event ) { event.stopPropagation(); submenu_toggle(this.getAttribute("menu")); });
    $( "#personicon" ).click(function( event ) { event.stopPropagation(); menu_toggle(); });
    $(".icon-15.explanation").click(function( event ) {  event.stopPropagation(); async_request_explanation(this.getAttribute("value")); });
    $(".icon-10.explanation").click(function( event ) {  event.stopPropagation(); async_request_explanation(this.getAttribute("value")); });
    $(".icon-15.settings").click(function( event ) {  event.stopPropagation(); });
    $(".icon-15.toggle").click(function( event ) {  event.stopPropagation(); });
    $(".dashboard-tile-content").click(function( event ) { event.stopPropagation(); });
   
    /*** 
    If there are any notifications, display them in the banner /notifications bar
    ***/
    console_log.push({'msg': 'Start display_notifications...'});
    display_notifications(notifications);

    /*** 
    Set the current status of any settings objects that the user previously changed (i.e. the year they are looking at)
    ***/
    console_log.push({'msg': 'Start apply_user_settings...'});
    apply_user_settings();
    
    /***
    Some pages have an "Explore" menu option, which is used to surface non-primary but still useful features. These features are specific to the product (basic/team/media), so we use the target template to ID which product the user is on. From there, we use JQuery to build the menu and the associated links.
    ***/
    
	var is_team = 
    prefix = "basic_";
    if(typeof misc != "undefined" && misc != null && typeof misc != "undefined" && 'target_template' in misc){
        if(misc.target_template.indexOf("team") == 0 || ('route' in misc && misc.route.indexOf("team") == 0)){ prefix = "team_"; }
        else if(misc.target_template.indexOf("media") == 0){ prefix = "media_"; }
    }
	
	//console.log("prefix_: " + prefix)
    
    if(typeof misc != "undefined" && misc != null && document.getElementById("explore_menu_item") != null){
        elem = $("#explore_menu_item"); elem.empty();
        html = "";
        
		if(prefix == "team_"){
			
			//html += "<div class='no-padding'><a class='menu-link'><span class='menu-link' style=''><span class='font-15 pointer'>Explore<span class='new-label'>NEW</span></span></span></a></div>";
			html += "<div class='no-padding'><a class='menu-link'><span class='menu-link' style=''><span class='font-15 pointer'>Explore</span></span></a></div>";
		}
		else{
			html += "<div class='no-padding'><a class='menu-link'><span class='menu-link' style=''><span class='font-15 pointer'>Explore</span></span></a></div>";
		}
		
        html += "<div class='submenu'>";
        
            
			//<span class='new-label'>NEW</span>
            html += '<div id="menu_modal_explore" class="submenu-content" style="">';
                if(prefix == "team_"){
                    html += "<a class='font-15' id='stats_link' href='/" + prefix + "stats'><span class='no-padding contents'>Stats</span></a>";
                    html += "<a class='font-15' id='players_link' href='/" + prefix + "players'><span class='no-padding contents'>Players</span></a>";
                    html += "<a class='font-15' id='practice_link' href='/" + prefix.replace("_", "-") + "practice-home'><span class='no-padding contents'>Practices</span></a>";
                    html += "<a class='font-15' id='scheduler_link' href='/" + prefix.replace("_", "-") + "scheduler'><span class='no-padding contents'>Smart Scheduler</span></a>";
                    //html += "<a class='font-15' id='players_link' href='/" + prefix + "my_social'><span class='no-padding contents'>Highlights</span></a>";
                    html += "<a class='font-15' id='watch_list_link' href='/player-watch-list'><span class='no-padding contents'>Watch List</span></a>";
                    html += "<a class='font-15' id='research_link' href='/" + prefix + "research'><span class='no-padding contents'>Research</span></a>";
                    
                }
                else if('is_team_sub' in misc && misc.is_team_sub){
                    html += "<a class='font-15' id='stats_link' href='/team_stats'><span class='no-padding contents'>Stats</span></a>";
                    html += "<a class='font-15' id='players_link' href='/team_players'><span class='no-padding contents'>Players</span></a>";
                    html += "<a class='font-15' id='practice_link' href='/team-practice-home'><span class='no-padding contents'>Practices</span></a>";
                    html += "<a class='font-15' id='scheduler_link' href='/team-scheduler'><span class='no-padding contents'>Smart Scheduler</span></a>";
                    //html += "<a class='font-15' id='players_link' href='/team_my_social'><span class='no-padding contents'>Highlights</span></a>";
                    html += "<a class='font-15' id='watch_list_link' href='/player-watch-list'><span class='no-padding contents'>Watch List</span></a>";
                    html += "<a class='font-15' id='research_link' href='/team_research'><span class='no-padding contents'>Research</span></a>";
					
				}
				else if(misc.target_template.indexOf("basic") == 0 || misc.target_template.indexOf("embed") == 0){
                    if(misc.product_t > 2){
                        html += "<a class='font-15' id='ama_link' href='/" + prefix + "ama_home'><span class='no-padding contents'>Ask LRP</span></a>";
                    }
                    html += "<a class='font-15' id='projections_link' href='/" + prefix + "schedule'><span class='no-padding contents'>Schedule</span></a>";
                    html += "<a class='font-15' id='watch_list_link' href='/player-watch-list'><span class='no-padding contents'>Watch List</span></a>";
                    html += "<a class='font-15' id='projections_link' href='/" + prefix + "projections'><span class='no-padding contents'>Projections</span></a>";
                    html += "<a class='font-15' id='fElo_link' href='/" + prefix + "faceoff_elo'><span class='no-padding contents'>Faceoff Elo</span></a>";
                    html += "<a class='font-15' id='excess_saves_link' href='/" + prefix + "excess_saves'><span class='no-padding contents'>Excess Saves</span></a>";
                    if(1 || [3, 6, 7].indexOf(misc.product_i) > -1){
                        html += "<a class='font-15' id='research_link' href='/basic_research'><span class='no-padding contents'>Research</span></a>";
                    }
                }
                else{
                    html += "<a class='font-15' id='projections_link' href='/" + prefix + "schedule'><span class='no-padding contents'>Schedule</span></a>";
                    html += "<a class='font-15' id='watch_list_link' href='/player-watch-list'><span class='no-padding contents'>Watch List</span></a>";
                    html += "<a class='font-15' id='projections_link' href='/" + prefix + "projections'><span class='no-padding contents'>Projections</span></a>";
                    html += "<a class='font-15' id='fElo_link' href='/" + prefix + "faceoff_elo'><span class='no-padding contents'>Faceoff Elo</span></a>";
                    html += "<a class='font-15' id='excess_saves_link' href='/" + prefix + "excess_saves'><span class='no-padding contents'>Excess Saves</span></a>";
                }
            html += "</div>";
        html += "</div>";
        elem.append(html);
        
        $( "#explore_menu_item" ).click(function( event ) { event.stopPropagation(); explore_toggle(); });
    }
    
    /*** 
    Change color of main logo; this will be used for the testing script to confirm that all JS was run successfully
    ***/
    if($("#main_logo").css("color") == "rgb(51, 51, 51)"){
        document.getElementById("main_logo").style.color = "rgb(51, 51, 52)";
    }
    else if($("#main_logo").css("color") == "rgb(255, 255, 255)"){
        document.getElementById("main_logo").style.color = "rgb(255, 254, 254)";
    }
    
    
    // We can choose to display the load diagnostics panel via a URL argument
    if(typeof misc != "undefined" && 'auto_show_time_log' in misc && misc.auto_show_time_log){
        show_load_diagnostics();
    }
	
	// Add title information to all left-hand menu item divs (so that we can easily see how to change the ?view in the URL to go straight there
	if('nhca' in misc && misc.nhca == 1){
		document.addEventListener("DOMContentLoaded", function () {
		  document.querySelectorAll('.left-menu-item').forEach(function (el) {
			const id = el.id;
			if (id && id.endsWith('_menu_item')) {
			  const titleText = id.replace(/_menu_item$/, '');
			  el.setAttribute('title', titleText);
			}
		  });
		});
	}
}

function inchesToFeetInches(inches) {
	if(inches == null){ return ""; }
	if(inches == ""){ return ""; }
	inches=parseInt(inches)
    const feet = parseInt(Math.floor(inches / 12));
    const remainingInches = parseInt(inches % 12);
    return `${feet}'${remainingInches}"`;
}

function toggle_fogo_filter(tag_type, val){
    /***
    This function is triggered when the user changes a setting in the fogo scouting section. The tag_type and val are defined in the input definition. They aree stored in the fogo specs object, which is read when the function runs to display the content. This function also switches the classes from tag-on to tag-off as needed.
    ***/
    //console.log(tag_type, val);
    $("." + tag_type + "_tag").removeClass("tag-on").addClass("tag-off"); 
    $("#" + val + "_view_tag").removeClass("tag-off").addClass("tag-on"); 
    fogo_specs[tag_type] = val;
    if('handler' in misc && misc.handler.indexOf("schedule") > -1){
        display_next_game_faceoffs("next_game_faceoffs");
    }
    else{
        display_faceoffs("faceoffs");
    }
    
}

function switch_fogo_focus(player_ID){
    /***
    This function switches which FOGO is being displayed. The updated value is stored in fogo_specs, which is read by the display_next_game_faceoffs function to pull up the right player's information.
    ***/
	console.log("Switch focus to player ID: " + player_ID);
    fogo_specs.fogo_player_ID = parseInt(player_ID);
    if('handler' in misc && misc.handler.indexOf("schedule") > -1){
        display_next_game_faceoffs("next_game_faceoffs");
    }
    else{
        console.log("display faceoffs with pID " + fogo_specs.fogo_player_ID);
        display_faceoffs("faceoffs");
    }
}
    
function unhide_keys(unit){
    /***
    By default, only 6 unit-level keys are shown. Users can see the rest by clicking the See More label.
    ***/

    $("." + unit + "-hidden").removeClass("hidden");
    $("#" + unit + "_see_more_div").addClass("hidden");
}

function display_fogo_quarter_and_sequence_splits(misc, fogo_specs, id, is_individual_page){
    /***
    This function generates the graphic that shows a particular FOGO and their splits by quarter and by sequence along with some career stats.
    ***/
    
    // Data
    
    var fogos = null; var div_prefix = ""; 
    if('handler' in misc && misc.handler.indexOf("schedule") > -1){
        //fogos = misc.data.next_game.opp_fogos;
		fogos = [];
		if('flag6022' in misc && misc.fogo_metadata != null){
			fogos = misc.fogo_metadata;
		}
		else if('next_game_opp_fogo_metadata' in misc.data && misc.data.next_game_opp_fogo_metadata != null){
			fogos = misc.data.next_game_opp_fogo_metadata;
		}
		else {
			$("#fogo_splits_content").empty();
			$("#fogo_splits_content").append(single_stat.split("</div>")[1].replace('[stat]', "Season data is not available. Check back soon."));
			
		}
		console.log("4806.fogos"); console.log(fogos);
		for(var ay = 0;ay<fogos.length;ay++){ var tmp_fogo = fogos[ay];
			if(!('season_data' in tmp_fogo)){ tmp_fogo.season_data = {'n': 0}; }
		}
		fogos = fogos.sort(function(a, b){ return (b.season_data.n == null ? 0 : b.season_data.n) - (a.season_data.n == null ? 0 : a.season_data.n); });
        div_prefix = "next_game_";   
		console.log("Route A")
		console.log("Opp roster"); console.log(misc.data.next_game.opp_roster_list_and_keys)
		player_loc = misc.data.next_game.opp_roster_list_and_keys.keys.indexOf("player")
		player_ID_loc = misc.data.next_game.opp_roster_list_and_keys.keys.indexOf("player_ID")
	
		for(var a = 0;a<fogos.length;a++){ var tmp_fogo = fogos[a];
			tmp_rec = misc.data.next_game.opp_roster_list_and_keys.data.filter(r=> r[player_ID_loc] == tmp_fogo.pID);
			console.log(tmp_fogo.pID, player_ID_loc, "len=" + tmp_rec.length);
			//console.log(tmp_rec);
			if(tmp_rec.length > 0){
				tmp_fogo.player = tmp_rec[0][player_loc];
			}
			console.log(tmp_fogo)
		}

    }
	else if(is_individual_page){ // This is for an individual player's detail page, so there's no list of FOGOs
		fogos = null; // use the misc_dot_player_data instead
		//console.log("Route B")
	}
    else{
		if('roster_list_and_keys' in misc.data){
			tmp_role_loc = misc.data.roster_list_and_keys.keys.indexOf('role');
			fogos = []
			tmp_fogos = misc.data.roster_list_and_keys.data.filter(r=> r[tmp_role_loc] == "faceoff");
			var rk_specs = {'keys': misc.data.roster_list_and_keys.keys};
			var tmp_roster = [];
			var keys_to_switch = ['role', 'player_ID', 'player'];
			
			for(var a = 0;a<tmp_fogos.length;a++){ p = tmp_fogos[a];
				d = {};
				for(var b = 0;b<keys_to_switch.length;b++){
					d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
				}
				fogos.push(d);
			}
			//console.log("Route C1")
		}
		else{
			fogos = misc.data.roster.filter(r=> r.role == "faceoff");
			//console.log("Route C2")
		}
    }
	
	

	//console.log("mn.misc"); console.log(misc);
	console.log("fogos"); console.log(fogos);
	
	
	if(fogo_specs.career == null && fogos.length > 0){ 
		
		fogo_specs.career = fogos[0].default_career ? "career" : "season"; 
		//console.log(fogos[0]);
		if('player_ID' in fogos[0]){
			fogo_specs.fogo_player_ID = fogos[0].player_ID
		}
		else{
			fogo_specs.fogo_player_ID = fogos[0].pID
			
		}
	}
	// Visualization
	var focus_fogo = null;
	//console.log("fogos"); console.log(fogos);
	console.log("is_individual_page: " + is_individual_page);
	if(is_individual_page){
		if('fogo_metadata' in misc){
			//console.log(misc.fogo_metadata);
			focus_fogo = misc.player_data;
			
			//console.log("focus fogo"); console.log(focus_fogo);
			tmp_rec = misc.fogo_metadata.filter(r=> r.pID==focus_fogo.ID)[0];
			focus_fogo.career_data = tmp_rec['career_data']
			focus_fogo.season_data = tmp_rec['season_data']
		}
		else{
			focus_fogo = misc.player_data.roster_record;
		}
	}
	else{
		if('fogo_metadata' in misc){
			//console.log(misc.fogo_metadata);
			//console.log(fogo_specs);
			focus_fogo = fogos.filter(r=> r['player_ID' in r ? 'player_ID': 'pID'] == fogo_specs.fogo_player_ID)[0];
			
			console.log("focus fogo"); console.log(focus_fogo);
			if(!('career_data' in focus_fogo) || focus_fogo.career_data == null){
				tmp_rec = misc.fogo_metadata.filter(r=> r['pID' in r ? 'pID': 'player_ID']==focus_fogo['pID' in focus_fogo ? 'pID': 'player_ID'])
				if (tmp_rec.length > 0){
					tmp_rec = tmp_rec[0];
					//console.log("tmp_rec"); console.log(tmp_rec);
					focus_fogo.career_data = tmp_rec['career_data']
					focus_fogo.season_data = tmp_rec['season_data']
				}
			}
			//
			//
			
		}
		else{
			focus_fogo = fogos.filter(r=> r['player_ID' in r ? 'player_ID': 'pID'] == fogo_specs.fogo_player_ID)[0];
		}
	}
	// Create player list
	elem = $("#fogo_splits_players"); elem.empty();
	html = "<div class='flex'  style='background-color:#EEF;'>"
		if(fogos != null){
			html += "<div class='margin white' style='padding:4px;'>";
			html += "<div class='no-padding mob col-12' style='padding-top:5px;'><span class='light font-12'>Select FOGO</span></div>";
			html += "<div class='col-12 no-padding inline-flex'>"
			html += "<div class='no-padding dtop' style='margin-right:10px;'><span class='font-12'>Select FOGO</span></div>";
			html += "<select onchange='switch_fogo_focus(this.value);' class='font-12' style='margin-left:5px;'>";
			//console.log(fogo_specs);
			for(var a = 0;a<fogos.length;a++){ fogo = fogos[a];
				console.log(fogo)
				tmp_ID = fogo['pID' in fogo ? 'pID': 'player_ID']
				//console.log(tmp_ID , fogo_specs.fogo_player_ID, tmp_ID== fogo_specs.fogo_player_ID)
				html += "<option value='" + tmp_ID + "' " + ((tmp_ID == fogo_specs.fogo_player_ID) ? " selected": "") + ">" +  fogo.player + "</option>";
			}
			html += "</select>";
			html += "</div></div>";
		}
	
		html += "<div class='margin white' style='padding:4px;'>";
		html += "<div class='no-padding mob col-12' style='padding-top:5px;'><span class='light font-12'>Select Split</span></div>";
		html += "<div class='no-padding inline-flex'>"

		html += '<span id="quarter_index_view_tag" class="pointer tag-' + (fogo_specs.quarter=="quarter_index" ? "on" : "off") + ' quarter_tag font-15" onclick=\'toggle_fogo_filter(&quot;quarter&quot;, &quot;quarter_index&quot;);\'>';
		html += '<span class="font-12"><span class="dtop">By Quarter</span><span class="mob">Qtr</span></span></span>'
		html += '<span id="seq_bucket_view_tag" class="pointer tag-' + (fogo_specs.quarter=="quarter_index" ? "off" : "on") + ' quarter_tag font-15" onclick=\'toggle_fogo_filter(&quot;quarter&quot;, &quot;seq_bucket&quot;);\'>';
		html += '<span class="font-12"><span class="dtop">By Sequence</span><span class="mob">Seq</span></span></span>'

		html += "</div></div>";
	
		html += "<div class='margin white' style='padding:4px;'>";
		html += "<div class='no-padding mob col-12' style='padding-top:5px;'><span class='light font-12'>Select Period</span></div>";
		html += "<div class='no-padding inline-flex'>"

		html += '<span id="career_view_tag" class="pointer tag-' + (fogo_specs.career=="career" ? "on" : "off") + ' career_tag font-15" onclick=\'toggle_fogo_filter(&quot;career&quot;, &quot;career&quot;);\'>';
		html += '<span class="font-12">Career</span></span>'
		html += '<span id="season_view_tag" class="pointer tag-' + (fogo_specs.career=="career" ? "off" : "on") + ' career_tag font-15" onclick=\'toggle_fogo_filter(&quot;career&quot;, &quot;season&quot;);\'>';
		html += '<span class="font-12">Season</span></span>'

		html += "</div></div>";
	
	html += "</div>";
	elem.append(html);
	
	// Create graph
	elem = $("#fogo_splits_graph"); elem.empty();
	
	specs = {'margin_left': 40, 'margin_right': 10, 'margin_top': 10, 'margin_bottom': 75, 'chart_size':'small'};


	console.log("focus_fogo"); console.log(focus_fogo);
	if(focus_fogo != null){ // If a team has played no games in the current year, then there will be no FOGO to focus on yet
		fogo_data = focus_fogo[fogo_specs.career + "_data"];
		console.log("fogo_data"); console.log(fogo_data);
		//console.log("fogo_specs"); console.log(fogo_specs);
		//fogo_data[fogo_specs.quarter].x_label = "X axis"

		data = {'axis_labels': {'y': fogo_data[fogo_specs.quarter].header, 'x': fogo_data[fogo_specs.quarter].x_label}, 'data': []};

		tmp = {'stroke-dasharray': ('3,5'), 'stroke-width': 2.5, 'stroke': "#5A5", 'points': []}
		tmp.points = fogo_data[fogo_specs.quarter + "_by_secondary_fogo"].points.filter(r => r.y != null);
		data.data.push(tmp)
		
		tmp = {'stroke-width': 2.5, 'stroke': "#33F", 'points': []}
		tmp.points = fogo_data[fogo_specs.quarter + "_by_primary_fogo"].points.filter(r => r.y != null);
		data.data.push(tmp)
		
		data['legend'] = {'y_offset': -10, 'items': [], 'layout': 'horizontal'}

		data.legend.items.push({'stroke-dasharray': null, 'icon_type': 'line', 'stroke-width': 2.5, 'color': '#33F', 'label': 'vs primary FOGO'})
		data.legend.items.push({'stroke-dasharray': '3,3', 'icon_type': 'line', 'stroke-width': 2.5, 'color': '#5A5', 'label': 'vs secondary FOGO'}) 
		
		x_ticks = create_game_x_ticks(data.data);
		data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
		
		y_ticks = create_pct_y_ticks(data.data, {'min': 0.0,'max': 1.0});
		data['y_ticks'] = y_ticks.ticks;
		data['max_y'] = 1.0;  data['min_y'] = 0.0;
			
		if(on_mobile){
			if(document.getElementById("fogo_splits_container_div") != null){
				specs.width = $("#fogo_splits_container_div").width() * .95;    
			}
			else{
				specs.width = $("#" + div_prefix + "faceoffs_container_div").width() * .95;    
			}
		}
		else{
			if(document.getElementById("fogo_splits_container_div") != null){
				specs.width = $("#fogo_splits_container_div").width() * .95 * .666666;    
			}
			else{
				specs.width = $("#" + div_prefix + "faceoffs_panel").width() * .95 * .666666;    
			}
		}
		specs.height = 230;
		horizontal_line(data, "fogo_splits_graph", specs);
		
		// Create data table
		elem = $("#fogo_splits_data"); elem.empty();
		html = "<div class='no-padding'>";
		
		// Header
		html += "<div class='bbottom col-12 no-padding'>";
		html += "<span class='font-15 bold'>" + (fogo_specs.career=="career" ? "Career" : "Season") + " View</span>";
		html += "</div>"
		
		// Labels
		html += "<div class='col-12 bbottom very-light no-padding flex'>";
			html += "<div class='col-4 no-padding'></div>";
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>vs Primary</span>";
			html += "</div>"
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>vs Secondary</span>";
			html += "</div>"
		html += "</div>"
		
		// Count
		html += "<div class='col-12 table-row no-padding flex'>";
			html += "<div class='col-4 no-padding'><span class='font-12 light'>Count</span></div>";
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["n_by_primary_fogo"], "0") + "</span>";
			html += "</div>"
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["n_by_secondary_fogo"], "0") + "</span>";
			html += "</div>"
		html += "</div>"
		
		// Pct
		html += "<div class='col-12 table-row no-padding flex'>";
			html += "<div class='col-4 no-padding'><span class='font-12 light'>Win %</span></div>";
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["pct_by_primary_fogo"], "1%") + "</span>";
			html += "</div>"
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["pct_by_secondary_fogo"], "1%") + "</span>";
			html += "</div>"
		html += "</div>"
		
		// Record
		html += "<div class='col-12 table-row no-padding flex'>";
			html += "<div class='col-4 no-padding'><span class='font-12 light'>Record</span></div>";
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["record_by_primary_fogo"], "") + "</span>";
			html += "</div>"
			html += "<div class='col-4 centered no-padding'>";
			html += "<span class='font-12 light'>" + jsformat(fogo_data["record_by_secondary_fogo"], "") + "</span>";
			html += "</div>"
		html += "</div>"
		


		
		
		// Labels
		
		//console.log("focus_fogo"); console.log(focus_fogo);
		if (!('faceoff_ELO_rank_str' in focus_fogo)){ focus_fogo.faceoff_ELO_rank_str = focus_fogo.faceoff_ELO_rank; }
		
		// Count
		if('faceoff_ELO' in focus_fogo && focus_fogo.faceoff_ELO != null){
			
			html += "<div class='bbottom col-12 no-padding' style='padding-top:30px;'>";
			html += "<span class='font-15 bold'>Faceoff Elo Rating</span>";
			html += "</div>"
			
			html += "<div class='col-12 bbottom very-light no-padding flex'>";
				html += "<div class='col-6 centered no-padding'>";
				html += "<span class='font-12 light'>Rating</span>";
				html += "</div>"
				html += "<div class='col-6 centered no-padding'>";
				html += "<span class='font-12 light'>Ranking</span>";
				html += "</div>"
			html += "</div>"
		
			html += "<div class='col-12 no-padding flex'>";
				html += "<div class='col-6 centered no-padding'>";
				html += "<span class='font-12 light'>" + parseInt(focus_fogo.faceoff_ELO) + "</span>";
				html += "</div>"
				html += "<div class='col-6 centered no-padding'>";
				html += "<span class='font-12 light'>" + focus_fogo.faceoff_ELO_rank_str + "</span>";
				html += "</div>"
			html += "</div>"
		}
		
		html += "</div>"

		elem.append(html);
	}
    
    return misc;
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function display_quarter_splits(misc, unit, unit_desc, id, my_data = 1){
    /***
    This function displays the 2 bar graphs that show how an offense or defense fares based on quarter buckets.
    ***/
    
    
    var is_women = 0;
    if('data' in misc && 'league' in misc.data && misc.data.league.indexOf("Women") > -1){
        is_women = 1;
    }
    
    /* visualization */
    

    var redraw_tag = null;
    var is_unweighted_algo = 1;
    var team_short_code = "";
    
    //console.log("misc.data"); console.log(misc.data);
    var tmp_data = null;
    var tmp_unit = unit_desc == "offensive" ? "offense" : "defense";
    var comp_tag = "league_avg";
    var data_id = null;
	var no_data_available = 0;
	var n_shots_total = 0;
    data_id = unit_desc + '_game_clock_shooting_profile';
	
    if(my_data){
        redraw_tag = ["offense", "offensive"].indexOf(unit_desc) > -1 ? "offense" : "defense";
		//if(misc.data["full_shooting_profile_" + unit].this_year == null){
		//	// Show the error message about a lack of data
		//	$("#offensive_game_clock_splits_error_div").removeClass("hidden");
		//	$("#defensive_game_clock_splits_error_div").removeClass("hidden");
		//	$("#offensive_game_clock_splits_div").addClass("hidden");
		//	$("#defensive_game_clock_splits_div").addClass("hidden");
		//}
		if(1){
			
			//$("#offensive_game_clock_splits_div").removeClass("hidden");
			//$("#defensive_game_clock_splits_div").removeClass("hidden");
			//$("#offensive_game_clock_splits_error_div").addClass("hidden");
			//$("#defensive_game_clock_splits_error_div").addClass("hidden");
			
			tmp_data = misc.data["full_shooting_profile_" + unit].this_year[5].buckets;
			console.log("A", (['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1))
			console.log("B", !('noAltRankingAlgos' in misc && misc.noAltRankingAlgos))
			console.log("C", user_obj.settings.teamDefaultRanking.val)
			if('teamDefaultRanking' in user_obj.settings && user_obj.settings.teamDefaultRanking != null && 'val' in user_obj.settings.teamDefaultRanking){
				if(['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1){
					if(!('noAltRankingAlgos' in misc && misc.noAltRankingAlgos)){ // We may be on a page that doesn't use alt Algos
						if(user_obj.settings.teamDefaultRanking.val == 'oppWeighted'){
							console.log(my_data);
							console.log(unit);
							console.log(misc.data["full_shooting_profile_" + unit + "_oppWeighted"])
							if(misc.data["full_shooting_profile_" + unit + "_oppWeighted"].this_year == null){
								tmp_data = null; no_data_available = 1;
						
							}
							else{
								tmp_data = misc.data["full_shooting_profile_" + unit + "_oppWeighted"].this_year[5].buckets;
								if( tmp_data.reduce((sum, record) => sum + record.shots, 0) == 0){
									tmp_data = null; no_data_available = 1;
								}
							}
							is_unweighted_algo = 0;
						}
						else if(user_obj.settings.teamDefaultRanking.val == 'oppFilteredAndWeighted'){
							console.log("5320", misc.data["full_shooting_profile_" + unit + "_oppFilteredAndWeighted"].this_year == null)
							if(misc.data["full_shooting_profile_" + unit + "_oppFilteredAndWeighted"].this_year == null){
								tmp_data = null; no_data_available = 1;
								console.log("5307")
							}
							else{
								tmp_data = misc.data["full_shooting_profile_" + unit + "_oppFilteredAndWeighted"].this_year[5].buckets;
								console.log("unit: " + unit)
								console.log(tmp_data)
								if( tmp_data.reduce((sum, record) => sum + record.shots, 0) == 0){
									tmp_data = null; no_data_available = 1;
								}
							}
							is_unweighted_algo = 0;
						}
					}
				}
			}
			if(tmp_data != null){
				for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
					tmp.y = tmp.pct;
					tmp.x = tmp.bucket
					tmp.label = a < 3 ? "Q" + (a+1) : "Q4+OT";
				}
			}
		}

        team_short_code = misc.data.short_code;
        comp_share = "league_share";
    }
    else{
        redraw_tag = ["defense", "defensive"].indexOf(unit_desc) > -1 ? "next_game_offense" : "next_game_defense";
        misc.last_season = 0;
        comp_tag = "league_avg";
        comp_share = "league_share";
        if(misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_this_year != null){    
            tmp_data = misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_this_year[5].buckets;
        }
        else if(misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_last_year != null){  
            misc.last_season = 1;
            tmp_data = misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_last_year[5].buckets;
            
        }
        if(tmp_data == null){
            
        }
        else{
            for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
                tmp.y = tmp.pct;
                tmp.x = a;
                //tmp.shots = tmp.cnt;
                tmp.label = a < 3 ? "Q" + (a+1) : "Q4+OT";
            }
        }
        team_short_code = misc.data.next_game.opp_short_code;
    }
    
	console.log("3934.tmp_data"); console.log(tmp_data)
	console.log("3934.no_data_available"); console.log(no_data_available)
	
    if(no_data_available){
		$("#offensive_game_clock_splits_error_div").removeClass("hidden");
		$("#defensive_game_clock_splits_error_div").removeClass("hidden");
		$("#offensive_game_clock_splits_div").addClass("hidden");
		$("#defensive_game_clock_splits_div").addClass("hidden");
		$("#offensive_game_clock_splits_div").removeClass("visible");
		$("#defensive_game_clock_splits_div").removeClass("visible");
	}
	else{
		$("#offensive_game_clock_splits_div").removeClass("hidden");
		$("#defensive_game_clock_splits_div").removeClass("hidden");
		$("#offensive_game_clock_splits_div").addClass("visible");
		$("#defensive_game_clock_splits_div").addClass("visible");
		$("#offensive_game_clock_splits_error_div").addClass("hidden");
		$("#defensive_game_clock_splits_error_div").addClass("hidden");
		
		console.log(tmp_data)
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
			n_shots_total += tmp.shots;
        }
		
		console.log("n_shots_total: " + n_shots_total);
		if(n_shots_total == 0){ // No game data yet
		
		}
		else{
			specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 25, 'margin-right': 0, 'margin_bottom': 35, 'chart_size': 'small', 'flip': 0};
			
			//console.log("tmp_data");  console.log(tmp_data)
			
			data = {'show_counts':!is_unweighted_algo ? null : 'shots','axis_labels': {'y': 'Shooting % by quarter', 'x': ""}, 'data': []};
			data.show_comparison_line = comp_tag;
			tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
			tmp.points = tmp_data;
			data.data.push(tmp)
			
			x_ticks = create_game_x_ticks(data.data);
			data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
			y_ticks = create_pct_y_ticks(data.data, {'min': 0})
			data['y_ticks'] = y_ticks.ticks;
			data['max_y'] = y_ticks.max; data['min_y'] = 0;
			
			
			chart_width = $('#' + unit_desc + '_game_clock_shooting_profile_graph_container_div').width();
			specs.width = chart_width;
			

			data_id = unit_desc + '_game_clock_shooting_profile';
			//console.log("wpvd.misc.data: "); console.log(misc.data);
			//console.log("wpvd.data_id: " + data_id); 
			//console.log("wpvd.tmp_data"); console.log(tmp_data);
			if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
				//console.log("jpc.data_table_specs");console.log(data_table_specs);
				data['data_table_id'] = data_id;
				data['data_table'] = []
					
				d = {'header': "Shooting Pct"};
				data['data_table'].push(d);
					
				d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.pct, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				
				d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_tag], 'x': r.x}; return o; })};
				data['data_table'].push(d);
						
				d = {'header': "Pct of Shots"};
				data['data_table'].push(d);
				
				d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.share, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				
				d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_share], 'x': r.x}; return o; })};
				data['data_table'].push(d);
			}
			specs.has_data_table = 0;
			if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
				specs.has_data_table = 1;
				specs.n_rows = 6;
				//console.log(unit_desc + '_game_clock_shooting_profile data table');
				//console.log(data.data_table);
			}
			//console.log("wpss.specs.has_data_table: " + specs.has_data_table);
			
			
			data['legend'] = {'items': [], 'layout': 'horizontal'}
			data.legend.items.push({'stroke-dasharray': "5,5", 'icon_type': 'line', 'stroke-width': 3, 'color': 'orange', 'label': 'All Teams'})
			
			if(data_table_specs[unit_desc + '_game_clock_shooting_profile']){ // To trigger a change in the size of the svg div if necessary (because some algos show raw counts)
				
				unhide_data_table(unit_desc + '_game_clock_shooting_profile_graph_div', specs.n_rows, "no");
			}
			console.log(data)
			vertical_bars(data, unit_desc + '_game_clock_shooting_profile_graph_div', specs);
			
        }
    }
    
    //  This is the efficiency profile graph
    
    /* data */
    
    /* visualization */
    
    chart_width = $('#' + unit_desc + '_game_clock_shooting_profile_graph_container_div').width();
    
    
    

    tmp_data = null;
    if(my_data){
        tmp_data = misc.data[unit_desc + "_pace_profile"].quarter_data;
		if('teamDefaultRanking' in user_obj.settings && user_obj.settings.teamDefaultRanking != null && 'val' in user_obj.settings.teamDefaultRanking){
			if(['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1){
				if(!('noAltRankingAlgos' in misc && misc.noAltRankingAlgos)){ // We may be on a page that doesn't use alt Algos
					if(user_obj.settings.teamDefaultRanking.val == 'oppWeighted'){
						if(misc.data[unit_desc + "_pace_profile_oppWeighted"] == null){
							tmp_data = null; no_data_available = 1;
								console.log("no-data 5464")
						}
						else{
							tmp_data = misc.data[unit_desc + "_pace_profile_oppWeighted"].quarter_data;
						}
						is_unweighted_algo = 0;
					}
					else if(user_obj.settings.teamDefaultRanking.val == 'oppFilteredAndWeighted'){
						if(misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"] == null){
							tmp_data = null; no_data_available = 1;
								console.log("no-data 5473")
						}
						else{
							tmp_data = misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"].quarter_data;
						}
						is_unweighted_algo = 0;
					}
				}
			}
		}
			
			
        comp_tag = "league_pct";
    }
    else{
        misc.last_season = 0;
        comp_tag = "league_pct";
        if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].quarter_data != null && misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].quarter_data[0].efficiency != null){    
            tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].quarter_data;
        }
        else if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].quarter_data_last_year != null){  
            misc.last_season = 1;
            tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].quarter_data_last_year;
            
        }
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
            tmp.y = tmp.efficiency;
            tmp.label = a < 3 ? "Q" + (a+1) : "Q4+OT";
        }
    }
    specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 25, 'margin-right': 0, 'margin_bottom': 35, 'chart_size': 'small', 'flip': 0};
    //console.log("wpve.tmp_data"); console.log(tmp_data);
	var n_possessions_total = 0;
    if(! no_data_available){
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
			n_possessions_total += tmp.cnt;
        }
        //console.log("\n\nn_posst: " + n_possessions_total);
        
		if(n_possessions_total == 0){
			
		}
		else{
			data = {'show_counts':!is_unweighted_algo ? null : 'cnt','axis_labels': {'y': 'Efficiency % by quarter', 'x': ""}, 'data': []};
			data.show_comparison_line = comp_tag;
			tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
			tmp.points = tmp_data;
			data.data.push(tmp)
			
			x_ticks = create_game_x_ticks(data.data);
			data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
			y_ticks = create_pct_y_ticks(data.data, {'min': 0})
			data['y_ticks'] = y_ticks.ticks;
			data['max_y'] = y_ticks.max; data['min_y'] = 0;
			
			specs.width = chart_width;
			

			data_id = unit_desc + '_game_clock_efficiency_profile'

			if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
				data['data_table_id'] = data_id;
				data['data_table'] = []
				
				d = {'header': "Efficiency"};
				data['data_table'].push(d);
			
				d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.efficiency, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				
				d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_tag], 'x': r.x}; return o; })};
				data['data_table'].push(d);
			
					
				d = {'header': "Pct of Poss."};
				data['data_table'].push(d);
			
				d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.share, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				
				d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_share], 'x': r.x}; return o; })};
				data['data_table'].push(d);
			}
			specs.has_data_table = 0;
			if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
				specs.has_data_table = 1;
				specs.n_rows = 6;
			}
			
			
			data['legend'] = {'items': [], 'layout': 'horizontal'}
			data.legend.items.push({'stroke-dasharray': "5,5", 'icon_type': 'line', 'stroke-width': 3, 'color': 'orange', 'label': 'All Teams'})
			

			if(data_table_specs[unit_desc + '_game_clock_efficiency_profile']){ // To trigger a change in the size of the svg div if necessary (because some algos show raw counts)
				unhide_data_table(unit_desc + '_game_clock_efficiency_profile_graph_div', specs.n_rows, "no");
			}
			
			vertical_bars(data, unit_desc + '_game_clock_efficiency_profile_graph_div', specs);
		}
    }
    return misc;
}

function unhide_data_table(id, n_rows, redraw_with=null){
    /***
    This function is used to unhide a data table because a user clicked an expand icon. The relevant specs setting is update the the redraw function is re-executed.
    ***/
    
    //console.log("Set data_table_specs " + id.replace("_graph_div", "") + " to 1 and redraw with " + redraw_with);
    
    var tmp_id = id.replace("_graph_div", "");
    $("#" + tmp_id + "_graph_div").removeClass("data-table-6");
    $("#" + tmp_id + "_graph_div").removeClass("data-table-9");
    $("#" + tmp_id + "_graph_div").addClass("data-table-" + n_rows);
    console.log("Set #" + tmp_id + "_graph_div class to " + "data-table-" + n_rows + " ( redraw_with=" + redraw_with+")");
            
    data_table_specs[tmp_id] = 1;
	if(redraw_with != "no"){
		redraw(redraw_with);
	}
    
}

function display_shot_clock_splits(misc, unit_desc, id, my_data = 1){
    /***
    This function displays the 3 bar graphs that show how an offense or defense fares based on shot-clock buckets.
    ***/
    
    //console.log("po.misc.data"); console.log(misc.data);
    
    var is_women = 0;
    if('data' in misc && 'league' in misc.data && misc.data.league.indexOf("Women") > -1){
        is_women = 1;
    }
    /* data */
    var tmp_data = null;
    var shooting_comp_line = 'league_pct';
	var is_unweighted_algo = 1;
    var efficiency_comp_line = 'league_pct';
    var tmp_unit = unit_desc == "offensive" ? "offense" : "defense";
    misc['last_season'] = 0;
    
    var team_short_code = "";
	var no_data_available = 0;
    var redraw_tag = null;
    //console.log("my_data: " + my_data);
    if(my_data == 1){
		var tmp_n_games_played = null;
		if('data' in misc.data.season_games){
			status_key_loc = misc.data.season_games.keys.indexOf('status')
			tmp_n_games_played = misc.data.season_games.data.filter(r=> r[status_key_loc].indexOf("comp") > -1).length;
		}
		else{
			tmp_n_games_played = misc.data.season_games.filter(r=> r.status.indexOf("comp") > -1).length;
		}
		//console.log("tmp_n_games_played: " + tmp_n_games_played);
		if(tmp_n_games_played > 0){ // There should be data here; if there's not, throw an error)
			tmp_data = misc.data[unit_desc + "_shooting_profile"].data;
		
			if('teamDefaultRanking' in user_obj.settings && user_obj.settings.teamDefaultRanking != null && 'val' in user_obj.settings.teamDefaultRanking){
				if(['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1){
					if(!('noAltRankingAlgos' in misc && misc.noAltRankingAlgos)){ // We may be on a page that doesn't use alt Algos
						if(user_obj.settings.teamDefaultRanking.val == 'oppWeighted'){
							if(misc.data[unit_desc + "_shooting_profile_oppWeighted"] == null){
								tmp_data = null; no_data_available = 1;
								console.log("no-data 5641")
							}
							else{
								tmp_data = misc.data[unit_desc + "_shooting_profile_oppWeighted"].data;
								if( tmp_data.reduce((sum, record) => sum + record.cnt, 0) == 0){
									tmp_data = null; no_data_available = 1;
								}
							}
							is_unweighted_algo = 0;
						}
						else if(user_obj.settings.teamDefaultRanking.val == 'oppFilteredAndWeighted'){
							if(misc.data[unit_desc + "_shooting_profile_oppFilteredAndWeighted"] == null){
								tmp_data = null; no_data_available = 1;
							}
							else{
								tmp_data = misc.data[unit_desc + "_shooting_profile_oppFilteredAndWeighted"].data;
								if( tmp_data.reduce((sum, record) => sum + record.cnt, 0) == 0){
									tmp_data = null; no_data_available = 1;
								}
							}
							is_unweighted_algo = 0;
						}
					}
				}
			}
			
			
		}
		else if(tmp_n_games_played == 0 && !((unit_desc + "_shooting_profile") in misc.data)){
			// Report that there is no data
			no_data_available = 1;
		}
        //console.log('misc.data[' + unit_desc + ' + "_shooting_profile"].data'); console.log(tmp_data)
        team_short_code = misc.data.short_code;
        redraw_tag = ["offense", "offensive"].indexOf(unit_desc) > -1 ? "offense" : "defense";
        comp_share = "league_share";
    }
    else{
        redraw_tag = ["defense", "defensive"].indexOf(unit_desc) > -1 ? "next_game_offense" : "next_game_defense";
        shooting_comp_line = "league_avg";
        efficiency_comp_line = "league_pct";
        comp_share = "league_share";
        if(misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_this_year != null){
            tmp_data = misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_this_year[4].buckets;
        }
        else if(misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_last_year != null){
            tmp_data = misc.data.next_game.opp_time_based_splits["shooting"][tmp_unit].opp_shots_analysis_last_year[4].buckets;
            misc.last_season = 1;
        }
        if(tmp_data == null){
            // Data is not been calculated; perhaps it's the first game of the year and there is no data yet?
        }
        else{
            var inc = Math.floor(80/tmp_data.length);
            for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
                tmp.y = tmp.pct;
                tmp.team_pct = tmp.pct;
                tmp.x = tmp_data.length - tmp.bucket + 1;
                tmp.cnt = tmp.shots;
                tmp.label = a*inc + "-" + (a+1)*inc + "s";
                if(is_women){
                    tmp.label = tmp.label.replace("80s", "90s");
                }
            }
        }
        team_short_code = misc.data.next_game.opp_short_code;
        
    }
    if(tmp_data == null){
        //console.log("No data available: " + no_data_available);
		// Show the error message about a lack of data

		$("#offensive_profile_error_div").removeClass("hidden");
		$("#defensive_profile_error_div").removeClass("hidden");
		$("#offensive_profile_div").addClass("hidden");
		$("#defensive_profile_div").addClass("hidden");
		
    }
    else{
		$("#offensive_profile_div").removeClass("hidden");
		$("#defensive_profile_div").removeClass("hidden");
		$("#offensive_profile_error_div").addClass("hidden");
		$("#defensive_profile_error_div").addClass("hidden");
		
        inc = Math.floor(80/tmp_data.length);
		var total_team_goals = null;
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
			if('goals' in tmp && tmp.goals != null){
				if(total_team_goals == null){ total_team_goals = 0; }
				total_team_goals += tmp.goals;
			}
		}
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
            //tmp.y = tmp.pct;
            //tmp.x = tmp_data.length - tmp.bucket + 1;
            tmp.label = a*inc + "-" + (a+1)*inc + "s";
            if(!('share' in tmp) && 'team_share' in tmp){
                tmp.share = tmp.team_share;
            }
            if(is_women){
                tmp.label = tmp.label.replace("80s", "90s");
            }
			
			if('goals' in tmp && tmp.goals != null){
				tmp.share_of_goals = tmp.goals / total_team_goals;
			}
        }

        /* visualization */
         
        specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 25, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
        
        data = {'show_counts': !is_unweighted_algo ? null : 'cnt', 'axis_labels': {'y': 'Shooting % by shot clock remaining', 'x': "Shot Clock Left"}, 'data': []};
        data.show_comparison_line = shooting_comp_line;
        tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
        tmp.points = tmp_data;
        data.data.push(tmp)
        
        x_ticks = create_game_x_ticks(data.data);
        data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
        y_ticks = create_pct_y_ticks(data.data, {'min': 0})
        data['y_ticks'] = y_ticks.ticks;
        data['max_y'] = y_ticks.max; data['min_y'] = 0;
        
        specs.width = $('#' + unit_desc + '_shooting_profile_graph_container_div').width()-15;
        
        //console.log("wps.tmp_data"); console.log(tmp_data);
        data_id = unit_desc + '_shooting_profile';
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
            
            data['data_table_id'] = data_id;
            data['data_table'] = []
            
            d = {'header': "Shooting Pct"};
            data['data_table'].push(d);
            
            d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.team_pct, 'x': r.x}; return o; })};
            data['data_table'].push(d);
            
            d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[shooting_comp_line], 'x': r.x}; return o; })};
            data['data_table'].push(d);
            
			
            
            d = {'header': "Pct of Shots"};
            data['data_table'].push(d);
            
            d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.share, 'x': r.x}; return o; })};
            data['data_table'].push(d);
            
            d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_share], 'x': r.x}; return o; })};
            data['data_table'].push(d);
			
			if(is_unweighted_algo && total_team_goals != null){ // This was added in Jan 2025; before then, we only showed shot counts; only show this row if we have the data available.
				d = {'header': "Goals"};
				data['data_table'].push(d);
				//console.log(tmp_data);
				d = {'label': team_short_code, 'fmt': '0', 'data': tmp_data.map(r => {let o = {'val': r.goals, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				d = {'label': "Share", 'fmt': '0%', 'data': tmp_data.map(r => {let o = {'val': r.share_of_goals, 'x': r.x}; return o; })};
				data['data_table'].push(d);
			}
            
        }
		
        specs.has_data_table = 0;
		//console.log("Set n_rows");
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
            specs.has_data_table = 1;
			if('data_table' in data){
				specs.n_rows = data['data_table'].length;
			}
			else{
				specs.n_rows = ! is_unweighted_algo ? 6 : 9;//data['data_table'].length;
			}
        }
        
        
        data['legend'] = {'items': [], 'layout': 'horizontal'}
        data.legend.items.push({'stroke-dasharray': "5,5", 'icon_type': 'line', 'stroke-width': 3, 'color': 'orange', 'label': 'All Teams'})
        
        if(data_table_specs[unit_desc + '_shooting_profile']){ // To trigger a change in the size of the svg div if necessary (because some algos show raw counts)
			
			unhide_data_table(unit_desc + '_shooting_profile_graph_div', specs.n_rows, "no");
		}
		
		vertical_bars(data, unit_desc + '_shooting_profile_graph_div', specs);
		
    }
    
    //  This is the pace profile graph
    /* data */
    //console.log("123e.my_data: " + my_data);
    //console.log("misc.data." + unit_desc + "_pace_profile");
    if(my_data == 1){
        tmp_data = misc.data[unit_desc + "_pace_profile"].length_data;
		
		if('teamDefaultRanking' in user_obj.settings && user_obj.settings.teamDefaultRanking != null && 'val' in user_obj.settings.teamDefaultRanking){
			if(['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1){
				if(!('noAltRankingAlgos' in misc && misc.noAltRankingAlgos)){ // We may be on a page that doesn't use alt Algos
					if(user_obj.settings.teamDefaultRanking.val == 'oppWeighted'){
						if(misc.data[unit_desc + "_pace_profile_oppWeighted"] == null){
							tmp_data = null; no_data_available = 1;
								console.log("no-data 5837")
						}
						else{
							tmp_data = misc.data[unit_desc + "_pace_profile_oppWeighted"].length_data;
						}
			
					}
					else if(user_obj.settings.teamDefaultRanking.val == 'oppFilteredAndWeighted'){
						if(misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"] == null){
							tmp_data = null; no_data_available = 1;
								console.log("no-data 5847")
						}
						else{
							tmp_data = misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"].length_data;
						}
				
					}
				}
			}
		}
    }
    else{
        if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].length_data != null && misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].length_data[0].efficiency != null){
            tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].length_data;
        }
        else if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].length_data_last_year != null){
            tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].length_data_last_year;
            misc.last_season = 1;
        }
        
        for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
            tmp.y = tmp.efficiency;
        }
    }
    
    /* visualization */
    specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 25, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
    
    data = {'show_counts': !is_unweighted_algo ? null : 'cnt', 'axis_labels': {'y': 'Efficiency % by possession length', 'x': "Poss. Length"}, 'data': []};
    data.show_comparison_line = efficiency_comp_line;
    
    tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
    tmp.points = tmp_data;
    data.data.push(tmp)
    
	for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
		if('goals' in tmp && tmp.goals != null){
			tmp.share_of_goals = tmp.goals / total_team_goals;
		}
	}
    
    data_id = unit_desc + '_pace_profile';
    //console.log("coe.tmp_data"); console.log(tmp_data)
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
        data['data_table_id'] = data_id;
        data['data_table'] = []
        
        d = {'header': "Efficiency"};
        data['data_table'].push(d);
        
        d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.efficiency, 'x': r.x}; return o; })};
        data['data_table'].push(d);
        
        d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[efficiency_comp_line], 'x': r.x}; return o; })};
        data['data_table'].push(d);
        
                
        d = {'header': "Pct of Poss."};
        data['data_table'].push(d);
        
        d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.share, 'x': r.x}; return o; })};
        data['data_table'].push(d);
        
        d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_share], 'x': r.x}; return o; })};
        data['data_table'].push(d);
		console.log("is_unweighted_algo: " + is_unweighted_algo)
			
		if(is_unweighted_algo && total_team_goals != null){ // This was added in Jan 2025; before then, we only showed shot counts; only show this row if we have the data available.
			d = {'header': "Goals"};
			data['data_table'].push(d);
			console.log(tmp_data);
			d = {'label': team_short_code, 'fmt': '0', 'data': tmp_data.map(r => {let o = {'val': r.goals, 'x': r.x}; return o; })};
			data['data_table'].push(d);
			d = {'label': "Share", 'fmt': '0%', 'data': tmp_data.map(r => {let o = {'val': r.share_of_goals, 'x': r.x}; return o; })};
			data['data_table'].push(d);
		}
    }
    specs.has_data_table = 0;
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
        specs.has_data_table = 1;
        specs.n_rows = ! is_unweighted_algo ? 6 : 9;
    }
    
	if(no_data_available){
		// Can't print graphs because there is no data for this season.
	}
	else{
		x_ticks = create_game_x_ticks(data.data);
		data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
		y_ticks = create_pct_y_ticks(data.data, {'min': 0})
		data['y_ticks'] = y_ticks.ticks;
		data['max_y'] = y_ticks.max; data['min_y'] = 0;
		
		data['legend'] = {'items': [], 'layout': 'horizontal'}
		data.legend.items.push({'stroke-dasharray': "5,5", 'icon_type': 'line', 'stroke-width': 3, 'color': 'orange', 'label': 'All Teams'})
		
		
        if(data_table_specs[unit_desc + '_pace_profile']){ // To trigger a change in the size of the svg div if necessary (because some algos show raw counts)
			unhide_data_table(unit_desc + '_pace_profile_graph_div', specs.n_rows, "no");
		}
		
		vertical_bars(data, unit_desc + '_pace_profile_graph_div', specs);
		
		//  This is the 1st shot profile graph
		/* data */
		
		if(my_data == 1){
			tmp_data = misc.data[unit_desc + "_pace_profile"].first_shot_data;
			
			if('teamDefaultRanking' in user_obj.settings && user_obj.settings.teamDefaultRanking != null && 'val' in user_obj.settings.teamDefaultRanking){
				if(['oppWeighted', 'oppFilteredAndWeighted'].indexOf(user_obj.settings.teamDefaultRanking.val) > -1){
					if(!('noAltRankingAlgos' in misc && misc.noAltRankingAlgos)){ // We may be on a page that doesn't use alt Algos
						if(user_obj.settings.teamDefaultRanking.val == 'oppWeighted'){
							if(misc.data[unit_desc + "_pace_profile_oppWeighted"] == null){
								tmp_data = null; no_data_available = 1;
								console.log("no-data 5960")
							}
							else{
								tmp_data = misc.data[unit_desc + "_pace_profile_oppWeighted"].first_shot_data;
							}
				
						}
						else if(user_obj.settings.teamDefaultRanking.val == 'oppFilteredAndWeighted'){
							if(misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"] == null){
								tmp_data = null; no_data_available = 1;
								console.log("no-data 5970")
							}
							else{
								tmp_data = misc.data[unit_desc + "_pace_profile_oppFilteredAndWeighted"].first_shot_data;
							}
					
						}
					}
				}
			}
		
		}
		else{
			if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].first_shot_data != null && misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].first_shot_data[0].efficiency != null){
				tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].first_shot_data;
			}
			else if(misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].first_shot_data_last_year != null){
				tmp_data = misc.data.next_game.opp_time_based_splits["pacing"][tmp_unit].first_shot_data_last_year;
				misc.last_season = 1;
			}

			for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
				tmp.y = tmp.efficiency;
			}
		}
		
		/* visualization */
		specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 25, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
		
		data = {'show_counts': !is_unweighted_algo ? null : 'cnt', 'axis_labels': {'y': 'Efficiency % by time of 1st shot', 'x': "Time of 1st shot"}, 'data': []};
		data.show_comparison_line = efficiency_comp_line;
		tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
		tmp.points = tmp_data;
		data.data.push(tmp)
		
    
		for(var a=0;a<tmp_data.length;a++){ tmp = tmp_data[a];
			if('goals' in tmp && tmp.goals != null){
				tmp.share_of_goals = tmp.goals / total_team_goals;
			}
		}
		
		x_ticks = create_game_x_ticks(data.data);
		data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
		y_ticks = create_pct_y_ticks(data.data, {'min': 0})
		data['y_ticks'] = y_ticks.ticks;
		data['max_y'] = y_ticks.max; data['min_y'] = 0;
		
		
		data_id = unit_desc + '_1st_shot_profile';
		//console.log("rew.tmp_data"); console.log(tmp_data);
		if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
			data['data_table_id'] = data_id;
			data['data_table'] = []
			
			d = {'header': "Efficiency"};
			data['data_table'].push(d);
			
			d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.efficiency, 'x': r.x}; return o; })};
			data['data_table'].push(d);
			
			d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[efficiency_comp_line], 'x': r.x}; return o; })};
			data['data_table'].push(d);
			
					
			d = {'header': "Pct of Poss."};
			data['data_table'].push(d);
			
			d = {'label': team_short_code, 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r.share, 'x': r.x}; return o; })};
			data['data_table'].push(d);
			
			d = {'label': "AVG", 'fmt': '1%', 'data': tmp_data.map(r => {let o = {'val': r[comp_share], 'x': r.x}; return o; })};
			data['data_table'].push(d);
			
			if(is_unweighted_algo && total_team_goals != null){ // This was added in Jan 2025; before then, we only showed shot counts; only show this row if we have the data available.
				d = {'header': "Goals"};
				data['data_table'].push(d);
				console.log(tmp_data);
				d = {'label': team_short_code, 'fmt': '0', 'data': tmp_data.map(r => {let o = {'val': r.goals, 'x': r.x}; return o; })};
				data['data_table'].push(d);
				d = {'label': "Share", 'fmt': '0%', 'data': tmp_data.map(r => {let o = {'val': r.share_of_goals, 'x': r.x}; return o; })};
				data['data_table'].push(d);
			}
		}
		specs.has_data_table = 0;
		if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
			specs.has_data_table = 1;
			specs.n_rows = ! is_unweighted_algo ? 6 : 9;
		}
		
		if(on_mobile){
			specs.width = $('#' + unit_desc + '_1st_shot_profile_graph_container_div').width() - 15;
		}
		else{
			specs.width = $('#' + unit_desc + '_1st_shot_profile_graph_container_div').width();
		}
		
		data['legend'] = {'items': [], 'layout': 'horizontal'}
		data.legend.items.push({'stroke-dasharray': "5,5", 'icon_type': 'line', 'stroke-width': 3, 'color': 'orange', 'label': 'All Teams'})
		
		
        if(data_table_specs[unit_desc + '_1st_shot_profile']){ // To trigger a change in the size of the svg div if necessary (because some algos show raw counts)
			unhide_data_table(unit_desc + '_1st_shot_profile_graph_div', specs.n_rows, "no");
		}
		vertical_bars(data, unit_desc + '_1st_shot_profile_graph_div', specs);
		
	}

    return misc;
}


function display_team_freeposition_stats(misc, unit, target_id){
    /***
    This function shows the free position analytics report for a women's team.
    ***/
    var subject_unit = unit == "offensive" || unit == "offense" ? "offense" : "defense";
    var prefix = subject_unit == "offense" ? "off" : "def";
    var fp_data = null; var avg_data = null;
    var subject = null;
    var is_next_game = 0; var is_this_year = 1;
    var base_elem_tag = null;
    var team_short_code = null;
    var redraw_tag = null;
    var is_defense = 0;
    var fp_players = null;
        
    if('handler' in misc && misc.handler.indexOf("schedule") > -1){
        fp_data = null;
        subject = misc.data.next_game.opponent_display;
        team_short_code = subject;
        is_next_game = 1;
        
        redraw_tag = ["defense", "defensive"].indexOf(unit_desc) > -1 ? "next_game_offense" : "next_game_defense";
        
        base_elem_tag = "next_game_" + unit;
    }
    else if('player_outcome_splits' in misc.data){
		if('roster_list_and_keys' in misc.data){
			tmp_fp_shots_loc = misc.data.roster_list_and_keys.keys.indexOf('fp_shots');
			fp_players = []
			tmp_filtered_roster = misc.data.roster_list_and_keys.data.filter(r=> r[tmp_fp_shots_loc] != null && r[tmp_fp_shots_loc] > 0);
			var rk_specs = {'keys': misc.data.roster_list_and_keys.keys};
			var tmp_roster = [];
			var keys_to_switch = ['fp_goals', 'player_ID', 'player', 'fp_shots', 'fp_shooting_pct'];
			
			for(var a = 0;a<tmp_filtered_roster.length;a++){ p = tmp_filtered_roster[a];
				d = {};
				for(var b = 0;b<keys_to_switch.length;b++){
					d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
				}
				fp_players.push(d);
			}
		}
		else{
			fp_players = misc.data.roster.filter( r=> r.fp_shots != null && r.fp_shots > 0);
		}
        team_short_code = misc.data.short_code;
        redraw_tag = ["offense", "offensive"].indexOf(unit_desc) > -1 ? "offense" : "defense";
        comp_share = "league_share";
        
        avg_data = misc.data.league_averages;
        if('team_seasons' in misc.data && misc.data.team_seasons != null){
			
			tmp_data = misc.data.team_seasons.filter(r => r.year == misc.year);
			fp_data = null;
			if(tmp_data.length > 0){
				fp_data = tmp_data[0];
			}
        }
        else{
            is_this_year = 0;
            //fp_data = misc.data.last_season;
			console.log("b.5657; year=" + (misc.year-1))
            tmp_data = misc.data.team_seasons.filter(r => r.year == misc.year-1);
			fp_data = null;
			if(tmp_data.length > 0){
				fp_data = tmp_data[0];
			}
        }
        subject = misc.data.display_name;
        base_elem_tag = unit + "_";
        if(unit == "defensive"){ is_defense = 1; }
    }
    
    //console.log("pqw.data"); console.log(fp_data);
    
    var elem_tag = null;
    var elem = null;
    var data_id = null;


    // Whether the team tends to utilize their FP attempts or not
    elem_tag = base_elem_tag + "fp_strategy_graph_div";
    data_id = base_elem_tag + "fp_strategy";
    elem = $("#" + elem_tag); elem.empty();
    
    specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 35, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
    
    data = {'show_counts': 'cnt', 'axis_labels': {'y': '% of FP Attempts w/ Action-to-Goal', 'x': ""}, 'data': []};
    tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
    tmp.points = [];
    tmp.points.push({'x': 1, 'cnt': fp_data[prefix + '_fp_attempts'], 'y': fp_data[prefix + "_fp_utilization"], 'label': team_short_code});
    tmp.points.push({'x': 2, 'cnt': avg_data['fp_attempts'], 'y': avg_data["fp_utilization"], 'label': "NCAA"});
    data.data.push(tmp)
    
    x_ticks = create_game_x_ticks(data.data);
    data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
    y_ticks = create_pct_y_ticks(data.data, {'min': 0})
    data['y_ticks'] = y_ticks.ticks; data['max_y'] = y_ticks.max; data['min_y'] = 0;
    
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
        data['data_table_id'] = data_id;
        data['data_table'] = []
        
        d = {'header': "Action-to-Goal Rates"};
        data['data_table'].push(d);
        
        d = {'label': "FP Attempts", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'], 'x': 1}, {'val': avg_data['fp_attempts'], 'x': 2}]};
        data['data_table'].push(d);
        
        d = {'label': "w/ Action-to-Goal", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'] * fp_data[prefix + "_fp_utilization"], 'x': 1}, {'val': avg_data['fp_attempts']*avg_data["fp_utilization"], 'x': 2}]};
        data['data_table'].push(d);
        
        d = {'label': "A-to-G Rate", 'fmt': '1%', 'data': [{'val': fp_data[prefix + "_fp_utilization"], 'x': 1}, {'val': avg_data["fp_utilization"], 'x': 2}]};
        data['data_table'].push(d);
        
        //console.log("klj.data.data_table"); console.log(data.data_table)
    }
    specs.has_data_table = 0;
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
        specs.has_data_table = 1;
        specs.n_rows = 4;
    }
    
    if(on_mobile){
        specs.width = $("#" + elem_tag).width() - 15;
    }
    else{
        specs.width = $("#" + elem_tag).width();
    }
    
    vertical_bars(data, elem_tag, specs);


    // Whether the team tends to have the FP shooter take a shot, or try to attack off one-pass
    //console.log("Is defense: " + is_defense);
    if(is_defense){
        elem_tag = base_elem_tag + "fp_rate_graph_div";
        data_id = base_elem_tag + "fp_rate";
        elem = $("#" + elem_tag); elem.empty();
        
        specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 35, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
        
        data = {'axis_labels': {'y': '% of Possessions w/ FP Awarded', 'x': ""}, 'data': []};
        tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
        tmp.points = [];
        tmp.points.push({'x': 1, 'y': fp_data[prefix + "_fp_rate"], 'label': team_short_code});
        tmp.points.push({'x': 2, 'y': avg_data["fp_rate"], 'label': "NCAA"});
        data.data.push(tmp)
        
        x_ticks = create_game_x_ticks(data.data);
        data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
        y_ticks = create_pct_y_ticks(data.data, {'min': 0})
        data['y_ticks'] = y_ticks.ticks; data['max_y'] = y_ticks.max; data['min_y'] = 0;
        
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
            data['data_table_id'] = data_id;
            data['data_table'] = []
            
            d = {'header': "Free Position Rate"};
            data['data_table'].push(d);
            
            d = {'label': "FP Attempts", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'], 'x': 1}, {'val': avg_data['fp_attempts'], 'x': 2}]};
            data['data_table'].push(d);
            
            d = {'label': "Poss. Faced", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_possessions'], 'x': 1}, {'val': avg_data['possessions'], 'x': 2}]};
            data['data_table'].push(d);
            
            d = {'label': "FP Rate", 'fmt': '1%', 'data': [{'val': fp_data[prefix + '_fp_rate'], 'x': 1}, {'val': avg_data['fp_rate'], 'x': 2}]};
            data['data_table'].push(d);
            
            //console.log("kle.data.data_table"); console.log(data.data_table)

        }
        specs.has_data_table = 0;
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
            specs.has_data_table = 1;
            specs.n_rows = 4;
        }
        
        
    }
    else{
        elem_tag = base_elem_tag + "fp_shooter_graph_div";
        data_id = base_elem_tag + "fp_shooter";
        elem = $("#" + elem_tag); elem.empty();
        
        specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 35, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
        
        data = {'axis_labels': {'y': '% of FP Shots by FP Shooter', 'x': ""}, 'data': []};
        tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
        tmp.points = [];
        tmp.points.push({'x': 1, 'y': fp_data[prefix + "_fp_shooter_pct"], 'label': team_short_code});
        tmp.points.push({'x': 2, 'y': avg_data["fp_shooter_pct"], 'label': "NCAA"});
        data.data.push(tmp)
        
        x_ticks = create_game_x_ticks(data.data);
        data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
        y_ticks = create_pct_y_ticks(data.data, {'min': 0})
        data['y_ticks'] = y_ticks.ticks; data['max_y'] = y_ticks.max; data['min_y'] = 0;
        
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
            data['data_table_id'] = data_id;
            data['data_table'] = []
            
            d = {'header': "Shot by Player Awarded FP"};
            data['data_table'].push(d);
            
            d = {'label': "w/ Action-to-Goal", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'] * fp_data[prefix + "_fp_utilization"], 'x': 1}, {'val': avg_data['fp_attempts']*avg_data["fp_utilization"], 'x': 2}]};
            data['data_table'].push(d);
            
            d = {'label': "FP Shooter %", 'fmt': '1%', 'data': [{'val': fp_data[prefix + '_fp_shooter_pct'], 'x': 1}, {'val': avg_data['fp_shooter_pct'], 'x': 2}]};
            data['data_table'].push(d);
            
            d = {'label': "One-Pass Shot", 'fmt': '1%', 'data': [{'val': 1.0-fp_data[prefix + '_fp_shooter_pct'], 'x': 1}, {'val': 1.0-avg_data['fp_shooter_pct'], 'x': 2}]};
            data['data_table'].push(d);
            

        }
        specs.has_data_table = 0;
        if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
            specs.has_data_table = 1;
            specs.n_rows = 4;
        }
        
    }
    if(on_mobile){
        specs.width = $("#" + elem_tag).width() - 15;
    }
    else{
        specs.width = $("#" + elem_tag).width();
    }
    
    vertical_bars(data, elem_tag, specs);
    
    // When they do go to goal, how efficient are they (goals/attempts)
    elem_tag = base_elem_tag + "fp_efficiency_graph_div";
    data_id = base_elem_tag + "fp_efficiency";
    elem = $("#" + elem_tag); elem.empty();
    
    specs = {'redraw_tag': redraw_tag, 'highlight': 1, 'margin_left': 35, 'margin-right': 0, 'chart_size': 'small', 'flip': 0};
    
    data = {'axis_labels': {'y': '% of Used FP Attempts w/ Goals', 'x': ""}, 'data': []};
    tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
    tmp.points = [];
    tmp.points.push({'x': 1, 'y': fp_data[prefix + "_fp_efficiency"], 'label': team_short_code});
    tmp.points.push({'x': 2, 'y': avg_data["fp_efficiency"], 'label': "NCAA"});
    data.data.push(tmp)
    
    x_ticks = create_game_x_ticks(data.data);
    data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
    y_ticks = create_pct_y_ticks(data.data, {'min': 0})
    data['y_ticks'] = y_ticks.ticks; data['max_y'] = y_ticks.max; data['min_y'] = 0;
    
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs && data_table_specs[data_id]){
        data['data_table_id'] = data_id;
        data['data_table'] = []
        
        d = {'header': "FP Efficiency"};
        data['data_table'].push(d);
        
        d = {'label': "Attempts", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'], 'x': 1}, {'val': avg_data['fp_attempts'], 'x': 2}]};
        data['data_table'].push(d);
        
        d = {'label': "Goals", 'fmt': '0', 'data': [{'val': fp_data[prefix + '_fp_attempts'] * fp_data[prefix + "_fp_efficiency"], 'x': 1}, {'val': avg_data['fp_attempts'] * avg_data["fp_efficiency"], 'x': 2}]};
        data['data_table'].push(d);
        
        d = {'label': "Efficiency", 'fmt': '1%', 'data': [{'val': fp_data[prefix + "_fp_efficiency"], 'x': 1}, {'val': avg_data["fp_efficiency"], 'x': 2}]};
        data['data_table'].push(d);
    }
    specs.has_data_table = 0;
    if(typeof data_table_specs != 'undefined' && data_id in data_table_specs){
        specs.has_data_table = 1;
        specs.n_rows = 4;
    }
    
    if(on_mobile){
        specs.width = $("#" + elem_tag).width() - 15;
    }
    else{
        specs.width = $("#" + elem_tag).width();
    }
    
    vertical_bars(data, elem_tag, specs);
    
    // If we are looking at an offense, print the roster portion of the FP Analysis
	//console.log("fp_players..."); console.log(fp_players);
    if(!is_defense && fp_players != null && fp_players.length > 0){
        //console.log("ewk.fp_players"); console.log(fp_players);
        fp_players = fp_players.sort(function(a, b){ return b.fp_goals - a.fp_goals; });
        
        js_data = {'no_row_count': 1, 'fields': [], 'data': [], 'cell_size': on_mobile ? 'large-cell-holder' : 'cell-holder'}
    
        for(var a = 0;a<fp_players.length;a++){ p = fp_players[a];
            p.player = "<FORM id='player" + p.player_ID + "form' action='/team_player_detail' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.player+ "</span></FORM>";
        }
        js_data.data = fp_players;
        player_link = "";
        
        
        // Visualization
        js_data.classes = [{'class': 'no-padding col-3-5 mouseover-link'}, {'outer_class': 'col-9-7', 'classes': [{'class': 'centered'}, {'class': 'centered'}, {'class': 'centered'}]}];
        js_data.fmt = [{'fmt': ""}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1%"}];
        js_data.fields.push({'sort_by': 'player', 'tag': 'player', 'display': 'Player'});
        js_data.fields.push({'sort_by': 'fp_shots', 'tag': 'fp_shots', 'display': 'fpShots'});
        js_data.fields.push({'sort_by': 'fp_goals', 'tag': 'fp_goals', 'display': 'fpGoals'});
        js_data.fields.push({'sort_by': 'fp_shooting_pct', 'tag': 'fp_shooting_pct', 'mob_display': 'fpSh%', 'dtop_display': 'fpSh%'});
                
        id = "offensive_fp_roster_div";
        $("#" + id).empty();  $("#" + id).removeClass("hidden"); 
        generic_create_table(js_data, {'id': id, 'target_elem': id});

    }
    
    return misc
}

function display_team_performance_keys(misc, unit, player_outcome_splits_specs, target_id){
    /***
    This function takes in a set of player-outcome-splits for the specified team and displays the associated table content within the card specified by the target_id argument. Specify the offense or defense via the unit argument.
    ***/
    
    //console.log("unit arg: " + unit);
    //console.log("misc.handler: " + misc.handler);
    
    var is_women = 0;
    if('data' in misc && 'league' in misc.data && misc.data.league.indexOf("Women") > -1){
        is_women = 1;
    }
    
    
    var subject_unit = unit == "offensive" || unit == "offense" ? "offense" : "defense";
    var splits = null;
    var subject = null;
    var is_next_game = 0;
    var elem_tag = null;
    if('handler' in misc && misc.handler.indexOf("schedule") > -1){
        splits = misc.data.next_game.opp_player_outcome_splits['player_outcome_splits_' + player_outcome_splits_specs[subject_unit + "_game_type"]].filter(r=> r.unit == subject_unit)[0].top_splits;
        subject = misc.data.next_game.opponent_display;
        is_next_game = 1;
        elem_tag = "#next_game_" + unit + "_keys_labels_div";
    }
    else if('player_outcome_splits' in misc.data){
        //console.log("a,misc.data.player_outcome_splits");
		//console.log(misc.data.player_outcome_splits)
        splits = misc.data.player_outcome_splits['player_outcome_splits_' + player_outcome_splits_specs[subject_unit + "_game_type"]].filter(r=> r.unit == subject_unit)[0].top_splits;
        subject = misc.data.display_name;
        elem_tag = "#" + unit + "_keys_labels_div";
    }
    
    //console.log(" tmp_data.*"); console.log( tmp_data['player_outcome_splits_' + player_outcome_splits_specs[subject_unit + "_game_type"]]);
    //console.log("pqs.splits"); console.log(splits);
	//console.log("elem_tag: " + elem_tag);
	//console.log(" table div id: " + id);
    for(var a = 0;a<splits.length;a++){ sp = splits[a];
    
        if(a > 5){ sp.class = unit + "-hidden hidden"; }
        sp.stdesc = sp.stdesc.replace("y S", "yS")
        sp.low_efficiency_str = jsformat(sp.low_efficiency*100.0, "0") + "%";
        sp.high_efficiency_str = jsformat(sp.high_efficiency*100.0, "0") + "%";
        if(sp.fmt.indexOf("%") > -1){
            sp.lv_str = jsformat(sp.lv*100.0, "0") + "%";
            sp.hv_str = jsformat(sp.hv*100.0, "0") + "%";
        }
        else{
            if(jsformat(sp.lv, "0") == ("" + sp.lv)){
                // It's a round integer
                sp.lv_str = ("" + sp.lv);
            }
            else{
                sp.lv_str = jsformat(sp.lv, "1");
            }
            if(jsformat(sp.hv, "0") == ("" + sp.hv)){
                // It's a round integer
                sp.hv_str = ("" + sp.hv);
            }
            else{
                sp.hv_str = jsformat(sp.hv, "1");
            }
        }
        
        //if(a == 0){ console.log(sp); }
    
        
        
        exp_data = subject_unit + "---" + sp.vrl + "---" + subject + "---" + sp.stdesc + "---" + jsformat(sp.low_efficiency*100.0, "0") + "%" + "---" + jsformat(sp.high_efficiency*100.0, "0") + "%" + "---" + sp.gr + "---" + sp.game_subset + "---" + sp.low_rec + "---" + "---" + sp.high_rec + "---" + "---" + sp.hv_str + "---" + player_outcome_splits_specs.year_desc;
        exp_value = "team_my_schedule.html|player_outcome_splits|" + exp_data;
        
        //sp.expand = "<img id='" + unit + "_split" + a + "_imgicon' value='" + exp_value + "' class='icon-10 explanation plus-toggle row-toggle'
		sp.expand = "<img id='" + unit + "_split" + a + "_imgicon' value='" + exp_value + "' onclick='parse_explanation_tags(\"" + exp_value + "\");' class='icon-10 plus-toggle row-toggle'		style='margin-right:5px;' src='static/img/" + (a % 2 == 0 ? "Gray_Plus_Skinny150Highlight.png" : "Gray_Plus_Skinny150.png") + "' />";
        
        
        sp.hv_str = "+/- " + sp.hv_str;
        
        if(sp.gr == "Ind. Players"){
			//console.log("sp.vr1"); console.log(sp);
			if('url_tag' in sp && ['', null].indexOf(sp.url_tag) == -1){
						
				sp.vrl_html = "<a class='mouseover-link no-padding' id='player" + sp.vr + "form' href='/" + sp.url_tag + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? "?t=" + misc.tracking_tag : "") + "'><span  class='contents'>" + sp.vrl + "</span></a>";
			}
			else{
				sp.vrl_html = "<FORM id='player" + sp.vr + "form' action='/team_player_detail' method=POST><input type=hidden name='ID' value='" + sp.vr + "'><input type=hidden name='came_from' value='team_players'><span onclick=\"document.getElementById(\'player" + sp.vr + "form\').submit();\" id='player_search_span" + a + "' class='test-player pointer mouseover-link font-12 no-padding'>" + sp.vrl + "</span></FORM>";
			}
        }
        else{
            sp.vrl_html = sp.vrl;
        }
        
        
    }
    // Visualization
    
    // Add the controls div to select which type of game you are looking at (all, conf, non-conf)
    
    // Add the Less Than More then Labels

    var elem = $(elem_tag);
    elem.empty();
    var r_html = "";
    // If the current season has no data for this team, use last year's information
    if(is_next_game && 'opp_player_outcome_splits_this_year' in misc.data.next_game && misc.data.next_game.opp_player_outcome_splits_this_year == 0){
        r_html += "<div class='error' style='padding:5px;'>";
            r_html += "<span class='dtop'>Note: data reflects unit keys from " + (misc.data.next_game.game_year-1) + "</span>";
            r_html += "<span class='mob'>Data from " + (misc.data.next_game.game_year-1) + "</span>";
        r_html += "</div>";
    }
    
    elem.append(r_html); 
    
    header_html = "<div class='dtop no-padding'><div class='flex-block no-padding'>";
        
		header_html += "<div class='col-6-12'><div class='col-12 no-padding flex'>";
			//console.log("player_outcome_splits_specs[subject_unit + \"_game_type\"]: " + player_outcome_splits_specs[subject_unit + "_game_type"]);
			header_html += "<div class='col-6 centered no-padding inline-flex'><input value='peer_only' onchange='toggle_keys_to_the_game_filter(\"peer_only\", \"" + unit + "\", \"" + subject_unit + "\", \"" + target_id+ "\")'; style='margin-left: 20px;' " +  (player_outcome_splits_specs[subject_unit + "_game_type"] == "peer_only" ? "checked": "") + " type=radio name='" + subject_unit + "_keys_games_filter' id='" + subject_unit + "_keys_games_filter_peers' /><span class='font-12' style='padding-top:10px;'>Peer Games</span><div class='right no-padding dashboard-tile-help-icon' style='margin-top:12px;'><img id='stat_trends_select_a_stat_helpicon' class='icon-15 explanation' value=\"team_my_stats.html|peer-team-definition\" src=\"static/img/Gray_Info150.png\" /></div></div>";
			header_html += "<div class='col-6 centered no-padding inline-flex'><input val='all' onchange='toggle_keys_to_the_game_filter(\"all\", \"" + unit + "\", \"" + subject_unit + "\", \"" + target_id+ "\")';  " +  (player_outcome_splits_specs[subject_unit + "_game_type"] == "all" ? "checked": "") + " type=radio name='" + subject_unit + "_keys_games_filter' id='" + subject_unit + "_keys_games_filter_all' /><span class='font-12' style='padding-top:10px;'>All Games</span></div>";

        header_html += "</div></div>";
		
		
        header_html += "<div class='col-5-12'><div class='col-12 no-padding flex'>";
            header_html += "<div class='col-6 centered'><span class='site-blue font-15' style='font-style:italic;'>When Less</span></div>";
            header_html += "<div class='col-6 centered'><span class='site-blue font-15' style='font-style:italic;'>When More</span></div>";
        header_html += "</div></div>";
        header_html += "<div class='col-1 dtop'></div>";
    header_html += "</div></div>";
    
    
    
    js_data = {'no_row_count': 1, 'data': [], 'cell_size': on_mobile ? 'large-cell-holder' : 'cell-holder'}
    
    js_data.data = splits.slice(0, 20);
    
    
    // Visualization
    js_data.classes = [{'class': 'col-3 no-padding'}, {'class': 'col-2 no-padding'}, {'class': 'col-1 no-padding'}, {'outer_class': 'col-5 centered', 'classes': [{'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}]}, {'class': 'col-1 no-padding right'}];
    js_data.fmt = [{'fmt': ""}, {'fmt': ""}, {'fmt': ""}, {'fmt': ""}, {'fmt': ""}, {'fmt': ""}, {'fmt': ""}, {'fmt': ""}];

    js_data.fields = [];
    js_data.fields.push({'sort_by': 'vrl', 'tag': 'vrl_html', 'display': unit == "defense" && is_next_game ? 'Opposing' : ""});
    js_data.fields.push({'sort_by': 'stdesc', 'tag': 'stdesc', 'display': 'What'});
    js_data.fields.push({'sort_by': 'hv', 'tag': 'hv_str', 'display': 'Split'});
    js_data.fields.push({'sort_by': 'low_efficiency', 'tag': 'low_efficiency_str', 'display': 'Eff%'});
    js_data.fields.push({'sort_by': 'low_wp', 'tag': 'low_rec', 'mob_display': 'When less', 'dtop_display': 'Record'});
    js_data.fields.push({'sort_by': 'high_efficiency', 'tag': 'high_efficiency_str', 'display': 'Eff%'});
    js_data.fields.push({'sort_by': 'high_wp', 'tag': 'high_rec', 'mob_display': 'When more', 'dtop_display': 'Record'});
    js_data.fields.push({'tag': 'expand', 'display': ''});
    $("#" + target_id).empty(); 
        
    if(js_data.data.length == 0){
        $("#" + target_id).append("<div class='col-12 centered' style='padding-top:60px;'><span class='contents font-15 error'>There are no keys to display yet.</span></div>");
    }
    else{
        elem.append(header_html); 
        generic_create_table(js_data, {'id': target_id, 'target_elem': target_id});
        var see_more_row = "<div class='col-12 centered pointer' id='" + unit + "_see_more_div'><span onclick='unhide_keys(\"" + unit + "\");' class='light'>See more</span></div>";
        $("#" + target_id).append(see_more_row);
    }
                
    return misc
}

function toggle_keys_to_the_game_filter(val, unit, subject_unit, target_id){	
	/*** This function allows a user to switch between a keys-to-the-game report that shows the data for all games or just for games against peers (conf and similar LaxElo).
	***/
	
	console.log('set player_outcome_splits_specs["' + subject_unit + '_game_type"]: ' + val);
	player_outcome_splits_specs[subject_unit + "_game_type"] = val;
	
	display_team_performance_keys(misc, unit, player_outcome_splits_specs, target_id)
	
}


function rolling_avg(pts, period){
    /***
    This function calculates a rolling average equivalent to the list of pts. The period specifies how many elements are used in the average. The result mirrors the original pts except it will have (period-1) fewer elements. The result is aligned so that the last element of res and pts have the same x location.
    ***/
    var res = [];
    pts = pts.sort(function(a, b) { return a.x - b.x; });
    var n = pts.length;
    
    for(var a = period - 1;a<n;a++){ var pt = pts[a];
        
        d = {'x': pt.x, 'label': pt.label, 'y': 0};
        //console.log(d.x);
        for(var b = a - period + 1;b<=a;b++){ sum_pt = pts[b];
            d.y += sum_pt.y;
        }
        d.y = d.y / period;
        res.push(d);
    }
    
    //console.log("Rolling avg")
    //console.log(pts)
    //console.log(res)
    
    return res;
}

function show_more(id){
    /***
    In some situations, part of a text string is not shown by default, but can be shown by clicking the more... label. This function unhides the extra text.
    ***/
    $("#" + id).addClass('shown');
    $("#" + id.replace("text", "label")).addClass('hidden');
}

function process_laxelo_history(misc, include_all_teams=true){
    /***
    There are several places where we show the lifetime LaxElo chart for a given team. It includes the team, their conference average and a light gray line for the other teams in their conference. Rather than pre-create all this information for every team and force it to be pushed from the server, we just send the raw data and use this function to prepare it for visualization.
    ***/
    var raw = misc.extra_data.all_teams_laxelo_history;
    var start_x = misc.laxelo_movement_start_date;
    
    var raw_history = [];
    var change_history = [];
    
    var conf_ID = null;
    var team_entry = null;
    var conf = {'add': 1, 'stroke': "maroon", 'stroke-dasharray': null, 'stroke-width': 1, 't': {'display_name': 'Conf Avg'}, 'n': 0.0};
    var rows = []
    
    /***
    Convert the raw LaxElo data into a format that can be used by the graphics functions. Each year is stored separately in the raw data and remains separate in our data structure.
    ***/
    //for(var a = 0;a<raw.length;a++){
    //    var row = JSON.parse(JSON.stringify(raw[a]));
    //    console.log(row.t + " " + row.d.split("~").length + " points");
    //}
    
    var orig_rows = []
    var last_x = null; var last_y = null; var last_dt = null; var adds = []
    for(var a = 0;a<raw.length;a++){
        var row = JSON.parse(JSON.stringify(raw[a]));
        row.add = 0; row.team = 0;
        
        row.conf_agg = false;
        var tokens = row.t.split("|")
            
        row.t = {'years': [], 'change_years': [], 'team_ID': parseInt(tokens[0]), 'conf_ID': parseInt(tokens[1]), 'display_name': tokens[2]}
        var years = row.d.split("*");
        for(var b = 0;b<years.length;b++){
            var yr = {};
            var year_value = parseInt(years[b].substring(0,4));
            yr.points = years[b].substring(4).split("~");
            //if(a == 0 && b == 0){
            //    console.log(yr.points);
            //}
            last_x = null; last_y = null; adds = []
            for(var c = 0;c<yr.points.length;c++){
                tokens = yr.points[c].split("|")
                var x_val = parseInt(tokens[0]);
                var y_val = parseInt(tokens[1]);
                
                yr.points[c] = {'label': (c==0 ? ""+year_value:""), 'x': x_val, 'y': y_val, 'dt': parseInt(tokens[2])};
                //if(row.t.team_ID == 1){ console.log(  yr.points[c].dt , start_x, yr.points[c].dt == start_x ); }
                
                
                
                if(last_x != null){
                    var diff = x_val - last_x;
                    for(var ab = 1;ab<diff;ab++){
                        adds.push({'label': '', 'x': last_x + ab, 'y': last_y});
                    }
                }
                
                
                last_x = x_val;
                last_y = y_val;
            }
            //if(b == 6 && [35, 37, 42, 1, 11].indexOf(row.t.team_ID) > -1){ console.log("\nTeam ID: " + row.t.team_ID +  " 1st x: " + yr.points[0].x +  " last x: " + yr.points[yr.points.length-1].x); }
            for(var ab = 0;ab<adds.length;ab++){
                yr.points.push(adds[ab]);
            }
            yr.points.sort(function(a, b){ return a.x - b.x; });
            for(var c = 0;c<yr.points.length;c++){
                if(yr.points[c].dt == start_x){
                    row.start_y = yr.points[c].y;
                }
            }
            
            row.t.years.push(yr);
        }
        
        if(typeof row.start_y == "undefined"){ row.start_y = 1500.0; }
        for(var b = 0;b<years.length;b++){
            var change_yr = {};
            year_value = parseInt(years[b].substring(0,4));
            change_yr.points = years[b].substring(4).split("~");
            last_x = null; last_y = null; last_dt = null; adds = []

            for(var c = 0;c<change_yr.points.length;c++){
                tokens = change_yr.points[c].split("|")
                x_val = parseInt(tokens[0]);
                y_val = (parseInt(tokens[1])/row.start_y)* 100.0;
                var dt_val = parseInt(tokens[2])
                change_yr.points[c] = {'label': (c==0 ? ""+year_value:""), 'x': x_val, 'y': y_val, 'dt': dt_val};
                
                if(last_x != null){
                    var diff = x_val - last_x;
                    for(var ab = 1;ab<diff;ab++){
                        adds.push({'label': '', 'x': last_x + ab, 'y': last_y, 'dt': last_dt + ab});
                    }
                }
                
                last_x = x_val;
                last_y = y_val;
                last_dt = dt_val;
            }
            for(var ab = 0;ab<adds.length;ab++){
                change_yr.points.push(adds[ab]);
            }

            change_yr.points.sort(function(a, b){ return a.x - b.x; });
            change_yr.points = change_yr.points.filter( d => d.dt >= start_x);
            row.t.change_years.push(change_yr);
        }
        orig_rows.push(row);
    }
    var conf_ID = null; var team_entry = null;
    for(var a = 0;a<orig_rows.length;a++){
        var row = orig_rows[a];
        /***
        We loop through all teams, so if this is the team that is being visualized, set the colors we want to use AND store their data in the "conf" row. The other conference teams will be added to the aggregate conference data in a later loop.
        ***/
        if(row.t.team_ID == misc.data.ID){
            row['stroke'] = include_all_teams ? "#77F" : "#99F"; row['stroke-dasharray'] = null; row['stroke-width'] = include_all_teams ? 2 : 1;                    
            conf_ID = row.t.conf_ID;
            conf.n = 1.0;
            conf.t.years = JSON.parse(JSON.stringify(row.t.years));
            conf.t.change_years = JSON.parse(JSON.stringify(row.t.change_years));
            row.team = 1;
            team_entry = row;
            //console.log("row.t"); console.log(row.t);
        }
        rows.push(row);
    }
    
    /***
    Filter for just those teams that are in the conference with the team that we are visualizing.
    ***/
    for(var a = 0;a<rows.length;a++){
        var row = rows[a];
        if(row.t.team_ID != misc.data.ID && row.t.conf_ID == conf_ID){
            row.stroke = "#DDD"; row['stroke-width'] = 1; row['stroke-dasharray'] = null; row.add = 1;
            conf.n += 1.0;
            
            
            for(var c = 0;c<conf.t.years.length;c++){
                
                //console.log("conf.t.years[" + c + "].points; conf n=" + conf.t.years[c].points.length + " row n=" + row.t.years[c].points.length);
                //console.log(conf.t.years[c].points);
                for(var b = 0;b<conf.t.years[c].points.length;b++){
                    var row_n = row.t.years[c].points.length;
                    if( b > row_n - 1){
                        conf.t.years[c].points[b].y += row.t.years[c].points[row_n-1].y;
                    }
                    else{
                        conf.t.years[c].points[b].y += row.t.years[c].points[b].y;
                    }
                }
            }
            
            for(var c = 0;c<conf.t.change_years.length;c++){
                    
                
                //console.log("conf.t.change_years[" + c + "].points");
                //console.log(conf.t.change_years[c].points);
                for(var b = 0;b<conf.t.change_years[c].points.length;b++){
                    var row_n = row.t.years[c].points.length;
                    if( b > row_n - 1){
                        conf.t.change_years[c].points[b].y += row.t.change_years[c].points[row_n-1].y;
                    }
                    else{
                        conf.t.change_years[c].points[b].y += row.t.change_years[c].points[b].y;
                    }
                }
            }
        }
    }
    
    /***
    Calculate the conference average as the average of all the conference teams for each date in the sample; Do it for raw_history and the change_history values.
    ***/
    for(var c = 0;c<conf.t.years.length;c++){
        for(var b = 0;b<conf.t.years[c].points.length;b++){
            conf.t.years[c].points[b].y /= conf.n;
        }
    }
    for(var c = 0;c<conf.t.change_years.length;c++){
        for(var b = 0;b<conf.t.change_years[c].points.length;b++){
            conf.t.change_years[c].points[b].y /= conf.n;
        }
    }
    
    /***
    Add the conference average as a unique row (otherwise, it wouldn't show up on the chart).
    ***/
    rows.push(conf);
    
    /***
    Add each year for each team/conference as a unique set of data points with the appropriate coloration. These are the objects that get displayed as individual lines via the graphics functions. row.add is used to filter out teams that aren't relevant for the specific display we are doing (i.e. not in the same conference).
    ***/
    for(var a = 0;a<rows.length;a++){
        var row = rows[a];
        if(row.add){
            for(var b = 0;b<row.t.years.length;b++){
                yr = row.t.years[b];
                var d = {'stroke': row.stroke, 'stroke-width': row['stroke-width'], 'stroke-dasharray': row['stroke-dasharray'], 'display_name': row.display_name, 'points': yr.points}
                raw_history.push(d);
                
                change_yr = row.t.change_years[b];
                var change_d = {'stroke': row.stroke, 'stroke-width': row['stroke-width'], 'stroke-dasharray': row['stroke-dasharray'], 'display_name': row.display_name, 'points': change_yr.points}
                change_history.push(change_d);
            }
        }
    }
    
    /***
    We always want the team in question to be on top, so we add their data to the list of lines to display last.
    ***/
    for(var a = 0;a<rows.length;a++){
        var row = rows[a];
        if(row.team){
            for(var b = 0;b<row.t.years.length;b++){
                yr = row.t.years[b];
                var d = {'stroke': row.stroke, 'stroke-width': row['stroke-width'], 'stroke-dasharray': row['stroke-dasharray'], 'display_name': row.display_name, 'points': yr.points}
                raw_history.push(d);
                
                change_yr = row.t.change_years[b];
                var change_d = {'stroke': row.stroke, 'stroke-width': row['stroke-width'], 'stroke-dasharray': row['stroke-dasharray'], 'display_name': row.display_name, 'points': change_yr.points}
                change_history.push(change_d);
            }
        }
    }
    
    if(typeof timelog != "undefined"){
        time_log[time_log.length-1].end = new Date().getTime();
    }
    
    if(!include_all_teams){ raw_history = raw_history.filter(r=> r.stroke != "#DDD"); }
    if(!include_all_teams){ change_history = change_history.filter(r=> r.stroke != "#DDD"); }
    misc.all_teams_laxelo_history = raw_history;
    misc.all_teams_laxelo_change_history = change_history;
    return misc;
}

function toggle_stats_rank_filter(id, s, checked){
    /***
    In the Team product, this function is triggered when the user selects or deselects an option in the garbage time/competitive list. The choice is stored in the relevant filters object (one for each unit) and then read when the appropriate display function is re-run at the end of this function.
    
    This version is duplicated (more or less) in toggle_stats_rank_filter_basic, but because the functions that need to be run when the choice is stored are different, I just created a separate function.
    ***/
        
    id_tokens = id.split("|");
    tokens = s.split("|");
    filter_list = tokens[0];
    tag = tokens[1];
    val = tokens[2];
    
    fltr = filters[id_tokens[0]].options.filter(d => d.tag == id_tokens[1])[0]
    
    for(var b = 0;b<fltr.choices.length;b++){
        if(val == fltr.choices[b].val){ fltr.choices[b].selected = (checked) ? 1: 0; }
    }
    
    filter_settings = []
    for(var a = 0;a<filters[id_tokens[0]].options.length;a++){
        all_selected = true;
        none_selected = true;
        f = {'filter': tag, 'includes': []}
        for(var b = 0;b<filters[id_tokens[0]].options[a].choices.length;b++){
            if(filters[id_tokens[0]].options[a].choices[b].selected){
                none_selected = false;
                f.includes.push(filters[id_tokens[0]].options[a].choices[b].val);
            }
            else{
                all_selected = false;
            }
        }
        if(!none_selected && !all_selected){
            filter_settings.push(f);
        }
    }
    if(filter_settings.length == 0){
        filter_settings.push({'filter': null, 'includes': [null]});
    }
    

    
    calc_specs[id_tokens[0]].data_type = null;
    if(['offense', 'faceoffs'].indexOf(id_tokens[0]) > -1){ calc_specs[id_tokens[0]].data_type ="offense"; }
    else{ calc_specs[id_tokens[0]].data_type ="defense"; }
    calc_specs[id_tokens[0]].filters = filter_settings;
    
    
	if(id_tokens[0] == "roster"){ display_roster("roster", "roster"); }
	else{
		
		// Normally, triggering the change of filter would cause the settings variables to be changed and then immediately cause the display function to be re-executed with the new settings (which would produce the desired filtered display. But if the team game summary data has not been loaded, we need to insert a step to request it via an ASYNC POST and then have the async JS file call the appropriate function for us once the data has been loaded.
		
		if(!misc.db_team_summaries_requested){
			var stats_div = null;
			if(id_tokens[0] == "offense"){ stats_div = "offensive_ranks_graph_div"; }  
			if(id_tokens[0] == "defense"){ stats_div = "defensive_ranks_graph_div"; }  
			if(id_tokens[0] == "faceoffs"){ stats_div = "faceoffs_ranks_graph_div"; }     
			if(id_tokens[0] == "goalkeepers"){ stats_div = "goalkeepers_ranks_graph_div"; }     

			if(stats_div != null){
				$("#" + stats_div).empty();
				$("#" + stats_div).append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
			}
			
			var create_non_local_labels = 1;
			// In June of 2024, the label strings were removed from the buckets in alt_ranks objects and the buckets and conf_values were converted to the list_and_keys structure; this check determines whether the function should use this new struture or the legacy structure
			
			async_run(null, misc.data.ID, "handler-team_detail|action-team_get_db_team_summaries|year-" + misc.year + "|key-" + misc.data.league + "|field-" + id_tokens[0] + "|val-" + create_non_local_labels);
			return;
		}
		
		//if(id_tokens[0] == "offense"){ selected_unit = "offense"; display_stats("offense"); }  
		//if(id_tokens[0] == "defense"){ selected_unit = "defense"; display_stats("defense"); } 
		//if(id_tokens[0] == "faceoffs"){ selected_unit = "faceoffs"; display_stats("faceoffs"); }    
		//if(id_tokens[0] == "goalkeepers"){ selected_unit = "goalkeepers"; display_stats("goalkeepers"); }   
		if(id_tokens[0] == "offense"){ display_primary_unit("offense", "offensive_ranks"); }  
		if(id_tokens[0] == "defense"){ display_primary_unit("defense", "defensive_ranks"); } 
		if(id_tokens[0] == "faceoffs"){ display_faceoffs("faceoffs", "faceoffs_ranks"); }    
		if(id_tokens[0] == "goalkeepers"){ display_goalkeepers("goalkeepers", "goalkeepers_ranks"); }                
	}    
    
}

function toggle_stats_rank_filter_basic(id, s, checked){
    /***
    In the basic/fan product, this function is triggered when the user selects or deselects an option in the garbage time/competitive list. The choice is stored in the relevant filters object (one for each unit) and then read when the appropriate display function is re-run at the end of this function.
    
    This version is duplicated (more or less) in toggle_stats_rank_filter, but because the functions that need to be run when the choice is stored are different, I just created a separate function.
    ***/
    id_tokens = id.split("|");
    tokens = s.split("|");
    filter_list = tokens[0];
    tag = tokens[1];
    val = tokens[2];
    
	report_js_log_entry(misc.target_template + "|missingDBTeamSummariesRequestedField|" + misc.nhca, "toggle_stats_rank_filter_basic: " + tag + "|" + val);
	
    console.log("toggle_stats_rank_filter_basic: " + tag + "|" + val);
    if('db_team_summaries_requested' in misc){
        console.log("misc.db_team_summaries_requested: " + misc.db_team_summaries_requested);
    }
    else{
        //report_js_visualization_issue(misc.target_template + "|missingDBTeamSummariesRequestedField|" + misc.nhca);
        misc.db_team_summaries_requested = 0;
    }
    
    
    
    fltr = filters[id_tokens[0]].options.filter(d => d.tag == id_tokens[1])[0]
    
    for(var b = 0;b<fltr.choices.length;b++){
        if(val == fltr.choices[b].val){ fltr.choices[b].selected = (checked) ? 1: 0; }
    }
    
    filter_settings = []
    for(var a = 0;a<filters[id_tokens[0]].options.length;a++){
        all_selected = true;
        none_selected = true;
        f = {'filter': tag, 'includes': []}
        for(var b = 0;b<filters[id_tokens[0]].options[a].choices.length;b++){
            if(filters[id_tokens[0]].options[a].choices[b].selected){
                none_selected = false;
                f.includes.push(filters[id_tokens[0]].options[a].choices[b].val);
            }
            else{
                all_selected = false;
            }
        }
        if(!none_selected && !all_selected){
            filter_settings.push(f);
        }
    }
    if(filter_settings.length == 0){
        filter_settings.push({'filter': null, 'includes': [null]});
    }
    

    
    calc_specs[id_tokens[0]].data_type = null;
    if(['offense', 'faceoffs'].indexOf(id_tokens[0]) > -1){ calc_specs[id_tokens[0]].data_type ="offense"; }
    else{ calc_specs[id_tokens[0]].data_type ="defense"; }
    calc_specs[id_tokens[0]].filters = filter_settings;
    
    if(id_tokens[0] == "roster"){ display_roster("roster", "roster"); }
    else{
        
        // Normally, triggering the change of filter would cause the settings variables to be changed and then immediately cause the display function to be re-executed with the new settings (which would produce the desired filtered display. But if the team game summary data has not been loaded, we need to insert a step to request it via an ASYNC POST and then have the async JS file call the appropriate function for us once the data has been loaded.
        
        if(!misc.db_team_summaries_requested){
            var stats_div = null;
            if(document.getElementById('ranks_graph_div') != null){ stats_div = "ranks_graph_div"; }
            if(stats_div != null){
                $("#" + stats_div).empty();
                $("#" + stats_div).append("<div class='centered col-12' style='padding-top:35px;'><img src='/static/img/PaymentProcessing.gif' /></div>");
            }
			var create_non_local_labels = 1;
			// In June of 2024, the label strings were removed from the buckets in alt_ranks objects and the buckets and conf_values were converted to the list_and_keys structure; this check determines whether the function should use this new struture or the legacy structure
			
            async_run(null, misc.data.ID, "handler-basic_team_detail|action-get_db_team_summaries|year-" + misc.year + "|key-" + misc.data.league + "|val-" + create_non_local_labels);
            return;
        }
        
        if(id_tokens[0] == "offense"){ selected_unit = "offense"; display_stats("offense"); }  
        if(id_tokens[0] == "defense"){ selected_unit = "defense"; display_stats("defense"); } 
        if(id_tokens[0] == "faceoffs"){ selected_unit = "faceoffs"; display_stats("faceoffs"); }    
        if(id_tokens[0] == "goalkeepers"){ selected_unit = "goalkeepers"; display_stats("goalkeepers"); }    
    }
    
}

function gameToGameProUrlTag(g, specs = {}) {
    let error = null;
    let tmpG = { team1: null, team2: null, genderChar: null, year: null, ID: null };

    function hashPlayerName(name) {
        return name.toLowerCase().replace(/\s+/g, ""); // Example hash function
    }

    if (specs.team && specs.opponent_display) {
        let tmp1 = hashPlayerName(specs.team);
        let tmp2 = hashPlayerName(specs.opponent_display);
        if (tmp1 < tmp2) {
            tmpG.team1 = tmp1; tmpG.team2 = tmp2;
        } else {
            tmpG.team1 = tmp2; tmpG.team2 = tmp1;
        }
    } else if (specs.team && specs.opponent) {
        let tmp1 = hashPlayerName(specs.team);
        let tmp2 = hashPlayerName(specs.opponent);
        if (tmp1 < tmp2) {
            tmpG.team1 = tmp1; tmpG.team2 = tmp2;
        } else {
            tmpG.team1 = tmp2; tmpG.team2 = tmp1;
        }
    } else if (specs.team1 && specs.team2) {
        let tmp1 = hashPlayerName(specs.team1);
        let tmp2 = hashPlayerName(specs.team2);
        if (tmp1 < tmp2) {
            tmpG.team1 = tmp1; tmpG.team2 = tmp2;
        } else {
            tmpG.team1 = tmp2; tmpG.team2 = tmp1;
        }
    }

    if (g.league) {
        tmpG.genderChar = g.league.toLowerCase().includes("women") ? "w" : "m";
    } else if (g.gender) {
        tmpG.genderChar = g.gender.toLowerCase().includes("w") ? "w" : "m";
    }

    tmpG.year = g.year || g.game_year || g.zgame_year || (g.game_date instanceof Date ? g.game_date.getFullYear() : null);
    tmpG.ID = g.ID || g.gID || g.game_ID;

    function toZHex(value, length) {
        return parseInt(value, 10).toString(16).padStart(length, '0').toLowerCase();
    }

    let proUrlTag = `game-${tmpG.team1}-vs-${tmpG.team2}-${tmpG.genderChar}lax-${tmpG.year}-${toZHex(tmpG.ID, 3)}`;
    return [proUrlTag, error];
}

function reinflate_result_patterns_w_IDs(){
	var inflate_required=1; var data_object_exists = 1

	if(!('data' in misc) || misc.data == null){ 
		//console.log("not required - 1");
		inflate_required=0; 
		data_object_exists = 0;
	}
	else if(!('result_patterns_w_IDs_list_and_keys' in misc.data) || misc.data.result_patterns_w_IDs_list_and_keys == null){ 
		//console.log("not required - 2");
		inflate_required=0; 
		data_object_exists = 0;
	}
	else if (typeof misc.data.result_patterns_w_IDs_list_and_keys.keys[0] == "undefined") {
		//console.log("not required - 3");
		inflate_required=0; 
	}	
	else if (!('keys' in misc.data.result_patterns_w_IDs_list_and_keys)) {
		//console.log("not required - 4");
		inflate_required=0; 
	}	
	
	// If we have list and keys, but no data, return an empty list
	if(data_object_exists && 'result_patterns_w_IDs_list_and_keys' in misc.data && misc.data.result_patterns_w_IDs_list_and_keys != null){
		if('data' in misc.data.result_patterns_w_IDs_list_and_keys && 'keys' in misc.data.result_patterns_w_IDs_list_and_keys){
			if(misc.data.result_patterns_w_IDs_list_and_keys.data.length == 0){
				console.log("List and keys, but no data");
				misc.data.result_patterns_w_IDs_list_and_keys = [];
				return;
			}
		}
	}
	
	if(!inflate_required){ return; }
	
	console.log("inflate misc.data.result_patterns_w_IDs_list_and_keys...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.data.result_patterns_w_IDs_list_and_keys.keys};
	var keys_to_switch = misc.data.result_patterns_w_IDs_list_and_keys.keys;
	
	

	for(var a = 0;a<misc.data.result_patterns_w_IDs_list_and_keys.data.length;a++){ p = misc.data.result_patterns_w_IDs_list_and_keys.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.data.result_patterns_w_IDs = tmp_list;
}

function reinflate_list_and_keys(){
	reinflate_db_statistics();
	reinflate_all_games();
	reinflate_db_teams();
	reinflate_player_outcome_splits();
	reinflate_season_games();
	reinflate_team_seasons();
	reinflate_request_popReport_Shooters_team_roster();
	reinflate_depth_chart_players();
}

//splits = misc.data.next_game.opp_player_outcome_splits['player_outcome_splits_' + player_outcome_splits_specs[subject_unit + "_game_type"]].filter(r=> r.unit == subj

function reinflate_email_subscriber(subscriber){
	console.log("reinflating...")
	console.log(subscriber);
	var inflate_required=1;
	if(!('send_dates_last_30d_lk' in subscriber) || subscriber.send_dates_last_30d_lk == null){ 
		inflate_required=0; 
	}
	if('inflated' in subscriber && subscriber.inflated){
		inflate_required=0; 
	}
	if(!inflate_required){ return subscriber; }
	
	console.log("inflate email_subscriber...");
	//console.log(subscriber.send_dates_last_30d_lk)
	//console.log(subscriber.send_dates_last_30d_lk.keys)
	
	var rk_specs = {'keys': subscriber.send_dates_last_30d_lk.keys};
	var keys_to_switch = subscriber.send_dates_last_30d_lk.keys;
	
	var tmp_list = [];
	for(var a = 0;a<subscriber.send_dates_last_30d_lk.data.length;a++){ p = subscriber.send_dates_last_30d_lk.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	subscriber.send_dates_last_30d_lk = tmp_list;
	
	
	rk_specs = {'keys': subscriber.content_sent_last_30d_lk.keys};
	keys_to_switch = subscriber.content_sent_last_30d_lk.keys;
	console.log(rk_specs)
	
	tmp_list2 = [];
	for(var a = 0;a<subscriber.content_sent_last_30d_lk.data.length;a++){ p = subscriber.content_sent_last_30d_lk.data[a];
		d = {};
		//console.log(p);
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list2.push(d);
	}
	subscriber.content_sent_last_30d_lk = tmp_list2;
	//console.log("subscriber.content_sent_last_30d_lk"); console.log(subscriber.content_sent_last_30d_lk)
	
	subscriber['inflated'] = 1
	return subscriber;

}


function reinflate_db_statistics(){
	
	var inflate_required=1;
	if(!('extra_data' in misc) || misc.extra_data == null){ 
		inflate_required=0; 
	}
	else if(!('db_statistics' in misc.extra_data) || misc.extra_data.db_statistics == null){ 
		inflate_required=0; 
	}
	else if (misc.extra_data.db_statistics.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate db_statistics...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.extra_data.db_statistics.keys};
	var keys_to_switch = misc.extra_data.db_statistics.keys;
	
	

	for(var a = 0;a<misc.extra_data.db_statistics.data.length;a++){ p = misc.extra_data.db_statistics.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.extra_data.db_statistics = tmp_list;

}

function reinflate_all_games(){
	
	var inflate_required=1;
	if(!('all_games' in misc) || misc.all_games == null){ 
		//console.log("not required - 6930");
		inflate_required=0; 
	}	
	else if (!('keys' in misc.all_games)) {
		console.log("not required - 6934");
		inflate_required=0; 
	}
	
	if(!inflate_required){ return; }
	
	console.log("inflate all_games...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.all_games.keys};
	var keys_to_switch = misc.all_games.keys;
	
	

	for(var a = 0;a<misc.all_games.data.length;a++){ p = misc.all_games.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.all_games = tmp_list;

}

function reinflate_season_games(){
	
	var inflate_required=1;
	if(!('data' in misc) || misc.data == null){ 
		inflate_required=0; 
	}
	else if(!('season_games' in misc.data) || misc.data.season_games == null){ 
		inflate_required=0; 
	}
	else if (misc.data.season_games.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate season_games...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.data.season_games.keys};
	var keys_to_switch = misc.data.season_games.keys;
	
	

	for(var a = 0;a<misc.data.season_games.data.length;a++){ p = misc.data.season_games.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.data.season_games = tmp_list;

}

function reinflate_team_seasons(){
	
	var inflate_required=1;
	if(!('data' in misc) || misc.data == null){ 
		inflate_required=0; 
	}
	else if(!('team_seasons' in misc.data) || misc.data.team_seasons == null){ 
		inflate_required=0; 
	}
	else if (misc.data.team_seasons.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate team_seasons...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.data.team_seasons.keys};
	var keys_to_switch = misc.data.team_seasons.keys;
	
	

	for(var a = 0;a<misc.data.team_seasons.data.length;a++){ p = misc.data.team_seasons.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.data.team_seasons = tmp_list;

}

function reinflate_request_popReport_Shooters_team_roster(){
	
	var inflate_required=1;
	if(!('data' in misc) || misc.data == null){ 
		inflate_required=0; 
	}
	else if(!('popReport_Shooters_team_roster' in misc.data) || misc.data.popReport_Shooters_team_roster == null){ 
		inflate_required=0; 
	}
	else if (misc.data.popReport_Shooters_team_roster.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate popReport_Shooters_team_roster...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.data.popReport_Shooters_team_roster.keys};
	var keys_to_switch = misc.data.popReport_Shooters_team_roster.keys;
	
	

	for(var a = 0;a<misc.data.popReport_Shooters_team_roster.data.length;a++){ p = misc.data.popReport_Shooters_team_roster.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.data.popReport_Shooters_team_roster = tmp_list;

}

function reinflate_player_outcome_splits(){
	
	var inflate_required=1;
	if(!('data' in misc) || misc.data == null){ 
		inflate_required=0; 
	}
	else if(!('player_outcome_splits' in misc.data) || misc.data.player_outcome_splits == null){ 
		inflate_required=0; 
	}
	else if(!('player_outcome_splits_all' in misc.data.player_outcome_splits) || misc.data.player_outcome_splits.player_outcome_splits_all == null || misc.data.player_outcome_splits.player_outcome_splits_all.length == 0){ 
		inflate_required=0; 
	}
	else if (misc.data.player_outcome_splits.player_outcome_splits_all[0].top_splits.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate player_outcome_splits...");
	var rk_specs = {'keys': misc.data.player_outcome_splits.player_outcome_splits_all[0].top_splits.keys};
	var keys_to_switch = rk_specs.keys;
	for(var c = 0;c < misc.data.player_outcome_splits.player_outcome_splits_all.length;c++){ 
		p = misc.data.player_outcome_splits.player_outcome_splits_all[c];
		var tmp_list = [];
		

		for(var a = 0;a<misc.data.player_outcome_splits.player_outcome_splits_all[c].top_splits.data.length;a++){ p = misc.data.player_outcome_splits.player_outcome_splits_all[c].top_splits.data[a];
			d = {};
			for(var b = 0;b<keys_to_switch.length;b++){
				d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			}
			tmp_list.push(d);
		}
		misc.data.player_outcome_splits.player_outcome_splits_all[c].top_splits = tmp_list;
	}
	for(var c = 0;c < misc.data.player_outcome_splits.player_outcome_splits_peer_only.length;c++){ 
		p = misc.data.player_outcome_splits.player_outcome_splits_peer_only[c];
		var tmp_list = [];
		

		for(var a = 0;a<misc.data.player_outcome_splits.player_outcome_splits_peer_only[c].top_splits.data.length;a++){ p = misc.data.player_outcome_splits.player_outcome_splits_peer_only[c].top_splits.data[a];
			d = {};
			for(var b = 0;b<keys_to_switch.length;b++){
				d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			}
			tmp_list.push(d);
		}
		misc.data.player_outcome_splits.player_outcome_splits_peer_only[c].top_splits = tmp_list;
	}
	
	// Now for the next game
	inflate_required=1;
	if(!('data' in misc) || misc.data == null){ 
		inflate_required=0; 
	}
	else if(!('next_game' in misc.data) || misc.data.next_game == null || misc.data.next_game == ""){ 
		inflate_required=0; 
	}
	else if(!('opp_player_outcome_splits' in misc.data.next_game) || misc.data.next_game.opp_player_outcome_splits == null){ 
		inflate_required=0; 
	}
	else if(!('player_outcome_splits_all' in misc.data.next_game.opp_player_outcome_splits) || misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all == null || misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all.length == 0){ 
		inflate_required=0; 
	}
	else if (misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[0].top_splits.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate player_outcome_splits...");
	var rk_specs = {'keys': misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[0].top_splits.keys};
	var keys_to_switch = rk_specs.keys;
	for(var c = 0;c < misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all.length;c++){ 
		p = misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[c];
		var tmp_list = [];
		

		for(var a = 0;a<misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[c].top_splits.data.length;a++){ p = misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[c].top_splits.data[a];
			d = {};
			for(var b = 0;b<keys_to_switch.length;b++){
				d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			}
			tmp_list.push(d);
		}
		misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_all[c].top_splits = tmp_list;
	}
	
	for(var c = 0;c < misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_peer_only.length;c++){ 
		p = misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_peer_only[c];
		var tmp_list = [];
		

		for(var a = 0;a<misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_peer_only[c].top_splits.data.length;a++){ p = misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_peer_only[c].top_splits.data[a];
			d = {};
			for(var b = 0;b<keys_to_switch.length;b++){
				d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			}
			tmp_list.push(d);
		}
		misc.data.next_game.opp_player_outcome_splits.player_outcome_splits_peer_only[c].top_splits = tmp_list;
	}
}

function reinflate_db_teams(){
	
	var inflate_required=1;
	if(!('extra_data' in misc) || misc.extra_data == null){ 
		inflate_required=0; 
	}
	else if(!('db_teams' in misc.extra_data) || misc.extra_data.db_teams == null){ 
		inflate_required=0; 
	}
	else if (misc.extra_data.db_teams.constructor != Object) {
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return; }
	
	console.log("inflate db_teams...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.extra_data.db_teams.keys};
	var keys_to_switch = misc.extra_data.db_teams.keys;
	
	

	for(var a = 0;a<misc.extra_data.db_teams.data.length;a++){ p = misc.extra_data.db_teams.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.extra_data.db_teams = tmp_list;

}

function reinflate_generic_obj(obj){
	
	var inflate_required=1;
	//console.log("check 1: " + (obj == null))
	//console.log("check 2: " + (!('keys' in obj)))
	//console.log("check 3: " + (!('data' in obj)))
	//console.log("check 4: " + (obj.data == null))
	if(obj == null || typeof obj !== 'object'){ 
		inflate_required=0; 
	}
	else if (!('keys' in obj)){
		inflate_required=0; 
	}
	else if (!('data' in obj)){
		inflate_required=0; 
	}	
	else if (obj.data == null){
		inflate_required=0; 
	}	
	
	if(!inflate_required){ return obj; }
	
	//console.log("inflate generic obj...");
	var tmp_list = [];
	var rk_specs = {'keys': obj.keys};
	var keys_to_switch = obj.keys;
	
	

	for(var a = 0;a<obj.data.length;a++){ p = obj.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	
	return tmp_list
}

function reinflate_depth_chart_players(){
	
	var inflate_required=1; var data_object_exists = 1

	if(!('data' in misc) || misc.data == null){ 
		//console.log("not required - 1");
		inflate_required=0; 
		data_object_exists = 0;
	}
	else if(!('depth_chart_players' in misc.data) || misc.data.depth_chart_players == null){ 
		//console.log("not required - 2");
		inflate_required=0; 
		data_object_exists = 0;
	}
	else if (typeof misc.data.depth_chart_players.keys[0] == "undefined") {
		//console.log("not required - 3");
		inflate_required=0; 
	}	
	else if (!('keys' in misc.data.depth_chart_players)) {
		//console.log("not required - 4");
		inflate_required=0; 
	}	
	
	// If we have list and keys, but no data, return an empty list
	if(data_object_exists && 'depth_chart_players' in misc.data && misc.data.depth_chart_players != null){
		if('data' in misc.data.depth_chart_players && 'keys' in misc.data.depth_chart_players){
			if(misc.data.depth_chart_players.data.length == 0){
				console.log("List and keys, but no data");
				misc.data.depth_chart_players = [];
				return;
			}
		}
	}
	
	if(!inflate_required){ return; }
	
	//console.log("inflate misc.data.depth_chart_players...");
	var tmp_list = [];
	var rk_specs = {'keys': misc.data.depth_chart_players.keys};
	var keys_to_switch = misc.data.depth_chart_players.keys;
	
	

	for(var a = 0;a<misc.data.depth_chart_players.data.length;a++){ p = misc.data.depth_chart_players.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
		}
		tmp_list.push(d);
	}
	misc.data.depth_chart_players = tmp_list;

}

function convert_to_women(misc, specs={}){
    /***
    This function takes in a misc object and depending on which objects it contains, converts user-visible text to the women's version as needed.
    ***/
    if('data' in misc && misc.data != null){    
        if('alt_ranks' in misc.data && misc.data.alt_ranks != null){ 
            if('stat_keys' in misc.data.alt_ranks && misc.data.alt_ranks.stat_keys != null){ 
                for(var a = 0;a< misc.data.alt_ranks.stat_keys.length;a++){ var sk = misc.data.alt_ranks.stat_keys[a];
                    
                    if(sk.tag == "faceoff_win_rate"){
                        sk.display = "DC%"
                        sk.short = "DC%"
                        sk.desc = "DC%"
                    }
                    else if(sk.tag == "true_faceoff_win_rate"){
                        sk.display = "trDC%"
                        sk.short = "trDC%"
                        sk.desc = "trDC%"
                    }
                    else if(sk.tag == "faceoff_conversion_rate"){
                        sk.display = "DC Conv%"
                        sk.short = "DC Conv%"
                        sk.desc = "DC Conv%"
                    }
                }
            }
            
        } 
        if('extra_data' in misc && 'db_statistics' in misc.extra_data && misc.extra_data.db_statistics != null){ 
            for(var a = 0;a< misc.extra_data.db_statistics.length;a++){ var sk = misc.extra_data.db_statistics[a];
                
                if(sk.stat == "faceoff_win_rate"){
                    sk.short_code = "DC%"
                    sk.description = "DC Rate"
                }
                else if(sk.stat == "true_faceoff_win_rate"){
                    sk.short_code = "trDC%"
                    sk.description = "True DC Rate"
                }
                else if(sk.stat == "faceoff_conversion_rate"){
                    sk.short_code = "DCC%"
                    sk.description = "DC Conv"
                }
            }
        }        
        
    }
    return misc;
}    

function isScrolledIntoView(elem)
{
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();

    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}
  
function create_rpi_distribution_graph(id, misc, RPI_or_NPI_ranks_histogram){
    /***
    This function displays the widget that shows how likely each RPI slot is for a given team.
    ***/
    
    if(typeof RPI_or_NPI_ranks_histogram != "undefined" && RPI_or_NPI_ranks_histogram.length > 0){
        specs = {'margin_left': 30, 'chart_size': 'small', 'flip': 0};
        
        data = {'axis_labels': {'y': '% of Simulations', 'x': 'Final RPI Rank'}, 'data': []};
        tmp = {'stroke-dasharray': '3-3', 'stroke': "#666", 'points': []}
        tmp.points = RPI_or_NPI_ranks_histogram;
		// Identify the lowest and the highest rankings that were observed
		var best_rank = null;
		var worst_rank = null;
		for(var a = 0;a<tmp.points.length;a++){ var tmp_pt = tmp.points[a];
			if(tmp_pt.y > 0){
				if(best_rank == null || tmp_pt.x < best_rank){ best_rank = tmp_pt.x; }
				if(worst_rank == null || tmp_pt.x > worst_rank){ worst_rank = tmp_pt.x; }
			}
		}
		n_total_positions = tmp.points.length;
		if(n_total_positions == 0){
			
		}
		else{
			console.log("Best observed ranking: " + best_rank)
			console.log("Worst observed ranking: " + worst_rank)
			gap = worst_rank - best_rank;
			// If the gap is large, show everything; if it's small, show 30 places
			if(gap > 30){
				tmp.points = tmp.points.filter(r=> best_rank <= r.x && worst_rank >= r.x);
			}
			else{
				start = best_rank; end = worst_rank;
				if(start!=null && end != null){
					while(start > 0 && end - start < 30){
						end += 1;
						start -= 1;
						if(start < 0){ start = 0; }
						if(end > n_total_positions){ end = n_total_positions; }
						
					}
					tmp.points = tmp.points.filter(r=> start <= r.x && end >= r.x);
				}
			}
			
			console.log("ale.RPI_or_NPI_ranks_histogram");console.log(RPI_or_NPI_ranks_histogram);
			data.data.push(tmp)
			specs.width = $('#rpi_distribution_container_div').width()-20;
			
			
			x_ticks = create_game_x_ticks(data.data, {'width': specs['width']});
			data['x_ticks'] = x_ticks.ticks; data['max_x'] = x_ticks.max; data['min_x'] = x_ticks.min;
			y_ticks = create_pct_y_ticks(data.data, {})
			data['y_ticks'] = y_ticks.ticks;
			data['max_y'] = y_ticks.max;  data['min_y'] = 0;
			console.log("ale.data['x_ticks']"); console.log(data['x_ticks']);
			vertical_bars(data, id, specs);
        }
    }
    else{
        $("#" + id).empty(); $("#" + id).append(single_stat.split("</div>")[1].replace('[stat]', "There are no projections available yet for this season."));
    }
}
   
function create_record_scenarios_table(id, misc, future_wins, record){
    
    //console.log("record: " + record);
    var cur_wins = parseInt(record.split("-")[0].trim());
    var cur_losses = parseInt(record.split("-")[1].trim());
    //console.log("Future Wins"); console.log(future_wins);
            
    future_wins.sort(function(first, second) {
        return first.future_wins - second.future_wins;
    });
    wins = future_wins;
    
    last_zero_index = null; last_zero_wins = null;
    first_100_index = null; first_100_wins = null;
    for(var a = 0;a<wins.length;a++){
        var rec = wins[a];
        if(rec.pct_in == 0){ last_zero_index = a; last_zero_wins = rec.future_wins; }
        if(rec.pct_in == 1 && first_100_index == null){ first_100_index = a; first_100_wins = rec.future_wins; }
    }
    var cum_0 = 0; var cum_100 = 0;
    
    if(last_zero_index != null){
        for(var a = 0;a<=last_zero_index;a++){ 
            cum_0 += wins[a].frequency;
        }
    }
    if(first_100_index != null){
        for(var a = first_100_index;a<wins.length;a++){
            cum_100 += wins[a].frequency;
        }
    }
    else{
        first_100_index = wins.length;
        cum_100 = null;
    }
    
    console.log("Last zero index: " + last_zero_index);
    console.log("First non zero: " + last_zero_wins);
    console.log("Last sub 100: " + first_100_wins);
    console.log("cum_0: " + cum_0);
    table_data = [];
    
    if(last_zero_index == null){
        for(var a =0;a<first_100_index;a++){
            var rec = wins[a];
            table_data.push({'wins_str': cur_wins + rec.future_wins, 'wins': cur_wins + rec.future_wins, 'frequency': rec.frequency, 'pct_in': rec.pct_in});
        }
    }
    else{
        table_data.push({'wins_str': (cur_wins + last_zero_wins) + " or less", 'wins': cur_wins + last_zero_wins, 'frequency': cum_0, 'pct_in': 0.0});
        for(var a =last_zero_index + 1;a<first_100_index;a++){
            var rec = wins[a];
            table_data.push({'wins_str': cur_wins + rec.future_wins, 'wins': cur_wins + rec.future_wins, 'frequency': rec.frequency, 'pct_in': rec.pct_in});
        }
    }
    if(cum_100 != null){
        table_data.push({'wins_str': (cur_wins + first_100_wins) + " or more", 'wins': cur_wins + first_100_wins, 'frequency': cum_100, 'pct_in': 1.0});
    }
    
    var record_scenarios_js_data = {'no_row_count': 1}
    record_scenarios_js_data.classes = [{'class': 'col-4'}, {'class': 'col-4 centered'}, {'class': 'col-4 centered'}];
    record_scenarios_js_data.fmt = [{'fmt': ""}, {'fmt': "0%"}, {'fmt': "0%"}];
    record_scenarios_js_data.fields = [{'sort_by': 'wins', 'tag': 'wins_str', 'display': 'Final Wins'}
    , {'sort_by': 'frequency', 'tag': 'frequency', 'display': 'Likelihood'}
    , {'sort_by': 'pct_in', 'tag': 'pct_in', 'display': 'NCAA %'}
    ];
    
    
    record_scenarios_js_data.data = table_data;
    generic_create_table(record_scenarios_js_data, {'id': 'record_scenarios', 'target_elem': 'record_scenarios_div'});

}

function toggle_roster_control(is_checked, key){
    /***
    As of July, 2021 the roster feature includes some filters so that all players aren't shown by default (since they don't have much data and their percentages can be all over the place). This function is called when the user toggles which types of players are shown (all players vs just high-share and offense vs defense).
    ***/
    console.log(key, is_checked);
    roster_specs[key] = is_checked ? 1 : 0;
    //console.log("roster_specs"); console.log(roster_specs);
	if(misc.target_template == "team_my_schedule.html"){
		redraw("next_game_roster");
	}
	else{
		redraw("roster");
	}
}

function toggle_lines_roster_control(is_checked, key){
    /***
    As of July, 2021 the roster feature includes some filters so that all players aren't shown by default (since they don't have much data and their percentages can be all over the place). This function is called when the user toggles which types of players are shown (all players vs just high-share and offense vs defense).
    ***/
    //console.log(key, is_checked);
    lines_roster_specs[key] = is_checked ? 1 : 0;
    //console.log("roster_specs"); console.log(roster_specs);
    display_line_groupings();
}

function get_field(list_obj, fld, specs){
	/***
	This function exists because some objects are A) a list of dicts and some objects have B) had the zc_dot_list_and_keys function run on them to convert a list of dicts into a more memory_friendly keys/data structure. This function acts as a wrapper where a single request can retrive the correct information regardless of whether the underlying data object is of Type A or Type B.
	
	In a Type B scenario, obj contains a list. In a Type A scenario, it would be a dict. For Type B, we need to pull the correct value from the list using the available field location lookup information.
	
	***/
	
	var fld_loc = null;
	
	// Figure out which location in the obj list contains the fld value. Either pull it straight out of the specs object or use the keys list in the specs object to look it up. Obviously the former approach is going to be faster, especially when the obj value is one of a long list of objects.
	
	//console.log("get_field.list_obj"); console.log(list_obj);
	if ('loc' in specs){
		fld_loc = specs.loc;
	}
	else if('keys' in specs){
		//console.log("specs.keys");
		//console.log(specs.keys)
		//console.log("find " + fld);
		fld_loc = specs.keys.indexOf(fld)
	}
	
	// Return the value at the associated location
	return list_obj[fld_loc];	
	
}

function display_roster_list_and_keys(id, roster, specs={}){
    /***
    Since there is a standard roster table, I have a single function instead of implementing it everywhere a roster is needed. This splits the roster out into field/faceoffs/goalies. The product complication is whether the user's tier allows them to link to the player's detail page. So the player link may or may not be available.
    ***/
    
    //console.log("display_roster_list.specs"); console.log(specs);
    
    var SHOW_RETURNING_ICON = 1;
    
    if(!('show_all_players' in specs)){ specs.show_all_players = 0; }
    if(!('show_height_weight' in specs)){ specs.show_height_weight = 0; }
    if(!('show_offense' in specs)){ specs.show_offense = 1; }
    if(!('show_defense' in specs)){ specs.show_defense = 1; }
    if(!('show_advanced' in specs)){ specs.show_advanced = 1; }
    
    var show_height_weight_toggle = 0;
    player_link = "";
    if(misc.target_template.indexOf("basic") == 0){
        player_link = "/basic_player_detail";
    }
    else if(misc.target_template.indexOf("team") == 0){
        player_link = "/team_player_detail";
    }
    
    if(misc.target_template == "team_detail.html" || misc.target_template == "team_my_schedule.html"){
        if(typeof on_mobile != "undefined" && !on_mobile){
            show_height_weight_toggle = 1;
        }
    }
    //console.log("jj.misc.target_template: " + misc.target_template);
    
    
    roles = [];
    var is_women = 0;
    if('is_lines' in specs && specs.is_lines){
        roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
    }   
    else{
        if('gender' in misc.data && misc.data.gender == "women"){
            roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
            roles.push({'help_icon_tag': 'basic_home.html|gk_roster_defs', 'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
            is_women = 1;
        }
        else{
            roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive']});
            roles.push({'help_icon_tag': 'basic_home.html|faceoff_roster_defs', 'desc': 'FOGO', 'tag': 'fogo', 'role_tags': ['faceoff']});
            roles.push({'help_icon_tag': 'basic_home.html|gk_roster_defs', 'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
        }
    }
    /***
    If we are supposed to show player links and/or highlight a chosen player (per the user product/specs), determine that here. The flags are used later to specify how the player row is constructed.
    ***/    
    show_player_links = 1; highlight_any = 0;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
        highlight_any = ([1, 4, 7].indexOf(misc.product_i) > -1 && misc.product_t == 1) ? 1 : 0;
    }
    
    /***
    There are a few data points that are calculated rather than present in the player objects; they are calculated here.
    ***/
    
    var n_returning = 0;
	
	// Shooting efficiency replaced on-goal shooting % on the roster page in June 2023. In case some team files weren't updated, I built a flag so it would know which variable to display
	var has_shooting_efficiency = 0;
	var roster_is_available = roster == null ? 0 : 1;
	if(!roster_is_available){ 
		$("#" + div_id).append("<div class='col-12'><span class='font-12 error'>There are no players to display.</span></div>"); 
	}
	else{
		var rk_specs = {'keys': roster.keys};
		var tmp_roster = [];
		var keys_to_switch = ['role', 'is_returning', 'goals', 'assists', 'turnovers', 'shooting_pct', 'gbs', 'height', 'weight', 'player', 'pro_url_tag', 'jersey_number', 'usage_adjusted_EGA', 'turnover_rate', 'weighted_team_play_shares', 'share_of_team_assists', 'share_of_team_shots', 'on_goal_shooting_pct', 'faceoff_wins', 'faceoff_losses', 'on_keeper_sog_faced', 'faceoff_win_rate', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'excess_saves_per_sog', 'goals_allowed', 'EGA_per_game', 'player_ID', 'caused_turnover_share', 'caused_turnovers', 'penalties', 'defensive_EGA_rank_str'];
		
		for(var a = 0;a<roster.data.length;a++){ p = roster.data[a];
			d = {};
			for(var b = 0;b<keys_to_switch.length;b++){
				d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			}
			tmp_roster.push(d);
		}

		
		for(var a = 0;a<tmp_roster.length;a++){ p = tmp_roster[a];
			if(p.is_returning == 1){ n_returning += 1; }
			if('shooting_efficiency' in p){ has_shooting_efficiency = 1; }
			
			p['height_weight'] = ""
			if([null, -1, ''].indexOf(p['height']) == -1){
				p['height_weight'] = height_str(p['height'])
				if([null, -1, ''].indexOf(p['weight']) == -1){
					p['height_weight'] += " " + p['weight'] + " lb"
				}
			}
			else{
				if([null, -1, ''].indexOf(p['weight']) == -1){
					p['height_weight'] = "Height not available " + p['weight'] + " lb"
				}
			}
			p['jersey_str'] = ""
			if([null, -1, ''].indexOf(p['jersey_number']) == -1){
				p['jersey_str'] = "#" + p['jersey_number'];
				p['alternate_player'] = p['player'] + " - " + p['jersey_str'] + " " + p['height_weight']
			}
			else{
				p['alternate_player'] = p['player'] + " - " + p['height_weight']
			}
			
			
		}
		//console.log("display_roster_list.roster"); console.log(roster);
		
		var shown_players = 0;
		if(!('seq' in roster.keys)){
			// Add the seq key to the list of keys
			roster.keys.push('seq')
			roster.keys.push('faceoff_record')
			roster.keys.push('save_pct')
			roster.keys.push('excess_saves')
			roster.keys.push('show')
		}
		
		for(var a = 0;a<tmp_roster.length;a++){ p = tmp_roster[a];
			p.seq = a;
			p.faceoff_record = p.faceoff_wins + " - " + p.faceoff_losses;
			
			p.save_pct = p.on_keeper_sog_faced > 0 ? 1.0 - (p.goals_allowed / p.on_keeper_sog_faced) : null;
			p.excess_saves = p.on_keeper_sog_faced > 0 ? p.expected_goals_allowed - p.goals_allowed : null;
			p.show = 1;
			
			if(['offensive', 'defensive', null].indexOf(p.role) > -1 && p.weighted_team_play_shares < .01 && !specs.show_all_players){
				p.show = 0;
			}
			else if(p.role == "offensive" && !specs.show_offense){
				p.show = 0;
			}
			else if(p.role == "faceoff" && !specs.show_offense && 'gender' in misc.data && misc.data.gender == "women"){
				p.show = 0;
			}
			else if((p.role == "defensive" || ('team_listed_role' in p && p.team_listed_role == "D")) && !specs.show_defense){
				p.show = 0;
			}
			else if(p.usage_adjusted_EGA == null && !specs.show_all_players){
				p.show = 0;
			}
	  
			shown_players += p.show;
			
			
			roster.data[a].push(a); // Add the seq value to the list_and_keys structure
			roster.data[a].push(p.faceoff_record); // Add the faceoff_record value to the list_and_keys structure
			roster.data[a].push(p.save_pct); // Add the save_pct value to the list_and_keys structure
			roster.data[a].push(p.excess_saves); // Add the excess_saves value to the list_and_keys structure
			roster.data[a].push(p.show); // Add the show value to the list_and_keys structure
		}

		//console.log("Show all", roster.length > 10, shown_players, roster.length > 10 && shown_players == 0);
		if(tmp_roster.length > 10 && shown_players == 0){
			for(var a = 0;a<tmp_roster.length;a++){ p = tmp_roster[a]; p.show = 1; }
		}
		
		/***
		Build the input data for generic_create_table; the data we need to produce depends on the role. We are using the dtop flag to show some fields only on larger displays.
		***/
		
		var name_cols = null; var other_cols = null;
		for(var b = 0;b<roles.length;b++){ 
			role_players = tmp_roster.filter(r=> r.show && (roles[b].role_tags.indexOf(r.role) > -1 || (b==0 && r.role == null)));
			js_data = {'no_row_count': 1, 'data': [], 'cell_size': 'medium-cell-holder', 'row_style_class': 'bbottom very-light'}
			js_data.fields = [{'sort_by': 'player', 'tag': specs.show_height_weight ? 'alternate_player' : "player", 'display': 'Player'}];

			if(roles[b].tag == "field"){
				if(specs.show_height_weight){
					name_cols = "col-4-6";
					other_cols = "col-8-6";
				}
				else{
					name_cols = "col-2-5";
					other_cols = "col-10-7";
				}
				if(!specs.show_advanced){
					
					js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered mob'}, {'class': 'centered dtop'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered dtop'}]}];
					js_data.fmt = [{'fmt': ""}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}];
					js_data.fields.push({'sort_by': 'points', 'tag': 'points', 'display': 'Pts'});
					js_data.fields.push({'sort_by': 'goals', 'tag': 'goals', 'display': 'Goals'});
					js_data.fields.push({'sort_by': 'assists', 'tag': 'assists', 'mob_display': 'Asst', 'dtop_display': 'Assists'});
					js_data.fields.push({'sort_by': 'shooting_pct', 'tag': 'shooting_pct', 'mob_display': 'Sh%', 'dtop_display': 'Shooting%'});
					js_data.fields.push({'sort_by': 'turnovers', 'tag': 'turnovers', 'display': 'TO'});
					js_data.fields.push({'sort_by': 'gbs', 'tag': 'gbs', 'display': 'GB'});
					js_data.fields.push({'sort_by': 'caused_turnovers', 'tag': 'caused_turnovers', 'display': 'CT'});

				}
				else{
					
					js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'dtop centered'},  {'class': 'centered'}, {'class': 'dtop centered'}]}];
					js_data.fmt = [{'fmt': ""}, {'fmt': "2"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "2"}];
					js_data.fields.push({'sort_by': 'usage_adjusted_EGA', 'tag': 'usage_adjusted_EGA', 'display': 'uaEGA'});
					js_data.fields.push({'sort_by': 'weighted_team_play_shares', 'tag': 'weighted_team_play_shares', 'mob_display': 'Share%', 'dtop_display': 'Play Share'});
					js_data.fields.push({'sort_by': 'share_of_team_assists', 'tag': 'share_of_team_assists', 'mob_display': 'Assist%', 'dtop_display': 'Asst Share'});
					js_data.fields.push({'sort_by': 'share_of_team_shots', 'tag': 'share_of_team_shots', 'mob_display': 'Sht%', 'dtop_display': 'Shot Share'});
					if(has_shooting_efficiency){
						js_data.fields.push({'sort_by': 'shooting_efficiency', 'tag': 'shooting_efficiency', 'mob_display': 'ShEff', 'dtop_display': 'Shot Eff.'});
					}
					else{
						js_data.fields.push({'sort_by': 'on_goal_shooting_pct', 'tag': 'on_goal_shooting_pct', 'mob_display': 'ogSh%', 'dtop_display': 'oG Shot%'});
					}
					js_data.fields.push({'sort_by': 'turnover_rate', 'tag': 'turnover_rate', 'dtop_display': 'TO Rate', 'mob_display': 'TO %'});
				}
			}
			else if(roles[b].tag == "fogo"){
				if(specs.show_height_weight){
					name_cols = "col-4-5";
					other_cols = "col-8-7";
				}
				else{
					name_cols = "col-3-5";
					other_cols = "col-9-7";
				}
				
				//js_data.cell_size = "large-cell-holder";
				js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}]}];
				js_data.fmt = [{'fmt': ""}, {'fmt': "1%"}, {'fmt': ""}, {'fmt': "0"}, {'fmt': ""}];
				js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_win_rate', 'mob_display': 'Win%', 'dtop_display': 'FO Win%'});
				js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_record', 'display': 'FO Record'});
				js_data.fields.push({'sort_by': 'faceoff_ELO', 'tag': 'faceoff_ELO', 'display': 'FO Elo', 'display': 'FO Elo'});
				js_data.fields.push({'sort_by': 'season_faceoff_ELO_rank', 'tag': 'season_faceoff_ELO_rank_str', 'display': 'Elo Rank'});
				
			}
			else if(roles[b].tag == "goalkeepers"){
				//js_data.cell_size = "large-cell-holder";
				js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'outer_class': 'col-9-7', 'classes': [{'class': 'centered'}, {'class': 'dtop centered'}/*, {'class': 'centered'}, {'class': 'centered dtop'}*/, {'class': 'centered'}]}];
				js_data.fmt = [{'fmt': ""}, {'fmt': "0%"}, {'fmt': "0"}, {'fmt': "0"}/*, {'fmt': "1"}, {'fmt': "2"}*/];
				js_data.fields.push({'sort_by': 'save_pct', 'tag': 'save_pct', 'dtop_display': 'Save Pct', 'mob_display': 'Sv Pct'});
				js_data.fields.push({'sort_by': 'on_keeper_sog_faced', 'tag': 'on_keeper_sog_faced', 'display': 'SOG'});
				js_data.fields.push({'sort_by': 'goals_allowed', 'tag': 'goals_allowed', 'mob_display': 'GA', 'dtop_display': 'GA'});
				//js_data.fields.push({'sort_by': 'excess_saves', 'tag': 'excess_saves', 'display': 'Saves+'});
				//js_data.fields.push({'sort_by': 'excess_saves_per_sog', 'tag': 'excess_saves_per_sog', 'dtop_display': 'eSaves/Sh', 'mob_display': 'eSv/Sh'});
			}
			
			if(!specs.show_height_weight){
				js_data.classes[1].classes.push({'class': 'centered'});
				js_data.fmt.push({'fmt': ""});
				js_data.fields.push({'tag': 'expand', 'display': ''});
			}
			
			for(var k = 0;k<js_data.fields.length;k++){ fld = js_data.fields[k];
				if(['turnover_rate', 'expand', 'player', 'faceoff_record', 'season_faceoff_ELO_rank_str', 'shots_faced', 'goals_allowed'].indexOf(fld.tag) == -1){
					if('mob_display' in fld){
						fld.mob_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
					}
					if('display' in fld){
						fld.display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
					}
					if('dtop_display' in fld){
						fld.dtop_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
					}
				}
				else if(fld.tag == "turnover_rate"){
					if('dtop_display' in fld){
						fld.dtop_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
					}
					if('mob_display' in fld){
						fld.mob_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
					}
					if('display' in fld){
						fld.display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
					}
				}
			}
			
			for(var a = 0;a<role_players.length;a++){
				
				p = role_players[a];
				tmp_fields = ['goals', 'alternate_player', 'points', 'assists', 'turnovers', 'caused_turnovers', 'usage_adjusted_EGA', 'EGA', 'team_play_shares', 'faceoff_win_rate', 'faceoff_record', 'save_pct', 'shooting_efficiency', 'on_keeper_sog_faced', 'goals_allowed', 'expected_goals_allowed', 'excess_saves', 'excess_saves_per_sog', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'shooting_pct', 'on_goal_shooting_pct', 'share_of_team_assists', 'share_of_team_shots', 'gbs', 'turnover_rate', 'weighted_team_play_shares', 'role', 'tag'];
				d = {};
				
				link_this_player = show_player_links || p.ID == user_obj.preferences.fpi;
				d.highlight_row = highlight_any && p.ID == user_obj.preferences.fpi;
				
				if(n_returning > 0){
					if(SHOW_RETURNING_ICON && p.is_returning == 1){
						if(p.player.indexOf("&#8224;") == -1){
							p.player += "<sup>&#8224;</sup>"
						}
					}   
				}
				
				for(var ab = 0;ab<tmp_fields.length;ab++){ d[tmp_fields[ab]] = p[tmp_fields[ab]]; }
				//console.log(p);
				if(specs.show_height_weight){
					// Just show the alternate_player field
					if(link_this_player){
						if('pro_url_tag' in p && ['', null].indexOf(p.pro_url_tag) == -1){
							
							d.alternate_player = "<a class='mouseover-link no-padding' id='player" + p.player_ID + "form' href='/" + p.pro_url_tag + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? "?t=" + misc.tracking_tag : "") + "'><span  class='contents'>" + p.alternate_player+ "</span></a>";
						}
						else{
							d.alternate_player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.alternate_player+ "</span></FORM>";
						}
					}
					else{
						d.alternate_player = p.alternate_player;
					}
				}
				else{
					if(link_this_player){
						if('pro_url_tag' in p && ['', null].indexOf(p.pro_url_tag) == -1){
							d.player = "<a class='mouseover-link no-padding' id='player" + p.player_ID + "form' href='/" + p.pro_url_tag + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? "?t=" + misc.tracking_tag : "") + "'><span  class='contents'>" + p.player+ "</span></a>";
							
						}
						else{
							d.player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.player+ "</span></FORM>";
						}
					}
					else{
						d.player = p.player;
					}
					
				}
				if('is_lines' in specs && specs.is_lines){
					d.expand = "";
				}
				else{
					d.expand = "<img id='player" + p.seq + "_imgicon' class='icon-15 plus-toggle row-toggle' onclick='display_player_card(" + p.seq + ");' src='static/img/Gray_Plus_Skinny150.png' />";
				}
				js_data.data.push(d);
			}
			roles[b].js_data = js_data;
		}
		
		/*** 
		Cycle through the 3 player "roles" and use our standard create_table function to produce the sortable table for each.  If there are no players in the role, a message gets printed to the screen instead. The initial sort is specific to the role.
		***/
		elem = $("#" + id); elem.empty();
		
		// Display controls
		html = "<div class='col-12 right'><div class='inline-flex no-padding'>";
		
		var fn = "toggle_roster_control";
		if('is_lines' in specs && specs.is_lines){
			fn = "toggle_lines_roster_control";
		}
		
		if('is_lines' in specs && specs.is_lines){
			// Do not show low-usage option when you are on the lines view
		}
		else{
			if(show_height_weight_toggle){
				html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_height_weight\");' type=checkbox " + (specs.show_height_weight ? " checked" : "") + " id='show_height_weight_control' /></div>";
				html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Jersey</span></div>";
			
			}
			html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_all_players\");' type=checkbox " + (specs.show_all_players ? " checked" : "") + " id='show_all_players_control' /></div>";
			html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Low-Usage</span></div>";
		}
		
		html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_offense\");' type=checkbox " + (specs.show_offense ? " checked" : "") + " id='show_offense_control' /></div>";
		html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Offense</span></div>";
		
		html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_defense\");' type=checkbox " + (specs.show_defense ? " checked" : "") + " id='show_defense_control' /></div>";
		html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Defense</span></div>";
		
		html += "</div></div>";
		elem.append(html);  
		
		// Display players
		for(var b = 0;b<roles.length;b++){role = roles[b];
			if(role.help_icon_tag == null){
				if(role.desc == "Field"){
					if('is_lines' in specs && specs.is_lines){
						html = "<div class='col-12 bbottom flex'><div class='col-9-6'><span class='font-18 bold'>" + role.desc + "</span></div><div class='right col-3-6 no-padding' id='lines_roster_stat_type_toggle_div'></div>";
					}   
					else{
						html = "<div class='col-12 bbottom flex'><div class='col-9-6'><span class='font-18 bold'>" + role.desc + "</span></div><div class='right col-3-6 no-padding' id='roster_stat_type_toggle_div'></div>";
					}
				}
				else{
					html = "<div class='col-12 bbottom'><span class='font-18 bold'>" + role.desc + "</span></div>";
				}
			}
			else{
				html = "<div class='flex bbottom'><div class='col-11'><span class='font-18 bold'>" + role.desc + "</span></div>";
				html += '<div class="col-1 right no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="' + role.tag + '_helpicon" class="icon-15 explanation" value="' + role.help_icon_tag + '" src="static/img/Gray_Info150.png"></div>';
				html += "</div>";
			}
			elem.append(html);  
			
			var div_id = 'role' + b + '_div';
			if('is_lines' in specs && specs.is_lines){
				div_id = 'lines_role' + b + '_div';
			}
			html = "<div id='" + div_id + "' class='no-padding' style='padding-bottom:20px;'></div>";
			elem.append(html);  
			//console.log("lb.role.js_data.data"); console.log(role.js_data.data);
			//console.log("lb.role.js_data"); console.log(role.js_data);
			if(role.js_data.data.length == 0){
				$("#" + div_id).append("<div class='col-12'><span class='font-12 error'>There are no players to display.</span></div>");
			}
			else{
				if('is_lines' in specs && specs.is_lines){
					// No sorting; use display_seq from DB, but we do want to filter out groupings with no players in them
					
				}   
				else{            
					if(role.tag == "field"){
						role.js_data.data = role.js_data.data.sort(function(a,b){ return b.team_play_shares - a.team_play_shares; }); 
					}
					else if(role.tag == "fogo"){
						role.js_data.data = role.js_data.data.sort(function(a,b){ return b.faceoff_ELO - a.faceoff_ELO; }); 
					}
					else if(role.tag == "goalkeepers"){
						role.js_data.data = role.js_data.data.sort(function(a,b){ return b.excess_saves - a.excess_saves; });
					}
					//console.log("lx.role.tag: " + role.tag);
				}
				
				generic_create_table(role.js_data, {'id': div_id, 'target_elem': div_id});
				
				if(SHOW_RETURNING_ICON && n_returning > 0){
					$("#" + 'role' + b + '_div').append("<div class=''><span class='font-12'><sup>&#8224;</sup> returning player</span></div>");
				}
			}
		}
		
		// Install the toggle between advanced and traditional stats
		//console.log("lmn.specs"); console.log(specs);
		if('is_lines' in specs && specs.is_lines){
			toggle = {'val': specs.show_advanced ? 0: 1, 'start_x': 25, 'end_x': 30, 'id': 'lines_roster_stat_type_toggle', 'text_align': 'right', 'start_label': 'Adv', 'end_label': "Trad"};
			display_toggle(toggle, 'lines_roster_stat_type_toggle_div', {'chart_size': 'small', 'class': 'lines_roster_stat_type_adv_vs_trad_list_and_keys', 'height': 20});
		}
		else{
			toggle = {'val': specs.show_advanced ? 0: 1, 'start_x': 25, 'end_x': 30, 'id': 'roster_stat_type_toggle', 'text_align': 'right', 'start_label': 'Adv', 'end_label': "Trad"};
			display_toggle(toggle, 'roster_stat_type_toggle_div', {'chart_size': 'small', 'class': 'roster_stat_type_adv_vs_trad_list_and_keys', 'height': 20});
		}
	}
    
    $(".icon-15.explanation").click(function( event ) {  event.stopPropagation(); console.log("STOP PROP4");  async_request_explanation(this.getAttribute("value")); });
   
}

function display_roster_list(id, roster, specs={}){
    /***
    Since there is a standard roster table, I have a single function instead of implementing it everywhere a roster is needed. This splits the roster out into field/faceoffs/goalies. The product complication is whether the user's tier allows them to link to the player's detail page. So the player link may or may not be available.
    ***/
    
    //console.log("display_roster_list.specs"); console.log(specs);
    
    var SHOW_RETURNING_ICON = 1;
    
    if(!('show_all_players' in specs)){ specs.show_all_players = 0; }
    if(!('show_height_weight' in specs)){ specs.show_height_weight = 0; }
    if(!('show_offense' in specs)){ specs.show_offense = 1; }
    if(!('show_defense' in specs)){ specs.show_defense = 1; }
    if(!('show_advanced' in specs)){ specs.show_advanced = 1; }
    
    var show_height_weight_toggle = 0;
    player_link = "";
    if(misc.target_template.indexOf("basic") == 0){
        player_link = "/basic_player_detail";
    }
    else if(misc.target_template.indexOf("team") == 0){
        player_link = "/team_player_detail";
    }
    
    if(misc.target_template == "team_detail.html" || misc.target_template == "team_my_schedule.html"){
        if(typeof on_mobile != "undefined" && !on_mobile){
            show_height_weight_toggle = 1;
        }
    }
    //console.log("jj.misc.target_template: " + misc.target_template);
    
    
    roles = [];
    var is_women = 0;
    if('is_lines' in specs && specs.is_lines){
        roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
    }   
    else{
        if('gender' in misc.data && misc.data.gender == "women"){
            roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
            roles.push({'help_icon_tag': 'basic_home.html|gk_roster_defs', 'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
            is_women = 1;
        }
        else{
            roles.push({'help_icon_tag': null, 'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive']});
            roles.push({'help_icon_tag': 'basic_home.html|faceoff_roster_defs', 'desc': 'FOGO', 'tag': 'fogo', 'role_tags': ['faceoff']});
            roles.push({'help_icon_tag': 'basic_home.html|gk_roster_defs', 'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
        }
    }
    /***
    If we are supposed to show player links and/or highlight a chosen player (per the user product/specs), determine that here. The flags are used later to specify how the player row is constructed.
    ***/    
    show_player_links = 1; highlight_any = 0;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
        highlight_any = ([1, 4, 7].indexOf(misc.product_i) > -1 && misc.product_t == 1) ? 1 : 0;
    }
    
    /***
    There are a few data points that are calculated rather than present in the player objects; they are calculated here.
    ***/
    
    var n_returning = 0;
	
	// Shooting efficiency replaced on-goal shooting % on the roster page in June 2023. In case some team files weren't updated, I built a flag so it would know which variable to display
	var has_shooting_efficiency = 0;
    for(var a = 0;a<roster.length;a++){ p = roster[a];
        if(p.is_returning == 1){ n_returning += 1; }
        if('shooting_efficiency' in p){ has_shooting_efficiency = 1; }
		
        p['height_weight'] = ""
        if([null, -1, ''].indexOf(p['height']) == -1){
            p['height_weight'] = height_str(p['height'])
            if([null, -1, ''].indexOf(p['weight']) == -1){
                p['height_weight'] += " " + p['weight'] + " lb"
            }
        }
        else{
            if([null, -1, ''].indexOf(p['weight']) == -1){
                p['height_weight'] = "Height not available " + p['weight'] + " lb"
            }
        }
        p['jersey_str'] = "N/A"
        if([null, -1, ''].indexOf(p['jersey_number']) == -1){
            p['jersey_str'] = "#" + p['jersey_number'];
        }
        p['alternate_player'] = p['player'] + " - " + p['jersey_str'] + " " + p['height_weight']
        
    }
    //console.log("display_roster_list.roster"); console.log(roster);
    
    var shown_players = 0;
    for(var a = 0;a<roster.length;a++){ p = roster[a];
        p.seq = a;
        p.faceoff_record = p.faceoff_wins + " - " + p.faceoff_losses;
        p.save_pct = p.on_keeper_sog_faced > 0 ? 1.0 - (p.goals_allowed / p.on_keeper_sog_faced) : null;
        p.excess_saves = p.on_keeper_sog_faced > 0 ? p.expected_goals_allowed - p.goals_allowed : null;
        p.show = 1;
        
        if(['offensive', 'defensive', null].indexOf(p.role) > -1 && p.weighted_team_play_shares < .01 && !specs.show_all_players){
            p.show = 0;
        }
        else if(p.role == "offensive" && !specs.show_offense){
            p.show = 0;
        }
        else if(p.role == "faceoff" && !specs.show_offense && 'gender' in misc.data && misc.data.gender == "women"){
            p.show = 0;
        }
        else if((p.role == "defensive" || ('team_listed_role' in p && p.team_listed_role == "D")) && !specs.show_defense){
            p.show = 0;
        }
        else if(p.usage_adjusted_EGA == null && !specs.show_all_players){
            p.show = 0;
        }
  
        shown_players += p.show;
    }

    //console.log("Show all", roster.length > 10, shown_players, roster.length > 10 && shown_players == 0);
    if(roster.length > 10 && shown_players == 0){
        for(var a = 0;a<roster.length;a++){ p = roster[a]; p.show = 1; }
    }
    
    /***
    Build the input data for generic_create_table; the data we need to produce depends on the role. We are using the dtop flag to show some fields only on larger displays.
    ***/
    
    var name_cols = null; var other_cols = null;
    for(var b = 0;b<roles.length;b++){ 
        role_players = roster.filter(r=> r.show && (roles[b].role_tags.indexOf(r.role) > -1 || (b==0 && r.role == null)));
        js_data = {'no_row_count': 1, 'data': [], 'cell_size': 'medium-cell-holder', 'row_style_class': ''}
        js_data.fields = [{'sort_by': 'player', 'tag': specs.show_height_weight ? 'alternate_player' : "player", 'display': 'Player'}];

        if(roles[b].tag == "field"){
            if(specs.show_height_weight){
                name_cols = "col-4-6";
                other_cols = "col-8-6";
            }
            else{
                name_cols = "col-2-5";
                other_cols = "col-10-7";
            }
            if(!specs.show_advanced){
                
                js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered mob'}, {'class': 'centered dtop'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered dtop'}]}];
                js_data.fmt = [{'fmt': ""}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}];
                js_data.fields.push({'sort_by': 'points', 'tag': 'points', 'display': 'Pts'});
                js_data.fields.push({'sort_by': 'goals', 'tag': 'goals', 'display': 'Goals'});
                js_data.fields.push({'sort_by': 'assists', 'tag': 'assists', 'mob_display': 'Asst', 'dtop_display': 'Assists'});
                js_data.fields.push({'sort_by': 'shooting_pct', 'tag': 'shooting_pct', 'mob_display': 'Sh%', 'dtop_display': 'Shooting%'});
                js_data.fields.push({'sort_by': 'turnovers', 'tag': 'turnovers', 'display': 'TO'});
                js_data.fields.push({'sort_by': 'gbs', 'tag': 'gbs', 'display': 'GB'});
                js_data.fields.push({'sort_by': 'caused_turnovers', 'tag': 'caused_turnovers', 'display': 'CT'});

            }
            else{
                
                js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'dtop centered'},  {'class': 'centered'}, {'class': 'dtop centered'}]}];
                js_data.fmt = [{'fmt': ""}, {'fmt': "2"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "1%"}, {'fmt': "2"}];
                js_data.fields.push({'sort_by': 'usage_adjusted_EGA', 'tag': 'usage_adjusted_EGA', 'display': 'uaEGA'});
                js_data.fields.push({'sort_by': 'weighted_team_play_shares', 'tag': 'weighted_team_play_shares', 'mob_display': 'Share%', 'dtop_display': 'Play Share'});
                js_data.fields.push({'sort_by': 'share_of_team_assists', 'tag': 'share_of_team_assists', 'mob_display': 'Assist%', 'dtop_display': 'Asst Share'});
                js_data.fields.push({'sort_by': 'share_of_team_shots', 'tag': 'share_of_team_shots', 'mob_display': 'Sht%', 'dtop_display': 'Shot Share'});
				if(has_shooting_efficiency){
					js_data.fields.push({'sort_by': 'shooting_efficiency', 'tag': 'shooting_efficiency', 'mob_display': 'ShEff', 'dtop_display': 'Shot Eff.'});
				}
				else{
					js_data.fields.push({'sort_by': 'on_goal_shooting_pct', 'tag': 'on_goal_shooting_pct', 'mob_display': 'ogSh%', 'dtop_display': 'oG Shot%'});
				}
                js_data.fields.push({'sort_by': 'turnover_rate', 'tag': 'turnover_rate', 'dtop_display': 'TO Rate', 'mob_display': 'TO %'});
            }
        }
        else if(roles[b].tag == "fogo"){
            if(specs.show_height_weight){
                name_cols = "col-4-5";
                other_cols = "col-8-7";
            }
            else{
                name_cols = "col-3-5";
                other_cols = "col-9-7";
            }
            
            //js_data.cell_size = "large-cell-holder";
            js_data.classes = [{'class': 'no-padding ' + name_cols + (show_player_links ? " mouseover-link" : "")}, {'outer_class': other_cols, 'classes': [{'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': "1%"}, {'fmt': ""}, {'fmt': "0"}, {'fmt': ""}];
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_win_rate', 'mob_display': 'Win%', 'dtop_display': 'FO Win%'});
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_record', 'display': 'FO Record'});
            js_data.fields.push({'sort_by': 'faceoff_ELO', 'tag': 'faceoff_ELO', 'display': 'FO Elo', 'display': 'FO Elo'});
            js_data.fields.push({'sort_by': 'season_faceoff_ELO_rank', 'tag': 'season_faceoff_ELO_rank_str', 'display': 'Elo Rank'});
            
        }
        else if(roles[b].tag == "goalkeepers"){
            //js_data.cell_size = "large-cell-holder";
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'outer_class': 'col-9-7', 'classes': [{'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': "0%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1"}, {'fmt': "2"}];
            js_data.fields.push({'sort_by': 'save_pct', 'tag': 'save_pct', 'dtop_display': 'Save Pct', 'mob_display': 'Sv Pct'});
            js_data.fields.push({'sort_by': 'on_keeper_sog_faced', 'tag': 'on_keeper_sog_faced', 'display': 'SOG'});
            js_data.fields.push({'sort_by': 'goals_allowed', 'tag': 'goals_allowed', 'mob_display': 'Goals', 'dtop_display': 'Goals'});
            js_data.fields.push({'sort_by': 'excess_saves', 'tag': 'excess_saves', 'display': 'Saves+'});
            js_data.fields.push({'sort_by': 'excess_saves_per_sog', 'tag': 'excess_saves_per_sog', 'dtop_display': 'eSaves/Sh', 'mob_display': 'eSv/Sh'});
        }
        
        if(!specs.show_height_weight){
            js_data.classes[1].classes.push({'class': 'centered'});
            js_data.fmt.push({'fmt': ""});
            js_data.fields.push({'tag': 'expand', 'display': ''});
        }
        
        for(var k = 0;k<js_data.fields.length;k++){ fld = js_data.fields[k];
            if(['turnover_rate', 'expand', 'player', 'faceoff_record', 'season_faceoff_ELO_rank_str', 'shots_faced', 'goals_allowed'].indexOf(fld.tag) == -1){
                if('mob_display' in fld){
                    fld.mob_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
                }
                if('display' in fld){
                    fld.display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
                }
                if('dtop_display' in fld){
                    fld.dtop_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics|" + fld.tag + "' src='static/img/Gray_Info150.png'>"
                }
            }
            else if(fld.tag == "turnover_rate"){
                if('dtop_display' in fld){
                    fld.dtop_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
                }
                if('mob_display' in fld){
                    fld.mob_display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
                }
                if('display' in fld){
                    fld.display += "<img style='margin-left:5px;' class='icon-10 explanation' value='all_statistics_custom|ind_turnover_rate' src='static/img/Gray_Info150.png'>"
                }
            }
        }
        
        for(var a = 0;a<role_players.length;a++){
            
            p = role_players[a];
            tmp_fields = ['goals', 'alternate_player', 'points', 'assists', 'turnovers', 'caused_turnovers', 'usage_adjusted_EGA', 'EGA', 'team_play_shares', 'faceoff_win_rate', 'faceoff_record', 'save_pct', 'shooting_efficiency', 'on_keeper_sog_faced', 'goals_allowed', 'expected_goals_allowed', 'excess_saves', 'excess_saves_per_sog', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'shooting_pct', 'on_goal_shooting_pct', 'share_of_team_assists', 'share_of_team_shots', 'gbs', 'turnover_rate', 'weighted_team_play_shares', 'role', 'tag'];
            d = {};
            
            link_this_player = show_player_links || p.ID == user_obj.preferences.fpi;
            d.highlight_row = highlight_any && p.ID == user_obj.preferences.fpi;
            
            if(n_returning > 0){
                if(SHOW_RETURNING_ICON && p.is_returning == 1){
                    if(p.player.indexOf("&#8224;") == -1){
                        p.player += "<sup>&#8224;</sup>"
                    }
                }   
            }
            
            for(var ab = 0;ab<tmp_fields.length;ab++){ d[tmp_fields[ab]] = p[tmp_fields[ab]]; }
            //console.log(p);
            if(specs.show_height_weight){
                // Just show the alternate_player field
                if(link_this_player){
					if('pro_url_tag' in p && ['', null].indexOf(p.pro_url_tag) == -1){
						
						d.alternate_player = "<a class='mouseover-link no-padding' id='player" + p.player_ID + "form' href='/" + p.pro_url_tag + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? "?t=" + misc.tracking_tag : "") + "'><span  class='contents'>" + p.alternate_player+ "</span></a>";
					}
					else{
						d.alternate_player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.alternate_player+ "</span></FORM>";
					}
                }
                else{
                    d.alternate_player = p.alternate_player;
                }
            }
            else{
                if(link_this_player){
                    if('pro_url_tag' in p && ['', null].indexOf(p.pro_url_tag) == -1){
						d.player = "<a class='mouseover-link no-padding' id='player" + p.player_ID + "form' href='/" + p.pro_url_tag + ('tracking_tag' in misc && [null, ''].indexOf(misc.tracking_tag) == -1 ? "?t=" + misc.tracking_tag : "") + "'><span  class='contents'>" + p.player+ "</span></a>";
						
					}
					else{
						d.player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.player+ "</span></FORM>";
					}
                }
                else{
                    d.player = p.player;
                }
                
            }
            if('is_lines' in specs && specs.is_lines){
                d.expand = "";
            }
            else{
                d.expand = "<img id='player" + p.seq + "_imgicon' class='icon-15 plus-toggle row-toggle' onclick='display_player_card(" + p.seq + ");' src='static/img/Gray_Plus_Skinny150.png' />";
            }
            js_data.data.push(d);
        }
        roles[b].js_data = js_data;
    }
    
    /*** 
    Cycle through the 3 player "roles" and use our standard create_table function to produce the sortable table for each.  If there are no players in the role, a message gets printed to the screen instead. The initial sort is specific to the role.
    ***/
    elem = $("#" + id); elem.empty();
    
    // Display controls
    html = "<div class='col-12 right'><div class='inline-flex no-padding'>";
    
    var fn = "toggle_roster_control";
    if('is_lines' in specs && specs.is_lines){
        fn = "toggle_lines_roster_control";
    }
    
    if('is_lines' in specs && specs.is_lines){
        // Do not show low-usage option when you are on the lines view
    }
    else{
        if(show_height_weight_toggle){
            html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_height_weight\");' type=checkbox " + (specs.show_height_weight ? " checked" : "") + " id='show_height_weight_control' /></div>";
            html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Jersey</span></div>";
        
        }
        html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_all_players\");' type=checkbox " + (specs.show_all_players ? " checked" : "") + " id='show_all_players_control' /></div>";
        html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Low-Usage</span></div>";
    }
    
    html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_offense\");' type=checkbox " + (specs.show_offense ? " checked" : "") + " id='show_offense_control' /></div>";
    html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Offense</span></div>";
    
    html += "<div class='no-padding'><input onchange='" + fn + "(this.checked, \"show_defense\");' type=checkbox " + (specs.show_defense ? " checked" : "") + " id='show_defense_control' /></div>";
    html += "<div class='no-padding'><span class='font-14'><span class='dtop no-padding'>Show </span>Defense</span></div>";
    
    html += "</div></div>";
    elem.append(html);  
    
    // Display players
    for(var b = 0;b<roles.length;b++){role = roles[b];
        if(role.help_icon_tag == null){
            if(role.desc == "Field"){
                if('is_lines' in specs && specs.is_lines){
                    html = "<div class='col-12 bbottom flex'><div class='col-9-6'><span class='font-18 bold'>" + role.desc + "</span></div><div class='right col-3-6 no-padding' id='lines_roster_stat_type_toggle_div'></div>";
                }   
                else{
                    html = "<div class='col-12 bbottom flex'><div class='col-9-6'><span class='font-18 bold'>" + role.desc + "</span></div><div class='right col-3-6 no-padding' id='roster_stat_type_toggle_div'></div>";
                }
            }
            else{
                html = "<div class='col-12 bbottom'><span class='font-18 bold'>" + role.desc + "</span></div>";
            }
        }
        else{
            html = "<div class='flex bbottom'><div class='col-11'><span class='font-18 bold'>" + role.desc + "</span></div>";
            html += '<div class="col-1 right no-padding dashboard-tile-help-icon icon-visible" style="margin-top:2px;"><img id="' + role.tag + '_helpicon" class="icon-15 explanation" value="' + role.help_icon_tag + '" src="static/img/Gray_Info150.png"></div>';
            html += "</div>";
        }
        elem.append(html);  
        
        var div_id = 'role' + b + '_div';
        if('is_lines' in specs && specs.is_lines){
            div_id = 'lines_role' + b + '_div';
        }
        html = "<div id='" + div_id + "' class='no-padding' style='padding-bottom:20px;'></div>";
        elem.append(html);  
        //console.log("lb.role.js_data.data"); console.log(role.js_data.data);
        //console.log("lb.role.js_data"); console.log(role.js_data);
        if(role.js_data.data.length == 0){
            $("#" + div_id).append("<div class='col-12'><span class='font-12 error'>There are no players to display.</span></div>");
        }
        else{
            if('is_lines' in specs && specs.is_lines){
                // No sorting; use display_seq from DB, but we do want to filter out groupings with no players in them
                
            }   
            else{            
                if(role.tag == "field"){
                    role.js_data.data = role.js_data.data.sort(function(a,b){ return b.team_play_shares - a.team_play_shares; }); 
                }
                else if(role.tag == "fogo"){
                    role.js_data.data = role.js_data.data.sort(function(a,b){ return b.faceoff_ELO - a.faceoff_ELO; }); 
                }
                else if(role.tag == "goalkeepers"){
                    role.js_data.data = role.js_data.data.sort(function(a,b){ return b.excess_saves - a.excess_saves; });
                }
                //console.log("lx.role.tag: " + role.tag);
            }
            
            generic_create_table(role.js_data, {'id': div_id, 'target_elem': div_id});
            
            if(SHOW_RETURNING_ICON && n_returning > 0){
                $("#" + 'role' + b + '_div').append("<div class=''><span class='font-12'><sup>&#8224;</sup> returning player</span></div>");
            }
        }
    }
    
    // Install the toggle between advanced and traditional stats
    //console.log("lmn.specs"); console.log(specs);
    if('is_lines' in specs && specs.is_lines){
        toggle = {'val': specs.show_advanced ? 0: 1, 'start_x': 25, 'end_x': 30, 'id': 'lines_roster_stat_type_toggle', 'text_align': 'right', 'start_label': 'Adv', 'end_label': "Trad"};
        display_toggle(toggle, 'lines_roster_stat_type_toggle_div', {'chart_size': 'small', 'class': 'lines_roster_stat_type_adv_vs_trad', 'height': 20});
    }
    else{
        toggle = {'val': specs.show_advanced ? 0: 1, 'start_x': 25, 'end_x': 30, 'id': 'roster_stat_type_toggle', 'text_align': 'right', 'start_label': 'Adv', 'end_label': "Trad"};
        display_toggle(toggle, 'roster_stat_type_toggle_div', {'chart_size': 'small', 'class': 'roster_stat_type_adv_vs_trad', 'height': 20});
    }
    
    
    $(".icon-15.explanation").click(function( event ) {  event.stopPropagation(); console.log("STOP PROP4");  async_request_explanation(this.getAttribute("value")); });
   
}

function display_team_season_splits(misc, js_data){
	/***
	Each team's LRP JSON file contains their season splits in terms of summary statistics in wins vs losses, etc. This function displays those splits in pre-arranged divs (and unhides the div) assuming the source data is present within the misc_dot_data object.
	***/
	
	function local_convert_tag(tmp_fld){
		/*** When I first wrote the code to create the season games log, it included variable names that did not match my DB; when I created the splits, I used the db names, so I need to convert the original names to the DB names before creating the splits (since they use the same js_data object)***/
		
		tmp_fld.tag = tmp_fld.tag.replace("offense_adjusted", "adjusted_off").replace("defense_adjusted", "adjusted_def").replace("adjusted_off_faceoff", "adjusted_faceoff").replace("adjusted_off_modified_possession_margin", "adjusted_modified_possession_margin").replace("adjusted_off_possession_margin", "adjusted_possession_margin");
		tmp_fld.tag = tmp_fld.tag.replace("offense_", "off_").replace("defense_", "def_");
		tmp_fld.tag = tmp_fld.tag.replace("off_faceoff_win_rate", "faceoff_win_rate").replace("off_modified_possession_margin", "modified_possession_margin").replace("off_possession_margin", "possession_margin")
		if(tmp_fld.tag.endsWith("str")){
			tmp_fld.tag = tmp_fld.tag.substr(0, tmp_fld.tag.length - 4);
		}
		
		return tmp_fld
	}
	
	generic_create_table(js_data, {'id': id + "_div", 'target_elem': id + "_div"});
	$("#full_season_avg_div").empty(); $("#full_season_avg_div").append(avg_html);
	
	// Add the wins vs losses split (if there is more than one)
	var splits_js_data = null; var splits_tag = null; var split_display = null;
	
	// Split Type #1: Wins Vs Losses
	splits_tag = "w_vs_l"; split_tag = "win"; split_display = "By Outcome";
	n_with_games = misc.data.splits[splits_tag].filter(r=> r.n_games > 0).length;
	if('splits' in misc.data && splits_tag in misc.data.splits && misc.data.splits[splits_tag].length > 1 && n_with_games > 1){
		splits_js_data = JSON.parse(JSON.stringify(js_data));
		
		
		$("#splits_" + splits_tag + "_div").removeClass("hidden");
		// Swap out the fields so that we can use the data itself but adjust the table to show the split in question
		splits_js_data.fields[0] = {'sort_by': split_tag, 'tag': 'display', 'display': split_display}
		splits_js_data.fields[1].display = "";
		splits_js_data.fields[2].display = "";
		
		for(var a = 0;a<splits_js_data.fields.length;a++){ var tmp_fld = splits_js_data.fields[a];
			tmp_fld.sort_by = null;
			
			tmp_fld = local_convert_tag(tmp_fld);
			if(a == 1){
				tmp_fld.tag = null;
			}
			// We need to convert from a different tag structure; the original season games data uses offense_adjusted instead of adjusted_off.
			if(a > 1){
				var tmp_stats = misc.extra_data.db_statistics.filter(r=> r.stat == tmp_fld.tag.replace("adjusted_", "").replace("faceoff_", "fzz_").replace("def_", "").replace("off_", "").replace("def_", "").replace("fzz_", "faceoff_"));
				//console.log(tmp_fld.tag, tmp_stats.length);
				if(tmp_stats.length > 0 && tmp_stats[0].js_fmt != null){
					splits_js_data.fmt[a] = {'fmt': tmp_stats[0].js_fmt};
				}
				else{
					splits_js_data.fmt[a] = {'fmt': "1%"};
				}
			}
		}
		
		//console.log("misc.data.splits." + splits_tag); console.log(misc.data.splits[splits_tag])
		
		splits_js_data.data = misc.data.splits[splits_tag].filter(r=> !('n_games' in r) || r.n_games > 0);
		$("splits_" + splits_tag + "_div").empty();
		generic_create_table(splits_js_data, {'id': "splits_" + splits_tag + "_div", 'target_elem': "splits_" + splits_tag + "_div"});
	}
	
	// Split Type #2: By Month
	splits_tag = "months"; split_tag = "month"; split_display = "By Month";
	n_with_games = misc.data.splits[splits_tag].filter(r=> r.n_games > 0).length;
	if('splits' in misc.data && splits_tag in misc.data.splits && misc.data.splits[splits_tag].length > 1 && n_with_games > 1){
		splits_js_data = JSON.parse(JSON.stringify(js_data))
		
		
		$("#splits_" + splits_tag + "_div").removeClass("hidden");
		// Swap out the fields so that we can use the data itself but adjust the table to show the split in question
		splits_js_data.fields[0] = {'sort_by': split_tag, 'tag': 'display', 'display': split_display}
		splits_js_data.fields[1].display = "";
		splits_js_data.fields[2].display = "";
		
		for(var a = 0;a<splits_js_data.fields.length;a++){ var tmp_fld = splits_js_data.fields[a];
			tmp_fld.sort_by = null;
			tmp_fld = local_convert_tag(tmp_fld);
			if(a == 1){
				tmp_fld.tag = null;
			}
			// We need to convert from a different tag structure; the original season games data uses offense_adjusted instead of adjusted_off.
			if(a > 1){
				var tmp_stats = misc.extra_data.db_statistics.filter(r=> r.stat == tmp_fld.tag.replace("adjusted_", "").replace("faceoff_", "fzz_").replace("def_", "").replace("off_", "").replace("def_", "").replace("fzz_", "faceoff_"));
				//console.log(tmp_fld.tag, tmp_stats.length);
				if(tmp_stats.length > 0 && tmp_stats[0].js_fmt != null){
					splits_js_data.fmt[a] = {'fmt': tmp_stats[0].js_fmt};
				}
				else{
					splits_js_data.fmt[a] = {'fmt': "1%"};
				}
			}
		}
		
		//console.log("misc.data.splits." + splits_tag); console.log(misc.data.splits[splits_tag])
		
		splits_js_data.data = misc.data.splits[splits_tag].filter(r=> !('n_games' in r) || r.n_games > 0);
		$("splits_" + splits_tag + "_div").empty();
		generic_create_table(splits_js_data, {'id': "splits_" + splits_tag + "_div", 'target_elem': "splits_" + splits_tag + "_div"});
	}
	
	// Split Type #3: By Conference
	splits_tag = "by_conference"; split_tag = "is_conference"; split_display = "In/Out of Conference";
	n_with_games = misc.data.splits[splits_tag].filter(r=> r.n_games > 0).length;
	if('splits' in misc.data && splits_tag in misc.data.splits && misc.data.splits[splits_tag].length > 1 && n_with_games > 1){
		splits_js_data = JSON.parse(JSON.stringify(js_data))
		$("#splits_" + splits_tag + "_div").removeClass("hidden");
		// Swap out the fields so that we can use the data itself but adjust the table to show the split in question
		splits_js_data.fields[0] = {'sort_by': split_tag, 'tag': 'display', 'display': split_display}
		splits_js_data.fields[1].display = "";
		splits_js_data.fields[2].display = "";
		
		for(var a = 0;a<splits_js_data.fields.length;a++){ var tmp_fld = splits_js_data.fields[a];
			tmp_fld.sort_by = null;
			tmp_fld = local_convert_tag(tmp_fld);
			if(a == 1){
				tmp_fld.tag = null;
			}
			// We need to convert from a different tag structure; the original season games data uses offense_adjusted instead of adjusted_off.
			if(a > 1){
				var tmp_stats = misc.extra_data.db_statistics.filter(r=> r.stat == tmp_fld.tag.replace("adjusted_", "").replace("faceoff_", "fzz_").replace("def_", "").replace("off_", "").replace("def_", "").replace("fzz_", "faceoff_"));
				//console.log(tmp_fld.tag, tmp_stats.length);
				if(tmp_stats.length > 0 && tmp_stats[0].js_fmt != null){
					splits_js_data.fmt[a] = {'fmt': tmp_stats[0].js_fmt};
				}
				else{
					splits_js_data.fmt[a] = {'fmt': "1%"};
				}
			}
		}
		
		//console.log("misc.data.splits." + splits_tag); console.log(misc.data.splits[splits_tag])
		
		splits_js_data.data = misc.data.splits[splits_tag];
		$("splits_" + splits_tag + "_div").empty();
		generic_create_table(splits_js_data, {'id': "splits_" + splits_tag + "_div", 'target_elem': "splits_" + splits_tag + "_div"});
	}
				
}

function display_roster_list_noauth(id, roster){
    /***
    Since there is a standard roster table, I have a single function instead of implementing it everywhere a roster is needed. This splits the roster out into field/faceoffs/goalies. The product complication is whether the user's tier allows them to link to the player's detail page. So the player link may or may not be available.
    ***/
    player_link = "";
    if(misc.target_template.indexOf("basic") == 0){
        player_link = "/basic_player_detail";
    }
    else if(misc.target_template.indexOf("team") == 0){
        player_link = "/team_player_detail";
    }
        
    roles = [];
    if('gender' in misc.data && misc.data.gender == "women"){
        roles.push({'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
        roles.push({'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
        
    }
    else{
        roles.push({'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive']});
        roles.push({'desc': 'FOGO', 'tag': 'fogo', 'role_tags': ['faceoff']});
        roles.push({'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
    }
    /***
    If we are supposed to show player links and/or highlight a chosen player (per the user product/specs), determine that here. The flags are used later to specify how the player row is constructed.
    ***/    
    show_player_links = 1; highlight_any = 0;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
        highlight_any = ([1, 4, 7].indexOf(misc.product_i) > -1 && misc.product_t == 1) ? 1 : 0;
    }
    
    /***
    There are a few data points that are calculated rather than present in the player objects; they are calculated here.
    ***/
    for(var a = 0;a<roster.length;a++){ p = roster[a];

        p.seq = a;
        p.faceoff_record = p.faceoff_wins + " - " + p.faceoff_losses;
        p.save_pct = p.on_keeper_sog_faced > 0 ? 1.0 - (p.goals_allowed / p.on_keeper_sog_faced) : null;
        p.faceoff_ELO = ""
        p.faceoff_ELO_rank = ""
        p.faceoff_ELO_rank_str = ""
        p.season_faceoff_ELO_rank_str = "";
        p.expected_goals_allowed = ""
        p.excess_saves = ""
        p.EGA = "";
        p.team_play_shares = "";
    }
    
    /***
    Build the input data for generic_create_table; the data we need to produce depends on the role. We are using the dtop flag to show some fields only on larger displays.
    ***/
    for(var b = 0;b<roles.length;b++){ 
        role_players = roster.filter(r=> roles[b].role_tags.indexOf(r.role) > -1 || (b==0 && r.role == null));
        js_data = {'no_row_count': 1, 'data': [], 'cell_size': 'cell-holder', 'row_style_class': ''}
        js_data.fields = [{'sort_by': 'player', 'tag': 'player', 'display': 'Player'}, {'sort_by': 'team_listed_role', 'tag': 'team_listed_role', 'display': 'Pos.'}];

        if(roles[b].tag == "field"){
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'class': 'no-padding col-1' }, {'outer_class': 'col-8-6', 'classes': [{'class': 'centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': ""}, {'fmt': "2"}, {'fmt': "1%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': ""}];
            js_data.fields.push({'sort_by': 'EGA', 'tag': 'EGA', 'display': 'EGA'});
            js_data.fields.push({'sort_by': 'team_play_shares', 'tag': 'team_play_shares', 'mob_display': 'Share%', 'dtop_display': 'Play Shares'});
            js_data.fields.push({'sort_by': 'shots', 'tag': 'shots', 'display': 'Shots'});
            js_data.fields.push({'sort_by': 'goals', 'tag': 'goals', 'display': 'Goals'});
            js_data.fields.push({'sort_by': 'gbs', 'tag': 'gbs', 'display': 'Ground Balls'});
        }
        else if(roles[b].tag == "fogo"){
            //js_data.cell_size = "large-cell-holder";
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'class': 'no-padding col-1' }, {'outer_class': 'col-8-6', 'classes': [{'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': ""}, {'fmt': "1%"}, {'fmt': ""}, {'fmt': "0"}, {'fmt': ""}, {'fmt': ""}];
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_win_rate', 'mob_display': 'FO Win%', 'dtop_display': 'FO Win Rate'});
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_record', 'display': 'FO Record'});
            js_data.fields.push({'sort_by': 'faceoff_ELO', 'tag': 'faceoff_ELO', 'display': 'FO ELO', 'display': 'FO ELO'});
            js_data.fields.push({'sort_by': 'season_faceoff_ELO_rank', 'tag': 'season_faceoff_ELO_rank_str', 'mob_display': 'ELO Rank', 'dtop_display': 'FO ELO Rank'});
            
        }
        else if(roles[b].tag == "goalkeepers"){
            //js_data.cell_size = "large-cell-holder";
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'class': 'no-padding col-1' }, {'outer_class': 'col-8-6', 'classes': [{'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}/*, {'class': 'centered dtop'}, {'class': 'centered'}*/, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': ""}, {'fmt': "0%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1"}];//, {'fmt': "1"}, {'fmt': "1"}];
            js_data.fields.push({'sort_by': 'save_pct', 'tag': 'save_pct', 'display': 'Save Pct'});
            js_data.fields.push({'sort_by': 'on_keeper_sog_faced', 'tag': 'on_keeper_sog_faced', 'mob_display': 'Shots', 'dtop_display': 'SOG Faced'});
            js_data.fields.push({'sort_by': 'goals_allowed', 'tag': 'goals_allowed', 'mob_display': 'Goals', 'dtop_display': 'Goals'});
            //js_data.fields.push({'sort_by': 'expected_goals_allowed', 'tag': 'expected_goals_allowed', 'display': 'Expected GA'});
            //js_data.fields.push({'sort_by': 'excess_saves', 'tag': 'excess_saves', 'mob_display': 'Saves+', 'dtop_display': 'Excess Saves'});
        }
        js_data.fields.push({'tag': 'expand', 'display': ''});
        
        for(var a = 0;a<role_players.length;a++){
            
            p = role_players[a];
            tmp_fields = ['EGA', 'team_play_shares', 'faceoff_win_rate', 'faceoff_record', 'save_pct', 'on_goal_shooting_pct', 'on_keeper_sog_faced', 'goals_allowed', 'expected_goals_allowed', 'excess_saves', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'shots', 'goals', 'gbs', 'turnovers'];
            d = {};
            
            link_this_player = show_player_links || p.ID == user_obj.preferences.fpi;
            d.highlight_row = highlight_any && p.ID == user_obj.preferences.fpi;
            
            for(var ab = 0;ab<tmp_fields.length;ab++){ d[tmp_fields[ab]] = p[tmp_fields[ab]]; }
            if(link_this_player){
                d.player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.player+ "</span></FORM>";
            }
            else{
                d.player = p.player;
            }

            d.expand = "<img id='player" + p.seq + "_imgicon' class='icon-15 plus-toggle row-toggle' onclick='display_player_card_noauth(" + p.seq + ");' src='static/img/Gray_Plus_Skinny150.png' />";
            js_data.data.push(d);
        }
        roles[b].js_data = js_data;
    }
    
    /*** 
    Cycle through the 3 player "roles" and use our standard create_table function to produce the sortable table for each.  If there are no players in the role, a message gets printed to the screen instead. The initial sort is specific to the role.
    ***/
    elem = $("#" + id); elem.empty();
    html = "<div class='col-12' style='padding:20px 0px;'><span class='font-18 lh-24 contents'>The PRO roster view is just what it sounds like, except that instead of traditional counting stats, you get the LacrosseReference view of each player's year.</span></div>";
    elem.append(html);  
    for(var b = 0;b<roles.length;b++){role = roles[b];
        html = "<div class='col-12 bbottom'><span class='font-18 bold'>" + role.desc + "</span></div>";
        elem.append(html);  
        
        html = "<div id='role" + b + "_div' class='no-padding' style='padding-bottom:20px;'></div>";
        elem.append(html);  
        
        if(role.js_data.data.length == 0){
            $("#role" + b + "_div").append("<div class='col-12'><span class='font-12 error'>There are no players to display.</span></div>");
        }
        else{
            if(role.tag == "field"){
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.team_play_shares - a.team_play_shares; }); 
            }
            else if(role.tag == "fogo"){
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.faceoff_ELO - a.faceoff_ELO; }); 
            }
            else if(role.tag == "goalkeepers"){
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.excess_saves - a.excess_saves; });
            }
            generic_create_table(role.js_data, {'id': 'role' + b + '_div', 'target_elem': 'role' + b + '_div'});
        }
    }
    $(".icon-15.explanation").click(function( event ) {  event.stopPropagation();console.log("STOP PROP3");  async_request_explanation(this.getAttribute("value")); });
}

function display_roster_list_and_keys_noauth(id, roster){
    /***
    Since there is a standard roster table, I have a single function instead of implementing it everywhere a roster is needed. This splits the roster out into field/faceoffs/goalies. The product complication is whether the user's tier allows them to link to the player's detail page. So the player link may or may not be available.
    ***/
    player_link = "";
    if(misc.target_template.indexOf("basic") == 0){
        player_link = "/basic_player_detail";
    }
    else if(misc.target_template.indexOf("team") == 0){
        player_link = "/team_player_detail";
    }
        
    roles = [];
    if('gender' in misc.data && misc.data.gender == "women"){
        roles.push({'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive', 'faceoff']});
        roles.push({'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
        
    }
    else{
        roles.push({'desc': 'Field', 'tag':  'field', 'role_tags': ['offensive', 'defensive']});
        roles.push({'desc': 'FOGO', 'tag': 'fogo', 'role_tags': ['faceoff']});
        roles.push({'desc': 'Goalkeepers', 'tag': 'goalkeepers', 'role_tags': ['goalkeeper']});
    }
    /***
    If we are supposed to show player links and/or highlight a chosen player (per the user product/specs), determine that here. The flags are used later to specify how the player row is constructed.
    ***/    
    show_player_links = 1; highlight_any = 0;
    if('product_i' in misc){
        show_player_links = ([1, 4, 7].indexOf(misc.product_i) == -1 || misc.product_t > 1) ? 1 : 0;
        highlight_any = ([1, 4, 7].indexOf(misc.product_i) > -1 && misc.product_t == 1) ? 1 : 0;
    }
    
	
    /***
    There are a few data points that are calculated rather than present in the player objects; they are calculated here.
    ***/
	var rk_specs = {'keys': roster.keys};
	var tmp_roster = [];
	var keys_to_switch = ['role', 'is_returning', 'height', 'games_appeared_in', 'weight', 'player', 'pro_url_tag', 'jersey_number', 'usage_adjusted_EGA', 'turnover_rate', 'weighted_team_play_shares', 'share_of_team_assists', 'share_of_team_shots', 'on_goal_shooting_pct', 'faceoff_wins', 'faceoff_losses', 'on_keeper_sog_faced', 'faceoff_win_rate', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'excess_saves_per_sog', 'goals_allowed', 'EGA_per_game', 'shots', 'goals', 'gbs', 'player_ID', 'caused_turnover_share', 'caused_turnovers', 'turnovers', 'assists', 'sog_rate', 'penalties', 'defensive_EGA_rank_str'];
	var max_turnovers = null;
	for(var a = 0;a<roster.data.length;a++){ p = roster.data[a];
		d = {};
		for(var b = 0;b<keys_to_switch.length;b++){
			d[keys_to_switch[b]] = get_field(p, keys_to_switch[b], rk_specs)
			if(keys_to_switch[b] == "turnovers" && (max_turnovers == null || max_turnovers < d[keys_to_switch[b]])){
				max_turnovers = d[keys_to_switch[b]];
			}
		}
		tmp_roster.push(d);
		
	}

	if(!('seq' in roster.keys)){
		// Add the seq key to the list of keys
		roster.keys.push('seq')
		roster.keys.push('faceoff_record')
		roster.keys.push('save_pct')
		roster.keys.push('excess_saves')
		roster.keys.push('show')
	}
	
		
		
	
    for(var a = 0;a<tmp_roster.length;a++){ p = tmp_roster[a];

        p.seq = a;
        p.faceoff_record = p.faceoff_wins + " - " + p.faceoff_losses;
        p.save_pct = p.on_keeper_sog_faced > 0 ? 1.0 - (p.goals_allowed / p.on_keeper_sog_faced) : null;
        p.faceoff_ELO = ""
        p.faceoff_ELO_rank = ""
        p.faceoff_ELO_rank_str = ""
        p.season_faceoff_ELO_rank_str = "";
        p.expected_goals_allowed = ""
        p.excess_saves = ""
        p.EGA = "";
        p.team_play_shares = "";
		
		
		roster.data[a].push(a); // Add the seq value to the list_and_keys structure
		roster.data[a].push(p.faceoff_record); // Add the faceoff_record value to the list_and_keys structure
		roster.data[a].push(p.save_pct); // Add the save_pct value to the list_and_keys structure
		roster.data[a].push(p.excess_saves); // Add the excess_saves value to the list_and_keys structure
		roster.data[a].push(p.show); // Add the show value to the list_and_keys structure
    }
    
    /***
    Build the input data for generic_create_table; the data we need to produce depends on the role. We are using the dtop flag to show some fields only on larger displays.
    ***/
    for(var b = 0;b<roles.length;b++){ 
        role_players = tmp_roster.filter(r=> roles[b].role_tags.indexOf(r.role) > -1 || (b==0 && r.role == null));
        js_data = {'no_row_count': 1, 'data': [], 'cell_size': 'small-cell-holder', 'row_style_class': 'bbottom very-light'}
        js_data.fields = [{'sort_by': 'player', 'tag': 'player', 'display': 'Player'}];

        if(roles[b].tag == "field"){
            js_data.classes = [{'class': 'no-padding col-2-4' + (show_player_links ? " mouseover-link" : "")}, {'outer_class': 'col-10-8', 'classes': [{'class': 'centered'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'dtop centered'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': ""}];
            js_data.fields.push({'sort_by': 'games_appeared_in', 'tag': 'games_appeared_in', 'display': 'GP'});
            js_data.fields.push({'sort_by': 'goals', 'tag': 'goals', 'mob_display': 'G', 'dtop_display': 'Goals'});
            js_data.fields.push({'sort_by': 'assists', 'tag': 'assists', 'mob_display': 'A', 'dtop_display': 'Asst'});
            js_data.fields.push({'sort_by': 'shots', 'tag': 'shots', 'display': 'Shots'});
            js_data.fields.push({'sort_by': 'sog_rate', 'tag': 'sog_rate', 'display': 'SOG'});
            js_data.fields.push({'sort_by': 'gbs', 'tag': 'gbs', 'display': 'GB'});
            js_data.fields.push({'sort_by': 'turnovers', 'tag': 'turnovers', 'display': 'TO'});
            js_data.fields.push({'sort_by': 'caused_turnovers', 'tag': 'caused_turnovers', 'display': 'CT'});
        }
        else if(roles[b].tag == "fogo"){
				
            js_data.cell_size = "cell-holder";
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'outer_class': 'col-8-6', 'classes': [{'class': 'centered'}, {'class': 'centered dtop'}, {'class': 'centered'}, {'class': 'centered'}, {'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': "1%"}, {'fmt': ""}, {'fmt': "0"}, {'fmt': ""}, {'fmt': ""}];
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_win_rate', 'mob_display': 'FO Win%', 'dtop_display': 'FO Win Rate'});
            js_data.fields.push({'sort_by': 'faceoff_win_rate', 'tag': 'faceoff_record', 'display': 'FO Record'});
            js_data.fields.push({'sort_by': 'faceoff_ELO', 'tag': 'faceoff_ELO', 'display': 'FO ELO', 'display': 'FO ELO'});
            js_data.fields.push({'sort_by': 'season_faceoff_ELO_rank', 'tag': 'season_faceoff_ELO_rank_str', 'mob_display': 'ELO Rank', 'dtop_display': 'FO ELO Rank'});
            
        }
        else if(roles[b].tag == "goalkeepers"){
            js_data.cell_size = "cell-holder";
            js_data.classes = [{'class': 'no-padding col-3-5' + (show_player_links ? " mouseover-link" : "")}, {'outer_class': 'col-8-6', 'classes': [{'class': 'centered'}, {'class': 'dtop centered'}, {'class': 'centered'}, /*{'class': 'centered dtop'}, {'class': 'centered'}, */{'class': 'centered'}]}];
            js_data.fmt = [{'fmt': ""}, {'fmt': "0%"}, {'fmt': "0"}, {'fmt': "0"}, {'fmt': "1"}];//, {'fmt': "1"}, {'fmt': "1"}];
            js_data.fields.push({'sort_by': 'save_pct', 'tag': 'save_pct', 'display': 'Save Pct'});
            js_data.fields.push({'sort_by': 'on_keeper_sog_faced', 'tag': 'on_keeper_sog_faced', 'mob_display': 'Shots', 'dtop_display': 'SOG Faced'});
            js_data.fields.push({'sort_by': 'goals_allowed', 'tag': 'goals_allowed', 'mob_display': 'GA', 'dtop_display': 'GA'});
            //js_data.fields.push({'sort_by': 'expected_goals_allowed', 'tag': 'expected_goals_allowed', 'display': 'Expected GA'});
            //js_data.fields.push({'sort_by': 'excess_saves', 'tag': 'excess_saves', 'mob_display': 'Saves+', 'dtop_display': 'Excess Saves'});
        }
        js_data.fields.push({'tag': 'expand', 'display': ''});
        
        for(var a = 0;a<role_players.length;a++){
            
            p = role_players[a];
            tmp_fields = ['EGA', 'team_play_shares', 'games_appeared_in', 'assists', 'sog_rate', 'turnovers', 'caused_turnovers', 'faceoff_win_rate', 'faceoff_record', 'save_pct', 'on_goal_shooting_pct', 'on_keeper_sog_faced', 'goals_allowed', 'expected_goals_allowed', 'excess_saves', 'faceoff_ELO', 'season_faceoff_ELO_rank_str', 'shots', 'goals', 'gbs', 'turnovers'];
            d = {};
            
            link_this_player = show_player_links || p.ID == user_obj.preferences.fpi;
            d.highlight_row = highlight_any && p.ID == user_obj.preferences.fpi;
            
            for(var ab = 0;ab<tmp_fields.length;ab++){ d[tmp_fields[ab]] = p[tmp_fields[ab]]; }
            if(link_this_player){
                d.player = "<FORM id='player" + p.player_ID + "form' action='" + player_link + "' method=POST><input type=hidden name='ID' value='" + p.player_ID + "'><input type=hidden name='t' value='" + misc.tracking_tag + "'><input type=hidden name='came_from' value='" + misc.came_from + "'><span onclick=\"document.getElementById(\'player" + p.player_ID + "form\').submit();\" class='mouseover-link no-padding'>" + p.player+ "</span></FORM>";
            }
            else{
                d.player = p.player;
            }

            d.expand = "<img id='player" + p.seq + "_imgicon' class='icon-15 plus-toggle row-toggle' onclick='display_player_card_noauth(" + p.seq + ");' src='static/img/Gray_Plus_Skinny150.png' />";
            js_data.data.push(d);
        }
        roles[b].js_data = js_data;
    }
    
    /*** 
    Cycle through the 3 player "roles" and use our standard create_table function to produce the sortable table for each.  If there are no players in the role, a message gets printed to the screen instead. The initial sort is specific to the role.
    ***/
    elem = $("#" + id); elem.empty();
	if(max_turnovers > 5){
		html = "<div class='col-12' style='padding:20px 0px;'><span class='font-15 lh-24 contents'>Typically, when you see individual stats for a player, it's what I'm showing below. Counting stats. Just counting stats.<BR><BR>There is nothing wrong with counting stats; they tell you what happened. But that's barely scratching the surface. Take turnovers for example: is " + max_turnovers + " a lot? Hard to say, unless you know how much that player has the ball in their stick. The quarterback of an offense is almost always going to have the most turnovers, but that does not mean that they have a turnover problem. That's where PRO comes in handy<BR><BR>Click <span onclick='display_noauth_PRO_roster_info();' class='no-padding msg mouseover-link'>here</span> to see how PRO tells player stories differently.</span></div>";
	}
	else{
		html = "<div class='col-12' style='padding:20px 0px;'><span class='font-15 lh-24 contents'>Typically, when you see individual stats for a player, it's what I'm showing below. Counting stats. Just counting stats.<BR><BR>There is nothing wrong with counting stats; they tell you what happened. But that's barely scratching the surface. That's where PRO comes in handy.<BR><BR>Click <span onclick='display_noauth_PRO_roster_info();' class='no-padding msg mouseover-link'>here</span> to see how PRO tells player stories differently.</span></div>";
		
	}
    elem.append(html);  
	
	// Create a hidden display that will show the PRO view of an individual player
	html = "";
	html += "<div id='noauth_PRO_player_display_preview_div' class='hidden card' style='padding:10px;'>"
	
		// Header / Intro (Explain how PRO tells stories more effectively)
		html += "<div id='noauth_PRO_player_display_preview_intro_div' class=''>"
			
			html += "<div class='centered col-12' style='padding:0px 0px 20px 0px;'><span class='font-18 bold site-blue'>Stop Settling for Old Stats</span></div>"
			html += "<span class='font-15 lh-24 contents'>Stats should do more than list numbersâ€”they should help you truly understand the game. With LacrosseReference PRO, you'll unlock deeper insights that tell the stories behind the player box scores.</span>"
			
		html += "</div>"
		
		// Two panels that show a preview of the visualization
		html += "<div class='no-padding bbottom'>"
			
			// Panel A (Stats Comparison)
			html += "<div id='noauth_PRO_player_display_preview_panel1_div' class='' style=''>"
				html += "<div class='flex'>"
					html += "<div class='col-6'><span class='bold font-18'>Old Stats</span></div>"
					html += "<div class='col-6'><span class='bold font-18'>Better Stats</span></div>"
				html += "</div>"
				
				html += "<div class='flex bbottom very-light'>"
					// Player Efficiency
					html += "<div class='col-5'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/RedXCircle240.png' /><span class='font-15 contents'>Points</span></div>"
						html += "<div class=''><span class='font-12 contents'>Most places put points on a pedestal, but scoring is not the only thing that matters.</span></div>"
					html += "</div>"
					
					html += "<div class='col-1'></div>"
					html += "<div class='col-6'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/BlueCheck240.png' /><span class='font-15 contents'>Player Efficiency</span></div>"
						html += "<div class=''><span class='font-12 contents'>Points matter, but so do turnovers...and touches. Efficiency is what we really care about.</span></div>"
					html += "</div>"
				html += "</div>"		
				
				html += "<div class='flex bbottom very-light'>"	
					// Assist Rate
					html += "<div class='col-5'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/RedXCircle240.png' /><span class=' font-15 contents'>Turnovers</span></div>"
						html += "<div class=''><span class='font-12 contents'>The number of turnovers tells you more about how much each player has the ball than their ball security.</span></div>"
					html += "</div>"
					
					html += "<div class='col-1'></div>"
					html += "<div class='col-6'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/BlueCheck240.png' /><span class=' font-15 contents'>Turnover Rate</span></div>"
						html += "<div class=''><span class='font-12 contents'>What we care about is, for a given touch, how likely is the player to turn the ball over. That's ball security.</span></div>"
					html += "</div>"
				html += "</div>"	
				
				html += "<div class='flex bbottom very-light'>"	
					// Shooting Efficiency
					html += "<div class='col-5'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/RedXCircle240.png' /><span class=' font-15 contents'>Shooting Percentage</span></div>"
						html += "<div class=''><span class='font-12 contents'>Not all missed shots are equal; saved shots are like turnovers. You know this. Shooting percentage doesn't capture this.</span></div>"
					html += "</div>"
					
					html += "<div class='col-1'></div>"
					html += "<div class='col-6'>"
						html += "<div class='inline-flex no-padding'><img class='icon-15' style='margin-right:10px; margin-top:2px;' src='/static/img/BlueCheck240.png' /><span class=' font-15 contents'>Shooting Efficiency</span></div>"
						html += "<div class=''><span class='font-12 contents'>Shooting efficiency differentiates between shots that are saved and shots that are off-cage. It's a better picture of actual shooting skill.</span></div>"
					html += "</div>"
				html += "</div>"
				
			html += "</div>"
			
			// Panel B
			html += "<div id='noauth_PRO_player_display_preview_panel2_title' class=''></div>"
			html += "<div id='noauth_PRO_player_display_preview_panel2_div' class='' style='height:200px;'>"
		
			html += "</div>"
		html += "</div>"
		
		// Closing Argument (Wrap-up with how their lives will be better with PRO)
		html += "<div id='noauth_PRO_player_display_preview_closing_div' class='' style='padding:20px 0px 20px 0px;'>"
			html += "<span class='font-15 lh-24 contents'>Most fans only see goals and assists, but you'll see the whole picture. And that will make you the most popular person at the tailgate. PRO subscriptions start at $15. Cancel anytime if it's not for you.</span>"
		html += "</div>"
		html += "<div class='centered col-12'><a href='/product-pricing-basic" + misc.tracking_tag_str + "'><button class='font-18 bold action-button blue'>SEE PRICING</button></a></div>"
	html += "</div>"
	elem.append(html);  
	
	if('sample_player_percentiles' in misc.data && misc.data.sample_player_percentiles){
		display_sample_player_madden_chart();
	}
	
    for(var b = 0;b<roles.length;b++){role = roles[b];
        html = "<div class='col-12 bbottom'><span class='font-18 bold'>" + role.desc + "</span></div>";
        elem.append(html);  
        
        html = "<div id='role" + b + "_div' class='no-padding' style='padding-bottom:20px;'></div>";
        elem.append(html);  
        
        if(role.js_data.data.length == 0){
            $("#role" + b + "_div").append("<div class='col-12'><span class='font-12 error'>There are no players to display.</span></div>");
        }
        else{
			
            if(role.tag == "field"){
				console.log(role.js_data);
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.team_play_shares - a.team_play_shares; }); 
            }
            else if(role.tag == "fogo"){
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.faceoff_ELO - a.faceoff_ELO; }); 
            }
            else if(role.tag == "goalkeepers"){
                role.js_data.data = role.js_data.data.sort(function(a,b){ return b.excess_saves - a.excess_saves; });
            }
            generic_create_table(role.js_data, {'id': 'role' + b + '_div', 'target_elem': 'role' + b + '_div'});
        }
    }
    $(".icon-15.explanation").click(function( event ) {  event.stopPropagation();console.log("STOP PROP3");  async_request_explanation(this.getAttribute("value")); });
}

function show_full_testimonial(testimonial_ID){
	/***
	Displays a pop-up screen that includes the entirety of the testimonial (for cases where the full content is too long to show in the carousel)
	***/
	
	var testimonial = [];
	if('existing_testimonials' in misc && misc.existing_testimonials != null){
		testimonial = misc.existing_testimonials.filter(r=> r.ID == testimonial_ID);
	}
	
	if(testimonial.length == 0){
		var tmp_template = misc == null || !('target_template' in misc) || misc.target_template == null ? "???": misc.target_template;
		var tmp_nhca = misc == null || !('nhca' in misc) || misc.nhca == null ? "???": misc.nhca;
	
		report_js_visualization_issue(tmp_template + "|display_full_testimonial|" + tmp_nhca, "Could not pull up a testimonial with ID=" + testimonial_ID);
	}
	else{
		testimonial = testimonial[0];
		console.log(testimonial);
		
	
		other_helpful_stuff = "";
		var logger_str = null;
		var edit_objects_html = "";
		
		edit_objects_html += "<div class='no-padding exp-scroll bigger' id='full_review_div'>";
			edit_objects_html += "<div class='flex'><div class='col-10 inline-flex'><span class='font-36 bold contents'>EG Nation Speaks</span></div>";
		
			edit_objects_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>"
			edit_objects_html += "<div class='' style='padding-top:40px;'><span class='bold site-blue' style='font-size:100px;'>&#8220;</span></div>";
			
			edit_objects_html += "<div class='no-padding' ><span class='contents font-15 lh-24'>";
			var tmp_full_review = "" + testimonial.full_review;
			while(tmp_full_review.indexOf("\n") > -1){ tmp_full_review = tmp_full_review.replace("\n", "<BR>"); }
			edit_objects_html += tmp_full_review
			edit_objects_html += "</span></div>";
			
			if(testimonial.img_src != null){
				edit_objects_html += "<div class='col-4'>";
					edit_objects_html += "<img style='margin-left:10px;' src='" + testimonial.img_src + "' class='icon-75'/>"
				edit_objects_html += "</div>";
				edit_objects_html += "<div class='col-8'>";
					edit_objects_html += "<div class=''><span class='contents bold font-18' style=''>" + testimonial.name_or_description + "</span></div>";
					edit_objects_html += "<div class=''><span class='contents font-18' style=''>" + testimonial.name_subtitle + "</span></div>";
					
				edit_objects_html += "</div>";
			}
			else{
				edit_objects_html += "<div class='col-1'></div><div class='col-11'>";
					edit_objects_html += "<div class=''><span class='contents bold font-18' style=''>" + testimonial.name_or_description + "</span></div>";
					if(testimonial.name_subtitle != null){
						edit_objects_html += "<div class=''><span class='contents font-18' style=''>" + testimonial.name_subtitle + "</span></div>";
					}
				edit_objects_html += "</div>";
			}
						
			
			
		edit_objects_html += "</div>";
		
		
		
		

		html = '';
		html += '<div class="flex" style="max-height:450px; margin:5px;">';
			html += '<div class="col-1"></div>';
			html += '<div class="col-10 popup-content">';
			html += edit_objects_html;
		   
			html += '</div>';
			html += '<div class="col-1"></div>';
		html += '</div>';

		$("#fullscreen_overlay_panel").empty(); $("#fullscreen_overlay_panel").append(html); $("#fullscreen_overlay_panel").addClass("shown");	
		
	}
}

function toggle_league(usl, fn=null){
    /***
    This function is used on pages where there is a toggle that allows the user to switch between leagues (i.e D1 Men vs D1 Women). When the user clicks the label, this function is triggered via onclick(). Anything with a league-toggle flag is set off so that the appropriate league/division/content objects can be shown.
    ***/
    selected_league=usl;
    $(".league-toggle").removeClass("active");
    if(document.getElementById("league_" + usl) != null){ $("#league_" + usl).addClass("active");  }
    if(document.getElementById("division_" + usl) != null){ $("#division_" + usl).addClass("active");  }
    if(document.getElementById("content_" + usl) != null){ $("#content_" + usl).addClass("active"); }
    
    
    $(".league-panel").addClass("hidden");
    $("#" + selected_league + "_panel").removeClass("hidden");
    console.log("misc.target_template: " + misc.target_template);
    //console.log("misc.handler: " + misc.handler);
    console.log("selected_league: " + selected_league);
    
    logger_str = null;
    /***
    By default, this calls the redraw function from whichever page the action came from. If the fn arg is specified, then a different function can be run instead.
    ***/
	console.log("9428", fn);
    if(fn == null){
        
        if(['offense','defense', 'faceoffs', 'goalkeepers'].indexOf(usl) > -1){
            
            // No logger str because this is not a setting that can be updated
            selected_unit = usl;
            redraw("stats");
        }
        else if(['d1w', 'd1m', 'd2w', 'd2m', 'd3w', 'd3m'].indexOf(usl) > -1){
            // This used to update the summary_league flag in LRP_User_Settings, but that is no longer going to be the case (this field will only be updated with a user switches their favorite team.
            
            //logger_str = [null, misc.nhca, 'summary_league', usl].join("|");
            if(typeof specs != "undefined"){
                if(usl == "d1w"){ specs.league = "NCAAD1Women"; }
                if(usl == "d1m"){ specs.league = "NCAAD1Men"; }
                if(usl == "d2w"){ specs.league = "NCAAD2Women"; }
                if(usl == "d2m"){ specs.league = "NCAAD2Men"; }
                if(usl == "d3w"){ specs.league = "NCAAD3Women"; }
                if(usl == "d3m"){ specs.league = "NCAAD3Men"; }
            }
            redraw();
        }
		else if(misc.target_template == "team_scheduler.html"){
			$("#" + selected_league + "_toggle").addClass("active");
			console.log("Run team scheduler function panel update...");
		}
        else{
            redraw();
        }
        
        
        
        if(logger_str != null){ document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str; }
    }
    else if(fn == "display_games" && misc.target_template == "admin_games.html"){
        filters.team_ID = null;
        display_games();
    }
	else if(fn == "redraw" && (misc.target_template == "basic_teams.html" || misc.target_template == "basic_teams_noauth.html")){
        misc.data.league_tag = usl;
        redraw();
    }
	else if(fn == "request_schedule_data" && ["basic_schedule.html", "basic_schedule_noauth.html"].indexOf(misc.target_template) > -1){
        misc.league_tag = usl;
		selected_league = usl;
		request_schedule_data(null);
    }
	else if(fn == "request_npi_or_rpi_projections_data"){
        //misc.league_tag = usl;
		
		$("#npi_or_rpi_projections_div").empty();
		$("#npi_or_rpi_projections_loading_div").removeClass("hidden");
		selected_league = usl;
		misc.data.npi_or_rpi_metric = usl;
		request_npi_or_rpi_projections_data(null);
    }
}

function dead_display_more_menu(){
    if(typeof user_obj == "undefined" || user_obj == null){ return; }
    if(typeof misc == "undefined" || misc == null){ return; }
    console.log(misc);
    console.log(user_obj);
}


function explanation_feedback(s){
    /***
    When the user clicks the input labels to tell us whether they found an explanation helpful, this function flips the display flags so that the request for help goes away and the "thanks" label appears.
    ***/
    document.getElementById('pixel').src = "/logger-explanationFeedback?c=" + s;
    $(".helpful-request").addClass("hidden");
    $(".helpful-request-thanks").removeClass("hidden");
}

function embed_code_to_script(s){
    /***
    This function takes in an embed code and returns the full code snippet required for another website to display the content.
    ***/
    if(['', null].indexOf(s) > -1){ return ''; }
    
    embed_code_str = "<div class=\"lr-embed-div\" id=\"LR" + s + "\" style=\"width:inherit; height:inherit;\"></div>";
    embed_code_str += "<script src=\"https://pro.lacrossereference.com/static/js/d3.v4.min.js\"" + "><" + "/script>"
    embed_code_str += "<script src=\"https://pro.lacrossereference.com/static/js/jquery.min.js\"" + "><" + "/script>"
    embed_code_str += "<script type=\"module\" src=\"https://pro.lacrossereference.com/static/js/laxrefmedia.js\" charset=\"utf-8\"" + "><" + "/script>";
    return embed_code_str;
    
}

function report_js_visualization_issue(s, error_msg=null){
    /***
    If a client-side visualization function fails, this function is triggered to alert the server-side logger to note it. It also sets the JS error flag, which is used in the test scripts to flag an issue.
    ***/
    console.log(s)
	
    if(document.getElementById('js_error_flag') != null){
        document.getElementById('js_error_flag').value = 1;
		if(document.getElementById('main_logo') != null){
			if('change_logo_on_error' in misc && misc.change_logo_on_error){
				document.getElementById('main_logo').style.color = 'red';
			}
			else if('on_server' in misc && !misc.on_server){
				document.getElementById('main_logo').style.color = 'red';
				
			}
		}
    }   

	if(s.indexOf("handler=") == -1 && 'handler' in misc && [null, ''].indexOf(misc.handler) == -1){
		s += "|handler=" + misc.handler
	}
	
	
	if(error_msg != null){
		var final_error_msg = error_msg;
		if('ID' in misc){ final_error_msg += " (ID=" + misc.ID + ")"; }
		async_run(null, null, "handler-logger-async|action-recordJSVizFail|key-" + s.split("|").join("~") + "|val-" + final_error_msg);
	}
	else{
		
		async_run(null, null, "handler-logger-async|action-recordJSVizFail|key-" + s.split("|").join("~"));
	}
	
}

function display_film_guide(target_fg_tag, film_guide_data, id_tag, last_year_val){
	/***
	This function takes a list of key stretches that represent a team's best and worst offensive and defensive stretches from recent games and displays them as a table.
	***/
	elem = $(target_fg_tag); elem.empty();
	html = "";
	
	html += "<div class='no-padding'>";
	
	html += "<div class='flex bbottom no-padding'>";
	html += " <div class='col-4 no-padding'><span class='font-12 bold'>Opp</span></div>";
	html += " <div class='col-2 no-padding'><span class='font-12 bold contents'>Start</span></div>";
	html += " <div class='col-2 no-padding'><span class='font-12 bold contents'>End</span></div>";
	html += " <div class='col-1-2 no-padding centered'><span class='font-12 bold contents'>Goals</span></div>";
	html += " <div class='col-1-2 no-padding centered'><span class='font-12 bold contents'>Poss</span></div>";
	html += " <div class='col-1 dtop no-padding centered'><span class='font-12 bold contents'>Sh%</span></div>";
	html += " <div class='col-1 dtop no-padding centered'><span class='font-12 bold contents'>TO%</span></div>";
	html += "</div>";
	printed = 0; show_last_year = false;
	for(var a = 0;a<film_guide_data.length;a++){
		
		bkt = film_guide_data[a]; bkt.seq = a;
   
		if(bkt.last_year){ show_last_year = true; }
		html += "<div class='flex table-row no-padding" + (misc.data.ID == bkt.opponentID ? " bold" : "") + "'>";
		html += " <div class='col-4 no-padding inline-flex' style='padding:0;'>";
		html += "<FORM id='future_opp_form" + id_tag + bkt.seq + "' action='/team_detail' style='padding: 0px 5px;' method=POST><input type=hidden name='detail_team_ID' value='" + bkt.opponentID + "'><input type=hidden name='came_from' value='team_my_schedule' /><span class='mouseover-link pointer font-12 contents' onclick=\"document.getElementById('future_opp_form" + id_tag + bkt.seq + "').submit();\">" + bkt.opp_short_code + "</span></FORM>";
		
		html += "<FORM id='future_game_form" + id_tag + bkt.seq + "' action='/team_game_detail' method=POST><input type=hidden name='ID' value='" + bkt.game_ID + "'><input type=hidden name='came_from' value='team_my_schedule' /><span class='mouseover-link pointer font-12 contents' style='padding-left:5px;' onclick=\"document.getElementById('future_game_form" + id_tag + bkt.seq + "').submit();\">(" + bkt.short_date_str + (bkt.last_year ? "*" : "") + ")</span></FORM>";

		html += "</div>";
		
		html += " <div class='col-2 no-padding'><span class='font-12 contents'>" + bkt.start_timestamp + "</span></div>";
		html += " <div class='col-2 no-padding'><span class='font-12 contents'>" + bkt.end_timestamp + "</span></div>";
		html += " <div class='col-1-2 no-padding centered'><span class='font-12 contents'>" + zFormat(bkt.goals, 0) + "</span></div>";
		html += " <div class='col-1-2 no-padding centered'><span class='font-12 contents'>" + zFormat(bkt.possessions, 0) + "</span></div>";
		html += " <div class='col-1 dtop no-padding centered'><span class='font-12 contents'>" + jsformat(bkt.shooting_pct, "0%") + "</span></div>";
		html += " <div class='col-1 dtop no-padding centered'><span class='font-12 contents'>" + jsformat(bkt.turnover_rate, "0%") + "</span></div>";
		html += "</div>";
		printed += 1;
	}
	if(show_last_year){
		html += "<div class='flex no-padding'>";
		html += " <div class='col-12 right'><span class='font-12'>* " + (last_year_val) + " Season</span></div>";
		html += "</div>";
	}
	elem.append(html); 
}

function report_js_log_entry(s, extra_msg=null){
    /***
    This function does the same thing as the lg function does on the server-side. Simple logger so that actions or events that I want to record can be added to the GAE Logging database
    ***/
    //console.log(s)
	 

	if(s.indexOf("handler=") == -1 && 'handler' in misc && [null, ''].indexOf(misc.handler) == -1){
		s += "|handler=" + misc.handler
	}

	if(extra_msg != null){
		var final_extra_msg = extra_msg;
		if('ID' in misc){ final_extra_msg += " (ID=" + misc.ID + ")"; }
		async_run(null, null, "handler-logger-async|action-recJSLogItem|key-" + s.split("|").join("~") + "|val-" + final_extra_msg);
	}
	else{
		
		async_run(null, null, "handler-logger-async|action-recordJSVizFail|key-" + s.split("|").join("~"));
	}

}

function handle_js_fail(id, misc, err){
	/***
	This function is a central clearinghouse for any caught JS errors to be processed and sent to the backend, via an async call, for admin notification
	***/
	
	console.log("Error caught: " + id); 
	if(typeof misc != "undefined" && misc != null){
		if(!misc.on_server){ console.error(err.stack); }
	}
	
	var err_dot_stack = "???";
	
	if(typeof misc == "undefined"){ misc = null; }
	if(typeof id == "undefined"){ id = "???"; }
	if(typeof err != "undefined" && err != null){ err_dot_stack = err.stack; }
	
	if('year' in misc){ err_dot_stack += ("; year=" + misc.year); }
	if('ID' in misc){ 
		err_dot_stack += ("; ID=" + misc.ID); 
	}
	else if('data' in misc && misc.data != null && 'ID' in misc.data){ 
		err_dot_stack += ("; ID=" + misc.data.ID); 
	}
	
	var tmp_template = misc == null || !('target_template' in misc) || misc.target_template == null ? "???": misc.target_template;
	var tmp_nhca = misc == null || !('nhca' in misc) || misc.nhca == null ? "???": misc.nhca;
	
	report_js_visualization_issue(tmp_template + "|" + id + "|" + tmp_nhca, err_dot_stack);
}



function tracking_tag_if_present(){

	var res = ""
	if(typeof misc != "undefined"){
		if('tracking_tag' in misc && misc.tracking_tag != null){
			res = misc.tracking_tag;
		}
	}
	return res
}

function report_user_view(s, version='userView'){
    /***
    When the user does something, it gets stored it the DB so that we can understand general user behavior. This information is not used externally.
    ***/
    
    var elapsed = null;
    if(typeof initial_load_elapsed == "undefined" && typeof time_log != "undefined" && time_log.length > 0 && 'start' in time_log[0]){
        elapsed = new Date().getTime() - time_log[0].start;
        s += "|" + jsformat(elapsed, '2');
        initial_load_elapsed = elapsed;
    }
    else{
        s += "|null";
    }
    
    //console.log(s); 
    //console.log("existing src: " + document.getElementById('pixel').src)
    if(document.getElementById('pixel').src == null || document.getElementById('pixel').src.indexOf("jsVisualizationFail") == -1){
        document.getElementById('pixel').src = "/logger-" + version + "?c=" + s;
    }
}

function finalize_embed_code(ec, inputs){
    /***
    The media embed functionality includes a feature where any graphic throughout the site can be "grabbed" and the embed code used to embed it on a different site. But the full embed code can't be created until the graphic is rendered because on the server (where build embed code happens), you don't always what sort of selections the user will have made (i.e. stat is an option on the front-end in many cases). This function is used when the embed code contains placeholder information and it replaces the placeholders with the information that is not available on the server side so that when the user grabs the embed code, it can actually be read by the MediaEmbedHandler when the remote request comes in.
    ***/
    
    //console.log("inputs");console.log(inputs);
    //console.log("Original pattern: " + ec);
    ec = 'dimension' in inputs ? ec.replace("-+-", dimension_to_embed(inputs.dimension)) : ec.replace("-+-", "YZY");
    ec = 'stat_tag' in inputs ? ec.replace("-!-", stat_to_embed(inputs.stat_tag)) : ec.replace("-!-", "XZX");
    ec = 'chart_type' in inputs ? ec.replace("-.", chart_type_to_embed(inputs.chart_type)) : ec;
    ec = 'selected_unit' in inputs ? ec.replace("|", unit_to_embed(inputs.selected_unit)) : ec.replace("|", "Y");
    ec = 'viz_ID' in inputs ? ec.replace("!-V", viz_to_embed(inputs.viz_ID)) : ec.replace("!-V", "VVV");
    
    //console.log("   Final pattern: " + ec);
    return ec
}

var ZHEX_LIMIT = 21
function to_zhex(i, n){
    /***
    Converts a number (i) into a base-20 hex string of length n
    ***/

    availables = ['V', 'W', 'X', 'Y', 'Z']
    var c = null; 
    var res = ""
    while( i >= ZHEX_LIMIT ){
        c = i % ZHEX_LIMIT;
        
        res = (c < 10 ? c : String.fromCharCode(c - 10 + 65)) +  res;

        i = parseInt(i / ZHEX_LIMIT);
    }
    c = i
    res = (c < 10 ? c : String.fromCharCode(c - 10 + 65)) +  res;
    
    while(res.length < n){
        
        res = availables[(i + res.length) % 5] + res;
    }
    return res;
}


function stat_to_embed(st){   
    /***
    This function converts a statistic definition into a string value that is used by the EmbedCode reader/builder to store the associated statistic choice since the embed code allows only 3 characters for the statistic choice.
    ***/ 
    if('extra_data' in misc && misc.extra_data != null && 'db_statistics' in misc.extra_data){
        tmp = misc.extra_data.db_statistics.filter(r=> r.stat == st);
        if(tmp.length > 0){
            //console.log("to_zhex", tmp[0].ID, to_zhex(tmp[0].ID, 3));
            return to_zhex(tmp[0].ID, 3);
        }
    }
    else if(['efficiency'].indexOf(st) > -1){ return "YR1"; }
    return null;
}

function viz_to_embed(st){   
    /***
    This function converts a viz ID into a string value that is used by the EmbedCode reader/builder to store the associated vizualization choice since the embed code allows only 3 characters for the viz choice.
    ***/ 
    return to_zhex(st, 3);
}

function chart_type_to_embed(ct){
    /***
    This function converts a chart type definition into a string value that is used by the EmbedCode reader/builder to store the associated chart type choice since the embed code allows only 2 characters for the dimension.
    ***/
    if(['horizontal_line'].indexOf(ct) > -1){ return "R0"; }
    else if(['vertical_bars'].indexOf(ct) > -1){ return "R1"; }
    return null;
}

function dimension_to_embed(dimension){
    /***
    This function converts a embed dimension into a string value that is used by the EmbedCode reader/builder to store the associated dimension value since the embed code allows only 3 characters for the dimension.
    ***/
    if(['by_game'].indexOf(dimension) > -1){ return "AVB"; }
    else if(['by_season'].indexOf(dimension) > -1){ return "BCF"; }
    else if(['by_year'].indexOf(dimension) > -1){ return "BCF"; }
    return null;
}

function unit_to_embed(selected_unit){
    /***
    This function takes one of the four main units and returns a unique code that represents that unit in an embed code.
    ***/
    if(['offense'].indexOf(selected_unit) > -1){ return "C"; }
    else if(['defense'].indexOf(selected_unit) > -1){ return "M"; }
    else if(['goalkeepers'].indexOf(selected_unit) > -1){ return "V"; }
    else if(['faceoffs'].indexOf(selected_unit) > -1){ return "R"; }
    return null;
}

function parse_explanation_tags(tags){
    /***
    This function takes a set of tokens that contain the specific content of an explanation and turns them into prose. (As of Aug 2021, this is just used for the Player Outcome Splits.)
    ***/
    // First, checks if it isn't implemented yet.
    if (!String.prototype.format) {
      String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
          return typeof args[number] != 'undefined'
            ? args[number]
            : match
          ;
        });
      };
    }

    /***
    In some cases, we want to show a dynamic explanation based on the specific content that a user-selected for explanation. This function parses the tags[2] content into data that can be used to dynamically create the explanation. 
    ***/
    var html = [];
	tags = tags.split("|")
    console.log("tags");console.log(tags);
    var dt = tags[2].split("---");
    if(tags[1] == "player_outcome_splits"){
         
         console.log("dt");console.log(dt);
         var games_sample = "";
         if(dt[7] == "All Games"){
             games_sample = "  This covers all of the games played {2} by the {0} {1}.".format(dt[2], dt[0], dt[13]);
         }
         else if(dt[7] == "Conf Games"){
             games_sample = "  This covers all of the games played {2} against conference opponents by the {0} {1}.".format(dt[2], dt[0], dt[13]);
         }
         else if(dt[7] == "Non-Conf Games"){
             games_sample = "  This covers all of the games played {2} against non-conference opponents by the {0} {1}.".format(dt[2], dt[0], dt[13]);
         }
         
         html.push("Player-outcome splits are designed to highlight the key factors that are most associated with the success of failure of an offense or defense." + games_sample);
         var subject_desc1 = dt[6]; var subject_desc2 = dt[6];
         if(subject_desc1 == "Player Persona"){ 
             subject_desc1 = " a specific" + (dt[0] == "defense" ? " opposition" : "") + " player role (" + dt[1] + ")";
             subject_desc2 = " the " + dt[1];
         }
         else if(subject_desc1 == "Player Grouping"){ 
             subject_desc1 = " the " + dt[1] + " unit (as specified in the team's roster)";
             subject_desc2 = " the " + dt[1] + " unit (as specified in the team's roster)";
         }
         else if(subject_desc1 == "Ind. Players"){ 
             subject_desc1 = " " + dt[1];
             subject_desc2 = " " + dt[1];
         }

         var player_role_definition = "";
         if(dt[1] == "Field General"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player with the team's highest play share (excluding faceoffs/draws).".format(dt[1])
         }
         else if(dt[1] == "Primary Distributor"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player who has the highest assist total on the team.".format(dt[1])
         }
         else if(dt[1] == "Volume Shooter"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player who has taken the most shots on the team for the season.".format(dt[1])
         }
         else if(dt[1] == "Leading Goal-Scorer"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player with the most goals scored on the team for the season.".format(dt[1])
         }
         else if(dt[1] == "Leading Point-Scorer"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player with the most points scored on the team for the season.".format(dt[1])
         }
         else if(dt[1] == "Most Turnover-Prone"){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player with the team's highest usage-adjusted turnover rate for the season.".format(dt[1])
         }
         else if(dt[1] == ""){
            player_role_definition = "  Note: &quot;{0}&quot; is defined as the individual player with the .".format(dt[1])
         }
         
         var action_desc_high = "has"; var action_desc_low = "has"; var action_summary = null;
         var show_summary = 1;
         if(["Shots"].indexOf(dt[3]) > -1){ 
            action_desc_low = " takes less than " + dt[12] + " " + dt[3].toLowerCase();
            action_desc_high = " takes " + dt[12] + " or more " + dt[3].toLowerCase();
            action_summary = " takes a lot of " + dt[3].toLowerCase();
         }
         else if(["Goals", "Assists", "Turnovers"].indexOf(dt[3]) > -1){ 
            action_desc_low = " has less than " + dt[12] + " " + dt[3].toLowerCase();
            action_desc_high = " has " + dt[12] + " or more " + dt[3].toLowerCase();
            action_summary = " records a lot of " + dt[3].toLowerCase();
         }
         else if(dt[3] == "PlayShares"){
            action_desc_low = " has a play share lower than " + dt[12];
            action_desc_high = " has a play share more than " + dt[12];
            action_summary = " is more involved"
         }
         else if(dt[3] == "Assist:Turnover"){
            action_desc_low = " has an assist-to-turnover ratio that is less than " + dt[12];
            action_desc_high = " has an assist-to-turnover ratio that is greater than " + dt[12];
            action_summary = " is generating offense effectively and avoiding turnovers"
         }
         
         var outcome_summary = "";
         if(dt[0] == "defense"){
            outcome_summary = " it is associated with opposing offenses having more success against the {0} defense.".format(dt[2])
            
            outcome_summary += "  Of course, this does not necessarily mean that forcing this result will ensure success, but it's a clue to what sort of vulnerabilities the {0} defense has.".format(dt[2])
         }
         else{
             
            outcome_summary = " it is associated with their offense having more success."
            
            outcome_summary += "  Of course, this does not necessarily mean that forcing this result will ensure success, but it's a clue to what sort of vulnerabilities the {0} offense has.".format(dt[2])
         }
         
         var high_efficiency_string = (dt[0] == "defense" ? "has allowed opponents to score on {0} of their possessions" : "has scored on {0} of their possessions").format(dt[5])
         var low_efficiency_string = (dt[0] == "defense" ? "allowed an opponent efficiency of {0}" : "had an efficiency of {0}").format(dt[4])
         
         //{0} is dead, but {1} is alive! {0} {2}', 'ASP', 'ASP.NET');
         html.push("This specific split shows that, for the {0} {1}, in games where {2} {3}, {0} has gone {4} and {5}. Conversely, in games where {9} {6}, {0} is {7} and {8}.{10}".format(dt[2], dt[0], subject_desc1, action_desc_high, dt[10], high_efficiency_string, action_desc_low, dt[8], low_efficiency_string, subject_desc2, player_role_definition));
         
         if(show_summary){
             html.push("To summarize, relative to other teams, when {0} {1}, {2}".format(subject_desc2, action_summary, outcome_summary));
         }
         
    }
    
    var final_html = "";
    for(var a = 0;a<html.length;a++){
        final_html += a == 0 ? "" : "<BR><BR>";
        final_html += html[a];
    }
    
    while(final_html.indexOf(" less than 0 ") > -1){ final_html = final_html.replace(" less than 0 ", " 0 "); }
    while(final_html.indexOf(" less than 1 ") > -1){ final_html = final_html.replace(" less than 1 ", " 0 "); }
    while(final_html.indexOf(" 1 goals") > -1){ final_html = final_html.replace(" 1 goals", " 1 goal"); }
    while(final_html.indexOf(" 1 shots") > -1){ final_html = final_html.replace(" 1 shots", " 1 shot"); }
    while(final_html.indexOf(" 1 turnovers") > -1){ final_html = final_html.replace(" 1 turnovers", " 1 turnover"); }
    while(final_html.indexOf(" 1 points") > -1){ final_html = final_html.replace(" 1 points", " 1 point"); }
    while(final_html.indexOf(" 1 assists") > -1){ final_html = final_html.replace(" 1 assists", " 1 assist"); }
    
	
	$("#overlay_panel").empty(); $("#overlay_panel").addClass("shown");
	
	
	var feedback_yes = null; var moreClear_yes = null; var feedback_no = null; var logger_str = null;
    
    var target_template = misc.target_template; 
    var nhca = misc.nhca

    /***
    There are 2 types of feedback prompts which phrase the request for feedback in separate ways. This sets the type of feedback prompt to display.
    ***/
    var feedback_type = null;
    if(misc.AB % 2 == 1){
        feedback_type = "helpful";
    }
    else{
        feedback_type = "moreClear"
    }
    
    /***
    If the user decides to provide feedback, these flags will be flipped, but at first, we want to show the prompt and hide the thank-you.
    ***/
    $("." + feedback_type + "-request").removeClass("hidden");
    $("." + feedback_type + "-request-thanks").addClass("hidden");
        
    /***
    The tags argument is set within the onclick function definition. It is used to go through the list of explanations and find the right one for this particular help-icon. If it's not found, an error/apology message is generated.
    ***/

    var exp = null; var exp_html = null; var html = null; var is_missing = 1;
    

    
    /***
    The following generates the display as well as the triggers for collecting feedback and closing the explanation overlay panel.
    ***/

    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>Keys-to-the-Game</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12 exp-scroll'><span class='font-15 contents'>" + final_html + "</span></div>";
    
    
    
    html = '';
        html += '<div class="flex" style="max-height:450px; margin:5px;">';
            html += '<div class="col-1"></div>';
            html += '<div class="col-10 popup-content">';
            html += exp_html;
           
            if(feedback_yes != null){
                if(feedback_type == "helpful"){
                    html += "<div class='helpful-request col-12 right' style='padding-top:15px;'><span class='font-12'>Was this helpful?</span><span onclick='explanation_feedback(\"" + feedback_yes + "\")' class='mouseover-link font-12'>Yes</span><span onclick='explanation_feedback(\"" + feedback_no + "\")' class='mouseover-link font-12 '>No</span></div>    ";
                    html += "<div class='helpful-request-thanks hidden col-12 right' style='padding-top:15px;'><span class='font-12 contents' style='color:blue;'>Thank you. Feedback is greatly appreciated.</span></div>    ";
                }
                
                if(feedback_type == "moreClear"){
                    html += "<div class='helpful-request col-12 right' style='padding-top:15px;'><span class='font-12'>Could this have been more clear?</span><span onclick='explanation_feedback(\"" + moreClear_yes + "\")' class='mouseover-link font-12'>Yes</span><span onclick='explanation_feedback(\"" + moreClear_no + "\")' class='mouseover-link font-12 '>No</span></div>    ";
                    html += "<div class='helpful-request-thanks hidden col-12 right' style='padding-top:15px;'><span class='font-12 contents' style='color:blue;'>Thank you. Feedback is greatly appreciated.</span></div>    ";
                }
            }
            
            html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>';
            html += '</div>';
            html += '<div class="col-1"></div>';
        html += '</div>';
   

	
    $("#overlay_panel").empty(); $("#overlay_panel").append(html);
}

function async_request_explanation(tags){
    /***
    When the user clicks on a question-mark icon, this function picks requests the associated explanation via an async call. It will be displayed by async_show_an_explanation.
    ***/
    console.log("async_request_explanation async tags"); console.log(tags);
    $("#overlay_panel").empty(); $("#overlay_panel").addClass("shown");
	
	var tmp_tags_list_for_lookup = tags.split("|");
	if(tmp_tags_list_for_lookup.length > 1){
		if(tmp_tags_list_for_lookup[1] == "offense_ride_rate"){ tmp_tags_list_for_lookup[1] = "ride_rate"; }
		if(tmp_tags_list_for_lookup[1] == "offense_clear_rate"){ tmp_tags_list_for_lookup[1] = "clear_rate"; }
		if(tmp_tags_list_for_lookup[1] == "off_faceoff_conversion_rate"){ tmp_tags_list_for_lookup[1] = "faceoff_conversion_rate"; }
		if(tmp_tags_list_for_lookup[1] == "def_faceoff_conversion_rate"){ tmp_tags_list_for_lookup[1] = "faceoff_conversion_rate"; }
	}
    
    async_run(null, null, "handler-explanations|action-async_load_explanation|key-" + tmp_tags_list_for_lookup.join("~"));
}

function async_show_an_explanation(explanation, tags){
    /***
    When the user clicks on a question-mark icon, this function picks requests the associated explanation via an async call and then displays it on an overlay card. The explanation includes a title and a body. We also disply a feedback prompt so that the user can tell us whether the content was helpful or not.
    ***/
    

    console.log("async_show_an_explanation.explanation"); console.log(explanation);
    console.log("async_show_an_explanation.tags"); console.log(tags);
    
    var feedback_yes = null; var moreClear_yes = null; var feedback_no = null; var logger_str = null;
    
    var target_template = misc.target_template; 
    var nhca = misc.nhca

    /***
    There are 2 types of feedback prompts which phrase the request for feedback in separate ways. This sets the type of feedback prompt to display.
    ***/
    var feedback_type = null;
    if(misc.AB % 2 == 1){
        feedback_type = "helpful";
    }
    else{
        feedback_type = "moreClear"
    }
    
    /***
    If the user decides to provide feedback, these flags will be flipped, but at first, we want to show the prompt and hide the thank-you.
    ***/
    $("." + feedback_type + "-request").removeClass("hidden");
    $("." + feedback_type + "-request-thanks").addClass("hidden");
        
    /***
    The tags argument is set within the onclick function definition. It is used to go through the list of explanations and find the right one for this particular help-icon. If it's not found, an error/apology message is generated.
    ***/

    var exp = null; var exp_html = null; var html = null; var is_missing = 1;
	var report_user_explanation_request = 1; // If the user makes a request, we need to log it, assuming the tags were provided
    if(explanation == null){
        exp = 'Oops...|There should be something here, but there isn\'t. Apologies.'
        if(typeof user_obj != "undefined" && user_obj.is_admin){ exp += " (tags = " + JSON.stringify(tags) + ")"; }
        if(tags == null){
            report_js_visualization_issue(target_template + "|missingExplanation-TAGUNKNOWN|" + nhca);
			report_user_explanation_request = 0;
        }
        else{
            report_js_visualization_issue(target_template + "|missingExplanation-" + tags.replace("~", "_") + "|" + nhca, "Unknown tag requested for explanations: " + tags.replace("~", "_"));
        }
    }
    else{
        
        is_missing = [null, '[None Entered]'].indexOf(explanation.header_text) > -1 ? 1 : 0;
        
        exp = ([null, '[None Entered]'].indexOf(explanation.header_text) > -1 ? "" : explanation.header_text) + "|" + explanation.explanation_html_BR;
        
        logger_str = [explanation.html_page, explanation.tag, nhca].join("|");
        feedback_no = logger_str + "|helpful-0";
        feedback_yes = logger_str + "|helpful-1";                
        moreClear_no = logger_str + "|moreClear-0";
        moreClear_yes = logger_str + "|moreClear-1";                
        //document.getElementById('pixel').src = "/logger-explanationOpen?c=" + logger_str; // We are using the async approach rather than the pixel; see the end of this function

    }    
    
    /***
    The following generates the display as well as the triggers for collecting feedback and closing the explanation overlay panel.
    ***/
    //console.log("klw.exp"); console.log(exp);
	var escaped_final_html = "" + exp.split("|")[1];
	while (escaped_final_html.indexOf("&#39;") > -1){
		console.log("Remove apos")
		escaped_final_html = escaped_final_html.replace("&#39;", "'");
	}
	//console.log(escaped_final_html);
    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>Keys-to-the-Game</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12 exp-scroll'><span class='font-15 contents'>" + escaped_final_html + "</span></div>";
    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>" + exp.split("|")[0] + "</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12 exp-scroll'><span class='font-15 contents'>" + escaped_final_html + "</span></div>";
    
    
    
    html = '';
        html += '<div class="flex" style="max-height:450px; margin:5px;">';
            html += '<div class="col-1"></div>';
            html += '<div class="col-10 popup-content">';
            html += exp_html;
           
            if(feedback_yes != null){
                if(feedback_type == "helpful"){
                    html += "<div class='helpful-request col-12 right' style='padding-top:15px;'><span class='font-12'>Was this helpful?</span><span onclick='explanation_feedback(\"" + feedback_yes + "\")' class='mouseover-link font-12'>Yes</span><span onclick='explanation_feedback(\"" + feedback_no + "\")' class='mouseover-link font-12 '>No</span></div>    ";
                    html += "<div class='helpful-request-thanks hidden col-12 right' style='padding-top:15px;'><span class='font-12 contents' style='color:blue;'>Thank you. Feedback is greatly appreciated.</span></div>    ";
                }
                
                if(feedback_type == "moreClear"){
                    html += "<div class='helpful-request col-12 right' style='padding-top:15px;'><span class='font-12'>Could this have been more clear?</span><span onclick='explanation_feedback(\"" + moreClear_yes + "\")' class='mouseover-link font-12'>Yes</span><span onclick='explanation_feedback(\"" + moreClear_no + "\")' class='mouseover-link font-12 '>No</span></div>    ";
                    html += "<div class='helpful-request-thanks hidden col-12 right' style='padding-top:15px;'><span class='font-12 contents' style='color:blue;'>Thank you. Feedback is greatly appreciated.</span></div>    ";
                }
            }
            
            html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>';
            html += '</div>';
            html += '<div class="col-1"></div>';
        html += '</div>';
    
    // If an explanation is missing or is otherwise empty, show an admin button so that I can easily edit it.
    var show_admin_button = 0;
    if('nhca' in misc && misc.nhca == 1 && typeof tags != "undefined" && tags != null && tags.indexOf("~") > -1){
        if(is_missing){
           show_admin_button = 1;            
        }
        else if(exp.split("|")[1].trim() == ""){
            show_admin_button = 1;            
        }
    }
    
    if(show_admin_button){
        html += '<div class="col-12 centered" style="padding-top:25px;">';
            html += "<FORM id='add_exp_form' action='/explanations' method=POST>";
                html += "<input type=hidden name='confirmed' value='0'>";
                html += "<input type=hidden name='html_page' value='" + tags.split("~")[0] + "'>";
                html += "<input type=hidden name='tag' value='" + tags.split("~")[1] + "'>";
                
                html += "<button type=submit class='action-button blue medium' name='action' value='new_explanation'>EDIT EXPLANATION</button>";
            html += "</FORM>";
        html += "</div>";
    }
    $("#overlay_panel").empty(); $("#overlay_panel").append(html);
	
	if(report_user_explanation_request){ // Add a log entry to GAE Logging so that we can report on question-mark clicks
		report_js_log_entry(misc.target_template + "|explanationRequest|" + misc.nhca, "tag=" + tags.replace("~", "_"));
	}
}
    
function toggle_legend_visibility(id=null){
    /***
    This function is trigged by a user clicking the hide/unhide legend button; it changes the show_legend variable and re-runs the draw function for that section of the dashboard.
    ***/
    //console.log("id==null: " + (id==null));
    if(id==null){ id = 'legend_div'; }
    var new_val = null;
    var plus_minus_toggle = document.getElementById(id + '_toggle_icon') != null;
    console.log("plus_minus_toggle: " + plus_minus_toggle);
    if(show_legend){
        $("#" + id).addClass("hidden");
        new_val = 0;
    }
    else{
        $("#" + id).removeClass("hidden");
        new_val = 1;
        
    }
    //console.log("Show/Hide " + id);
    show_legend = !show_legend ? 1 : 0;
    redraw();
    async_run(null, 0, "handler-preferences|action-edit_show_legend_setting|key-" + misc.target_template + "|val-" + new_val);
}

function toggle_instructions(){
    /***
    Very basic function that either hides or unhides all instructions-div class objects. The show instructions variable determines which to do.
    ***/
    if(show_instructions){
		show_instructions = 0;
		$(".instructions-div").addClass("hidden");
		$("#show_hide_instructions_label").html("Show Instructions");
		$(".show_hide_instructions_label").html("Show Instructions");
	}
	else{
		show_instructions = 1;
		$(".instructions-div").removeClass("hidden");
		$("#show_hide_instructions_label").html("Hide Instructions");
		$(".show_hide_instructions_label").html("Hide Instructions");
	}
}

function copy_to_clipboard(cmd, tID, seq){
	brief_hide_in_seconds("copy_to_clipboard_button" + tID + "_" + seq, 1);

	const el = document.createElement('textarea');
	console.log("COPY " + cmd);
	el.value = cmd;
	while(el.value.indexOf("[quot]") > -1){ el.value = el.value.replace("[quot]", "\""); }


	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
	el.setAttribute('readonly', '');
	el.select();
	document.execCommand('copy');

}


	
function copy_text_from_element(elem_id){
	/***
	This function copies the text from a specified elem_id to the user's clipboard.
	***/
	
	orig_val = document.getElementById(elem_id).innerHTML;
	while(orig_val.indexOf("<BR>") > -1){ orig_val = orig_val.replace("<BR>", "\n"); }
	while(orig_val.indexOf("<br>") > -1){ orig_val = orig_val.replace("<br>", "\n"); }
	//console.log("Copied the contents from " + elem_id);
	//console.log(orig_val);
	if(orig_val.indexOf("http") > -1){
		// It's a URL; remove url stuff
		while(orig_val.indexOf("&amp;") > -1){
			orig_val = orig_val.replace("&amp;", "&");
		}
	}
	const el = document.createElement('textarea');
	  el.value = orig_val;
	  document.body.appendChild(el);
	  el.select();
	  document.execCommand('copy');
	  document.body.removeChild(el);
	el.setAttribute('readonly', '');
	el.select();
	document.execCommand('copy');
	
	$("#transition_message_" + elem_id).addClass("shown");
	$("#transition_message_" + elem_id).removeClass("hidden");
	
}
    
    
    
function toggle_instructions_visibility(id=null){
    /***
    This function is trigged by a user clicking the hide/unhide instructions button; it changes the show_instructions variable and re-runs the draw function for that section of the dashboard.
    ***/
    //console.log("id==null: " + (id==null));
    if(id==null){ id = 'instructions_div'; }
    var new_val = null;
    var plus_minus_toggle = document.getElementById(id + '_toggle_icon') != null;
    console.log("plus_minus_toggle: " + plus_minus_toggle);
    if(show_instructions){
        $("#" + id).addClass("hidden");
        new_val = 0;
        if(plus_minus_toggle){
            $("#" + id + '_toggle_icon').removeClass("minus");    
        }
    }
    else{
        $("#" + id).removeClass("hidden");
        new_val = 1;
        if(plus_minus_toggle){
            $("#" + id + '_toggle_icon').addClass("minus");    
        }
    }
    //console.log("Show/Hide " + id);
    show_instructions = !show_instructions ? 1 : 0;
    redraw();
    async_run(null, 0, "handler-preferences|action-edit_show_instructions_setting|key-" + misc.target_template + "|val-" + new_val);
}

function toggle_active_edit_panels(id){
    $(".toggle-panel").addClass("hidden");
    $(".long-toggle-label").removeClass("active");
    $("#edit_peers_panel_" + id + "_label").addClass("active");
    $("#edit_peers_panel_" + id + "_panel").removeClass("hidden");
    peer_selection = id;
}

function toggle_active_full_panels(id){
    console.log(id)
    $(".toggle-panel").addClass("hidden");
    $(".long-toggle-label").removeClass("active");
    $("#" + id + "_label").addClass("active");
    $("#" + id + "_panel").removeClass("hidden");
    
    if(misc.target_template == "admin_user_templates.html"){
        current_panel = id;
    }
}

function remove_peer(team_ID){
    /***
    Using the edit panel, users have the ability to remove a specific team from the list of peers (true peers or target peers). This function performs the necessary logic and submits an async POST to make the update in the database.
    ***/
    
    var current_n = misc.data.peers_comparison[peer_selection + "_teams"].length;
    console.log(peer_selection + " teams = " + current_n);
    $(".error").addClass("hidden");
    if(current_n <= 4 && peer_selection != "custom"){
        // Users must keep at least 4 teams in each peer bucket; if there are fewer, do not allow them to remove any
        $("#" + peer_selection + "_too_few_error_div").removeClass("hidden");
    }
    else{
        console.log("remove peer - team ID: " + team_ID);
        misc.data.peers_comparison[peer_selection + "_teams"] = misc.data.peers_comparison[peer_selection + "_teams"].filter(r=> r.team_ID != team_ID);
        
        var tmp_action = null;
        if(misc.target_template == "team_detail.html"){
            display_edit_team_comparison_panel();
            tmp_action = "edit_team_benchmark_data_via_panel";
        }
        else{
            display_edit_peers_panel();
            tmp_action = "edit_peers_data_via_panel";
        }
        
        
        // val=0 means we are removing the team from the list
        async_run(null, misc.data.ID, "handler-team_home|team_ID-" + team_ID + "|action-" + tmp_action + "|val-0|field-" + peer_selection);
        
    }
}

function remove_peer_player(player_ID){
    /***
    Using the edit panel, users have the ability to remove a specific player from the list of peers (true peers or target peers). This function performs the necessary logic and submits an async POST to make the update in the database.
    ***/
    
    var current_n = misc.player_data.peers_comparison[peer_selection + "_players"].length;
    console.log(peer_selection + " players = " + current_n);
    $(".error").addClass("hidden");
    if(current_n <= 4 && peer_selection != "custom"){
        // Users must keep at least 4 teams in each peer bucket; if there are fewer, do not allow them to remove any
        $("#" + peer_selection + "_too_few_error_div").removeClass("hidden");
    }
    else{
        console.log("remove peer - player ID: " + player_ID);
        misc.player_data.peers_comparison[peer_selection + "_players"] = misc.player_data.peers_comparison[peer_selection + "_players"].filter(r=> r.player_ID != player_ID);
        
        var tmp_action = null;
		var field_val = peer_selection;
        if(misc.target_template == "team_player_detail.html"){
            display_edit_player_comparison_panel();
            tmp_action = "edit_player_benchmark_data_via_panel";
			if('current_season' in misc.player_data && misc.player_data.current_season != null && 'role' in misc.player_data.current_season){
				field_val += "~~" + misc.player_data.current_season.role;
			}
        }
        
        
        // val=0 means we are removing the team from the list
        async_run(null, misc.player_data.ID, "handler-team_player_detail|player_ID-" + player_ID + "|key-" + misc.player_data.league + "|action-" + tmp_action + "|val-0|field-" + field_val);
        
    }
}

function choose_peer_team(team_ID, grouping_type=null){
    /***
    This function allows the admin to choose the team from the list of teams that were pulled up by the snippet entered into the input field
    ***/
    
    console.log("Put team " + team_ID + " into group: " + peer_selection);
    var tmp_team =  misc.db_teams.filter(r=> r.ID == team_ID)[0];
    var peer_team_obj = null;
    var search_div = d3.select("#entry_object" + peer_selection);
    search_div.attr("height", 16);
    if(grouping_type == null){
        document.getElementById("peer_selection_team_list" + peer_selection).style.display = "none";
    }
    else{
        document.getElementById("peer_selection_team_list" + grouping_type).style.display = "none";
    }
    //document.getElementById("peer_selection_team_input" + peer_selection).value = tmp_team.display_name;
    if(misc.data.peers_comparison != null && misc.data.peers_comparison[peer_selection + "_teams"].filter(r=> r.team_ID == tmp_team.ID).length > 0){
        peer_team_obj = misc.data.peers_comparison[peer_selection + "_teams"].filter(r=> r.team_ID == tmp_team.ID)[0];
    }
    
    console.log("peer_team_obj"); console.log(peer_team_obj);
    console.log("tmp_team"); console.log(tmp_team);
    
    if(peer_team_obj != null){
        // The chosen team is already in the peer list
    }
    else{
        // The chosen team should be added to the peer list
        var d = {'grouping_type': grouping_type == null ? peer_selection : grouping_type, 'display_name': tmp_team.display_name, 'team_ID': tmp_team.ID, 'gif_path': tmp_team.gif_path};
		if(misc.data.peers_comparison != null){
			misc.data.peers_comparison[peer_selection + "_teams"].unshift(d);
        }
		
        var tmp_action = null;
        if(misc.target_template == "team_detail.html"){
            display_edit_team_comparison_panel();
            tmp_action = "edit_team_benchmark_data_via_panel";
        }
        else{
            display_edit_peers_panel();
            tmp_action = "edit_peers_data_via_panel";
        }
        
        // val=1 means we are adding the team to the list
        async_run(null, misc.data.ID, "handler-team_home|team_ID-" + tmp_team.ID + "|action-" + tmp_action + "|val-1|field-" + (grouping_type == null ? peer_selection : grouping_type));
    }
    
    
    
}

function choose_peer_player(player_ID, grouping_type=null){
    /***
    This function allows the admin to choose the player from the list of players that were pulled up by the snippet entered into the input field
    ***/
    
    console.log("Put player " + player_ID + " into group: " + peer_selection);
    var tmp_player =  misc.extra_data.players.filter(r=> r.player_ID == player_ID)[0];
    var peer_player_obj = null;
    var search_div = d3.select("#entry_object" + peer_selection);
    search_div.attr("height", 16);
    if(grouping_type == null){
        document.getElementById("peer_selection_player_list" + peer_selection).style.display = "none";
    }
    else{
        document.getElementById("peer_selection_player_list" + grouping_type).style.display = "none";
    }
    
    console.log("tmp_player"); console.log(tmp_player);
    if(misc.player_data.peers_comparison[peer_selection + "_players"].filter(r=> r.player_ID == tmp_player.player_ID).length > 0){
        peer_player_obj = misc.player_data.peers_comparison[peer_selection + "_players"].filter(r=> r.player_ID == tmp_player.player_ID)[0];
    }
    
    console.log("peer_player_obj"); console.log(peer_player_obj);
    
    
    if(peer_player_obj != null){
        // The chosen team is already in the peer list
    }
    else{
        // The chosen team should be added to the peer list
        var d = {'grouping_type': grouping_type == null ? peer_selection : grouping_type, 'player': tmp_player.player, 'player_ID': tmp_player.ID, 'gif_path': tmp_player.gif_path};
        misc.player_data.peers_comparison[peer_selection + "_players"].unshift(d);
        
        var tmp_action = null;
		var field_val = (grouping_type == null ? peer_selection : grouping_type)
        if(misc.target_template == "team_player_detail.html"){
            display_edit_player_comparison_panel();
            tmp_action = "edit_player_benchmark_data_via_panel";
			if('current_season' in misc.player_data && misc.player_data.current_season != null && 'role' in misc.player_data.current_season){
				field_val += "~~" + misc.player_data.current_season.role;
			}
        }
        
        // val=1 means we are adding the team to the list
        async_run(null, misc.player_data.ID, "handler-team_player_detail|player_ID-" + tmp_player.player_ID + "|key-" + misc.player_data.league + "|action-" + tmp_action + "|val-1|field-" + field_val);
    }   
}

document.addEventListener('keyup', selectTeamViaEnter);
document.addEventListener('keyup', selectPlayerViaEnter);
var single_selected_team = null;
function selectTeamViaEnter(e) {
    /***
    A user has the ability to select a team from the list of matching options by clicking Enter if there is just a single option. This function checks that a single option is shown and if the key pressed was Enter, it runs the update slot code.
    ***/
    if(single_selected_team != null){
        //console.log(`${e.code}`, `${e.code}`=="Enter");
        if(`${e.code}` == "Enter"){
          choose_peer_team(single_selected_team);
          single_selected_team = null;
        }
    }
}

var single_selected_player = null;
function selectPlayerViaEnter(e) {
    /***
    A user has the ability to select a player from the list of matching options by clicking Enter if there is just a single option. This function checks that a single option is shown and if the key pressed was Enter, it runs the update slot code.
    ***/
    if(single_selected_player != null){
        //console.log(`${e.code}`, `${e.code}`=="Enter");
        if(`${e.code}` == "Enter"){
          choose_peer_player(single_selected_player);
          single_selected_player = null;
        }
    }
}

function search_peer_selection_teams(s, grouping_type=null){
    /***
    Instead of picking from a list of teams, this function will check what the admin user is typing and filter the list to the teams that match, intent is faster selection.
    ***/
    
    var search_div = d3.select("#entry_object" + peer_selection);
    search_div.attr("height", 150);
    
    var team_list = null;
    if(grouping_type == null){
        team_list = $("#peer_selection_team_list" + peer_selection);
    }
    else{
        team_list = $("#peer_selection_team_list" + grouping_type);
    }
    //console.log(s);
    s = s.toLowerCase()
    selected_teams = misc.db_teams.filter(r=> r.display_name_lower.indexOf(s) > -1 || r.display_name_lower_no_spaces.indexOf(s) > -1);
    n = selected_teams.length;
    console.log(n + " team(s) match the search term: " + s);
    
    team_list.empty();
    
    // Set this variable when there is a single team because if the key press was enter, it will trigger the above function, which can then grab the single team and make the edit;
    if(n == 1){
        single_selected_team = selected_teams[0].ID;
    }
    else{
        single_selected_team = null;
    }
    
    for(var a = 0;a<n;a++){ p = selected_teams[a];
        if(grouping_type == null){
            p_html = "<span onclick='choose_peer_team(" + p.ID + ");' class='pointer font-12 contents'>" + p.display_name + "</span>";
        }
        else{
            p_html = "<span onclick='choose_peer_team(" + p.ID + ", \"" + grouping_type + "\");' class='pointer font-12 contents'>" + p.display_name + "</span>";
        }
        html = "";
        html += "<div class='col-12 table-row no-padding'>" + p_html + "</div>";
        
        
        team_list.append(html);
    }
    

    var cur = null;
    if(grouping_type == null){
        cur = document.getElementById("peer_selection_team_list" + peer_selection).style.display;
        w = $("#search_div" + peer_selection).width();
        $("#peer_selection_team_list" + peer_selection).width(w);
        document.getElementById("peer_selection_team_list" + peer_selection).style.display = "block";
    }
    else{
        console.log("Retreive id peer_selection_team_list" + grouping_type);
        cur = document.getElementById("peer_selection_team_list" + grouping_type).style.display;
        w = $("#search_div" + grouping_type).width();
        $("#peer_selection_team_list" + grouping_type).width(w);
        document.getElementById("peer_selection_team_list" + grouping_type).style.display = "block";
    }
    
}

function search_peer_selection_players(s, grouping_type=null){
    /***
    Instead of picking from a list of players, this function will check what the admin user is typing and filter the list to the players that match, intent is faster selection.
    ***/
    
    var search_div = d3.select("#entry_object" + peer_selection);
    search_div.attr("height", 150);
    
    var player_list = null;
    if(grouping_type == null){
        player_list = $("#peer_selection_player_list" + peer_selection);
    }
    else{
        player_list = $("#peer_selection_player_list" + grouping_type);
    }
    //console.log(s);
    s = s.toLowerCase()
    selected_players = misc.extra_data.players.filter(r=> r.player_lower.indexOf(s) > -1 || r.player_lower_no_spaces.indexOf(s) > -1);
    n = selected_players.length;
    console.log(n + " player(s) match the search term: " + s);
    
    player_list.empty();
    
    // Set this variable when there is a single player because if the key press was enter, it will trigger the above function, which can then grab the single player and make the edit;
    if(n == 1){
        single_selected_player = selected_players[0].player_ID;
    }
    else{
        single_selected_player = null;
    }
    
    for(var a = 0;a<n;a++){ p = selected_players[a];
        if(grouping_type == null){
            p_html = "<span onclick='choose_peer_player(" + p.player_ID + ");' class='pointer font-12 contents'>" + p.player + "</span>";
        }
        else{
            p_html = "<span onclick='choose_peer_player(" + p.player_ID + ", \"" + grouping_type + "\");' class='pointer font-12 contents'>" + p.player + "</span>";
        }
        html = "";
        html += "<div class='col-12 table-row no-padding'>" + p_html + "</div>";
        
        
        player_list.append(html);
    }
    

    var cur = null;
    if(grouping_type == null){
        cur = document.getElementById("peer_selection_player_list" + peer_selection).style.display;
        w = $("#search_div" + peer_selection).width();
        $("#peer_selection_player_list" + peer_selection).width(w);
        document.getElementById("peer_selection_player_list" + peer_selection).style.display = "block";
    }
    else{
        console.log("Retreive id peer_selection_player_list" + grouping_type);
        cur = document.getElementById("peer_selection_player_list" + grouping_type).style.display;
        w = $("#search_div" + grouping_type).width();
        $("#peer_selection_player_list" + grouping_type).width(w);
        document.getElementById("peer_selection_player_list" + grouping_type).style.display = "block";
    }
    
}

function choose_search_list_option(seq){
    /***
    This function allows the admin to choose the team from the list of teams that were pulled up by the snippet entered into the input field
    ***/
    
    //console.log("From the generic options list, select seq=" + seq);
    var selected_object =  misc.generic_search_options.filter(r=> r.seq == seq)[0];

    var search_div = d3.select("#generic_search_div");
    search_div.attr("height", 16);
    document.getElementById("search_option_list").style.display = "none";
    document.getElementById("generic_auto_search_input").value = 'display' in selected_object ? selectd_object.display : selected_object.desc;

    //console.log("selected_object"); console.log(selected_object);
    
    // This function must be defined on the template from which the search was triggered
    process_auto_search_choice(selected_object);
}

var single_selected_option = null;
function selectGenericOptionViaEnter(e) {
    /***
    A user has the ability to select a team from the list of matching options by clicking Enter if there is just a single option. This function checks that a single option is shown and if the key pressed was Enter, it runs the update slot code.
    ***/
    if(single_selected_option != null){
        //console.log(`${e.code}`, `${e.code}`=="Enter");
        if(`${e.code}` == "Enter"){
          choose_search_list_option(single_selected_option);
          single_selected_option = null;
        }
    }
}


function generic_auto_search_selection(s){
    /***
    Instead of picking from a list of teams, this function will check what the admin user is typing and filter the list to the teams that match, intent is faster selection.
    ***/
    
    var search_div = d3.select("#generic_search_div");
    search_div.attr("height", 150);
    
    var option_list = $("#search_option_list");
    //console.log(s);
    s = s.toLowerCase()
    //console.log("generic_search_options"); console.log(misc.generic_search_options);
    potential_options = misc.generic_search_options.filter(r=> r.desc.toLowerCase().indexOf(s) > -1);
    n = potential_options.length;
    //console.log(n + " options(s) match the search term: " + s);
    
    option_list.empty();
    
    // Set this variable when there is a single option because if the key press was enter, it will trigger the above function, which can then grab the single option and do what needs to be done.
    if(n == 1){
        single_selected_option = potential_options[0].seq;
    }
    else{
        single_selected_option = null;
    }
    
    for(var a = 0;a<n;a++){ p = potential_options[a];
        p_html = "<span onclick='choose_search_list_option(" + p.seq + ");' class='pointer font-12 contents'>" + ('display' in p ? p.display : p.desc) + "</span>";
        
        html = "";
        html += "<div class='col-12 table-row no-padding'>" + p_html + "</div>";
        
        
        option_list.append(html);
    }
    

    var cur = document.getElementById("search_option_list").style.display;
    w = $("#generic_search_div").width();
    $("#search_option_list").width(w);
    document.getElementById("search_option_list").style.display = "block";
}

function toggle_select_upload_buttons(){
    /***
    Switch which upload/select buttons are shown.
    ***/
    
    $("#upload_file_select_button_div").addClass("hidden");
    $("#upload_file_upload_button_div").removeClass("hidden");
    
    if(misc.target_template == "team_practice_home.html"){
        misc.upload_error = null;
    }
}

function display_edit_peers_panel(){
    /***
    When the user clicks on an edit peers label, this panel pops up. It allows a team user to change which teams are to be show in the peers vs target groupings. This is primarily used on the Team Home page, but it's possible that other analyses have been updated to incorporate these groupings.
    ***/
    
    $("#overlay_panel").addClass("tall"); 
    
    var target_template = misc.target_template; 
    var nhca = misc.nhca

    var exp = null; var exp_html = null; var html = null;
     
    
    /***
    The following generates the display as well as the triggers for collecting feedback and closing the explanation overlay panel.
    ***/
    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>Edit Peer Groupings</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12'><span class='font-15 lh-24 contents'>These reports and analyses compare your team's performance against a bucket of teams that are either a set of peers (similarly-ranked teams) or a set of targets (higher-ranked teams). You can use this tool to modify how your peer vs target groups are defined.<span class='no-padding error bold'>Note: edits made here will be seen by everyone with access to this team account.</span></span></div>";
    
    tool_html = "<div class='col-12'>";
        tool_html += "<div class='flex'>";
            tool_html += "<div class='col-4 centered long-toggle-label" + (peer_selection == "peer" ? " active" : "") + "' onclick='toggle_active_edit_panels(\"peer\");' id='edit_peers_panel_peer_label'>";
                tool_html += "<span class='font-18'>Peer Group</span>";
            tool_html += "</div>";
            tool_html += "<div class='col-4 centered long-toggle-label" + (peer_selection == "target" ? " active" : "") + "' onclick='toggle_active_edit_panels(\"target\");'  id='edit_peers_panel_target_label'>";
                tool_html += "<span class='font-18'>Target Group</span>";
            tool_html += "</div>";
            tool_html += "<div class='col-4 centered long-toggle-label" + (peer_selection == "custom" ? " active" : "") + "' onclick='toggle_active_edit_panels(\"custom\");'  id='edit_peers_panel_custom_label'>";
                tool_html += "<span class='font-18'>Custom Group</span>";
            tool_html += "</div>";
        tool_html += "</div>";
        tool_html += "<div class='no-padding exp-scroll tall-50' style=''>";
            var tmp_keys = {'peer': 1, 'target': 1, 'custom': 1};
            for(k in tmp_keys){
                tool_html += "<div class='toggle-panel" + (peer_selection != k ? " hidden" : "") + "' id='edit_peers_panel_" + k + "_panel'>";
                // Print team logos, name, and tool to remove them from the peer list
                
                
                    if(k == "custom"){
                        var panels = [{'tag': 'custom-1', 'id': 'custom1', 'desc': "Group A Teams"}
                                    , {'tag': 'custom-2', 'id': 'custom2', 'desc': "Group B Teams"}];
                        tool_html += "<div class='flex no-padding'>";
                        for(var b = 0;b<panels.length;b++){ var panel = panels[b];
                            tool_html += "<div class='col-6 no-padding'>";
                                local_peer_teams = misc.data.peers_comparison == null ? [] : misc.data.peers_comparison[k + "_teams"].filter(r => r.grouping_type == panel.tag);
                                //console.log("local_peer_teams: " + panel.tag); console.log(local_peer_teams);
                                // Ability to choose a team to add to the list of peers
                                tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-20 bold'>" + panel.desc + "</span></div>";
                                tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-15'>Add A Team</span></div>";
                                tool_html += "<div class='no-padding'>";
                                    tool_html += "<div id='search_div" + panel.tag + "' class='no-padding credentials-box short'>";
                                    
                                    tool_html += "<div class='col-12 no-padding'><input id='peer_selection_team_input" + panel.tag + "' onkeyup='search_peer_selection_teams(this.value, \"" + panel.tag + "\");'  placeholder='Enter Team Name' type=text class='text-input medium' id='peer_selection_team" + panel.tag + "' style='height:21px; font-size:10px; padding:0;margin:0;'></div>";
                                    tool_html += "<div class='dropdown-content' id='peer_selection_team_list" + panel.tag + "'></div>";
                                    tool_html += "</div>";
                                tool_html += "</div>";

                                tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Current List</span></div>";
                                
                                // Error messages in case someone tries to do something that they shouldn't
                                tool_html += "<div class='no-padding hidden error' id='" + panel.tag + "_too_few_error_div'>";
                                    tool_html += "<span class='contents font-15 lh-24'>It is recommended that peer buckets have sufficient teams in them to provide a large-enough sample. Please add more teams before making a deletion.</span>"
                                tool_html += "</div>";

                                tool_html += "<div class='no-padding' id='" + panel.tag + "_teams_list'>";
                                for(var a = 0;a<local_peer_teams.length;a++){ var pt = local_peer_teams[a];
                                    tool_html += "<div class='flex' style='border-bottom: solid 1px #EEE;'>";
                                        tool_html += "<div class='col-2'><img title='" + pt.display_name + "' class='icon-25' style='margin: 0px 10px;' src='" + get_team_gif(pt, true) + "' /></div>";
                                        tool_html += "<div class='col-7' style='padding-top:5px;'><span class='font-15'>" + pt.display_name + "</span></div>";
                                        tool_html += "<div class='col-2 right' style='padding-top:5px;'><img class='icon-15' onclick='remove_peer(" + pt.team_ID + ");' src='/static/img/Close24.png' /></div>";
                                    tool_html += "</div>";
                                }
                                tool_html += "</div>";
                            tool_html += "</div>";
                        }                        
                        tool_html += "</div>";
                    }
                    else{
                        local_peer_teams = misc.data.peers_comparison == null ? [] : misc.data.peers_comparison[k + "_teams"];
                        console.log("local_peer_teams"); console.log(local_peer_teams);
                        // Ability to choose a team to add to the list of peers
                        tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Add A Team</span></div>";
                        tool_html += "<div class='no-padding'>";
                            tool_html += "<div id='search_div" + k + "' class='no-padding credentials-box short'>";
                            
                            tool_html += "<div class='col-12 no-padding'><input id='peer_selection_team_input" + k + "' onkeyup='search_peer_selection_teams(this.value);'  placeholder='Enter Team Name' type=text class='text-input medium' id='peer_selection_team" + k + "' style='height:21px; font-size:10px; padding:0;margin:0;'></div>";
                            tool_html += "<div class='dropdown-content' id='peer_selection_team_list" + k + "'></div>";
                            tool_html += "</div>";
                        tool_html += "</div>";

                        tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Current List</span></div>";
                        
                        // Error messages in case someone tries to do something that they shouldn't
                        tool_html += "<div class='no-padding hidden error' id='" + k + "_too_few_error_div'>";
                            tool_html += "<span class='contents font-15 lh-24'>It is recommended that peer buckets have sufficient teams in them to provide a large-enough sample. Please add more teams before making a deletion.</span>"
                        tool_html += "</div>";

                        tool_html += "<div class='no-padding' id='" + k + "_teams_list'>";
                        for(var a = 0;a<local_peer_teams.length;a++){ var pt = local_peer_teams[a];
                            tool_html += "<div class='flex' style='border-bottom: solid 1px #EEE;'>";
                                tool_html += "<div class='col-1'><img title='" + pt.display_name + "' class='icon-35' style='margin: 0px 10px;' src='" + get_team_gif(pt, true) + "' /></div>";
                                tool_html += "<div class='col-4' style='padding-top:5px;'><span class='font-18'>" + pt.display_name + "</span></div>";
                                tool_html += "<div class='col-7 right' style='padding-top:5px;'><img class='icon-15' onclick='remove_peer(" + pt.team_ID + ");' src='/static/img/Close24.png' /></div>";
                            tool_html += "</div>";
                        }
                    
                    }
                    tool_html += "</div>";
                tool_html += "</div>";
            }
            tool_html += "</div>";
        tool_html += "</div>";
    tool_html += "</div>";
    
    html = '';
        html += '<div class="flex" style="margin:5px;">';
            html += '<div class="col-1"></div>';
            html += '<div class="col-10 popup-content">';
            html += exp_html;
           
            html += tool_html;
            
            //html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>';
            html += '</div>';
            html += '<div class="col-1"></div>';
        html += '</div>';
    
    
    $("#overlay_panel").empty(); $("#overlay_panel").append(html); $("#overlay_panel").addClass("shown");
}

function display_edit_team_comparison_panel(){
    /***
    When the user clicks on an edit comparison label, this panel pops up. It allows a team user to change which teams are to be show in the peers vs target groupings. This is primarily used on the Team Home page, but it's possible that other analyses have been updated to incorporate these groupings.
    ***/
    
    $("#overlay_panel").addClass("tall"); 
    
    var target_template = misc.target_template; 
    var nhca = misc.nhca

    var exp = null; var exp_html = null; var html = null;
     
    
    /***
    The following generates the display as well as the triggers for collecting feedback and closing the explanation overlay panel.
    ***/
    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>Edit Benchmark Teams</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12'><span class='font-15 lh-24 contents'>These reports and analyses compare your team's performance against a bucket of teams that are either a set of peers (similarly-ranked teams) or a set of targets (higher-ranked teams). You can use this tool to modify which teams are used as the comparison benchmark.</span></div>";
    
    tool_html = "<div class='col-12'>";
        tool_html += "<div class='no-padding exp-scroll tall-50' style=''>";

                tool_html += "<div class='toggle-panel' id='edit_peers_panel_custom_panel'>";
                // Print team logos, name, and tool to remove them from the peer list
                
                
                    
                    local_peer_teams = misc.data.peers_comparison["custom_teams"];
                    console.log("local_peer_teams"); console.log(local_peer_teams);
                    // Ability to choose a team to add to the list of peers
                    tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Add A Team</span></div>";
                    tool_html += "<div class='no-padding'>";
                        tool_html += "<div id='search_divcustom' class='no-padding credentials-box short'>";
                        
                        tool_html += "<div class='col-12 no-padding'><input id='peer_selection_team_inputcustom' onkeyup='search_peer_selection_teams(this.value);'  placeholder='Enter Team Name' type=text class='text-input medium' id='peer_selection_teamcustom' style='height:21px; font-size:10px; padding:0;margin:0;'></div>";
                        tool_html += "<div class='dropdown-content' id='peer_selection_team_listcustom'></div>";
                        tool_html += "</div>";
                    tool_html += "</div>";

                    tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Current List</span></div>";
                    
                    // Error messages in case someone tries to do something that they shouldn't
                    tool_html += "<div class='no-padding hidden error' id='custom_too_few_error_div'>";
                        tool_html += "<span class='contents font-15 lh-24'>It is recommended that peer buckets have sufficient teams in them to provide a large-enough sample. Please add more teams before making a deletion.</span>"
                    tool_html += "</div>";

                    tool_html += "<div class='no-padding' id='custom_teams_list'>";
                    for(var a = 0;a<local_peer_teams.length;a++){ var pt = local_peer_teams[a];
                        tool_html += "<div class='flex' style='border-bottom: solid 1px #EEE;'>";
                            tool_html += "<div class='col-1'><img title='" + pt.display_name + "' class='icon-35' style='margin: 0px 10px;' src='" + get_team_gif(pt, true) + "' /></div>";
                            tool_html += "<div class='col-4' style='padding-top:5px;'><span class='font-18'>" + pt.display_name + "</span></div>";
                            tool_html += "<div class='col-7 right' style='padding-top:5px;'><img class='icon-15' onclick='remove_peer(" + pt.team_ID + ");' src='/static/img/Close24.png' /></div>";
                        tool_html += "</div>";
                    }
                    
                    
                    tool_html += "</div>";
                tool_html += "</div>";
            
            tool_html += "</div>";
        tool_html += "</div>";
    tool_html += "</div>";
    
    html = '';
        html += '<div class="flex" style="margin:5px;">';
            html += '<div class="col-1"></div>';
            html += '<div class="col-10 popup-content">';
            html += exp_html;
           
            html += tool_html;
            
            //html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>';
            html += '</div>';
            html += '<div class="col-1"></div>';
        html += '</div>';
    
    
    $("#overlay_panel").empty(); $("#overlay_panel").append(html); $("#overlay_panel").addClass("shown");
}

function display_edit_player_comparison_panel(){
    /***
    When the user clicks on an edit comparison label, this panel pops up. It allows a team user to change which players are used as the comparison benchmark for an individual player.
    ***/
    
    $("#overlay_panel").addClass("tall"); 
    
    var target_template = misc.target_template; 
    var nhca = misc.nhca

    var exp = null; var exp_html = null; var html = null;
     
    
    /***
    The following generates the display as well as the triggers for collecting feedback and closing the explanation overlay panel.
    ***/
    exp_html = "<div class='col-12 flex'><div class='col-10'><span class='font-36 bold contents'>Edit Benchmark Players</span></div>";
    exp_html += "<div class='col-2 right'><img onclick='hide_overlay();' src='/static/img/Close24.png' /></div></div>";
    exp_html += "<div class='col-12'><span class='font-15 lh-24 contents'>These reports and analyses compare a player's stats against a bucket of players. You can use this tool to modify which players are used as the comparison benchmark.</span></div>";
    
    tool_html = "<div class='col-12'>";
        tool_html += "<div class='no-padding exp-scroll tall-50' style=''>";

                tool_html += "<div class='toggle-panel' id='edit_peers_panel_custom_panel'>";
                // Print team logos, name, and tool to remove them from the peer list
                
                
                    
                    local_peer_players = misc.player_data.peers_comparison["custom_players"];
                    console.log("local_peer_players"); console.log(local_peer_players);
                    // Ability to choose a team to add to the list of peers
                    tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Add A Player</span></div>";
                    tool_html += "<div class='no-padding'>";
                        tool_html += "<div id='search_divcustom' class='no-padding credentials-box short'>";
                        
                        tool_html += "<div class='col-12 no-padding'><input id='peer_selection_player_inputcustom' onkeyup='search_peer_selection_players(this.value);'  placeholder='Enter Player Name' type=text class='text-input medium' id='peer_selection_playercustom' style='height:21px; font-size:10px; padding:0;margin:0;'></div>";
                        tool_html += "<div class='dropdown-content' id='peer_selection_player_listcustom'></div>";
                        tool_html += "</div>";
                    tool_html += "</div>";

                    tool_html += "<div class='light' style='padding: 20px 0px 0px 0px;'><span class='font-18'>Current List</span></div>";
                    
                    // Error messages in case someone tries to do something that they shouldn't
                    tool_html += "<div class='no-padding hidden error' id='custom_too_few_error_div'>";
                        tool_html += "<span class='contents font-15 lh-24'>It is recommended that peer buckets have sufficient players in them to provide a large-enough sample. Please add more players before making a deletion.</span>"
                    tool_html += "</div>";

                    tool_html += "<div class='no-padding' id='custom_players_list'>";
                    for(var a = 0;a<local_peer_players.length;a++){ var pt = local_peer_players[a];
                        tool_html += "<div class='flex' style='border-bottom: solid 1px #EEE;'>";
                            
                            tool_html += "<div class='col-5' style='padding-top:5px;'><span class='font-18'>" + pt.player + "</span></div>";
                            tool_html += "<div class='col-7 right' style='padding-top:5px;'><img class='icon-15' onclick='remove_peer_player(" + pt.player_ID + ");' src='/static/img/Close24.png' /></div>";
                        tool_html += "</div>";
                    }
                    
                    
                    tool_html += "</div>";
                tool_html += "</div>";
            
            tool_html += "</div>";
        tool_html += "</div>";
    tool_html += "</div>";
    
    html = '';
        html += '<div class="flex" style="margin:5px;">';
            html += '<div class="col-1"></div>';
            html += '<div class="col-10 popup-content">';
            html += exp_html;
           
            html += tool_html;
            
            //html += '<div class="col-12 centered" style="padding-top:15px;"><button class="action-button" onclick="hide_overlay();" class="close"><span class="">Close</span></button></div>';
            html += '</div>';
            html += '<div class="col-1"></div>';
        html += '</div>';
    
    
    $("#overlay_panel").empty(); $("#overlay_panel").append(html); $("#overlay_panel").addClass("shown");
}

function expand_row(row_ID){
    console.log("Expand row " + row_ID);
    $("#expand" + row_ID).removeClass("hidden");
}

function close_row(row_ID){
    console.log("Close row " + row_ID);
    $("#expand" + row_ID).addClass("hidden");
}

function drill_down_header(id, toggle=false){
    var elem = $("#" + id);
    var route = elem[0].getAttribute("route").split("|");
    
    if(on_mobile || toggle){
        toggle_tile_visibility(route[1]);
    }
    else{
        
        var ddf = $("#drill_down_form");
        var active_element = $("#active_element");
    
        active_element.attr("value", route[1]);
        ddf.attr("action", "/" + route[0]);
        ddf.submit();
    }
    
}

function drill_down_body(id){
    var elem = $("#" + id);
    var route = elem[0].getAttribute("route").split("|");
    
    var ddf = $("#drill_down_form");
    var active_element = $("#active_element");

    active_element.attr("value", route[1]);
    ddf.attr("action", "/" + route[0]);
    ddf.submit();
    
}

function toggle_settings_bar(id){
    var bar = $("#" + id);
    var class_list = document.getElementById(id).className.split(/\s+/);
    
    if(class_list.indexOf("not-shown") == -1){ bar.addClass("not-shown"); }
    else{ bar.removeClass("not-shown"); }
    
}

function title(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function height_str(inches){
    /***
    Converts raw inches into the height string
    ***/
    feet = Math.floor(inches/12);
    inches = inches % 12;
    return feet + "'" + inches + "\"";
}

function update_settings(id, val, post=null){
    
    var bar = $("#settings-bar");
    var class_list = document.getElementById("settings-bar").className.split(/\s+/);
    var post_method = false;
    console.log("update_settings.id: " + id);
    
    if(id != null){
        if(post == null){
            console.log("Changed " + id + " to " + val + " on " + misc.target_template);
        }
        else{
            post_method = true;
            console.log("Changed " + id + " to " + val + " on " + misc.target_template + " w/ post = " + post);
            tmp = post.split("|"); tokens = [];
            for(var a = 0;a<tmp.length;a++){
                tokens.push({'name': tmp[a].split("~")[0], 'value': tmp[a].split("~")[1]});
            }
                    
            //console.log("tokens"); console.log(tokens)
            for(var a = 0;a<tokens.length;a++){ token = tokens[a]; 
                $("#settings_form_" + token.name).val(token.value);
            }
        }
        
        logger_str = [misc.target_template, misc.nhca, id, val].join("|");
                
                
        document.getElementById('pixel').src = "/logger-editSettings?c=" + logger_str;
        
        if(is_default_settings(misc.target_template)){
            $("#settings-icon").attr("src", "/static/img/blue_gear15.png");
        }
        else{
            $("#settings-icon").attr("src", "/static/img/blue_gear15modified.png");
        }
        
        
        // Reload the page because the setting that was changed requires a full reload
        if(misc.refresh_settings_tags.indexOf(id) > -1){
            
            
            $("#refreshing-bar").removeClass("not-shown");
            $("#settings-bar").addClass("not-shown");
            if(post_method){
                if('basic_home.html' == misc.target_template && typeof active_panel != "undefined" && active_panel == "roster"){
                    console.log("Use an async run");
                    async_run(null, misc.data.ID, "handler-basic_team_detail|year-" + val + "|team_ID-" + misc.data.ID + "|action-refresh_team_data|field-content|key-" + active_panel);
                }
                else{
                    setTimeout(() => {  document.getElementById('settings_form').submit()}, 3000);
                }
            }
            else{
                if('basic_home.html' == misc.target_template){
                    
                    setTimeout(() => {  window.location= "/"; }, 3000);
                    
                }
                else if('team_home.html' == misc.target_template){
                    
                    setTimeout(() => {  window.location= "/"; }, 3000);
                }
                else{
                    setTimeout(() => {  window.location= "/" + misc.target_template.split(".html")[0]; }, 3000);
                }
            }
        }
        
    }
    
}

function zFormat(f, decimals=1){
    
      if(isNaN(f)){ return ""; }
      if(typeof f == "string"){ return f; }
      var debug = false;
      //if(f > 16.98 && f < 17){ debug = true; }
      if(debug){ console.log("\n\nReceived " + f + " w/ decimals = " + decimals); }
      
      var first = "";
      var second = "";
      var negative = true;
      if(f >= 0){ negative = false; }
      f = Math.abs(f);    
          
      var input = "" + f;
      
          
      var decimal = false;
      if(input.indexOf(".") > -1){
          decimal = true;
          first = input.split(".")[0];
          second = input.split(".")[1];
          if(debug){ console.log("SECOND A: " + second); }
          var mult = Math.pow(10,decimals);
          if(debug){ console.log("MULT: " + mult); }
          
          second_val = ("" + (Math.round(parseFloat("1." + second)*mult)/mult))
          
          if(second_val.indexOf(".") > -1){
              
              second = second_val.split(".")[1];
          }
          else{
              if(second_val == "2"){
                  if(debug){ console.log("Increment the first value because second_val == " + second_val); }
                  first = ("" + (1.0 + parseFloat(first)));
                  second = "";
                  for(var a = 0;a<decimals;a++){ second += "0"; }
              }
              else{
                  second = "";
                  for(var a = 0;a<decimals;a++){ second += "0"; }
              }
          }
          if(decimals == 0){ second = null; }
      }
      else{
          first = input;
          second = null;
          if(decimals > 0){
              second = "";
              for(var a = 0;a<decimals;a++){ second += "0"; }
          }
          second_val = null;
      }
      if(debug){ 
          console.log(" first: " + first + " len=" + first.length);
          console.log(" second: " + second);
          console.log(" second_val: " + second_val);
      }
      if(first.length > 3){
         var tmp = "";
         var printed = 0;
         for(var a = first.length-1;a>=0;a--){
             tmp = first.charAt(a) + tmp;
             printed += 1;
             if(printed % 3 == 0 && a > 0){
                 tmp = "," + tmp;
             }
             
             
         }
         if(debug){ console.log(" first becomes: " + tmp); }
         first = tmp;
      }
      
      
      var res = first;
      if(second != null){
          res += "." + second;
      }
      if(negative){
          //res = "(" + res + ")";
          res = "-" + res;
          
      }
      if(debug){ console.log("Returning " + res); }
      
      return res;
}


function apply_user_settings(){
    /***
    In some cases, a user will have specified settings that determine how a page is displayed (i.e. Adj vs Raw stats). This function runs through the settings and checks if 1) they apply to the template in question and 2) whether the element they act on is available to be modified.
    ***/
    if(typeof user_obj == "undefined"){ return; }
    var is_default = true;
    console_log.push({'msg': 'apply_user_settings: load user settings...'});
    uos = user_obj.settings;
    console_log.push({'msg': 'apply_user_settings: load default settings...'});
    mds = misc.default_settings;
    
    html = "<span class='font-12'>MDS" + JSON.stringify(mds) + "</span>";
    html += "<span class='font-12'>UOS" + JSON.stringify(uos);
    html += "</span>";
    for(k in uos){
        //console.log("ep02ms")
        //console.log(uos[k]);
        
        is_valid_on_this_template = 0;
        if(typeof uos[k].target_template != "undefined"){
            if(misc.target_template == "team_player_detail.html" &&  uos[k].target_template == "basic_player_detail_v2.html"){
                is_valid_on_this_template = 1;
            }
            else if(uos[k].target_template == null || uos[k].target_template == misc.target_template){
                is_valid_on_this_template = 1;
            }
        }
        //console.log(k, uos[k].target_template, misc.target_template, uos[k].target_template == misc.target_template, is_valid_on_this_template);
        
        if(is_valid_on_this_template){
            elem = document.getElementById(k);
            if(elem != null){
                //console.log(">",uos[k].val, mds[k])
                if(uos[k].val != mds[k]){ is_default = false; }
                
                if(['general_focus_year'].indexOf(k) > -1){ // Select object
                    html += "<span class='font-13'>Set " + k + " select to " + uos[k].val + "</span>";
                    $("#" + k).val(uos[k].val);
                }
                else if(['player_focus_year'].indexOf(k) > -1){ // Select object
                    html += "<span class='font-13'>Set " + k + " select to " + uos[k].val + "</span>";
                    $("#" + k).val(uos[k].val);
                }
                else if([''].indexOf(k) > -1){ // Input object
                    
                }
                else if([''].indexOf(k) > -1){ // Radio/toggle object
                    
                }
                else if([''].indexOf(k) > -1){ // Checkbox object
                    
                }
                else if([''].indexOf(k) > -1){ // Slider object
                    
                }
            }
        }
    }
    
    
    
    console_log.push({'msg': 'apply_user_settings: adjust settings bar...'});
    if(document.getElementById("settings-bar") != null){
        var bar = $("#settings-bar");
        var class_list = document.getElementById("settings-bar").className.split(/\s+/);
        
        if(!is_default && class_list.indexOf("not-shown") > -1){ 
            bar.removeClass("not-shown"); 
            $("#settings-icon").attr("src", "/static/img/blue_gear15modified.png");
        }
    }
    
    
}


function is_default_settings(target_template){
    /***
    A settings icon is shown with a red dot if the user has changed their settings from the default ( as a way to remind them ). This function checks whether a user's settings match the defaults or not.
    ***/
    if(typeof user_obj == "undefined"){ console.log("1a"); return true; }
    if ( !('settings' in user_obj)){ console.log("2a"); return true; }
    if (user_obj.settings == null){ console.log("3a"); return true; }
    
    //console.log("Target template: " + target_template);
    
    //console.log("Misc default settings: "); console.log(misc.default_settings);
    
    //console.log("User Obj: "); console.log(user_obj);
    
    //console.log("User Obj settings: "); console.log(user_obj.settings);
    
    
    uos = user_obj.settings;
    mds = misc.default_settings;
    for(k in mds){
        
        //console.log(k, mds[k], uos[k].val, mds[k]==uos[k].val);
        if(k in uos && uos[k].val != null && mds[k]!=uos[k].val ){ return false; }
    }
    return true;
}


function toggle_tile_visibility(id){
    /***
    On mobile devices, cards are often defaulted to only show the headline of what the card contains rather than the card as a whole for space saving reasons. Therefore, users can click on an expand icon to see the contents of a given card or close an existing card. This function manages that process, including executing redraw so that the appropriate content is spaced correctly (if an svg is generated for a closed card, its dimensions will be inaccurate; hence the need to redraw once the card is opened).
    ***/
    
	//console.log("toggle_tile_visibility." + id);
    var icon_elem = $("#" + id + "_helpicon");
    var filter_elem = $("#" + id + "_filtericon");
    var div_elem = $("#" + id + "_div");
    var img_elem = $("#" + id + "_img");
    var class_list = document.getElementById(id + "_div").className.split(/\s+/);
    
    var opening = false;
    if(class_list.indexOf("visible") == -1){
        icon_elem.addClass("icon-visible");
        filter_elem.addClass("icon-visible");
        div_elem.addClass("visible");
        img_elem.attr("src", "static/img/Gray_Minus150.png");
        opening = true;
    }
    else{
        filter_elem.removeClass("icon-visible");
        icon_elem.removeClass("icon-visible");
        div_elem.removeClass("visible");
        img_elem.attr("src", "static/img/Gray_Plus150.png");
    }
    
    if(opening){
        var window_height = $(window).height();
        var current_loc = $(document).scrollTop();
        var h = div_elem.height();
        var loc = div_elem.position().top;
        if(h + loc > window_height + current_loc){
            var offset = 0;
            while(h + loc > window_height + current_loc + offset){
                offset += 1;
            }
            
            
            $("html, body").animate({ scrollTop: (current_loc + offset + 30)}, "slow");
        }
    }
    redraw(id);
}

function toggle_row_visibility(func,  id){
    var img_elem = $("#" + id + "_imgicon");
  
    var div_elem = $("#" + id + "_hiddendiv");

    var class_list = document.getElementById(id + "_hiddendiv").className.split(/\s+/);
    
    var opening = false;
    if(class_list.indexOf("visible") == -1){
        div_elem.addClass("visible");
        img_elem.attr("src", "static/img/Gray_Minus_Skinny150.png");
        opening = true;
    }
    else{
        div_elem.removeClass("visible");
        img_elem.attr("src", "static/img/Gray_Plus_Skinny150.png");
    }
    
}

function set_panel(val){
    panel = val;
    $(".panel_tag").removeClass("tag-on").addClass("tag-off"); 
    $("#" + val + "_view_tag").removeClass("tag-off").addClass("tag-on"); 

    $(".panel").removeClass("visible").addClass("hidden"); 
    $("#" + val + "_view").removeClass("hidden").addClass("visible"); 
}


function menu_toggle(only_if_open=false){

    tags = {'dtop': 1, 'mob': 1};
    for(t in tags){
        var elem_name = 'menu_modal_' + t;
        if(document.getElementById(elem_name) != null){
            var cur = document.getElementById(elem_name).style.display;
            if(["none",""].indexOf(cur) > -1){
                if(!only_if_open){
                    document.getElementById(elem_name).style.display = "block";
                }
            }
            else{
                document.getElementById(elem_name).style.display = "none";    
            }
        }
        else{
            console.log("Menu objects have not been created correctly...");
        }
    }
}


function explore_toggle(only_if_open=false){

    tags = {'explore': ''};//, 'dtop': 1, 'mob': 1};
    for(t in tags){
        var elem_name = 'menu_modal_' + t;
        if(document.getElementById(elem_name) != null){
            var cur = document.getElementById(elem_name).style.display;
            if(["none",""].indexOf(cur) > -1){
                if(!only_if_open){
                    document.getElementById(elem_name).style.display = "block";
                    document.getElementById('pixel').src = "/logger-jsEvent?c=" + [13, misc.nhca].join("|");
                }
            }
            else{
                document.getElementById(elem_name).style.display = "none";    
            }
        }
        else{
            console.log("Explore objects have not been created correctly...");
        }
    }
}


function brief_hide_in_seconds(hide_id, hide_for=1){
	/***
	This function hides an HTML object (via opacity=0) for the specified number of seconds
	***/
	
	$("#" + hide_id).removeClass("unhide");
	$("#" + hide_id).addClass("briefly-hidden");
	setTimeout(function(){ $("#" + hide_id).addClass("unhide"); }, hide_for * 1000);
}
    
function populate_preferences(preferences){
    /***
    This function displays the HTML required to let a user change their preferences via the PreferencesHandler.
    ***/
    var elem = $("#top_container"); elem.empty(); var html = "";
    
    html += "<div class='col-12 page-title'><span class='font-24 pointer bold'>My Preferences</span></div><div class='col-12 flex'><div class='col-1 dtop'></div><div class='col-10-11'>";
        
        
        html += "<FORM action='/preferences' method=POST>";
        //console.log("preferences");console.log(preferences);
        var n_preferences = 0;
        for(var a = 0;a<preferences.length;a++){
            var p = preferences[a];
            if(["receive_newsletter", "receive_expected_goals", "receive_end_game_emails", "receive_preview_emails", "receive_stats_summary_emails"].indexOf(p.key) == -1){
                html += "<div id='preference_group_" + p.key + "' class='col-12 flex table-row'>";
                
                html += "<div class='col-6'><span class='font-18'>" + p.dtop_display + "</span></div>";
                html += "<div class='col-6 right'>";
                
                if(p.element == "select"){
                    html += "<select id='edit_value_" + p.key + "' name='" + p.key + "'>";
                    for(var b = 0;b<p.options.length;b++){
                        var opt = p.options[b];
                        html += "<option value='" + opt.value + "' " + opt.selected + ">" + opt.display + "</option>";
                    }
                    html += "</select>";
                }
                else if(p.element == "text"){
                    html += "<input id='edit_value_" + p.key + "' class='medium' type=text name='" + p.key + "' value='" + p.value + "' />";
                }
                
                html += "</div>";
                
                html += "</div>";
                n_preferences += 1;
            }
        }
        
        if(misc.error != null){ html += "<div class='col-12 error centered'><span class='error' >" + misc.error + "</span></div>";    }
        if(misc.msg != null){ html += "<div class='col-12 centered'><span class='msg' style='color:blue;' >" + misc.msg + "</span></div>";    }
        
        if(n_preferences > 0){
            html += "<div class='col-12 action-button right'>";
            html += "<button class='action-button' type=submit name='action' id='submit_me' value='edit_preferences'>SAVE</button>";
            html += "</div>";
        }
        html += "</FORM>";
    
    html += "</div><div class='col-1'></div></div>";
    
    html += "<div class='col-12 page-title'><span class='font-24 pointer bold'>Email Notifications</span></div><div class='col-12 flex'><div class='col-1 dtop'></div><div class='col-10-11'>";
        
        

        //console.log("preferences");console.log(preferences);
        
        for(var a = 0;a<preferences.length;a++){
            var p = preferences[a];
            if(["receive_newsletter", "receive_end_game_emails", "receive_expected_goals", "receive_preview_emails", "receive_stats_summary_emails"].indexOf(p.key) > -1){
                html += "<div class='col-12 flex bbottom very-light'>";
                
                font_class = "font-" + (on_mobile ? 15 : 18);
                
                html += "<div class='col-7' style='padding-top: " + (on_mobile ? 10 : 15) + "px;'><span class='" + font_class + "'>" + p.dtop_display + "</span></div>";
                html += "<div class='col-4 right' id='preference_group_" + p.key + "'></div>";
                html += "<div class='col-1 right' style='padding-top: " + (on_mobile ? 10 : 15) + "px;' id='preference_group_" + p.key + "_result'></div>";
                
                html += "</div>";
            }
        }
        
        

    
    html += "</div><div class='col-1'></div></div>";
    elem.append(html);
    
    
    var tmp_str = "";
    for(var a = 0;a<preferences.length;a++){
        var p = preferences[a];
        if(["receive_newsletter", "receive_end_game_emails", "receive_expected_goals", "receive_preview_emails", "receive_stats_summary_emails"].indexOf(p.key) > -1){
            id="preference_group_" + p.key;
            console.log(p);
            
            tmp_val = 0;
            if(0){
                
                
            }
            else{
                tmp_val = p.value ? 1 : 0;
            }
            
            toggle = {'val': tmp_val, 'start_x': 25, 'end_x': 30, 'id': "user_preferences_" + p.key, 'text_align': 'right', 'start_label': 'No', 'end_label': "Yes"};
            
            tmp_str = "handler-" + misc.handler.replace("?c=", "") + "|action-update_user_preferences|field-" + p.key + "|val-" + (p.value ? 0 : 1);
            
            display_toggle(toggle, id, {'async': 'update_email_notifications', 'async_str': tmp_str, 'label_font_size': 15, 'chart_size': 'small', 'class': 'toggle_user_preferences_' + p.key, 'height': (on_mobile ? 30 : 40)});

        }
    }
    
    
}


	
function hide_button_and_submit_form(button_id, form_id){
	/***
	Instead of simply submitting a form natively, run this function so we can hide the button while the request is being processed. 
	***/

	$("#" + button_id).addClass("hidden");
	if(document.getElementById(button_id + "_processing") != null){
		// If we have included the processing gif image, unhide it so that the user knows the request is being processed
		$("#" + button_id + "_processing").removeClass("hidden");
	}
	document.getElementById(form_id).submit();
}

function populate_profile(profile){
    /***
    This function displays the HTML required to let a user change their profile attributes via the ProfileHandler.
    ***/
    var elem = $("#top_container"); elem.empty(); var html = "";
    html += "<FORM action='/profile' method=POST>";
    for(var a = 0;a<profile.length;a++){
        var p = profile[a];
        html += "<div id='profile_group_" + p.key + "' class='col-12 flex'>";
        
        html += "<div class='col-6'><span class='font-15'><span class='dtop'>" + p.dtop_display + "</span><span class='mob'>" + p.mob_display + "</span></span></div>";
        html += "<div class='col-6 right'>";
        
        if(p.element == "select"){
            html += "<select id='edit_value_" + p.key + "' name='" + p.key + "'>";
            for(var b = 0;b<p.options.length;b++){
                var opt = p.options[b];
                html += "<option value='" + opt.value + "' " + opt.selected + ">" + opt.display + "</option>";
            }
            html += "</select>";
        }
        else if(p.element == "text"){
            html += "<input id='edit_value_" + p.key + "' class='large' type=text name='" + p.key + "' value='" + p.value + "' />";
        }
        
        html += "</div>";
        
        html += "</div>";
        
    }
    
    if(misc.error != null){ html += "<div class='col-12 error centered'><span class='error' >" + misc.error + "</span></div>";    }
    if(misc.msg != null){ html += "<div class='col-12 centered'><span class='msg' style='color:blue;' >" + misc.msg + "</span></div>";    }
    
    
    html += "<div class='col-12 action-button right'>";
    html += "<button class='action-button' type=submit name='action' id='submit_me' value='edit_profile'>SAVE</button>";
    html += "</div>";
    html += "</FORM>";
    elem.append(html);
}
  
