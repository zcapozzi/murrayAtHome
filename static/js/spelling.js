//spelling.js

console.log(misc.word);




function readPhrase(phrase, argSpeed=.60) {
	const synth = window.speechSynthesis;
	let voices = synth.getVoices();
	
	console.log("Read " + phrase);

	// Some browsers need a callback when voices are loaded
	if (!voices.length) {
		synth.onvoiceschanged = () => readPhrase(phrase);
		console.log(JSON.stringify(voices))
		return;
	}

	const utterance = new SpeechSynthesisUtterance(phrase);

	// Pick a natural-sounding female voice
	//console.log(voices)
	const preferredVoice = voices.find(v => 
		//v.name.toLowerCase().includes("female") ||
		//v.name.toLowerCase().includes("samantha") ||   // macOS
		//v.name.toLowerCase().includes("google us english") || // Chrome
		v.name.toLowerCase().includes("zira")         // Windows
		//||v.name.toLowerCase().includes("english")
	);
	//console.log(preferredVoice)
	const femalePreferredVoice = voices.find(v => 
		v.name.toLowerCase().includes("zira")
	);
	
	if (preferredVoice) { 
		utterance.voice = femalePreferredVoice;
	}
	else if (preferredVoice) { 
		utterance.voice = preferredVoice;
	}
	//console.log("preferredVoice");
	//console.log(preferredVoice)

	utterance.rate = argSpeed;    // slightly slower, more natural
	utterance.pitch = 1.0;
	utterance.volume = 1.0;

	synth.cancel(); // stop anything currently playing
	//console.log(utterance)
	synth.speak(utterance);
}      

function start_choose_person(kid){
	misc.kid = kid;
	
	if(kid == "Jack"){ misc.inferred_grade = 2; }
	if(kid == "Will"){ misc.inferred_grade = 2; }
	if(kid == "Lily"){ misc.inferred_grade = 1; }
	
	console.log("Set kid to " + misc.kid)
	$(".after-reset").removeClass("hidden");
	$(".on-reset").addClass("hidden");
	$("#intro_question").text("Ok, who's next?")

	$("#done_button").addClass("hidden");
	$("#listen_div").removeClass("hidden");
	$("#results_div_str").empty()
	$("#results_div_img").empty()
	
	$("#progress_div").empty();
	var progress_html = "";
	for(var a = 0;a<misc['n_words'];a++){
		progress_html += "<div class='progress-box' id='progress_box" + a + "'></div>";
	}
	$("#progress_div").append(progress_html);
	
	const session_start = {
		action: "report_session_start", // A new action to be handled by spelling_POST
		kid: misc.kid,
		handler: "spelling_result_endpoint"
	};

	// Call the async_run function (as referenced in laxrefpro_async.js)
	// Assuming async_run takes a data object and sends it to the server-side POST endpoint.
	// Replace '/spelling_result_endpoint' with the actual URL/route mapped to spelling_POST.
	async_run(null, null, session_start);
}

var n_tried = 0;
var n_correct = 0;

function repeatPhrase(){
	
	document.getElementById('entry_input').focus();
	word = misc.word;
	const randomIndex = Math.floor(Math.random() * word.phrases.length);
	sentence = word.phrases[randomIndex];
	phrases = [word.word, "as in", sentence]
	for (let a = 0; a < phrases.length; a++) {
		setTimeout(function() {
			readPhrase(phrases[a]);
		}, 1000 * a); // 0.5 seconds * a
	}
}

function getNext(){
	document.getElementById('entry_input').value="";
	$("#listen_div").addClass("hidden");
	$("#instructions_div").addClass("hidden");
	
	$("#done_button").removeClass("hidden");
	$("#entry_input").removeClass("hidden");
	document.getElementById('entry_input').focus();

	move_to_next()
    if(misc.word != null){
        word = misc.word;
        console.log(word)
        const randomIndex = Math.floor(Math.random() * word.phrases.length);
        sentence = word.phrases[randomIndex];
        phrases = [word.word, "as in", sentence]
        for (let a = 0; a < phrases.length; a++) {
            setTimeout(function() {
                readPhrase(phrases[a]);
            }, 1000 * a); // 0.5 seconds * a
        }
    }
	
}

