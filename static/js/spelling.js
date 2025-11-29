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
	
	if(kid == "Jack"){ misc.inferred_grade = 1; }
	if(kid == "Will"){ misc.inferred_grade = 1; }
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
	
	word = misc.words[loc];
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

	loc = move_to_next(loc)
	word = misc.words[loc];
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

function display_today_attempts_count(id){
	$("#" + id).empty();
	html = "<div class='bbottom'><span class='bold font-30 msg' style='color: #333;'>Words Tried Today</span></div>"
	html += "<div class='flex bbottom very-light bold'>";
		html += "<div class='col-9 left'><span class='font-18'>Speller</span></div>"
		html += "<div class='col-3 right'><span class='font-18'>Tries</span></div>"
	html += "</div>"
	for(k in misc.today_n_attempts_by_speller){
		
		html += "<div class='flex'>";
		html += "<div class='col-9 left'><span class='font-18'>" + k + "</span></div>"
		html += "<div class='col-3 right'><span class='font-18'>" + misc.today_n_attempts_by_speller[k] + "</span></div>"
		html += "</div>"
	
	}
	$("#" + id).append(html);
}

function print_correct_and_incorrect(){
	
	var elem = $("#results_list_div"); elem.empty();
	
	var html = ""
	
	html += "<div class='col-4 centered'>"
		html += "<div class=' bbottom'><span class='bold font-30 msg'>Correct Words</span></div>"
		if(misc.correct_words.length > 0){
			for(var a = 0;a<misc.correct_words.length;a++){ 
				html += "<div class=''><span class='font-36'>" + misc.correct_words[misc.correct_words.length - a - 1] + "</span></div>"
			}
		}
	html += "</div>"
	html += "<div class='col-4 centered '>"
		html += "<div class='bbottom'><span class='bold font-30 error'>Incorrect Words</span></div>"
		if(misc.incorrect_words.length > 0){
			for(var a = 0;a<misc.incorrect_words.length;a++){ 
				html += "<div class=''><span class='font-36'>" + misc.incorrect_words[misc.incorrect_words.length - a - 1] + "</span></div>"
			}
		}
	html += "</div>"
	html += "<div class='col-4 centered ' id='counts_leaderboard_small'>"
		
	html += "</div>"
	elem.append(html)
	
	display_today_attempts_count('counts_leaderboard_small')
}

function move_to_next(loc){
	relevant_grade = misc.grade;
	if(relevant_grade == null){
		if(misc.kid == "Will"){
			relevant_grade = misc.inferred_grade + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.05 ? 1 : 0);
			
		}
		else{
			relevant_grade = misc.inferred_grade;
		}
	}
	if(!(misc.kid in words_used)){
		words_used[misc.kid] = [];
	}
	words_used_for_kid = words_used[misc.kid]
	console.log(words_used_for_kid);
	while((words_used_for_kid.indexOf(misc.words[loc].word) > -1 || misc.words[loc].grade != relevant_grade) && loc < misc.words.length){
		console.log(misc.words[loc])
		console.log(loc, relevant_grade, misc.words[loc].word, misc.words[loc].grade);
		loc += 1;
		
	}
	misc.word = misc.words[loc];
	console.log("Word is " + misc.word.word);
	words_used_for_kid.push(misc.words[loc].word);
	return loc;
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
	misc.today_n_attempts_by_speller[misc.kid] += 1
	msg = null;
	if(entry == word.word.trim().toLowerCase()){
		
	
		$("#results_div_img").append("<img src='https://storage.googleapis.com/images.pro.lacrossereference.com/TeamLogos/team0001_NotreDame_big.jpg' style='width:50px; padding:0px 20px;' />");
		msg = "Correct"
		is_correct = 1
		misc.correct_words.push(word.word)
	}
	else{
		$("#results_div_img").append("<img src='{{ url_for('static', filename='/img/wrongDuke.png)}}' style='width:50px; padding:0px 20px;' />");
		msg = "Oops, wrong, click next to go to the next word"
		is_correct = 0
		misc.incorrect_words.push(word.word)
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
	
		spellingResultData.correct= n_correct;
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
	console.log("loc", loc, misc.n_words, loc == misc['n_words'])
	
	$("#results_div_str").empty();
	$("#results_div_str").append(`<span class=''>${n_correct} / ${n_tried}</span>`);
	if(n_tried == misc['n_words']){
		document.getElementById('entry_input').value="";
		pct = parseInt(100*n_correct/n_tried) + " percent"
		msg = `Awesome job, you scored ${n_correct} out of ${n_tried}; that's a score of ${pct}`
		$(".on-reset").removeClass("hidden");
		$(".after-reset").addClass("hidden");
		$("#listen_div").addClass("hidden");
		$("#results_list_div").empty()
		
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
		misc.kid = null;
	}
	else{
		$("#listen_div").removeClass("hidden");
		$("#done_button").addClass("hidden");
		print_correct_and_incorrect();
	}

	readPhrase(msg, .85)
	
	
	
	
	
	
	
}