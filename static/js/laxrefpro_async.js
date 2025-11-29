/* Handling asynchronous POST updates and returning results */

var redraw_on_success = null;

var form = null; var form_target = null; var success_msg = ""; var error_msg = "";

//var routes = [];
//routes.push({'tag': 'team_data_entry'});
//var route = null;

var resultContainer = null;
var msgContainer = null;


function handleAsyncResponse(responseJson) {
  /***
  This function waits for a response from the server and then updates the screen, via JQuery + css classes to indicate to the user whether their action resulted in success or not.
  ***/
  
  // Set this back to null otherwise if a page has multiple async calls, it could cause an issue if it's already set.
  async_route = null;
  
  
  console.log("responseJson");console.log(responseJson);
  if (responseJson.error) {
    // An error happened when executing whatever action was executed.
    if(!responseJson.no_icon){
        // If this particular POST doesn't update the user with an acknowledgment, then skip this step
        resultContainer.innerHTML = "<img class='async-result-img' id='" + responseJson.async_ID + "_result_img' src='/static/img/RedXCircle240.png' style='height:15px;'>";
        
        
        if ('tag' in responseJson && responseJson.tag == "new_schedule_regex"){
            console.log("Write error to #" + responseJson.async_ID + "_error_msg");
            console.log(responseJson.msg);
            $("#" + responseJson.async_ID + "_error_msg").empty();
            $("#" + responseJson.async_ID + "_error_msg").append("<span class='font-12'>" + responseJson.msg + "</span>");
            
        }
		
    }
    else if ('tag' in responseJson && responseJson.tag == "add_post_to_automation_queue"){
	  
	  var elem = $("#post_content_async_response_div" + responseJson.post_id);
	  elem.removeClass("hidden");
	  var elem1 = $("#post_content_async_response_span" + responseJson.post_id);
	  elem1.empty();
	  var html = 'error' in responseJson && responseJson.error != null ? responseJson.error : responseJson.msg;
	  while(html.indexOf("\n") > -1){ html = html.replace("\n", "<BR>"); }
	  elem1.append(html)
	  
	  
    }
    else if ('tag' in responseJson && responseJson.tag == "save_pickem_selection"){
	  
	  var elem = $("#save_pickem_selection_result_div");
	  elem.removeClass("hidden");
	  elem.empty();
	  var html = 'error_msg' in responseJson && responseJson.error_msg != null ? responseJson.error_msg : responseJson.msg;
	  while(html.indexOf("\n") > -1){ html = html.replace("\n", "<BR>"); }
	  
	  if(misc.tracking_tag_str != ""){ // If there is already a tracking tag on this page view, then use it, otherwise use the one associated with pick-em nudges
		html = html.replaceAll("[ttag]", misc.tracking_tag_str);
	  }
	  else{
		html = html.replaceAll("[ttag]", "?t=pm2psw02c8ekwmq"); 
	  }
	  
	  elem.append(`<span class='error'>${html}</span>`);
	  
	  
    }
    else if ('tag' in responseJson && responseJson.tag == "download_bracket_graphic"){
        var error_html = "<div class='centered col-12' style='padding:50px 0px;'><span class='font-18 error'>Your preview graphic could not be created.</span></div>";
        console.log("response.error_html"); console.log(error_html);
        $("#preview_graphic_div").empty();
        $("#preview_graphic_div").append(error_html);
        console.log("error_html appended");
    }
	else if ('tag' in responseJson && responseJson.tag == "admin_schedules_add_scheduled_game_to_database"){
	    console.log("error.admin_schedules_add_scheduled_game_to_database")
		$("#add_unstored_games_to_db_output_div").removeClass("hidden");
		var html = "<span class='error font-15'>" + responseJson.error + "</span>";
		  
		$("#add_unstored_games_to_db_output_div").empty();
		$("#add_unstored_games_to_db_output_div").append(html);
			  
		$("#add_games_button").removeClass("hidden");
		  
	}
  }  
  else if ('tag' in responseJson && responseJson.tag == "add_post_to_automation_queue"){
	  
	  var elem = $("#post_content_async_response_div" + responseJson.post_id);
	  elem.removeClass("hidden");
	  elem.empty();
	  var html = 'error' in responseJson && responseJson.error != null ? responseJson.error : responseJson.msg;
	  while(html.indexOf("\n") > -1){ html = html.replace("\n", "<BR>"); }
	  
	  elem.append(html)
	  
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "request_new_team_auto_scout_doc_section"){
	  $("#new_doc_section_progress_div").addClass("hidden");
	  if(responseJson.error_msg != null){
		$("#new_doc_section_error_div").empty();
		$("#new_doc_section_error_div").removeClass("hidden");
		$("#new_doc_section_error_div").append("<span class='font-15 contents lh-24'>" + responseJson.error_msg + "</span></div>");
		
		setTimeout(function() {$("#new_doc_section_button_div").removeClass("hidden"); }, 1500);
		report_js_visualization_issue(misc.target_template + "|request_new_team_auto_scout_doc_sectionError__" + responseJson.error_msg + "|" + misc.nhca);
	  }
	  else{
		$("#new_doc_section_msg_div").empty();
		$("#new_doc_section_msg_div").removeClass("hidden");
		$("#new_doc_section_msg_div").append("<span class='font-15 contents lh-24'>" + responseJson.success_msg + "</span></div>");
		
		misc.auto_scout_data.settings.teamCustomization.doc_sections.push(responseJson.new_doc_section);
		draw_auto_scout_settings();
		
		setTimeout(function() {$("#new_doc_section_button_div").removeClass("hidden"); }, 1000);
		
		
	  }
	  
	  
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_refresh_subscriber_data"){
	  
	  // First update the subscriber object in our list of subscribers
	  var subscriber = misc.subscribers.filter(r=> r.subscriber_ID == responseJson.subscriber_ID)[0];
	  for(var a = 0;a<misc.subscribers.length;a++){
		  if(misc.subscribers[a].subscriber_ID == responseJson.subscriber_ID){
			  misc.subscribers[a] = responseJson.subscriber;
			  break;
		  }
	  }
	  
	  // Trigger this function, which picks up the subscriber ID value from the existing input and refreshes the subscriber report
	  search_for_subscriber();
	  
  }
  
  else if ('tag' in responseJson && responseJson.tag == "requestDataForAlternateRankingAlgo"){
	  
	  // Return the data, reinflate it, and then note that the data is available in the data_requested object
	  if(responseJson.algoChoice == 'oppFilteredAndWeighted'){ misc.data.oppFilteredAndWeighted = responseJson.algoData; }
	  if(responseJson.algoChoice == 'oppWeighted'){ misc.data.oppWeighted = responseJson.algoData; }
	  data_requested[responseJson.algoChoice] = 1;
	  
	  // Now that we've noted that the new data is available, call the request function which will route us to the actual display
	  request_ranking_algorithm_data(responseJson.algoChoice, responseJson.activePanel);
  }
  else if ('tag' in responseJson && responseJson.tag == "setUserteamDefaultRanking"){
	  
	  misc.origteamDefaultRanking.val = responseJson.algoChoice;
	  request_ranking_algorithm_data(responseJson.algoChoice, responseJson.activePanel);
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_deactivate_subscriber"){
	  
	  // Trigger this function, which picks up the subscriber ID value from the existing input and refreshes the subscriber report
	  search_for_subscriber();
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_request_unassigned_subs_list"){
	  
	  
	   console.log(responseJson.unassigned_subscribers)
	  if(responseJson.unassigned_subscribers == null){
	      if('not_found' in responseJson){
			$("#search_for_subscriber_not_found_error_div").removeClass("hidden");
		  }
		  else if('found_multiple' in responseJson){
			$("#search_for_subscriber_multiple_error_div").removeClass("hidden");
		  }
		  else{
			$("#search_for_subscriber_error_div").removeClass("hidden");
		  }
	  }
	  else{
		  $("#remaining_unassigned_count").text(" (" + jsformat(responseJson.unassigned_subscribers.length, ",") + " left)");
		  misc.unassigned_subscribers_loaded=1;
		  misc.unassigned_subscribers=responseJson.unassigned_subscribers;
		  for ( var a = 0;a<misc.unassigned_subscribers.length;a++){
				misc.unassigned_subscribers[a].assigned = 0;
		  }
			
		  misc.list_assignments=responseJson.list_assignments
		  misc.subscriber_favorite_teams=responseJson.subscriber_favorite_teams
		  misc.list_options=responseJson.list_options
		  
		  display_unassigned_subs();
		  //expand_unassigned_row( 7102, 0);
	  }
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_request_assigned_subs_list"){
	  
	  
	   console.log(responseJson.assigned_subscribers)
	  if(responseJson.assigned_subscribers == null){
	      if('not_found' in responseJson){
			$("#search_for_subscriber_not_found_error_div").removeClass("hidden");
		  }
		  else if('found_multiple' in responseJson){
			$("#search_for_subscriber_multiple_error_div").removeClass("hidden");
		  }
		  else{
			$("#search_for_subscriber_error_div").removeClass("hidden");
		  }
	  }
	  else{
		  $("#assigned_count").text(" (" + jsformat(responseJson.assigned_subscribers.length, ",") + " total)");
		  misc.current_sub_assignments_loaded=1;
		  misc.assigned_subscribers=responseJson.assigned_subscribers;
		  for ( var a = 0;a<misc.assigned_subscribers.length;a++){
				misc.assigned_subscribers[a].edited = 0;
		  }
			
		  misc.list_assignments=responseJson.list_assignments
		  misc.subscriber_favorite_teams=responseJson.subscriber_favorite_teams
		  misc.list_options=responseJson.list_options
		  
		  display_current_sub_assignments();
		  //expand_unassigned_row( 7102, 0);
		  
		  // Display the filter toggles
		  $("#filter_by_list_div").empty();
		  var tmp_html = "";
		  for(var ab = 0;ab<misc.list_options.length;ab++){ var l = misc.list_options[ab];
								
				tmp_html += "<div class=''><span style='background-color: rgb(24, 154, 211);' title='" + l.description + "' onclick='set_filters(&quot;short_code&quot;, &quot;" + l.short_code + "&quot;);' class='deselected machine-label division-tag small-margin high-contrast' id='division-tag-" + l.short_code.replaceAll(" ", "-") + "'>" + l.short_code + "</span></div>";
		  }
		  $("#filter_by_list_div").append(tmp_html);
	  }
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "save_pickem_selection"){
	  
	  misc.current_user_most_recent_preliminary_pick = responseJson.choice_seq;
	  // Replace the old pick for this date with the new one
	  console.log(JSON.stringify(misc.current_user_picks))
	  game_date_str_loc = misc.current_user_picks.keys.indexOf("game_date_str");
	  team_ID_loc = misc.current_user_picks.keys.indexOf("team_ID");
	  team_selection_loc = misc.current_user_picks.keys.indexOf("team_selection");
	  league_tag_loc = misc.current_user_picks.keys.indexOf("league_tag");
	  // ID the original pick
	  
	  orig_pick = misc.current_user_picks.data.filter(r=> !(r[game_date_str_loc] != responseJson.confirmed_choice.game_date_str || r[league_tag_loc] != responseJson.confirmed_choice.league_tag));
	  
	  // Now we can either create a new pick or update the existing pick that corresponds to the date/league of the confirmed choice
	  if(orig_pick.length > 0){
		  orig_pick = orig_pick[0];
	  }
	  else{
		  orig_pick = []
		  tmp_keys = ['ID', 'user_ID', 'game_date_str', 'team_ID', 'game_ID', 'team_selection', 'points_earned', 'league_tag']
		  for(var a = 0;a<tmp_keys.length;a++){ var k = tmp_keys[a];
			  console.log(k)
			   if(k == "game_date_str"){
				   orig_pick.push(responseJson.confirmed_choice.game_date_str)
			   }
			   else if(k == "league_tag"){
				   orig_pick.push(responseJson.confirmed_choice.league_tag)
			   }
			   else if(k == "user_ID"){
				   orig_pick.push(responseJson.confirmed_choice.user_ID)
			   }
			   else{
				   orig_pick.push(null);
			   }
		  }
	  }
	  orig_pick[team_ID_loc] = responseJson.confirmed_choice.team_ID;
	  orig_pick[team_selection_loc] = responseJson.confirmed_choice.team_selection;
	  
	  // Remove the existing pick for this game date/league tag combination
	  misc.current_user_picks.data = misc.current_user_picks.data.filter(r=> (r[game_date_str_loc] != responseJson.confirmed_choice.game_date_str || r[league_tag_loc] != responseJson.confirmed_choice.league_tag));
	  
	  
	  console.log(misc.current_user_picks)

	  // Add the updated pick back to the list
	  misc.current_user_picks.data.push(orig_pick)
	  console.log(misc.current_user_picks)
	  
	  display_pick_em_contest();
	  
	  var elem = $("#save_pickem_selection_result_div");
	  elem.removeClass("hidden");
	  elem.empty();
	  var html = `Your pick, ${responseJson.confirmed_choice.team_selection}, has been saved.`;
	  
	  elem.append(`<span class='msg'>${html}</span>`);
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "submit_nonTemplate_Contact_Submission"){
	  console.log("unhide div");
	  if(responseJson.error_msg != null){
		  $("#submit_contact_box_question_error_msg").removeClass("hidden");
		  $("#submit_contact_box_question_error_msg").html("<span class='error font-12'>" + responseJson.error_msg + "</span>");
	  }
	  else{
		  document.getElementById("submit_contact_box_question_textarea").value = "";
		  $("#submit_contact_box_question_success_msg").removeClass("hidden");
		  $("#submit_contact_box_question_success_msg").html("<span class='msg font-12'>Message received, I'll get back to you ASAP.</span>");
	  }
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_request_subscriber"){
	  
	  
	  console.log(responseJson.search_msg);
	  if(responseJson.subscriber == null){
	      if('not_found' in responseJson){
			$("#search_for_subscriber_not_found_error_div").removeClass("hidden");
		  }
		  else if('found_multiple' in responseJson){
			$("#search_for_subscriber_multiple_error_div").removeClass("hidden");
		  }
		  else{
			$("#search_for_subscriber_error_div").removeClass("hidden");
		  }
	  }
	  else{
		  display_subscriber_detail(responseJson.subscriber);
	  }
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "request_to_generate_LLM_feedback"){
		
    // Unhide the divs and print the feedback in the feedback textarea reserved for the LLM
	$("#feedbackGenerator_output" + responseJson.n_requested_revisions_log + "_div").removeClass("hidden");
	$("#feedbackGenerator_scores" + responseJson.n_requested_revisions_log + "_div").removeClass("hidden");
	document.getElementById("feedbackGenerator_output" + responseJson.n_requested_revisions_log).value = responseJson.result.response;
	
	// Print the SVG circles
	// A 1 to 4 score for how useful the feedback was
	svg_ID = 'feedback_rating' + (responseJson.n_requested_revisions_log) + "_" + n_shown + "_svg";
	html = "<div class='col-12' id='" + svg_ID + "' style='padding:0px;'></div>"
	
	elem = $("#feedbackGenerator_scores" + responseJson.n_requested_revisions_log + "_div")
	elem.append(html);
	add_score_circles(responseJson.seq, svg_ID, (responseJson.n_requested_revisions_log), responseJson.llm_request_id, "feedbackGenerator")
	 
  }
  else if ('tag' in responseJson && responseJson.tag == "convert_voice_notes_to_article_draft"){
		
    console.log("we're back")
	undo_buffer_queue.push({'source_ID': "new_exgoals_content_textarea", 'txt': document.getElementById('new_exgoals_content_textarea').value})
	
	document.getElementById('new_exgoals_content_textarea').value = convert_non_ascii_to_ascii(responseJson.html);
	
	console.log("250.undo_buffer_queue")
	console.log(undo_buffer_queue);
	 
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_newsletter_resesarch_unassigned_subscriber"){
	
	$("#trigger_research_button" + responseJson.LRP_user_ID).removeClass('hidden');
	console.log(responseJson.possible_names)
	//console.log(responseJson.categorization_decisions)
	misc.categorization_decisions = responseJson.categorization_decisions;
	tmp_sub = misc.unassigned_subscribers.filter(r=> r.LRP_user_ID == responseJson.LRP_user_ID)[0];
	tmp_sub.perplexity_result = null;
	tmp_sub.categorization_decisions = responseJson.categorization_decisions;
	if('error_msg' in responseJson && [null, ''].indexOf(responseJson.error_msg) == -1){
		$("#research_unassigned_user_error_span" + responseJson.LRP_user_ID).text(responseJson.error_msg)
		console.log("Write error to screen...");
		elem = $("#categorization_div" + responseJson.LRP_user_ID); elem.empty();
	}
	else{
		
		$("#research_unassigned_user_error_span" + responseJson.LRP_user_ID).empty();
		tmp_sub.perplexity_result = JSON.stringify(responseJson.possible_names.possible_names, null, 2);
		$("#perplexity_result" + responseJson.LRP_user_ID).text(tmp_sub.perplexity_result );
		
		
	    
		display_categorization_for_unassigned_sub(tmp_sub);
	}
	
	
	
	if(responseJson.next_LRP_user_ID != null){
		console.log("Wait 3 seconds and then move on to LRP user ID=" + responseJson.next_LRP_user_ID )
		setTimeout(function(){ 
			console.log("[196] misc.continue_auto_research: " + misc.continue_auto_research);
			if(misc.continue_auto_research){ 
				expand_unassigned_row(responseJson.next_LRP_user_ID, 1);
			}
			else{
				console.log("Auto-research next user is off")
			}
		}, 10000);
	}
  }
  else if ('tag' in responseJson && responseJson.tag == "request_article_transitions"){

	console.log(responseJson.html);
	
    $("#revert_article_transitions" + responseJson.seq + "_button").removeClass("hidden");
	if(responseJson.n_transitions > 0){
		
		document.getElementById(responseJson.target_element_id).value = responseJson.html;
		
	}
	else{
		console.log("No transition changes were made.")
	}
  }
  
  else if ('tag' in responseJson && responseJson.tag == "request_team_npi_game_list"){

	console.log(responseJson);
	
    
	if('team_ID' in responseJson && responseJson.team_ID != null){
		
		var tmp_team = misc.data.teams.filter(r=> r.ID == responseJson.team_ID)[0];
		tmp_team.npi_games_list = null;
		if('npi_games_list' in responseJson && responseJson.npi_games_list != null){
			tmp_team.npi_games_list = responseJson.npi_games_list
			//console.log("[169] tmp_team.npi_games_list"); console.log(tmp_team.npi_games_list);
			tmp_team.npi_games_list.oppList = reinflate_generic_obj(tmp_team.npi_games_list.oppList)
			
			tmp_team = process_npi_opp_list(tmp_team);
			
		}
		
		
		
		display_npi_schedule_detail(tmp_team);
	}
	else{
		console.log("No team ID returned.") // Error would be recorded in LRP_Main because the int() call for the team ID would fail
	}
  }
  
  else if ('tag' in responseJson && responseJson.tag == "team_my_roster_depth_chart_add_player_names"){
	  
	  elem = $("#add_players_to_depth_chart_results"); elem.empty(); elem.removeClass("hidden");
	  
	  misc.data.new_players_to_be_added = responseJson.new_player_records;
	  var tmp_html = "";
	  
	  // Summarize how many were received and how many were added
	  
	  tmp_html += "<div class='contents no-padding font-15'>"
		tmp_html += "<span class='contents no-padding msg bold'>" + responseJson.n_player_records_entered + "&nbsp;</span><span class='contents no-padding'>were entered;&nbsp;</span>"
		if(responseJson.n_player_records_entered > 0){
			if(responseJson.n_new_player_records > 0){
				tmp_html += "<span class='contents no-padding msg bold'>" + responseJson.n_new_player_records + "&nbsp;</span><span class='contents no-padding'>were new and are ready to be added to the unassigned player pool. Below is a sample of the names received:</span>"
			}
			else{
				tmp_html += "<span class='contents no-padding'>None of them were new names, so the unassigned player pool has not been changed.</span>"
			}
		}
	  tmp_html += "</div>"
	  // Show a header list of those received and added
	  if(responseJson.new_player_records.length > 0){
		  tmp_html += "<div class='' style='line-height:15px;'>"
			tmp_players = responseJson.new_player_records.slice(0, 5);
			n_not_printed = responseJson.new_player_records.length - 5;
			for(var a = 0;a<tmp_players.length;a++){ var tmp_player = tmp_players[a];
				tmp_html += "<div class='no-padding'><span class='contents font-11 lh-18'>" + tmp_player.name + "</span></div>";
			}
			if(n_not_printed > 0){
				tmp_html += "<div class='no-padding'><span class='contents font-12'>...and " + n_not_printed + " more</span></div>";
			}
			tmp_html += "<div class='centered error'><span class='contents font-12 lh-18 italic'>You must click Approve to add the players to the depth chart</span></div>";
		  tmp_html += "</div>"
	  }
	  elem.append(tmp_html);
	  
	  
	  if(responseJson.new_player_records.length > 0){
		elem = $("#approve_players_to_depth_button_div"); elem.removeClass("hidden");
	  }
  
  }
  else if ('tag' in responseJson && responseJson.tag == "gpt_request_paragraph_revisions"){
	  
	  
	  $(".llm-error-count").css('opacity', '0.0');
	  n_requests_per_call = 2;
	  n_requested_revisions_log = requested_revisions_log.iterations.length;
	  //console.log("n_requested_revisions_log: " + n_requested_revisions_log)
	  //console.log(requested_revisions_log)
	  revision = requested_revisions_log.iterations[n_requested_revisions_log-1];
	  //console.log(revision)
	  revision.proposed_revisions.push(responseJson.result)
	  
	  
	  var tmp_response = gpt_log.filter(r=> r.seq == responseJson.seq)[0];
      var tmp_request = tmp_response.request;
	  var orig_request_statistical_support = [];
	  if(tmp_request.system_context != null){
			orig_request_statistical_support = tmp_request.system_context.filter(r=> r.content.indexOf("are the statistical details") > -1 || r.content.indexOf("are the background statistical details") > -1);
	  }
	  orig_request_statistical_support = orig_request_statistical_support.length == 0 ? null : orig_request_statistical_support[0]['content'];
	  
	  // Format the text based on what is novel
	  for(var a = 0;a<revision.proposed_revisions.length;a++){ var rev = revision.proposed_revisions[a];
		  tokens = rev.response == null ? [] : rev.response.split(". ")
		  rev.sentences = [];
		  for(var b = 0;b<tokens.length;b++){ var sentence = tokens[b].trim();
		    if(!sentence.endsWith(".")){
				sentence += "."
			}
			rev.sentences.push({'txt': sentence, 'novel': 1})
		  }
		  
		  rev.show = a >= revision.proposed_revisions.length - n_requests_per_call ? 1 : 0;
		  if(!('displayed' in rev)){ rev.displayed = 0; }
	  }
	  
	  for(var a = 0;a<revision.proposed_revisions.length;a++){ var rev = revision.proposed_revisions[a];
			
			for(var b = 0;b<rev.sentences.length;b++){ var sentence = rev.sentences[b];
				for(var c = 0;c<revision.proposed_revisions.length;c++){ var other_revision = revision.proposed_revisions[c];
					if(c != a){
						if(other_revision.show){
							
							
							if(other_revision != null && other_revision.response != null && other_revision.response.trim().indexOf(sentence.txt.trim()) > -1){
								sentence.novel = 0;
							}
							if(other_revision != null && other_revision.response != null){
								//console.log("\n\n" + a + "." + b + ") " + sentence.txt.trim() + "\n\nvs.\n\n" + c + ") " + other_revision.response.trim() + "\n\nnovel=" + sentence.novel)
							}
							else{
								//console.log("\n\n" + a + "." + b + ") " + sentence.txt.trim() + "\n\nvs.\n\n" + c + ") null\n\nnovel=" + sentence.novel)
								
							}
						}
						
					}
				}
			}
	  }
	  
	  //console.log(revision.proposed_revisions);
	  for(var a = 0;a<revision.proposed_revisions.length;a++){ var rev = revision.proposed_revisions[a];
		  rev.formatted_html = "";
		  if('explanation' in rev && rev.explanation != null){
		    while(rev.explanation.indexOf("'") > -1){ rev.explanation = rev.explanation.replace("'", "&#39;"); }
			rev.formatted_html = "<div class='no-padding italic right' style='line-height:20px; padding-bottom: 10px;' title='" + brify(rev.explanation) + "'><span onclick='' class='pointer contents font-11'>See Explanation</span></div>";
		  }
		  else{
			  rev.formatted_html = "<div class='no-padding italic right' style='line-height:20px; padding-bottom: 10px;'><span onclick='' class='pointer contents font-11'>&nbsp;</span></div>";
		  }
		  if('flesch_score' in rev && rev.flesch_score != null){
			rev.formatted_html += "<div class='no-padding' style='line-height:10px;'><span class='pointer contents font-10'>Flesch: " + jsformat(rev.flesch_score, "0") + "</span></div>";
		  }
		  rev.formatted_html += "<div class='no-padding' style='line-height:20px;'><span onclick='' class='pointer contents font-13'>";
		  for(var b = 0;b<rev.sentences.length;b++){ var sentence = rev.sentences[b];
			  rev.formatted_html += "<span class='no-padding" + (sentence.novel ? " site-blue" : "") + "'>" + sentence.txt + " </span>";
		  }
		  rev.formatted_html +="</span></div>";
		  
	  }
	  
	  var n_shown = 0;
	  if(responseJson.progress_inc < n_requests_per_call-1){
		  // Provide an indicator of progress
		  for(var a = 0;a<responseJson.progress_inc + 1;a++){ var rev = revision.proposed_revisions[a];
			
			  elem = $("#gpt_requested_revision_target_div" + (requested_revisions_log.iterations.length-1) + "_" + a)
			  elem.empty();
			  elem.append("<div class='no-padding' style='height:3px; background-color:rgb(24, 154, 211);'>&nbsp;</div>");
			
		  }
      }
	  else{
		   // Tool to make the original request easily viewable for the user when they are evaluating the results of a revision request
			elem = $("#other_helpful_information_div" + (requested_revisions_log.iterations.length-1)); elem.empty();
			other_helpful_stuff = "";
		   //other_helpful_stuff = "<div id='other_helpful_information_div" + (requested_revisions_log.iterations.length-1) + "'>"
			other_helpful_stuff += "<div class='right'><span cur='n' id='toggle_other_helpful_information_visibility_span195' onclick='toggle_other_helpful_information_visibility(195);' class='font-12'>Show/Hide</span></div>"
			other_helpful_stuff += "<div class='hidden' id='toggle_other_helpful_information_visibility_content_div195'>"
				if(orig_request_statistical_support != null){
					other_helpful_stuff += "<div class=''><span class='contents font-12'>" + brify(orig_request_statistical_support) + "</span></div>";
				}
				// Assignment
				other_helpful_stuff += "<div class=''><span class='contents font-12'>" + brify(tmp_request.data) + "</span></div>";
				
				
				other_helpful_stuff += "<div class=''><span class='contents font-12'>" + brify(tmp_request.instructions) + "</span></div>";
				
				other_helpful_stuff += "<div class='right'><span cur='n' onclick='toggle_other_helpful_information_visibility(195);' class='font-12'>Show/Hide</span></div>"
			other_helpful_stuff += "</div>"
			
		  //other_helpful_stuff += "</div>"
		  elem.append(other_helpful_stuff);
		  
		  for(var a = 0;a<revision.proposed_revisions.length;a++){ var rev = revision.proposed_revisions[a];
			if(rev.show && !rev.displayed){
				  
				  elem = $("#gpt_requested_revision_target_div" + (requested_revisions_log.iterations.length-1) + "_" + n_shown)
				  elem.empty();
				  elem.append(rev.formatted_html);
				  //elem.append("<div class='no-padding centered'><span class='contents italic font-11'>Temperature: " + rev.temperature + "</span></div>");
				  
				  // Controls to score/rate/select the various paragraphs
				  
				html = ""
				
				// A 1 to 4 score for how useful the edit was
				svg_ID = 'revision_rating' + (requested_revisions_log.iterations.length-1) + "_" + n_shown + "_svg";
				html += "<input type=hidden id='question" + (requested_revisions_log.iterations.length-1) + "_" + n_shown + "_input' name='question" + (requested_revisions_log.iterations.length-1) + "_" + n_shown + "_input' value=''/>";
				html += "<div class='col-12' id='" + svg_ID + "' style='padding:0px;'></div>"
				
				// A select option to choose the edit for the actual article
				html += "<div class='no-padding centered'><div class='font-12 infline-flex'>";
				html += "<button class='action-button short' onclick='iterate_proposed_revision(" + rev.seq + ", " + responseJson.seq + ", " + responseJson.paragraph_seq + ");' id='revision_select_button" + (requested_revisions_log.iterations.length-1) + "_" + n_shown + "'>ITERATE</button>";
				html += "<button style='margin-left: 5px;' class='action-button short' onclick='accept_proposed_revision(\"" + responseJson.llm_request_id + "\", " + rev.seq + ", " + responseJson.seq + ", " + responseJson.paragraph_seq + ", 1);' id='revision_select_button" + (requested_revisions_log.iterations.length-1) + "_" + n_shown + "'>ACCEPT</button>";
				html += "</div></div>"
				
				elem.append(html);
				
				// If we want to score the individual models that are producing the, we should uncomment this; but it's unclear how useful that really is in the grand scheme of things (it would probably be better to incrementally coach/improve a single revision bot that try to have them compete); we can also "score" them based on which one is accepted after we do the revision process.
				//add_score_circles(responseJson.seq, svg_ID, (requested_revisions_log.iterations.length-1) + "_" + n_shown, responseJson.llm_request_id, "proposed_revisions")
				n_shown += 1;
				rev.displayed = 1;
			}
			  
		  }
	  }
	  
	  // By default, we are going to run two different iterations of the paragraph revision bot; if we are in auto-edit mode, we just need to do one instead of two
	  if(!let_auto_edit_run && responseJson.progress_inc < 1){
			
			//console.log(tmp_request)


			tmp_res = get_tmp_subjects_from_req(tmp_request);
			//console.log(tmp_res);
			tmp_subjects = tmp_res[0]; tmp_subject_ID = tmp_res[1]; tmp_subject_ID_val = tmp_res[2];

			elem = $("#gpt_requested_revision_target_div" + (requested_revisions_log.iterations.length-1) + "_" + (responseJson.progress_inc+1))
			elem.empty();
			elem.append("<div class='no-padding centered'><img src='/static/img/PaymentProcessing.gif' /></div>");
			  
			async_run(null, null, "handler-laxref_gpt|action-gpt_request_paragraph_revisions|" + tmp_subjects + "|val-" + tmp_request.analysis + "+-+" + (responseJson.progress_inc+1) + "+-+" + (responseJson.general_feedback) + "+-+" + (responseJson.specific_feedback) + "+-+" + (responseJson.current_paragraph) + "+-+" + (responseJson.revision_request_id) + "+-+0+-+" + (responseJson.n_paragraphs_total) + "|key-" + responseJson.seq + "|field-" + responseJson.paragraph_seq);
	  }
	  
	  if(let_auto_edit_run){ // We are auto-editing the article, so we just need to run a single version of the process and then automatically select the first edit as the correct one
		  auto_edit_loops.paragraph_rewrite += 1;
		  console.log("Auto select the first option...")
		  console.log(responseJson.llm_request_id, rev.seq, responseJson.seq, responseJson.paragraph_seq);
		  accept_proposed_revision(responseJson.llm_request_id, rev.seq, responseJson.seq, responseJson.paragraph_seq, 0);
	  }
  }
   else if ('tag' in responseJson && responseJson.tag == "request_detailed_game_projection"){
      console.log("here.request_detailed_game_projection")
	  var elem = $("#" + responseJson.view_type + "_expanded_div" + responseJson.game_ID);
	  elem.empty();
	var tmp_game = null;
	if(!responseJson.normal_game){ // It's a game with no line information
		tmp_loc = misc.non_line_games.keys.indexOf("ID");
		tmp_expanded_loc = misc.non_line_games.keys.indexOf("expanded");
		tmp_data_loc = misc.non_line_games.keys.indexOf("expanded_projections_data");
		tmp_game = misc.non_line_games.data.filter(r=> r[tmp_loc]==responseJson.game_ID)[0];	
		if(!('error_msg' in responseJson) || responseJson.error_msg == null){ // Date was set successfully

			tmp_game[tmp_expanded_loc] = 1;
			tmp_game[tmp_data_loc] = responseJson.teams;
			if(responseJson.view_type == "win_probability"){
				display_expanded_win_probability_report(tmp_game, responseJson.normal_game);
			}
			  
		  }
		  else{
				var error_html = "<div class='centered col-12' style='padding:50px 0px;'><span class='font-18 error'>" + ('error_msg' in responseJson && responseJson.error_msg != null ? responseJson.error_msg : "We were unable to pull up the detailed analysis for this game.") + "</span></div>";
				elem.append(error_html);
		  }
	}
	else{
		tmp_game = misc.games.filter(r=> r.ID==responseJson.game_ID)[0];		
	  if(!('error_msg' in responseJson) || responseJson.error_msg == null){ // Date was set successfully

		tmp_game.expanded = 1;
		tmp_game.expanded_projections_data = responseJson.teams;
		if(responseJson.view_type == "win_probability"){
			display_expanded_win_probability_report(tmp_game, responseJson.normal_game);
		}
		  
	  }
	  else{
			var error_html = "<div class='centered col-12' style='padding:50px 0px;'><span class='font-18 error'>" + ('error_msg' in responseJson && responseJson.error_msg != null ? responseJson.error_msg : "We were unable to pull up the detailed analysis for this game.") + "</span></div>";
			elem.append(error_html);
	  }
	}
  
  } 
  else if ('tag' in responseJson && responseJson.tag == "adjust_expected_goals_settings_restart_on"){
      console.log("here")
	  if(responseJson.error == null){ // Date was set successfully
		  $("#display_on_pause_div").removeClass("hidden");
		  $("#edit_on_pause_div").addClass("hidden");
		  $("#display_on_pause_date_span").empty();
		  $("#display_on_pause_date_span").append(responseJson.restart_on_str);
		  
		  misc.subscriber_pause = {'status': 'active'}
		  misc.subscriber_pause.restart_on_str = responseJson['restart_on_str']
          misc.subscriber_pause.ID = responseJson['ID']
          misc.subscriber_pause.restart_on_date_str = responseJson['restart_on_date_str']
          misc.subscriber_pause.future = responseJson['future']
		  redraw();
		  document.getElementById('pause_date').value = misc.subscriber_pause.restart_on_date_str
		  
	  }
	  else{
		  $("#display_on_pause_div").addClass("hidden");
		  $("#edit_on_pause_div").removeClass("hidden");
	  }
  
  }  
  else if ('tag' in responseJson && responseJson.tag == "async_show_an_explanation"){
      async_show_an_explanation(responseJson['explanation'], responseJson['tags']);
  
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_request_admin_llm_data"){
      
	  misc.upcoming_summary = responseJson.upcoming_summary;
	  misc.admin_llm_queue = responseJson.admin_llm_queue;
	  misc.unpublished_content = responseJson.unpublished_content;
	  misc.automated_content_summary = responseJson.automated_content_summary;
	  misc.automated_content_types = responseJson.automated_content_types;
	  misc.planning_months = responseJson.planning_months;
	  misc.today_is = responseJson.today_is;
	  
	  display_admin_llm_queue();
	  display_exgoals_unpublished_content();
	  display_exgoals_published_content();
	  display_exgoals_evergreen_content();
	  display_exgoals_ads_content();
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_initiate_new_exgoals_intro"){
      misc.admin_intro_laxref_content_ID = responseJson.next_ID;
	  display_exgoals_intro();
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_initiate_new_exgoals_content"){
      misc.admin_content_laxref_content_ID = responseJson.next_ID;
	  
	  display_exgoals_unpublished_content();
	  var new_exgoals_content_summary_header = ""
	  var new_exgoals_content_summary_teaser = ""
	  var new_exgoals_content_league_tag = ""
	  var new_exgoals_content_survey_ID = ""
	  var new_exgoals_content_conference_ID = ""
	  var new_exgoals_content_seq = 1;
	  var new_exgoals_content_date_str = ""
	  var new_exgoals_content_tags = ""
	  
	  if('add_article' in misc && misc.add_article != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/

		  if(misc.add_article == "computer_ranking"){
		      new_exgoals_content_summary_header = "LacrosseReference Computer Ranking"
		      new_exgoals_content_summary_teaser = "This is not a media poll! I've combined SOR and LaxElo to get to the LR top-20"
			  new_exgoals_content_tags = "computer-ranking"
		  }
		  if(misc.add_article == "top_five_team_efficiency"){
			  new_exgoals_content_tags = "top-five-efficiency-fo-teams"
			  if(misc.article_conference_error != null){
				  
			  }
			  else{
				if(misc.article_conference != null){
					
				  new_exgoals_content_summary_header = "A statistical run-down of the " + misc.article_conference.short_code;
				  new_exgoals_content_summary_teaser = "An update of where the " + misc.article_conference.short_code + " teams rank statistically";
				  
				}
				else{
				  new_exgoals_content_summary_header = "The (statistically) best teams"
				  new_exgoals_content_summary_teaser = "An update of the 5 best teams in the nation across the 3 main statistical categories"
				}
			  }
		  }
		  if(misc.add_article == "faceoff_elo_leaders"){
		      new_exgoals_content_summary_header = "A look at the top FOGOs"
		      new_exgoals_content_summary_teaser = "Here's who the Faceoff Elo model currently has as the 10 best"
			  new_exgoals_content_tags = "faceoff-elo-leaders"
		  }
		  if(misc.add_article == "laxelo_calibration_review"){
		      new_exgoals_content_summary_header = "LaxElo under the microscope"
		      new_exgoals_content_summary_teaser = "How accurate is LaxElo?"
			  new_exgoals_content_tags = "laxelo-calibration-review"
		  }
		  if(misc.add_article == "ega_per_game_leaders"){
		      new_exgoals_content_summary_header = "The award for \"most productive\" goes to..."
		      new_exgoals_content_summary_teaser = "It's an update on the players who have produced the most value per game"
			  new_exgoals_content_tags = "ega-per-game-leaders"
		  }
		  if(misc.add_article == "defensive_ega_per_game_leaders"){
		      new_exgoals_content_summary_header = "The \"most productive\" defensive players are..."
		      new_exgoals_content_summary_teaser = "These are the players whose work on the defensive end has produced the most value"
			  new_exgoals_content_tags = "ega-per-game-defensive-leaders"
		  }
	  }
	  if('article_league_tag' in misc && misc.article_league_tag != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/
		  new_exgoals_content_league_tag = misc.article_league_tag
	  }
	  if('article_survey_ID' in misc && misc.article_survey_ID != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/
		  new_exgoals_content_survey_ID = misc.article_survey_ID
	  }
	  if('article_conference_ID' in misc && misc.article_conference_ID != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/
		  new_exgoals_content_conference_ID = misc.article_conference_ID
	  }
	  if('article_seq' in misc && misc.article_seq != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/
		  new_exgoals_content_seq = misc.article_seq
	  }
	  if('article_dt' in misc && misc.article_dt != null){
		  /*** If the user has sent, via the URL, a request to create a specific type of analysis, we should fill in some basic information ***/
		  new_exgoals_content_date_str = misc.article_dt
	  }
	  
	  if(document.getElementById('new_exgoals_content_summary_header') != null){
		  document.getElementById('new_exgoals_content_summary_header').value = new_exgoals_content_summary_header;
	  }
	  if(document.getElementById('new_exgoals_content_summary_teaser') != null){
		  document.getElementById('new_exgoals_content_summary_teaser').value = new_exgoals_content_summary_teaser;
	  }
	  if(document.getElementById('new_exgoals_content_league_tag') != null){
		  document.getElementById('new_exgoals_content_league_tag').value = new_exgoals_content_league_tag;
	  }
	  if(document.getElementById('new_exgoals_content_survey_ID') != null){
		  document.getElementById('new_exgoals_content_survey_ID').value = new_exgoals_content_survey_ID;
	  }
	  if(document.getElementById('new_exgoals_content_conference_ID') != null){
		  document.getElementById('new_exgoals_content_conference_ID').value = new_exgoals_content_conference_ID;
	  }
	  if(document.getElementById('new_exgoals_content_tags') != null){
		  document.getElementById('new_exgoals_content_tags').value = new_exgoals_content_tags;
	  }
	  if(document.getElementById('new_exgoals_content_date_str') != null){
		  document.getElementById('new_exgoals_content_date_str').value = new_exgoals_content_date_str;
	  }
	  if(document.getElementById('new_exgoals_content_seq') != null){
		  document.getElementById('new_exgoals_content_seq').value = new_exgoals_content_seq;
	  }
	  $("#create_new_exgoals_content_button").removeClass("hidden");
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_request_content_links"){
      if(responseJson.make_change){
  		  console.log("Was\n\n" + document.getElementById("new_exgoals_content_textarea").value)
		  console.log("Convert to \n\n" + responseJson.txt_with_links)
		  var obj = document.getElementById("new_exgoals_content_textarea")
		  obj.value = responseJson.txt_with_links
		  generic_edit_new_exgoals_content(obj, "content");
	  }
	  else{
		  console.log("Edit not auto-approved")
	  }
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_create_new_exgoals_intro"){
	  if(responseJson.success){
		misc.admin_intro_laxref_content_created = 1;
		misc.admin_intro_laxref_content_text = responseJson.txt;
		misc.admin_intro_publish_date = "Publish with the newsletter on " + responseJson.date_str;
		
		$("#create_new_exgoals_intro_button").addClass("hidden");
		$("#new_exgoals_intro_date_str").addClass("hidden");
	  }
	  display_exgoals_intro();
  }  
  else if ('tag' in responseJson && responseJson.tag == "admin_gpt_create_new_exgoals_content"){
	  
	  if(responseJson.success){
		misc.admin_content_laxref_content_created = 1;
		misc.admin_content_laxref_content_text = responseJson.txt;
		misc.admin_content_laxref_content_date_str = responseJson.date_str;
		misc.admin_content_laxref_content_audience_recommended = responseJson.audience_recommended;
		misc.admin_content_laxref_content_subscriber_lists = responseJson.subscriber_lists;
		misc.admin_content_laxref_content_team_ID = responseJson.team_ID;
		misc.admin_content_laxref_content_game_ID = responseJson.game_ID;
		misc.admin_content_laxref_content_conference_ID = responseJson.conference_ID;
		misc.admin_content_laxref_content_player_ID = responseJson.player_ID;
		misc.admin_content_laxref_content_analysis= responseJson.analysis;
		misc.admin_content_laxref_content_summary_header = responseJson.summary_header;
		misc.admin_content_laxref_content_tags = responseJson.tags;
		misc.admin_content_laxref_content_highlighted_text = responseJson.highlighted_text;
		misc.admin_content_laxref_content_summary_teaser = responseJson.summary_teaser;
		misc.admin_content_laxref_content_summary_teaser = responseJson.is_intro;
		misc.admin_content_laxref_content_league_tag = responseJson.league_tag;
		misc.admin_content_laxref_content_exclude_league_tag = responseJson.exclude_league_tag;
		misc.admin_content_laxref_content_survey_ID = responseJson.survey_ID;
		misc.admin_content_publish_date = "Publish with the newsletter on " + responseJson.date_str;
		misc.admin_survey_obj = responseJson.survey_obj;
		
		$("#create_new_exgoals_content_button").addClass("hidden");
		$("#new_exgoals_content_date_str").addClass("hidden");
		
	  }
	  display_exgoals_unpublished_content();
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "immaculate_grid_make_choice"){
	  ig_reveal_answer(responseJson);
  }
  else if ('tag' in responseJson && responseJson.tag == "immaculate_grid_request_reminder_email"){

	if(responseJson.email_scheduled){
		$("#transition_message_send_confirmation_email_span").empty();
		$("#transition_message_send_confirmation_email_span").append(responseJson.msg);
		$("#transition_message_send_confirmation_email").addClass("shown");	
	}
	else if('msg' in responseJson && [null, ''].indexOf(responseJson.msg) == -1){
		
		$("#transition_message_send_confirmation_email_span").empty();
		$("#transition_message_send_confirmation_email_span").append(responseJson.msg);
		$("#transition_message_send_confirmation_email").addClass("shown");
		
	}
	else{
		$("#subscribe_button").removeClass('hidden')

		$("#transition_message_submit_error_span").empty();
		$("#transition_message_submit_error_span").append(responseJson.error_msg);
		$("#transition_message_submit_error").addClass("shown");
		
	}
  } 
  else if ('tag' in responseJson && responseJson.tag == "get_immaculate_grid_daily_report"){
	misc.game_results = responseJson.results;
	misc.game_options = responseJson.options;
	misc.my_rarity_percentile = responseJson.my_rarity_percentile;
	populate_daily_report_container_div()
  }
  else if ('tag' in responseJson && responseJson.tag == "send_expected_goals_confirmation_email"){
	misc.LUI = responseJson.LUI;
	
	if(responseJson.email_sent){
		// Unhide the team specification controls, if they exist
		if(responseJson.control_seq == 1){
			if(document.getElementById("eg_subscribe_content_select_div") != null){
				$("#eg_subscribe_content_select_div").removeClass("hidden");
			}
		}
		else if(responseJson.control_seq == 2){
			if(document.getElementById("eg_subscribe_content_select_div2") != null){
				$("#eg_subscribe_content_select_div2").removeClass("hidden");
			}
		}
		
		if(responseJson.control_seq == 1){
			$("#transition_message_send_confirmation_email").addClass("shown");
		}
		else{
			$("#transition_message_send_confirmation_email2").addClass("shown");
		}
	}
	else if('msg' in responseJson && [null, ''].indexOf(responseJson.msg) == -1){
		if(responseJson.control_seq == 1){
			$("#transition_message_send_confirmation_email_span").empty();
			$("#transition_message_send_confirmation_email_span").append(responseJson.msg);
			$("#transition_message_send_confirmation_email").addClass("shown");
		}
		else{
			$("#transition_message_send_confirmation_email_span2").empty();
			$("#transition_message_send_confirmation_email_span2").append(responseJson.msg);
			$("#transition_message_send_confirmation_email2").addClass("shown");
		}
	}
	else{
		$("#subscribe_button").removeClass('hidden')
		$("#subscribe_button2").removeClass('hidden')
	    if(responseJson.control_seq == 1){
			$("#transition_message_submit_error_span").empty();
			$("#transition_message_submit_error_span").append(responseJson.error_msg);
			$("#transition_message_submit_error").addClass("shown");
		}
		else{
			$("#transition_message_submit_error_span2").empty();
			$("#transition_message_submit_error_span2").append(responseJson.error_msg);
			$("#transition_message_submit_error2").addClass("shown");
		}
	}
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "send_expected_goals_feedback"){

	
	if(responseJson.msg_sent){
		// Unhide the team specification controls, if they exist
		$("#feedback_submit_error_div").empty();
		$("#feedback_submit_msg_div").empty();
		$("#feedback_submit_error_div").addClass("hidden");
		$("#feedback_submit_msg_div").removeClass("hidden");
		$("#feedback_submit_msg_div").append("<span class='msg blue font-15 contents'>Thank you for your feedback. It's officially in our inbox. I read every single one of these, so expect a response soon.</span>");
		
	}
	else{
		$("#feedback_submit_error_div").empty();
		$("#feedback_submit_msg_div").empty();
		$("#feedback_submit_error_div").removeClass("hidden");
		$("#feedback_submit_msg_div").addClass("hidden");
		$("#feedback_submit_error_div").append("<span class='error font-15 contents'>Something happened. I'm not sure what went wrong. If you want to make sure we get your feedback, you can try to submit it again <a href='/contact'>here</a>.</span>");
	}
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "convert_content_to_different_format"){
	  const el = document.createElement('textarea');
	  
	  el.value = responseJson.converted_txt;
	  
	  document.body.appendChild(el);
	  el.select();
	  document.execCommand('copy');
	  document.body.removeChild(el);
	el.setAttribute('readonly', '');
	el.select();
	document.execCommand('copy');
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_find_newsletter_content_history"){
	  if(responseJson.error_msg == null){
		  //misc.admin_llm_queue.push(responseJson.new_queue_item);
		  $("#subject_history_" + responseJson.subject_type + "_error_div").addClass("hidden");
		  $("#subject_history_" + responseJson.subject_type + "_msg_div").removeClass("hidden");
		  $("#subject_history_" + responseJson.subject_type + "_msg_div").append("<span class='font-12 site-blue'>" + responseJson.msg + "</span>");

		  var html = "";
		  for(var a = 0;a<responseJson.db_results.length;a++){ var res = responseJson.db_results[a];
			html += "<div class='" + (a < responseJson.db_results.length-1 ? "bbottom":"") + " light'>"
				html += "<div class='' title='ID #" + res.ID + "'><a href='https://pro.lacrossereference.com/expected-goals/" + res.view_online_url + "'><span class='font-18'>" + res.summary_header + "</span></a></div>"
				html += "<div class=''><span class='font-15'>" + res.publish_date_str + "</span></div>"
				html += "<div class=''><span class='font-12'>" + res.summary_teaser + "</span></div>"
			html += "</div>"
		  }
		  $("#subject_history_results").append(html);
	  }
	  else{
		  $("#subject_history_" + responseJson.subject_type + "_error_div").removeClass("hidden");
		  $("#subject_history_" + responseJson.subject_type + "_msg_div").addClass("hidden");
		  $("#subject_history_" + responseJson.subject_type + "_error_div").append(responseJson.error_msg);	
	  }
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_llm_remove_subject_from_queue"){
	setTimeout(function(){ filters.analysis_name=null; refresh_upcoming_content(misc.arg_dt); }, 1000);
  }
  else if ('tag' in responseJson && responseJson.tag == "remove_planned_analyses_from_queue_JSON"){
	setTimeout(function(){ refresh_upcoming_content(misc.arg_dt); }, 1000);
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_cockpit_admin_llm_add_subject_to_queue"){
	  if(responseJson.error_msg == null){
		  
	  }
	  else{
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_error_div").removeClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_msg_div").addClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_error_div").append(responseJson.error_msg);	
	  }
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_llm_add_subject_to_queue"){
	  if(responseJson.error_msg == null){
		  
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_error_div" + responseJson.game_ID).addClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_msg_div" + responseJson.game_ID).removeClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_msg_div" + responseJson.game_ID).append("<span class='font-12 site-blue'>" + responseJson.msg + "</span>");	
		  setTimeout(function(){ refresh_upcoming_content(misc.arg_dt); }, 1500);		
	  }
	  else{
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_error_div" + responseJson.game_ID).removeClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_msg_div" + responseJson.game_ID).addClass("hidden");
		  $("#add_to_llm_queue_" + responseJson.subject_type + "_error_div" + responseJson.game_ID).append(responseJson.error_msg);	
	  }
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "get_team_npi_or_rpi_projections_data"){
      misc.npi_or_rpi_projections_data_available[misc.data.npi_or_rpi_metric] = 1;
      //misc.extra_data.all_teams_laxelo_history = responseJson.data;
	  misc.data.npi_or_rpi_projections_data = reinflate_generic_obj(responseJson.npi_or_rpi_projections_data.data);
	  
	  $("#npi_or_rpi_projections_loading_div").addClass("hidden");
	  if(responseJson.npi_or_rpi_projections_data.error_msg != null){
		 $("#npi_or_rpi_projections_div").empty();
		 $("#npi_or_rpi_projections_div").append("<span class='contents error font-15'>" + responseJson.npi_or_rpi_projections_data.error_msg + "</span>");
		 
	  }
	  else{
			misc.data.prob_positive_metric = responseJson.npi_or_rpi_projections_data.prob_positive_metric;
			misc.data.schedule_analysis_year = responseJson.schedule_analysis_year;
		    misc.data.npi_or_rpi_fname = responseJson.fname;
		    misc.data.npi_or_rpi_metric = responseJson.metric;
			misc.data.NPI_RPI_rankings = responseJson.NPI_RPI_rankings;
			misc.data.schedule_decisions = responseJson.schedule_decisions;
			display_npi_or_rpi_projections();
	  }
  
  } 
  
  else if ('tag' in responseJson && (responseJson.tag == "get_player_watch_list_data" || responseJson.tag == "add_single_player_watch_list_status_and_refresh")){
      misc.player_watch_list_data_available = 1;
	  console.log("returned from get_player_watch_list_data (or add_single_player_watch_list_status_and_refresh)...")
	  $("#player_watch_list_loading_div").addClass("hidden");
	  
	  elem = $("#player_watch_list_control_percentiles_vs_raw_div"); elem.empty()
	  // Add the controls to toggle and what NOT
	  toggle = {'font_size': 11, 'val': misc.player_watch_list_percentiles_versus_raw == "percentiles" ? 1 : 0, 'id': "player_watch_list_control_percentiles_vs_raw_div", 'text_align': 'right', 'start_label': 'Ranks', 'end_label': "Raw"};
      display_inside_toggle(toggle, "player_watch_list_control_percentiles_vs_raw_div", {'max_text_width': 20, 'chart_size': 'small', 'class': 'player-watch-list-control-percentiles-vs-raw-div', 'width': 191, 'height': 30});
	  
	  if(responseJson.player_watch_list.error_msg != null){
		 $("#full_player_watch_list_div").empty();
		 $("#full_player_watch_list_div").append("<span class='contents error font-15'>" + responseJson.player_watch_list.error_msg + "</span>");
		 
	  }
	  else{
			misc.data.player_watch_list = responseJson.player_watch_list.data;
			if(misc.data.player_watch_list != null && misc.data.player_watch_list.length > 0){
				$("#player_watch_list_controls_div").removeClass("hidden");
			}
			misc.watch_list_player_IDs = responseJson.player_watch_list.watch_list_player_IDs;
			if(!('extra_data' in misc)){ misc.extra_data = {}; }
			misc.extra_data.db_players = responseJson.player_watch_list.db_players;
			misc.data.player_watch_list_last_games = responseJson.player_watch_list.player_watch_list_last_games;
			// Add the opponent and formatting information
			misc = format_player_watch_list_last_games(misc)
			
			display_player_watch_list();
	  }
  
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "get_team_statistical_benchmark_data"){
      misc.benchmark_data_available = 1;
      //misc.extra_data.all_teams_laxelo_history = responseJson.data;
	  misc.data.peers_comparison = responseJson.peers_comparison;
	  misc.league_averages = responseJson.league_averages;
	  misc.data_buckets = responseJson.data_buckets;
	  $("#statistical_comparison_loading_div").addClass("hidden");
      if(typeof display_next_game_benchmark != "undefined"){ display_next_game_benchmark(); }
  
  }  
  
  else if ('tag' in responseJson && responseJson.tag == "get_team_my_schedule_auto_scout_info"){
      
	  console.log("returning from get_team_my_schedule_auto_scout_info")
	  $("#next_game_auto_scout_div").empty(); 
	  if(responseJson.auto_scout_data == null){
		  
	  }
	  else if('error' in responseJson.auto_scout_data){
		  
	  }
	  else{
		  console.log("Find game with ID " + misc.data.next_game.ID);
		  console.log(responseJson.auto_scout_data.games);
		  misc.auto_scout_data = responseJson.auto_scout_data
		  misc.auto_scout_data.next_game = null;
		  tmp = responseJson.auto_scout_data.games.filter(r=> r.game_ID==misc.data.next_game.ID);
		  if(tmp.length > 0){
			  misc.auto_scout_data.next_game = tmp[0];
			  console.log("misc.auto_scout_data.next_game"); console.log(misc.auto_scout_data.next_game);
		  }
		  
		  if(misc.auto_scout_data.next_game != null){
		  
			  draw_auto_scout_for_next_game();
		  }
		  else{
			  $("#next_game_auto_scout_div").empty()
			  $("#next_game_auto_scout_div").append("<div class='no-padding col-12 error' style='padding-top:10px;'><span class='font-15 contents lh-24' style='padding-left: 10px;'>The Auto-Scout Google Doc has not been created for your next game yet. Admins have been notified.</span></div>");
			  
			  report_js_visualization_issue(misc.target_template + "|misc.auto_scout_data.next_gameWasNull|" + misc.nhca);
		  }
          draw_auto_scout_settings();
		  
		  //if(typeof display_next_game_benchmark != "undefined"){ display_next_game_benchmark(); }
	  }
  }  
  else if ('tag' in responseJson && responseJson.tag == "request_league_schedule_data"){
	  tmp_league = "NCAA " + responseJson.league_tag.toUpperCase();
	  if(tmp_league.endsWith("M")){ tmp_league = tmp_league.replace("M", " Men"); }
	  if(tmp_league.endsWith("W")){ tmp_league = tmp_league.replace("W", " Women"); }
	  misc.leagues_loaded.push(responseJson.league_tag);
	  
	  tmp_teams = responseJson.teams
	  //console.log("resp teams"); console.log(tmp_teams)
	  tmp_teams = reinflate_generic_obj(tmp_teams)
	  //console.log("resp teams (post reinflation)"); console.log(tmp_teams)
	  misc.db_teams = misc.db_teams.concat(tmp_teams);
	  
	  
      tmp_games = responseJson.games
	  //console.log("resp games"); console.log(tmp_games)
	  
	  tmp_games = reinflate_generic_obj(tmp_games)
	  //console.log("resp tmp_games (post reinflation)"); console.log(tmp_games[0])
	  tmp_games = prep_games(tmp_games)
	  
	  //console.log("resp tmp_games (post reinflation)"); console.log(tmp_games[0])
	  
	  //console.log("misc.db_teams"); console.log(misc.db_teams)
	  //console.log("misc.all_games"); console.log(misc.all_games)
	  
	  // Remove the current version of the games we just pulled
	  misc.all_games = misc.all_games.filter(r=> r.league != tmp_league).concat(tmp_games);
	  
      if(typeof redraw != "undefined"){ redraw(); }
  
  }  
  else if ('tag' in responseJson && responseJson.tag == "edit_team_home_current_state_toggle_div"){

      
	  
      if(typeof my_state_summary != "undefined"){ 
		console.log("toggle_peer_grouping(" + peer_selection + ")");
		  
		misc.data.peers_comparison = responseJson.peers_comparison;
		my_state_summary(); 
	  }
	  else if(typeof display_benchmarking != "undefined"){ 
		  misc.data.peers_comparison = responseJson.peers_comparison;
		  display_benchmarking(); 
	  } 
	  else if(typeof draw_statistical_comparison != "undefined"){ 
		  
		  
		  misc.benchmark_data_available = 1;
		  //misc.extra_data.all_teams_laxelo_history = responseJson.data;
		  misc.data.peers_comparison = responseJson.peers_comparison;
		  misc.league_averages = responseJson.league_averages;
		  misc.data_buckets = responseJson.data_buckets;
		  $("#statistical_comparison_loading_div").addClass("hidden");
		  
		  draw_statistical_comparison(); 
	  }  
  }  
  else if ('tag' in responseJson && responseJson.tag == "team_get_laxelo_history"){
      misc.laxelo_data_pulled = 1;
      misc.extra_data.all_teams_laxelo_history = responseJson.data;
      if(typeof display_rankings != "undefined"){ display_rankings(); }
  
  }    
  else if ('tag' in responseJson && responseJson.tag == "get_league_rankings_data"){
	  
	  if(['d1w', 'd2w', 'd3w'].indexOf(responseJson.league_tag) > -1){ 
		misc.data.gender = "women"; 
	  }
	  else if(['d1m', 'd2m', 'd3m'].indexOf(responseJson.league_tag) > -1){ 
		misc.data.gender = "men"; 
	  }
      misc.extra_data.db_teams[responseJson.league_tag] = responseJson.data;
	  if(responseJson.data != null){
		console.log("[async] Returned " + responseJson.data.length + " team(s)")
	  }
	  else{
		  console.log("[async] Returned null")
	  }
	  if(misc.extra_data.db_teams[responseJson.league_tag].length > 0){
		if(typeof redraw != "undefined"){ redraw(); }
	  }
	  else{
		  $("#" + active_panel + "_div").empty();
		  $("#" + active_panel + "_div").append("<div class='centered col-12 error' style='padding-top:35px;'><span class=''>No team data found.</span></div>");
	  }
  
  }     
  else if ('tag' in responseJson && responseJson.tag == "basic_get_player_spotlight_data"){
      misc.player_data_requested = 1;
      misc.stat_keys = responseJson.stat_keys;
      misc.player_data = responseJson.data;
	  misc.player_data.game_log = reinflate_generic_obj(misc.player_data.game_log);
      player_ranks_stat_tag = {'season': 'EGA_per_game', 'career': 'EGA_per_game'};
      if(typeof display_player != "undefined"){ display_player("player"); }
  }   
  else if ('tag' in responseJson && responseJson.tag == "get_db_team_summaries"){
      misc.db_team_summaries_requested = 1;
      misc['extra_data']['db_team_game_summaries'] = responseJson.data;
      if(typeof display_stats != "undefined"){ display_stats("stats"); }
  }   
     
  else if ('tag' in responseJson && responseJson.tag == "team_get_db_team_summaries"){
      misc.db_team_summaries_requested = 1;
      misc['extra_data']['db_team_game_summaries'] = responseJson.data;
      console.log("Display: " + responseJson.unit);
      console.log(typeof display_primary_unit != "undefined");
      if(responseJson.unit == "offense" && typeof display_primary_unit != "undefined"){  display_primary_unit("offense", "offensive_ranks"); }
      if(responseJson.unit == "defense" && typeof display_primary_unit != "undefined"){  display_primary_unit("defense", "defensive_ranks"); }
      if(responseJson.unit == "faceoffs" && typeof display_faceoffs != "undefined"){  display_faceoffs("faceoffs", "faceoffs_ranks"); }
      if(responseJson.unit == "goalkeepers" && typeof display_goalkeepers != "undefined"){  display_goalkeepers("goalkeepers", "goalkeepers_ranks"); }
  }  
  else if ('tag' in responseJson && responseJson.tag.indexOf("team_scheduler_simulate_unknowns") > -1){
      
	  $("#simulation_running_msg_div").addClass("hidden");
	  display_simulation_results(responseJson);
		  
  }   
  else if ('tag' in responseJson && responseJson.tag.indexOf("team_scheduler_") > -1){
      if('settings' in responseJson && responseJson.settings != null){
		  console.log("Return settings from backend:");
		  console.log(responseJson.settings);
		  
		  misc.data.settings = responseJson.settings;
	  }
  }  
  
  else if ('tag' in responseJson && responseJson.tag == "basic_get_laxelo_history"){
      misc.laxelo_data_pulled = 1;
      misc.extra_data.all_teams_laxelo_history = responseJson.data;
      if(typeof display_laxelo_chart != "undefined"){ display_laxelo_chart(); }
  
  } 
  
  else if ('tag' in responseJson && responseJson.tag == "gpt_request_automated_content_summary"){
      
      misc.automated_content_summary = responseJson.automated_content_summary;
      misc.automated_content_types = responseJson.automated_content_types;
      if(typeof display_automated_content != "undefined"){ display_automated_content(); }
  
  }   
  else if ('tag' in responseJson && responseJson.tag == "admin_active_users_user_data"){
      user_activity_data = responseJson;
      display_user_activity();
  
  }  
  else if ('tag' in responseJson && responseJson.tag == "team_get_game_shots_for_charting"){
	  misc.data.shots = responseJson.shots_data;
	  //console.log("859: " + misc.data.shots[0].custom_tags_data.length);
      misc.data.customization_data = responseJson.customization_data;
	  if(!('custom_tags' in misc.data.customization_data)){
		  misc.data.customization_data.custom_tags = [
		  {'tag_seq': 1, 'tag': "UPTH", 'name': "Up-the-hash", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 2, 'tag': "SOTR", 'name': "Sweeping shot OTR", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 3, 'tag': "ALLY", 'name': "Alley-Dodge", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 4, 'tag': "RLBK", 'name': "Rollback", 'category': null}
		  , {'tag_seq': 5, 'tag': "GRBG", 'name': "Garbage Goal", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 6, 'tag': "STWN", 'name': "Step-down", 'category': "Shot Type"}
		  , {'tag_seq': 7, 'tag': "CSHT", 'name': "Catch&Shoot", 'category': "Shot Type"}
		  ]
		  misc.data.customization_data.custom_tags = [];
		  
	  }
	  
	  //console.log("875: " + misc.data.shots[0].custom_tags_data.length);
	  //console.log("From JSON settings"); console.log(responseJson.user_sc_settings_data)
	  misc.data.user_sc_settings_data = responseJson.user_sc_settings_data;
	  // Default settings for summary table
	  if(!('summary_rows_tag' in misc.data.user_sc_settings_data) || [null, ''].indexOf(misc.data.user_sc_settings_data.summary_rows_tag) > -1){
		 misc.data.user_sc_settings_data.summary_rows_tag = "is_off_dodge";
	  }
	  if(!('summary_columns_tag' in misc.data.user_sc_settings_data) || [null, ''].indexOf(misc.data.user_sc_settings_data.summary_columns_tag) > -1){
		 misc.data.user_sc_settings_data.summary_columns_tag = "offensive_set";
	  }
	  
	  
	  //console.log("team_get_game_shots_for_charting.response");
      var tmp_shot = null;
      for(var a = 0;a<misc.data.shots.length;a++){ tmp_shot = misc.data.shots[a];
		tmp_shot.is_active = (a == 0 ? 1 : 0);
		tmp_field = tmp_shot.data.filter(r=> r.tag == "field_loc_x");
		tmp_goal = tmp_shot.data.filter(r=> r.tag == "goal_loc_x");
		
        tmp_shot.is_field_plotted = tmp_field.length > 0 && tmp_field[0].val != null ? 1 : 0;
        tmp_shot.is_goal_plotted = tmp_goal.length > 0 && tmp_goal[0].val != null ? 1 : 0;
		
		
		tmp_def_scheme = tmp_shot.data.filter(r=> r.tag == "def_scheme");
		tmp_shot.is_def_scheme_entered = tmp_def_scheme.length > 0 && tmp_def_scheme[0].val != null ? 1 : 0;
		
		
		tmp_offensive_set = tmp_shot.data.filter(r=> r.tag == "offensive_set");
		tmp_shot.is_offensive_set_entered = tmp_offensive_set.length > 0 && tmp_offensive_set[0].val != null ? 1 : 0;
		
		tmp_is_transition = tmp_shot.data.filter(r=> r.tag == "is_transition");
		tmp_shot.is_is_transition_entered = tmp_is_transition.length > 0 && tmp_is_transition[0].val != null ? 1 : 0;
		
		tmp_clean_save = tmp_shot.data.filter(r=> r.tag == "clean_save");
		tmp_shot.is_clean_save_entered = tmp_clean_save.length > 0 && tmp_clean_save[0].val != null ? 1 : 0;
		
		tmp_is_off_dodge = tmp_shot.data.filter(r=> r.tag == "is_off_dodge");
		tmp_shot.is_is_off_dodge_entered = tmp_is_off_dodge.length > 0 && tmp_is_off_dodge[0].val != null ? 1 : 0;
		tmp_shot.is_off_dodge = tmp_shot.is_is_off_dodge_entered ? tmp_is_off_dodge[0].val : null;
		
		tmp_shot_quality = tmp_shot.data.filter(r=> r.tag == "shot_quality");
		tmp_shot.is_shot_quality_entered = tmp_shot_quality.length > 0 && tmp_shot_quality[0].val != null ? 1 : 0;
		tmp_shot.shot_quality = tmp_shot.is_shot_quality_entered ? parseInt(tmp_shot_quality[0].val) : null;
		
		tmp_is_right_handed = tmp_shot.data.filter(r=> r.tag == "is_right_handed");
		tmp_shot.is_is_right_handed_entered = tmp_is_right_handed.length > 0 && tmp_is_right_handed[0].val != null ? 1 : 0;
		
		
      }
          
		  
	  for(var a = 0;a<misc.data.customization_data.offensive_sets.length;a++){ var tmp = misc.data.customization_data.offensive_sets[a];
		var tmp_keys = ['name', 'abbreviation', 'desc'];
		for(var b =0;b<tmp_keys.length;b++){ var k = tmp_keys[b];
			tmp[k + '_lower'] = tmp[k].toLowerCase();
			tmp[k + "_lower_no_spaces"] = tmp[k].toLowerCase();
			
			while(tmp[k + "_lower_no_spaces"].indexOf(" ") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace(" ", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("-") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("-", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("'") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("'", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("\"") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("\"", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf(")") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace(")", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("(") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("(", ""); }
		}
	  }
	  //console.log("misc.data.customization_data.offensive_sets"); console.log(misc.data.customization_data.offensive_sets);
	  misc.shots_requested = 1;
      current_shot_ID = misc.data.shots[0].ID;
	  display_charting();
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "set_team_practice_date_for_shot_charting"){
      misc.practice_ID = responseJson.practice_ID;
	  display_charting();

  }
  
  else if ('tag' in responseJson && responseJson.tag == "practice_charting_delete_shot_by_ID"){
	
	 removed_shot_ID = responseJson.practice_shot_ID;
	 all_shot_IDs_for_this_session = all_shot_IDs_for_this_session.filter(r=> r != removed_shot_ID);
	 console.log("pre-pop"); console.log(JSON.stringify(misc.data.shots));
	 tmp_cleared_shot = misc.data.shots.filter(r=> r.ID == removed_shot_ID)[0];
	 shot_charting_specs.shots = shot_charting_specs.shots.filter(r=> r.ID != removed_shot_ID);
	 misc.data.shots = misc.data.shots.filter(r=> r.ID != removed_shot_ID);
	 console.log("Removed shot"); console.log(tmp_cleared_shot);
	 console.log("post-pop"); console.log(JSON.stringify(shot_charting_specs.shots));
	 
	 //shot_charting_specs.shots.pop();
	
	 // Go back to the previous shot
	 current_shot_ID = null;
	 if (all_shot_IDs_for_this_session.length > 0){
		current_shot_ID = all_shot_IDs_for_this_session[all_shot_IDs_for_this_session.length - 1];
	 }
	 console.log("Last shot ID: " + current_shot_ID)
	 
	 
	 // Hide or show the delete button
	 if(shot_charting_specs.shots.length == 0){
		 $("#remove_current_shot_from_database_button").addClass("hidden");
	 }
	 else{
		 $("#remove_current_shot_from_database_button").removeClass("hidden");
	 }
	 
	 // Clear out the Inputs
	 clear_new_shot_inputs(); // Clears the three input fields.
	 toggle_add_shot_in_progress();
	 
	 circles_to_clear = d3.selectAll("circle[shot_ID='" + tmp_cleared_shot.ID + "']").remove();
	 lines_to_clear = d3.selectAll("line[shot_ID='" + tmp_cleared_shot.ID + "']").remove();
	 disperse_shot_list_svg_objects();
	 
	 shot_charting_feature_display_shot(current_shot_ID);
	 
  }
  else if ('tag' in responseJson && responseJson.tag == "practice_charting_add_new_shot"){
		
	  responseJson.shot.seq = misc.data.next_practice_shot_seq;
	  responseJson.shot.x = misc.data.next_practice_shot_seq;
	  current_shot_ID = responseJson.shot.ID;
	  all_shot_IDs_for_this_session.push(current_shot_ID);
	  responseJson.shot.custom_tags_data = [];
	  responseJson.shot.data = [];
	  responseJson.shot.is_active = 1;
	  responseJson.shot.shot_quality = null;
	  responseJson.shot.this_practice = 1;
	  responseJson.shot.selected = 1;
	  if(responseJson.shot['goal']){
			responseJson.shot['shot_result'] = "goal"
	  }
	  else if(!responseJson.shot['goal'] && responseJson.shot['on_keeper']){
			responseJson.shot['shot_result'] = "save"
	  }
	  else if(!responseJson.shot['goal'] && ! responseJson.shot['on_keeper']){
			responseJson.shot['shot_result'] = "miss"
	  }
                                

	  // Update the one-click information
	  tmp_today_shots = shot_charting_specs.shots.filter(r=> r.this_practice);
	  today_shooters = [
		  ...new Map(
			tmp_today_shots.map(shot => [shot.shooter_jersey, { shooter_jersey: shot.shooter_jersey }])
		  ).values()
		];
	  for(var a = 0;a<today_shooters.length;a++){ var tmp_rec = today_shooters[a];
		tmp_rec.n_today_shots = tmp_today_shots.filter(r=> r.shooter_jersey == tmp_rec.shooter_jersey).length; 
	  }
	  today_shooters = today_shooters.filter(r=> r.n_today_shots > 3).slice(0,5);
	  today_shooters.sort(function(a, b){ return b.n_today_shots - a.n_today_shots; });
		
	  today_goalies = [
		  ...new Map(
			tmp_today_shots.filter(r=> r.goalie_jersey != null).map(shot => [shot.goalie_jersey, { goalie_jersey: shot.goalie_jersey }])
		  ).values()
		];
	  for(var a = 0;a<today_goalies.length;a++){ var tmp_rec = today_goalies[a];
		tmp_rec.n_today_shots = tmp_today_shots.filter(r=> r.goalie_jersey == tmp_rec.goalie_jersey).length; 
	  }
	  today_goalies = today_goalies.filter(r=> r.n_today_shots > 3).slice(0,5);
	  today_goalies.sort(function(a, b){ return b.n_today_shots - a.n_today_shots; });
	  
	  console.log("Today Goalies"); console.log(today_goalies);
	  console.log("Today Shooters"); console.log(today_shooters);
	  for(var a = 0;a<today_shooters.length;a++){ var tmp_rec = today_shooters[a];
		  tmp_in_list = misc.data.oneClickShotJerseys.shooter_jersey.filter(r=> tmp_rec.shooter_jersey == r.shooter_jersey).length == 0 ? 0 : 1;
		  if(!tmp_in_list){
			  misc.data.oneClickShotJerseys.shooter_jersey.push({'shooter_jersey': tmp_rec.shooter_jersey, 'orig': 0})
		  }
	  }
	  
	  
	  for(var a = 0;a<today_goalies.length;a++){ var tmp_rec = today_goalies[a];
		  tmp_in_list = misc.data.oneClickShotJerseys.goalie_jersey.filter(r=> tmp_rec.goalie_jersey == r.goalie_jersey).length == 0 ? 0 : 1;
		  if(!tmp_in_list){
			  misc.data.oneClickShotJerseys.goalie_jersey.push({'goalie_jersey': tmp_rec.goalie_jersey, 'orig': 0})
		  }
	  }
	  add_shot_in_progress = 0; // Signifies that the add shot process was completed (even if the goalie jersey is still selected)
	  misc.data.next_practice_shot_seq += 1;
	  //shot_charting_specs.shots.push(responseJson.shot);
	  misc.data.shots.push(responseJson.shot);
	  
	  // --- Update Shooter Select ---
		var $shooterSelect = $("#select_on_shooter_ID");
		//console.log("\n\n$shooterSelect"); console.log($shooterSelect);
		if ($shooterSelect.length && [null, ''].indexOf(responseJson.shot.shooter_jersey) == -1) {
			var shooterName = responseJson.shot.shooter_jersey;
			var shooterID = responseJson.shot.shooter_jersey;
			//console.log(shooterID, shooterName)

			// Check if this shooter_ID already exists in the dropdown
			var shooterExists = $shooterSelect.find("option[value='" + shooterID + "']").length > 0;
			//console.log(shooterExists, shooterID != null)
			if (!shooterExists && shooterID != null) {
				// Add a new option dynamically
				$shooterSelect.append(
					$("<option>") .val(shooterID) .text(shooterName)
				);
			}
		}

		// --- Update Goalie Select (if one exists) ---
		var $goalieSelect = $("#select_on_goalie_ID");
		if ($goalieSelect.length && [null, ''].indexOf(responseJson.shot.goalie_jersey) == -1) {
			var goalieID = responseJson.shot.goalie_jersey;
			var goalieName = responseJson.shot.goalie_jersey;

			var goalieExists = $goalieSelect.find("option[value='" + goalieID + "']").length > 0;

			if (!goalieExists && goalieID != null) {
				$goalieSelect.append(
					$("<option>") .val(goalieID) .text(goalieName)
				);
			}
		}

      shot_charting_feature_add_circle_to_shot_list(responseJson.shot)
	  disperse_shot_list_svg_objects();
	  shot_charting_feature_display_shot(responseJson.shot.ID)
	  
	  
	  
	  
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "team_get_practice_shots_for_charting"){
      misc.data.shots = responseJson.shots_data;
	  misc.data.next_practice_shot_seq = responseJson.next_practice_shot_seq;
	  
	  //misc.data.customization_data = responseJson.customization_data;
	  
      misc.data.customization_data = responseJson.customization_data;
	  
	  if(!('custom_tags' in misc.data.customization_data)){
		  misc.data.customization_data.custom_tags = [
		  {'tag_seq': 1, 'tag': "UPTH", 'name': "Up-the-hash", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 2, 'tag': "SOTR", 'name': "Sweeping shot OTR", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 3, 'tag': "ALLY", 'name': "Alley-Dodge", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 4, 'tag': "RLBK", 'name': "Rollback", 'category': null}
		  , {'tag_seq': 5, 'tag': "GRBG", 'name': "Garbage Goal", 'category': "Shooter Trajectory"}
		  , {'tag_seq': 6, 'tag': "STWN", 'name': "Step-down", 'category': "Shot Type"}
		  , {'tag_seq': 7, 'tag': "CSHT", 'name': "Catch&Shoot", 'category': "Shot Type"}
		  ]
		  misc.data.customization_data.custom_tags = [];
		  
	  }
	  
	  
	  console.log("From JSON settings"); console.log(responseJson.user_sc_settings_data)
	  misc.data.user_sc_settings_data = responseJson.user_sc_settings_data;
	  // Default settings for summary table
	  if(!('summary_rows_tag' in misc.data.user_sc_settings_data) || [null, ''].indexOf(misc.data.user_sc_settings_data.summary_rows_tag) > -1){
		 misc.data.user_sc_settings_data.summary_rows_tag = "is_off_dodge";
	  }
	  if(!('summary_columns_tag' in misc.data.user_sc_settings_data) || [null, ''].indexOf(misc.data.user_sc_settings_data.summary_columns_tag) > -1){
		 misc.data.user_sc_settings_data.summary_columns_tag = "offensive_set";
	  }
	  
	  
	  //console.log("team_get_game_shots_for_charting.response");
      var tmp_shot = null;
      for(var a = 0;a<misc.data.shots.length;a++){ tmp_shot = misc.data.shots[a];
		tmp_shot.is_active = (a == 0 ? 1 : 0);
		tmp_field = tmp_shot.data.filter(r=> r.tag == "field_loc_x");
		tmp_goal = tmp_shot.data.filter(r=> r.tag == "goal_loc_x");
		
        tmp_shot.is_field_plotted = tmp_field.length > 0 && tmp_field[0].val != null ? 1 : 0;
        tmp_shot.is_goal_plotted = tmp_goal.length > 0 && tmp_goal[0].val != null ? 1 : 0;
		
		
		tmp_def_scheme = tmp_shot.data.filter(r=> r.tag == "def_scheme");
		tmp_shot.is_def_scheme_entered = tmp_def_scheme.length > 0 && tmp_def_scheme[0].val != null ? 1 : 0;
		
		tmp_offensive_set = tmp_shot.data.filter(r=> r.tag == "offensive_set");
		tmp_shot.is_offensive_set_entered = tmp_offensive_set.length > 0 && tmp_offensive_set[0].val != null ? 1 : 0;
		
		tmp_is_transition = tmp_shot.data.filter(r=> r.tag == "is_transition");
		tmp_shot.is_is_transition_entered = tmp_is_transition.length > 0 && tmp_is_transition[0].val != null ? 1 : 0;
		
		tmp_clean_save = tmp_shot.data.filter(r=> r.tag == "clean_save");
		tmp_shot.is_clean_save_entered = tmp_clean_save.length > 0 && tmp_clean_save[0].val != null ? 1 : 0;
		
		tmp_is_off_dodge = tmp_shot.data.filter(r=> r.tag == "is_off_dodge");
		tmp_shot.is_is_off_dodge_entered = tmp_is_off_dodge.length > 0 && tmp_is_off_dodge[0].val != null ? 1 : 0;
		tmp_shot.is_off_dodge = tmp_shot.is_is_off_dodge_entered ? tmp_is_off_dodge[0].val : null;
		
		tmp_shot_quality = tmp_shot.data.filter(r=> r.tag == "shot_quality");
		tmp_shot.is_shot_quality_entered = tmp_shot_quality.length > 0 && tmp_shot_quality[0].val != null ? 1 : 0;
		tmp_shot.shot_quality = tmp_shot.is_shot_quality_entered ? parseInt(tmp_shot_quality[0].val) : null;
		
		tmp_is_right_handed = tmp_shot.data.filter(r=> r.tag == "is_right_handed");
		tmp_shot.is_is_right_handed_entered = tmp_is_right_handed.length > 0 && tmp_is_right_handed[0].val != null ? 1 : 0;
		
		
      }   
	
	  for(var a = 0;a<misc.data.customization_data.offensive_sets.length;a++){ var tmp = misc.data.customization_data.offensive_sets[a];
		var tmp_keys = ['name', 'abbreviation', 'desc'];
		for(var b =0;b<tmp_keys.length;b++){ var k = tmp_keys[b];
			tmp[k + '_lower'] = tmp[k].toLowerCase();
			tmp[k + "_lower_no_spaces"] = tmp[k].toLowerCase();
			
			while(tmp[k + "_lower_no_spaces"].indexOf(" ") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace(" ", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("-") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("-", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("'") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("'", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("\"") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("\"", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf(")") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace(")", ""); }
			while(tmp[k + "_lower_no_spaces"].indexOf("(") > -1){ tmp[k + "_lower_no_spaces"] = tmp[k + "_lower_no_spaces"].replace("(", ""); }
		}
	  }
	  
	  //console.log("misc.data.customization_data.offensive_sets"); console.log(misc.data.customization_data.offensive_sets);
      misc.shots_requested = 1;
      current_shot_ID = null;
	  if(misc.data.shots.length > 0){
		  current_shot_ID = misc.data.shots[0].ID;
	  }
	  all_shot_IDs_for_this_session = misc.data.shots.map(shot => shot.ID);
	  
	  $("#back_to_practices_button").removeClass("hidden");
      display_charting();
	  
  }
  else if ('tag' in responseJson && responseJson.tag == "practice_team_get_nonpractice_shots_for_charting"){
      
	  //console.log("team_get_game_shots_for_charting.response");
	  summary_shots_pulled = 1;
      var tmp_shot = null;
      for(var a = 0;a<responseJson.shots_data.length;a++){ tmp_shot = responseJson.shots_data[a];
		tmp_shot.is_active = (a == 0 ? 1 : 0);
		tmp_field = tmp_shot.data.filter(r=> r.tag == "field_loc_x");
		tmp_goal = tmp_shot.data.filter(r=> r.tag == "goal_loc_x");
		
        tmp_shot.is_field_plotted = tmp_field.length > 0 && tmp_field[0].val != null ? 1 : 0;
        tmp_shot.is_goal_plotted = tmp_goal.length > 0 && tmp_goal[0].val != null ? 1 : 0;
		
		
		
		
		tmp_def_scheme = tmp_shot.data.filter(r=> r.tag == "def_scheme");
		tmp_shot.is_def_scheme_entered = tmp_def_scheme.length > 0 && tmp_def_scheme[0].val != null ? 1 : 0;
		
		tmp_offensive_set = tmp_shot.data.filter(r=> r.tag == "offensive_set");
		tmp_shot.is_offensive_set_entered = tmp_offensive_set.length > 0 && tmp_offensive_set[0].val != null ? 1 : 0;
		
		tmp_is_transition = tmp_shot.data.filter(r=> r.tag == "is_transition");
		tmp_shot.is_is_transition_entered = tmp_is_transition.length > 0 && tmp_is_transition[0].val != null ? 1 : 0;
		
		tmp_clean_save = tmp_shot.data.filter(r=> r.tag == "clean_save");
		tmp_shot.is_clean_save_entered = tmp_clean_save.length > 0 && tmp_clean_save[0].val != null ? 1 : 0;
		
		tmp_is_off_dodge = tmp_shot.data.filter(r=> r.tag == "is_off_dodge");
		tmp_shot.is_is_off_dodge_entered = tmp_is_off_dodge.length > 0 && tmp_is_off_dodge[0].val != null ? 1 : 0;
		tmp_shot.is_off_dodge = tmp_shot.is_is_off_dodge_entered ? tmp_is_off_dodge[0].val : null;
		
		tmp_shot_quality = tmp_shot.data.filter(r=> r.tag == "shot_quality");
		tmp_shot.is_shot_quality_entered = tmp_shot_quality.length > 0 && tmp_shot_quality[0].val != null ? 1 : 0;
		tmp_shot.shot_quality = tmp_shot.is_shot_quality_entered ? parseInt(tmp_shot_quality[0].val) : null;
		
		tmp_is_right_handed = tmp_shot.data.filter(r=> r.tag == "is_right_handed");
		tmp_shot.is_is_right_handed_entered = tmp_is_right_handed.length > 0 && tmp_is_right_handed[0].val != null ? 1 : 0;
		
      }
	  console.log("Adding " + responseJson.shots_data.length + " additional shots to the data set.")
      shot_charting_specs.shots = shot_charting_specs.shots.concat( responseJson.shots_data );  
	  shot_charting_specs.team_summary_counts = responseJson.team_summary_counts;
	  
	  // Now that we have the data appended to the existing data, re-run the display functions
	  shot_charting_feature_create_field_svg(id, shot_charting_specs, shot_charting_specs);
	  shot_charting_feature_create_goal_svg(id, shot_charting_specs, shot_charting_specs);
	  shot_charting_feature_summary_tags_controls(d3.select("#svg_objshot_charting_svg_entry_goal_location_div"))
	  shot_charting_feature_handle_clicks();
	  shot_charting_feature_display_shot(current_shot_ID);
	  // Applies the settings to which shots are shown, without actually changing any settings/filters
	  set_shot_charting_filters(null, null, 0);
	  
	  
	  // Create the roster since we aren't actually pulling this from the DB since these are just jersey numbers and not player records that tie to LaxRef_Player_Seasons
	  misc.data.popReport_Shooters_team_roster = [
		  ...new Map(
			shot_charting_specs.shots.map(shot => [shot.shooter_jersey, { shooter_jersey: shot.shooter_jersey }])
		  ).values()
		];
	  console.log(shot_charting_specs.shots);
	  for(var a = 0;a<misc.data.popReport_Shooters_team_roster.length;a++){ var tmp_rec = misc.data.popReport_Shooters_team_roster[a];
		tmp_shots = shot_charting_specs.shots.filter(r=> r.shooter_jersey == tmp_rec.shooter_jersey);
		tmp_rec.shots = tmp_shots.length;
		tmp_rec.goals = tmp_shots.filter(r=> r.goal).length;
		tmp_rec.on_goal_shots = tmp_shots.filter(r=> r.goal || r.on_goal).length;
		tmp_rec.sog_rate = tmp_rec.on_goal_shots / tmp_rec.shots
		tmp_rec.on_keeper_shots = tmp_shots.filter(r=> r.goal || r.on_keeper).length;
		tmp_rec.shooting_pct = tmp_rec.goals / tmp_rec.shots;
		tmp_rec.on_goal_shooting_pct = tmp_rec.on_keeper_shots == 0 ? null : (tmp_rec.goals / tmp_rec.on_keeper_shots);
		
	  }
	  console.log(misc.data.popReport_Shooters_team_roster );
	  
	  if(responseJson.request_type == "request_popReport_Shooters"){
	    populate_popReport_Shooters();
	  }
  }
  else if ('tag' in responseJson && responseJson.tag == "team_get_nongame_shots_for_charting"){
      
	  //console.log("team_get_game_shots_for_charting.response");
	  summary_shots_pulled = 1;
      var tmp_shot = null;
      for(var a = 0;a<responseJson.shots_data.length;a++){ tmp_shot = responseJson.shots_data[a];
		tmp_shot.is_active = (a == 0 ? 1 : 0);
		tmp_field = tmp_shot.data.filter(r=> r.tag == "field_loc_x");
		tmp_goal = tmp_shot.data.filter(r=> r.tag == "goal_loc_x");
		
        tmp_shot.is_field_plotted = tmp_field.length > 0 && tmp_field[0].val != null ? 1 : 0;
        tmp_shot.is_goal_plotted = tmp_goal.length > 0 && tmp_goal[0].val != null ? 1 : 0;
		
		
		tmp_def_scheme = tmp_shot.data.filter(r=> r.tag == "def_scheme");
		tmp_shot.is_def_scheme_entered = tmp_def_scheme.length > 0 && tmp_def_scheme[0].val != null ? 1 : 0;
		
		tmp_offensive_set = tmp_shot.data.filter(r=> r.tag == "offensive_set");
		tmp_shot.is_offensive_set_entered = tmp_offensive_set.length > 0 && tmp_offensive_set[0].val != null ? 1 : 0;
		
		tmp_is_transition = tmp_shot.data.filter(r=> r.tag == "is_transition");
		tmp_shot.is_is_transition_entered = tmp_is_transition.length > 0 && tmp_is_transition[0].val != null ? 1 : 0;
		
		tmp_clean_save = tmp_shot.data.filter(r=> r.tag == "clean_save");
		tmp_shot.is_clean_save_entered = tmp_clean_save.length > 0 && tmp_clean_save[0].val != null ? 1 : 0;
		
		tmp_is_off_dodge = tmp_shot.data.filter(r=> r.tag == "is_off_dodge");
		tmp_shot.is_is_off_dodge_entered = tmp_is_off_dodge.length > 0 && tmp_is_off_dodge[0].val != null ? 1 : 0;
		tmp_shot.is_off_dodge = tmp_shot.is_is_off_dodge_entered ? tmp_is_off_dodge[0].val : null;
		
		tmp_shot_quality = tmp_shot.data.filter(r=> r.tag == "shot_quality");
		tmp_shot.is_shot_quality_entered = tmp_shot_quality.length > 0 && tmp_shot_quality[0].val != null ? 1 : 0;
		tmp_shot.shot_quality = tmp_shot.is_shot_quality_entered ? parseInt(tmp_shot_quality[0].val) : null;
		
		tmp_is_right_handed = tmp_shot.data.filter(r=> r.tag == "is_right_handed");
		tmp_shot.is_is_right_handed_entered = tmp_is_right_handed.length > 0 && tmp_is_right_handed[0].val != null ? 1 : 0;
		
      }
	  console.log("Adding " + responseJson.shots_data.length + " additional shots to the data set.")
      shot_charting_specs.shots = shot_charting_specs.shots.concat( responseJson.shots_data );  
	  shot_charting_specs.team_summary_counts = responseJson.team_summary_counts;
	  
	  // Now that we have the data appended to the existing data, re-run the display functions
	  shot_charting_feature_create_field_svg(id, shot_charting_specs, shot_charting_specs);
	  shot_charting_feature_create_goal_svg(id, shot_charting_specs, shot_charting_specs);
	  shot_charting_feature_summary_tags_controls(d3.select("#svg_objshot_charting_svg_entry_goal_location_div"))
	  shot_charting_feature_handle_clicks();
	  shot_charting_feature_display_shot(current_shot_ID);
	  // Applies the settings to which shots are shown, without actually changing any settings/filters
	  set_shot_charting_filters(null, null, 0);
	  
	  if(responseJson.request_type == "request_popReport_Shooters"){
	    misc.data.popReport_Shooters_team_roster = responseJson.request_popReport_Shooters_team_roster;
		reinflate_request_popReport_Shooters_team_roster();
		populate_popReport_Shooters();
	  }
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_view_roster_edit_player_info"){
    $("#hometown_input" + responseJson.async_ID).removeClass("italic");
	console.log("admin_view_roster_edit_player_info response");
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_view_roster_edit_coach_info"){
    $("#listed_head_coach_input").removeClass("italic");
	console.log("admin_view_roster_edit_coach_info response");
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_cockpit_initiate_add_player_season_request"){
      add_player_background = responseJson;
      async_roster_data_game_ID = 0 + responseJson.game_ID;
      console.log("set async_roster_data_game_ID to " + async_roster_data_game_ID);
      display_player_record_to_roster_background();
  }
  
  else if ('tag' in responseJson && responseJson.tag == "request_auto_edit_for_content"){

	var orig_value = document.getElementById(responseJson.target_element_id).value;
	
	if(responseJson.n_auto_edits_made > 0){
		console.log("Deleting original content:\n\n" + orig_value)
		if(orig_value.length > responseJson.html.length + 200){
			console.log("Return HTML was more than 200 characters shorter than what was sent. That is suspicious. Was there an error?")
		}
		else{
			document.getElementById(responseJson.target_element_id).value = responseJson.html;
		}
	}
	else{
		console.log("No edits made");
	}
	
	
  }
  else if ('tag' in responseJson && responseJson.tag == "request_red_flag_analysis"){
	  
	  
	 
	 //console.log("let's format this...")
	 
	 var requests_per_year = null; // For the given task, if we were to do it for every team, how many requests would that be?
	 if(responseJson.PROMPT_CHOICE.indexOf("full-") > -1){ // All error red flags checked
		requests_per_year = 913;
	 }
	 else{
		requests_per_year = 913 * 7;
		 
	 }
	 total_red_flag_GPT_cost += responseJson.usage.cost;
	 
	 var cost_html = "<span class='contents'>Est. Annual Cost: $" + jsformat(responseJson.usage.cost * requests_per_year, "2") + "; cumulative: $" + jsformat(total_red_flag_GPT_cost, "2") + "</span>";
	 $("#red_flag_GPT_cost_div").empty(); $("#red_flag_GPT_cost_div").append(cost_html); 

	 // Display the grid of error counts
	 gpt_paragraphs = display_red_flag_output(responseJson, gpt_paragraphs)
	 misc.responseJson = responseJson;
	 
	 if(let_auto_edit_run){
		 if(let_auto_edit_run_paragraph_seqs_needing_revision.length > 0){ // There are still paragraphs that have triggered a red flag alert; call the first one and then let the async trigger the subsequent ones;
			console.log("request_auto_revisions(0, seq=" + responseJson.seq + ", paragraph_seq=" + let_auto_edit_run_paragraph_seqs_needing_revision[0] + ")")
			request_auto_revisions(0, responseJson.seq,  let_auto_edit_run_paragraph_seqs_needing_revision[0]);
		 }
	 }
	 
  }
  else if ('tag' in responseJson && responseJson.tag == "request_LLM_suggestion_for_content"){

	$("#request_LLM_summary_header" + responseJson.seq).removeClass("hidden");
	$("#request_LLM_summary_header" + responseJson.seq).empty()
	var html = "<div class='no-padding'>"
	if(responseJson.result.LLM_suggestions != null && responseJson.result.LLM_suggestions.length > 0){
		misc.LLM_suggestions = responseJson.result.LLM_suggestions
		// Display the parsed (and clickable) responses
		for(var a = 0;a<responseJson.result.LLM_suggestions.length; a++){ var tmp = responseJson.result.LLM_suggestions[a];
			html += "<div onclick='choose_LLM_option(" + tmp.seq + ", " + responseJson.seq + ");' class='flex no-padding'>";
				html += "<div class='col-11'><span class='font-12 contents'>" + tmp.content + "</span></div>"
			html += "</div>"
		}
	}
	else{
		// Just display the raw response
		html += "<span class='contents font-12'>";
		if('responses' in responseJson.result && responseJson.result.responses.length > 0){
			console.log("check 1")
			if('message' in responseJson.result.responses[0] && responseJson.result.responses[0].message != null){
				console.log("check 2")
				var tmp_html = responseJson.result.responses[0].message.content;
				console.log(responseJson.result.responses[0].message.content)
				while(tmp_html.indexOf("\n") > -1){ tmp_html = tmp_html.replace("\n", "<BR>"); }
				while(tmp_html.indexOf(" lacrosse") > -1){ tmp_html = tmp_html.replace(" lacrosse", " "); }
				while(tmp_html.indexOf(" Lacrosse") > -1){ tmp_html = tmp_html.replace(" Lacrosse", " "); }
				while(tmp_html.indexOf("lacrosse") > -1){ tmp_html = tmp_html.replace("lacrosse", ""); }
				while(tmp_html.indexOf("Lacrosse") > -1){ tmp_html = tmp_html.replace("Lacrosse", ""); }
				html += tmp_html;
			}
			
		}
		html += "</span>";
	}
	html += "</div>"
	$("#request_LLM_summary_header" + responseJson.seq).append(html);
	
  }
  else if ('tag' in responseJson && responseJson.tag == "laxref_gpt_add_to_content_table"){

	setTimeout(function(){ choose_left_menu_item('admin_llm_queue_menu_item'); refresh_upcoming_content(misc.arg_dt); window.location="#admin_llm_queue_unpublished_summary_container_div"; }, 500);	  
  }
	  
  else if ('tag' in responseJson && responseJson.tag == "download_bracket_graphic"){
      var img_html = '<img style="width:350px; height:350px; " value="' + responseJson.group_desc_str + '_img" id="download_bracket_graphic_preview_picture" src="data:image/jpeg;base64,' + responseJson.img_data + '">';
      $("#preview_graphic_div").empty();
      $("#preview_graphic_div").append(img_html);
      console.log("img_html appended");
      $("#claim_picks_div").removeClass("hidden");
      $("#download_graphic_button_div").removeClass("hidden");
  }  
  else if ('tag' in responseJson && responseJson.tag == "laxref_gpt_request_conversation"){
     console.log("returning laxref_gpt_request_conversation...");
	 
	 var resp_html = ""; var resp_text = "";
	 for(var a = 0;a<responseJson.responses.length;a++){ var tmp_resp = responseJson.responses[a];
		resp_html += a == 0 ? "": "<BR><BR>";
		resp_html += tmp_resp.message.content;
		
		resp_text += a == 0 ? "": "\n\n";
		resp_text += tmp_resp.message.content;
	 }
	 resp = {'type': 'response', 'gpt_panel': responseJson.gpt_panel, 'text': resp_text, 'html': resp_html, 'seq': gpt_log.length + 1, 'usage': responseJson.response_usage, 'responses': responseJson.responses}
	 gpt_log.push(resp)
	 if(responseJson.gpt_panel == "v1"){
		redraw_gpt_convo();
	 }
	 if(responseJson.gpt_panel == "v2"){
		gpt_head_to_head();
	 }
		 
  }  
  else if ('tag' in responseJson && responseJson.tag == "inserted_player_recap"){
      
      var g = misc.games.filter( r=> r.player_game_ID == responseJson.player_game_ID)[0];
      console.log(g)
      g.recap = {'recap': 'Removed', 'ID': responseJson.next_ID};
        
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_user_emails"){
	  
      user_email_data = responseJson;
      display_list_of_emails();
  
  } 
  else if ('tag' in responseJson && responseJson.tag == "refresh_admin_cockpit"){
      games = responseJson.data;
	  misc.machine_executions = responseJson.machine_executions;
	  misc.machines = responseJson.machines;
	  misc.games_by_status = responseJson.games_by_status;
	  misc.games_by_status_by_league = responseJson.games_by_status_by_league;
	  misc.get_admin_cockpit_elapsed_time = responseJson.get_admin_cockpit_elapsed_time;
	  misc.task_tags = responseJson.task_tags;
      console.log("Call display_cockpit...");
      display_cockpit();  
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_bot_scoring_refresh_data"){

	  misc.data[responseJson.analysis] = responseJson.analysis_data;
	  misc.last_chooser_bot_llm_model_rankings_load_datestamp = responseJson.last_chooser_bot_llm_model_rankings_load_datestamp;
	  misc.last_eliminator_bot_llm_model_rankings_load_datestamp = responseJson.last_chooser_bot_llm_model_rankings_load_datestamp;
	  
	  redraw()
	  $("#chooser_bot_llm_model_rankings_button_div").removeClass("hidden");
  } 
  else if ('tag' in responseJson && responseJson.tag == "scrape_schedule_html"){
      $("#read_button").removeClass("hidden");
      $("#read_in_progress").addClass("hidden");
        
      misc.schedule_url_html = responseJson.data;
      misc.server_games = responseJson.outer_rows;
      misc.removed_games = responseJson.removed_games;
      misc.db_missing_games = responseJson.db_missing_games;
      misc.top_domain = responseJson.top_domain;
      misc.outer_rows = responseJson.outer_rows;
	  
	  $("#parse_issues_div").empty();
	  
	  if([null, ''].indexOf(responseJson.schedule_parse_errors) == -1){
			$("#view_parse_issues_label").removeClass("hidden");
			$("#parse_issues_div").append(`<textarea rows=6 class='col-11'>${responseJson.schedule_parse_errors.replaceAll("\\n", "\n")}</textarea>`);
	  }
	  else{
			$("#view_parse_issues_label").addClass("hidden");
		  
	  }
	  
	  $("#elapsed_span").text(jsformat(responseJson.clean_schedule_html_elapsed, "4") + "s");
	  
	  
	  console.log("roa.outer_rows"); console.log(misc.outer_rows);
	  //console.log("roa.server_games"); console.log(misc.server_games);
      misc.schedule_regexes = responseJson.schedule_regexes;
      //console.log("Schedule HTML")
      //console.log(misc.schedule_url_html);
      console.log("Found " + responseJson.n_python_matches + " matches");
      misc.removed_games = responseJson.removed_games;
      console.log("n removed_games:    " + misc.removed_games.length);
      console.log("n db_missing_games: " + misc.db_missing_games.length);
      console.log("n outer_rows:       " + misc.outer_rows.length);
      console.log("n server_games:     " + misc.server_games.length);
      
	  misc.total_not_found_in_db = 0;
	  for(var a = 0;a<misc.server_games.length;a++){ var res = misc.server_games[a];
		if(!res.game_found_in_db && !res.is_postponed && !res.likely_co_located_game){
			misc.total_not_found_in_db += 1;
		}
      }
		
      draw_results();
  }
  else if ('tag' in responseJson && responseJson.tag == "admin_schedules_add_scheduled_game_to_database"){
      console.log("fdafas.admin_schedules_add_scheduled_game_to_database")
	  
	  if(responseJson.success && [null, ''].indexOf(responseJson.error) > -1){
		  
		  $("#gameRow_" + responseJson.current_seq).removeClass("on-mobile-game-row-to-add"); // Removes mobile styling designed to indicate a game still needs to be added to the DB
		  
		  $("#game_status" + responseJson.current_seq).empty();
		  $("#game_status" + responseJson.current_seq).append("<span class='font-15 bold site-blue no-padding'>ID=" + responseJson.game_ID + "</span>");
		  
		  tmp_game = misc.server_games.filter(r=> r.seq == responseJson.current_seq);
		  if(tmp_game.length == 0){
			  console.log("Couldn't find existing game to update")
			  
			  
		  }
		  else{
		      tmp_game[0].game_found_in_db = 1;
			  misc.current_server_game_seq = responseJson.next_seq;
			  
			  add_unstored_games_to_db();
		  }
	  }
  }
  else if ('tag' in responseJson && responseJson.tag == "practice_home_filter_on_drill"){
      misc['practice_data']['player_summary_stats'] = responseJson.data
      display_player_stats();
  }
  else if ('tag' in responseJson && responseJson.tag == "load_team_comparison_roster"){
      $("#read_button").removeClass("hidden");
      $("#read_in_progress").addClass("hidden");
	  console.log(responseJson);
        
      misc.roster = responseJson.roster.filter(r=> r.is_individual == 1);
      misc.coaches = responseJson.coaches;
      misc.listed_head_coach = responseJson.listed_head_coach;

      //console.log("Schedule HTML")
      //console.log(misc.schedule_url_html);
      console.log("Found " + misc.roster.length + " player roster record(s)");
      
      draw_results();
  }
  else if ('tag' in responseJson && responseJson.tag == "new_schedule_regex"){
      console.log("SUCCESS!!!");
      console.log(resultContainer);
      var tmp_id = responseJson.async_ID + "_result_img";
      //console.log("tmp_id: " + tmp_id);
      resultContainer.innerHTML = "<img class='async-result-img' id='" + tmp_id + "' src='/static/img/BlueCheckCircle240.png' style='height:15px;'>";
      console.log(responseJson);
      if(responseJson.is_container_regex){
        misc['schedule_regexes'].push({'status': 'active', 'regex_str': responseJson.regex_str, 'ID': responseJson.next_ID, 'is_container_regex': responseJson.is_container_regex});
      }
      else{
          misc['schedule_regexes'].push({'status': 'active', 'field_tag': responseJson.field_tag, 'html_source': responseJson.html_source, 'regex_str': responseJson.regex_str, 'ID': responseJson.next_ID, 'is_container_regex': responseJson.is_container_regex});
      }
      setTimeout(function(){ draw_outer_regexes(); draw_inner_regexes(); }, 4000);
      
  }
  else if ('tag' in responseJson && responseJson.tag == "refresh_team_data"){
      misc.data = responseJson.data;
      misc.extra_data = responseJson.extra_data;
      if(responseJson.active_panel == "roster"){
          $("#refreshing-bar").addClass("not-shown");
          console.log("Redraw the roster");
		  if('roster_list_and_keys' in misc.data){
				roster = misc.data.roster_list_and_keys;
				display_roster_list_and_keys("roster_overview_div", roster, roster_specs);
		  }
		  else{
				display_roster_list("roster_list_div", misc.data.roster, roster_specs)
		  }
          
      }
  }
  else if ('tag' in responseJson && responseJson.tag == "display_line_groupings"){
      misc.data.lines_data = responseJson;
      display_line_groupings("team_lines");
  } 
  else if ('tag' in responseJson && responseJson.tag == "edit_peers_data_via_panel"){
      misc.data.peers_comparison = responseJson.peers_comparison;
      if(typeof my_state_summary != "undefined"){ my_state_summary(); }
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_cockpit_request_team_rosters"){
      roster_data = responseJson.async_roster_data;
      roster_data_refresh_time = responseJson.refresh_time;
      if(typeof display_team_rosters_to_resolve_unidentified_players != "undefined"){ display_team_rosters_to_resolve_unidentified_players(); }
  }
  else if ('tag' in responseJson && responseJson.tag == "edit_team_benchmark_data_via_panel"){
      misc.data.peers_comparison = responseJson.peers_comparison;
      if(typeof display_benchmarking != "undefined"){ display_benchmarking(); }
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_usage_analytics_user_data"){
      misc.user_data = responseJson.data;
      
      if(typeof draw_power_users_table != "undefined"){ draw_power_users_table(); }
  }  
  else if ('tag' in responseJson && responseJson.tag == "edit_player_benchmark_data_via_panel"){
      misc.player_data.peers_comparison = responseJson.peers_comparison;
      
      if(typeof display_overview != "undefined"){ display_overview("benchmark"); }
  } 
  else if ('tag' in responseJson && responseJson.tag == "test_endpoint_token_combo"){
      $("#api_request_button").removeClass("hidden");
      misc.api_status_code = responseJson.api_status_code;
      misc.api_response = responseJson.api_response;
      display_api_test_results();
  } 
  else if ('tag' in responseJson && responseJson.tag == "admin_cockpit_add_player_season"){
      var tmp_res_ID = "result_msg_div" + responseJson.game_ID;
      $("#" + tmp_res_ID).empty();
      $("#" + tmp_res_ID).append("<span class='msg font-12 centered contents'>" + responseJson.result_msg + "</span>");
  } 
  else if ('tag' in responseJson && ["ADMRosterUtilities_lookup_char_to_ord"].indexOf(responseJson.tag) > -1){
	  $("#lookup_char_to_ord_div" + responseJson.action_seq).removeClass("hidden");
	  var table_html = "";
	  $("#lookup_char_to_ord_div" + responseJson.action_seq).empty();
	  table_html += "<div class='no-padding' id='lookup_char_to_ord_data_div" + responseJson.action_seq + "'>";
		  table_html += "<div class='flex bbottom bold font-15'>"
			table_html += "<div class='col-6'><span class='contents'>Char</span></div>"
			table_html += "<div class='col-6'><span class='contents'>ASCII/ORD</span></div>"
		  table_html += "</div>";
		  if(responseJson.ords != null){
			  for(var a = 0;a<responseJson.ords.length;a++){
				  table_html += "<div class='flex bbottom very-light font-15'>"
					table_html += "<div class='col-6'><span class='contents'>" + responseJson.ords[a].char_val + "</span></div>"
					table_html += "<div class='col-6'><span class='contents'>" + responseJson.ords[a].ord_val + "</span></div>"
				  table_html += "</div>";
			  }
		  }
	  table_html += "</div>";
	  $("#lookup_char_to_ord_div" + responseJson.action_seq).append(table_html);
	  
  }
  else if ('tag' in responseJson && ["ADMRosterUpdates_runAll", "ADMRosterUpdates_runSelected", "ADMRosterUpdates_ConfirmRosterRelease", "ADMRosterUpdates_NewRosterURLs", "ADMRosterUpdates_IndividualAddPlayers", "ADMRosterUpdates_IndividualAddCoaches", "ADMRosterUpdates_IndividualDuplicatePlayers", "ADMRosterUpdates_IndividualMissingPlayers", "ADMRosterUpdates_TransferOrNewPlayer", "ADMRosterUpdates_TransferOrNewCoach"].indexOf(responseJson.tag) > -1){
	  
	  var tmp_res_ID = responseJson.league_tag + "_" + responseJson.action_type + "_select_preliminary_div";
	  if(document.getElementById(tmp_res_ID) != null){
		$("#" + tmp_res_ID).removeClass("hidden");
	  }
	  
	  tmp_res_ID = responseJson.league_tag + "_" + responseJson.action_type + "_select_msg_div";
	  $("#" + tmp_res_ID).removeClass("hidden");
	  $("#" + tmp_res_ID).empty();
	  $("#" + tmp_res_ID).append("<div class=''><span class='msg font-12 centered contents'>" + responseJson.result_msg + "</span></div>");
	  
	  for(var a = 0;a<misc.roster_actions_by_league.length;a++){ var league = misc.roster_actions_by_league[a];
		if(league.league_tag == responseJson.league_tag){
			if(league.issues != null){
				tmp_actions = league.issues.actions.filter(r=> r.action_type == responseJson.action_type);
				for(var b=0;b<tmp_actions.length;b++){ var tmp_action = tmp_actions[b];
					tmp_list = selectedUpdateAction_seqs.filter(r=> r == tmp_action.league_seq);
					if(tmp_list.length > 0){
						//tmp_action.executed = 1;
						tmp_action.resolved = 1;
						if(document.getElementById("action_seq" + tmp_action.seq + "_div") != null){
							document.getElementById("action_seq" + tmp_action.seq + "_div").style.opacity=0.3;
						}
					}
				}
				
				// If there are actions that have been resolved because another action was resolved, update those records here
				if('coincidentally_resolved_action_seqs' in responseJson && responseJson.coincidentally_resolved_action_seqs != null){
					tmp_actions = league.issues.actions.filter(r=> r.action_type == responseJson.coincidentally_resolved_action_type);
					for(var b=0;b<tmp_actions.length;b++){ var tmp_action = tmp_actions[b];
						tmp_list = responseJson.coincidentally_resolved_action_seqs.filter(r=> r == tmp_action.league_seq);
						if(tmp_list.length > 0){
							//tmp_action.executed = 1;
							tmp_action.resolved = 1;
							tmp_action.coincidentally_resolved = 1;
							if(document.getElementById("action_seq" + tmp_action.seq + "_div") != null){
								document.getElementById("action_seq" + tmp_action.seq + "_div").style.opacity=0.3;
								console.log("\nA coincidentally_resolved_action was identified!!!!")
								console.log(tmp_action);
								document.getElementById("action_seq" + tmp_action.seq + "_div").style.color="red";
							}
						}
					}
				}
			}
		}
		
		
	}	
	update_action_counts(); // Updates the counts next to each item in the left-menu (so that we know what is left)
	elem = $("#" + responseJson.action_type + "_div");
	show_panel_specific_links(elem); // Updates the links at the end of the file that allow a user to refresh the page and go to a specific task section
  }
  /*else if ('tag' in responseJson && responseJson.tag == "ADMRosterUpdates_TransferOrNewPlayer"){
	  
  
  }
  else if ('tag' in responseJson && responseJson.tag == "ADMRosterUpdates_TransferOrNewCoach"){
	  
  
  }*/
  else if ('tag' in responseJson && responseJson.tag == "roster_updates_consolidate_to_other_player_search"){
	  
	  misc.consolidate_to_other_player_search_results = responseJson.consolidate_to_other_player_search_results;
      $("#consolidate_to_other_player_search_button").removeClass("hidden");
	  elem = $("#menu_action_consolidate_to_other_player_search_string_results_div")
	  elem.empty();
	  
	  var res = "<div class='no-padding' id='consolidate_to_other_player_search_data_div'>";
	  if(responseJson.consolidate_to_other_player_search_results.length == 0){
		  res += "<div class='col-12 centered'><span class='font-12 error italic'>No player matches found</div>";
	  }
	  for(var a = 0;a<responseJson.consolidate_to_other_player_search_results.length;a++){ var player = responseJson.consolidate_to_other_player_search_results[a];
		  res += "<div class='flex bbottom very-light font-11'>";
			res += "<div class='col-3'><span class='contents'>" + player.player + "</span></div>";
			res += "<div class='col-2'><span class='contents'>" + player.last_season_team + "</span></div>";
			res += "<div class='col-2'><span class='contents'>" + (player.hometown == null ? "[empty]" : player.hometown) + "</span></div>";
			res += "<div class='col-1'><span class='contents'>" + player.last_season_year + "</span></div>";
			res += "<div class='col-1'><span class='contents'>" + (player.team_listed_role == null ? "[empty]" : player.team_listed_role) + "</span></div>";
			res += "<div class='col-1 no-padding'><button onclick='unhide_confirm_consolidation_button(" + player.player_ID + ");' class='font-9 action-button short'>CONSOLIDATE</button></div>";
		  res += "</div>"
		  
		  res += "<div class='font-11 hidden' id='consolidation_confirmation_row" + player.player_ID + "'>";
			res += "<div class='col-12 centered'><span class='font-12'> Are you sure? Click confirm to change default option.</div>";
			res += "<div class='col-12 centered'><button onclick='confirm_player_consolidation(" + responseJson.action_seq + ", " + player.player_ID + ");' class='action-button blue short'>CONFIRM</button></div>";
		  res += "</div>"
	  }
	  res += "</div>"
	  elem.append(res);
  }
  else if ('tag' in responseJson && responseJson.tag == "roster_updates_execute_switched_game_teams"){
	  
	  var tmp_res_ID = responseJson.league_tag + "_" + responseJson.action_type + "_select_preliminary_div";
	  if(document.getElementById(tmp_res_ID) != null){
		$("#" + tmp_res_ID).removeClass("hidden");
	  }
	  
	  tmp_res_ID = "execute_for_switched_game_teams_result" + responseJson.action_seq + "_div";
	  
	  $("#execute_for_switched_game_teams_result" + responseJson.action_seq + "_div").removeClass("hidden");
	  $("#" + tmp_res_ID).empty();
	  $("#" + tmp_res_ID).append("<div class=''><span class='msg font-12 centered contents'>" + responseJson.result_msg + "</span></div>");
	  
	  for(var a = 0;a<misc.roster_actions_by_league.length;a++){ var league = misc.roster_actions_by_league[a];
			if(league.league_tag == responseJson.league_tag){
				if(league.issues != null){
					tmp_actions = league.issues.actions.filter(r=> r.action_type == responseJson.action_type);
					for(var b=0;b<tmp_actions.length;b++){ var tmp_action = tmp_actions[b];
						tmp_list = responseJson.players_from_this_game_and_found_on_both_rosters.filter(r=> r.player_ID == tmp_action.content.player_ID);
						if(tmp_list.length > 0){
							//tmp_action.executed = 1;
							if(document.getElementById("action_seq" + tmp_action.seq + "_div") != null){
								document.getElementById("action_seq" + tmp_action.seq + "_div").style.opacity=0.3;
							}
						}
					}
				}
			}
		}		
  }
  else if ('tag' in responseJson && responseJson.tag == "roster_updates_evaluate_for_switched_game_teams"){
	  
	  var tmp_res_ID = "evaluate_for_switched_game_teams_results_div" + responseJson.action_seq;
	  
	  $("#evaluate_for_switched_game_teams_results_div" + responseJson.action_seq).removeClass("hidden");
	  
	  $("#" + tmp_res_ID).empty();
	  var tmp_msg = "";
	  tmp_msg += responseJson.n_this_game_and_found_on_both_rosters + " out of " + responseJson.n_this_game + " players who were added during the same game were also found on the opposing team's roster."
	  if(responseJson.n_this_game_and_found_on_both_rosters > 0){
		  tmp_msg += " These player records were likely added because a game was processed with the teams flipped. Scroll down and click 'Remove Players' to scrub the database of these records."
	  }
	  $("#" + tmp_res_ID).append("<div class=''><span class='msg font-12 centered contents'>" + tmp_msg + "</span></div>");
	  
	  if(responseJson.success){ // The queries were successful, so we can update the view to clear out queries that were already run (the implementation made the opacity go from 1.0 to 0.3 for the actions that had been executed
	  
		var html = "";
		//console.log("These seq values were run"); console.log(selectedUpdateAction_seqs);
		//console.log("Player IDs found on both team rosters")
		//console.log(responseJson.player_IDs_from_this_game_and_found_on_both_rosters);
		if(responseJson.n_this_game_and_found_on_both_rosters > 0){
			html += "<div class='flex no-padding bbottom bold font-11'>";
				html += "<div class='col-6'><span class='contents'>" + "Player" + "</span></div>"
				html += "<div class='col-6'><span class='contents'>" + "Wrong Team" + "</span></div>"
			html += "</div>"
		}
		for(var a = 0;a<misc.roster_actions_by_league.length;a++){ var league = misc.roster_actions_by_league[a];
			if(league.league_tag == responseJson.league_tag){
				if(league.issues != null){
					tmp_actions = league.issues.actions.filter(r=> r.action_type == responseJson.action_type);
					for(var b=0;b<tmp_actions.length;b++){ var tmp_action = tmp_actions[b];
						tmp_list = responseJson.players_from_this_game_and_found_on_both_rosters.filter(r=> r.player_ID == tmp_action.content.player_ID);
						if(tmp_list.length > 0){
							//tmp_action.executed = 1;
							if(0 && document.getElementById("action_seq" + tmp_action.seq + "_div") != null){
								document.getElementById("action_seq" + tmp_action.seq + "_div").style.opacity=0.3;
							}
							
							html += "<div class='flex no-padding very-light bbottom font-11'>";
								html += "<div class='col-6'><span class='contents'><a href='https://www.google.com/search?q=" + tmp_action.content.player + " Lacrosse Roster' target=_blank'>" + tmp_action.content.player + "</a></span></div>"
								html += "<div class='col-6'><span class='contents'>" + tmp_list[0].wrong_team + "</span></div>"
							html += "</div>"
						}
					}
				}
			}
		}		
		
		if(responseJson.n_this_game_and_found_on_both_rosters > 0){
			// Provide a control to let the admin remove the associated records
			tmp_action = get_action_by_seq(responseJson.action_seq);
			html += "<div class='centered'><button class='action-button blue small' id='execute_for_switched_game_teams_button" + tmp_action.seq + "'  onclick='trigger_execute_for_switched_game_teams(" + tmp_action.seq + ", " + tmp_action.content.player_ID + ", \"" + responseJson.league_desc + "\");' style='margin-left:10px;' >Remove Players</button></div>";
			html += "<div class='centered hidden' id='execute_for_switched_game_teams_result" + tmp_action.seq + "_div'></div>";
		}
		$("#" + tmp_res_ID).append(html);
	}
		  
	  
  } 
  
  else {
    if(!responseJson.no_icon){
        // If this particular POST doesn't update the user with an acknowledgment, then skip this step
        // Show a success message
        console.log("SUCCESS!!!");
        console.log(resultContainer);
        var tmp_id = responseJson.async_ID + "_result_img";
        //console.log("tmp_id: " + tmp_id);
        resultContainer.innerHTML = "<img class='async-result-img' id='" + tmp_id + "' src='/static/img/BlueCheckCircle240.png' style='height:15px;'>";
        //console.log(resultContainer.innerHTML);
    }
    else if('msg' in responseJson && ['', null].indexOf(responseJson.msg) == -1){
        msgContainer.innerHTML = responseJson.msg;
    }
    
    if ('tag' in responseJson && responseJson.tag == "delete_all_db_missing_games"){
        console.log("Re-Read Schedule")
        read_schedule();
    }
  

  }
  
    
    setTimeout(function(){ $('#' + responseJson.async_ID + "_result_msg").removeClass("fade-out"); $('#' + responseJson.async_ID + "_result_msg").addClass("fade-in"); }, 100);
    setTimeout(function(){ $('#' + responseJson.async_ID + "_result_msg").removeClass("fade-in"); $('#' + responseJson.async_ID + "_result_msg").addClass("fade-out"); }, 4000);
    
    setTimeout(function(){ $('#' + responseJson.async_ID + "_result_img").addClass("fade-in"); }, 100);
    setTimeout(function(){ $('#' + responseJson.async_ID + "_result_img").addClass("fade-out"); }, 4000);
    setTimeout(function(){ $('#' + responseJson.async_ID + "_result_img").remove(); }, 6000);

    if(document.getElementById('read_button') != null){ $("#read_button").removeClass("hidden"); }
    
    }

function async_collect_args(){
    /***
    This function is designed to take a d3 click action (which by definition, doesn't have arguments), collect the 3 arguments needed to call async_run, and then call that function with the collected args.
    ***/
    console.log("in async_collect_args");
    //console.log("async_vars"); console.log(async_vars);
    //console.log("this"); console.log(this.id);
    //console.log("this.async_str"); console.log(d3.select(this).attr("async_str"));
    
    this_class = d3.select(this).attr("class").split(" ").filter(r => ['set', 'toggle-ball'].indexOf(r) == -1);       
    balls = d3.selectAll(".toggle-ball." + this_class);
    backgrounds = d3.selectAll(".toggle-background." + this_class);
	
	// Update the user preferences information
	if(this.id == "preference_group_receive_expected_goals"){
		var changed = 0;
		var tmp_key = this.id.replace("preference_group_", "")
		var tmp_preference = preferences.filter(r=> r.key == tmp_key);
		if(tmp_preference.length > 0){
			changed = 1;
			tmp_preference = tmp_preference[0]
			//console.log("cd.tmp_preference"); console.log(tmp_preference);
			tmp_preference.value = [null, 0].indexOf(tmp_preference.value) > -1 ? 1 : 0;
			populate_preferences(preferences);
		}
	}

    
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
    
    async_run(this, this.id, d3.select(this).attr("async_str"));
    
}

function async_run(async_obj, async_ID, async_str){
    /***
    This function receives the basic information provided by the user's change or update of the async input object. It checks some basic stuff and then routes the request to the server.
    ***/
    
    
    var container_div_id = async_ID + "_result";
    //console.log("async_ID: " + async_ID + "  --> container_div_id: " + container_div_id + "  (" + (document.getElementById(container_div_id) == null ? "NOT FOUND" : "FOUND") + ")");
    
    console.log(typeof async_str);
    resultContainer = document.getElementById(container_div_id);
    msgContainer = document.getElementById(async_ID + "_result_msg");
    
    var async_error = null;
    var async_msg = null;
    
    if(typeof lr_async_specs == "undefined" || lr_async_specs == null){ lr_async_specs = {}; }
	if(typeof async_str == "object" && 'handler' in async_str && [null, ''].indexOf(async_str.handler) == -1){
		async_route = async_str.handler.replace("?c=", "");
	}
    else if(typeof async_route == "undefined" || async_route == null){ 
		async_route = misc.handler.replace("?c=", ""); 
	}
    console.log("async_route: " + async_route);

    //console.log("async_ID: " + async_ID);
    //console.log("lr_async_specs"); console.log(lr_async_specs);
    var async_value = null;
    var jquery_obj = $("#" + async_ID);
    
    
    //console.log("async_str", async_str);
    //console.log("async_obj"); console.log(async_obj);
    //console.log("jquery_obj"); console.log(jquery_obj);
    //console.log("select: " + jquery_obj.is("select"));
    //console.log("textarea: " + jquery_obj.is("textarea"));
    //console.log("input.text: " + jquery_obj.is("input:text"));

    
    // Using JQuery, check what type of input the user changed; otherwise, we would not know how to grab their actual input value
	if(typeof async_str == "object"){
		
	}
    else if(jquery_obj.is("select")){
        async_value = async_obj.options[async_obj.selectedIndex].value; 
    }
    else if(jquery_obj.is("textarea")){
        async_value = async_obj.value; 
    }
    else if(jquery_obj.is("input:text")){
		if(async_str.indexOf("update_player_name") > -1){
			async_route = "basic_player_detail"
		}
        async_value = async_obj.value; 
        
    }
    else if(jquery_obj.is("input:radio")){
        async_value = async_obj.value; 
        
    }
	else if(async_str.indexOf("request_article_transitions") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("update_user_preferences") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("getuser_activity_data") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("edit_team_home_current_state_toggle_div") > -1){
        async_value = async_ID; 
        async_route = "team_home";
    }
    else if(async_str.indexOf("request_league_schedule_data") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("get_team_npi_or_rpi_projections_data") > -1){
        async_value = async_ID; 
        async_route = "team_my_schedule";
    }
    else if(async_str.indexOf("get_player_watch_list_data") > -1){
        async_value = async_ID; 
        async_route = "player_watch_list";
    }
    else if(async_str.indexOf("get_team_statistical_benchmark_data") > -1){
        async_value = async_ID; 
    }
	else if(async_str.indexOf("team_get_laxelo_history") > -1){
        async_value = async_ID; 
    }
	else if(async_str.indexOf("basic_get_laxelo_history") > -1){
        async_value = async_ID; 
    }
	else if(async_str.indexOf("gpt_request_automated_content_summary") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("get_league_rankings_data") > -1){
		async_value = 0;
		console.log("get_league_rankings_data.tag ID'd")
	}
    else if(async_str.indexOf("team_get_db_team_summaries") > -1){
        async_value = async_ID; 
        async_route = "team_detail";
    }
	else if(async_str.indexOf("queue_consolidation_in_db") > -1){
		async_value = async_ID; 
	}
	else if(async_str.indexOf("load_team_comparison_roster") > -1){
		async_value = async_ID; 
	}
	else if(async_str.indexOf("practice_home_filter_on_drill") > -1){
		async_value = async_ID; 
	}
    else if(async_str.indexOf("get_db_team_summaries") > -1){
        async_value = async_ID; 
        async_route = "basic_team_detail";
    }
    else if(async_str.indexOf("get_player_spotlight_data") > -1){
        async_value = async_ID; 
        async_route = "basic_player_detail";
    }
    else if(async_str.indexOf("async_load_explanation") > -1){
        async_value = 0;
        async_route = "explanations"
    }
    else if(async_str.indexOf("add_single_player_watch_list_status_and_refresh") > -1){
        async_value = 0;
        //async_route = "explanations"
    }
    else if(async_str.indexOf("update_single_player_watch_list_status") > -1){
        async_value = 0;
        //async_route = "explanations"
    }
    else if(async_str.indexOf("edit_active_template_version") > -1){
        async_value = async_ID;   
    }
    else if(async_str.indexOf("edit_active_group_template_version") > -1){
        async_value = async_ID;   
    }
    else if(async_str .indexOf( "test_endpoint_token_combo" ) > -1){
        async_value = 0;
    }
    else if(
        async_str.indexOf("edit_api_token_endpoint_divisions") > -1
        || async_str.indexOf("edit_api_token_endpoint_access") > -1
        || async_str.indexOf("edit_api_token_endpoint_tier") > -1
        || async_str.indexOf("token_force_db_toggle_div") > -1
        || async_str.indexOf("token_status_toggle_div") > -1
        || async_str.indexOf("edit_api_endpoint") > -1
        || async_str.indexOf("edit_api_token") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("refresh_team_data") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("add_new_db_team") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("survey_update_user_response") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_edit_team") > -1){
        async_value = async_ID; 
		async_route = "admin_teams"
    }
    else if(async_str.indexOf("request_auto_edit_for_content") > -1){
        async_route = "laxref_gpt"
        async_value = 0; 
    }
    else if(async_str.indexOf("request_red_flag_analysis") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("admin_bot_scoring_refresh_data") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("request_LLM_suggestion_for_content") > -1){
        async_route = "laxref_gpt"
        async_value = 0; 
    }
    else if(async_str.indexOf("laxref_gpt_add_to_content_table") > -1){
        async_route = "laxref_gpt"
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_edit_conference") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_edit_statistic") > -1){
		//console.log("[1885] async_str: " + async_str);
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_edit_testimonial") > -1){
		console.log("[2029] async_str: " + async_str);
        async_value = 0; 
    }
    else if(async_str.indexOf("setUserteamDefaultRanking") > -1){
		async_value = 0; 
		async_route = "team_my_stats"
    }
    else if(async_str.indexOf("requestDataForAlternateRankingAlgo") > -1){
		async_value = 0; 
		async_route = "team_my_stats"
    }
    else if(async_str.indexOf("admin_edit_stat_link") > -1){
		console.log("[18859] async_str: " + async_str);
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_edit_analysis") > -1){
        async_value = 0; 
    }
	else if(async_str.indexOf("admin_game_edit_pxp") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("immaculate_grid_make_choice") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("getlist_of_user_emails") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("recordJSVizFail") > -1){
        async_value = 0; 
        async_route = "logger-async";
    }
    else if(async_str.indexOf("recJSLogItem") > -1){
        async_value = 0; 
        async_route = "logger-async";
    }
    else if(async_str.indexOf("add_alternate_team_name") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_change_game_date") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("download_practice_template") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_initiate_new_exgoals_intro") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_request_admin_llm_data") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_initiate_new_exgoals_content") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_create_new_exgoals_intro") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_create_new_exgoals_content") > -1){
        async_value = -1; 
    }
    else if(async_str.indexOf("admin_gpt_edit_new_exgoals_publish_date") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_gpt_request_content_links") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_gpt_edit_new_exgoals_generic") > -1){
        async_value = 1; 
    }
    else if(async_str.indexOf("admin_gpt_edit_new_exgoals_intro") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("add_schedule_game_replacement_text") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_schedules_mark_manual_final") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("edit_peers_data_via_panel") > -1 || async_str.indexOf("edit_team_benchmark_data_via_panel") > -1){
        async_value = async_ID; 
        async_route = "team_home"
    }
    else if(async_str.indexOf("edit_player_benchmark_data_via_panel") > -1){
        async_value = async_ID; 
        async_route = "team_player_detail"
    }
    else if(async_str.indexOf("edit_show_legend_setting") > -1 || async_str.indexOf("edit_show_instructions_setting") > -1){
        async_value = 0; 
        async_route = "preferences"
    }
    else if(async_str.indexOf("record_immaculate_grid_league_choice") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_newsletter_request_assigned_subs_list") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_newsletter_request_unassigned_subs_list") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_newsletter_resesarch_unassigned_subscriber") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_newsletter_set_subscriber_list_assignment") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_newsletter_set_multiple_subscriber_list_assignments") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_gpt_update_subscriber_list_assignments") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_newsletter_request_subscriber") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_newsletter_update_subscriber_list_assignments") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_newsletter_refresh_subscriber_data") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("admin_newsletter_deactivate_subscriber") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("restart_live_win_odds_execution_by_writing_trigger_file") > -1){
        async_value = 0;
    }
    else if(async_str.indexOf("restart_live_win_odds_VM") > -1){
        async_value = 0;
    }
    else if(async_str.indexOf("admin_cockpit_set_bad_games_to_pending") > -1){
        async_value = 0;
    }
    else if(async_str.indexOf("update_admin_schedules_game") > -1){
        async_value = async_ID;
    }
    else if(async_str.indexOf("trigger_interim_processing_by_writing_trigger_file") > -1){
        async_value = 0;
    }
    else if(async_str.indexOf("admin_remove_user_from_group") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_cockpit_request_team_rosters") > -1){
        async_value = 1; 
    }
    else if(async_str.indexOf("practice_team_get_nonpractice_shots_for_charting") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("team_get_nongame_shots_for_charting") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("team_shot_charting_request_upgrade") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("team_get_game_shots_for_charting") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("practice_charting_delete_shot_by_ID") > -1){
        async_value = async_ID
		async_route = "team-practice-home"
    }
    else if(async_str.indexOf("practice_charting_add_new_shot") > -1){
        async_value = async_ID
		async_route = "team-practice-home"
    }
    else if(async_str.indexOf("team_get_practice_shots_for_charting") > -1){
        async_value = async_ID
		async_route = "team-practice-home"
    }
    else if(async_str.indexOf("set_team_practice_date_for_shot_charting") > -1){
        async_value = 1;
		async_route = "team-practice-home"
    }
    else if(async_str.indexOf("team_shot_charting_update_summary_table_preferences") > -1){
        async_value = async_ID
		async_route = "team_game_detail"
    }
    else if(async_str.indexOf("team_shot_charting_update_required_data_preferences") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("team_shot_charting_update_JSON") > -1 || async_str.indexOf("team_practice_shot_charting_update_JSON") > -1){
        async_value = async_ID
		async_route = "team_game_detail"
    }
    else if(async_str.indexOf("admin_remove_player_from_roster") > -1){
        async_value = async_ID
    }
    else if(async_str.indexOf("set_url_as_non_live_stats_link") > -1){
        async_value = 0;
    }
    else if(async_str.indexOf("admin_cockpit_initiate_add_player_season_request") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_cockpit_add_player_season") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("admin_cockpit_add_player_alternate_name") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("team_scheduler_clear_planned_games") > -1){
        async_value = 0; 
		async_route = "team-scheduler"
    }
    else if((
		async_str.indexOf("team_scheduler_add_games") > -1
		|| async_str.indexOf("team_scheduler_change_location") > -1
		|| async_str.indexOf("team_scheduler_change_result") > -1
		|| async_str.indexOf("team_scheduler_change_date") > -1
		|| async_str.indexOf("team_scheduler_change_enabled") > -1
		|| async_str.indexOf("team_scheduler_remove_game") > -1
		|| async_str.indexOf("team_scheduler_simulate_unknowns") > -1
		)){
		
        async_value = 0; 
		async_route = "team-scheduler"
    }
    else if(async_str.indexOf("rpisim_change_settings") > -1){
        async_value = 0; 
		async_route = "rpi-simulator"
    }
    else if(async_str.indexOf("rpisim_download_resume_graphic") > -1){
        async_value = 0; 
		async_route = "rpi-simulator"
    }
    else if(async_str.indexOf("rpisim_hypo_game") > -1){
        async_value = 0; 
		async_route = "rpi-simulator"
    }
    else if(async_str.indexOf("rpisim_set_bubble") > -1){
        async_value = 0; 
		async_route = "rpi-simulator"
    }
    else if(async_str.indexOf("flag_game_for_summary") > -1){
		
        async_value = 0; 
		async_route = "expected_goals"
    }
    else if(async_str.indexOf("admin_llm_add_subject_to_queue") > -1){
		
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_route == "admin_cockpit"){
        async_value = 0; 
    }
    else if(async_str.indexOf("mark_notification_viewed") > -1){
        async_route = "notifications";
        async_value = 0; 
    }
    else if(async_str.indexOf("mark_notification_acknowledged") > -1){
        async_route = "notifications";
        async_value = 0; 
    }
    else if(async_str.indexOf("set_LRP_User_report_usage") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("send_primer_email_to_user") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("request_detailed_game_projection") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("set_LRP_Subscription_status") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("set_LRP_Group_Access_as_coach") > -1){
        async_value = async_ID; 
    }
    else if(async_route == "admin_schedules"){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("display_bracket_graphic") > -1){
        async_value = async_ID == null ? -1 : async_ID; 
    }
    else if(async_str.indexOf("edit_bracket_slot_info") > -1){
		async_route = "bracket"
        async_value = async_ID; 
    }
    else if(async_str.indexOf("update_player_recap_async") > -1){
        async_value = async_ID; 
    }
	else if(async_str.indexOf("admin_find_newsletter_content_history") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("set_laxref_content_status") > -1){
        async_value = async_ID;
    }
	else if(async_str.indexOf("admin_llm_reschedule_single_content") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("admin_llm_schedule_single_content") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("admin_llm_reschedule_entire_days_content") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("admin_llm_remove_subject_from_queue") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("convert_content_to_different_format") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("adjust_expected_goals_settings") > -1){
        async_value = 0; 
		async_route = "expected-goals-preferences"
	}
	else if(async_str.indexOf("admin_schedules_add_scheduled_game_to_database") > -1){
        async_value = 0; 
	}
	else if(async_str.indexOf("admin_schedules_toggle_replacement_text_status") > -1){
        async_value = 0; 
	}
	else if(async_str.indexOf("send_expected_goals_confirmation_email") > -1){
        async_value = 0; 
		async_route = "expected_goals"
	}
	else if(async_str.indexOf("roster_updates_execute_switched_game_teams") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("roster_updates_consolidate_to_other_player_search") > -1){
        async_value = 1; 
	}
	else if(async_str.indexOf("roster_updates_update_current_roster_url") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("add_post_to_automation_queue") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("marketing_toggle_published") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("roster_updates_evaluate_for_switched_game_teams") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_runAll") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_runSelected") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("RemoveLaxRef_CoachSeason") > -1){
        async_value = -1; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_NewRosterURLs") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_ConfirmRosterRelease") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUtilities_lookup_char_to_ord") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("request_team_npi_game_list") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_IndividualAddPlayers") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_IndividualAddCoaches") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_IndividualDuplicatePlayers") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_IndividualMissingPlayers") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_TransferOrNewCoach") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("toggle_beyond_the_basics_blurb") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("edit_beyond_the_basics_header") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("edit_beyond_the_basics_text") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("ADMRosterUpdates_TransferOrNewPlayer") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("mark_renewal_reminder_sent") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("send_expected_goals_feedback") > -1){
        async_value = 0; 
		async_route = "expected-goals-feedback"
	}
	else if(async_str.indexOf("add_new_todo_task") > -1){
        async_value = 0; 
	}
	else if(async_str.indexOf("admin_todo_confirm_task_dispersal") > -1){
        async_value = 0; 
	}
	else if(async_str.indexOf("delete_todo_task") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("mark_complete_todo_task") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("edit_todo_task") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("move_todo_task_location") > -1){
        async_value = async_ID; 
	}
	else if(async_str.indexOf("remove_planned_analyses_from_queue_JSON") > -1){
        async_value = 0; 
	}
	else if(async_str.indexOf("expected_goals_identify_pickem_league") > -1){
        async_value = 0; 
		async_route = "expected-goals-preferences"
    }
	else if(async_str.indexOf("expected_goals_identify_favorite_team") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("expected_goals_identify_favorite_leagues") > -1){
        async_value = 0; 
		async_route = "expected_goals"
    }
	else if(async_str.indexOf("immaculate_grid_request_reminder_email") > -1){
        async_value = 0; 
    }
	else if(async_str.indexOf("get_immaculate_grid_daily_report") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("set_confirm_roster_released") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("set_gpt_prompt_text_version_enabled") > -1){
        async_value = 0;
    }
	else if(async_str.indexOf("admin_view_roster_edit_player_info") > -1){
        async_value = async_ID; 
    }
	else if(async_str.indexOf("admin_view_roster_edit_coach_info") > -1){
        async_value = 1; 
    }
    else if(async_str.indexOf("set_confirm_schedule_released") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("download_bracket_graphic") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("set_win_totals_picks") > -1){
        async_value = async_ID; 
    }
    else if(async_str.indexOf("set_totals_contest_prefs") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("team_record_shot_location") > -1 || async_str.indexOf("team_practice_record_shot_location") > -1){
        async_value = 0; 
        async_route = "team_game_detail"
    }
    else if(async_str.indexOf("team_record_shot_tag") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("team_practice_record_shot_tag") > -1){
        async_value = 0; 
        async_route = "team_game_detail"
    }
    else if(async_str.indexOf("team_record_shot_custom_tags") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("team_practice_record_shot_custom_tags") > -1){
        async_value = 0; 
        async_route = "team_game_detail"
    }
    else if(async_str.indexOf("display_line_groupings") > -1){
        async_value = 0; 
        async_route = "team_my_roster"
    }
    else if(async_str.indexOf("team_my_roster_depth_chart_move_players") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("team_my_roster_depth_chart_add_player_names") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("save_pickem_selection") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("edit_player_line_grouping") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("laxref_gpt_request_conversation") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("laxref_gpt_score_response") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("gpt_request_paragraph_revisions") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("request_to_generate_LLM_feedback") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
	else if(async_str.indexOf("copy_article_to_new") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("submit_human_paragraph_edit") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("convert_voice_notes_to_article_draft") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("submit_feedbackGenerator_score") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("submit_proposed_revisions_score") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
	else if(async_str.indexOf("update_email_subscriber_group_assignment") > -1){
        async_value = 0; 
	}
    else if(async_str.indexOf("laxref_gpt_tag_response") > -1){
        async_value = 0; 
		async_route = "laxref_gpt"
    }
    else if(async_str.indexOf("send_to_laxref_content") > -1){
        async_value = 0; 
    }
    else if(async_str.indexOf("delete_all_db_missing_games") > -1){
        async_value = 0;
    }
    else{
		console.log("2765.not caught!!!\n\nUncaught string: " + async_str);
	}
    
    //console.log("async_value: " + async_value);
    //console.log("async_route: " + async_route);
    //console.log("async_str == \"object\": " + (async_str == "object"));
	
    var lr_async_request = null;
    // Can only proceed if we were able to parse the inputs completely
    if(typeof async_str == "object"){
		lr_async_request = async_str;
		lr_async_request['async'] = 1
		lr_async_request['async_ID'] = async_ID
		console.log("obj async call"); console.log(lr_async_request);
	}
	else if(async_value == null){
        // Input value was not able to be identified
        async_error = "F";
        
    }
    else{
        
        
        var tokens = async_str.split("|");
        //console.log("tokens"); console.log(tokens);
        
        lr_async_request = {'async': 1, 'handler': null, 'action': null, 'key': null, 'field': null, 'value': null};
        for(var a = 0;a<tokens.length;a++){ var token = tokens[a];
            if(token.startsWith("handler-")){
                lr_async_request.handler = token.replace("handler-", "");
            }
            else if(token.startsWith("action-")){
                lr_async_request.action = token.replace("action-", "");
            }
            else if(token.startsWith("field-")){
                lr_async_request.field = token.replace("field-", "");
            }
            else if(token.startsWith("key-")){
                lr_async_request.key = token.replace("key-", "");
            }
            else if(token.startsWith("val-")){
                lr_async_request.val = token.replace("val-", "");
            }
            else if(token.startsWith("opp_team_ID-")){
                lr_async_request.opp_team_ID = token.replace("opp_team_ID-", "");
            }
            else if(token.startsWith("game_ID-")){
                lr_async_request.game_ID = token.replace("game_ID-", "");
            }
            else if(token.startsWith("laxref_content_ID-")){
                lr_async_request.laxref_content_ID = token.replace("laxref_content_ID-", "");
            }
            else if(token.startsWith("player_recap_ID-")){
                lr_async_request.player_recap_ID = token.replace("player_recap_ID-", "");
            }
            else if(token.startsWith("player_ID-")){
                lr_async_request.player_ID = token.replace("player_ID-", "");
            }
            else if(token.startsWith("team_ID-")){
                lr_async_request.team_ID = token.replace("team_ID-", "");
            }
            else if(token.startsWith("contest_ID-")){
                lr_async_request.contest_ID = token.replace("contest_ID-", "");
            }
            else if(token.startsWith("game_year-")){
                lr_async_request.game_year = token.replace("game_year-", "");
            }
            else if(token.startsWith("year-")){
                lr_async_request.year = parseInt(token.replace("year-", ""));
            }
            lr_async_request.value = async_value == "NULL" ? null : async_value;
            lr_async_request.async_ID = async_ID;
        }
        console.log("route: " + async_route);
        console.log("rm.async_body"); console.log(JSON.stringify(lr_async_request));
		//console.trace();

		// Clear out or hide existing error messages
		if(['ADMRosterUpdates_runSelected', 'ADMRosterUpdates_NewRosterURLs', 'ADMRosterUpdates_ConfirmRosterRelease', 'ADMRosterUpdates_runAll', 'ADMRosterUpdates_IndividualAddCoaches', 'ADMRosterUpdates_IndividualAddPlayers', 'ADMRosterUpdates_IndividualMissingPlayers', 'ADMRosterUpdates_IndividualDuplicatePlayers', 'ADMRosterUpdates_TransferOrNewCoach', 'ADMRosterUpdates_TransferOrNewPlayer'].indexOf(lr_async_request.action) > -1){
			console.log("Hide " + "#" + lr_async_request.key.replace("NCAA ", "").replace(" Women", "w").replace(" Men", "m").toLowerCase() + "_" + lr_async_request.field + "_select_msg_div");
            $("#" + lr_async_request.key.replace("NCAA ", "").replace(" Women", "w").replace(" Men", "m").toLowerCase() + "_" + lr_async_request.field + "_select_msg_div").addClass("hidden");
        }
		
	}
	//console.log("async_route: " + async_route);
	if(lr_async_request != null){
		fetch(("/" + async_route), {
			  method: 'POST',
			  headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify(lr_async_request)
			}).then(function(result) {
				console.log("Process the return data from action: " + lr_async_request.action);
				//console.log(result);
				var jt = null;
				try{
					jt = result.json()
				}
				catch(err){ 
					handle_js_fail("asyncProcessReturnData", {'result': result}, err)
					jt = result; 
				}
				
				//console.log(jt);
				tmp = jt;
				
			  return tmp;
			  
			}).then(handleAsyncResponse);
        
        // Update the source data as needed
        var tmp_data = null;
        if(lr_async_request.action == "2nd_assists"){
            tmp_data = misc.data.assists.filter(r=> r.ID==parseInt(lr_async_request.key))[0];
            if(lr_async_request.field == "second_assister_ID"){
                tmp_data.second_assister_ID=parseInt(lr_async_request.value);
            }
            else if(lr_async_request.field == "third_assister_ID"){
                tmp_data.third_assister_ID=parseInt(lr_async_request.value);
            }
        }
        else if(lr_async_request.action == "missed_assists"){
            tmp_data = misc.data.missed_assists.filter(r=> r.ID==parseInt(lr_async_request.key))[0];
            if(lr_async_request.field == "missed_assister_ID"){
                tmp_data.missed_assister_ID=parseInt(lr_async_request.value);
            }
        }
		else if(lr_async_request.action == "update_player_name"){
            // No redraw action required
        }
        else if(lr_async_request.action == "update_player_content"){
            // No redraw action required
        }
        else if(lr_async_request.action == "update_user_preferences"){
            // No redraw action required
        }
        else if(lr_async_request.action == "set_win_totals_picks"){
            // No redraw action required
        }
        else if(lr_async_request.action == "set_totals_contest_prefs"){
            // No redraw action required
        }
        else if(lr_async_request.action == "display_line_groupings"){
            // No redraw action required
        }
        
    }
   
}