function display_today_attempts_count(id){
	$("#" + id).empty();
	html = "<div class='bbottom'><span class='bold font-24 msg' style='color: #333;'>Words Tried Today</span></div>"
	html += "<div class='flex bbottom very-light bold'>";
		html += "<div class='col-3 left'><span class='font-18'>Speller</span></div>"
		html += "<div class='col-4 right'><span class='font-18'>Correct</span></div>"
		html += "<div class='col-4 right'><span class='font-18'>Tries</span></div>"
		html += "<div class='col-1 right'><span class='font-18'></span></div>"
	html += "</div>"
	for(k in misc.today_n_attempts_by_speller){
		
		html += "<div class='flex no-padding'>";
		html += "<div class='col-3 left'><span class='font-18'>" + k + "</span></div>"
		html += "<div class='col-4 right'><span class='font-18'>" + misc.today_n_correct_by_speller[k] + "</span></div>"
		html += "<div class='col-4 right'><span class='font-18'>" + misc.today_n_attempts_by_speller[k] + "</span></div>"
		html += "<div class='col-1 right'  style='margin-top:3px;' >";
            if(misc.today_n_attempts_by_speller[k] > 0 && misc.today_n_correct_by_speller[k]/misc.today_n_attempts_by_speller[k] > .70){
                // Blue Star if you are over 70% for the day
                html += "<img title='Star!!! Over 70% correct!!!' class='icon-15'src='" + blueStarUrl + "' />"
            }
            html += "</div>"
		html += "</div>"
	
	}
	$("#" + id).append(html);
}

function print_correct_and_incorrect(){
	
	var elem = $("#results_list_div"); elem.empty();
	
	var html = ""
	
	html += "<div class='col-3 centered'>"
		html += "<div class=' bbottom'><span class='bold font-24 msg'>Correct Words</span></div>"
		if(misc.correct_words.length > 0){
			for(var a = 0;a<misc.correct_words.length;a++){ 
				html += "<div class=''><span class='font-36'>" + misc.correct_words[misc.correct_words.length - a - 1] + "</span></div>"
			}
		}
	html += "</div>"
	html += "<div class='col-6 centered '>"
		html += "<div class='bbottom'><span class='bold font-24 error'>Incorrect Words</span></div>"
		if(misc.incorrect_words.length > 0){
			for(var a = 0;a<misc.incorrect_words.length;a++){ 
                html += "<div class='flex no-padding'>";
                    html += "<div class='col-6'><span class='font-30'>" + misc.incorrect_words_w_detail[misc.incorrect_words.length - a - 1].attempt + "</span></div>"
                    html += "<div class='col-6'><span class='font-30 msg'>" + misc.incorrect_words_w_detail[misc.incorrect_words.length - a - 1].answer + "</span></div>"
                html += "</div>"
			}
		}
	html += "</div>"
	html += "<div class='col-3 centered ' id='counts_leaderboard_small'>"
		
	html += "</div>"
	elem.append(html)
	
	display_today_attempts_count('counts_leaderboard_small')
}

function move_to_next(){
	
    
    misc.word = null;
    var in_focus_list_words = misc.words.filter(r=> misc.focus_words_use_first[misc.kid].indexOf(r.word) > -1);
    var not_in_focus_list_words = misc.words.filter(r=> misc.focus_words_use_first[misc.kid].indexOf(r.word) == -1);
    
    word_list = in_focus_list_words.concat(not_in_focus_list_words)
	var n_words = word_list.length;

    
    // Kid-specific data objects
    frequencies = misc.word_frequency_by_word_by_speller[misc.kid];
    mastered_words = misc.kid in misc['mastered_words_by_speller'] ? misc['mastered_words_by_speller'][misc.kid]: [];
    
	var n_attempts = 10;
    while( n_attempts > 0 && misc.word == null){
        console.log("---------------------------------\nAttempts left=" + n_attempts);
        n_attempts -= 1;
        for(var a = 0;a<n_words;a++){ var tmp_word = word_list[a];
            use_it = 1;
            if(!('grade' in tmp_word)){ tmp_word.grade = 'focus'; }
            console.log("\n Should we use " + tmp_word.word + " ( grade " + tmp_word.grade + " ) for " + misc.kid + "?")
            if(use_it && misc.today_words_used_by_speller[misc.kid].indexOf(tmp_word.word) > -1){
                // Already used within the relevant time frame (originally just the current day)
                console.log(" No, they already used it")
                use_it = 0;
            }
            if(use_it && tmp_word.grade != "focus" && (frequencies[tmp_word.grade] == null || Math.random() > frequencies[tmp_word.grade])){
                // Each kid has a frequency cutoff for the various grades; lower values mean that they should see words from that grade less; this check gives us a chance to 
                if(frequencies[tmp_word.grade] == null){
                    console.log(" No, they aren't supposed to get grade " + tmp_word.grade + " words.")
                }
                else{
                    console.log(" No, it failed the randomness test <= " + frequencies[tmp_word.grade] + " for " + misc.kid)
                }
                use_it = 0;
            }
            if(use_it && mastered_words.indexOf(tmp_word.word) > -1){
                // They've gotten it correct enough recently to where we should consider it a mastered word and no longer show it
                console.log(" No, they've mastered it already")
                use_it = 0;
            }
            
            if(use_it && misc.word == null){
                misc.word = tmp_word;
                break
            }
        }
    }
	if(misc.word == null){ // Exhausted all the original set of words
		alert("You've done all the words; go get Dad!!!")
	}

	console.log("Word is " + misc.word.word + "\n");
	misc.today_words_used_by_speller[misc.kid].push(misc.word.word);

}

