from flask import Flask, render_template_string, render_template, request, jsonify
import openai
import os, sys, random
import json
import traceback

from datetime import datetime, timedelta, date

app = Flask(__name__)
from flask import Markup

# Load OpenAI API key from config
piFolder = "/home/pi/zack/"
if not os.path.isdir(piFolder):
    piFolder = "C:\\Users\\zcapo\\Documents\\workspace"
    if not os.path.isdir(piFolder):
        piFolder = "C:\\Users\\zcapozzi002\\Documents\\workspace"
zc_fldr = os.path.join(piFolder,"ZackInc")
default_fldr = os.path.join(piFolder,"default")
lr_fldr = os.path.join(piFolder,"LacrosseReference")


CONFIG = {'OPENAI_API_KEY': json.loads(open(os.path.join(lr_fldr, "LRP", "LRP_flask", "client_secrets.json"), 'r').read())['local']['openai_sk']}
openai.api_key = CONFIG['OPENAI_API_KEY']
sys.path.insert(0, zc_fldr)
sys.path.insert(0, lr_fldr)
import laxref

import zack_inc_lite as zc



HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Story Writing Helper</title>
    <style>
        body {
            font-family: Arial;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #fff5e6;
        }
        h1 {
            color: #ff6b6b;
            text-align: center;
        }
        .prompt-section {
            margin: 30px 0;
            text-align: center;
        }
        .prompt-section input {
            font-size: 20px;
            padding: 10px;
            width: 400px;
            border: 3px solid #4ecdc4;
            border-radius: 10px;
        }
        .prompt-section button {
            font-size: 20px;
            padding: 10px 30px;
            background-color: #4ecdc4;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            margin-left: 10px;
        }
        .prompt-section button:hover {
            background-color: #45b7aa;
        }
        .story-display {
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 3px solid #ffe66d;
            min-height: 100px;
            font-size: 18px;
            line-height: 1.8;
        }
        .story-display h3 {
            margin-top: 0;
            color: #ff6b6b;
        }
        .toggle-story {
            background-color: #ffe66d;
            color: #333;
            padding: 8px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .hidden {
            display: none;
        }
        .phrases-container {
            margin: 30px 0;
        }
        .phrase-option {
            background-color: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 15px;
            border: 4px solid #4ecdc4;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .phrase-text {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            flex-grow: 1;
        }
        .phrase-text.selected {
            font-size: 36px;
            color: #ff6b6b;
        }
        .phrase-buttons {
            display: flex;
            gap: 10px;
        }
        .phrase-buttons button {
            padding: 10px 20px;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            color: white;
        }
        .listen-btn {
            background-color: #a8e6cf;
        }
        .listen-btn:hover {
            background-color: #8fd9b8;
        }
        .choose-btn {
            background-color: #ff6b6b;
        }
        .choose-btn:hover {
            background-color: #ff5252;
        }
        .continue-btn {
            display: block;
            margin: 30px auto;
            padding: 15px 40px;
            font-size: 24px;
            background-color: #4ecdc4;
            color: white;
            border: none;
            border-radius: 15px;
            cursor: pointer;
        }
        .continue-btn.hidden {
            display: none;
        }
        .continue-btn:hover {
            background-color: #45b7aa;
        }
        .loading {
            text-align: center;
            font-size: 20px;
            color: #ff6b6b;
            margin: 20px 0;
            animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .error {
            background-color: #ffcccc;
            color: #cc0000;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        .recent-phrase {
            font-weight: bold;
            color: #4ecdc4;
        }
        .story-phrase {
            display: inline;
        }
    </style>
</head>
<body>
    <h1>📖 Story Writing Helper 📖</h1>
    
    <div class="prompt-section" id="promptSection">
        <h2>What should your story be about?</h2>
        <input type="text" id="storyPrompt" placeholder="a cat who likes pizza">
        <button onclick="startStory()">Start Story!</button>
    </div>

    <div id="storySection" class="hidden">
        <button class="toggle-story" onclick="toggleStory()">Show/Hide Full Story</button>
        <div class="story-display" id="storyDisplay">
            <h3>Your Story So Far:</h3>
            <div id="storyText" style='font-size:36px;'></div>
        </div>

        <div id="phrasesContainer" class="phrases-container"></div>
        
        <button class="continue-btn hidden" id="nextBtn" onclick="showNextPhrases()">
            Next! ➡️
        </button>
    </div>

    <div class="loading hidden" id="loading">Thinking of good words... 🤔</div>
    <div class="error hidden" id="errorMsg"></div>

    <script>
        let storyContext = [];
        let selectedPhrase = null;
        let storyPrompt = '';
        let pendingPhrases = null;

        function toggleStory() {
            const display = document.getElementById('storyDisplay');
            display.classList.toggle('hidden');
        }

        function startStory() {
            storyPrompt = document.getElementById('storyPrompt').value.trim();
            if (!storyPrompt) {
                alert('Please tell me what your story is about!');
                return;
            }
            
            document.getElementById('promptSection').classList.add('hidden');
            document.getElementById('storySection').classList.remove('hidden');
            
            // Immediately get the first set of phrases
            getNextPhrases();
        }
        var first_load = 1;
        async function getNextPhrases() {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('nextBtn').classList.add('hidden');
            document.getElementById('errorMsg').classList.add('hidden');
            selectedPhrase = null;
            pendingPhrases = null;

            try {
                const response = await fetch('/story-helper', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'generate',
                        prompt: storyPrompt,
                        context: storyContext
                    })
                });

                const data = await response.json();
                document.getElementById('loading').classList.add('hidden');
                
                if (data.error) {
                    showError(data.error);
                } else if (data.phrases) {
                    pendingPhrases = data.phrases;
                    
                    if(first_load){
                        showNextPhrases();
                        first_load=0;
                    }
                    else{
                        document.getElementById('nextBtn').classList.remove('hidden');
                    }
                } else {
                    showError('No phrases returned. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('loading').classList.add('hidden');
                showError('Oops! Something went wrong. Try again!');
            }
        }

        function showNextPhrases() {
            if (pendingPhrases) {
                displayPhrases(pendingPhrases);
                document.getElementById('nextBtn').classList.add('hidden');
                document.getElementById('phrasesContainer').classList.remove('hidden');
            }
        }

        function showError(message) {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.textContent = message;
            errorMsg.classList.remove('hidden');
        }

        function displayPhrases(phrases) {
            const container = document.getElementById('phrasesContainer');
            container.innerHTML = '';

            phrases.forEach((phrase, index) => {
                const div = document.createElement('div');
                div.className = 'phrase-option';
                div.id = `phrase-${index}`;
                
                const phraseEscaped = phrase
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '\\"');
                
                div.innerHTML = `
                    <div class="phrase-text" id="text-${index}">${phrase}</div>
                    <div class="phrase-buttons" id="buttons-${index}">
                        <button class="listen-btn" onclick="readPhrase('${phraseEscaped}', ${index})">
                            🔊 Listen
                        </button>
                        <button class="choose-btn" onclick="choosePhrase('${phraseEscaped}', ${index})">
                            ✓ Choose
                        </button>
                    </div>
                `;
                
                container.appendChild(div);
            });
        }

        function readPhrase(phrase, index) {
            const synth = window.speechSynthesis;
            let voices = synth.getVoices();

            // Some browsers need a callback when voices are loaded
            if (!voices.length) {
                synth.onvoiceschanged = () => readPhrase(phrase, index);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(phrase);

            // Pick a natural-sounding female voice
            console.log(voices)
            const preferredVoice = voices.find(v => 
                v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("samantha") ||   // macOS
                v.name.toLowerCase().includes("google us english") || // Chrome
                v.name.toLowerCase().includes("zira") ||        // Windows
                v.name.toLowerCase().includes("english") && v.lang.startsWith("en")
            );
            const femalePreferredVoice = voices.find(v => 
                v.name.toLowerCase().includes("zira")
            );

            if (preferredVoice) { 
                utterance.voice = femalePreferredVoice;
            }
            else if (preferredVoice) { 
                utterance.voice = preferredVoice;
            }
            console.log("preferredVoice");
            console.log(preferredVoice)

            utterance.rate = 0.85;    // slightly slower, more natural
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            synth.cancel(); // stop anything currently playing
            synth.speak(utterance);
        }        

        function choosePhrase(phrase, index) {
            selectedPhrase = phrase;
            
            // Hide all phrase options
            document.getElementById('phrasesContainer').classList.add('hidden');

            // Add to story context
            storyContext.push(phrase);
            updateStoryDisplay();

            // Immediately start fetching next phrases
            getNextPhrases();
        }

        function updateStoryDisplay() {
            const storyText = document.getElementById('storyText');
            storyText.innerHTML = '';
            
            storyContext.forEach((phrase, index) => {
                const span = document.createElement('span');
                span.className = 'story-phrase';
                
                // Mark the most recent phrase
                if (index === storyContext.length - 1) {
                    span.classList.add('recent-phrase');
                }
                
                span.textContent = phrase;
                storyText.appendChild(span);
                
                // Add space between phrases (except after the last one)
                if (index < storyContext.length - 1) {
                    storyText.appendChild(document.createTextNode(' '));
                }
            });
        }
    </script>
</body>
</html>
'''

@app.route('/spelling_result_endpoint', methods=['POST'])
def spelling_POST():
    
    # Attempt to parse incoming data as JSON (common for async calls like the one likely
    # used by async_run)
    data = request.get_json(silent=True)
    print("\n\nPOST")
    print(data)
    
    # Fallback to form data if JSON parsing failed or if async_run sends form data
    if not data:
        data = request.form

    # Check for the action string sent from the client-side
    if data and data.get('action') == "report_session_start":
        laxref.telegram_alert("[SPELLING]\n\nSession started by %s" % data['kid'])
        return jsonify({"success": True, "no_icon": 1, "async_ID": data.get('action')}), 200
    elif data and data.get('action') == "report_session_end":
        
        return jsonify({"success": True, "no_icon": 1, "async_ID": data.get('action')}), 200
    elif data and data.get('action') == "log_spelling_result":
        
        # 1. Retrieve the correct/incorrect determination
        # The value might be a boolean or a string 'true'/'false' depending on async_run
        is_correct = data.get('correct')
        
        # 2. Retrieve the user being chosen
        kid_id = data.get('kid')
        
        # --- Your Logging / Database Logic Here ---
        print(f"--- Spelling POST Logged Result ---")
        print(f"User (kid): {kid_id}")
        print(f"Correct: {is_correct}")
        print(f"Word: {data.get('word_attempted')}")
        print(f"Entry: {data.get('user_entry')}")
        # Save kid_id and is_correct to your database or log file.

        # The server must return a JSON response so the client-side handleAsyncResponse
        # (in laxrefpro_async.js) can process the result.
        
        query = """INSERT INTO Spelling_Word_Attempts (datestamp, answer, attempt, speller, correct, day_index) VALUES (%s, %s, %s, %s, %s, %s);"""
        param = [datetime.now(), data['answer'], data['attempt'], data['kid'], data['correct'], data['day_index']]
        print ("Query %s w/ %s" % (query, param))
        cursor = zc.zcursor("LOCAL")
        cursor.execute(query, param)
        if data.get('noCommit') not in [1, '1']:
            cursor.commit()
        else:
            print("Answer not saved")
        cursor.close()
        
        if data.get('correct_words') is not None or data.get('incorrect_words') is not None:
            msg = f"[SPELLING]\n\n{data['kid']} scored {data['correct']} out of {data['total']}"
            if data['correct_words'] != []:
                msg += "\n\nCorrect: %s" % zc.list_to_sentence(data['correct_words'])
            if data['incorrect_words'] != []:
                msg += "\n\nIncorrect: %s" % zc.list_to_sentence(data['incorrect_words'])
                
            laxref.telegram_alert(msg)
        return jsonify({"success": True, "no_icon": 1, "async_ID": data.get('action')}), 200

    # ... Handle other actions or return an error for unhandled requests ...
    return jsonify({"error": "Invalid action or data", "no_icon": 1}), 400
    
@app.route('/spelling', methods=['GET', 'POST'])
def spelling():
    
    misc = {'word': "and", "phrases": ["and", "as in", "he and she went to the store"], 'n_words': int(request.args.get("count", 10))}
    misc['grade'] = request.args.get('grade')
    misc['noCommit'] = 1 if request.args.get('noCommit') in [1, '1'] else 0
    print("Grade: %s" % misc['grade'])
    
    misc['day_index'] = (date.today() - date(2025, 11, 27)).days
    
    query = "SELECT speller, count(1) attempts_today from Spelling_Word_Attempts where day_index=%s group by speller;"
    param = [misc['day_index']]
    cursor = zc.zcursor("LOCAL")
    misc['today_n_attempts_by_speller'] = cursor.hashMap_query_results(query, param, "speller", "attempts_today")
    
    query = "SELECT speller, answer from Spelling_Word_Attempts where day_index=%s;"
    param = [misc['day_index']]
    cursor = zc.zcursor("LOCAL")
    misc['today_words_used_by_speller'] = cursor.defaultdict_query_results(query, param, "speller")
    
    
    cursor.close()
    
    
    words = []
    for i in range(1, 6):
        src = os.path.join(default_fldr, 'LilyStoryWriter', 'Spelling', f"ReadingRocketsGrade{i}.json")
        data = json.loads(open(src, 'r').read().replace("â€™", "'"))
        data = [z for z in data if "'" not in z['word'] and "." not in z['word']]
        print (data[0])
        if misc['grade'] not in [None, '']:
            data = [z for z in data if z['grade'] == int(misc['grade'])]
        words += data
    
    random.shuffle(words)
    misc['words'] = words
    if request.method == 'POST':
        return render_template_string(HTML_TEMPLATE)
    else:
    
        return render_template("spelling.html", misc=json.dumps(misc), user_obj={'auth': 1}, layout='layout_jack.html')
        
@app.route('/story-helper', methods=['GET', 'POST'])
def story_helper():
    if request.method == 'GET':
        return render_template_string(HTML_TEMPLATE)
    
    # POST request - generate phrases
    data = request.json
    action = data.get('action')
    
    if action == 'generate':
        prompt = data.get('prompt', '')
        context = data.get('context', [])
        
        # Build the full story so far
        story_so_far = ' '.join(context)
        
        # Create system message for GPT
        system_message = """You are helping a kindergartener write a complete story with a narrative arc.

IMPORTANT: You are building a real story with:
- A beginning (introducing characters/setting)
- A middle (something happens, an adventure or problem)
- An ending (resolution, conclusion)

The phrases should flow together to create a coherent narrative that makes sense when read aloud as one complete story. You must include appropriate transitions and supporting words in your output, even if it adds to the complexity for a kindergartener.

Rules:
- Excluding transitions and other articles, etc, each phrase should be between two and 5 words
- Use only simple, kindergarten-level words (1-2 syllables maximum)
- Focus on sight words and simple CVC (consonant-vowel-consonant) words
- Make phrases that continue the story logically and naturally; they do not have to be full sentences, but they must include the appropriate articles and transitions
- Keep it fun and age-appropriate
- Build toward a satisfying story conclusion
- Examples of good words: cat, dog, run, big, can, see, the, and, go, fun, hop, red, blue, mom, dad, etc.
- "She finds sticks" is not a good way to start a story (why is she finding sticks?); I'd say "Lily wanted to build a fort"
Return ONLY the three phrases, including the appropriate articles and transition words to make a real story, one per line, nothing else."""

        llm_model = "gpt-5"
        if story_so_far:
            user_message = f"Here's what the story is meant to be about: {prompt}\n\nAnd here is what we have of the story so far: {story_so_far}\n\nNow, the task is to continue the story from that point. Generate 3 simple phrases that could come next to continue this story. Be very careful that the phrases you choose contain the appropriate articles and transition words so that the story picks up seamlessly: "
        else:
            #llm_model = "gpt-4o"
            user_message = f"Here's what the story is meant to be about: {prompt}\n\nThis is the beginning of the story. Generate 3 simple phrases, each of which could be the start of a story. These are not the first three phrases in the story; they are 3 potential options that could start the story."
        
        user_message += """\n\nRules:
        - Excluding transitions and other articles, etc, each phrase should be between two and 5 words
        - You should include periods and commas where appropriate 
        - Use only simple, kindergarten-level words (1-2 syllables maximum)
        - Focus on sight words and simple CVC (consonant-vowel-consonant) words
        - Make phrases that continue the story logically and naturally; they do not have to be full sentences, but they must include the appropriate articles and transitions
        - Keep it fun and age-appropriate
        - Build toward a satisfying story conclusion
        - Examples of good words: cat, dog, run, big, can, see, the, and, go, fun, hop, red, blue, mom, dad, etc.
        - "She finds sticks" is not a good way to start a story (why is she finding sticks?); I'd say "Lily wanted to build a fort"
        
        Here's some extra context that you should be aware of. Kitty-corns are kittens that think they are unicorns; they like to do the same things that frolicking kids like to do, but they do them pretending they have horns and hooves and are actual unicorns. If the story request is about kitty-corns, make sure that you stay consistent to this definition.
        
        Return ONLY the three phrases, including the appropriate articles and transition words to make a real story, one per line, nothing else. Do not provide what could be the `next` three phrases; You need to provide three candidates that `could continue` the story (the user will pick one of the three). Each option needs to work with the `story so far` seamlessly; make sure that objects are actually defined in the `story so far` if they are referenced in the candidate phrases. Ideally, each candidate phrase would take the story in a different direction."""
        print (user_message)
        try:
            # Use the correct OpenAI client initialization
            client = openai.OpenAI(api_key=CONFIG['OPENAI_API_KEY'])
            
            response = client.chat.completions.create(
                model=llm_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ])
            print ("\n\nResponse")
            # --- Token & Cost Calculation ---
            try:
                usage = response.usage
                prompt_tokens = usage.prompt_tokens
                completion_tokens = usage.completion_tokens
                total_tokens = usage.total_tokens

                # GPT-5 assumed pricing
                INPUT_RATE =  1.25 / 1000000
                OUTPUT_RATE = 10.0 / 1000000

                cost = (prompt_tokens * INPUT_RATE) + (completion_tokens * OUTPUT_RATE)

                print("\n--- Usage Summary ---")
                print(f"Prompt tokens: {prompt_tokens}")
                print(f"Completion tokens: {completion_tokens}")
                print(f"Total tokens: {total_tokens}")
                print(f"Estimated cost: ${cost:.6f}")

            except Exception:
                print(traceback.format_exc())
                print(json.dumps(response.model_dump(), indent=2))
                
            # Parse the response
            phrases_text = response.choices[0].message.content.strip()
            phrases = [p.strip() for p in phrases_text.split('\n') if p.strip()]
            
            # Ensure we have exactly 3 phrases
            phrases = phrases[:3]
            
            if len(phrases) < 3:
                return jsonify({'error': 'Could not generate 3 phrases. Please try again.'}), 500
            
            return jsonify({'phrases': phrases})
            
        except Exception as e:
            print(f"Error generating phrases: {str(e)}")
            return jsonify({'error': f'Error: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid action'}), 400

def json_handler(obj):
    if callable(getattr(obj, 'to_json', None)):
        return obj.to_json()
    elif isinstance(obj, datetime.datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    elif isinstance(obj, datetime.date):
        return obj.isoformat()
    elif isinstance(obj, datetime.time):
        return obj.strftime('%H:%M:%S')
    elif isinstance(obj, Decimal):
        return float(obj)  # warning, potential loss of precision
    else:
        return json.JSONEncoder().default(obj)

@app.template_filter()
def to_json2(obj):
    #print "to json", obj
    def escape_script_tags(unsafe_str):
        #print ("\n\nUnsafe...\n\n%s\n\n" % unsafe_str)
        if unsafe_str is None: return unsafe_str
        unsafe_str = (unsafe_str
        .replace("\\(", "[zcopenparen]")
        .replace("\\)", "[zccloseparen]")
        .replace("\\[", "[zcopenbracket]")
        .replace("\\]", "[zcclosebracket]")
        .replace("\\r", "[zcr]")
        .replace("\\+", "[zcplus]")
        .replace("\\s", "[zcspace]")
        .replace("\\S", "[zcbigspace]")
        .replace("\\n", "[zcnewline]")
        .replace("\\&", "[zcampersand]")
        .replace("\\$", "[zcdollarsign]")
        .replace("\\.", "[zcperiod]")
        .replace(": None", ": null")
        .replace("\\!", "[zcexclamation]"))
        # seriously: http://stackoverflow.com/a/1068548/8207
        return unsafe_str.replace('</script>', "<' z '/script>").replace('<script', "<zscript")

    # apply formatting in debug mode for ease of development
    indent = 2
    #return mark_safe(escape_script_tags(json.dumps(obj, default=json_handler, indent=indent)))
    output = Markup(escape_script_tags(json.dumps(obj, default=json_handler )))
    #print output[310:]
    return output



if __name__ == '__main__':
    
    app.run(host="0.0.0.0", port=5000, debug=True)