var word;
function compare(){
	var entry = document.getElementById('entry_input').value.trim().toLowerCase();
	if(entry == ""){
		readPhrase("Spell the word in the box and then click Done", .85)
		return
	}
	console.log(entry, word.word.trim().toLowerCase())
	$("#progress_box" + n_tried).addClass("complete");
	n_tried += 1;
	if(!(misc.kid in misc.today_n_attempts_by_speller)){ misc.today_n_attempts_by_speller[misc.kid] = 0; }
	if(!(misc.kid in misc.today_n_correct_by_speller)){ misc.today_n_correct_by_speller[misc.kid] = 0; }
	misc.today_n_attempts_by_speller[misc.kid] += 1
	msg = null;
	if(entry == word.word.trim().toLowerCase()){
		
		misc.today_n_correct_by_speller[misc.kid] += 1
	
		$("#results_div_img").append("<img src='https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/team0001_NotreDame_big.jpg' style='width:50px; padding:0px 20px;' />");
		msg = "Correct"
		is_correct = 1
		misc.correct_words.push(word.word)
	}
	else{
		$("#results_div_img").append("<img src='" + wrongDukeUrl + "' style='width:50px; padding:0px 20px;' />");
		msg = "Oops, wrong. Check the correct spelling and then click next to go to the next word"
		is_correct = 0
		misc.incorrect_words.push(word.word)
        misc.incorrect_words_w_detail.push({'answer': word.word.trim().toLowerCase(), 'attempt': entry})
	}
	n_correct += is_correct;
	// Prepare the data payload for the server
	spellingResultData = {
		action: "log_spelling_result", // A new action to be handled by spelling_POST
		kid: misc.kid,
		correct: is_correct,          // true or false determination
		answer: word.word,    // Optional: for better logging
		attempt: entry,    // Optional: for better logging
		user_entry: document.getElementById('entry_input').value, // Optional: for debugging
		noCommit: misc.noCommit,
		day_index: misc.day_index,
		handler: "spelling_result_endpoint"
	};

	if(n_tried == misc['n_words']){
	
		spellingResultData.total_correct= n_correct;
		spellingResultData.total= n_tried;
		spellingResultData.correct_words= misc.correct_words;
		spellingResultData.incorrect_words= misc.incorrect_words;
	}
	// Call the async_run function (as referenced in laxrefpro_async.js)
	// Assuming async_run takes a data object and sends it to the server-side POST endpoint.
	// Replace '/spelling_result_endpoint' with the actual URL/route mapped to spelling_POST.
	async_run(null, null, spellingResultData);

	// to-do: add the two lists of words they got and got wrong; trigger a telegram alert when a new session is started; log the correct/incorrects; if no grade is entered, default to the kid chosen
	
	console.log("kid: " + kid);
	console.log("n_words", misc.n_words)
	
	$("#results_div_str").empty();
	$("#results_div_str").append(`<span class=''>${n_correct} / ${n_tried}</span>`);
	if(n_tried == misc['n_words']){
		document.getElementById('entry_input').value="";
		pct = parseInt(100*n_correct/n_tried) + " percent"
		msg = `You scored ${n_correct} out of ${n_tried}.`
		$(".on-reset").removeClass("hidden");
		$(".after-reset").addClass("hidden");
		$("#listen_div").addClass("hidden");
		$("#results_list_div").empty()
		display_today_attempts_count('counts_leaderboard_large')
		
		/*
		const session_end = {
			action: "report_session_end", // A new action to be handled by spelling_POST
			kid: misc.kid,
			correct: n_correct,
			total: n_tried,
			correct_words: misc.correct_words,
			incorrect_words: misc.incorrect_words,
			
			handler: "spelling_result_endpoint"
		};

		// Call the async_run function (as referenced in laxrefpro_async.js)
		// Assuming async_run takes a data object and sends it to the server-side POST endpoint.
		// Replace '/spelling_result_endpoint' with the actual URL/route mapped to spelling_POST.
		async_run(null, null, session_end);
		*/
		n_tried = 0; n_correct = 0;
		misc.correct_words = []
		misc.incorrect_words = []
		misc.incorrect_words_w_detail = []
		misc.kid = null;
	}
	else{
        setTimeout(function() {
			$("#listen_div").removeClass("hidden");
		}, is_correct ? 0 : 9000); // 0.5 seconds * a
		
		$("#done_button").addClass("hidden");
		print_correct_and_incorrect();
	}

	readPhrase(msg, .85)
	
	
	
	
	
	
	
}