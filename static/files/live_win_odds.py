# -*- coding: utf-8 -*-
"""
Created on Sun Jul 09 11:00:46 2017

@author: zcapo
"""

UPLOAD_TO_LRP_AT_END_ONLY = 0
UPLOAD_TO_YEAR_SPECIFIC_LRP_DIR = 0
UPLOAD_IN_THIS_SCRIPT = 1

import time, sys, json, io

if '--use-connector' in sys.argv:
    import mysql.connector
else:
    import MySQLdb

import datetime, os, subprocess
import re
import math
from math import log as ln
from math import pow
import requests
import os.path
import traceback

from ftplib import FTP

import random 

piFolder = "/home/pi/zack/"
if not os.path.isdir(piFolder):
    piFolder = "C:\\Users\\zcapo\\Documents\\workspace"
    if not os.path.isdir(piFolder):
        piFolder = "C:\\Users\\zcapozzi002\\Documents\\workspace"


zc_fldr = os.path.join(piFolder,"ZackInc")
lr_fldr = os.path.join(piFolder,"LacrosseReference")

sys.path.insert(0, zc_fldr)
sys.path.insert(0, lr_fldr)
import zack_inc_lite as zc
import laxref

import selenium
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

from selenium.webdriver.chrome.service import Service

from datetime import datetime, timedelta
from laxref import telegram_alert


lx_db_tag = "LX2"
if '--laxdotcom-db' in sys.argv:
   lx_db_tag = sys.argv[sys.argv.index('--laxdotcom-db') + 1]
    
path = os.path.join(lr_fldr, 'laxref_machine_ID.txt')
laxref_machine_ID = open(path, 'r').read().strip()

#USE_SERVICE=1 if datetime.now().strftime("%Y%m%d") == "20240214" or laxref_machine_ID in ['LiveStatsVM4', 'LiveStatsVM5'] else 0
USE_SERVICE=1

#if 'NewEgg' not in laxref_machine_ID and 'HP' not in laxref_machine_ID and '--use-upload-route' not in sys.argv:
#    sys.argv.append('--use-upload-route')
    
if '--wait-until' in sys.argv:
    regex2 = re.compile(r'[0-9]+?:[0-9]+?')
    regex1 = re.compile(r'[0-9]{8} [0-9]+?:[0-9]+?')
    timestamp = sys.argv[ sys.argv.index('--wait-until') + 1]

    if regex1.search(timestamp) is not None:
        timestamp = datetime.strptime(timestamp, "%Y%m%d %H:%M")
    elif regex2.search(timestamp) is not None:
        timestamp = datetime.strptime("%s %s" % (datetime.now().strftime("%Y%m%d"), timestamp), "%Y%m%d %H:%M")
    else:
        print("Error: %s did not match either regex" % timestamp); zc.exit("fid921")
    last_min = None
    while datetime.now().strftime("%Y%m%d %H:%M") < timestamp.strftime("%Y%m%d %H:%M"):

        if datetime.now().minute != last_min:
            print("\nIt is not yet %s" % timestamp.strftime("%I:%M %p on %b %d, %Y"))

        last_min = datetime.now().minute
        time.sleep(5)




admin_email = json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())['local']['admin_email']
bot_token = json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())['local']['bot_token']
image_bot_token = json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())['local']['image_bot_token']
import telepot


ZHEX_LIMIT = 21
def to_zhex(i, n):
    
    """
    Converts a number (i) into a base-20 hex string of length n
    """
    used = [chr(65 + z) for z in range(ZHEX_LIMIT - 10)]
    availables = [chr(65 + z) for z in list(range(26)) if chr(65 + z) not in used]
    
    res = ""
    while i >= ZHEX_LIMIT:
        c = int(i % ZHEX_LIMIT)
        
        res = "%s%s" % (c if c < 10 else chr(c - 10 + 65), res)

        i = int(i / ZHEX_LIMIT)
    c = i
    res = "%s%s" % (c if c < 10 else chr(c - 10 + 65), res) 
    
    while len(res) < n:
        random.seed(time.time()); time.sleep(.01)
        res = "%s%s" % (availables[random.randrange(len(availables))], res)
    return res



def from_zhex(orig_s):
    """
    Converts a base-20 hex string (orig_s) into a decimal value
    """
    used = [chr(65 + z) for z in range(ZHEX_LIMIT - 10)]
    availables = [chr(65 + z) for z in range(26) if chr(65 + z) not in used]
    
    s = [z for z in orig_s if z not in availables]

    res = 0; mult = 1

    for i in range(1, len(s) + 1):
        c = s[-i]
        if ord(c) < 65:
            res += int(c)*mult
        else:
            res += (ord(c)-65+10)*mult
        mult *= ZHEX_LIMIT
    return res

def log_abbreviations(data, game_data, txt):
    """
    This function is used to log information about abbreviations and requests made of users in that regard. It checks whether the txt info is already in the log file, and if it's not, it's added
    """
    src = os.path.join(lr_fldr, "LiveWinOdds", "AbbreviationsRequestLog", "game%07d.log" % game_data['ID'])
    existing = ""
    if os.path.isfile(src):
        existing = io.open(src, 'r', encoding='utf8').read()
    
    if txt not in existing:
        f = io.open(src, 'w', encoding='utf8')
        f.write("%s\n\n[%s]\n\n%s" % (existing, datetime.now().strftime("%H:%M:%S"), txt))
        if '--print-abbreviations-log' in sys.argv:
            print (txt)
        f.close()
    return data, game_data
    
def ztc_mean(l):
    return float(sum(l))/float(len(l))
    
def update_laxref_db(query, param, specs, cursor=None):
    """
    This is a central location from which we can update the LaxRef_DB. I wanted to put this function in so that I could investigate how many queries were being run for each game and I wanted to be able to have a central location from which to log them into a file.
    """
    
    need_to_create_location_connection = 0
    if cursor is None:
        need_to_create_location_connection = 1
    
    #[March 20, 2024] In the parse_plays function (and perhaps others), we are creating multiple connections to the LR database in order to make subsequent updates to the same table. It would be better to just have a single connection made per time through parse plays. So I've created a queued_queries object within the game_data object that is reset at the start of the parse plays function. The idea is that rather than running the query when it is identified, we can send it as a queue to be run along with the query/param pair sent in to be executed here. Assuming it shows up as an exact duplicate in the log file of the query just executed, then we could simply skip the first connect/execute call and run it along with the query submitted here. That would allow us to reduce the number of connections that need to be made to the DB to one from two each time through parse plays. Ultimately, it would make more sense to just have data being updated in the first call stored and included in the subsequent query, but for now, this will allow us to be certain about how to implement that while allowing for the one-less connection to be made.
    
    
    start_ms = time.time()
    if need_to_create_location_connection:
        cursor = zc.zcursor("LR")
        
    if param is None:
        cursor.execute(query, [])
    else:
        cursor.execute(query, param)
    if need_to_create_location_connection:
       cursor.commit(); cursor.close(); 
    end_ms = time.time()    
    
    
    if 0 and specs is not None and 'game_ID' in specs and specs['game_ID'] is not None:
        f_log = open(os.path.join(lr_fldr, 'Logs', 'DataProcessingLogs', "dbUpdateQueries_game%08d.txt" % specs['game_ID']), 'a')
        
        if 'queued_queries' in specs and specs['queued_queries'] is not None:
            for obj in specs['queued_queries']:
                query_str = obj['query']
                while "\n" in query_str:
                    query_str = query_str.replace("\n", " ")
                if obj['param'] is None:
                    f_log.write("{:<25}{:<10}ms{:<15}     {}\n".format("", "", "", "[QUEUED] %s" % (query_str)))
                else:
                    f_log.write("{:<25}{:<10}ms{:<15}     {}\n".format("", "", "", "[QUEUED] %s w/ %s" % (query_str, obj['param'])))
                    
        query_str = query
        while "\n" in query_str:
            query_str = query_str.replace("\n", " ")
        create_db_flag = "created conn=%s" % ("yes" if need_to_create_location_connection else "no")
        if param is None:
            f_log.write("{:<25}{:<10.1f}ms{:<15}     {}\n".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[0:-3], (end_ms-start_ms)*1000, create_db_flag, "%s" % (query_str)))
        else:
            f_log.write("{:<25}{:<10.1f}ms{:<15}     {}\n".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[0:-3], (end_ms-start_ms)*1000, create_db_flag, "%s w/ %s" % (query_str, param)))
        if 'commentary' in specs and specs['commentary'] is not None:
            f_log.write("\n*****************************\n%s\n*****************************\n\n" % specs['commentary'].replace("\n", "; "))
        f_log.close()
            
        

def ask_for_abbreviations(data, game_data, found_abbreviations, team_tag, other_team_tag):
    if '--use-db-plays' not in sys.argv:
        if 'abbreviation_user_response' in game_data and game_data['abbreviation_user_response'] not in [None, '']:
            msg1 = "Could not identify the home team from the stored abbreviations in game ID %d (%s) (ignoring abbreviation_user_response: %s)\n%s" % (game_data['ID'], game_data['description'], game_data['abbreviation_user_response'], game_data['url'])
        else:
            msg1 = "Could not identify the home team from the stored abbreviations in game ID %d (%s) (ignoring abbreviation_user_response)\n%s" % (game_data['ID'], game_data['description'], game_data['url'])
    else:
        if 'abbreviation_user_response' in game_data:
            if game_data['abbreviation_user_response'] is not None:
                msg1 = "Could not identify the home team from the stored abbreviations in game ID %d (%s) (abbreviation_user_response found but blank)\n%s" % (game_data['ID'], game_data['description'], game_data['url'])
            else:
                msg1 = "Could not identify the home team from the stored abbreviations in game ID %d (%s) (abbreviation_user_response=%s)\n%s" % (game_data['ID'], game_data['description'], game_data['abbreviation_user_response'], game_data['url'])
        else:
            msg1 = "Could not identify the home team from the stored abbreviations in game ID %d (%s) (abbreviation_user_response not found in game_data)\n%s" % (game_data['ID'], game_data['description'], game_data['url'])
        
    
    print (msg1)
    
    try:
        msg2 = "Home abbrevations:\n\n%s [%s]\n\nAway abbrevations (sans years):\n\n%s [%s]" % (
        ", ".join(game_data['home_abbreviations'])
        , ", ".join(game_data['home_abbreviations_sans_years'])
        , ", ".join(game_data['away_abbreviations'])
        , ", ".join(game_data['away_abbreviations_sans_years']))
    except Exception:
        msg2 = "Home abbrevations:\n\n%s\n\nAway abbrevations:\n\n%s" % (", ".join(game_data['home_abbreviations']), ", ".join(game_data['away_abbreviations']))
    print (msg2)
    
    REQUEST_RESPONSE=0
    if len(found_abbreviations) > 0 and 'detail' in found_abbreviations[0] and found_abbreviations[0]['detail'] is not None:
        if len(found_abbreviations) > 1 and 'detail' in found_abbreviations[1] and found_abbreviations[1]['detail'] is not None:
            if REQUEST_RESPONSE:
                msg3 = "Is %s the HOME or AWAY team? Respond with %s and one of those OR SKIP to set this game into skip mode until the error can be resolved.\n\nPlay Detail [A]: %s\n\nOther tag was %s\n\nPlay Detail [B]: %s\n\n%s" % (team_tag.strip().upper(), game_data['ID'], found_abbreviations[0]['detail'], other_team_tag.strip().upper(), found_abbreviations[1]['detail'], game_data['admin_cockpit_url'])
            else:
                msg3 = "Team tag: %s\n\nPlay Detail [A]: %s\n\nOther tag was %s\n\nPlay Detail [B]: %s\n\n%s" % (team_tag.strip().upper(), found_abbreviations[0]['detail'], other_team_tag.strip().upper(), found_abbreviations[1]['detail'], game_data['admin_cockpit_url'])
        else:
            if REQUEST_RESPONSE:
                msg3 = "Is %s the HOME or AWAY team? Respond with %s and one of those OR SKIP to set this game into skip mode until the error can be resolved.\n\nPlay Detail [A]: %s\n\nOther tag was %s\n\n%s" % (team_tag.strip().upper(), game_data['ID'], found_abbreviations[0]['detail'], other_team_tag.strip().upper(), game_data['admin_cockpit_url'])
            else:
                msg3 = "Team tag: %s\n\nPlay Detail [A]: %s\n\nOther tag was %s\n\n%s" % (team_tag.strip().upper(), found_abbreviations[0]['detail'], other_team_tag.strip().upper(), game_data['admin_cockpit_url'])
    else:
        if REQUEST_RESPONSE:
            msg3 = "Is %s the HOME or AWAY team? Respond with %s and one of those OR SKIP to set this game into skip mode until the error can be resolved.\n\nOther tag was %s\n\n%s" % (team_tag.strip().upper(), game_data['ID'], other_team_tag.strip().upper(), game_data['admin_cockpit_url'])
        else:
            msg3 = "Team tag: %s\n\nOther tag was %s\n\n%s" % (team_tag.strip().upper(), other_team_tag.strip().upper(), game_data['admin_cockpit_url'])
    print (msg3)
    
    
    game_data['abbreviation_user_question'] = "%s\n\n%s\n\n%s" % (msg1, msg2, msg3)
    
    # Add the number of plays we've identified so far (not parsed, just scraped) so that we can tell if it's likely a current game
    if 'n_play_rows_scraped' in game_data and game_data['n_play_rows_scraped'] is not None:
        game_data['abbreviation_user_question'] += "\n\n%d play rows have been scraped in this game" % (game_data['n_play_rows_scraped'])
    
    
    game_data['input_required'] = 1
    output = ""                   
    cursor = zc.zcursor("LR")
    
    query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1 where game_ID=%s" 
    param = [game_data['ID']]
    output += "\n\nQuery %s w/ %s" % (query, param)
    cursor.execute(query, param)
    
    
    query = "UPDATE LaxRef_Game_Streams set last_update=%s, abbreviation_user_question=%s where game_ID=%s" 
    param = [time.time(), game_data['abbreviation_user_question'], game_data['ID']]
    output += "\n\nQuery %s w/ %s" % (query, param)
    cursor.execute(query, param)
    
    cursor.commit(); cursor.close()
    
    if '--use-db-plays' in sys.argv:
        msg = "[FATAL] \n\n %s" % game_data['abbreviation_user_question']
        zc.send_crash(msg, bot_token)
        zc.exit("ABBREVIATION ISSUE")
    
    send_bot = telepot.Bot(token=bot_token)
    
    chat_id_path = os.path.join(piFolder, "ask_chat_id")
    if not os.path.isfile(chat_id_path):
        # Waits for the first incoming message
        updates=[]
        while not updates:
            updates = send_bot.getUpdates()

        # Gets the id for the active chat
        chat_id=updates[-1]['message']['chat']['id']
        f = open(chat_id_path, 'w'); f.write(str(chat_id)); f.close()
    else:
        chat_id = open(chat_id_path, 'r').read()

    
    # Sends a message to the chat

    send_bot.sendMessage(chat_id=chat_id, text=msg1)
    send_bot.sendMessage(chat_id=chat_id, text=msg2)
    send_bot.sendMessage(chat_id=chat_id, text=msg3)
    
    # This is used to notify an admin on the AdminCockpit page that the game requires some sort of resolution.
    
    if '--log-abbreviations' in sys.argv:
        all_msgs = "%s\n%s\n%s" % (msg1, msg2, msg3)
        data, game_data = log_abbreviations(data, game_data, all_msgs)
    
    

    

    ask_dt = time.time()
    
    
    
    # This function allows the user to respond directly from the telegram app. That was the original method of entering abbreviations, but since it causes errors when multiple executions are all waiting for a response AND the Cockpit has subsumed this role, there is no need to use this aspect of the function anymore.
    if not REQUEST_RESPONSE:
        is_home = "-1"
    else:
    
        #listen_bot = telepot.Bot(token=bot_token)
        listen_bot = send_bot
        
        go_on = True
        is_home = None
        waited_for = 0; time_limit = 30
        while go_on and waited_for < time_limit:
            waited_for = time.time() - ask_dt
            res = None
            updates = listen_bot.getUpdates()

            for u in updates:
                if 'message' in u and u['message'] is not None:
                    msg = u['message']
                    if 'text' in msg:
                        
                        u['date_str'] = datetime.fromtimestamp(float(msg['date'])).strftime("%I:%M:%S %p")
                        u['after'] = True if msg['date'] > ask_dt else False
                        u['is_an_answer'] = False
                        u['home'] = False
                        if u['after'] and ("SKIP" in msg['text'].strip().upper() or "HOME" in msg['text'].strip().upper() or "AWAY" in msg['text'].strip().upper()) and (("%d" % game_data['ID']) in msg['text']):
                            
                            this_response = {'game_ID': game_data['ID'], 'team_type': "", "team": team_tag.strip().upper()}
                            game_data['abbreviation_user_response'] = msg['text']
                            game_data['input_required'] = 0
                            
                            
                            u['is_an_answer'] = True
                            if "HOME" in msg['text'].strip().upper():
                                u['home'] = True; res = True
                                this_response['team_type'] = "HOME"
                            elif "AWAY" in msg['text'].strip().upper():
                                res = False
                                this_response['team_type'] = "AWAY"
                            elif "SKIP" in msg['text'].strip().upper():
                                listen_bot = None; return data, None
                                
                            output += "This Response: %s" % json.dumps(this_response)
                            
                            try:    
                                if this_response['team_type'] not in [None, ''] and game_data['abbreviation_user_response_dict'] is not None:
                                    # Let's see how this response compares to previous responses
                                    if this_response['team_type'] in [z['team_type'] for z in game_data['abbreviation_user_response_dict']]:
                                        tmp_response = game_data['abbreviation_user_response_dict'][[z['team_type'] for z in game_data['abbreviation_user_response_dict']].index(this_response['team_type']) ]
                                        if tmp_response['team'] != this_response['team']:
                                            msg = "In %s, for the %s away, we had %s stored, but the most recent user input was %s" % (game_data['description'], this_response['team_type'], tmp_response['team'], this_response['team'])
                                            msg += "\nthe game_data.abbreviation_user_response_dict object will be updated"
                                            msg += "\nhttps://pro.lacrossereference.com/admin_cockpit?dt=%s&game_ID=%d" % (game_data['game_date'].strftime("%Y%m%d"), game_data['ID'])
                                            if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)
                                            tmp_response['team'] = this_response['team']
                                    else:
                                        game_data['abbreviation_user_response_dict'].append(this_response)
                                    
                            except Exception:
                                msg = traceback.format_exc()
                                if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)
                                
                            try:    
                                cursor = zc.zcursor("LR"); 
                                
                                query = "UPDATE LaxRef_Game_Streams set last_update=%s, abbreviation_user_response=%s, abbreviation_user_response_dict=%s where game_ID=%s"
                                try:
                                    # Try to store the entire abbreviation_user_response_dict object in the database for later use
                                    param = [time.time(), "%s-%s" % (team_tag.strip().upper(), msg['text']), json.dumps(game_data['abbreviation_user_response_dict']), game_data['ID']]
                                except Exception:
                                    param = [time.time(), "%s-%s" % (team_tag.strip().upper(), msg['text']), json.dumps(this_response), game_data['ID']]
                                    
                                output += "\n\nQuery %s w/ %s" % (query, param)
                                cursor.execute(query, param); 
                                
                                query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=0 where game_ID=%s" 
                                param = [game_data['ID']]
                                output += "\n\nQuery %s w/ %s" % (query, param)
                                cursor.execute(query, param)
                                cursor.commit(); cursor.close()
                            except Exception:
                                msg = traceback.format_exc()
                                if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)

            fmt = "{:<10}{:<10}{:<15}{:<10}{:<100}"
            header = fmt.format("Answer?", "HOME?", "Date", "After", "Msg")
            output += "\n\n" + header + "\n" + ("-"* len(header))

            for u in updates:
                if 'is_an_answer' in u:
                    output += "\n"+ fmt.format(u['is_an_answer'], u['home'], u['date_str'], u['after'], "" if 'text' not in u['message'] else u['message']['text'])

            #print (output)
            if '--log-abbreviations' in sys.argv:
                data, game_data = log_abbreviations(data, game_data, output)

            if res is not None:
                is_home = res
                go_on = False

            if go_on:
                time.sleep(1)

        if waited_for > time_limit:
            is_home = "-1"
    listen_bot = None
    return data, is_home

def LRP_connect(creds):
    USE_ZC_DB = 1
    if USE_ZC_DB:
        conn, cursor = zc.db("LRP")
    else:
        if '--use-connector' in sys.argv:
            conn = mysql.connector.connect(user=creds['LRPDBUSER'], password=creds['LRPDBPASS'], host=creds['LRPDBHOST'], database=creds['LRPDBNAME'], connection_timeout=14400)
        else:
            conn = MySQLdb.connect(
                            host=creds['LRPDBHOST'],
                            port=9999,
                            user=creds['LRPDBUSER'], passwd=creds['LRPDBPASS'], db=creds['LRPDBNAME'], charset="utf8", use_unicode=True)

        cursor = conn.cursor()
    return conn, cursor

def create_cipher():
    f = open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r')
    client_secrets = json.loads(f.read())
    f.close()
    key = client_secrets['web']['key']
    low_value = client_secrets['web']['lv']
    
    res = []
    key_values = []
    for c in key:
        if ord(c) not in key_values:
            key_values.append(ord(c))
            res.append(c)

    ascii = range(low_value, 127)
    for a in ascii:
        if a not in key_values:
            res.append(chr(a))
            
    #print("Full cipher is %s (len=%d)" % ("".join(res), len("".join(res))))
    return res

def decrypt(st, local_cipher=None):

    if st is None: return None
    if local_cipher is None: local_cipher = create_cipher()
    #print("Decrypting %s" % st)
    key = ""
    
    
    cipher_text = create_cipher()
    
    f = open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r')
    client_secrets = json.loads(f.read())
    f.close()
    low_value = client_secrets['web']['lv']
    
    res = ""
    if len(cipher_text) > 0:
        for s in st:

            try:
                res += chr(cipher_text.index(s)+low_value)
            except ValueError as f:
                
                if ord(s) == 8:
                    res += chr(cipher_text.index("\\")+low_value)
                    res += chr(cipher_text.index("b")+low_value)
                    
                
    return res

def encrypt(st, local_cipher=None):
    if st is None: return None
    if local_cipher is None: local_cipher = create_cipher()
    
    res = ""
    cipher_text = create_cipher()

    
    f = open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r')
    client_secrets = json.loads(f.read())
    f.close()
    low_value = client_secrets['web']['lv']
    

        
    for i, s in enumerate(st):
        try:
            res += cipher_text[ord(s)-low_value]
        except IndexError:
            logging.exception("Error converting char #%d - %s (%d)" %(i, s, ord(s)))
            res += " "
       
    return res
 
def adjust_urls(game_data):
    """
    Change the url to the appropriate url string (i.e. summary to play by play) so that we can avoid a click step
    """
    
    sidearm_summary_regex = re.compile(r'((com\/sidearmstats\/[wm]lax\/)play-by-play)', re.IGNORECASE)
    game_data['is_sidearm_pxp'] = 0
    
    if 'url' in game_data and game_data['url'] is not None and sidearm_summary_regex.search(game_data['url']) is not None:
        game_data['is_sidearm_pxp'] = 1

            
    return game_data
    
def get_data_object():
    start_ms = time.time()
    queries = []; params = []; timestamps = [];
    
    timestamps.append({'tag1': 'Start', 'tag2': None, 'time': time.time()})
    
    sys.argv.append("--upload-to-LRP")
    
    
        
    data = {'last_query_data_update': time.time(), 'query_log': [], 'last_game_objects_refresh': time.time(), 'initializing_first_tab': 1, 'last_source': None, 'dt': datetime.now().strftime("%Y-%m-%d"), 'year': datetime.now().year, 'yesterday_dt': (datetime.now()-timedelta(days=1)).strftime("%Y-%m-%d"), 'telegram_messages': [], 'secrets': json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())}
    if '-dt' in sys.argv:
        data['dt'] = sys.argv[sys.argv.index('-dt') + 1]
        if '-' in data['dt']:
            data['year'] = datetime.strptime(data['dt'], "%Y-%m-%d").year
        else:
            data['year'] = datetime.strptime(data['dt'], "%Y%m%d").year
            data['dt'] = "%s-%s-%s" % (data['dt'][0:4], data['dt'][4:6], data['dt'][6:8])
    data['games'] = [{'ID': int(z), 'seq': i} for i, z in enumerate(sys.argv[sys.argv.index("--game-ID") + 1].split("|"))]
    timestamps.append({'tag1': 'Get Games List', 'tag2': None, 'time': time.time()})

    # ORIGINALLY, we were requesting data associated with the current day, but this was missing data from one of the games requested because it was a --use-db-plays run the next morning; I noticed this because a game had triplicate records in the box score. I bet what happened is that the game was run after midnight and when that happened, the wrong day was used in the lookup. It seems like pulling data from every single game is excessive, but perhaps it's not so bad since it's all numbers
    
    #lx_game_data_query = "SELECT a.schedule_id, a.roster_id, a.goals, a.assists, a.saves, a.goals_allowed, a.shots, a.gb, a.turnovers, a.ct, a.fo_won, a.fo_taken from game_data{:.0f} a, schedule{:.0f} b where DATE(b.date)=%s and b.id=a.schedule_id".format(data['year']-2000, data['year']-2000)
    #lx_game_data_param = [data['dt']]
    query_tag = 'lx_game_data_query'
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)

    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        tmp_game_data_records = json.loads(open(stored_data_src, 'r').read())
    else:
        lx_game_data_query = "SELECT a.schedule_id, a.roster_id, a.goals, a.assists, a.saves, a.goals_allowed, a.shots, a.gb, a.turnovers, a.ct, a.fo_won, a.fo_taken from game_data{:.0f} a, schedule{:.0f} b where b.id=a.schedule_id".format(data['year']-2000, data['year']-2000)
        lx_game_data_param = []
        
        
        tmp_start_ms = time.time()
        conn, cursor = zc.db(lx_db_tag)
        cursor.execute(lx_game_data_query, lx_game_data_param)
        tmp_game_data_records = zc.dict_query_results(cursor)
        cursor.close(); conn.close()
        tmp_end_ms = time.time()
        
        print("Returned {:,} game_data records in {:.3f}s from game_data{:.0f} for games played on {}".format(len(tmp_game_data_records), tmp_end_ms - tmp_start_ms, data['year']-2000, data['dt']))
        
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            tmp_data = json.dumps(tmp_game_data_records, default=zc.json_handler, indent=1)
            f_stored = open(stored_data_src, 'w')
            f_stored.write(tmp_data)
            f_stored.close()
    timestamps.append({'tag1': 'lx_game_data_query', 'tag2': None, 'time': time.time()})
    
    
    
    
    query_tag = "initial_subscribers"
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)
    conn = None
    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        data['basic_subscribers'] = json.loads(open(stored_data_src, 'r').read())
    else:
        if conn is None:
            conn, cursor = LRP_connect(data['secrets']['web'])
        print ("{:<75}{:<20}".format("initial_subscribers", datetime.now().strftime("%H:%M:%S")))
        cursor.execute("Select a.ID 'user_ID', c.ID 'subscription_ID', a.email 'encrypted_email', d.favorite_team_ID, d.favorite_player_ID, CASE WHEN a.ID=1 THEN 1 ELSE IFNULL(d.receive_end_game_emails, 1) END 'receive_end_game_emails' from LRP_Users a, LRP_Groups b, LRP_Subscriptions c, LRP_User_Preferences d where a.active and b.active and c.active and c.status='active' and NOT ISNULL(d.favorite_team_ID) and d.active and b.group_type='individual' and b.user_ID=a.ID and c.product_ID=7 and d.user_ID=a.ID and c.group_ID=b.ID", [])
        data['basic_subscribers'] = zc.dict_query_results(cursor)
        for s in data['basic_subscribers']:
            s['sub_type'] = "basic"
            
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            tmp_data = json.dumps(data['basic_subscribers'], default=zc.json_handler, indent=1)
            f_stored = open(stored_data_src, 'w')
            f_stored.write(tmp_data)
            f_stored.close()
            
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
        
    query_tag = "team_subscribers"
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)

    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        data['team_subscribers'] = json.loads(open(stored_data_src, 'r').read())
    else:

        if conn is None:
            conn, cursor = LRP_connect(data['secrets']['web'])
        print ("{:<75}{:<20}".format("team_subscribers", datetime.now().strftime("%H:%M:%S")))
        cursor.execute("Select a.ID 'user_ID', c.ID 'subscription_ID', a.email 'encrypted_email', b.team_ID favorite_team_ID, NULL favorite_player_ID, IFNULL(d.receive_end_game_emails, 1) 'receive_end_game_emails' from LRP_Users a, LRP_Groups b, LRP_Group_Access e, LRP_Subscriptions c, LRP_User_Preferences d where a.active and IFNULL(a.is_admin, 0)=0 and b.active and c.active and c.status='active' and d.active and b.group_type='team' and e.group_ID=b.ID and e.user_ID=a.ID and e.status='active' and (c.product_ID=3 or c.product_ID=6 or c.product_ID=9) and d.user_ID=a.ID and c.group_ID=b.ID", [])
        data['team_subscribers'] = zc.dict_query_results(cursor)
        for s in data['team_subscribers']:
            s['sub_type'] = "team"
            
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            tmp_data = json.dumps(data['team_subscribers'], default=zc.json_handler, indent=1)
            f_stored = open(stored_data_src, 'w')
            f_stored.write(tmp_data)
            f_stored.close()
        
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
        
    if conn is not None:
        cursor.close(); conn.close()
    data = increment_queries(data, query_tag, data['basic_subscribers'] + data['team_subscribers'])
    
    # Pull in the players JSON file the trim it down to what we need (ID, player, pro_url_tag)
    src = os.path.join(lr_fldr, "LRP", "LRP_flask", "LocalDocs", "GeneralData", "dbLaxRef_Players.json")
    data['db_players'] = []
    if os.path.isfile(src):
        attempts = 30
        tmp_data = None
        while tmp_data is None and attempts > 0:
            try:
                tmp_data = json.loads(open(src, 'r').read())
                for p in tmp_data:
                    d = {'ID': p['ID'], 'player': p['player'], 'pro_url_tag': p['pro_url_tag']}
                    d['player_hash'] = laxref.hash_player_name(p['player'])
                    data['db_players'].append(d)
                
            except Exception:
                
                attempts -= 1
                time.sleep(1)
                
    timestamps.append({'tag1': "dbLaxRef_Players.json", 'tag2': None, 'time': time.time()})
    cursor = zc.zcursor("LR")
    
    data['uaEGA_percentiles'] = None
    query_tag = "uaEGA_percentiles"
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)

    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    
    print ("{:<75}{:<20}".format(query_tag, datetime.now().strftime("%H:%M:%S")))
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        data['uaEGA_percentiles'] = json.loads(open(stored_data_src, 'r').read())
    else:
        query = "SELECT league, 1.0 - (sum(CASE WHEN usage_adjusted_EGA > 0.0 THEN 1 ELSE 0 END)/count(1)) rating_0, 1.0 - (sum(CASE WHEN usage_adjusted_EGA > 1.0 THEN 1 ELSE 0 END)/count(1)) rating_1,1.0 - (sum(CASE WHEN usage_adjusted_EGA > 2.0 THEN 1 ELSE 0 END)/count(1)) rating_2,1.0 - (sum(CASE WHEN usage_adjusted_EGA > 3.0 THEN 1 ELSE 0 END)/count(1)) rating_3,1.0 - (sum(CASE WHEN usage_adjusted_EGA > 4.0 THEN 1 ELSE 0 END)/count(1)) rating_4,1.0 - (sum(CASE WHEN usage_adjusted_EGA > 5.0 THEN 1 ELSE 0 END)/count(1)) rating_5 from LaxRef_Player_Game_Summaries a, LaxRef_Games b where a.active and b.active and b.ID=a.game_ID and zgame_year >= %s group by league"
        
        cursor.execute(query, [(datetime.now()-timedelta(days=365.25*1)).year])
        print ("{:<75}{:<20}".format("    query returned", datetime.now().strftime("%H:%M:%S")))
        data['uaEGA_percentiles'] = zc.dict_query_results(cursor)
        
        
            
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            tmp_data = json.dumps(data['uaEGA_percentiles'], default=zc.json_handler, indent=1)
            f_stored = open(stored_data_src, 'w')
            f_stored.write(tmp_data)
            f_stored.close()
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query = "SELECT league, adjusted_off_turnover_rate, adjusted_off_shooting_pct, adjusted_off_efficiency, adjusted_def_save_pct, adjusted_def_efficiency, adjusted_faceoff_win_rate, adjusted_def_save_pct from LaxRef_Team_Seasons a where year >= %s and active and NOT ISNULL(off_efficiency)"
    print ("{:<75}{:<20}".format("historical_statistical_ratings", datetime.now().strftime("%H:%M:%S")))
    cursor.execute(query, [(datetime.now()-timedelta(days=365.25*2)).year])
    data['historical_statistical_ratings'] = zc.dict_query_results(cursor)
    timestamps.append({'tag1': "Query: historical_statistical_ratings", 'tag2': None, 'time': time.time()})
    
    query_tag = "initial_stat_adjustments"
    print ("{:<75}{:<20}".format("initial_stat_adjustments", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT a.team_ID, a.offense, a.stat_ID, b.stat, opp_adjustment, self_adjustment, reverse from LaxRef_Season_Stat_Adjustments a, LaxRef_Statistics b where a.stat_ID=b.ID and year=%s", [data['dt'].split("-")[0]])
    data['stat_adjustments'] = zc.dict_query_results(cursor)
    data = increment_queries(data, query_tag, data['stat_adjustments'])
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    tmp_start_ms = time.time()
    
    query_tag = "LaxRef_Teams.replacement_text"
    print ("{:<75}{:<20}".format("LaxRef_Teams.replacement_text", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT ID team_ID, replacement_text from LaxRef_Teams where active and NOT ISNULL(replacement_text)", [])
    tmp_team_replacement_text = zc.dict_query_results(cursor)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "LaxRef_Alternate_Player_Names"
    print ("{:<75}{:<20}".format("LaxRef_Alternate_Player_Names", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT player_ID, alternate_name, team_ID from LaxRef_Alternate_Player_Names where active", [])
    tmp_alternate_names = zc.dict_query_results(cursor)
    for p in tmp_alternate_names:
        p['hash'] = laxref.hash_player_name(p['alternate_name'])
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "rosters"
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)

    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    print ("{:<75}{:<20}".format("rosters", datetime.now().strftime("%H:%M:%S")))
    
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        tmp_rosters = json.loads(open(stored_data_src, 'r').read())
    else:
        if '--roster-year' in sys.argv:
            cursor.execute("SELECT b.player, b.ID player_ID, a.team_ID, b.pro_url_tag, a.laxdotcom_ID from LaxRef_Player_Seasons a, LaxRef_Players b where b.ID=a.player_ID and a.active and b.active and IFNULL(b.is_individual, 1)=1 and a.year=%s", [sys.argv[sys.argv.index('--roster-year') + 1]])
        else:
            cursor.execute("SELECT b.player, b.ID player_ID, a.team_ID, b.pro_url_tag, a.laxdotcom_ID from LaxRef_Player_Seasons a, LaxRef_Players b where b.ID=a.player_ID and a.active and b.active and IFNULL(b.is_individual, 1)=1 and a.year=%s", [data['dt'].split("-")[0]])
        tmp_rosters = zc.dict_query_results(cursor)
        for p in tmp_rosters:
            p['hash'] = laxref.hash_player_name(p['player'])
            p['last_name'] = p['player'].split(" ")[-1].upper().strip()
            p['alternate_names'] = [z['hash'] for z in tmp_alternate_names if z['player_ID'] == p['player_ID']]
        data = increment_queries(data, query_tag, tmp_rosters)
        tmp_end_ms = time.time()
        print ("{:<60}{:<10.3f}s".format("Query: {} ({:,} rows)" .format (query_tag, len(tmp_rosters)), (tmp_end_ms - tmp_start_ms)))
        
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            f_stored = open(stored_data_src, 'w')
            f_stored.write(json.dumps(tmp_rosters))
            f_stored.close()
        
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    
    query_tag = "laxref_content"
    print ("{:<75}{:<20}".format("laxref_content", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT content, content_type, game_ID from LaxRef_Content a, LaxRef_Games b where b.active and a.active and b.ID=a.game_ID and DATE(b.game_date)>=%s", [(datetime.now()-timedelta(days=3)).strftime("%Y-%m-%d")])
    laxref_content = zc.dict_query_results(cursor)
    data = increment_queries(data, query_tag, laxref_content)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    
    query_tag = "laxref_active_live_game_IDs"
    print ("{:<75}{:<20}".format("laxref_active_live_game_IDs", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT game_ID from LaxRef_Active_Live_WP_Games a, LaxRef_Games b where b.ID=a.game_ID and zgame_year=%s and b.active and a.active", [data['year']])
    laxref_active_live_game_IDs = zc.dict_query_results(cursor)
    data = increment_queries(data, query_tag, laxref_active_live_game_IDs)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})

    query_tag = "initial_db_win_odds"
    stored_data_src = os.path.join(lr_fldr, 'Logs', 'LWO_%s.json' % query_tag)

    load_data_from_file = 1 if ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)) and os.path.isfile(stored_data_src) else 0
    
    WP_SECTIONS=180
    print ("{:<75}{:<20}".format("initial_db_win_odds (FF=%d)" % load_data_from_file, datetime.now().strftime("%H:%M:%S")))
    if load_data_from_file:
        # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
        all_leagues_db_win_odds = json.loads(open(stored_data_src, 'r').read())
    else:
        
        
        query = """Select a.league, a.game_section, a.deficit, a.win_odds raw_win_odds, a.n_wins, a.n_occurrences
            from LaxRef_Win_Odds_Lookup a where 
            a.sections=%s and a.n_occurrences > 0 order by a.deficit asc"""
        param = [WP_SECTIONS]
        cursor.execute(query, param)
        all_leagues_db_win_odds = zc.dict_query_results(cursor)
        print ("{:<75}{:<20}".format(" writing DB results", datetime.now().strftime("%H:%M:%S")))
        all_leagues_db_win_odds = all_leagues_db_win_odds
        
        all_leagues_db_win_odds_sections = []
        mod_val = 20
        print ("{:<75}{:<20}".format(" creating modded lists", datetime.now().strftime("%H:%M:%S")))
        
        for i in range(mod_val):
            all_leagues_db_win_odds_sections.append([z for z in all_leagues_db_win_odds if int(z['deficit'] % mod_val) == i])
            
        
        print ("{:<75}{:<20}".format(" calculating weighted odds", datetime.now().strftime("%H:%M:%S")))
        for i, d in enumerate(all_leagues_db_win_odds):
            #if i % 10000 == 0:
            #    print ("{:<75}{:<20}".format("  {:<6,}/{:<6,}" .format (i+1, len(all_leagues_db_win_odds)), datetime.now().strftime("%H:%M:%S")))
            tmp_mod = int(d['deficit'] % mod_val)
            tmp_rows = [z for z in all_leagues_db_win_odds_sections[tmp_mod] if z['league'] == d['league'] and z['game_section'] == d['game_section'] and z['deficit'] == d['deficit'] and abs(z['game_section'] - d['game_section']) < 5 and None not in [z['n_wins'], z['n_occurrences']]]
            
            d['total_n_wins'] = sum([z['n_wins'] for z in tmp_rows])
            d['total_n_occurrences'] = sum([z['n_occurrences'] for z in tmp_rows])
            
            d['win_odds'] = None if d['total_n_occurrences'] == 0 else (d['total_n_wins']/d['total_n_occurrences'])
                
        data = increment_queries(data, query_tag, all_leagues_db_win_odds)
        
            
        if not os.path.isfile(stored_data_src) and ('--use-stored-data-files-where-possible' in sys.argv or (datetime.now().strftime("%Y%m%d") == "20240222" and '--set-laxshop-to-final' in sys.argv)):
            # To make the overnight process run faster, we can just load this data from a file instead of go through the 17-second process of calculating it from the database raw data
            f_stored = open(stored_data_src, 'w')
            f_stored.write(json.dumps(all_leagues_db_win_odds))
            f_stored.close()
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "initial_play_values"
    print ("{:<75}{:<20}".format("initial_play_values", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT * from LaxRef_Play_Values")
    all_leagues_db_play_values = zc.dict_query_results(cursor)
    data = increment_queries(data, query_tag, all_leagues_db_play_values)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "team_game_summaries"
    print ("{:<75}{:<20}".format("team_game_summaries", datetime.now().strftime("%H:%M:%S")))
    cursor.execute("SELECT a.team_ID, a.opp_team_ID, DATE(b.game_date) dt, CASE WHEN a.data_type='offense' THEN 1 ELSE 0 END is_offense, a.game_ID, a.goals, a.assists, a.possession_margin, a.time_to_first_shot, a.gb_win_rate, a.avg_possession_length, a.possessions, a.shots, a.sog, a.turnovers, a.faceoff_win_rate, a.saves, a.on_keeper_shots_faced from LaxRef_Team_Game_Summaries a, LaxRef_Games b where b.active and b.ID=a.game_ID and a.active and b.zgame_year=%s and ISNULL(a.filter) order by b.game_date asc", [data['year']])
    team_game_summaries = zc.dict_query_results(cursor)
    data = increment_queries(data, query_tag, team_game_summaries)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "initial_all_old_games"
    query = "SELECT ID, confirmed_away_team, away_ID, IFNULL(alt_away_team, '') 'alt_away_team', away_team, lwo_away_team, lwo_home_team, confirmed_home_team, home_ID, IFNULL(alt_home_team, '') 'alt_home_team', home_team from LaxRef_Games where status like 'complete%%' and active=1"
    print ("{:<75}{:<20}".format("initial_all_old_games", datetime.now().strftime("%H:%M:%S")))
    all_old_games = cursor.dqr(query, [])
    data = increment_queries(data, query_tag, all_old_games)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    # If there is more than one game specified, remove any games automatically if they have been finalized already. This would mean plays have been uploaded and we don't need to do anything here.
    if len(data['games']) > 1:
        tmp = [z['ID'] for z in data['games'] if z['ID'] in [y['ID'] for y in all_old_games]]
        data['games'] = [z for z in data['games'] if z['ID'] not in [y['ID'] for y in all_old_games]]
        
    
    query_tag = "initial_game_recs"
    print ("{:<75}{:<20}".format("initial_game_recs", datetime.now().strftime("%H:%M:%S")))
    if len(data['games']) == 1:
        
        game_recs = cursor.dqr("SELECT a.ID, a.away_ID, a.home_ID, a.tournament_slot_ID, a.game_date, pregame_home_wp, a.league, a.home_elo, a.away_elo, d.league 'away_league', e.league 'home_league', c.laxref_team_url 'home_url', b.laxref_team_url 'away_url', a.pro_url_tag game_pro_url_tag, a.laxdotcom_ID, c.pro_url_tag 'home_pro_url_tag', b.pro_url_tag 'away_pro_url_tag', c.unlocked 'home_unlocked', b.unlocked 'away_unlocked', c.name 'confirmed_home_team', b.name 'confirmed_away_team', c.display_name 'display_home', b.display_name 'display_away', c.short_code 'short_code_home', b.short_code 'short_code_away', c.gif_path 'home_gif', b.gif_path 'away_gif', c.IG_handle 'home_IG', b.IG_handle 'away_IG', c.twitter_handle 'home_twitter', b.twitter_handle 'away_twitter', b.bg_color 'orig_away_bg_color', b.fg_color 'orig_away_fg_color', c.bg_color 'orig_home_bg_color', c.fg_color 'orig_home_fg_color', a.status, a.laxdotcom_ID from LaxRef_Games a, LaxRef_Teams b, LaxRef_Teams c, LaxRef_Team_Seasons d, LaxRef_Team_Seasons e where e.team_ID=c.ID and d.team_ID=b.ID and e.year=d.year and e.year=a.zgame_year and a.away_ID=b.ID and a.home_ID=c.ID and a.active and a.ID=%s", [data['games'][0]['ID']])
    
    else:
        game_recs = cursor.dqr("SELECT a.ID, a.away_ID, a.home_ID, a.tournament_slot_ID, a.game_date, pregame_home_wp, a.league, a.home_elo, a.away_elo, d.league 'away_league', e.league 'home_league', c.laxref_team_url 'home_url', b.laxref_team_url 'away_url', a.pro_url_tag game_pro_url_tag, a.laxdotcom_ID, c.pro_url_tag 'home_pro_url_tag', b.pro_url_tag 'away_pro_url_tag', c.unlocked 'home_unlocked', b.unlocked 'away_unlocked', c.name 'confirmed_home_team', b.name 'confirmed_away_team', c.display_name 'display_home', b.display_name 'display_away', c.short_code 'short_code_home', b.short_code 'short_code_away', c.gif_path 'home_gif', b.gif_path 'away_gif', c.IG_handle 'home_IG', b.IG_handle 'away_IG', c.twitter_handle 'home_twitter', b.twitter_handle 'away_twitter', b.bg_color 'orig_away_bg_color', b.fg_color 'orig_away_fg_color', c.bg_color 'orig_home_bg_color', c.fg_color 'orig_home_fg_color', a.status, a.laxdotcom_ID from LaxRef_Games a, LaxRef_Teams b, LaxRef_Teams c, LaxRef_Team_Seasons d, LaxRef_Team_Seasons e where e.team_ID=c.ID and d.team_ID=b.ID and e.year=d.year and e.year=%s and a.away_ID=b.ID and a.home_ID=c.ID and a.active and a.zgame_year=%s", [int(data['dt'].split("-")[0]), data['dt']])
    data = increment_queries(data, query_tag, game_recs)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
        
    query_tag = "initial_game_streams"
    print ("{:<75}{:<20}".format("initial_game_streams", datetime.now().strftime("%H:%M:%S")))
    if len(data['games']) == 1:   
        game_streams = cursor.dqr("SELECT a.ID, b.ID 'gs_ID', b.url, b.url_confirmed, b.abbreviation_user_response, b.abbreviation_user_response_dict, b.description, b.ignore_duplicate_plays_error, b.auto_final, b.game_file, a.neutral_site, live_tweet from LaxRef_Games a, LaxRef_Game_Streams b where b.active and a.active and b.game_ID=a.ID and a.ID=%s", [data['games'][0]['ID']])
    else:
        game_streams = cursor.dqr("SELECT a.ID, b.ID 'gs_ID', b.url, b.url_confirmed, b.abbreviation_user_response, b.abbreviation_user_response_dict, b.description, b.ignore_duplicate_plays_error, b.auto_final, b.game_file, a.neutral_site, live_tweet from LaxRef_Games a, LaxRef_Game_Streams b where b.active and a.active and b.game_ID=a.ID and DATE(a.game_date)=%s", [data['dt']])
    data = increment_queries(data, query_tag, game_streams)
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    query_tag = "initial_live_games"
    print ("{:<75}{:<20}".format("initial_live_games", datetime.now().strftime("%H:%M:%S")))
    live_games = cursor.dqr("SELECT a.ID 'game_ID', unidentified_players_error unidentified_players_str, c.ID 'live_ID', IFNULL(c.clear_abbreviations, 0) clear_abbreviations, IFNULL(c.debug_live_processing, 0) debug_live_processing, IFNULL(c.ignore_unidentified_players_error, 0) ignore_unidentified_players_error, c.first_timestamp_is_zero, c.replacement_text, c.reverse_timestamps, c.skip from LaxRef_Games a, LaxRef_Active_Live_WP_Games c where c.active and a.active and c.game_ID=a.ID and DATE(a.game_date)=%s", [data['dt']])
    data = increment_queries(data, query_tag, live_games)
    cursor.close()
    timestamps.append({'tag1': "Query: %s" % query_tag, 'tag2': None, 'time': time.time()})
    
    # Populate the various data points from the database record
    recaps = [z for z in laxref_content if z['content_type'] == "recap-paragraph"]
    for game_data in data['games']:
        game_data['recap-paragraph'] = None
        game_data['ignore_duplicate_plays_error'] = None
        game_data['ignore_unidentified_players_error'] = None
        game_data['abbreviation_user_response'] = None
        game_data['abbreviation_user_response_dict'] = []
        game_data['parse_plays_n'] = 0.
        game_data['n_play_rows_scraped'] = 0.
        game_data['rapid_upload_complete_flag_set'] = 0
        game_data['total_parse_plays_elapsed'] = 0.
        
        data, game_data = log_abbreviations(data, game_data, "--GAMESTART @ %s--" % datetime.now().strftime("%Y%m%d%H%M%S"))
        
        # These lists are meant to try and identify how often each game is being scraped as a way to determine how many of the actual HTML updates are being captured and that we are checking each page frequently enough.
        game_data['scrape_timestamps'] = []
        game_data['scrape_plays_parsed'] = []
        game_data['attachments'] = None
        game_data['loop_log_src'] = os.path.join(lr_fldr, "LiveWinOdds", "ParsePlaysLoopLogs", "gameLoopLog_%09d.txt" % game_data['ID'])
        
        if game_data['ID'] in [z['game_ID'] for z in recaps]:
            game_data['recap-paragraph'] = recaps[ [z['game_ID'] for z in recaps].index(game_data['ID']) ]['content']
            
        game_data['url'] = None; game_data['url_confirmed'] = None; game_data['description'] = None; game_data['game_file'] = None
        game_data['hex_game_ID'] = hex(game_data['ID'])[2:]
        
        if game_data['ID'] not in [z['ID'] for z in game_recs]:

            msg = "Error in live_win_odds.py, we have a game (ID=%d) that is not found in the LaxRef_Games table. It has been set to skip." % (game_data['ID'])
            game_data['skip'] = 1
            game_data['status'] = "pending"
            game_data['tournament_slot_ID'] = None
            game_data['orig_away_bg_color'] = None
            game_data['game_date'] = datetime.now()
            game_data['game_file'] = "------------"
            game_data['is_in_game_recs'] = 0
            zc.send_telegram(msg, bot_token)
        else:
            game_rec = game_recs[ [z['ID'] for z in game_recs].index(game_data['ID']) ]
            tmp = ['status', 'home_unlocked', 'away_unlocked', 'laxdotcom_ID', 'tournament_slot_ID', 'game_pro_url_tag', 'home_pro_url_tag', 'away_pro_url_tag', 'away_ID', 'home_ID', 'away_url', 'home_url', 'confirmed_home_team', 'confirmed_away_team', 'display_home', 'display_away', 'short_code_home', 'short_code_away', 'game_date', 'league', 'pregame_home_wp', 'orig_away_fg_color', 'orig_home_fg_color', 'orig_away_bg_color', 'orig_home_bg_color', 'home_gif', 'away_gif', 'home_twitter', 'away_twitter', 'home_elo', 'away_elo']

            game_data['is_in_game_recs'] = 1
        
        
            for tmp_tag in tmp:
                game_data[tmp_tag] = game_rec[tmp_tag]
            
            # To enable async (i.e. post-processing) cloud storage uploads
            game_data['upload_batch_src'] = os.path.join(lr_fldr, "Logs", "replace_plays_{}_batch_storage_upload.bat".format(game_data['league'].replace(" ", "")))
            
            if (game_rec['away_league'] is not None and 'NAIA' in game_rec['away_league']) or (game_rec['home_league'] is not None and 'NAIA' in game_rec['home_league']) or 'NAIA' in game_data['league']: # We are not going to process NAIA games; they should be set to pending
                msg = "Error in live_win_odds.py, we have an NAIA game (ID=%d). It has been set to skip." % (game_data['ID'])
                game_data['skip'] = 1
                game_data['status'] = "pending"
                game_data['tournament_slot_ID'] = None
                game_data['orig_away_bg_color'] = None
                game_data['game_date'] = datetime.now()
                game_data['game_file'] = "------------"
                game_data['is_in_game_recs'] = 0
                zc.send_telegram(msg, bot_token)

            game_data['lx_PGS_records'] = []
            if '--clear-lx-box' not in sys.argv:
                game_data['lx_PGS_records'] = [z for z in tmp_game_data_records if z['schedule_id'] == game_data['laxdotcom_ID']]
            
            game_data['home_roster'] = [z for z in tmp_rosters if z['team_ID'] == game_data['home_ID']]
            game_data['away_roster'] = [z for z in tmp_rosters if z['team_ID'] == game_data['away_ID']]
            
            game_data['home_team_offensive_game_summaries'] = [z for z in team_game_summaries if z['is_offense'] and z['team_ID'] == game_data['home_ID']]
            game_data['home_team_defensive_game_summaries'] = [z for z in team_game_summaries if not z['is_offense'] and z['team_ID'] == game_data['home_ID']]
            game_data['away_team_offensive_game_summaries'] = [z for z in team_game_summaries if z['is_offense'] and z['team_ID'] == game_data['away_ID']]
            game_data['away_team_defensive_game_summaries'] = [z for z in team_game_summaries if not z['is_offense'] and z['team_ID'] == game_data['away_ID']]
            
                
            #game_data['home_gif'] = "https://thelibraproject.com/Doorman/img/%s" % game_data['home_gif']
            #game_data['away_gif'] = "https://thelibraproject.com/Doorman/img/%s" % game_data['away_gif']
            
            game_data['home_gif'] = "https://pro.lacrossereference.com/static/img/TeamLogos/%s" % game_data['home_gif']
            game_data['away_gif'] = "https://pro.lacrossereference.com/static/img/TeamLogos/%s" % game_data['away_gif']
            
        
        game_data['gs_ID'] = None
        if game_data['ID'] not in [z['ID'] for z in game_streams]:
            msg = "Error in live_win_odds.py, we have a game ID (%d) that is not found in the LaxRef_Game_Streams table. It has been set to skip." % (game_data['ID'])
            game_data['skip'] = 1
            game_data['status'] = "pending"
            game_data['ignore_duplicate_plays_error'] = 0
            game_data['abbreviation_user_response'] = None
            game_data['abbreviation_user_response_dict'] = []
            zc.send_telegram(msg, bot_token)
        else:
            game_rec = game_streams[ [z['ID'] for z in game_streams].index(game_data['ID']) ]
            game_data['gs_ID'] = game_rec['ID']
            tmp = ['game_file', 'url', 'url_confirmed', 'live_tweet', 'auto_final', 'ignore_duplicate_plays_error', 'description', 'abbreviation_user_response', 'abbreviation_user_response_dict']
            for tmp_tag in tmp:
                game_data[tmp_tag] = game_rec[tmp_tag]
            if game_data["abbreviation_user_response_dict"] not in [None, '', 'null'] and isinstance(game_data["abbreviation_user_response_dict"], str):
                game_data["abbreviation_user_response_dict"] = json.loads(game_data["abbreviation_user_response_dict"])
            else:
                game_data["abbreviation_user_response_dict"] = []
             
            game_data = adjust_urls(game_data)
        if '-url' in sys.argv:
            game_data['url'] = sys.argv[sys.argv.index('-url') + 1]
        elif '-simulation' in sys.argv:
            game_data['url'] = "C:\\Users\\zcapo\\Documents\\workspace\\LacrosseReference\\Logs\\SimGameHTML\\%s.html" % game_data['game_file']
            print ("{:<20}{}".format(("Game ID: %s" % game_data['ID']), game_data['url']))
            
        game_data['live_ID'] = None    
        game_data['debug_live_processing'] = 0
        game_data['clear_abbreviations'] = 0
        game_data['unidentified_players_str'] = None
        if game_data['ID'] in [z['game_ID'] for z in live_games]:
            game_rec = live_games[ [z['game_ID'] for z in live_games].index(game_data['ID']) ]
            game_data['debug_live_processing'] = game_rec['debug_live_processing']
            game_data['ignore_unidentified_players_error'] = game_rec['ignore_unidentified_players_error']
            game_data['clear_abbreviations'] = game_rec['clear_abbreviations']
            game_data['live_ID'] = game_rec['live_ID']
            tmp = ['first_timestamp_is_zero', 'unidentified_players_str', 'replacement_text', 'skip', 'reverse_timestamps']
            for tmp_tag in tmp:
                game_data[tmp_tag] = game_rec[tmp_tag]
        else:
            game_data['ignore_unidentified_players_error'] = 0
            
        game_data['admin_cockpit_url'] = "https://pro.lacrossereference.com/admin_cockpit?dt=%s&game_ID=%d" % (data['dt'], game_data['ID'])
    timestamps.append({'tag1': "Apply DB Records to game data", 'tag2': None, 'time': time.time()})  
    
    data['games'] = [z for z in data['games'] if z['is_in_game_recs']]
    
    if '--clear-lx-box' in sys.argv:
        conn, cursor = zc.db(lx_db_tag)
        for game_data in data['games']:

            # In some cases, we need to get rid of the current data that is in the LaxDotCom player game summary table; do that here if necessary; we also remove it from the already downloaded game_dataYY set pulled above
        
            
            tmp_game_data_records = [z for z in tmp_game_data_records if z['schedule_id'] != game_data['laxdotcom_ID']]
            
            delete_query = "DELETE FROM `game_data{:.0f}` where schedule_id={}".format(data['year'] - 2000, game_data['laxdotcom_ID'])
            cursor.execute(delete_query, [])
        
        cursor.close(); conn.close()
    

    # Finish processing settings for each game            
    for game_data in data['games']:
    
        game_data['n_debug_logs_sent'] = 0
        
        game_data['last_quote'] = None
        if 'auto_final' not in game_data or game_data['auto_final'] is None: game_data['auto_final'] = 0
        game_data['window_handle'] = None
        
        game_data['initial_load'] = 1; game_data['url_change'] = 0
        
        
        game_data['pending'] = 0 if game_data['status'] != "pending" else 1
        game_data['loops'] = 0
        
        game_data['consecutive_quarter_duplications'] = 0
        game_data['consecutive_selenium_fails'] = 0
        game_data['html_final_cnt'] = None
        game_data['html_halftime_cnt'] = None
        game_data['last_change_in_final_tags'] = None
        game_data['last_change_in_halftime_tags'] = None
        game_data['consec_missing'] = 0
        game_data['last_parse_process_step'] = None
        game_data['last_check_for_finals_step'] = None
        game_data['non_update_loops'] = 0
        game_data['end_of_period'] = None
        game_data['reddit_summary'] = None
        game_data['plays_captured'] = []
        game_data['last_refresh'] = None
        game_data['num_plays'] = 0
        game_data['loops_since_last_parse'] = 0
        game_data['last_abbreviation_request'] = 0
        game_data['last_bad_play_type_error'] = 0
        game_data['last_parse_loop'] = None
        game_data['skip'] = 0 if 'skip' not in game_data or game_data['skip'] in [None, 0] else 1
        game_data['reverse_timestamps'] = 0 if 'reverse_timestamps' not in game_data or game_data['reverse_timestamps'] in [None, 0] else 1
        game_data['game_over_at'] = None
        game_data['sleep_duration'] = 0. if len(data['games']) > 1 else 2.
        
        if 'replacement_text' not in game_data: game_data['replacement_text'] = None
        
        log_open_type = 'w'
        if game_data['replacement_text'] not in ['', None]:
            game_data['replacements'] = [{'from': z.split("|")[0], 'to': z.split("|")[1]} for z in game_data['replacement_text'].split("~~~") if len(z.split("|")) == 2]
            game_data['replacements'] = sorted(game_data['replacements'], key=lambda x:len(x['from']), reverse=True)
            if '--log-game-replacement-text' in sys.argv:
                flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % game_data['ID']), 'w')
                flog.write("\n@ %s\n\nReplacement Text at initiation is\n\n%s" % (datetime.now().strftime("%H:%M:%S"), json.dumps(game_data['replacements'], default=zc.json_handler, indent=2)))
                flog.close()
                log_open_type = 'a'
        else:
            game_data['replacements'] = None
            
        game_tmp_team_replacement_text = []
        if 'home_ID' in game_data and 'away_ID' in game_data and None not in [game_data['home_ID'], game_data['away_ID']]:
            game_tmp_team_replacement_text = [z for z in tmp_team_replacement_text if z['team_ID'] in [game_data['home_ID'], game_data['away_ID']]]
            if len(game_tmp_team_replacement_text) > 0:
                
                for team_replacement_text in game_tmp_team_replacement_text:
                    tmp_replacements_list = [{'from': z.split("|")[0], 'to': z.split("|")[1]} for z in team_replacement_text['replacement_text'].split("~~~") if len(z.split("|")) == 2]
                    if '--log-game-replacement-text' in sys.argv:
                        flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % game_data['ID']), log_open_type)
                        flog.write("\n@ %s\n\nTeam-Specific Replacement Text from team ID %d:\n\n%s" % (datetime.now().strftime("%H:%M:%S"), team_replacement_text['team_ID'], json.dumps(tmp_replacements_list, default=zc.json_handler, indent=2)))
                        flog.close()
                    if game_data['replacements'] is None:
                        game_data['replacements'] = tmp_replacements_list
                    else:
                        game_data['replacements'] += tmp_replacements_list
                    game_data['replacements'] = sorted(game_data['replacements'], key=lambda x:len(x['from']), reverse=True)
                if '--log-game-replacement-text' in sys.argv:
                    flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % game_data['ID']), 'a')
                    flog.write("\n@ %s\n\nFinal Replacement Text after adding team-specific pairs is\n\n%s" % (datetime.now().strftime("%H:%M:%S"), json.dumps(game_data['replacements'], default=zc.json_handler, indent=2)))
                    flog.close()
            
        # If one of the teams is the unlocked team, prepare the unlocked url
        game_data['unlocked_url'] = None; game_data['unlocked_team'] = None
        if 'home_unlocked' in game_data:
            if game_data['home_unlocked']:
                game_data['unlocked_team'] = game_data['display_home']
                game_data['unlocked_url'] = game_data['home_pro_url_tag']
            elif game_data['away_unlocked']:
                game_data['unlocked_team'] = game_data['display_away']
                game_data['unlocked_url'] = game_data['away_pro_url_tag']
            
        
        if '--use-db-plays' not in sys.argv and game_data['url'] is None:
            
            msg = "No live stats url was found in game ID %d (%s). Add the link via http://192.168.1.240:5000/laxref_scoreboard or this game won't be processed. Be sure to set this game to skip=0 via https://pro.lacrossereference.com/admin_cockpit?game_ID=%d" % (game_data['ID'], game_data['description'], game_data['ID'])
            #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            game_data['skip'] = 1
            
            
            query = "UPDATE LaxRef_Active_Live_WP_Games set skip=1 where game_ID=%s" 
            param = [game_data['ID']]
            
            cursor = zc.zcursor("LR")
            cursor.execute(query, param)
            cursor.commit(); cursor.close()
            
        
        game_data['finalized'] = 0
        
        game_data['db_game_over'] = 1 if 'complete' in game_data['status'] else 0
        game_data['game_over'] = 1 if 'complete' in game_data['status'] else None
        game_data['home_team'] = None; game_data['away_team'] = None
        game_data['home_score'] = None; game_data['away_score'] = None
        game_data['last_error_msg_timestamp'] = None
        game_data['all_leagues_db_win_odds'] = all_leagues_db_win_odds
        game_data['league_db_win_odds'] = [z for z in all_leagues_db_win_odds if z['league'] == game_data['league']]
        game_data['all_leagues_db_play_values'] = all_leagues_db_play_values
        
        game_data['active_html_tabs'] = ['box', 'possessions', 'embed', 'summary']
            
        game_data['mll'] = False
        game_data['ignore-non-matches'] = [laxref.hash_player_name(z) for z in ['', 'Slashing', 'Bench', 'Shot Clock', 'End of Period', 'End-of-period', 'End-of-period.', '&nbsp;', 'Injury Delay', 'Start of 2nd period','Start of 3rd period', 'Start of 4th period', 'Media timeout', "Stick Check", 'Official timeout', 'Official timeout.', 'Officials timeout', 'Conduct foul', 'Offsides', 'offside', 'Crease Violation', 'Timeout', 'Media timeout.']]
        
        game_data['sections'] = WP_SECTIONS
        game_data['window_length'] = int(3600/WP_SECTIONS)
        game_data['use_db_plays'] = '--use-db-plays' in sys.argv
        gs_obj = None
        game_data['db'] = "LR"
        
        game_data['first_timestamp_is_zero'] = 0 if 'first_timestamp_is_zero' not in game_data or game_data['first_timestamp_is_zero'] in [None, 0] else 1
        
        if game_data['is_in_game_recs']:
            if game_data['orig_away_bg_color'] is None:
                game_data['away_bg_color'] = "rgb(0,0,128)"
                game_data['away_fg_color'] = "rgb(255,255,255)"
            else:    
                game_data['away_bg_color'] = "rgb(%s)" % ",".join(game_data['orig_away_bg_color'][1:-1].split(",")[0:3])
                game_data['away_fg_color'] = "rgb(%s)" % ",".join(game_data['orig_away_fg_color'][1:-1].split(",")[0:3])
        
            if game_data['orig_home_bg_color'] is None:
                game_data['home_bg_color'] = "rgb(0,0,128)"
                game_data['home_fg_color'] = "rgb(255,255,255)"
            else:    
                game_data['home_bg_color'] = "rgb(%s)" % ",".join(game_data['orig_home_bg_color'][1:-1].split(",")[0:3])
                game_data['home_fg_color'] = "rgb(%s)" % ",".join(game_data['orig_home_fg_color'][1:-1].split(",")[0:3])
        
        
        
            if game_data['use_db_plays']:
                mysql_conn, cursor = zc.mysql_connect("LR")
                if '--game-ID' in sys.argv:
                    game_data['game_ID'] = int(sys.argv[ sys.argv.index("--game-ID") + 1])
                    query = "SELECT * from LaxRef_Events where active and game_ID=%s order by ID asc"
                    param = [game_data['game_ID']]
                else:
                    query = "SELECT a.* from LaxRef_Events a, LaxRef_Games b where b.status like 'complete%%' and a.active and a.game_ID=b.ID and ((b.confirmed_home_team=%s and b.confirmed_away_team=%s) or (b.confirmed_away_team=%s and b.confirmed_home_team=%s)) and b.game_date=%s order by a.ID asc"
                    param = [game_data['confirmed_home_team'], game_data['confirmed_away_team'], game_data['confirmed_home_team'], game_data['confirmed_away_team'], game_data['game_date'].strftime("%Y-%m-%d")]
                #print("Query %s w/ %s" % (query, param))
                cursor.execute(query, param)
                game_data['plays_captured'] = zc.dict_query_results(cursor)

                query = "SELECT * from LaxRef_Games where status like 'complete%%' and ID=%s"
                cursor.execute(query, [int(sys.argv[ sys.argv.index("--game-ID") + 1])])
                tmp_list = zc.dict_query_results(cursor)
                if len(tmp_list) == 0:
                    msg = "In live win odds, we were doing a follow up processing of game ID %d using the database LaxRef_Events (rather than pulling them via selenium from a live stats stream. Unfortunately, the game was not marked as completed in the database, so the re-processing failed. The first time this error occurred, it was because the get_official_ncaa_game_data.py script that downloads the play-by-play from the NCAA site wasn't able to process the game (couldn't figure out the abbreviations). As a result, until I could run that script with the -manual flag set and resolve the issue, it wasn't putting the game into completed status. \n\nAnyway, because --use-db-plays was set, this is a single-game execution, so we are just going to drop out of the script...exiting." % int(sys.argv[ sys.argv.index("--game-ID") + 1])
                    
                    query = "SELECT * from LaxRef_Games where ID=%s"
                    cursor.execute(query, [int(sys.argv[ sys.argv.index("--game-ID") + 1])])
                    g = zc.dict_query_results(cursor)
                    if len(g) > 0:
                        g = g[0]
                
                        msg += "\n\nTo reprocess this game, start with this command\n\npython get_official_ncaa_game_data.py -manual --game-ID %d --replace-plays -league \"%s\" -u \"%s\"\npython reprocess_game.py --game-ID %d" % (g['ID'], g['league'], g['log_url'], g['ID'])
                    else:
                        msg += "\n\nWe couldn't even find any active game record in the database at all."
                    if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    sys.exit()
                
                game_rec = tmp_list[0]

                cursor.close(); mysql_conn.close()

                print("Grabbed %d plays from the DB" % len(game_data['plays_captured']))
                for p in game_data['plays_captured']:
                    p['game_elapsed'] = p['game_elapsed_minutes']*60 + p['game_elapsed_seconds']
                    p['pct_complete'] = float(p['game_elapsed'])/3600.0
                    p['detail'] = p['details']
       
                game_data['year'] = game_rec['game_date'].year
                game_data['url'] = None


                if '--exit-if-csv-exists' in sys.argv and os.path.isfile(os.path.join(lr_fldr, "LiveWinOdds", game_data['game_file'] + ".csv")):
                    print ("%s has already been created...exiting." % (game_data['game_file'] + ".csv"))
                    zc.exit("20slc95")


                game_data['home_ID'] = game_rec['home_ID']
                game_data['away_ID'] = game_rec['away_ID']
                game_data['game_date'] = game_rec['game_date']
                game_data['women'] = True if 'Women' in game_rec['league'] else False

            else:
                game_data['year'] = game_data['game_date'].year



                game_data['women'] = True if "Women" in game_data['league'] else False

            #game_data['league_tag'] = "d1w" if game_data['women'] else "d1m"
            game_data['league_tag'] = game_data['league'].replace("NCAA ", "").replace(" Women", "w").replace(" Men", "m").lower()
            game_data['league_desc'] = game_data['league']
            game_data['league_obj'] = {'tag': game_data['league_tag'], 'name': game_data['league_desc']}
            # request the preview HTML from the local server
            game_data['preview_html'] = None
            


            game_data['machine'] = None
            path = os.path.join(lr_fldr, 'laxref_machine_ID.txt')
            if os.path.isfile(path):
                game_data['machine'] = open(path, 'r').read().strip()


            old_games = [z for z in all_old_games if game_data['home_ID'] in [z['home_ID'], z['away_ID']] or game_data['away_ID'] in [z['home_ID'], z['away_ID']]]
             

            option1 = list(set([z['alt_away_team'].upper() if z['away_ID'] == game_data['away_ID'] else z['alt_home_team'].upper() for z in old_games if z['alt_away_team'] is not None and z['alt_home_team'] is not None and game_data['away_ID'] in [z['away_ID'], z['home_ID']] ]))
            option2 = list(set([z['away_team'].upper() if z['away_ID'] == game_data['away_ID'] else z['home_team'].upper() for z in old_games if z['home_team'] is not None and z['away_team'] is not None and game_data['away_ID'] in [z['away_ID'], z['home_ID']] ]))
            option3 = list(set([z['lwo_away_team'].upper() if z['away_ID'] == game_data['away_ID'] else z['lwo_home_team'].upper() for z in old_games if z['lwo_home_team'] is not None and z['lwo_away_team'] is not None and game_data['away_ID'] in [z['away_ID'], z['home_ID']] ]))
            if '--use-db-plays' in sys.argv: # On Feb 24, 2024, I realized that the LWO abbreviations were getting mixed up, if we are doing a re-processing, we should not be using them
                option3 = []
            options = sorted([{'abbrev': z, 'len': len(z)} for z in list(set(option1+option2+option3))], key=lambda x:x['len'])
            
            #print("Away Team Abbreviation Options:")
            #zc.print_dict(options)

            if len(options) > 0:

                game_data['away_abbreviation'] = options[0]['abbrev']
                game_data['away_abbreviations'] = [z['abbrev'].strip() for z in options]
            else:
                game_data['away_abbreviation'] = game_data['display_away'].upper()
                game_data['away_abbreviations'] = [game_data['display_away'].upper()]


            option1 = list(set([z['alt_away_team'].upper() if z['away_ID'] == game_data['home_ID'] else z['alt_home_team'].upper() for z in old_games if z['alt_away_team'] is not None and z['alt_home_team'] is not None and game_data['home_ID'] in [z['away_ID'], z['home_ID']] ]))
            option2 = list(set([z['away_team'].upper() if z['away_ID'] == game_data['home_ID'] else z['home_team'].upper() for z in old_games if z['away_team'] is not None and z['home_team'] is not None and game_data['home_ID'] in [z['away_ID'], z['home_ID']] ]))
            option3 = list(set([z['lwo_away_team'].upper() if z['away_ID'] == game_data['home_ID'] else z['lwo_home_team'].upper() for z in old_games if z['lwo_home_team'] is not None and z['lwo_away_team'] is not None and game_data['home_ID'] in [z['away_ID'], z['home_ID']] ]))
            if '--use-db-plays' in sys.argv: # On Feb 24, 2024, I realized that the LWO abbreviations were getting mixed up, if we are doing a re-processing, we should not be using them
                option3 = []
            options = sorted([{'abbrev': z, 'len': len(z)} for z in list(set(option1+option2+option3))], key=lambda x:x['len'])
            #print("Away Team Abbreviation Options:")

            if len(options) > 0:

                game_data['home_abbreviation'] = options[0]['abbrev']
                game_data['home_abbreviations'] = [z['abbrev'].strip() for z in options]
            else:
                game_data['home_abbreviation'] = game_data['display_home'].upper()
                game_data['home_abbreviations'] = [game_data['display_home'].upper()]

            # Create a separate list of stored abbreviations that do not include year information
            game_data['home_abbreviations_sans_years'] = []
            game_data['away_abbreviations_sans_years'] = []
            try:
                abbrev_regex1 = re.compile(r'([a-z\-\(\)]+?)[0-9]{2,4}$', re.IGNORECASE)
                #abbrev_regex2 = re.compile(r'([a-z\-\(\)]+?)[0-9]{2,4}(MLAX|WLAX)$', re.IGNORECASE)
                #abbrev_regex3 = re.compile(r'([a-z\-\(\)]+?)[0-9]{2,4}(M|W)$', re.IGNORECASE)
                for f in game_data['home_abbreviations']:
                    if f is not None:
                        match = abbrev_regex1.search(f)
                        if match and match.group(1) not in game_data['home_abbreviations_sans_years']:
                            game_data['home_abbreviations_sans_years'].append(match.group(1))
                        else:
                            game_data['home_abbreviations_sans_years'].append(f)
                for f in game_data['away_abbreviations']:
                    if f is not None:
                        match = abbrev_regex1.search(f)
                        if match and match.group(1) not in game_data['away_abbreviations_sans_years']:
                            game_data['away_abbreviations_sans_years'].append(match.group(1))
                        else:
                            game_data['away_abbreviations_sans_years'].append(f)
                 
            except Exception:
                # REMOVE ONCE SANS YEARS ABBREVIATIONS ARE STABLE (label will appear in multiple places)
                msg = "Removing Years from DB Abbreviations fail"
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
             
            if '--test-abbreviations-regex' in sys.argv:
                print ("Home (Orig)")
                print (game_data['home_abbreviations'])
                print ("Home (Regexed)")
                print (game_data['home_abbreviations_sans_years'])
                print ("Away (Orig)")
                print (game_data['away_abbreviations'])
                print ("Away (Regexed)")
                print (game_data['away_abbreviations_sans_years'])
                zc.exit("REG")
            preview_image = None
            if '--use-db-plays' not in sys.argv:
                if game_data['live_ID'] is None:
                    if game_data['ID'] not in [z['game_ID'] for z in laxref_active_live_game_IDs]:
                        query = "INSERT INTO LaxRef_Active_Live_WP_Games (ID, datestamp, game_file, plays_uploaded, stats_recap_done, include_top_stars, active, after_the_fact, machine, game_ID) VALUES ((SELECT IFNULL(max(ID), 0) + 1 from LaxRef_Active_Live_WP_Games fds), %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                        param = [datetime.now(), game_data['game_file'], 0, 0, 1 if '--ignore-top-stars' not in sys.argv else 0, 1, game_data['use_db_plays'], game_data['machine'], game_data['ID']]
                        game_data['live_ID'] = None
                        queries.append(query); params.append(param)
                        laxref_active_live_game_IDs.append({'game_ID': game_data['ID']})

                else:

                    query = "UPDATE LaxRef_Active_Live_WP_Games set machine=%s, include_top_stars=%s where game_ID=%s"
                    param = [game_data['machine'], 1 if '--ignore-top-stars' not in sys.argv else 0, game_data['ID']]
                    queries.append(query); params.append(param)


                    query = "UPDATE LaxRef_Active_Live_WP_Games set after_the_fact=%s where game_ID=%s and ISNULL(after_the_fact)"
                    param = [game_data['use_db_plays'], game_data['ID']]
                    queries.append(query); params.append(param)




            
            game_data['away_color'] = game_data['away_bg_color']
            game_data['home_color'] = game_data['home_bg_color']

            game_data['away_color'] = [int(z) for z in game_data['away_color'][1:-1].split(',')[4:7]]
            game_data['home_color'] = [int(z) for z in game_data['home_color'][1:-1].split(',')[4:7]]

            if game_data['home_gif'] is None:
                print("\n\n\tThere is no gif_path in the DB for %s, exiting..." % game_data['display_home']); zc.exit("20dkfjk5ne")
            if game_data['away_gif'] is None:
                print("\n\n\tThere is no gif_path in the DB for %s, exiting..." % game_data['display_away']); zc.exit("1mdkgt04i8e")



            game_data['home_win_odds'] = game_data['pregame_home_wp']
            
            

            if '-simulation' in sys.argv:
                game_data['home_team'] = game_data['short_code_home']
                game_data['away_team'] = game_data['short_code_away']
                game_data['home_abbreviation'] = game_data['short_code_home']
                game_data['away_abbreviation'] = game_data['short_code_away']

            t = "#"
            for a in game_data['away_color']:
                t1 = a/16
                t2 = a%16
                if t1 < 10:
                    t += "%d" % t1
                else:
                    t += chr(55 + t1).upper()
                if t2 < 10:
                    t += "%d" % t2
                else:
                    t += chr(55 + t2).upper()
            game_data['away_color'] = t
            t = "#"
            for a in game_data['home_color']:
                t1 = a/16
                t2 = a%16
                if t1 < 10:
                    t += "%d" % t1
                else:
                    t += chr(55 + t1).upper()
                if t2 < 10:
                    t += "%d" % t2
                else:
                    t += chr(55 + t2).upper()
            game_data['home_color'] = t

            game_data['win_odds_data'] = None
            game_data['win_odds_ID'] = ['n/a']
            if '--load-wp-file' in sys.argv:
                game_data['win_odds_data'] = open(os.path.join(lr_fldr, 'LiveWinOdds', 'WinOddsTime_and_Score(window=%d)(sections=%d)' % (game_data['window_length'], game_data['sections'])), 'r').read().split("\n")


            
                for w in filter(None, game_data['win_odds_data'][1:]):
                    game_data['win_odds_ID'].append(int(w.split(",")[0]))


        
            #play_value_data = open(os.path.join(lr_fldr, 'LiveWinOdds', 'PlayValues(window=%d)' % (game_data['window_length'])), 'r').read().split("\n")
            #play_value_data = open(os.path.join(lr_fldr, 'PlayValues(window=%d)' % (game_data['window_length'])), 'r').read().split("\n")
        
            LOADPLAYVALUES = 1
            if LOADPLAYVALUES:
                play_value_data = open(os.path.join(lr_fldr, 'PlayValues_%s_window60' % (game_data['league_tag'])), 'r').read().split("\n")


                game_data['plays'] = []
                game_data['play_values_for'] = []
                game_data['play_values_against'] = []
                
                # SIGNAL the laxref.create_game_dict function to use the play values identified here rather than query the database every time a parse is executed. We should see that the time taken to parse a game object should be less since we are doing one less query on average. Still need to catalog all the database queries that happen during a single parse vs the time needed to upload the files to the appropriate places.
                game_data['use_one_time_play_values'] = 1
                    
                for p in filter(None, play_value_data[1:]):
                    p0 = p.split(",")[0]
                    p1 = float(p.split(",")[5])
                    p2 = float(p.split(",")[6])
                    if p0 != "" and p1 != "":
                        game_data['plays'].append(p0)
                        game_data['play_values_for'].append(p1)
                        game_data['play_values_against'].append(p2)
                    if p0 == "Faceoff Win":
                        # Caused turnover is the inverse of a forced turnover
                        #adds.append(["Faceoff Loss", 0., 0.])
                        game_data['plays'].append("Faceoff Loss")
                        game_data['play_values_for'].append(0.)
                        game_data['play_values_against'].append(0.)
                    if p0 == "Forced Turnover":
                        # Caused turnover is the inverse of a forced turnover
                        #adds.append(["", play_values_against[-1], play_values_for[-1]])
                        game_data['plays'].append("Caused Turnover")
                        game_data['play_values_for'].append(game_data['play_values_for'][-1])
                        game_data['play_values_against'].append(game_data['play_values_against'][-1])
                    if p0 == "Saved Shot":
                        # Save is the inverse of a saved shot for the offense
                        #adds.append(["Save", play_values_against[-1], play_values_for[-1]])
                        game_data['plays'].append("Save")
                        game_data['play_values_for'].append(game_data['play_values_for'][-1])
                        game_data['play_values_against'].append(game_data['play_values_against'][-1])

                if "Draw Control" not in game_data['plays']:
                    game_data['plays'] .append("Draw Control");         game_data['play_values_for'] .append(0);         game_data['play_values_against'].append(0)
                if "Free Position" not in game_data['plays']:
                    game_data['plays'] .append("Free Position");         game_data['play_values_for'] .append(0);         game_data['play_values_against'].append(0)
                if "Free Position Attempt" not in game_data['plays']:
                    game_data['plays'] .append("Free Position Attempt");         game_data['play_values_for'] .append(0);         game_data['play_values_against'].append(0)
                

                #game_data['plays'] = [z.upper() for z in game_data['plays']]
                game_data['plays'] = [str(z) for z in game_data['plays']]

            game_data['archive_dir'] = None if game_data['game_file'] is None else os.path.join(lr_fldr, "LiveWinOdds", "Play Data Archive", game_data['game_file'])
            if game_data['archive_dir'] in [None, '']:
                msg = "Error in live_win_odds.py, we have a game (ID=%d) that does not have a valid archive_dir path (likely because the game_file value in LaxRef_Game_Streams is NULL). It has been set to skip." % (game_data['ID'])
                game_data['skip'] = 1
                game_data['status'] = "pending"
                game_data['tournament_slot_ID'] = None
                game_data['orig_away_bg_color'] = None
                game_data['game_date'] = datetime.now()
                game_data['game_file'] = "------------"
                game_data['is_in_game_recs'] = 0
                zc.send_telegram(msg, bot_token)
        
        

            if '-test' not in sys.argv and '--use-archive' not in sys.argv and '--use-db-plays' not in sys.argv and game_data['archive_dir'] is not None:
                attempts = 2
                
                while os.path.isdir(game_data['archive_dir']):
                    #print (" %s already exists..." % (game_data['archive_dir']))
                    game_data['archive_dir'] = os.path.join(lr_fldr, "LiveWinOdds", "Play Data Archive", "%s(%d)" % (game_data['game_file'], attempts)); attempts += 1
                os.mkdir(game_data['archive_dir'])
    
    timestamps.append({'tag1': "Final game processing", 'tag2': None, 'time': time.time()})  
    if len(queries) > 0:
        print ("Execute %d queries." % (len(queries)))
        cursor = zc.zcursor("LR")
        for q, p in zip(queries, params):
                
            if '--show-queries' in sys.argv: print ("Query {:<40} {}" .format (q.split("(")[0].strip(), str(p)))
            cursor.execute(q, p)
        
        
        cursor.commit(); cursor.close()
        
    if len([1 for z in data['games'] if z['live_ID'] is None]) > 0:
        cursor = zc.zcursor("LR")
        live_games = cursor.dqr('SELECT ID live_ID, game_ID from LaxRef_Active_Live_WP_Games where active', [])
        cursor.close()
       
        for game_data in data['games']:
            if game_data['live_ID'] is None:
                if game_data['ID'] in [z['game_ID'] for z in live_games]:
                    lg = live_games[ [z['game_ID'] for z in live_games].index(game_data['ID']) ]
                    game_data['live_ID'] = lg['live_ID']
                else:
                    game_data['live_ID'] = None
    timestamps.append({'tag1': "Execute Set-Up Queries", 'tag2': None, 'time': time.time()})  
    
    tags = zc.process_timestamps(timestamps)
    total_elapsed = sum([z['elapsed'] for z in tags])
    
    fmt = "{:<80}{:<10}{:<20}{:<20}"
    res = ""
    res += (fmt.format("Task", "n", "Elapsed (seconds)", "Pct"))
    res +=  ("\n" + ("-" * 200) + "\n")
    
    fmt = "{:<80}{:<10,.0f}{:<20.2f}{:<20.3f}"
    res += ("\n".join([fmt.format(z['tag1'], z['n'], z['elapsed'], z['pct']) for z in tags]))
    res +=  ("\n" + ("-" * 200) + "\n")
    
    fmt = "{:<80}{:<10}{:<20.2f}{:<20}"
    res += ("\n" + fmt.format("Total", "", total_elapsed, ""))
    print (res)
    return data

chromeOptions = webdriver.ChromeOptions()

# In some cases, Chrome is installed somewhere unexpected and we need to let Selenium know where it is
locs = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"]
for l in locs:
        
    if os.path.isfile(l):
        chromeOptions.binary_location = l; break
    
chromeOptions.add_experimental_option('useAutomationExtension', False)
if '-headless' in sys.argv:
    chromeOptions.add_argument("--headless")
    
chromeOptions.add_argument("--ignore-certificate-errors")
chromeOptions.add_argument("ignore-certificate-errors")

chromeOptions.add_argument('--mute-audio')
chromeOptions.add_argument('--ignore-certificate-errors')
chromeOptions.add_argument('--ignore-ssl-errors')
chromeOptions.add_argument('--disable-infobars')
chromeOptions.add_argument('--ignore-certificate-errors-spki-list')
chromeOptions.add_argument('--no-sandbox')
chromeOptions.add_argument('--no-zygote')
chromeOptions.add_argument('--log-level=3')
chromeOptions.add_argument('--allow-running-insecure-content')
chromeOptions.add_argument('--disable-web-security')
chromeOptions.add_argument('--disable-features=VizDisplayCompositor')
chromeOptions.add_argument('--disable-breakpad')



if '--use-old-options' not in sys.argv:
    if '--use-eager-option' not in sys.argv:
        chromeOptions.page_load_strategy = 'none'
    else:
        chromeOptions.page_load_strategy = 'eager'
#print ("chromeOptions.page_load_strategy: %s" % chromeOptions.page_load_strategy)

chromedriver = os.path.join(piFolder, "chromedriver.exe")
os.environ["webdriver.chrome.driver"] = chromedriver

def rapid_upload(game_data, data, game_dict=None):
    print ("Run Rapid upload")
    #if '--use-db-plays' in sys.argv and '--one-and-done' in sys.argv and '--test-rapid' not in sys.argv:
    #    msg = "In the overnight sweep, we currently call live win odds twice, the second time explicitly to call the rapid upload function."
    #    msg += "\n\nHowever, in this execution (game ID %d), rapid upload was called even though the --test-rapid flag was not set." % game_data['ID']
    #    msg += "\n\nDoesn't this mean that we can get rid of the second LWO call during the sweep?\n\n"
    #    try:
    #        msg += json.dumps(game_data, default=zc.json_handler, indent=1)
    #    except Exception:
    #        msg += traceback.format_exc()
    #    zc.send_crash(msg, bot_token)

    try:

        if game_dict is None:
            data, game_object, game_dict = create_game_object(game_data, data, os.path.join(lr_fldr, "LiveWinOdds", "%s.csv" % game_data['game_file']))
            game_dict['league'] = game_data['league']
        
        if game_dict is not None and 'home_team' in game_dict and 'away_team' in game_dict:
            rapid = laxref.generate_rapid_upload(game_data['ID'], game_dict, {})
            
            #print ("\n\nrapid")
            #zc.print_dict(rapid)
            #print ("keys: %s" % rapid.keys())
            #print ("\n\nrapid['json']['results']['WinProbabilityChart']")
            #zc.print_dict(rapid['json']['results']['WinProbabilityChart'])
            #zc.exit("WO")
            if UPLOAD_TO_YEAR_SPECIFIC_LRP_DIR:
                d = {'src': rapid['src'], 'fname': rapid['fname'], 'target_folder': 'GameData/%s/%d' % (game_data['league'].replace(" ", ""), game_data['game_date'].year)}
                #zc.print_dict(d)
                
                # If this is not set, then we will check the file update timestamps and use a separate PYTHON script to upload updated files
                if UPLOAD_IN_THIS_SCRIPT:
                    #laxref.upload_file(d)
                                    
                    try:
                        local_upload_file(d, game_data['upload_batch_src'])
                    except Exception:
                        f = open(os.path.join(lr_fldr, 'Logs', "LWO_async_error.txt"), 'w')
                        f.write(traceback.format_exc()); f.close()
                else:
                    data = log_updated_file(data, d['src'])
            
            # If this is not set, then we will check the file update timestamps and use a separate PYTHON script to upload updated files
            d = {'src': rapid['src'], 'fname': rapid['fname'], 'target_folder': 'GameData'}
            if UPLOAD_IN_THIS_SCRIPT:
                #zc.print_dict(d)
                #laxref.upload_file(d)
                                    
                try:
                    local_upload_file(d, game_data['upload_batch_src'])
                except Exception:
                    f = open(os.path.join(lr_fldr, 'Logs', "LWO_async_error.txt"), 'w')
                    f.write(traceback.format_exc()); f.close()
            else:
                data = log_updated_file(data, d['src'])
            
            
            
            try:
                #cursor = zc.zcursor("LR")
                if not game_data['rapid_upload_complete_flag_set']:
                    query = "UPDATE LaxRef_Games set rapid_upload_complete=1 where ID=%s"
                    param = [game_data['ID']]
                    #cursor.execute(query, param)
                    #cursor.commit(); cursor.close()
                    
                    update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
                    
                    game_data['rapid_upload_complete_flag_set'] = 1
            except Exception:
                msg = "DB Fail: game ID %d (%s) query not run.\n\nUPDATE LaxRef_Games set rapid_upload_complete=1 where ID=%s" % (game_data['ID'], game_data['description'], game_data['ID'])
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
            
    except Exception:
        print (traceback.format_exc())
        msg = "Failed to upload rapid json for %s (ID %d)\n\n%s" % (game_data['description'], game_data['ID'], traceback.format_exc())
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg) 
    return game_data
    
def generate_post_game_email(game_data, data):
        
    try:
        query_tag = "get sent_email_records"
        conn, cursor = LRP_connect(data['secrets']['web'])
        cursor.execute("SELECT * from LRP_Sent_Email_Records where game_ID=%s and email_category='post-game'", [game_data['ID']])
        game_specific_sent_emails = zc.dict_query_results(cursor)
        cursor.close(); conn.close()
        
    except Exception:
        msg = "DB Fail: game ID %d (%s)\n\nCould not get list of emails sent already for this game." % (game_data['ID'], game_data['description'])
        msg += "\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return game_data
    
    data, game_object, game_dict = create_game_object(game_data, data, os.path.join(lr_fldr, "LiveWinOdds", "%s.csv" % game_data['game_file']))
    if 'home_team' not in game_dict or 'away_team' not in game_dict:
        msg = "[generate_post_game_email] Game Dict Fail: game ID %d (%s)\n\nGame dict returned from create_game_object did not include a home team team." % (game_data['ID'], game_data['description'])
        msg += "\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return game_data
        
    error_recs = [z for z in data['basic_subscribers'] if 'receive_end_game_emails' not in z]
    if len(error_recs) > 0:
        msg = "In live_win_odds.py, we were attempting to identify the subscribers that would need a post game email and %d of the fan subscribers, out of %d, did not have a 'receive_end_game_emails' field in there dict record." % (len(error_recs), len(data['basic_subscribers']))
        msg += "\n\n%s" % zc.print_dict(error_recs)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return game_data
    
    extra_email_user_ID = 1078
    try:
        # Dual-Parent Northwestern WLAX emails
        if 145 in [game_dict['home_team']['ID'], game_dict['away_team']['ID']]:
            
            if extra_email_user_ID in [z['user_ID'] for z in data['basic_subscribers']]:
                
                rec = data['basic_subscribers'][ [z['user_ID'] for z in data['basic_subscribers']].index(extra_email_user_ID) ]
                
                # Copy the existing subscription and user information into an object that will match the native subscriber records
                d = {'extra_email': 1, 'user_ID': extra_email_user_ID, 'favorite_team_ID': 145}
                tmp_tags = ['encrypted_email', 'favorite_player_ID', 'receive_end_game_emails', 'subscription_ID', 'receive_end_game_emails']
                for tmp_tag in tmp_tags:
                    d[tmp_tag] = rec[tmp_tag]
                    
                # Check that this user hasn't already been added to the list of data subscribers
                n_existing = len([1 for z in data['basic_subscribers'] if 'extra_email' in z and z['extra_email'] and z['user_ID'] == extra_email_user_ID])
                if n_existing == 0:
                    data['basic_subscribers'].append(d)

            else:
                msg = "I tried to set up a user with an NU Lax email, but his user ID (%d) was not found in the data['basic_subscribers'] list." % extra_email_user_ID
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    except Exception:
        msg = "I tried to set up a user with an NU Lax email; his user ID was %d. An error occurred:\n\n%s" % (extra_email_user_ID, traceback.format_exc())
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
    if '--test-basic-emails' in sys.argv and '--use-db-plays' in sys.argv:
        if 1 not in [z['user_ID'] for z in data['basic_subscribers']]:
            data['basic_subscribers'].append({'user_ID': 1, 'sub_type': 'basic', 'encrypted_email': encrypt(admin_email), 'favorite_team_ID': 752, 'receive_end_game_emails': 1})
        for s in data['basic_subscribers']:
            if s['user_ID'] == 1 and datetime.now().strftime("%Y%m%d") == "20240322":
                s['favorite_team_ID'] = 752
    
    relevant_subs = [z for z in data['basic_subscribers'] if z['receive_end_game_emails'] and z['favorite_team_ID'] in [game_dict['home_team']['ID'], game_dict['away_team']['ID']]]
    relevant_team_subs = [z for z in data['team_subscribers'] if z['receive_end_game_emails'] and z['favorite_team_ID'] in [game_dict['home_team']['ID'], game_dict['away_team']['ID']]]
    
    relevant_subs += relevant_team_subs
    for s in relevant_subs:
        s['decrypted_email'] = decrypt(s['encrypted_email'])
        
    for s in relevant_team_subs:
        s['decrypted_email'] = decrypt(s['encrypted_email'])
    
    try:
        if len(relevant_team_subs) > 0:
            email_msg = "In game %s, there are %d emails that would be receiving a post-game email\n\n%s" % (game_data['game_file'], len(relevant_team_subs), "\n".join([z['decrypted_email'] for z in relevant_team_subs]))
            #print (email_msg)
            #zc.send_telegram(email_msg, bot_token)
    except Exception:
        msg = "Error trying to parse out team customer emails for post-game email\n\n%s"% (traceback.format_exc())
        zc.send_telegram(email_msg, bot_token)
        
    team_IDs = [{'team_ID': z} for z in list(set([z['favorite_team_ID'] for z in relevant_subs]))]
    queries = []; params = []
    for tmp in team_IDs:
            
        # Attempt to save the data that would be used to generate post-game emails; having this information stored will allow easier iteration on the post-game email features because we can just load it from the file and call laxref.post_game_pro_email_basic or laxref.post_game_pro_email_team at our leisure. One thing to be careful of is that the json_handler is going to convert dates to strings; should affect the post-game emails as they current exist though.
        try:
            log_obj = {'game_dict': game_dict, 'basic_specs': {'team_ID': tmp['team_ID'], 'stat_adjustments': data['stat_adjustments']}, 'team_specs': {'team_ID': tmp['team_ID'], 'historical_statistical_ratings': data['historical_statistical_ratings'], 'uaEGA_percentiles': data['uaEGA_percentiles'], 'stat_adjustments': data['stat_adjustments']}}
            tmp_json_data = json.dumps(log_obj, default=zc.json_handler, indent=2)
            f = open(os.path.join(lr_fldr, 'Logs', 'PostGameEmailDataJSONs', 'PostGame%04d.json' % game_data['ID']), 'w')
            f.write(tmp_json_data); f.close()            
        except Exception:
            error = traceback.format_exc()
            if error not in data['telegram_messages']: zc.send_telegram(error, bot_token); data['telegram_messages'].append(error)
        
        # Call the functions that generate the actual emails
        try:        
            tmp['basic_html'] = laxref.post_game_pro_email_basic(game_dict, {'team_ID': tmp['team_ID'], 'stat_adjustments': data['stat_adjustments']})
            tmp['team_html'] = laxref.post_game_pro_email_team(game_dict, {'team_ID': tmp['team_ID'], 'historical_statistical_ratings': data['historical_statistical_ratings'], 'uaEGA_percentiles': data['uaEGA_percentiles'], 'stat_adjustments': data['stat_adjustments']})
            
        except Exception:
            msg = "Error trying to create post game email content HTML\n\n%s"% (traceback.format_exc())
            zc.send_telegram(msg, bot_token)
            break
        
        msg = "There are {:,} sent email records for this game ({}).".format(len(game_specific_sent_emails), game_data['description'])
        #print (msg); zc.send_telegram(msg, bot_token)
        for s in game_specific_sent_emails:
            s['decrypted_email'] = decrypt(s['recipient'])
        #zc.print_dict(game_specific_sent_emails)
        
        
    
        subscribers = [z for z in relevant_subs if z['favorite_team_ID'] == tmp['team_ID']]
        msg += "\nThere are {:,} subscribers with one of these teams as their favorite.".format(len(subscribers))
        #print (msg); zc.send_telegram(msg, bot_token)
        #zc.print_dict(subscribers)
        
        subscribers_without_email_send = [z for z in subscribers if '--send-anyway' in sys.argv or z['encrypted_email'] not in [y['recipient'] for y in game_specific_sent_emails]]
        #subscribers_without_email_send = [z for z in subscribers_without_email_send if 'sub_type' not in z or z['sub_type'] != "team"]
        
 
        msg += "\n\nOf those {:,} have not received it yet. Emails will go out in 15 minutes.\n\nhttps://pro.lacrossereference.com/email".format(len(subscribers_without_email_send))
        #print (msg); zc.send_telegram(msg, bot_token)
        msg += "\n\n" + "\n".join(list(set([decrypt(z['encrypted_email']) for z in subscribers_without_email_send])))
        #input (msg); 
        #zc.send_email(msg, {'subject': 'Post-Game Email Report for %s' % game_data['description'], 'from': "Live Win Odds"})
        
        team_sent = 0
        emails_with_email_added = []
        for i, sub in enumerate(subscribers_without_email_send):
            offset = 600 if 'sub_type' in sub and sub['sub_type'] in [None, 'fan', 'basic'] else 600
            tmp_html = tmp['team_html'] if 'sub_type' in sub and sub['sub_type'] == 'team' else tmp['basic_html']
            
            # For testing purposes, these emails are only going to admin for the team IDs included
            #if 'sub_type' in sub and sub['sub_type'] == 'team' and tmp['team_ID'] in [490]: # Utah = 84 / Syracuse = 42
            #    sub['decrypted_email'] = admin_email
            #    sub['encrypted_email'] = encrypt(admin_email)
            
            #sub['encrypted_email'] = encrypt(admin_email)
            
            if '--confirm-emails' in sys.argv:
                resp = input("Send a {} email to {} for the {} game? (y/n/send-to-admin-instead)".format(sub['sub_type'], sub['decrypted_email'], game_data['description']))
                if resp == "send-to-admin-instead":
                    sub['decrypted_email'] = admin_email
                    sub['encrypted_email'] = encrypt(admin_email)
                    
                    zc.send_email("<HTML>{}</HTML>".format(tmp_html), {'subject': game_data['description']})
                elif resp == "y":
                    pass
                else:
                    continue
            query1 = "INSERT INTO LRP_Sent_Email_Records (ID, send_date, active, recipient, status, email_ID, recipient_type, email_category, game_ID) VALUES ((SELECT IFNULL(max(ID), 0)+1 from LRP_Sent_Email_Records fds), %s, %s, %s, %s, (SELECT IFNULL(max(ID),0)+1 from LRP_Emails fds), %s, %s, %s)"
            param1 = [zc.to_utc(datetime.now() + timedelta(seconds=300)), 1, sub['encrypted_email'], 'scheduled', 'ind', 'post-game', game_data['ID']]
            
            
            query2 = "INSERT INTO LRP_Emails (ID, send_date, active, subject, email_type, status, content, send_as) VALUES ((SELECT IFNULL(max(ID),0)+1 from LRP_Emails fds), %s, %s, %s, %s, %s, %s, %s)"
            param2 = [zc.to_utc(datetime.now() + timedelta(seconds=300)), 1, encrypt('PRO Game Summary for %s' % (game_data['description'])), 'htmlContent', 'scheduled', tmp_html, admin_email]
            
            if not('sub_type' in sub and sub['sub_type'] == 'team') or not team_sent:
                if sub['encrypted_email'] not in emails_with_email_added:
                    emails_with_email_added.append(sub['encrypted_email'])
                    queries.append(query1); params.append(param1)
                    queries.append(query2); params.append(param2)
                
            if 'sub_type' in sub and sub['sub_type'] == 'team':
                team_sent = 1
    if len(queries) > 0:
        
        conn, cursor = LRP_connect(data['secrets']['web'])
        for q, p in zip(queries, params):
            cursor.execute(q, p)
        
        if '--no-commit' not in sys.argv: conn.commit()
        cursor.close(); conn.close()
    
    
    return game_data

        
        
        
def create_recap_HTML(g, game_data):
    recap_json = {}
    gs = g['stat_summaries']

    #zc.print_dict(gs); zc.exit("2odkdfdsg");

    views = [{'tag': 'dtop', 'html': '<div class="team_div_dtop" style="font-size:15px; height:[height]px; width:100%; position:relative;">'}, {'tag': 'mob', 'html': '<div class="team_div_mob" style="font-size:11px; height:[height]px; width:100%; position:relative;">'}]
    offset = {'dtop': 0, 'mob': 0}
    section_spacing = {'dtop': 75, 'mob': 50}
    lh = {'dtop': 25, 'mob': 25}
    fnt_big = {'dtop': 18, 'mob': 14}

    # Summary Stats
    stat_groups = []

    stats = []
    stats.append({'desc_dtop': 'Goals', 'desc_mob': 'Goals', 'var': 'goals', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Possessions', 'desc_mob': 'Poss.', 'var': 'possessions', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Shots', 'desc_mob': 'Shots', 'var': 'shots', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Shots-on-Goal', 'desc_mob': 'Shots-on-Goal', 'var': 'sog', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Off. Efficiency', 'desc_mob': 'Off. Eff%', 'var': 'off_efficiency', 'type': 'pct', 'fmt': '{:.1f}%'})
    stats.append({'desc_dtop': 'Assist Rate', 'desc_mob': 'Assist %', 'var': 'assist_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Shooting Percentage', 'desc_mob': 'Shooting %', 'var': 'shooting_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Shot-on-goal Rate', 'desc_mob': 'SOG %', 'var': 'sog_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Off Save %', 'desc_mob': 'Off Save%', 'var': 'saved_shot_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Faceoff Win Rate', 'desc_mob': 'FO Win %', 'var': 'fo_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Turnovers', 'desc_mob': 'Turnovers', 'var': 'turnovers', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Turnover Rate', 'desc_mob': 'Turnover %', 'var': 'turnover_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Failed Clears', 'desc_mob': 'Failed Clears', 'var': 'failed_clears', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Groundballs', 'desc_mob': 'Groundballs', 'var': 'gbs', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Time of Possession', 'desc_mob': 'T.O.P.', 'var': 'top', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Avg. Possession Length', 'desc_mob': 'Avg Poss Length', 'var': 'time_per_possession', 'type': 'float', 'fmt': '{:.1f}'})
    stats.append({'desc_dtop': 'Time to First Shot', 'desc_mob': 'Time to 1st Shot', 'var': 'avg_time_to_shot', 'type': 'float', 'fmt': '{:.1f}'})
    stats.append({'desc_dtop': 'Shots per Possession', 'desc_mob': 'Shots / Poss', 'var': 'shots_per_possession', 'type': 'float', 'fmt': '{:.2f}'})
    stats.append({'desc_dtop': 'Def Save %', 'desc_mob': 'Def Save%', 'var': 'save_pct', 'type': 'pct', 'fmt': '{:.1f}%'})
    stats.append({'desc_dtop': 'Number of Contributors', 'desc_mob': '# of Contributors', 'var': 'player_cnt', 'type': 'int', 'fmt': '{:.0f}'})
    #stats.append({'desc_dtop': '', 'desc_mob': '', 'var': '', 'type': '', 'fmt': ''})
    stat_groups.append({'type': 'compare_teams', 'desc_dtop': 'Summary Stats', 'stats': stats, 'dtop_widths': [30.0, 35.0, 35.0]})
    recap_json['compare_teams'] = []


    stats = []
    stats.append({'desc_dtop': 'Goals', 'desc_mob': 'Goals', 'var': 'goals', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Possessions', 'desc_mob': 'Poss.', 'var': 'possessions', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Shots', 'desc_mob': 'Shots', 'var': 'shots', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Shots-on-Goal', 'desc_mob': 'SOG', 'var': 'sog', 'type': 'int', 'fmt': '{:.0f}'})
    stats.append({'desc_dtop': 'Off. Efficiency', 'desc_mob': 'Off. Eff%', 'var': 'off_efficiency', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Shooting Percentage', 'desc_mob': 'Shooting %', 'var': 'shooting_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Shot-on-goal Rate', 'desc_mob': 'SOG %', 'var': 'sog_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Off Save%', 'desc_mob': 'Off Save%', 'var': 'saved_shot_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Faceoff Win Rate', 'desc_mob': 'FO Win %', 'var': 'fo_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Groundball Win Rate', 'desc_mob': 'GB Win %', 'var': 'gb_win_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Turnover Rate', 'desc_mob': 'Turnover %', 'var': 'turnover_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Time of Possession', 'desc_mob': 'T.O.P.', 'var': 'top', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Avg. Possession Length', 'desc_mob': 'Poss Len.', 'var': 'time_per_possession', 'type': 'float', 'fmt': '{:.1f}'})
    stats.append({'desc_dtop': 'Time to First Shot', 'desc_mob': 'Time to 1st', 'var': 'avg_time_to_shot', 'type': 'float', 'fmt': '{:.1f}'})
    stats.append({'desc_dtop': 'Shots per Possession', 'desc_mob': 'Shots / Poss', 'var': 'shots_per_possession', 'type': 'float', 'fmt': '{:.2f}'})
    stats.append({'desc_dtop': 'Assist Rate', 'desc_mob': 'Assist %', 'var': 'assist_rate', 'type': 'pct', 'fmt': '{:.0f}%'})
    stats.append({'desc_dtop': 'Def Save%', 'desc_mob': 'Def Save%', 'var': 'save_pct', 'type': 'pct', 'fmt': '{:.0f}%'})
    
    max_quarter = g['max_quarter']
    if max_quarter is not None:
        stat_groups.append({'type': 'team_by_quarter', 'desc_dtop': 'By Quarter', 'stats': stats, 'dtop_widths': [24.0] + [76./float(max_quarter) for z in range(max_quarter)]})
    recap_json['team_by_quarter'] = {'quarters': [], 'data': []}

    for j, stat_group in enumerate(stat_groups):
        if 'mob_widths' not in stat_group:
            stat_group['mob_widths'] = stat_group['dtop_widths']
            stat_group['desc_mob'] = stat_group['desc_dtop']

    # Create the JSON data
    for j, sg in enumerate(stat_groups):

        if sg['type'] == "compare_teams":

            for k, stat in enumerate(sg['stats']):
                d = {'dtop_display': stat['desc_dtop'], 'mob_display': stat['desc_mob'], 'data': []}

                for tmp in ['away', 'home']:
                    val = gs[tmp + "_%s" % stat['var']]['val']
                    if val is None:
                        val_str = "N/A"
                    else:
                        if stat['type'] == "pct":
                            val *= 100.
                        val_str = stat['fmt'].format(val)
                    d['data'].append(val_str)
                recap_json['compare_teams'].append(d)
        else:
            for l in range(max_quarter):
                q_str = "Q%d" % (l + 1)
                if l == 4:
                    q_str = "OT"
                elif l > 4:
                    q_str = "%dOT" % (l-3)
                recap_json['team_by_quarter']['quarters'].append(q_str)

            for k, stat in enumerate(sg['stats']):
                d = {'dtop_display': stat['desc_dtop'], 'mob_display': stat['desc_mob'], 'teams': {'away': [], 'home': []}}
                for tmp in ['away', 'home']:
                    for l in range(max_quarter):
                        val = gs[tmp + "_%s_by_quarter" % stat['var']]['val'][l]
                        if stat['type'] == "pct":
                            val *= 100.
                        val_str = stat['fmt'].format(val)
                        d['teams'][tmp].append(val_str)
                recap_json['team_by_quarter']['data'].append(d)
    # Create the HTML
    for i, view in enumerate(views):
        for j, sg in enumerate(stat_groups):
            # Print the table header
            cnt = 0; left = 0.
            if sg['type'] == "compare_teams":
                view['html'] += "<div style='text-align:left; padding-left:5px; border-bottom:solid 2px #888; position:absolute; top:%dpx; width:%.2f%%; font-weight:700; left:%.2f%%;'>%s</div>" % (offset[view['tag']], sg[view['tag'] + "_widths"][cnt], left, sg['desc_' + view['tag']]); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1
                for tmp in ['away', 'home']:
                    color = "background-color: %s; color:%s;" % (game_data[tmp + "_bg_color"], game_data[tmp + "_fg_color"])
                    view['html'] += "<div style='%s top:%dpx; border-bottom:solid 2px #888; position:absolute; width:%.2f%%; font-weight:700; left:%.2f%%;'>%s</div>" % (color, offset[view['tag']], sg[view['tag'] + "_widths"][cnt], left, game_data['short_code_' + tmp]); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1


            offset[view['tag']] += lh[view['tag']]+2

            # Print the table rows


            if sg['type'] == "compare_teams":
                for k, stat in enumerate(sg['stats']):
                    style = "position:absolute; background-color:#FFF;" if k % 2 == 0 else "position:absolute; background-color:#EEE;"
                    if k == len(sg['stats'])-1:
                        style += "border-bottom: solid 1px #AAA;"
                    style += " top:%dpx;" % (offset[view['tag']])
                    cnt = 0; left = 0.;
                    view['html'] += "<div style='text-align:left; padding-left:5px; %s width:%.2f%%; left:%.2f%%;'>%s</div>" % (style, sg[view['tag'] + "_widths"][cnt], left, stat['desc_' + view['tag']]); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1
                    for tmp in ['away', 'home']:
                        val = gs[tmp + "_%s" % stat['var']]['val']
                        if val is None:
                            val_str = "N/A"
                        else:
                            if stat['type'] == "pct":
                                val *= 100.
                            val_str = stat['fmt'].format(val)
                        view['html'] += "<div style='%s width:%.2f%%; left:%.2f%%;'>%s</div>" % (style, sg[view['tag'] + "_widths"][cnt], left, val_str); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1

                    offset[view['tag']] += lh[view['tag']]

                offset[view['tag']] += section_spacing[view['tag']]
            elif sg['type'] == "team_by_quarter":
                for tmp in ['away', 'home']:
                    color = "background-color: %s; color:%s;" % (game_data[tmp + "_bg_color"], game_data[tmp + "_fg_color"])

                    view['html'] += "<div style='%s text-align:center; padding-left:5px; position:absolute; top:%dpx; width:100%%; font-size:%dpx; font-weight:700; left:0%%;'>%s: %s</div>" % (color, offset[view['tag']], fnt_big[view['tag']], sg['desc_' + view['tag']], game_data['display_' + tmp]);
                    offset[view['tag']] += lh[view['tag']]

                    cnt = 0; left = 0.
                    view['html'] += "<div style='position:absolute; text-align:left; top:%dpx; border-bottom:solid 2px #888;  padding-left:5px; width:%.2f%%; left:%.2f%%;'>&nbsp;</div>" % (offset[view['tag']], sg[view['tag'] + "_widths"][cnt], left); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1

                    for l in range(max_quarter):
                        q_str = "Q%d" % (l + 1)
                        if l == 4:
                            q_str = "OT"
                        elif l > 4:
                            q_str = "%dOT" % (l-3)

                        view['html'] += "<div style='top:%dpx; border-bottom:solid 2px #888; position:absolute; width:%.2f%%; font-weight:700; left:%.2f%%;'>%s</div>" % (offset[view['tag']], sg[view['tag'] + "_widths"][cnt], left, q_str); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1

                    offset[view['tag']] += lh[view['tag']]+2

                    for k, stat in enumerate(sg['stats']):
                        style = "position:absolute; background-color:#FFF;" if k % 2 == 0 else "position:absolute; background-color:#EEE;"
                        if k == len(sg['stats'])-1:
                            style += "border-bottom: solid 1px #AAA;"
                        style += " top:%dpx;" % (offset[view['tag']])
                        cnt = 0; left = 0.;
                        view['html'] += "<div style='text-align:left; padding-left:5px; %s width:%.2f%%; left:%.2f%%;'>%s</div>" % (style, sg[view['tag'] + "_widths"][cnt], left, stat['desc_' + view['tag']]); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1

                        for l in range(max_quarter):
                            val = gs[tmp + "_%s_by_quarter" % stat['var']]['val'][l]
                            if stat['type'] == "pct":
                                val *= 100.
                            val_str = stat['fmt'].format(val)
                            view['html'] += "<div style='%s width:%.2f%%; left:%.2f%%;'>%s</div>" % (style, sg[view['tag'] + "_widths"][cnt], left, val_str); left += sg[view['tag'] + "_widths"][cnt]; cnt += 1

                        offset[view['tag']] += lh[view['tag']]
                    offset[view['tag']] += section_spacing[view['tag']]
    for i, view in enumerate(views):
        view['html'] = view['html'].replace("[height]", "%d" % offset[view['tag']])
        view['html'] += "</div>"
    return "".join([z['html'] for z in views]), recap_json




def get_last_play_html(game_dict, game_data):
    html = ""
    #zc.print_dict(game_dict['plays'][0:10])
    #input("Last play")


    lp = None if game_dict is None or 'plays' not in game_dict or len(game_dict['plays']) == 0 else game_dict['plays'][-1]
    
    #zc.print_dict(lp)

    html += "<div class='col-12 no-padding'>"
    gif = None
    if lp is not None:
        gif = game_data['home_gif'] if lp['team'] == game_data['home_team'] else game_data['away_gif']
        #html += "<div class='col-12 ' style='display:flex; padding-bottom:10px;'>"
        #html += "<div class='col-12 '><span class='font-18 light'>Last Play</span></div>"
        #html += "</div>"

        html += "<div class='col-12 ' style='display:flex; padding-bottom:10px;'>"
        html += "<div class='col-10 '><span class='font-24 oswald '>%s</span></div>" % (lp['play_type'])
        html += "<div class='col-2 right' style='margin-right: 10px;'><img src='%s' /></div>" % (gif)
        html += "</div>"

        html += "<div class='col-12' style='padding:0; display:flex;'>"
        html += "<div class='col-12' style='padding: 0px 0px 0px 5px;'><span style='font-style:italic;' class='font-15 contents'>%s</span></div>" % (lp['details'])
        html += "</div>"


    html += "</div>"
    
    if game_data['women']:
        html = html.replace("Faceoff Win", "Draw Control")

    return html

def generate_box_score(stars, game_data):
    html = ""
    tags = [{'padding': 0, 'display': game_data['display_home'], 'home_val': 1}, {'padding': 20, 'display': game_data['display_away'], 'home_val': 0}]
    #zc.print_dict(stars[0:5])

    inner_html = ""
    for i, tag in enumerate(tags):
        inner_html += "<div class='col-12' style='padding-top: %dpx; border-bottom:solid 1px #777;'><span class='font-18 bold'>%s</span></div>" % (tag['padding'], tag['display'])

        players = sorted([z for z in stars if tag['home_val'] == z['home']], key=lambda x:x['goals_added'], reverse=True)

        players = [z for z in players if "GOALIE" not in z['player']]

        # Header Row
        inner_html += "<div class='col-12 no-padding' style='display:flex; border-bottom:solid 1px #CCC; padding-left:5px; padding-right:5px;'>"
        inner_html += "<div class='col-4 no-padding left' style=''><span class='font-13 bold' style=''>Player</span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>Goals</span><span class='mob'>G</span></span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>Assists</span><span class='mob'>A</span></span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>Shots</span><span class='mob'>Sh</span></span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>TOs</span><span class='mob'>TO</span></span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>GBs</span><span class='mob'>GB</span></span></div>"
        inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13 bold' style=''><span class='dtop'>FOs</span><span class='mob'>FO</span></span></div>"
        inner_html += "<div class='col-2 no-padding centered' style=''><span class='font-13 bold' style=''>EGA</span></div>"
        inner_html += "</div>"

        for j, p in enumerate(players):

            if '-simulation' not in sys.argv:
                inner_html += "<div class='col-12 table-row no-padding' style='display:flex; padding-left:5px; padding-right:5px;'>"
                inner_html += "<div class='col-4 no-padding left' style=''><span class='font-13' style=''>%s</span></div>" % (p['player'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['goals'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['assists'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['shots'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['tos'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['gbs'])
                inner_html += "<div class='col-1 no-padding centered' style=''><span class='font-13' style=''>%.0f</span></div>" % (p['fo'])
                inner_html += "<div class='col-2 no-padding centered' style=''><span class='font-13' style=''>%.2f</span></div>" % (p['goals_added'])

                inner_html += "</div>"

    html = "<div class='col-12'>%s</div>" % inner_html

    #input("Stars")
    return html
    
lineup_regex = re.compile('FOR [A-Z]+?\:?.*?\#?[0-9]+?.*?\#?[0-9]+?.*?\#?[0-9]+?.*?(?:[\r\n]|$)', re.IGNORECASE)
update_ts_log_dir = os.path.join(lr_fldr, "Logs", "DaySpecificFileUpdateTimes")    

def log_updated_file(data, file_src):
    """
    When a game file is updated, it may not be uploaded directly to LRP/FTP; in those cases, a separate script runs constantly checking for updated files. In this second scenario, in place of the upload, just log the time the file was updated in the Log Directory so that it can be read.
    """
    DEBUG_LOG_FN = 0
    
    try:
    
        dt = datetime.now().strftime("%Y%m%d")
        tmp_start_ms = time.time()
        # If there is an execution flag set for this python run, use it to specify the filename so that we don't have any overwrite issues
        if '-execution' not in sys.argv:
            src = os.path.join(update_ts_log_dir, "%s.txt" % dt)
        else:
            src = os.path.join(update_ts_log_dir, "%s_execution%s.txt" % (dt, sys.argv[sys.argv.index('-execution') + 1]))
            
        # Read in the existing data; if it exists
        if os.path.isfile(src):
            tmp_data = open(src, 'r').read()
            file_list = [{'updated': int(z.split("|")[0]), 'src': z.split("|")[1]} for z in tmp_data.split("\n") if z.strip() != ""]
        else:
            file_list = []
            
        # If the file is new, add it to the list; otherwise update the updated timestamp    
        if file_src not in [z['src'] for z in file_list]:
            d = {'src': file_src, 'updated': int(time.time())}
            file_list.append(d)
        else:
            d = file_list[ [z['src'] for z in file_list].index(file_src) ] 
            d['updated'] = int(time.time())
        
        # Write the results back to the file
        tmp_data = "\n".join(["%d|%s" % (z['updated'], z['src']) for z in file_list])
        if DEBUG_LOG_FN:
            print ("\nFile List")
            zc.print_dict(file_list)
            print ("File Data")
            print (tmp_data)
        
        f = open(src, 'w'); f.write(tmp_data); f.close()
        
        tmp_end_ms = time.time()
        
        msg = ("It took %.3fs to process the update-timestamps log file read/write" % (tmp_end_ms - tmp_start_ms))
        if DEBUG_LOG_FN:    
            
            print ("\n%s...\n" % msg)
        data['log_updated_file_last_msg'] = msg
    except Exception:
        msg = "[WARNING] in live_win_odds.log_updated_file, an error occurred\n\n%s" % traceback.format_exc()
        print (msg)
        zc.send_crash(msg, bot_token)
    return data
    
def notify_regex_error(data, game_data, error, first_non_play_match):
    """
    In some cases, the play regexes can't even identify the type of play that an entry represents. When that happens, notification is sent and the game is set to skip until it can be resolved.
    """
    
    error += "\n\nGame: %s" % game_data['description']
    error += "\n\nhttps://pro.lacrossereference.com/admin_cockpit?game_ID=%d" % game_data['ID']
    
    short_error = "There was a regex play match error in %s" % game_data['description']
    short_error += "\n\nhttps://pro.lacrossereference.com/admin_cockpit?game_ID=%d" % game_data['ID']
        
    if first_non_play_match:
        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, bad_play_type_error=%s where game_ID=%s"
        param = [error, game_data['ID']]
        cursor = zc.zcursor("LR")
        cursor.execute(query, param); cursor.commit()
        cursor.close()
        
        if short_error not in data['telegram_messages']: 
        
            telegram_alert(error); zc.send_crash(error, bot_token); data['telegram_messages'].append(short_error)
            
            # For this particular processing loop, once a message has been sent, do not send anymore; first_non_play_match is returned into the calling process function
            first_non_play_match = 0
    
    return data, game_data, first_non_play_match
    
def parse_plays(browser, game_data, data):

    parse_plays_start_time = time.time()

    game_data['queued_queries'] = []
    
    process_step = {'result': "", 'desc': "Parse Plays", 'points': []}
    res = game_data['plays_captured']
    # Record the number of plays that were parsed
    
    if len(game_data['scrape_plays_parsed']) > 0:
        game_data['scrape_plays_parsed'][-1] = len(res)
        
    print ("  Parsing %d plays @ %s..." % (len(res), datetime.now().strftime("%I:%M %p")))
    process_step['points'].append({'txt': "In loop {:,}, parsing {} plays @ {}..." .format (game_data['loops'], len(res), datetime.now().strftime("%I:%M %p"))})
    
    game_data['n_play_rows_scraped'] = len(res)
    
    game_data['last_parse'] = time.time()
    game_data['last_parse_loop'] = game_data['loops']
    
    
    # Remove any plays that are lineups
    start_n = len(res)
    res = [z for z in res if lineup_regex.search(z['detail']) is None]
    
    # Remove any plays that could be be parsed and have obvious tells that they are commmentary
    res = [z for z in res if "called off after stick check" not in z['detail'] and "shot deflected" not in z['detail'] and "lightning" not in z['detail']]
    
    if len(res) != start_n:
        process_step['points'].append({'txt': "Started with {} plays, after removals, down to {}..." .format (start_n, len(res))})
    
    pro_url_tags = {'home': game_data['home_pro_url_tag'], 'away': game_data['away_pro_url_tag']}
    if 'game_pro_url_tag' in game_data:
        pro_url_tags['game'] = game_data['game_pro_url_tag']
      
    json_output = {'dt': game_data['game_date'].strftime("%Y%m%d"), 'pro_url_tags': pro_url_tags, 'unlocked_url': game_data['unlocked_url'], 'unlocked_team': game_data['unlocked_team'], 'from_DB': game_data['use_db_plays'], 'zhex_gID': to_zhex(game_data['ID'], 4), 'gID': game_data['ID'], 'LRP_section_active': '--include-LRP-ad' in sys.argv, 'flipped': '-flipped' in sys.argv, 'league': game_data['league_obj'], 'active_box_team': None, 'active_tab': None, 'active_html_tabs': game_data['active_html_tabs'], 'last_parsed': time.time(), 'pct_complete': None, 'game_status': None, 'gifs': {}, 'plays': [], 'recap': [], 'preview': "Once and future Chelsea...", 'box_score': []}
    json_output['gifs']['h'] = game_data['home_gif']
    json_output['gifs']['a'] = game_data['away_gif']
    json_output['bg_colors'] = {'away': game_data['orig_away_bg_color'], 'home': game_data['orig_home_bg_color']}


    json_output['team_game_summaries'] = {}
    if '--test-team-game-summaries' in sys.argv:
        json_output['team_game_summaries']['home_team_offensive_game_summaries'] = game_data['home_team_offensive_game_summaries']
        json_output['team_game_summaries']['home_team_defensive_game_summaries'] = game_data['home_team_defensive_game_summaries']
        json_output['team_game_summaries']['away_team_offensive_game_summaries'] = game_data['away_team_offensive_game_summaries']
        json_output['team_game_summaries']['away_team_defensive_game_summaries'] = game_data['away_team_defensive_game_summaries']
        
    sections = game_data['sections']
    home_win_odds = game_data['home_win_odds']
    play_buffer = []
    
    for i, r in enumerate(res):
        r['seq'] = i + 1

    res = sorted(res, key=lambda x:x['game_elapsed'])

    # Check if the first timestamp needs to be switched
    if game_data['first_timestamp_is_zero']:
        bad_stamps = [z for z in [res[0], res[1], res[-2], res[-1]] if " at goalie" in z['detail'] and z['game_elapsed'] == (1800 if "Women" in game_data['league'] else 900)]
        if len(bad_stamps) > 0:
            for b in bad_stamps:
                tmp = res[ [z['ID'] for z in res].index(b['ID'])]
                tmp['game_elapsed'] = 0
                tmp['pct_complete'] = 0.
            
            msg = "Switched a goalie timestamp from 00:00 to 30:00 in game ID %d (%s)" % (game_data['ID'], game_data['description'])
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
            res = sorted(res, key=lambda x:x['game_elapsed'])

        
    res = [z for z in res if z['event_type'] not in [None, '']]

    win_odds_ID = game_data['win_odds_ID']
    win_odds_data = game_data['win_odds_data']
    #print(game_data['win_odds_data'])
    #zc.exit("WOD")

    home_won = True
    max_home_odds = None
    min_home_odds = None
    max_away_odds = None
    min_away_odds = None

    
    game_data['game_over'] = False

    game_state = 0
    home_first = False
    adj_home = ""
    adj_away = ""

    plot_x = []
    plot_y = []
    max_quarter = None
    max_elapsed = None

    debug = False

    game_state = 0
    htmls = []
    last_game_elapsed = None
    last_odds = None
    last_quarter = None
    lines_written = 0
    out = None

    game_data['home_score'] = 0
    game_data['away_score'] = 0
    game_data['home_score_by_quarter'] = [0]*10
    game_data['away_score_by_quarter'] = [0]*10


    odds = None
    home_goals = 0
    away_goals = 0

    #pct_complete = None

    #weight_param = 100.0

    team = None

    out_path = os.path.join(lr_fldr, "LiveWinOdds", game_data['game_file'] + ".csv")
    if '-building' in sys.argv:
        out_path_json = os.path.join("/home/pi/zack/default/static/wp-content/uploads/WinProbabilityGameData", game_data['game_file'] + ".json")
    else:
        out_path_json = os.path.join(lr_fldr, "LiveWinOdds", game_data['game_file'] + ".json")
        
    if '--test-abbreviations-dict' in sys.argv:
        game_data['home_team'] = None
        game_data['away_team'] = None
        game_data['home_abbreviations'] = []
        game_data['away_abbreviations'] = []
        
    for i, r in enumerate(res):

        r['keep'] = 1
        if r['detail'] is not None and 'injury' in r['detail'].lower():
            r['keep'] = 0
            
        team = r['team']
        
        if game_data['home_team'] is None and team.strip().upper() in [str(z) for z in game_data['home_abbreviations']]:
            game_data['home_abbreviation'] = team.strip().upper()
        if game_data['away_team'] is None and team.strip().upper() in [str(z) for z in game_data['away_abbreviations']]:
            game_data['away_abbreviation'] = team.strip().upper()
    
    
    
    # Some rows can be ignored safely, so remove them
    res = [z for z in res if z['keep']]
    
    found_abbreviations = [{'abbreviation': y, 'abbreviation_sans_year': y} for y in list(set([z['team'].upper().strip() for z in res if 'substitution' not in z['detail'].lower()]))]
    
    # Check if they are using a year-based suffix on the text part of the abbreviation; it may be that we can match on the text part, but not the year part (especially early in the season)
    try:
        abbrev_regex1 = re.compile(r'([a-z\-\(\)]+?)[0-9]{2,4}$', re.IGNORECASE)
        for f in found_abbreviations:
            if f['abbreviation'] is not None:
                match = abbrev_regex1.search(f['abbreviation'])
                if match:
                    f['abbreviation_sans_year'] = match.group(1)
    except Exception:
        # REMOVE ONCE SANS YEARS ABBREVIATIONS ARE STABLE (label will appear in multiple places)
        msg = "Removing Years from Abbreviations fail"
        msg += "\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
    try:
        for found_abbreviation in found_abbreviations:
            tmp = [z for z in res if found_abbreviation['abbreviation'] == z['team'].upper().strip()]
            if len(tmp) > 0:
                found_abbreviation['detail'] = tmp[0]['detail']
    except Exception:
        msg = "Setting Abbreviations Detail fail"
        msg += "\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                         
    if '--show-plays' in sys.argv:
    
        for i, r in enumerate(res):

            pct_comp_str = ("%.3f" % r['pct_complete']) if r['pct_complete'] is not None else ""
            print ("{:<10}{:<10}{:<10}{:<20}{}".format(r['team'], r['game_elapsed'], pct_comp_str, r['event_type'], r['detail']))
            
        print ("\n\nAbbreviations\n-------------------------------------------")
        tmp_abbreviations = []
        for i, r in enumerate(res):
            if r['team'] not in tmp_abbreviations:
                print ("{:<10}{:<30}{}".format("%.3f" % r['pct_complete'], r['team'], r['detail']))
                tmp_abbreviations.append(r['team'])

    if game_data['home_team'] is None or game_data['away_team'] is None:
        
        msg = "Found %d abbreviations in the play-by-play in game %d: %s" % (len(found_abbreviations), game_data['ID'], ", ".join([z
        ['abbreviation'] for z in found_abbreviations])) 
        print (msg)
        if '--log-abbreviations' in sys.argv:
            data, game_data = log_abbreviations(data, game_data, msg)
        #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
        home_sans_years_abbreviations_used = []
        for a in found_abbreviations:
            a['home'] = 1 if a['abbreviation'].upper() in [str(z).upper() for z in game_data['home_abbreviations']] else 0
            a['away'] = 1 if a['abbreviation'].upper() in [str(z).upper() for z in game_data['away_abbreviations']] else 0
            
            try:
                a['home_sans_years'] = 1 if a['abbreviation_sans_year'] is not None and a['abbreviation_sans_year'].upper() in [str(z).upper() for z in game_data['home_abbreviations_sans_years']] else 0
                a['away_sans_years'] = 1 if a['abbreviation_sans_year'] is not None and a['abbreviation_sans_year'].upper() in [str(z).upper() for z in game_data['away_abbreviations_sans_years']] else 0
            except Exception:
                # REMOVE ONCE SANS YEARS ABBREVIATIONS ARE STABLE (label will appear in multiple places)
                msg = "Abbreviation matching Fail: game ID %d (%s)\n\n" % (game_data['ID'], game_data['description'])
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)

           
        n_home_found_abbreviations = sum([z['home'] for z in found_abbreviations])
        n_away_found_abbreviations = sum([z['away'] for z in found_abbreviations])
        n_home_found_abbreviations_sans_years = sum([z['home_sans_years'] for z in found_abbreviations if 'home_sans_years' in z and z['home_sans_years'] is not None])
        n_away_found_abbreviations_sans_years = sum([z['away_sans_years'] for z in found_abbreviations if 'away_sans_years' in z and z['away_sans_years'] is not None])
        msg = "n_home_found_abbreviations: %d; n_away_found_abbreviations: %d; n_home_found_abbreviations_sans_years: %d; n_away_found_abbreviations_sans_years: %d" % (n_home_found_abbreviations, n_away_found_abbreviations, n_home_found_abbreviations_sans_years, n_away_found_abbreviations_sans_years)
        if '--test-sans-years' in sys.argv:
            zc.print_dict(found_abbreviations)
            print (msg)

        if '--log-abbreviations' in sys.argv:
            data, game_data = log_abbreviations(data, game_data, msg)
            
        ALLOW_SANS_YEAR_MATCHES = 1
        if not (n_home_found_abbreviations == 1 and n_away_found_abbreviations == 1) and n_home_found_abbreviations_sans_years == 1 and n_away_found_abbreviations_sans_years == 1:
            msg = "In the {} game, the raw abbreviations ({}) did not match the database, but we did match after removing the year modifiers ({}).".format(
                game_data['description']
                , " and ".join([z['abbreviation'] for z in found_abbreviations])
                , " and ".join([z['abbreviation_sans_year'] for z in found_abbreviations])
                )
            #msg += "\n\nThe idea here is that this should be good enough to count as a match, but I don't want to actually make that change to the code until I've had some time to verify that the selections are correct. If this seems to be generating correct responses, you can enable this capability by removing the --allow-sans-years-matching flag check."
            msg += "\n\nThis seems to be working correctly, so I've enabled the script to make the adjustment automatically. If there are any issues, set ALLOW_SANS_YEAR_MATCHES equal to 0"
            msg += "\n\n{}".format(game_data['admin_cockpit_url'])
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        if n_home_found_abbreviations == 1 and n_away_found_abbreviations == 1:
            
            msg = "In game ID %d, 1 abbreviation matched home and one matched away, so we are good." % (game_data['ID']) 
            if '--log-abbreviations' in sys.argv:
                data, game_data = log_abbreviations(data, game_data, msg)
            
            game_data['home_team'] = [z for z in found_abbreviations if z['home']][0]['abbreviation'].strip()
            game_data['away_team'] = [z for z in found_abbreviations if z['away']][0]['abbreviation'].strip()
            
        elif ALLOW_SANS_YEAR_MATCHES and n_home_found_abbreviations_sans_years == 1 and n_away_found_abbreviations_sans_years == 1:
            
            msg = "In game ID %d, after we removed the year modifiers, 1 abbreviation matched home and one matched away, so we are good." % (game_data['ID']) 
            if '--log-abbreviations' in sys.argv:
                data, game_data = log_abbreviations(data, game_data, msg)
            
            game_data['home_team'] = [z for z in found_abbreviations if z['home_sans_years']][0]['abbreviation'].strip()
            game_data['away_team'] = [z for z in found_abbreviations if z['away_sans_years']][0]['abbreviation'].strip()
            
            
            
        else:
            
            msg = "In game ID %d, there was not a clean abbreviation match, so we are asking." % (game_data['ID'])  
            if '--log-abbreviations' in sys.argv:
                data, game_data = log_abbreviations(data, game_data, msg)
                print (msg)
            is_home = None; set_via_db = 0
            
            if game_data['abbreviation_user_response_dict'] is not None:    
                
                msg = "\n\nIn the LaxRef_Active_Live_WP_Games database table, there were already %d entries for abbreviations" % (len(game_data['abbreviation_user_response_dict']))
                #zc.print_dict(game_data['abbreviation_user_response_dict'])
                for tmp_abbrev in game_data['abbreviation_user_response_dict']:
                    if tmp_abbrev['team'] == found_abbreviations[0]['abbreviation']:
                        if tmp_abbrev['team_type'] == "HOME":
                            set_via_db = 1
                            msg += "\n[1] The abbreviation stored in the DB for the %s team was %s; since that matched found_abbreviations[0], then set the game_data['home_team'] to %s" % (tmp_abbrev['team_type'], tmp_abbrev['team'], found_abbreviations[0]['abbreviation'])
                            game_data['home_team'] = found_abbreviations[0]['abbreviation']
                            game_data['home_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                            game_data['home_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                            
                            if len(found_abbreviations) > 1:
                                msg += "\nSince more than one abbreviation was found, set the game_data['away_team'] to %s" % (found_abbreviations[1]['abbreviation'])
                            
                                game_data['away_team'] = found_abbreviations[1]['abbreviation']
                                game_data['away_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                                game_data['away_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
            
                            #is_home = 1
                        else:
                            set_via_db = 1
                            msg += "\n[2] The abbreviation stored in the DB for the %s team was %s; since that matched found_abbreviations[0], then set the game_data['away_team'] to %s" % (tmp_abbrev['team_type'], tmp_abbrev['team'], found_abbreviations[0]['abbreviation'])
                            game_data['away_team'] = found_abbreviations[0]['abbreviation']
                            game_data['away_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                            game_data['away_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                            
                            if len(found_abbreviations) > 1:
                                msg += "\nSince more than one abbreviation was found, set the game_data['home_team'] to %s" % (found_abbreviations[1]['abbreviation'])
                            
                                game_data['home_team'] = found_abbreviations[1]['abbreviation']
                                game_data['home_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                                game_data['home_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
                                
                            #is_home = 0
                            
                        if '--log-abbreviations' in sys.argv:
                            data, game_data = log_abbreviations(data, game_data, msg)
                        
                        break
                    elif len(found_abbreviations) == 2 and tmp_abbrev['team'] == found_abbreviations[1]['abbreviation']:
                        if tmp_abbrev['team_type'] == "AWAY":
                            set_via_db = 1
                            msg += "\n[3] The abbreviation stored in the DB for the %s team was %s; since that matched found_abbreviations[1], then set the game_data['away_team'] to %s" % (tmp_abbrev['team_type'], tmp_abbrev['team'], found_abbreviations[1]['abbreviation'])
                            game_data['away_team'] = found_abbreviations[1]['abbreviation']
                            game_data['away_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                            game_data['away_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
                            
                            msg += "\nSince more than one abbreviation was found, set the game_data['home_team'] to %s" % (found_abbreviations[0]['abbreviation'])
                            game_data['home_team'] = found_abbreviations[0]['abbreviation']
                            game_data['home_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                            game_data['home_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                            
                            #is_home = 1
                        else:
                            set_via_db = 1
                            msg += "\n[4] The abbreviation stored in the DB for the %s team was %s; since that matched found_abbreviations[1], then set the game_data['home_team'] to %s" % (tmp_abbrev['team_type'], tmp_abbrev['team'], found_abbreviations[1]['abbreviation'])
                            
                            game_data['home_team'] = found_abbreviations[1]['abbreviation']
                            game_data['home_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                            game_data['home_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
                            
                            msg += "\nSince more than one abbreviation was found, set the game_data['away_team'] to %s" % (found_abbreviations[0]['abbreviation'])
                            game_data['away_team'] = found_abbreviations[0]['abbreviation']
                            game_data['away_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                            game_data['away_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                            
                            #is_home = 0
                        
                        if '--log-abbreviations' in sys.argv:
                            data, game_data = log_abbreviations(data, game_data, msg)
                            zc.send_telegram(msg, bot_token)
                        break
                if '--test-abbreviations-dict' in sys.argv:        
                    zc.exit("ABBREV DICT")
        
            if not set_via_db:
                if '--log-abbreviations' in sys.argv:
                    msg = "\nBecause we could not use the abbreviations stored in the database (or there were none), resort to this check"
                    data, game_data = log_abbreviations(data, game_data, msg)
                
                # If we asked for the abbreviations within the last 5 minutes, do not ask until it's been 5 full minutes (admin Cockpit can be used to deal with this issue after the initial Telegram alerts admins to the problem)
                if len(found_abbreviations) == 0 or (time.time() - game_data['last_abbreviation_request']) < 300:
                    is_home = -1
                elif len(found_abbreviations) == 1:
                    data, is_home = ask_for_abbreviations(data, game_data, found_abbreviations, found_abbreviations[0]['abbreviation'], "[NOT FOUND]")
                    game_data['last_abbreviation_request'] = time.time()
                else:
                    data, is_home = ask_for_abbreviations(data, game_data, found_abbreviations, found_abbreviations[0]['abbreviation'], found_abbreviations[1]['abbreviation'])
                    game_data['last_abbreviation_request'] = time.time()
            
                skip_this_game = 1
                if is_home in ["-1", -1]:
                    
                    # Never got a response from the user, so we are just ignoring this loop and we'll try again next time
                    process_step['result'] = "No Abbreviations Answer; len(found_abbreviations)=%d" % (len(found_abbreviations))
                    process_step['result_val'] = 0
                    game_data['processing_log']['steps'].append(process_step)
                    return game_data
                    
                elif is_home:
                    game_data['home_team'] = found_abbreviations[0]['abbreviation']
                    game_data['home_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                    game_data['home_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                    
                    game_data['away_team'] = None
                    game_data['away_abbreviation'] = None
                    if len(found_abbreviations) > 1:
                        game_data['away_team'] = found_abbreviations[1]['abbreviation']
                        game_data['away_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                        game_data['away_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
                    skip_this_game = 0
                else:
                    
                    game_data['home_team'] = None
                    game_data['home_abbreviation'] = None
                    if len(found_abbreviations) > 1:
                        game_data['home_team'] = found_abbreviations[1]['abbreviation']
                        game_data['home_abbreviations'].append(found_abbreviations[1]['abbreviation'].upper())
                        game_data['home_abbreviation'] = found_abbreviations[1]['abbreviation'].upper()
                    game_data['away_team'] = found_abbreviations[0]['abbreviation']
                    game_data['away_abbreviations'].append(found_abbreviations[0]['abbreviation'].upper())
                    game_data['away_abbreviation'] = found_abbreviations[0]['abbreviation'].upper()
                    skip_this_game = 0
                    
                if skip_this_game:
                    # Something was wrong with the abbreviation options, so we are skipping the game
                    query = "UPDATE LaxRef_Active_Live_WP_Games set skip=1 where game_ID=%s" 
                    param = [game_data['ID']]
                    #msg = "Something was wrong with the abbreviations in game ID %d\n\n%s w/ %s" % (game_data['ID'], query, param)
                    #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    
                    try:
                        #cursor = zc.zcursor("LR")
                        #cursor.execute(query, param)
                        #cursor.commit(); cursor.close()
                        update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
                    except Exception:
                        msg = "DB Fail: game ID %d (%s)\n\nFailed to set skip=1 in the Live WP Games table." % (game_data['ID'], game_data['description'])
                        msg += "\n\n%s" % traceback.format_exc()
                        print (msg)
                        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                        
                    game_data['skip'] = 1
                    
                    process_step['result'] = "Abbreviations Confirmation"; process_step['result_val'] = 0
                    game_data['processing_log']['steps'].append(process_step)
                    return game_data
            
            #msg = "Abbreviations set in game ID %d: home=%s; away=%s." % (game_data['ID'], game_data['home_team'], game_data['away_team']) 
            #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
    html = None
    wp_specs = {'sections': game_data['sections'], 'home_win_odds': game_data['home_win_odds'], 'game_date': game_data['game_date'], 'league_desc': game_data['league_desc']}

    wp_json_input = {'pts':[]}
    pct_complete = None
    res, error = laxref.add_odds_to_plays_list(res, game_data, wp_specs)
    if error is not None:
       

        if "Bad Play Type" in error:
            query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, bad_play_type_error=%s where game_ID=%s"
            param = [error, game_data['ID']]
            #cursor = zc.zcursor("LR")
            #cursor.execute(query, param); cursor.commit()
            #cursor.close()
            update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
        elif "from the pct complete value":
            query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, bad_play_type_error=%s where game_ID=%s"
            param = [error, game_data['ID']]
            #cursor = zc.zcursor("LR")
            #cursor.execute(query, param); cursor.commit()
            #cursor.close()
            update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
            
        error += "\n\n%s" % game_data['admin_cockpit_url']
        process_step['points'].append({'txt': "Error: {}..." .format (error)})
        process_step['result'] = "ERROR/CRASH"; process_step['result_val'] = 0
        if error not in data['telegram_messages']: zc.send_telegram(error, bot_token); telegram_alert(error); data['telegram_messages'].append(error)
    else:
        if len(res) > 0:
                
            out = open(out_path, 'w')
            out.write("Timestamp,PctComplete,GameState,Play,HomeOdds,Team,Details,Home,Away,lineColor,gifPath,endOfPeriod,HomeID,AwayID,Seq\n")

        current_odds = None
        for i, r in enumerate(res):
            if debug:
                print(r)

            time_elapsed = r['game_elapsed']
            quarter = r['quarter']
            if last_quarter not in [quarter, None]:
                play_buffer = []
                
            

            pct_complete = float(r['game_elapsed']) / 3600.0
            json_output['pct_complete'] = pct_complete
            
            #print ("{:<30}{:<30}{:<30}".format("Quarter=%s" % quarter, "Game Elapsed=%s" % r['game_elapsed'], "Pct Comp=%.3f" % pct_complete))
            game_data['time_str'] = laxref.convert_pct_complete_to_time_str(pct_complete, game_data['game_date'].year, game_data['league_desc'])

            team = r['team']
                
            if "GOAL" in r['event_type'].upper() and "GOALIE CHANGE" not in r['event_type'].upper():
                if team.strip() == game_data['home_team']:
                    game_state += 1
                    home_goals += 1
                    game_data['home_score_by_quarter'][r['quarter']-1] += 1
                elif team.strip() == game_data['away_team']:
                    game_state -= 1
                    away_goals += 1
                    game_data['away_score_by_quarter'][r['quarter']-1] += 1
            
            
            
            
            line_out = "%s,%f," % ("", pct_complete)
            line_out += "%d,%s," % (game_state, r['event_type'])
            line_out += "%.03f,%s,%s,%s,%s,#F00,#0F0," % (100.0 * r['odds'], r['team'], '' if False else r['detail'].replace(",", ";"), game_data['home_abbreviation'], game_data['away_abbreviation'])
            line_out += "%s,%s,%s,%d,%d,%d" % (game_data['home_color'], game_data['home_gif'] if r['odds'] > .5 else game_data['away_gif'], 1 if game_data['end_of_period'] else 0, game_data['home_ID'], game_data['away_ID'], r['seq'])
         
            out.write("%s\n" % line_out.strip())
            lines_written += 1
            

            play_json = {'pct': pct_complete, 'event_type': r['event_type'], 'odds': "%.03f" % (100.*r['odds']), 'team': r['team'], 'detail': r['detail'], 'ID': len(json_output['plays']), 'gif': "h" if team.upper() in game_data['home_abbreviations'] else "a"}

            html = {'ID': len(htmls), 'game_elapsed': r['game_elapsed'], 'pct_elapsed': float(r['game_elapsed'])/3600., 'play': r['event_type']
            , 'team_gif': game_data['home_gif'] if team.upper() in game_data['home_abbreviations'] else game_data['away_gif']}

            html['since_last'] = ""
            if last_game_elapsed is not None:
                diff = 3600.0 * (pct_complete  - last_game_elapsed)
                if diff > 59:
                    html['since_last'] = "%dm %ds" % (diff/60, diff%60)
                else:
                    html['since_last'] = "%ds" % (diff)


            html['odds_color'] = "#000"
            html['odds'] = r['odds']
            html['odds_str'] = "%.1f%%" % (100.*r['odds'])
            wp_json_input['pts'].append({'x':pct_complete, 'y': min(.999, r['odds']) })

            html['odds_diff'] = "--"
            if last_odds is not None:
                diff = (r['odds']  - last_odds)
                if -.001 < r['odds'] < .001:

                    html['odds_color'] = "#000"
                elif diff > 0:
                    html['odds_diff'] = "+%.1f%%" % (100.0*diff)
                    html['odds_color'] = "#000"
                else:
                    html['odds_diff'] = "%.1f%%" % (100.0*diff)

                    html['odds_color'] = "#F00"

            html['game_state'] = "Tied"
            if abs(game_state) > 0:
                html['game_state'] = "%s %s%d" % (game_data['home_abbreviation'] if game_state > 0 else game_data['away_abbreviation'], "+", abs(game_state))
            html['time_str'] = game_data['time_str']
            play_json['time_str'] = game_data['time_str']
            json_output['plays'].append(play_json)
            htmls.append(html)

            if "GOAL" in r['event_type'].upper() and "GOALIE CHANGE" not in r['event_type'].upper():
                html = {'ID': len(htmls), 'msg1': '%s: %d' % (game_data['home_abbreviation'], home_goals), 'msg2': '%s: %d' % (game_data['away_abbreviation'], away_goals)}
                htmls.append(html)

            last_game_elapsed = pct_complete

            res[i]['home_pre_wp'] = (100.0*r['odds']) if last_odds is None else (100.0*last_odds)
            res[i]['home_post_wp'] = (100.0*r['odds'])
            res[i]['home_wp_change'] = None if None in [res[i]['home_post_wp'] , res[i]['home_pre_wp']] else res[i]['home_post_wp'] - res[i]['home_pre_wp']

            res[i]['away_pre_wp'] = (100.0*(1.0-r['odds'])) if last_odds is None else (100.0*(1.0-last_odds))
            res[i]['away_post_wp'] = (100.0*(1.0-r['odds']))
            res[i]['away_wp_change'] = None if None in [res[i]['away_post_wp'] , res[i]['away_pre_wp']] else res[i]['away_post_wp'] - res[i]['away_pre_wp']

            last_odds = r['odds']
            last_quarter = quarter
            current_odds = r['odds']
            if '--show-goals' in sys.argv and r['event_type'].endswith("Goal"):
                print ("\t\t", r['game_elapsed'], r['detail'], "Q%s" % r['quarter'])
        if out is not None: out.close()
        
        process_step['points'].append({'txt': "Wrote %d lines to game csv file" % lines_written})
        
        if html is not None and 'time_str' in html and html['time_str'] is not None:
            process_step['points'].append({'txt': "Last timestamp: %s" % (html['time_str'])})
        else:
            process_step['points'].append({'txt': "No last timestamp"})
        
        game_data['game_state'] = game_state
        game_data['home_score'] = home_goals
        game_data['away_score'] = away_goals
        
        wp_json_input['home_odds'] = last_odds if last_odds is not None else game_data['pregame_home_wp']
        
        if game_data['league'] in ['NCAA D1 Men', 'NCAA D1 Women'] or datetime.now().strftime("%Y%m%d") == "20230203":
            data, game_data = build_WP_JSON(data, game_data, wp_json_input)
        
        json_output['score'] = {'home': home_goals, 'away': away_goals}
        process_step['points'].append({'txt': "Score: {}-{}..." .format (game_data['home_score'], game_data['away_score'])})
        
        json_home_abbreviation = game_data['home_team'].upper() if game_data['home_team'] is not None and all_chars(game_data['home_team']) else game_data['short_code_home']
        json_away_abbreviation = game_data['away_team'].upper() if game_data['away_team'] is not None and all_chars(game_data['away_team']) else game_data['short_code_away']
        
        json_output['abbreviations'] = {'home': json_home_abbreviation, 'away': json_away_abbreviation}
        json_output['display_names'] = {'home': game_data['display_home'], 'away': game_data['display_away']}
        json_output['team_urls'] = {'home': game_data['home_url'], 'away': game_data['away_url']}



        rando = int(time.time())
        if game_data['home_score'] == game_data['away_score']:
            if rando % 3 == 0:
                score_description = " %s and %s are knotted at %d." % (game_data['display_home'], game_data['display_away'], game_data['home_score'])
            elif rando % 3 == 1:
                score_description = " Tie game %d-%d between %s and %s." % (game_data['home_score'], game_data['away_score'], game_data['display_home'], game_data['display_away'])
            elif rando % 3 == 2:
                score_description = " %s and %s are all tied at %d." % (game_data['display_home'], game_data['display_away'], game_data['home_score'])

        elif game_data['home_score'] > game_data['away_score']:
            if rando % 2 == 0:
                score_description = " %s is up %d-%d over %s." % (game_data['display_home'], game_data['home_score'], game_data['away_score'], game_data['display_away'])
            elif rando % 2 == 1:
                score_description = " %s leads %d-%d over %s." % (game_data['display_home'], game_data['home_score'], game_data['away_score'], game_data['display_away'])
        elif game_data['home_score'] < game_data['away_score']:
            score_description = " %s is up %d-%d over %s." % (game_data['display_away'], game_data['away_score'], game_data['home_score'], game_data['display_home'])

        if '--show-plays' in sys.argv or '--show-score' in sys.argv:
            print ("{:<40}{:<40} Loop {}" .format ("%s %d" % (game_data['display_away'], game_data['away_score']), "%s %d" % (game_data['display_home'], game_data['home_score']), "%d" % game_data['loops']))
            #print ("Last quarter: %s" % last_quarter)
            #print ("Away by quarter")
            #print (game_data['away_score_by_quarter'])
            #print ("Home by quarter")
            #print (game_data['home_score_by_quarter'])
            print ("  {:<40}{}{:>10}".format(  game_data['display_away'], "".join(["{:>5}".format(z) for z in game_data['away_score_by_quarter'][0:max(last_quarter+1,4)]]), game_data['away_score']))
            print ("  {:<40}{}{:>10}\n".format(game_data['display_home'], "".join(["{:>5}".format(z) for z in game_data['home_score_by_quarter'][0:max(last_quarter+1,4)]]), game_data['home_score']))


        odds_str = None
        if current_odds is not None:
            

            odds_str = "<span class='dtop'>%s Win Prob: %.1f%%</span>"% (game_data['display_home'], 100.0*current_odds)
            odds_str += "<span class='mob'>%s WP: %.1f%%</span>" % (game_data['short_code_home'], 100.0*current_odds)

        # Get the top stars
        stars_content = None
        game_object = None
        last_play_content = ""
        game_dict = None

        if os.path.isfile(os.path.join(lr_fldr, "LiveWinOdds", "%s.csv" % game_data['game_file'])):
            data, game_object, game_dict = create_game_object(game_data, data, os.path.join(lr_fldr, "LiveWinOdds", "%s.csv" % game_data['game_file']))
           

            
            steps_log = None
            if 'steps' in game_dict and game_dict['steps'] is not None:
                try:
                    steps_log = "Laxref.create_game_dict.steps\n"
                    #if '--test-steps-log' in sys.argv:
                    #    print ("Found %d steps" % (len(game_dict['steps'])))
                    #    print ("{:<60}{:<20}{:<10}".format("Step", "Time", "Elapsed"); print ("-"*90))
                    for i, s in enumerate(game_dict['steps']):
                        if i > 0:
                            s['elapsed'] = s['time'] - game_dict['steps'][i-1]['time']
                            s['elapsed_str'] = "%.2fs" % (s['elapsed'])
                        else:
                            s['elapsed_str'] = ""
                        #if '--test-steps-log' in sys.argv:
                        #    print ("{:<60}{:<20.0f}{:<10}".format(s['step'], s['time'], s['elapsed_str']))
                    steps_log += "\n".join(["%s: %s" % (z['step'], z['elapsed_str']) for z in game_dict['steps']])
                    
                    process_step['points'].append({'txt': steps_log})
                    
                except Exception:
                    print (traceback.format_exc())
                    error_msg = "Trying to process the steps list from create_game_dict and an error occurred in %s" % game_data['description']
                    error_msg_detail = "Trying to process the steps list from create_game_dict and an error occurred in %s\n\n%s" % (game_data['description'], traceback.format_exc())
                    if error_msg not in data['telegram_messages']: zc.send_telegram(error_msg_detail, bot_token); data['telegram_messages'].append(error_msg)
            

            
            process_step['points'].append({'txt': "Created game object/game dict successfully."})
            if '--test-rapid' in sys.argv:
                game_data = rapid_upload(game_data, data)
                zc.exit("rapid upload complete")
            
            # Check that at least the game has been processed once
            if not UPLOAD_TO_LRP_AT_END_ONLY:
                start_rapid_upload_ms = time.time()
                game_data = rapid_upload(game_data, data, game_dict) 
                end_rapid_upload_ms = time.time()
                rapid_upload_ms = end_rapid_upload_ms - start_rapid_upload_ms
                if game_data['parse_plays_n'] == 0 and '--use-db-plays' not in sys.argv:
                    msg = "In %s, the rapid_upload function took %.2fs on the first game loop." % (game_data['description'], rapid_upload_ms)
                    print (msg)
                    #zc.send_telegram(msg, bot_token)
                
            if game_dict is None:
                game_data['processing_log']['steps'].append(process_step)
                print ("Game Dict was None in %s" % (game_data['description']))
                return game_data
            else:
                
                process_step['points'].append({'txt': "Created game object/game dict successfully."})
            last_play_content = get_last_play_html(game_dict, game_data)
            
        json_output['last_play_content'] = last_play_content    

        if '--ignore-top-stars' not in sys.argv and game_object is not None and 'stars' in game_object:

            box_score_content = ""
            stars = game_object['stars']
            json_output['box_score'] = game_object['stars']


            #print ("stars\n------------")
            #zc.print_dict(stars[0:4])
            if stars is not None:
                stars = sorted(stars, key=lambda x:x['goals_added'], reverse=True)


                for star in stars:
                    star['home'] = 1 if star['team'] == game_data['confirmed_home_team'] else 0

                away_stars = [{'player': z['player'], 'goals_added': z['goals_added'], 'goals_added_by_quarter': z['goals_added_by_quarter']} for z in [y for y in stars if not y['home']][0:3]]
                home_stars = [{'player': z['player'], 'goals_added': z['goals_added'], 'goals_added_by_quarter': z['goals_added_by_quarter']} for z in [y for y in stars if y['home']][0:3]]

                box_score_content = generate_box_score(stars, game_data)
                game_data['reddit_summary'] = generate_reddit_summary(game_data, stars)


            ega_string = "~".join([("%s***" % (team['ID'])) + "|".join(["%s=%s" % (y['player'], y['EGA']) for y in team['players']]) for team in [game_dict['home_team'], game_dict['away_team']]])

            game_data['pct_complete'] = pct_complete
            
            """
            if datetime.now().strftime("%Y%m%d") == "20240319":
                query = "Update LaxRef_Active_Live_WP_Games set machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s where game_ID=%s"
                param = [game_data['machine'], game_data['home_score'], game_data['away_score'], score_description, current_odds, game_data['ID']]
            
            else:
                query = "Update LaxRef_Active_Live_WP_Games set last_update=%s, machine=%s, plays_uploaded=%s, pct_complete=%s, ega_string=%s, home_score=%s, away_score=%s, score_description=%s, reddit_summary=%s, last_update=%s, home_probability=%s where game_ID=%s"
                param = [time.time(), game_data['machine'], len(game_data['plays_captured']), pct_complete, ega_string, game_data['home_score'], game_data['away_score'], score_description, game_data['reddit_summary'], time.time(), current_odds, game_data['ID']]
                #query_log_f = open(os.path.join(lr_fldr, 'Logs', 'plays_upload_query.log'), 'a')
                #query_log_f.write("\n\n%s\n%s w/ %s" % (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), query, param))
                #query_log_f.close()
            
            #print("Query %s w/ %s" % (query, param))

            try:
                
                update_laxref_db(query, param, {'game_ID': game_data['ID']})
                game_data['queued_queries'].append({"query": query, 'param': param})
            except Exception:
                msg = "DB Fail: game ID %d (%s)\n\nFailed to update LaxRef_Active_Live_WP_Games table with loop stats." % (game_data['ID'], game_data['description'])
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            """ 
            

        # Get the shareable tweet ready
        if current_odds in [None, '']:
            tweet_msg = "#LaxWP win probability engine is live for %s vs %s." % (game_data['home_twitter'], game_data['away_twitter'])
        else:
            if game_data['game_over']:
                if current_odds >= .5:
                    tweet_msg = "It's over, %s beat %s %d-%d.  Check out the #LaxWP win probability chart." % (game_data['home_twitter'], game_data['away_twitter'], home_goals, away_goals)
                else:
                    tweet_msg = "It's over, %s beat %s %d-%d.  Check out the #LaxWP win probability chart." % (game_data['away_twitter'], game_data['home_twitter'], away_goals, home_goals)
            else:
                if current_odds >= .5:
                    tweet_msg = "According to #LaxWP, %s currently has a %.1f%% win probability against %s" % (game_data['home_twitter'], 100.0*current_odds, game_data['away_twitter'])
                else:
                    tweet_msg = "According to #LaxWP, %s currently has a %.1f%% win probability against %s" % (game_data['away_twitter'], 100.0*(1.0-current_odds), game_data['home_twitter'])

        
        process_step['points'].append({'txt': "Tweet Msg: {}" .format (tweet_msg)})
        url = "https://lacrossereference.com/game-win-probabilities/%s/?utm_source=Social" % game_data['game_file']
        try:
            if True:
                adj_url = url
            else:
                adj_url = zc.goo_shorten_url(url)
                if adj_url is not None:
                    url = adj_url
        except Exception:
            adj_url = url
        tweet_content = '[easy-tweet tweet="%s" user="laxreference" url="%s" template="light"]' % (tweet_msg, adj_url)


        show_change = False

        
        

        
        json_output['game_over'] = game_data['db_game_over']
        

        json_output['team_IDs'] = {'home': game_data['home_ID'], 'away': game_data['away_ID']}

        json_output['possessions'] = None
        
        if game_dict is not None and 'possessions' in game_dict and game_dict['possessions'] is not None:
            json_output['possessions'] = [{'sttime': z['start_time'], 'dur': z['duration'], 'ts': laxref.convert_pct_complete_to_time_str(float(z['start_time'])/3600., game_data['game_date'].year, game_data['league_obj']['name']), 'team_ID': z['team_ID'], 'sh': z['total_shots'], 'end': z['ended_with'], 'sog': z['shots_on_goal'], 's_home_odds': z['team_odds'] if z['team_ID'] == json_output['team_IDs']['away'] else (1. - z['team_odds']), 'goal': z['goal_scored'], 'f': ''} for z in game_dict['possessions']]
            
            for i, p in enumerate(json_output['possessions']):
                next_pos = None
                if i < len(json_output['possessions'])-1:
                    next_pos = json_output['possessions'][i+1]
                    p['e_home_odds'] = next_pos['s_home_odds']
                else:
                    p['e_home_odds'] = 1. - current_odds




        print ("  Create recap content...")
        if game_object is not None and 'stat_summaries' in game_dict:
            recap_content, recap_json = create_recap_HTML(game_dict, game_data)
            json_output['recap'] = recap_json
            json_output['recap']['recap-paragraph'] = laxref.add_player_and_team_links(escape_script_tags(game_data['recap-paragraph']))
        else:
            json_output['recap'] = {'recap-paragraph': laxref.add_player_and_team_links(escape_script_tags(game_data['recap-paragraph']))}
        
        if json_output['recap']['recap-paragraph'] not in ['', None]:
            json_output['recap']['recap-paragraph'] = json_output['recap']['recap-paragraph'].replace("[tracking_tag]", "Ck7939Aikwiualz")

        
        set_to_live_flag = 0
        ## Add the script that switches the game to recap mode
        lr_queries = []; lr_params = []
        
        if len(res) > 0:
            try:
                """
                query = "Update LaxRef_Active_Live_WP_Games set machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s where game_ID=%s"
                param = [game_data['machine'], game_data['home_score'], game_data['away_score'], score_description, current_odds, game_data['ID']]
            
                """
                
                #cursor = zc.zcursor("LR")
                if game_data['parse_plays_n'] > 0:
                    if game_object['errors_found']:
                        # There were errors found during processing, so do not clear the error fields
                        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, bad_play_type_error=NULL, last_update=%s, n_full_parse=%s, avg_parse_time=%s, plays_uploaded=%s, pct_complete=%s, machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s where game_ID=%s"
                        param = [time.time(), game_data['parse_plays_n'], game_data['total_parse_plays_elapsed'] / game_data['parse_plays_n'], lines_written, pct_complete, game_data['machine'], game_data['home_score'], game_data['away_score'], score_description, current_odds, game_data['ID']]
                    else:
                        # If no errors were found in creating the game dict, we are safe to clear the full_error_dict
                        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=CASE WHEN IFNULL(unidentified_players_error,'')='' THEN 0 ELSE 1 END, full_error_dict=NULL, bad_play_type_error=NULL, last_update=%s, n_full_parse=%s, avg_parse_time=%s, plays_uploaded=%s, pct_complete=%s, machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s where game_ID=%s"
                        param = [time.time(), game_data['parse_plays_n'], game_data['total_parse_plays_elapsed'] / game_data['parse_plays_n'], lines_written, pct_complete, game_data['machine'], game_data['home_score'], game_data['away_score'], score_description, current_odds, game_data['ID']]
                else:
                    if game_object['errors_found']:
                        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, bad_play_type_error=NULL, last_update=%s, plays_uploaded=%s, pct_complete=%s, machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s  where game_ID=%s"
                    else:
                        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=CASE WHEN IFNULL(unidentified_players_error,'')='' THEN 0 ELSE 1 END, full_error_dict=NULL, bad_play_type_error=NULL, last_update=%s, plays_uploaded=%s, pct_complete=%s, machine=%s, home_score=%s, away_score=%s, score_description=%s, home_probability=%s where game_ID=%s"
                    param = [time.time(), lines_written, pct_complete, game_data['machine'], game_data['home_score'], game_data['away_score'], score_description, current_odds, game_data['ID']]
                #query_log_f = open(os.path.join(lr_fldr, 'Logs', 'plays_upload_query.log'), 'a')
                #query_log_f.write("\n\n%s\n%s w/ %s" % (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), query, param))
                #query_log_f.close()
                lr_queries.append(query); lr_params.append(param)
                #cursor.execute(query, param); cursor.commit()
                
                if "complete" not in game_data['status'] and game_data['status'] != 'pending':
                    #query = "UPDATE LaxRef_Games set status='live' where ID=%s and status not like 'complete%%' "
                    #param = [game_data['ID']]
                    set_to_live_flag = 1
                    #lr_queries.append(query); lr_params.append(param)
                
                #cursor.execute(query, param); cursor.commit()
                #cursor.close()
            except Exception:
                msg = "DB Fail: game ID %d (%s)\n\n.Unable to update LaxRef_Active_Live_WP_Games and LaxRef_Games in parse_plays." % (game_data['ID'], game_data['description'])
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                process_step['points'].append({'txt': msg})
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                


        f = open(out_path_json, 'w'); f.write(json.dumps(json_output)); f.close()
        if '--no-upload' not in sys.argv and lines_written > 0:
            
            if UPLOAD_IN_THIS_SCRIPT:
                if 'recap' in json_output and json_output['recap'] is not None and 'compare_teams' in json_output['recap']:
                    creds = [{'username': z.split("|")[0], 'password': z.split("|")[1], 'url': z.split("|")[2]} for z in filter(None, open(os.path.join(lr_fldr, 'Logs', 'ftp_creds'), 'r').read().split("\n"))]
                    #zc.print_dict(creds)
                    #print ("   Creating FTP object...")
                    try:
                        ftp = FTP(creds[0]['url'], timeout=30)
                    except Exception:
                        print ("   FTP Creation failed")
                        msg = "In live_win_odds.py, we could not create an FTP connection for the %s game!" % game_data['description']
                        zc.send_telegram(msg, bot_token)
                        process_step['points'].append({'txt': msg})
                    #print ("   Logging in...")
                    ftp.login(creds[0]['username'], creds[0]['password'])
                    #print ("   Move to right folder...")
                    ftp.cwd('/wp-content/uploads/WinProbabilityGameData')
                    print ("   Upload file...")
                    fname = out_path_json; loc = game_data['game_file'] + ".json"
                    #print ("   Send %s to %s" % (fname, loc))

                    ftp.storbinary('STOR ' + loc, open(fname, 'rb'))
                    print ("   Close connection...")
                    ftp.quit()
                    process_step['points'].append({'txt': "Game file written to LR Public."})
                else:
                    process_step['points'].append({'txt': "Game file not written to LR Public because json_output didn't contain compare_teams."})
            else:
                data = log_updated_file(data, out_path_json)
                
            if game_data['db_game_over'] and not game_data['finalized']: 
                #msg = "In game ID %d, db_game_over=1 and finalized=0\n" % game_data['ID']
                game_data['finalized'] = 1
                #msg += "Set finalized=1...\n"
                if '--use-db-plays' not in sys.argv:
                    browser.switch_to.window(game_data['window_handle'])
                    
                    # It's ok to close because we have other windows open, otherwise, keep it open, just make it google.com
                    if len(browser.window_handles) > 1:
                        
                        process_step['points'].append({'txt': "Game browser window closed.."})
                        browser.close()
                    else:
                        browser.get('https://google.com')
                        
                    #msg += "Close browser tab...\n"
                #print (msg); zc.send_telegram(msg, bot_token)
            if set_to_live_flag:
                game_query = "UPDATE LaxRef_Games set status=CASE WHEN IFNULL(status,'') not like 'complete%%' and status !='pending' THEN 'live' ELSE status END, last_LR_upload=%s where ID=%s"   
                game_param = [zc.to_utc(datetime.now()), game_data['ID']]
            
            else:
                game_query = "UPDATE LaxRef_Games set last_LR_upload=%s where ID=%s"   
                game_param = [zc.to_utc(datetime.now()), game_data['ID']]
            lr_queries.append(game_query); lr_params.append(game_param)
            process_step['points'].append({'txt': "Set last_LR_upload to %s.." % zc.to_utc(datetime.now()).strftime("%Y-%m-%d %H:%M")})


        if len(lr_queries) > 0:
            cursor = zc.zcursor("LR")
            for ija, (query, param) in enumerate(zip(lr_queries, lr_params)):
                print ("Query %s w/ %s" % (query, param))
                #cursor.execute(query, param)
                update_laxref_db(query, param, {'queued_queries': None if 'queued_queries' not in game_data else game_data['queued_queries'], 'game_ID': game_data['ID'], 'commentary': None if ija < len(lr_queries) - 1 else "Done with fn.parse_plays"}, cursor)
                game_data['queued_queries'] = []
            cursor.commit()
            cursor.close()
        
        game_data['plays_captured'] = res
        if '--send-emails' in sys.argv: 
            game_data = generate_post_game_email(game_data, data)
        if '--print-upload-command':
            print ("\n\n%s\n\n" % get_upload_command(game_data, data))
    game_data['processing_log']['steps'].append(process_step)
    
    game_data['last_parse_process_step'] = process_step
    if '--print-parse-plays-debug' in sys.argv:
        zc.print_dict(process_step)

    parse_plays_end_time = time.time()
    parse_plays_elapsed_time = parse_plays_end_time - parse_plays_start_time
    game_data['parse_plays_n'] += 1.
    game_data['total_parse_plays_elapsed'] += parse_plays_elapsed_time
    game_data['time_per_parse_plays_run'] = game_data['total_parse_plays_elapsed'] / game_data['parse_plays_n']
    
    game_data = log_parse_plays_loop(data, game_data)
    
    
    return game_data

def log_parse_plays_loop(data, game_data):
    """
    Every time parse plays is triggered, we should log the loop so that we have a record of how often each game was being updated on the various servers. For example, this would be helpful in proving to lax_dot_com that updates occurred at least every 5 minutes.
    """
    
    try:
        # Fields
        # ParsePlaysN/Seq - number of times parse plays was run
        # Datestamp
        # plays parsed
        # clock time
        # loops since last parse
        rec = "%s|%s|%s|%s\n".format (
        "N/A" if 'parse_plays_n' not in game_data or game_data['parse_plays_n'] is None else game_data['parse_plays_n']
        , datetime.now().strftime("%Y%m%d%H%M%S")
        , "N/A" if 'num_plays' not in game_data or game_data['num_plays'] is None else game_data['num_plays']
        , "N/A" if 'time_str' not in game_data or game_data['time_str'] is None else game_data['time_str']
        , "N/A" if 'loops_since_last_parse' not in game_data or game_data['loops_since_last_parse'] is None else game_data['loops_since_last_parse']
        
        )
        
        f = open(game_data['loop_log_src'], 'a'); f.write(rec); f.close()
        
    except Exception:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)
        
    return game_data
    
def all_chars(s):
    res = True
    if len([1 for z in s.upper() if not (91 > ord(z) >= 65) ]) > 0:
        res = False
    return res
        
def escape_script_tags(unsafe_str):   
    """
    This function takes in a string (from JS) that has characters that will prevent it from being parsed correctly by the JS parsers. It removes those tags, which are they re-added just before printing to the screen in the target JS file.
    """
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
    return unsafe_str.replace('</script>', "<' z '/script>")

     
def create_statistical_nuggets(g):
    nuggets = ""
    if len(g['possessions']) < 4:
        return nuggets

    teams = list(set([z['team'] for z in g['possessions']]))
    if len(teams) < 2:
        return nuggets

    team0_poss = [z for z in g['possessions'] if z['team'] == teams[0] and None not in [z['end_time'] , z['start_time']]]
    team1_poss = [z for z in g['possessions'] if z['team'] == teams[1] and None not in [z['end_time'] , z['start_time']]]
    if len(team0_poss) < 1 or len(team1_poss) < 1:
        return nuggets

    nuggets += "\nAvg possession length: %d sec" % ztc_mean([z['end_time'] - z['start_time'] for z in g['possessions'] if None not in [z['end_time'] , z['start_time']]])
    nuggets += ", Avg length for %s: %d (season avg: %d)" % (teams[0], ztc_mean([z['end_time'] - z['start_time'] for z in g['possessions'] if z['team'] == teams[0] and None not in [z['end_time'] , z['start_time']]]), game_data['away_avg_pace'] if teams[0] == game_data['confirmed_away_team'] else game_data['home_avg_pace'])
    nuggets += ", Avg length for %s: %d (season avg: %d)" % (teams[1], ztc_mean([z['end_time'] - z['start_time'] for z in g['possessions'] if z['team'] == teams[1] and None not in [z['end_time'] , z['start_time']]]), game_data['away_avg_pace'] if teams[1] == game_data['confirmed_away_team'] else game_data['home_avg_pace'])
    lengths = [(0,30), (30, 60) ,(60, 10000)]
    for t in teams:
        nuggets += "\n Poss by Length for %s: " % (t)
        tmp = []
        for l in lengths:
            tmp.append(len([1 for z in g['possessions'] if z['team'] == t and None not in [z['end_time'] , z['start_time']] and l[0] < (z['end_time'] - z['start_time']) <= l[1]]))
        nuggets += " - ".join(map(str, tmp))


    return nuggets

def generate_reddit_summary(game_data, stars):
    url = "https://lacrossereference.com/game-win-probabilities/%s/?utm_source=Social&utm_content=09fpmalqcynrpa" % game_data['game_file']

    msgs = []
    away_stars = [{'player': z['player'], 'goals_added': z['goals_added']} for z in [y for y in stars if y['team_ID'] == game_data['away_ID']][0:3]]
    home_stars = [{'player': z['player'], 'goals_added': z['goals_added']} for z in [y for y in stars if y['team_ID'] == game_data['home_ID']][0:3]]
    winner = game_data['display_away'] if game_data['away_score'] > game_data['home_score'] else game_data['display_home']
    winner_stars = away_stars if game_data['away_score'] > game_data['home_score'] else home_stars
    winner_goals = game_data['away_score'] if game_data['away_score'] > game_data['home_score'] else game_data['home_score']
    loser = game_data['display_away'] if game_data['away_score'] <= game_data['home_score'] else game_data['display_home']
    loser_stars = away_stars if game_data['away_score'] <= game_data['home_score'] else home_stars
    loser_goals = game_data['away_score'] if game_data['away_score'] <= game_data['home_score'] else game_data['home_score']

    tied = False if game_data['away_score'] != game_data['home_score'] else True
    if len(away_stars) >= 3 and len(home_stars) >= 3:


        msg = "Here is the [win probability recap page](%s) for this one.\n\n%s led the way for %s with %.2f expected goals added.  %s put up the top stat line for %s with %.2f." % (

        url
        , winner_stars[0]['player'].title()
        , winner
        , winner_stars[0]['goals_added']
        , loser_stars[0]['player'].title()
        , loser
        , loser_stars[0]['goals_added']
        )

        msgs.append(msg)

        msg = "Here is the [win probability recap page](%s) for the %s victory.\n\nTop stars (by expected goals added) for %s:\n\n%s\n\nTop stars for %s:\n\n%s" % (

        url
        , winner
        , "**%s**" % winner
        , "\n".join(["* %s - %.2f%s" % (z['player'].title(), z['goals_added'], " EGA" if i == 0 else "") for i, z in enumerate(winner_stars)])
        , "**%s**" % loser
        , "\n".join(["* %s - %.2f" % (z['player'].title(), z['goals_added']) for z in loser_stars])
        )

        msgs.append(msg)
    return "|".join(msgs)

non_names = ['TEAM', 'TM', 'OWN GOAL']

def create_game_object(game_data, data, src_file):
    game_object = {'errors_found': 0}

    started = time.time()
    play_data = [[y.replace("<br />", ",") for y in z.split(",")] for z in filter(None, open(src_file, 'r').read().split("\n"))]

    #print ("\n\nAbbreviations")
    abbrevs = "Home: %s" % (", ".join(sorted(game_data['home_abbreviations'])))
    #print ("{:<30}{}".format("Home Team: %s" % game_data['home_team'], abbrevs))
    abbrevs = "Away: %s" % (", ".join(sorted(game_data['away_abbreviations'])))
    #print ("{:<30}{}".format("Away Team: %s" % game_data['away_team'], abbrevs))
    
    

    
    game = laxref.create_game_dict(None, None, play_data, game_data, False)
    
    # Apr 2024, if the timestamps were not being entered correctly, then for some reason, the list of possessions was somehow incomplete and therefore the number of turnovers was incomplete. I don't really understand the issue fully, but the total number of possessions was still correct. As a result, we can't rely on the initial turnover counts, so we are going to recalculate them based on the player turnovers.
    team_tags = ["home", "away"]
    for team_tag in team_tags:
        s = {'team_ID': game['%s_team' % team_tag]['ID']}
        player_summaries = [z for z in game['player_summaries'] if z['team_ID'] == s['team_ID']]
        total_turnovers = sum([z['tos'] for z in player_summaries])
        #print ("\n\n{}: {} reported turnovers".format(team_tag, game['stat_summaries']['%s_turnovers' % (team_tag)]['val']))
        #print ("{}: {} actual turnovers".format(team_tag, total_turnovers))
        #print ("{}: {} failed clears".format(team_tag, game['stat_summaries']['%s_failed_clears' % (team_tag)]['val']))
        #print ("{}: {} possessions".format(team_tag, game['stat_summaries']['%s_possessions' % (team_tag)]['val']))
        #print ("{}: {} reported turnover rate".format(team_tag, game['stat_summaries']['%s_turnover_rate' % (team_tag)]['val']))
        #print ("{}: {} actual turnover rate".format(team_tag, (total_turnovers - game['stat_summaries']['%s_failed_clears' % (team_tag)]['val'])/game['stat_summaries']['%s_possessions' % (team_tag)]['val']))
        game['stat_summaries']['%s_turnovers' % (team_tag)]['val'] = total_turnovers - game['stat_summaries']['%s_failed_clears' % (team_tag)]['val']
        game['stat_summaries']['%s_turnover_rate' % (team_tag)]['val'] = game['stat_summaries']['%s_turnovers' % (team_tag)]['val']/game['stat_summaries']['%s_possessions' % (team_tag)]['val']   
    
    EXPORT_ERRORS=1

    error_msg = 'Not Found'; full_error_dict = None
    game_data['create_game_dict_errors'] = []
    if EXPORT_ERRORS:
        it_failed = 1 if 'success' not in game or not game['success'] else 0
        
        if it_failed and 'errors' in game:
            full_error_dict = json.dumps(game['errors'], default=zc.json_handler, indent=2)
            game_data['create_game_dict_errors'] = game['errors']
            error_msg = "\n".join([z['text'] for z in game['errors']])
            
    else:
        it_failed = game is None
        if it_failed:
            full_error_dict = "None recorded"
    
    if it_failed:
        game_object['errors_found'] = 1
        print ("\n\n%s FAIL!!!!!!!!!!!!!1\n\n" % game_data['description'])
        game_data['skip'] = 1
        if '--use-db-plays' in sys.argv:
            msg = "Because we could not create a game object for %s, we are going to exit the script\n\nError: %s" % (game_data['description'], error_msg)
            zc.send_telegram(msg, bot_token); zc.exit("GAME OBJECT FAIL")
            
        queries = []
        params = []
        
        
        msg = "laxref.create_game_dict returned None in game ID %d (Use the tags and keys in the error dict to update LaxRef_Active_Live_WP_Games with more specific error tags)\n\nError: %s\n\nFull Error Obj:\n\n%s\n\n%s" % (game_data['ID'], error_msg, json.dumps(game_data['create_game_dict_errors'], default=zc.json_handler, indent=2), game_data['admin_cockpit_url'])
        
        # If we have already notified admins of this error, they may have already resolved it and we don't need to keep setting skip=1 every time; this way it just happens once
        full_msg = msg
        if msg not in data['telegram_messages']: 
            query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, skip=1, full_error_dict=%s where game_ID=%s" 

            param = [full_error_dict, game_data['ID']]
            queries.append(query); params.append(param)
            full_msg += "\nQuery %s w/ %s" % (query, param)
        
        if msg not in data['telegram_messages']: telegram_alert(full_msg); data['telegram_messages'].append(msg)
        
        
        try:
            cursor = zc.zcursor("LR")
            for query, param in zip(queries, params):
                print ("Query %s w/ %s" % (query, param))
                cursor.execute(query, param)
            cursor.commit(); cursor.close()
        except Exception:
            msg = "DB Fail: game ID %d (%s) couldn't set skip because of a bad game_object\n\n.UPDATE LaxRef_Active_Live_WP_Games set skip=1 where game_ID=%s" % (game_data['ID'], game_data['description'], game_data['ID'])
            msg += "\n\n%s" % traceback.format_exc()
            print (msg)
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
        return data, game_object, game

    game_object['plays'] = game['plays']

    objects = ['player'] + ['player%d' % z for z in range(1,4)]

    raw_stars = []; game_data['unidentified_players'] = []; 
    stars_start = time.time()
    for j, team in enumerate([game['home_team'], game['away_team']]):

        if j == 0:
            tmp_roster = game_data['home_roster']
            
        else:
            tmp_roster = game_data['away_roster']
            
        #zc.print_dict(tmp_roster[0:5])
        lookup_tmp_confirmed_home = game['home_team']['confirmed_team'].upper() if game['home_team']['confirmed_team'] is not None else "[NONE]"
        lookup_tmp_confirmed_away = game['away_team']['confirmed_team'].upper() if game['away_team']['confirmed_team'] is not None else "[NONE]"
        lookup_tmp_alt_home_team = game['alt_home_team'].upper() if game['alt_home_team'] is not None else "[NONE]"
        lookup_tmp_alt_away_team = game['alt_away_team'].upper() if game['alt_away_team'] is not None else "[NONE]"
        lookup_tmp_home_team_name = game['home_team_name'].upper() if game['home_team_name'] is not None else "[NONE]"
        lookup_tmp_away_team_name = game['away_team_name'].upper() if game['away_team_name'] is not None else "[NONE]"
        tmp_star_players = [z for z in team['players'] if z['player'].upper() not in [lookup_tmp_confirmed_home, lookup_tmp_confirmed_away, lookup_tmp_alt_home_team, lookup_tmp_alt_away_team, lookup_tmp_home_team_name, lookup_tmp_away_team_name]]
        
        total_cnt = 0.
        for player in tmp_star_players:
            total_cnt += sum([1. for z in player['play_log']])
            
        star_2_char_name_regex = re.compile(r'[0-9][A-Z]')
        for player in tmp_star_players:
            star = {}
            #zc.print_dict(player)
            star['goals_added_by_quarter'] = player['EGA_by_quarter'][0:3]+[sum(player['EGA_by_quarter'][3:])]
            star['assists'] = len([1 for z in player['play_log'] if z['play_type'] == "Assist"])
            star['shots'] = len([1 for z in player['play_log'] if z['play_type'].endswith("Goal") or z['play_type'].endswith("Shot")])
            star['goals'] = len([1 for z in player['play_log'] if z['play_type'].endswith("Goal")])
            star['saves'] = len([1 for z in player['play_log'] if z['play_type'] == "Save"])
            star['gbs'] = len([1 for z in player['play_log'] if z['play_type'] == "Ground Ball"])
            star['tos'] = len([1 for z in player['play_log'] if z['play_type'].endswith("Turnover")and z['play_type'] != "Caused Turnover"])
            star['ct'] = len([1 for z in player['play_log'] if z['play_type'] == "Caused Turnover"])
            star['fo'] = len([1 for z in player['play_log'] if z['play_type'].endswith("Faceoff Win")])
            star['fo_taken'] = len([1 for z in player['play_log'] if z['play_type'].startswith("Faceoff")])
            star['cnt'] = sum([1. for z in player['play_log']])
            star['team_play_shares'] = star['cnt'] / total_cnt if total_cnt > 0 else None
            star['goals_added'] = player['EGA']
            star['goals_allowed'] = player['goals_allowed']
            star['uaEGA'] = None
            if star['team_play_shares'] is not None and star['team_play_shares'] > 0:
                star['uaEGA'] = star['goals_added'] / star['team_play_shares'] * .05
            star['player'] = player['player']
            player_hash = laxref.hash_player_name(player['player'])
            
            #print ("{:<40}{:<40}{:<10}{:<20}".format(player['player'], player_hash, player_hash in [z['hash'] for z in tmp_roster], "roster n=%d" % len(tmp_roster)))
            star['ID'] = None; star['laxdotcom_ID'] = None; star['hash_str'] = None
            star['pro_url_tag'] = None
            star_name_tokens = star['player'].split(" ")
            n_star_name_tokens = len(star_name_tokens)
            
            if player_hash in [z['hash'] for z in tmp_roster]:
                tmp = tmp_roster[ [z['hash'] for z in tmp_roster].index(player_hash) ]
                star['pro_url_tag'] = tmp['pro_url_tag']
                star['ID'] = tmp['player_ID']
                star['laxdotcom_ID'] = tmp['laxdotcom_ID']
                #print ("A) Found %s in tmp_rosters (ID=%d)" % (player['player'], star['ID']))
            elif n_star_name_tokens == 1 and len([1 for z in tmp_roster if star['player'].upper().strip() == z['last_name']]) == 1:
                tmp = [z for z in tmp_roster if star['player'].upper().strip() == z['last_name']][0]
                star['pro_url_tag'] = tmp['pro_url_tag']
                star['ID'] = tmp['player_ID']
                star['laxdotcom_ID'] = tmp['laxdotcom_ID']
                
            elif len([1 for z in tmp_roster if player_hash in z['alternate_names']]):
                tmp = [z for z in tmp_roster if player_hash in z['alternate_names']][0]
                star['pro_url_tag'] = tmp['pro_url_tag']
                star['ID'] = tmp['player_ID']
                star['laxdotcom_ID'] = tmp['laxdotcom_ID']
                #print ("A-prime) Found %s in tmp_rosters alternate_names (ID=%d)" % (player['player'], star['ID']))
            elif player_hash in [z['player_hash'] for z in data['db_players']]:
                tmp = data['db_players'][ [z['player_hash'] for z in data['db_players']].index(player_hash) ]
                star['pro_url_tag'] = tmp['pro_url_tag']
                star['laxdotcom_ID'] = tmp['laxdotcom_ID']
                star['ID'] = tmp['ID']
                #print ("B) Found %s in db_players (ID=%d)" % (player['player'], star['ID']))
            if star['ID'] is None:
                if player['player'].upper() not in non_names:
                
                    # Check 1; the star name has at least one ascii character
                    n_ascii_characters = len([1 for z in player['player'].upper() if 65 <= ord(z) <= 90])
                    check1 = n_ascii_characters > 0
                    
                    # Check 2: the name is not just a number, then a letter (i.e. a mis-key; these are always resolved by the SID in real-time)
                    # so check that it's more than 2 characters OR the star regex doesn't match
                    try:
                        check2 = (len(player['player'].upper()) != 2 or star_2_char_name_regex.search(player['player'].upper()) is None)
                    except Exception:
                        msg = traceback.format_exc()
                        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); telegram_alert(msg); data['telegram_messages'].append(msg)
                        check2 = 1
                        
                    if check1 and check2:
                    
                        print ("C) Did not find %s in tmp_rosters or db_players" % (player['player']))
                        log_src = os.path.join(lr_fldr, "LiveWinOdds", "unidentified_playersLog.log")
                        f = open(log_src, 'w')
                        game_data['unidentified_players'].append({'plyr': player['player'], 'tID': team['ID'], 'msg': "None available"})
                        try:
                            
                            msg = "In %s, did not find %s in tmp_rosters or db_players" % (game_data['description'], player['player'])
                            
                            msg += "\n\nCurrent\n\n%s" % json.dumps(game_data['unidentified_players'], default=zc.json_handler, indent=2)
                            if isinstance(game_data['plays_captured'], str):
                                msg += "\n\nError, plays captured is a string!!!!!!!!!"
                                tmp_plays_data = json.dumps(game_data['plays_captured'], default=zc.json_handler, indent=2)
                                msg += tmp_plays_data
                            else:
                                for tmp_play_obj in game_data['plays_captured']:
                                    tmp_play_obj['first_instance'] = 0
                                    if 'detail' in tmp_play_obj and tmp_play_obj['detail'] is not None and player['player'].lower() in tmp_play_obj['detail'].lower():
                                        tmp_play_obj['first_instance'] = 1
                                        msg += "\n\nThe first instance of this player was found in this detail:\n%s" % (tmp_play_obj['detail'])
                                        break
                                        
                                tmp_plays_data = json.dumps(game_data['plays_captured'], default=zc.json_handler, indent=2)
                                msg += "\n\nPlay Data\n\n%s" % tmp_plays_data
                            
                            
                            if isinstance(game_object['plays'], str):
                                msg += "\n\nError, game_object['plays'] is a string!!!!!!!!!"
                                tmp_plays_data = json.dumps(game_object['plays'], default=zc.json_handler, indent=2)
                                msg += tmp_plays_data
                            else:
                                for tmp_play_obj in game_object['plays']:
                                    tmp_play_obj['first_instance'] = 0
                                    if player['player'] in [tmp_play_obj['player'], tmp_play_obj['player1'], tmp_play_obj['player2'], tmp_play_obj['player3']]:
                                        tmp_play_obj['first_instance'] = 1
                                        tmp_msg = "%s (Regex: %s)" % (tmp_play_obj['details'], tmp_play_obj['regex'])
                                        tmp_msg = tmp_msg.replace("~", "[tilde]").replace("|", "[pipe]").replace("\r\n", "[newline]").replace("\n", "[newline]")
                                        game_data['unidentified_players'][-1]['msg'] = tmp_msg
                                        msg += "\n\nThe first instance of this player was found in this detail:\n%s" % (tmp_play_obj['details'])
                                        break
                                        
                                tmp_plays_data = json.dumps(game_object['plays'], default=zc.json_handler, indent=2)
                                msg += "\n\nGameObject.plays\n\n%s" % tmp_plays_data
                            
                            f.write(msg)
                            
                        except Exception:
                            print (traceback.format_exc())
                            f.write(traceback.format_exc())
                        f.close()
                    else:
                        print ("C') Did not find %s in the player lists, but it's also not a player name" % player['player'])
                
            star['team'] = team['confirmed_team']
            star['team_ID'] = team['ID']
            star['alt_ID'] = star['ID'] if star['ID'] is not None else star['player']
            raw_stars.append(star)
    

    # Since this loop is where players with different names are identified, if there is a player with a wrong name, it'll show up here as a separate raw_star with the same ID
    stars = raw_stars
    """FINISH IMPLEMENTATION
    stars = [{'alt_ID': z} for z in list(set([y['alt_ID'] for y in raw_stars]))]
    """
    
    ended = time.time()
    game_data['n_unidentified_players'] = len(game_data['unidentified_players'])
    if game_data['n_unidentified_players'] > 0:
        
        try:
            ui_substrings = []
            for ui_rec in game_data['unidentified_players']:
                d = None
                if 'msg' in ui_rec:
                    d = "{}~~~{}~~~{}".format(ui_rec['plyr'], ui_rec['tID'], ui_rec['msg']) 
                else:
                    d = "{}~~~{}".format(ui_rec['plyr'], ui_rec['tID']) 
                if d is not None:
                    ui_substrings.append(d)
            
            unidentified_players_str = "|".join(ui_substrings)
        except Exception:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); telegram_alert(msg); data['telegram_messages'].append(msg)
            unidentified_players_str = "|".join(["{}~~~{}".format(z['plyr'], z['tID']) for z in game_data['unidentified_players']])
            
        # As long as this is a current year game, report situations where the player names did not match to a player on the roster for one of the teams
        if game_data['game_date'].year == datetime.now().year and (game_data['unidentified_players_str'] in [None, ''] or unidentified_players_str != game_data['unidentified_players_str']):
            msg = "Unidentified player(s) in %s;\n\n%s" % (game_data['description'], unidentified_players_str)
            
            try:
                msg += "\n\nignore_unidentified_players_error=%s" % game_data['ignore_unidentified_players_error']
            except Exception:
                msg += "\n\nError reporting game_data['ignore_unidentified_players_error']: %s" % traceback.format_exc()
            msg += "\n\nhttps://pro.lacrossereference.com/admin_cockpit?dt=%s&game_ID=%d&filter=unidentified_players" % (game_data['game_date'].strftime("%Y%m%d"), game_data['ID'])
            if ('ignore_unidentified_players_error' not in game_data or game_data['ignore_unidentified_players_error'] == 0) and '--send-unidentified-players-errors' in sys.argv:
                print (msg)
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); telegram_alert(msg); data['telegram_messages'].append(msg)
                
            
            query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=1, unidentified_players_error=%s where game_ID=%s"
            param = [unidentified_players_str, game_data['ID']]
            #cursor = zc.zcursor("LR")
            #print ("Query %s w/ %s" % (query, param))
            #cursor.execute(query, param); cursor.commit()
            #cursor.close()
            
            update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
            #input("\nChange in game_data.unidentified_players_str (%s != %s); DB update!!!\n\n\tPress Enter to go on\n" % (unidentified_players_str, game_data['unidentified_players_str']))
            game_data['unidentified_players_str'] = unidentified_players_str

    elif game_data['unidentified_players_str'] not in [None, ''] and game_data['n_unidentified_players'] == 0:
        game_data['unidentified_players_str'] = None
        query = "UPDATE LaxRef_Active_Live_WP_Games set input_required=0, unidentified_players_error=NULL where game_ID=%s"
        param = [game_data['ID']]
        #cursor = zc.zcursor("LR")
        #print ("Query %s w/ %s" % (query, param))
        #cursor.execute(query, param); cursor.commit()
        #cursor.close()
        update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
        
    # Write the stars to a standalone log file to enable LaxDotCom upload?
    
    #zc.print_dict(stars)
    
    
    fmt = "{:<40}{:<40}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<20}"
    table_list = fmt.format("player", "team", "roster_id", "goals", "assists", "saves", "GA", "shots", "gb", "turnovers", "ct", "fo_won", "fo_taken", 'Action')
    table_list += "\n" + "-" * 210
    fmt = "\n{:<40}{:<40}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<10}{:<20}"
    for i, player in enumerate(stars):
        
        
        player['action'] = ""
        player['update'] = 0
        player['insert'] = 0
        player['full_lx_update_query'] = None
        player['full_lx_insert_query'] = None
        if player['laxdotcom_ID'] is not None and game_data['laxdotcom_ID'] is not None:
            if player['laxdotcom_ID'] in [z['roster_id'] for z in game_data['lx_PGS_records']]:
                # The player/game record has been added to the game_dataYY table
                tmp_rec = game_data['lx_PGS_records'][ [z['roster_id'] for z in game_data['lx_PGS_records']].index(player['laxdotcom_ID']) ]
                update_fields = []
                for k in lx_game_data_crosswalk:
                    if k not in tmp_rec:
                        zc.print_dict(tmp_rec)
                        
                        zc.exit("MISSING KEY A: %s" % k)
                    if lx_game_data_crosswalk[k] not in player:
                        zc.print_dict(player)
                        
                        zc.exit("MISSING KEY B: %s" % lx_game_data_crosswalk[k])
                    if tmp_rec[k] != player[lx_game_data_crosswalk[k]]:
                        update_fields.append(k)
                        player['update'] = 1
                        player['action'] = "UPDATE"
                        tmp_rec[k] = player[lx_game_data_crosswalk[k]]
                if player['update']:
                    update_fields_str = ", ".join(["%s=%%s" % z for z in update_fields])
                    update_params = [player[lx_game_data_crosswalk[z]] for z in update_fields]
                    player['lx_update_query'] = "UPDATE game_data{:.0f} set {} where schedule_id=%s and roster_id=%s".format(data['year'] - 2000, update_fields_str)
                    lx_update_query = player['lx_update_query']
                    
                    player['lx_update_param'] = update_params + [game_data['laxdotcom_ID'], player['laxdotcom_ID']]
                    if len(update_fields) > 0:
                        player['full_lx_update_query'] = "UPDATE `game_data{:.0f}` set ".format(data['year'] - 2000)
                        for ij, (fld, param) in enumerate(zip(update_fields, update_params)):
                            player['full_lx_update_query'] += "%s%s=%s" % ("" if ij == 0 else ", ", fld, param)
                        
                        player['full_lx_update_query'] += " where schedule_id={} and roster_id={}".format(game_data['laxdotcom_ID'], player['laxdotcom_ID'])
            else:
                # The player/game record needs to be added to the game_dataYY table
                
                d = {'insert': 1, 'update': 0, 'roster_id': player['laxdotcom_ID']}
                d['goals'] = player['goals']	
                d['assists'] = player['assists']	
                d['saves'] = player['saves']		
                d['goals_allowed'] = player['goals_allowed']		
                d['shots'] = player['shots']	
                d['gb'] = player['gbs']	
                d['turnovers'] = player['tos']	
                d['ct'] = player['ct']	
                d['fo_won'] = player['fo']	
                d['fo_taken'] = player['fo_taken']	
                game_data['lx_PGS_records'].append(d)
                player['action'] = "INSERT"
                player['insert'] = 1
                player['lx_insert_query'] = "INSERT INTO game_data{:.0f} (schedule_id, roster_id, goals, assists, saves, goals_allowed, legacy_id, shots, gb, turnovers, ct, fo_won, fo_taken) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)".format(data['year'] - 2000)
                player['lx_insert_param'] = [game_data['laxdotcom_ID'], player['laxdotcom_ID']
                , player[lx_game_data_crosswalk['goals']]
                , player[lx_game_data_crosswalk['assists']]
                , player[lx_game_data_crosswalk['saves']]
                , player[lx_game_data_crosswalk['goals_allowed']]
                , 0 # legacy_id
                , player[lx_game_data_crosswalk['shots']]
                , player[lx_game_data_crosswalk['gb']]
                , player[lx_game_data_crosswalk['turnovers']]
                , player[lx_game_data_crosswalk['ct']]
                , player[lx_game_data_crosswalk['fo_won']]
                , player[lx_game_data_crosswalk['fo_taken']]
                ]
                lx_insert_query = player['lx_insert_query']
                
                player['full_lx_insert_query'] = "INSERT INTO `game_data{:.0f}` (schedule_id, roster_id, goals, assists, saves, goals_allowed, legacy_id, shots, gb, turnovers, ct, fo_won, fo_taken) VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(data['year'] - 2000, game_data['laxdotcom_ID'], player['laxdotcom_ID']
                , player[lx_game_data_crosswalk['goals']]
                , player[lx_game_data_crosswalk['assists']]
                , player[lx_game_data_crosswalk['saves']]
                , player[lx_game_data_crosswalk['goals_allowed']]
                , 0 # legacy_id
                , player[lx_game_data_crosswalk['shots']]
                , player[lx_game_data_crosswalk['gb']]
                , player[lx_game_data_crosswalk['turnovers']]
                , player[lx_game_data_crosswalk['ct']]
                , player[lx_game_data_crosswalk['fo_won']]
                , player[lx_game_data_crosswalk['fo_taken']])
        
        table_list += (fmt.format(player['player']
        , player['team']
        , "" if player['laxdotcom_ID'] is None else player['laxdotcom_ID']
        , player['goals']
        , player['assists']
        , player['saves']
        , player['goals_allowed']
        , player['shots']
        , player['gbs']
        , player['tos']
        , player['ct']
        , player['fo']
        , player['fo_taken']
        , player['action']
        ))
        #if player['update']:
        #    table_list += "\n%s w/ %s\n" % (player['lx_update_query'], player['lx_update_param'])
        #if player['insert']:
        #    table_list += "\n%s w/ %s\n" % (player['lx_insert_query'], player['lx_insert_param'])
            
    if '--print-boxscore' in sys.argv or '--print-box-score' in sys.argv:
        print (table_list)
    
    upload_stars = [z for z in stars if (z['update'] or z['insert']) and z['player'].upper() not in non_names and z['laxdotcom_ID'] not in [None, -1]]
    insert_stars = [z for z in upload_stars if z['insert']]
    update_stars = [z for z in upload_stars if z['update']]
    n_inserts = len(insert_stars)
    n_updates = len(update_stars)
    
    box_score_table = "game_data{}".format(game_data['year'] - 2000)
    schedule_table = "schedule{}".format(game_data['year'] - 2000)
    
    if '--use-db-plays' in sys.argv:
        score_query = "UPDATE {} set home_goals=%s, away_goals=%s, clock_status=%s, wp_lookup_code=%s where id=%s".format(schedule_table)
        score_param = [game_data['home_score'], game_data['away_score'], 'FINAL', to_zhex(game_data['ID'], 5), game_data['laxdotcom_ID']]
    else:
        score_query = "UPDATE {} set home_goals=%s, away_goals=%s, clock_status=%s, wp_lookup_code=%s where id=%s".format(schedule_table)
        score_param = [game_data['home_score'], game_data['away_score'], game_data['time_str'], to_zhex(game_data['ID'], 5), game_data['laxdotcom_ID']]
    
    full_score_update_query = "UPDATE `{}` set home_goals={}, away_goals={}, clock_status='{}', wp_lookup_code='{}' where id={}".format(schedule_table, game_data['home_score'], game_data['away_score'], game_data['time_str'], to_zhex(game_data['ID'], 5), game_data['laxdotcom_ID'])

    if UPLOAD_IN_THIS_SCRIPT:   
        
        if n_inserts + n_updates:
            if '--no-commit' not in sys.argv and game_data['laxdotcom_ID'] is not None:
                conn, cursor = zc.db(lx_db_tag)
                
                cursor.execute(score_query, score_param)
                
                if len(insert_stars):
                    for p in insert_stars:
                        if '--show-lx-queries' in sys.argv:
                            print ("INSERT Query {} w/ {}" .format (p['lx_insert_query'], p['lx_insert_param']))
                        cursor.execute(p['lx_insert_query'], p['lx_insert_param'])
                
                if len(update_stars):
                    for p in update_stars:
                        if '--show-lx-queries' in sys.argv:
                            print ("update Query {} w/ {}" .format (p['lx_update_query'], p['lx_update_param']))
                        cursor.execute(p['lx_update_query'], p['lx_update_param'])
                cursor.close(); conn.close()
        
        #zc.exit("In stars assignment function, there are {} existing lx_PGS_records for this game, {} total player records and {} records that required an LX DB Update.".format(len(game_data['lx_PGS_records']), len(stars), len(upload_stars)))
        # laxref.laxdotcom_PGS_queries call
        
    else:
        src = os.path.join(lr_fldr, "LiveWinOdds", "GameLogJSONs", "LXCOM_boxscore%07d.sql" % game_data['ID'])
        try:
            
            sql_txt = "LOCK TABLES `{}` WRITE;\n/*!40000 ALTER TABLE `{}` DISABLE KEYS */;\n".format(schedule_table, schedule_table)
            sql_txt += "\n{};" .format( full_score_update_query )
            sql_txt += "\n/*!40000 ALTER TABLE `{}` ENABLE KEYS */;\nUNLOCK TABLES;".format(schedule_table)
            if len(insert_stars) + len(update_stars) > 0:
                sql_txt += "\n\n\nLOCK TABLES `{}` WRITE;\n/*!40000 ALTER TABLE `{}` DISABLE KEYS */;\n".format(box_score_table, box_score_table)
                if len(insert_stars):
                    sql_txt += "\n"
                    for p in insert_stars:
                        sql_txt += "\n%s;" % p['full_lx_insert_query']
                
                if len(update_stars):
                    sql_txt += "\n"
                    for p in update_stars:
                        sql_txt += "\n%s;" % p['full_lx_update_query']
                sql_txt += "\n/*!40000 ALTER TABLE `{}` ENABLE KEYS */;\nUNLOCK TABLES;".format(box_score_table)
            f = io.open(src, 'w', encoding="utf8")
            f.write(sql_txt)
            f.close()
            
            data = log_updated_file(data, src)
        
        except Exception:
            msg = "Error in create_game_object, crash when writing data to file for {}\n\n{}" % (game_data['description'], traceback.format_exc())
            print (msg)
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    #print("Game parsing took %f seconds (pct-complete: %.1f%%)\n" % (ended-started, 100.0*float(max([z['pct_complete'] for z in game['plays']]))))
    #zc.exit("Player ID test")
    game_object['stars'] = stars
    game_object['elapsed_seconds'] = ended-started
    return data, game_object, game

lx_game_data_crosswalk = {}
lx_game_data_crosswalk['goals'] = 'goals'
lx_game_data_crosswalk['assists'] = 'assists'
lx_game_data_crosswalk['saves'] = 'saves'
lx_game_data_crosswalk['goals_allowed'] = 'goals_allowed'
lx_game_data_crosswalk['shots'] = 'shots'
lx_game_data_crosswalk['gb'] = 'gbs'
lx_game_data_crosswalk['turnovers'] = 'tos'
lx_game_data_crosswalk['ct'] = 'ct'
lx_game_data_crosswalk['fo_won'] = 'fo'
lx_game_data_crosswalk['fo_taken'] = 'fo_taken'
									
def build_WP_JSON(data, game_data, json_input):
    """
    This function generates the slimmed-down JSON file that is needed to display an in-game WP chart via Embedded
    """
    tmp_start_ms = time.time()
    #zc.print_dict(game_data)
    #print (sorted(game_data.keys()))
    #zc.print_dict(json_input)
    
    
    local_home_gif = game_data['home_gif'].split("/")[-1]
    local_away_gif = game_data['away_gif'].split("/")[-1]
    
    if json_input['home_odds'] >= .5:
        leader_gif = local_home_gif
    else:
        leader_gif = local_away_gif
    
    pts = ["%s%s" % (("%.3f" % (min(z['x'], .999))).lstrip("0"), ("%.3f" % (min(z['y'], .999))).lstrip("0")) for z in json_input['pts']]
    js = {"pts":"".join(pts),"h_logo":local_home_gif,"a_logo":local_away_gif,"w_logo":leader_gif,"ver":"1.0"}
    if json_input['home_odds'] is  None or "%.2f" % json_input['home_odds'] == "0.50":
        js['wp'] = "---"
    elif json_input['home_odds'] < .50:
        js['wp'] = "%.1f%%" % (100.0*(1.0-json_input['home_odds']))
    else:
        js['wp'] = "%.1f%%" % (100.0*json_input['home_odds'])
    
    mod31 = game_data['ID'] % 31
    mod39 = game_data['ID'] % 39
    fname = "%07d.json" % game_data['ID']
    if '--use-db-plays' in sys.argv and datetime.now().strftime("%Y%m%d") == "20240310" and datetime.now().hour < 12:
        # To speed up the next-morning processing, skip this upload step. The Lax.com front-end view won't be updated, but that shouldn't affect 99% of the games because there's no change from live to NCAA site in terms of the basic box score. This would save the 5-6 second gsutil upload for every game (i.e. about 30 minutes)
        print ("\n\nSKIPPING Lax.COM upload on {} only!!!!!!!!!\n\n".format(datetime.now().strftime("%Y%m%d")))
    else:
        src1 = os.path.join(lr_fldr, 'LRP', 'LRP_flask', "LocalDocs", "WPData", fname)
        f = open(src1, 'w'); f.write(json.dumps(js)); f.close()
        
        # If this is not set, then we will check the file update timestamps and use a separate PYTHON script to upload updated files
        if UPLOAD_IN_THIS_SCRIPT:
            d = {'src': src1, 'fname': fname, 'target_folder': 'WPData'}
            #zc.print_dict(d)
            #laxref.upload_file(d)
                                    
            try:
                local_upload_file(d, game_data['upload_batch_src'])
            except Exception:
                f = open(os.path.join(lr_fldr, 'Logs', "LWO_async_error.txt"), 'w')
                f.write(traceback.format_exc()); f.close()
        else:
            data = log_updated_file(data, src1)
    
    print ("Build and uploaded WPData JSON in %.2fs" % (time.time() - tmp_start_ms))
    return data, game_data
    
def process_statbroadcast_plays(play_data, game_data, data, most_recent, manual_quarter):

    play_data, game_data = clean_data(play_data, game_data)
    
    

    #f = open('statbroadcast_play_data', 'w'); f.write(play_data); f.close()

    play_regexes = []
    #play_regexes.append({'regex': re.compile(r'<tr(?: class=\".*?\")?><td(?: class=\".*?\")?>(?:<div(?: class=\".*?\")?>.*?</div><div(?: class=\".*?\")?></div></td><td(?: class=\".*?\")?><div(?: class=\".*?\")?>|</td><td(?: class=\".*?\")?><div(?: class=\".*?\")?>)</div></td><td(?: class=\".*?\")?>([0-9]+?):([0-9]+?)</td><td(?: class=\".*?\")?>(.*?)</td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})
    
    # Removed on 1/30/2021
    #play_regexes.append({'regex': re.compile(r'<tr(?: class=\"[^>]*?\")?><td class=\".*?\">(?:<div class=\".*?\"></div>)?</td><td>.*?</td><td(?: class=\".*?\")?><div(?: class=\".*?\")?>.*?</div></td><td class=\".*?\">([0-9]+?):([0-9]+?)</td><td(?: class=\".*?\")?>(.*?)</td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})
    
    play_regexes.append({'regex': re.compile(r'<tr(?: class=\"[^>]*?\")?><td class=\".*?\">(?:<div class=\".*?\"></div>)?</td><td>.*?</td><td(?: class=\".*?\")?>(?:([0-9]+?):([0-9]+?))?</td><td class=\".*?\">(?:<div.*?>.*?</div>)?</td><td(?: class=\".*?\")?>(.*?)</td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    header_regex = re.compile(r'<div class=\".*?\"\s*>(Period ([0-9]+) Plays)</div>', re.IGNORECASE)
    matches = re.findall(header_regex, play_data)

    play_data_list = []
    tmp = play_data
    last_loc = None
    if len(matches) == 0:
        pass
    elif len(matches) == 1:
        play_data_list.append({'quarter': int(matches[0][1]), 'text': play_data})
    else:
        unique_quarters = list(set([z[1] for z in matches]))
        dups = True if len(unique_quarters) < len(matches) else False

        if not dups:
            for i, m in enumerate(matches):
                if i + 1 < len(matches):
                    start_loc = tmp.index(m[0])
                    end_loc = tmp.index(matches[i+1][0])
                    quarter = int(m[1])
                    #print "Plays Tup 1", m, start_loc, end_loc, quarter

                    play_data_list.append({'quarter': quarter, 'text': tmp[start_loc:end_loc]})

                else:
                    start_loc = tmp.index(m[0])
                    quarter = int(m[1])
                    print (m, start_loc, end_loc, quarter)

                    play_data_list.append({'quarter': quarter, 'text': tmp[start_loc:]})







    last_match = None
    game_data['end_of_period'] = False
    plays_added = 0
    plays_already_added = 0
    tmp_plays_captured = []
    last_time_was_null = None
    last_mins = 30 if game_data['women'] else 15
    last_sec = 00
    first_non_play_match = 1
    for i, p in enumerate(play_data_list):

        quarter = p['quarter']
        for r in play_regexes:
            matches = re.findall(r['regex'], p['text'])


            remaining = None; pct_complete = None
            for im, m in enumerate(matches):
                
                
          
                if m[-1+r['minute_group']] in [None, '']:
                    last_time_was_null = 1
                    hash = None
                    hash = "%02d|%02d|%s" % (last_mins, last_sec, m[-1 + r['play_group']])
                    play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': pct_complete}
                else:
                    hash = "%02d|%02d|%s" % (int(m[-1+r['minute_group']]), int(m[-1+r['second_group']]), m[-1 + r['play_group']])
                    last_mins = int(m[-1+r['minute_group']])
                    last_sec = int(m[-1+r['second_group']])
                    remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                    quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                    #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                    #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                    pct_complete = float(game_elapsed)/3600.0
                  
                    play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': pct_complete}
            
                
                    
                    
                if '--show-plays' in sys.argv:
                    if remaining is not None and pct_complete is not None:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (im+1, len(matches)), m, quarter, "%.1f%%" % (100.*pct_complete)))
                    else:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (im+1, len(matches)), m, quarter, "???"))


                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)', re.IGNORECASE)
                detail = m[-1 + r['play_group']]
                if manual_quarter is None:
                    if im == len(matches)-1: last_match = detail
                else:
                    if im == 0: last_match = detail


                #print ("\t%s" % detail)
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    
                    while "  " in details:
                        details = details.replace("  ", " ")
                    
                    play['team']  = play_match.group(2)

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    play['detail'] = details
                    play['hash'] = hash
                    rec = "%s|%s" % (play['pct_complete'], play['detail'])
                    if rec not in ["%s|%s" % (z['pct_complete'], z['detail']) for z in tmp_plays_captured]:
                        tmp_plays_captured.append(play)
                        plays_added += 1
                    else:
                        plays_already_added += 1
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
    #print ("Last match: %s" % last_match)
    if last_match in end_of_period_strings: game_data['end_of_period'] = True

    print ("\nWe added %d newly found plays and did not add %d plays that were already stored.\n" % (plays_added, plays_already_added))
    #time.sleep(1)
    
    
    play_hashes = [z['hash'] for z in tmp_plays_captured]
    for z in tmp_plays_captured:
        z['num_hash_matches'] = len([1 for y in play_hashes if z['hash'] == y])
        if z['num_hash_matches'] > 1:
            print ("\n".join([y for y in play_hashes if z['hash'] == y]))
    num_dup_plays = len([1 for z in tmp_plays_captured if z['num_hash_matches'] > 1])
    
    # If the tests pass, then update the game_data list, otherwise, just keep it as is and move on (parse plays won't happen because len == num_plays
    if num_dup_plays < 10 or '--no-dups' in sys.argv or ('ignore_duplicate_plays_error' in game_data and game_data['ignore_duplicate_plays_error'] == 1):
        game_data['plays_captured'] = tmp_plays_captured
        game_data['consecutive_quarter_duplications'] = 0
    else:
        
        game_data['consecutive_quarter_duplications'] += 1
        if game_data['consecutive_quarter_duplications'] > 10:
            # This happens from time to time naturally because of the way that the script moves between periods, it's not a big deal if it happens once in a while, but if it's happening consistently, then there is likely an issue with the data being published by the SID. If it happens 10 times in a row, then we need to be notified. It make eventually make sense to just put this game straight to pending if this is consistently identifying real issues.
            msg = "In the %s game (ID %d), it appears that there a quarter was recorded more than once (consec=%d) because there are %d plays that were dups...skipping this loop....\n\nIf this is an actual error, set the game to pending; if it's just an issue of not enough timestamps, set the ignore_duplicate_plays_error flag in LaxRef_Game_Streams to 1 so that the game can be processed going forward." % (game_data['description'], game_data['ID'], game_data['consecutive_quarter_duplications'], num_dup_plays)
            print (msg)
            if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)
            
            
    return game_data


def process_ncaa_plays(play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    if '--write-HTML' in sys.argv:
        f = open(os.path.join("Logs", 'ncaaplay_data'), 'w'); f.write(play_data); f.close()
    
    period_headers_regex = re.compile(r'<h3>(.*?)\sPeriod</h3>', re.IGNORECASE)
    period_header_matches = re.findall(period_headers_regex, play_data)
    
    #print ("\n\nPeriod header matches")
    #print (period_header_matches)
    

    #f = open('ncaa_play_data', 'w'); f.write(play_data); f.close()

    if '<li class="active ajaxTab play-by-play" id="tab_play-by-play">' in play_data:
        play_data = play_data[play_data.index('<li class="active ajaxTab play-by-play" id="tab_play-by-play">'):]
    elif '<div class="gamecenter-header-spacer"' in play_data:
        play_data = play_data[play_data.index('<div class="gamecenter-header-spacer"'):]


    play_regexes = []

    play_regexes.append({'regex': re.compile(r'<tr(?: class=\".*?\")?>\s*\n\s*<td(?:.*?)?>(.*?)</td>\s*\n\s*<td(?:.*?)?>([0-9]+?):([0-9]+?)</td>\s*\n\s*<td(?: class=\".*?\")?>(.*?)</td>\s*\n\s*<td(?:.*?)?>(.*?)</td>\s*\n\s*</tr>', re.IGNORECASE), 'minute_group': 2, 'second_group': 3, 'play_group': 1, 'alt_play_group': 5})
    #play_regexes.append({'regex': re.compile(r'<tr>[\s\n\r]+<td class=\"time\">\n(\s*?)</td>[\s\S]+?\"description[a-z\-\_\s]+\">\s*\n(.*?)\n[\s\S]+?</td>\s\n*</tr>', re.IGNORECASE), 'minute_group': 1, 'second_group':1, 'play_group': 2, 'alt_play_group': None})

    play_regexes.append({'regex': re.compile(r'<tr>[\s\n\r]+<td class=\"time\">\n(([0-9]+):([0-9]+))?[\s\r\n]*?</td>[\s\S]+?\"description[a-z\-\_\s]+\">\s*\n(.*?)\n[\s\S]+?</td>\s\n*</tr>', re.IGNORECASE), 'minute_group': 2, 'second_group':3, 'play_group': 4, 'alt_play_group': None})

    terms = ["play-by-play-period-table"]
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t
    play_data = play_data.split(split_term)

    game_data['plays_captured'] = []
    last_match = None
    max_quarter = 0
    for i, p in enumerate(play_data):


        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                pass
            if len(matches) > 0:
                max_quarter += 1

        
    quarter = 0
    first_quarter_first = None
    

    # Sometimes, the NCAA site switches the order of the quarters when the game ends; this check determines if that has happened. Typically, the issue arises when the game ends and that's when the switch happens. During the game, typically the most recent play appears first (after the switch, they show the first play first). If the first period header label is 1st, then we can assume that the earliest plays are being shown first.


    first_quarter_first = 0
    if '--show-period-header-matches' in sys.argv:
        print ("\nPeriod Header Matches")
        print(period_header_matches)
        
        
    if period_header_matches != [] and period_header_matches[0].upper() in ["1ST", "START OF 1ST"]:
        first_quarter_first = 1
        
    
    if '--show-period-header-matches' in sys.argv:
        print ("\n\nfirst_quarter_first: %d\n\n" % first_quarter_first)
    first_non_play_match = 0
    last_remaining = None; remaining = None
    for i, p in enumerate(play_data):
        
        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                if first_quarter_first:
                    final_quarter = quarter + 1
                else:
                    final_quarter = max_quarter - quarter
                #print m, final_quarter
                no_ts = 0
                if m[-1+r['minute_group']] in [None, '', '\n', '\\n']:
                    no_ts = 1
                    if last_remaining is None:
                        remaining = 900
                    else:
                        if first_quarter_first:
                            remaining = last_remaining
                        else:
                            remaining = last_remaining
                else:
                    remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(final_quarter, remaining, game_data)

                #quarter_elapsed = (900 if final_quarter < 5 else 240) - remaining
                #game_elapsed = min(4, final_quarter - 1) * 900 + max(0, final_quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': final_quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)', re.IGNORECASE)
                detail = m[-1 + r['play_group']]
                if detail.strip() == "":
                    detail = m[-1 + r['alt_play_group']]
                last_match = detail
                #print ("\n%s" % play['play'])
                if '--print-plays' in sys.argv:
                    print ("{:<10}{:<20}{:<20}{:<20}{:<40}{}".format(final_quarter, "no_ts: %d" % no_ts, "last R: %s" % last_remaining, "remaining: %d" % remaining, str(m), detail))
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
                if remaining is not None:
                    last_remaining = remaining
            if len(matches) > 0:
                quarter += 1
        
        
    #game_data['end_of_period'] = True if last_match in end_of_period_strings else False
    return game_data

def process_pointstreak_plays(play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    

    #f = open('pointstreak_play_data', 'w'); f.write(play_data); f.close()


    play_regexes = []

    play_regexes.append({'regex': re.compile(r'([a-z]+?)\s(.*?)\s?(?:-\s?(.*?)\s?)?([0-9]+):([0-9]+)\n', re.IGNORECASE), 'team_group': 1, 'minute_group': 4, 'second_group': 5, 'play_group': 2, 'detail_group': 3})

    terms = ["QUARTER"]
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t
    play_data = play_data.split(split_term)

    game_data['plays_captured'] = []
    last_match = None

    quarter = 1
    for i, p in enumerate(play_data):


        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                final_quarter = quarter
                #print m, final_quarter
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(final_quarter, remaining, game_data)
                #quarter_elapsed = (900 if final_quarter < 5 else 240) - remaining
                #game_elapsed = min(4, final_quarter - 1) * 900 + max(0, final_quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': final_quarter, 'pct_complete': float(game_elapsed)/3600.0}


                play['team']  = m[-1+r['team_group']]
                play['detail'] = m[-1+r['detail_group']]

                play['event_type'] = m[-1+r['play_group']]
                if play not in game_data['plays_captured']:
                    game_data['plays_captured'].append(play)

            if len(matches) > 0:
                quarter += 1
    #print("Last match: %s" % last_match)
    game_data['end_of_period'] = True if last_match in end_of_period_strings else False
    return game_data


def process_stretch_plays(play_data, game_data, data, manual_quarter):

    play_data, game_data = clean_data(play_data, game_data)
    game_data['plays_captured'] = []
    

    #f = open('stretch_play_data', 'w'); f.write(play_data); f.close()

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<div class=\"playText\">(.*?)</div>[\s\r\n]*?<div class=\"playClock\">([0-9]{2}):([0-9]{2})</div>', re.IGNORECASE), 'minute_group': 2, 'second_group': 3, 'play_group': 1})

    terms = ["Start of period", "Start of period [15:00]", "Start of period [15:00]."]
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t


    if split_term is None:
        play_data = [play_data]
    else:
        play_data = play_data.split(split_term)

    end_of_period = False
    first_match = None

    first_non_play_match = 0
    for i, p in enumerate(play_data):

        if manual_quarter is None: # We are looking at the original list of plays, which means we need to get the quarter from the quarter splits
            quarter = len(play_data) - i
        else: # We know the quarter because we are looking at just the most recent plays
            quarter = manual_quarter

        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                #print m, quarter
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]
                if first_match is None:
                    first_match = detail.strip()

                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
    game_data['end_of_period'] = True if first_match in end_of_period_strings else False
    return game_data 

def process_stretch_plays_old(play_data, game_data, data, manual_quarter):

    play_data, game_data = clean_data(play_data, game_data)
    
    

    #f = open('stretch_play_data', 'w'); f.write(play_data); f.close()

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'(.*?)\s?([0-9]{2}):([0-9]{2})\n', re.IGNORECASE), 'minute_group': 2, 'second_group': 3, 'play_group': 1})

    terms = ["Start of period", "Start of period [15:00]", "Start of period [15:00]."]
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t


    if split_term is None:
        play_data = [play_data]
    else:
        play_data = play_data.split(split_term)

    end_of_period = False
    first_match = None

    first_non_play_match = 0
    for i, p in enumerate(play_data):

        if manual_quarter is None: # We are looking at the original list of plays, which means we need to get the quarter from the quarter splits
            quarter = len(play_data) - i
        else: # We know the quarter because we are looking at just the most recent plays
            quarter = manual_quarter

        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                #print m, quarter
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]
                if first_match is None:
                    first_match = detail.strip()

                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
    game_data['end_of_period'] = True if first_match in end_of_period_strings else False
    return game_data 

def we_cant_ignore_unknown_play(game_data, detail):
    """
    If the scrape of a live win odds page identifies a play that the regex can't parse into a normal play object, it will be reported in case it's indicative of a larger error. But if it's a piece of commentary, we want to ignore it without sending an alert. Originally, we checked the full play detail (i.e. Media Timeout) against a list of known commentary phrases. Over time, I realized that it would be better to check a regex for some phrases (i.e. #43 injured on the play). As a result, I moved the original conditional (laxref.hash_player_name(detail) not in game_data['ignore-non-matches']) into this function where the play phrase could be more flexibly evaluated. If it returns True, then we need to report the play detail. If it returns False, then it's a phrase we can safely ignore
    """
    
    res = True
    if res and laxref.hash_player_name(detail) in game_data['ignore-non-matches']:
        res = False
    
    if res:
        # Check for a statement with a player jersey number in it
        tmp_regex = re.compile(r'[\#0-9]+?.*? (?:injured on the play)', re.IGNORECASE)
        if tmp_regex.search(detail) is not None:
            res = False
        
        
    return res
def process_sidearm_plays(data, play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    
    if "FilteredPlays\"" in play_data:
        play_data = play_game_data[play_data.index("FilteredPlays\""):]

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr class=\".*?\">.*?<td class=\"column_Time\">([0-9]+):([0-9]+)</td><td class=\"column_Score\">(?:[0-9]+\-[0-9]+)?</td>.*?class=\"narrative\">(.*?)</div></td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})
    play_regexes.append({'regex': re.compile(r'<div _ngcontent-c[0-9]+=\"\" class=\"c-scoring-.*?\">[\s\S]+?>([0-9]+):([0-9]+)</span>\n\s*</span>[\s\S]+?narrative-text\">(.*?)</span>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    play_regexes.append({'regex': re.compile(r'>(?:([0-9]+):([0-9]+)</span>)?</span><div.*?logo.*?>.*?c-scoring-plays__narrative-text\">(.*?)</span>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    terms = ["<Start of Period>"]#, "narrative\">End-of-period.", ':00</td><td class="column_Score"></td><td class="column_Team"></td><td class="column_Player"></td><td class="column_Narrative"><div class="context"></div><div class="narrative"></div>']
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t

    end_split_term = "End-of-period."

    # If this is true, then that means that two quarters worth of plays were grabbed in a single copy/paste somehow; if we processed as-is, we'd end up counting plays twice and screwing stuff up.  This way, we can just ignore this particular loop
    #if len(play_data.split(end_split_term)) > len(play_data.split(split_term)):
    #    print (" Loop data was corrupted (duplicative content)... skipping...")
    #    game_data['end_of_period'] = False
    #    return game_data

    play_data = play_data.split(split_term)

    #print("Term: %s" % split_term)
    #print("There are %d sections" % len(play_data))

    game_data['plays_captured'] = []
    game_data['end_of_period'] = False
    qs = 1

    first_non_play_match = 1
    for i, p in enumerate(play_data):

        quarter_plays = []
        quarter = qs
        last_pct_complete = None
        last_game_elapsed = None
        for j, r in enumerate(play_regexes):
            quarter_advance = 0
            matches = re.findall(r['regex'], p)
            #print("  Section %d, Regex %d - %d matches" % (i+1, j+1, len(matches)))

            end_of_period_loc = None


            for ij, m in enumerate([z for z in matches if "at goalie" not in z[2]]):

                if m[2] in end_of_period_strings and ij > 0:
                    clock = ":".join(m[0:2])
                    print ("First 3 matches...")
                    print ("\n".join([str(z) for z in matches[0:3]]))

                    if False and len([1 for z in matches[0:ij] if ":".join(z[0:2]) != clock and z[0] != "" or z[1] != ""]) > 0:

                        print ("Found an extra period marker at %d (%s)\t\tmust have copied two sections by accident, skipping this loop!!!" % (ij, ":".join(m[0:2])))
                        end_of_period_loc = ij
                    else:
                        print ("Found an extra period marker at %d but the previous entries had the same clock stamp, so keep going!!!" % ij)


            if i == len(play_data) - 1 and len(matches) > 0 and matches[0][2] in end_of_period_strings: end_of_period = True

            # If something was weird, just get out of there
            if end_of_period_loc is not None: 
                game_data['end_of_period'] = False
                return data, game_data

            #if end_of_period_loc is None: end_of_period_loc = 0
            last_time_was_null = None
            for ij, m in enumerate(matches[end_of_period_loc:]):
                quarter_advance = 1
                pct_complete = None
                game_elapsed = None; quarter_elapsed = None
                    
                # On the sidearm women's broadcasts, there were situations where no time stamp was given for a specific play. We address that by waiting for the next play (in HTML) which is the previous play in real-life to be processed and we use that time
                if m[-1+r['minute_group']] in ['', None]:
                    remaining = None 
                    last_time_was_null = 1
                else:
                    
               
                    remaining =  60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                    quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                    #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                    #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                    pct_complete = float(game_elapsed)/3600.0
                    
                    if last_time_was_null and game_data['plays_captured'] != []:
                        start_i = -1
                        while abs(start_i) <= len(game_data['plays_captured']) and game_data['plays_captured'][start_i]['game_elapsed'] is None:
                            game_data['plays_captured'][start_i]['game_elapsed'] = game_elapsed
                            game_data['plays_captured'][start_i]['quarter_elapsed'] = quarter_elapsed
                            game_data['plays_captured'][start_i]['pct_complete'] = pct_complete
                   
                            start_i -= 1
                        
                        
                        
                    set_to_zero = quarter_elapsed == 900 if quarter < 5 else quarter_elapsed == 240

                    
                    if last_pct_complete is not None and pct_complete > last_pct_complete and set_to_zero:
                        print ("The last play was tagged at %.1f%% pct complete, and this one was at %.1f%% pct complete; set pct complete to %.1f%%" % (100. * last_pct_complete, 100.*pct_complete, 100. * last_pct_complete))
                        pct_complete = last_pct_complete
                        game_elapsed = last_game_elapsed

                    last_pct_complete = pct_complete
                    last_game_elapsed = game_elapsed
                    
                    last_time_was_null = 0
                play = {'ID': len(game_data['plays_captured']), 'duplicate': False, 'quarter_elapsed': quarter_elapsed, 'game_elapsed': game_elapsed, 'quarter': max(quarter,1), 'pct_complete': pct_complete}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]

                if '--show-plays' in sys.argv:
                    if remaining is not None and pct_complete is not None:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (ij+1, len(matches)), str(m), "N/A" if quarter is None else quarter, "%.1f%%" % (100.*pct_complete)))
                    else:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (ij+1, len(matches)), str(m), "N/A" if quarter is None else quarter, "???"))


                if "substitution:" not in detail and len(detail.strip()) > 5:
                    if i == 0:
                        #print("    %d) %s" % (ij, detail))
                        if ij == 0 and detail in end_of_period_strings:
                            end_of_period = True
                    #print ("\n%s" % play['play'])
                    play_match = sub_play_regex.search(detail)
                    if play_match is not None:
                        if play_match.group(3) is None:
                            detail = play_match.group(4)
                        else:
                            detail = "%s%s" % (play_match.group(3), play_match.group(4))

                        details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                        play['team']  = play_match.group(2)
                        play['detail'] = details

                        play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                        if play not in game_data['plays_captured']:
                            game_data['plays_captured'].append(play)
                    elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                        error_msg = "Error: the regex could not play_match on: %s" % (detail)
                        data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)

        qs += quarter_advance
    for r in game_data['plays_captured']:
        if len([1 for z in game_data['plays_captured'] if z['ID'] != r['ID'] and z['team'] == r['team'] and z['detail'] == r['detail'] and z['quarter_elapsed'] == r['quarter_elapsed']]) > 0:
            r['duplicate'] = True
    pct_duplicated = 0 if len(game_data['plays_captured']) == 0 else float(len([1 for z in game_data['plays_captured'] if z['duplicate']]))/float(len(game_data['plays_captured']))
    if '--use-archive' in sys.argv and '--show-plays' in sys.argv:
        print ("Pct Duplicated: %.2f" % pct_duplicated)
    
    if pct_duplicated < .25 or '--no-dups' in sys.argv or ('ignore_duplicate_plays_error' in game_data and game_data['ignore_duplicate_plays_error'] == 1):
        
        game_data['consecutive_quarter_duplications'] = 0
        
    else:
        #print ("There were too many plays that appear to have been captured twice (%.1f%%), skip this loop." % (pct_duplicated*100.))
        game_data['end_of_period'] = False
        game_data['plays_captured'] = []
        
        game_data['consecutive_quarter_duplications'] += 1
        if game_data['consecutive_quarter_duplications'] > 10:
            msg = "process_sidearm_plays identified too many plays that appear to have been captured twice (%.1f%%) in %s\n\nThis error has occurred %d consecutive times.\n\nIf this is an actual error, set the game to pending; if it's just an issue of not enough timestamps, set the ignore_duplicate_plays_error flag in LaxRef_Game_Streams to 1 so that the game can be processed going forward." % (pct_duplicated*100., game_data['consecutive_quarter_duplications'], game_data['description'])
            if msg not in data['telegram_messages']: send_telegram(msg, bot_token); telegram_alert(msg); data['telegram_messages'].append(msg)
        
        return data, game_data
    if game_data['end_of_period']:
        print ("\n\n\t\t\t\t END OF THE PERIOD !!!!!!!!!!!!!\n\n\n\n")
        
    if '--show-plays' in sys.argv:
        print ("\n\nFinal results of processing data(pre-parseplays)\n--------------------------------------")
        print ("\n".join(["{:<5}{:<10}{}".format(i, z['game_elapsed'], z['detail']) for z in game_data['plays_captured']]))
    return data, game_data



def process_xlive_plays(data, play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    
    if "FilteredPlays\"" in play_data:
        play_data = play_game_data[play_data.index("FilteredPlays\""):]

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr class=\".*?\">.*?<td class=\"column_Time\">([0-9]+):([0-9]+)</td><td class=\"column_Score\">(?:[0-9]+\-[0-9]+)?</td>.*?class=\"narrative\">(.*?)</div></td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})
    play_regexes.append({'regex': re.compile(r'<div _ngcontent-c[0-9]+=\"\" class=\"c-scoring-.*?\">[\s\S]+?>([0-9]+):([0-9]+)</span>\n\s*</span>[\s\S]+?narrative-text\">(.*?)</span>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    play_regexes.append({'regex': re.compile(r'>(?:([0-9]+):([0-9]+)</span>)?</span><div.*?logo.*?>.*?c-scoring-plays__narrative-text\">(.*?)</span>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    terms = ["<Start of Period>"]#, "narrative\">End-of-period.", ':00</td><td class="column_Score"></td><td class="column_Team"></td><td class="column_Player"></td><td class="column_Narrative"><div class="context"></div><div class="narrative"></div>']
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t

    end_split_term = "End-of-period."

    # If this is true, then that means that two quarters worth of plays were grabbed in a single copy/paste somehow; if we processed as-is, we'd end up counting plays twice and screwing stuff up.  This way, we can just ignore this particular loop
    #if len(play_data.split(end_split_term)) > len(play_data.split(split_term)):
    #    print (" Loop data was corrupted (duplicative content)... skipping...")
    #    game_data['end_of_period'] = False
    #    return game_data

    play_data = play_data.split(split_term)

    #print("Term: %s" % split_term)
    #print("There are %d sections" % len(play_data))

    game_data['plays_captured'] = []
    game_data['end_of_period'] = False
    qs = 1

    first_non_play_match = 1
    for i, p in enumerate(play_data):

        quarter_plays = []
        quarter = qs
        last_pct_complete = None
        last_game_elapsed = None
        for j, r in enumerate(play_regexes):
            quarter_advance = 0
            matches = re.findall(r['regex'], p)
            #print("  Section %d, Regex %d - %d matches" % (i+1, j+1, len(matches)))

            end_of_period_loc = None


            for ij, m in enumerate([z for z in matches if "at goalie" not in z[2]]):

                if m[2] in end_of_period_strings and ij > 0:
                    clock = ":".join(m[0:2])
                    print ("First 3 matches...")
                    print ("\n".join([str(z) for z in matches[0:3]]))

                    if False and len([1 for z in matches[0:ij] if ":".join(z[0:2]) != clock and z[0] != "" or z[1] != ""]) > 0:

                        print ("Found an extra period marker at %d (%s)\t\tmust have copied two sections by accident, skipping this loop!!!" % (ij, ":".join(m[0:2])))
                        end_of_period_loc = ij
                    else:
                        print ("Found an extra period marker at %d but the previous entries had the same clock stamp, so keep going!!!" % ij)


            if i == len(play_data) - 1 and len(matches) > 0 and matches[0][2] in end_of_period_strings: end_of_period = True

            # If something was weird, just get out of there
            if end_of_period_loc is not None: 
                game_data['end_of_period'] = False
                return data, game_data

            #if end_of_period_loc is None: end_of_period_loc = 0
            last_time_was_null = None
            for ij, m in enumerate(matches[end_of_period_loc:]):
                quarter_advance = 1
                pct_complete = None
                game_elapsed = None; quarter_elapsed = None
                    
                # On the sidearm women's broadcasts, there were situations where no time stamp was given for a specific play. We address that by waiting for the next play (in HTML) which is the previous play in real-life to be processed and we use that time
                if m[-1+r['minute_group']] in ['', None]:
                    remaining = None 
                    last_time_was_null = 1
                else:
                    
               
                    remaining =  60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                    quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                    #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                    #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                    pct_complete = float(game_elapsed)/3600.0
                    
                    if last_time_was_null and game_data['plays_captured'] != []:
                        start_i = -1
                        while abs(start_i) <= len(game_data['plays_captured']) and game_data['plays_captured'][start_i]['game_elapsed'] is None:
                            game_data['plays_captured'][start_i]['game_elapsed'] = game_elapsed
                            game_data['plays_captured'][start_i]['quarter_elapsed'] = quarter_elapsed
                            game_data['plays_captured'][start_i]['pct_complete'] = pct_complete
                   
                            start_i -= 1
                        
                        
                        
                    set_to_zero = quarter_elapsed == 900 if quarter < 5 else quarter_elapsed == 240

                    
                    if last_pct_complete is not None and pct_complete > last_pct_complete and set_to_zero:
                        print ("The last play was tagged at %.1f%% pct complete, and this one was at %.1f%% pct complete; set pct complete to %.1f%%" % (100. * last_pct_complete, 100.*pct_complete, 100. * last_pct_complete))
                        pct_complete = last_pct_complete
                        game_elapsed = last_game_elapsed

                    last_pct_complete = pct_complete
                    last_game_elapsed = game_elapsed
                    
                    last_time_was_null = 0
                play = {'ID': len(game_data['plays_captured']), 'duplicate': False, 'quarter_elapsed': quarter_elapsed, 'game_elapsed': game_elapsed, 'quarter': max(quarter,1), 'pct_complete': pct_complete}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]

                if '--show-plays' in sys.argv:
                    if remaining is not None and pct_complete is not None:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (ij+1, len(matches)), str(m), "N/A" if quarter is None else quarter, "%.1f%%" % (100.*pct_complete)))
                    else:
                        print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (ij+1, len(matches)), str(m), "N/A" if quarter is None else quarter, "???"))


                if "substitution:" not in detail and len(detail.strip()) > 5:
                    if i == 0:
                        #print("    %d) %s" % (ij, detail))
                        if ij == 0 and detail in end_of_period_strings:
                            end_of_period = True
                    #print ("\n%s" % play['play'])
                    play_match = sub_play_regex.search(detail)
                    if play_match is not None:
                        if play_match.group(3) is None:
                            detail = play_match.group(4)
                        else:
                            detail = "%s%s" % (play_match.group(3), play_match.group(4))

                        details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                        play['team']  = play_match.group(2)
                        play['detail'] = details

                        play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                        if play not in game_data['plays_captured']:
                            game_data['plays_captured'].append(play)
                    elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                        error_msg = "Error: the regex could not play_match on: %s" % (detail)
                        data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)

        qs += quarter_advance
    for r in game_data['plays_captured']:
        if len([1 for z in game_data['plays_captured'] if z['ID'] != r['ID'] and z['team'] == r['team'] and z['detail'] == r['detail'] and z['quarter_elapsed'] == r['quarter_elapsed']]) > 0:
            r['duplicate'] = True
    pct_duplicated = 0 if len(game_data['plays_captured']) == 0 else float(len([1 for z in game_data['plays_captured'] if z['duplicate']]))/float(len(game_data['plays_captured']))
    if '--use-archive' in sys.argv and '--show-plays' in sys.argv:
        print ("Pct Duplicated: %.2f" % pct_duplicated)
    
    if pct_duplicated < .25 or '--no-dups' in sys.argv or ('ignore_duplicate_plays_error' in game_data and game_data['ignore_duplicate_plays_error'] == 1):
        
        game_data['consecutive_quarter_duplications'] = 0
        
    else:
        #print ("There were too many plays that appear to have been captured twice (%.1f%%), skip this loop." % (pct_duplicated*100.))
        game_data['end_of_period'] = False
        game_data['plays_captured'] = []
        
        game_data['consecutive_quarter_duplications'] += 1
        if game_data['consecutive_quarter_duplications'] > 10:
            msg = "process_sidearm_plays identified too many plays that appear to have been captured twice (%.1f%%) in %s\n\nThis error has occurred %d consecutive times.\n\nIf this is an actual error, set the game to pending; if it's just an issue of not enough timestamps, set the ignore_duplicate_plays_error flag in LaxRef_Game_Streams to 1 so that the game can be processed going forward." % (pct_duplicated*100., game_data['consecutive_quarter_duplications'], game_data['description'])
            if msg not in data['telegram_messages']: send_telegram(msg, bot_token); telegram_alert(msg); data['telegram_messages'].append(msg)
        
        return data, game_data
    if game_data['end_of_period']:
        print ("\n\n\t\t\t\t END OF THE PERIOD !!!!!!!!!!!!!\n\n\n\n")
        
    if '--show-plays' in sys.argv:
        print ("\n\nFinal results of processing data(pre-parseplays)\n--------------------------------------")
        print ("\n".join(["{:<5}{:<10}{}".format(i, z['game_elapsed'], z['detail']) for z in game_data['plays_captured']]))
    return data, game_data

def calc_quarter_elapsed(q, remaining, game_data):
    women = 1 if "Women" in game_data['league'] else 0
    overtime_seconds = 240
    if women:
        overtime_seconds = 3 * 60 
        if game_data['game_date'].year in [2018, 2019, 2021]:
            overtime_seconds = 6 * 60 
 
    #print ("\n\nQuarter:   %d" % q)
    #print ("Remaining: %d" % remaining)
    if game_data['reverse_timestamps']:
    
        if women:
        
            quarter_elapsed = remaining
            if game_data['game_date'].year > 2021:
                game_elapsed = min(4, q - 1) * 900 + max(0, q-5)*overtime_seconds + quarter_elapsed
            else:
                game_elapsed = min(2, q - 1) * 1800 + max(0, q-3)*overtime_seconds + quarter_elapsed
        else:
            quarter_elapsed = remaining
            game_elapsed = min(4, q - 1) * 900 + max(0, q-5)*overtime_seconds + quarter_elapsed
    else:
    
        if women:
            if game_data['game_date'].year > 2021:
                quarter_elapsed = (900 if q < 5 else overtime_seconds) - remaining
                game_elapsed = min(4, q - 1) * 900 + max(0, q-5)*overtime_seconds + quarter_elapsed
            else:
                quarter_elapsed = (1800 if q < 3 else overtime_seconds) - remaining
                game_elapsed = min(2, q - 1) * 1800 + max(0, q-3)*overtime_seconds + quarter_elapsed
                
        else:
            quarter_elapsed = (900 if q < 5 else overtime_seconds) - remaining
            game_elapsed = min(4, q - 1) * 900 + max(0, q-5)*overtime_seconds + quarter_elapsed

    
    
    return quarter_elapsed, game_elapsed
    
def clean_data(play_data, game_data):

    play_data = play_data.replace("30:00", "15:00")
    play_data = play_data.replace("20:00", "15:00")

    play_data = play_data.replace("&amp,#39,", "'")
    play_data = play_data.replace("&amp;#39;", "'")
    play_data = play_data.replace("&amp;", "&")
    play_data = play_data.replace("&AMP;", "&")
    
    nfinal = len(play_data.upper().split("FINAL")) - 1 + len(play_data.upper().split("END-OF-PERIOD")) - 1 + len(play_data.upper().split("00:00")) - 1 + len(play_data.upper().split(">0:00")) - 1
    if game_data['html_final_cnt'] != nfinal:
        game_data['last_change_in_final_tags'] = time.time()
    game_data['html_final_cnt'] = nfinal
    
    nhalftime = len(play_data.upper().split("HALFTIME")) - 1 + len(play_data.upper().split("END-OF-PERIOD")) - 1 + len(play_data.upper().split("00:00")) - 1 + len(play_data.upper().split(">0:00")) - 1
    if game_data['html_halftime_cnt'] != nhalftime:
        game_data['last_change_in_halftime_tags'] = time.time()
    game_data['html_halftime_cnt'] = nhalftime
    
    
    
    if game_data['replacements'] is not None:
        #print ("\n\nGame: %s" % game_data['description'])
        #zc.print_dict(game_data['replacements'])
        #time.sleep(2)
        if '--log-game-replacement-text' in sys.argv:
            flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_changes_log_%07d.txt" % game_data['ID']), 'w')
            flog.write("\n@ %s\n\nThere are %d game replacement pairs\n\n%s" % (datetime.now().strftime("%H:%M:%S"), len(game_data['replacements']), json.dumps(game_data['replacements'], default=zc.json_handler, indent=2)))
            tmp_start_ms = time.time()
        n_changes = 0
        for pair in game_data['replacements']:
            
            if pair['from'] in play_data:
                if '--log-game-replacement-text' in sys.argv:
                    flog.write("\n\nFound a from string: %s" % pair['from'])
                    flog.write("\nReplace with: %s" % pair['to'])
                    loc = play_data.index(pair['from'])
                    flog.write("\nLoc in play_data: {:,}".format(loc))
                    flog.write("\nSurrounding Text:\n\n%s\n\n" % play_data[loc-300:loc+300])
                msg = "In live_win_odds.clean_data, replacing %s with %s (found: %s)" % (pair['from'], pair['to'], "yes" if pair['from'] in play_data else "no")
                #print (msg)
                play_data = play_data.replace(pair['from'], pair['to'])
                #zc.exit( play_data[loc-300:loc+300])
                if '--log-game-replacement-text' in sys.argv:
                    flog.write("\nSurrounding Text (after changes):\n\n%s\n\n" % play_data[loc-300:loc+300])
                #if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        if '--log-game-replacement-text' in sys.argv:
            flog.write("\n\nCompleted in %.5fs" % (time.time() - tmp_start_ms))
            flog.close()
    
    return play_data, game_data
    
    

def process_boxscore_plays(play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    if "<section id=\"play-by-play\" clas" in play_data:
        play_data = play_game_data[play_data.index("<section id=\"play-by-play\" clas"):]
    #if "</section>" in play_data:
    #    play_data = play_game_data[0:play_data.index("</section>")]

    #f = open('boxscore_play_data', 'w'); f.write(play_data); f.close()
    
    

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr>\s*\n\s*<th scope=\".*?\" class=\".*?\">\[([0-9]+):([0-9]+)\]</th>\s*\n+?\s*<td class=\".*?\" style=\"width:40%\">\s*([\s\S]*?)\s*</td>\s*\n+?\s*<td class=\".*?\">[\s\S]*?</td>\s*\n+\s*<td class=\".*?n\">[\s\S]*?</td>\s*\n+\s*<td class=\".*?\">[\s\S]*?</td>\s*\n+\s*<td class=\".*?\" style=\"width:40%\">\s*([\s\S]*?)\s*</td>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3, 'alt_play_group': 4})

    play_regexes.append({'regex': re.compile(r'<tr class=\".*?\"><td(?:.*?)?>(.*?)</td><td(?:.*?)?>([0-9]+?):([0-9]+?)</td><td class=\"icon\"><span class=\".*?\"></span></td><td(?:.*?)?>(.*?)</td>', re.IGNORECASE), 'minute_group': 2, 'second_group': 3, 'play_group': 1, 'alt_play_group': 4})

    play_regexes.append({'regex': re.compile(r'<tr class=\".*?\">[\r\n\s]*?<td(?:.*?)?>(?:([0-9]+?):([0-9]+?))?</td>[\r\n\s]*?<td(?:.*?)?>(.*?)</td>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3, 'alt_play_group': 3})

    terms = ["hide-on-large\">End-of-period.</td>", ">End-of-period"]
    max_split = None
    split_term = None
    for t in terms:
        if max_split is None or len(play_data.split(t)) > max_split or max_split:
            max_split = len(play_data.split(t))
            split_term = t
    

    play_data = play_data.split(split_term)

    game_data['plays_captured'] = []
    last_match = None
    max_quarter = 0
    for i, p in enumerate(play_data):


        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                pass
            if len(matches) > 0:
                max_quarter += 1
    quarter = 1
    last_remaining = 3600
    
    first_non_play_match = 1
    for i, p in enumerate(play_data):


        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
            
                final_quarter = quarter if game_data['flip_quarters'] else max_quarter - quarter + 1
                #print (m, final_quarter, max_quarter)
                
                if m[-1+r['minute_group']] in ['', None]:
                    remaining = last_remaining 
                else:
                    remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                    last_remaining = remaining
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(final_quarter, remaining, game_data)
                    
                    
                    
                #quarter_elapsed = (900 if final_quarter < 5 else 240) - remaining
                #game_elapsed = min(4, final_quarter - 1) * 900 + max(0, final_quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': final_quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)', re.IGNORECASE)
                detail = m[-1 + r['play_group']]
                if detail.strip() == "":
                    detail = m[-1 + r['alt_play_group']]
                last_match = detail
                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
            if len(matches) > 0:
                quarter += 1
    #print("Last match: %s" % last_match)
    #max_quarter = max([z['quarter'] for z in game_data['plays_captured']])
    #print ("Max quarter: %d\n" % max_quarter)
    #for i,r in enumerate(game_data['plays_captured']):
    #    print("Change quarter from %d to %d" % (r['quarter'], max_quarter - r['quarter'] + 1))
    #    game_data['plays_captured'][i]['quarter'] = max_quarter - r['quarter'] + 1

    game_data['end_of_period'] = True if last_match in end_of_period_strings else False
    return game_data 

end_of_period_strings = ["End-of-period.", "End of Period"]
def process_sportselect_plays(play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    
    if "<div id=\"shellTables_PBP\">" in play_data:
        play_data = play_game_data[play_data.index("<div id=\"shellTables_PBP\">"):]
        if "<div id=\"tab_content_teamStats\" class=\"contentTables\">" in play_data:
            play_data = play_game_data[0:play_data.index("<div id=\"tab_content_teamStats\" class=\"contentTables\">")]

    #f = open('sportselect_play_data', 'w'); f.write(play_data); f.close()


    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr class=\"(?:home|away)?\"><td class=\"index time\" valign=\"top\">([0-9]+):([0-9]+)</td><td class=\"vh [a-z]+? name\" valign=\"top\">(?:.*?)</td><td class=\"vh [a-z]+? score\" valign=\"top\">[0-9]+\s*-\s*[0-9]+</td><td class=\"[a-z]+? desc\" valign=\"top\">(.*?)</td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    play_data = play_data.split("End-of-period.<")

    game_data['plays_captured'] = []
    game_data['end_of_period'] = False
    first_non_play_match = 1
    for i, p in enumerate(play_data):

        quarter = len(play_data) - i
        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                #print m, quarter
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]

                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
    return game_data

def process_gametracker_plays(play_data, game_data):

    play_data, game_data = clean_data(play_data, game_data)
    
    if "<div id=\"play-by-play\"" in play_data:
        play_data = play_game_data[play_data.index("<div id=\"play-by-play\""):]
        if "<!-- TEAM STATS -->" in play_data:
            play_data = play_game_data[0:play_data.index("<!-- TEAM STATS -->")]
    #f = open('gametracker_play_data', 'w'); f.write(play_data); f.close()

    game_data['end_of_period'] = None
    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<div id=\".*?\" class=\".*?\">.*?<div class=\".*?\">(?:<img src=\".*?\" (?:onerror=\".*?\" /)?>)?</div><div class=\".*?\">([0-9]+):([0-9]+)(.*?)</div></div>'), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    #play_data = play_data.split("End of Period<")
    play_data = play_data.split('<div id="pbpDiv')


    game_data['plays_captured'] = []
    quarter = 1
    first_non_play_match = 1
    for i, p in enumerate(play_data):

        #quarter = len(play_data) - i
        some_matches_found = 0
        for r in play_regexes:
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                some_matches_found = 1
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                #print m, quarter, remaining, game_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)')
                detail = m[-1 + r['play_group']]
                if game_data['end_of_period'] is None:
                    game_data['end_of_period'] = True if detail in end_of_period_strings else False
                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif im == 0 and detail.strip() in end_of_period_strings:
                    game_data['end_of_period'] = True
                elif we_cant_ignore_unknown_play(game_data, detail):
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
        quarter += some_matches_found
    return game_data

def process_presto_plays(play_data, game_data, data):

    play_data, game_data = clean_data(play_data, game_data)
    
    
    if "<div class=\"pt-play-by-play clearfix\">" in play_data:
        play_data = play_data[play_data.index("<div class=\"pt-play-by-play clearfix\">"):]
    if "<div id=\"primetime-footer\" class=\"grid-row\">" in play_data:
        play_data = play_data[0:play_data.index("<div id=\"primetime-footer\" class=\"grid-row\">")]
    #f = open('presto_play_data', 'w'); f.write(play_data); f.close()

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr class=\".*?\"><td>(.*?)</td><td>(?:([0-9:]+):([0-9]+))?</td><td class=\"icon\"><span(?: class=\".*?\")?></span></td><td>(.*?)</td></tr>'), 'minute_group': 2, 'second_group': 3, 'play_group': 1, 'alt_play_group': 4})
    play_regexes.append({'regex': re.compile(r'<tr(?: class=\".*?\")>[\s\n]*<td(?: class=\".*?\")?>(?:([0-9:]+):([0-9]+))?</td>[\s\n]*<td(?: class=\".*?\")?>(.+?)</td>[\s\n]*</tr>'), 'minute_group': 1, 'second_group': 2, 'play_group': 3})

    quarter_tags = [{'tag': "End-of-period."}, {'tag': 'quarter</h1>'}]
    for q in quarter_tags:
        q['n'] = len(play_data.split(q['tag']))
        
    msg = "{:<30}{:<30}".format("Tag", "Quarters Found")
    msg += "\n" + ( "-" * 60)
    msg += "\n" + ("\n".join(["{:<30}{:<30}".format(z['tag'], z['n']) for z in quarter_tags]))
    quarter_tag = sorted(quarter_tags, key=lambda x:x['n'], reverse=True)[0]['tag']
    #zc.exit(msg)
    #quarter_tag = 'quarter</h1>'
    play_data = play_data.split(quarter_tag)

    
    game_data['plays_captured'] = []
    last_remaining = 900
    game_data['end_of_period'] = False
    if '--show-plays' in sys.argv:
        fmt = "{:<10}{:<40}{:<40}{:<40}{:<40}{:<10}".format("", "Group 1", "Group 2", "Group 3", "Group 4", "Quarter")
        print (fmt + "\n" + ("-" * 170))
    
    quarters_found = []
    # Check how the tags are laid out and determine whether we should use an offset or not. The min quarter value should be 1
    for i, p in enumerate(play_data):


        for j, r in enumerate(play_regexes):
            if j == 0:
                quarter = len(play_data) - i - 1
            else:
                quarter = i
            if quarter not in quarters_found:
                quarters_found.append(quarter)
    
    quarter_advance_offset = 0
    if len(quarters_found) > 0 and min(quarters_found) == 0 and '--no-quarter-advance' not in sys.argv:
        quarter_advance_offset = 1
    elif len(quarters_found) > 0 and min(quarters_found) == 2:
        quarter_advance_offset = -1
    
    if '--show-plays' in sys.argv and '-test' in sys.argv:
        print ("Quarters found: %s" % str(quarters_found))
        #zc.exit("quarter_advance_offset: %d" % quarter_advance_offset)
    
    plays_found_by_quarter = {}
    for i, p in enumerate(play_data):

        for j, r in enumerate(play_regexes):
            if j == 0:
                quarter = len(play_data) - i - 1
            else:
                quarter = i
            
            quarter += quarter_advance_offset
            
            matches = re.findall(r['regex'], p)
            #print ("Quarter %d: %d plays" % (quarter, len(matches)))
            plays_found_by_quarter[quarter] = len(matches)
    
    # If the 1st step of the logic dictated an extra quarter offset, we should check that the first quarter actually has plays recorded; if it doesn't, then the logic was probably not correct in identifying the need for this game.
    if 1 in plays_found_by_quarter and 2 in plays_found_by_quarter and plays_found_by_quarter[2] > 0 and plays_found_by_quarter[1] == 0:
        quarter_advance_offset -= 1
    
    if '--show-plays' in sys.argv and '-test' in sys.argv:
        print ("Plays found by quarter")
        zc.print_dict(plays_found_by_quarter)
        zc.exit("quarter_advance_offset: %d" % quarter_advance_offset)
        
    first_non_play_match = 1
    for i, p in enumerate(play_data):


        for j, r in enumerate(play_regexes):
            if j == 0:
                quarter = len(play_data) - i - 1
            else:
                quarter = i
            
            quarter += quarter_advance_offset
            
            matches = re.findall(r['regex'], p)
            for im, m in enumerate(matches):
                if '--show-plays' in sys.argv:
                    #print m, quarter
                    if len(m) > 3:
                        print ("regex{:<5}{:<40}{:<40}{:<40}{:<40}{:<10}".format(j, m[0][0:37], m[1][0:37], m[2][0:37], m[3][0:37], quarter))
                    else:
                        print ("regex{:<5}{:<40}{:<40}{:<40}{:<40}{:<10}".format(j, m[0][0:37], m[1][0:37], m[2][0:37], "", quarter))
                if m[-1+r['minute_group']] in ['', "&nbsp;", None]:
                    remaining = last_remaining
                else:
                    remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                last_remaining = remaining
                quarter_elapsed, game_elapsed = calc_quarter_elapsed(quarter, remaining, game_data)
                #quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                #game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': float(game_elapsed)/3600.0}

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)\_]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)', re.IGNORECASE)
                detail = m[-1 + r['play_group']]
                if detail.strip() in ["", "&nbsp;"]:
                    detail = m[-1 + r['alt_play_group']]

                #print ("\n%s" % play['play'])
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)
                    play['detail'] = details

                    tmp = play_match.group(1)
                    while "  " in tmp:
                        tmp = tmp.replace("  ", " ")
                    while "  " in detail:
                        detail = detail.replace("  ", " ")
                    while "  " in details:
                        details = details.replace("  ", " ")

                    play['event_type'], translate_msg = laxref.translate_event_type(tmp, detail, details, {'league': game_data['league']})
                    if play not in game_data['plays_captured']:
                        game_data['plays_captured'].append(play)
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
            if len(matches) > 0:
                break
    return game_data, data

def mark_game_over(game_data):
    #cursor = zc.zcursor("LR")
    query = "UPDATE LaxRef_Active_Live_WP_Games set game_ended=1 where game_ID=%s"
    param = [game_data['ID']]
    #cursor.execute(query, param)
    #cursor.commit(); cursor.close()
    update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
    return game_data

def print_plays(plays):
    for p in plays:
        print("At %.4f elapsed, %s did %s (%s) (Quarter=%d)" % (p['pct_complete'], p['team'], p['event_type'], p['detail'], p['quarter']))
        
def initialize_game_browser_tab(game_data, browser, data):
    try:
        if game_data['window_handle'] is None:
            if not data['initializing_first_tab'] and '--single-window-execution' not in sys.argv:
                game_data['window_handle'] = add_tab(browser, data)
                browser.switch_to.window(game_data['window_handle'])
            else:
                game_data['window_handle'] = browser.window_handles[0]

            # Tells the script that the next time you need to initialize a new game, you'll need to physically add a tab.
            data['initializing_first_tab'] = 0
            
            print ("There are now %d windows open ( and %d games )" % (len(browser.window_handles), len(data['games']) ))
    except Exception:
        game_data['window_handle'] = None
        msg = "Failed to initialize a browser tab for %s.\n\n%s" % (game_data['description'], traceback.format_exc())
        
        
        if msg not in data['telegram_messages']: 
            print (msg); zc.send_crash(msg, bot_token); data['telegram_messages'].append(msg)
            try:
                if '-execution' in sys.argv:
                    tmp_msg = "Failed to initialize a browser tab for %s (%s)" % (game_data['description'], sys.argv[sys.argv.index('-execution') + 1])
                    telegram_alert(tmp_msg)
            except Exception:
                 telegram_alert(traceback.format_exc())
        
    return game_data, browser, data
    
def view_site_xlive(browser, game_data, data):
    fn = "view_site_xlive"
    process_step = {'result': "", 'desc': "View Site XLIVE", 'points': []}

    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: 
            process_step['result'] = "No Window Handle"
            process_step['points'].append({'txt': "game_data['window_handle'] is None: %s" % (game_data['window_handle'] is None)})
            game_data['processing_log']['steps'].append(process_step)
            if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
            return game_data
        
        try:
            browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
            try:
                browser.execute_script("document.body.style.zoom='90%'")
            except Exception:
                msg = "In trying to set zoom to 90%, an error occurred\n\n%s" % (traceback.format_exc())
                print (msg)
        except Exception:
            
            msg = "Initial browser load failed in %s; will try again next time." % game_data['description']
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
            process_step['result'] = "Browser failed to load"
            game_data['processing_log']['steps'].append(process_step)
            
            if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
            return game_data
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
    
    
    game_data['loops'] += 1
    #print ("Loop #%d" % game_data['loops'])

    try:


        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        page_source = ""
        
        try:
            elems = browser.find_elements(By.ID, "plays")
            if len(elems) > 0:
                page_source = elems[0].text 
            game_data['consecutive_selenium_fails'] = 0
        except Exception:
            game_data['consecutive_selenium_fails'] += 1
            page_source = None
            if game_data['consecutive_selenium_fails'] % 20 == 0:
                msg = "In %s (%s), we have had %d consecutive selenium scraping errors." % (game_data['description'], local_fn, game_data['consecutive_selenium_fails'])
                msg += "\n\nMost Recent Error:\n%s" % (traceback.format_exc())
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
        page_source = page_source.replace("2-point GOAL", "GOAL")

        process_step['points'].append({'txt': "Read {:,} total chars" .format( len(page_source))})
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        

        if page_source is not None:
            data, game_data = process_xlive_plays(data, page_source, game_data)
            process_step['result'] = "PAGE SOURCE READ"
        else:
            process_step['result'] = "NO PAGE SOURCE"
            
        if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
            # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
            try:
                if game_data['archive_dir'] is not None:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                
                if game_data['attachments'] is None: game_data['attachments'] = []
                game_data['attachments'].append(arch_path)
            except Exception:
                msg = traceback.format_exc()
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        


        process_step['points'].append({'txt': "End of quarter: {}" .format(game_data['end_of_period'] == 1)})
        if game_data['end_of_period']:
            print("We are at the end of the quarter...")
        
        # Record this so that we know that a full scrape happened; for end-of-game detection purposes
        process_step['points'].append({'txt': "Scrape of {} plays marked @ {:.0f}" .format(len(game_data['plays_captured']), time.time())})
        if len(game_data['plays_captured']) > 0 and 'detail' in game_data['plays_captured'][-1]:
            process_step['points'].append({'txt': "Last play: {}" .format(game_data['plays_captured'][-1]['detail'])})
        n_goals = len([1 for z in game_data['plays_captured'] if 'detail' in z and z['detail'] is not None and z['detail'].startswith("Goal")])
        process_step['points'].append({'txt': "Total Goals found: {}" .format(n_goals)})
        
        if len(game_data['plays_captured']) >= game_data['num_plays']: 
            game_data['last_successful_scrape'] = time.time()
            
        
        process_step['points'].append({'txt': "Fresh data requires update (via parse_plays) if we found new plays (%s) or the game has been finalized in the DB but not in the LWO script (%s); result=%s" % (len(game_data['plays_captured']) > game_data['num_plays'], (game_data['db_game_over'] and not game_data['finalized']), len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']))})
        if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
            game_data['num_plays'] = len(game_data['plays_captured'])

            if '--use-archive' in sys.argv and '--use-play-log' not in sys.argv:
                f_play_cnt.write("{:<15}{:>10}{:>10}\n".format("Loop %d" % game_data['loops'], "%d" % len(game_data['plays_captured']), game_data['end_of_period']))
            game_data['non_update_loops'] = 0;

            #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                
            game_data = parse_plays(browser, game_data, data)
            if game_data['game_over'] and game_data['game_over_at'] is None:
                game_data['game_over_at'] = game_data['loops']
                print("Game over!!!!! we are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 80))
                game_data = mark_game_over(game_data)
            
        
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        process_step['points'].append({'txt': "Loops since last parse set to %s" % (game_data['loops_since_last_parse'])})
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
        process_step['points'].append({'txt': "Error: %s" % traceback.format_exc()})
    
    if len(data['games']) > 1:
        refresh_keys(browser, game_data, data)
    #time.sleep(game_data['sleep_duration'])
    
    # Add in some parsing logs that may have been created on a previous loop if their respective steps were not run this time around.
    if 'Parse Plays' not in [z['desc'] for z in game_data['processing_log']['steps']]:
        game_data['processing_log']['steps'].append(game_data['last_parse_process_step'])
    
    if 'pct_complete' in game_data and game_data['pct_complete'] is not None and game_data['pct_complete'] > .97:
        game_data['processing_log']['steps'].append(game_data['last_check_for_finals_step'])
    
    game_data['processing_log']['steps'].append(process_step)
    if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
    return game_data
    
def view_site_sidearm(browser, game_data, data):
    process_step = {'result': "", 'desc': "View Site Sidearm", 'points': []}

    # IF we are using a single window-execution, it means that for each time through the loop, the browser will change urls to each game rather than flit between browser windows (to save memory). If that is the case, then each time through the view_site* functions, we will need to actually load the URL.

    reloaded = 0
    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: 
            process_step['result'] = "No Window Handle"
            process_step['points'].append({'txt': "game_data['window_handle'] is None: %s" % (game_data['window_handle'] is None)})
            game_data['processing_log']['steps'].append(process_step)
            if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
            return game_data
        
        try:
            reloaded = 1
            browser.get(game_data['url']); print("Page loading, wait for 10 seconds..."); time.sleep(10)
            
        except Exception:
            
            msg = "Initial browser load failed in %s; will try again next time." % game_data['description']
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
            process_step['result'] = "Browser failed to load"
            game_data['processing_log']['steps'].append(process_step)
            
            if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
            return game_data
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        reloaded = 1
        browser.get(game_data['url']); print("Page loading, wait for 10 seconds..."); time.sleep(10)
    
    
    try:
        elems = browser.find_elements(By.CSS_SELECTOR, 'i[class="sf-play-by-play-alt-minimal"]')
        if '--debug-sidearm' in sys.argv:
            print ("\n\nFound %d pxp icons\n\n" % len(elems))
    
    except Exception:
        elems = []
        if 'detached' in traceback.format_exc():
            msg = "Failed trying to do a css selector search in %s (the issue was a detached target frame)" % game_data['description']; print (msg)
        else:
            msg = "Failed trying to do a css selector search in %s (unclear what the issue was)\n\n%s" % (game_data['description'], traceback.format_exc())
        msg += "\n\nThis loop will attempt to continue processing, but it may not work."
        print (msg)
        #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        

    # If we are already loading the sidearm pxp as the url for the game itself, we don't need to click over to the pxp link
    try_for = 2
    success = 0
    pxp_attempts = 0
    start_try_ms = time.time()
    while time.time() - start_try_ms < try_for and not success:
        
        for e in elems:
            try:
                e.click(); time.sleep(.1); success = 1; break;
            except Exception:
                print (traceback.format_exc())
                pass
    
        if not success:
            time.sleep(.1)
        pxp_attempts += 1
    
    if success:
        print ("Passed the pxp click test on attempt #%d" % (pxp_attempts))
    else:
        print ("Failed to click the pxp link")
      
    # If we reloaded the page, then we need to try and click out of the transcend
    if reloaded or (success and 'loops_since_last_parse' in game_data and game_data['loops_since_last_parse'] is not None and game_data['loops_since_last_parse'] > 60 and game_data['loops_since_last_parse'] % 10 == 0) or (not success and game_data['loops'] % 20 == 0):      
        # It may have been because of "Close out the cookie warning dialog"
        try:
            print ("Look for cookie warning...")
            elems = browser.find_elements(By.CSS_SELECTOR, "div[id='transcend-consent-manager']")
            if len(elems) > 0:
                elem = elems[0]
                print ("Hide cookie modal...")
                browser.execute_script("arguments[0].style.display = 'none';", elem )
            
        except Exception:
            msg = "In {}, failed trying to click out of the cookie warning".format(game_data['description'])
            if msg not in data['telegram_messages']: print (traceback.format_exc()); telegram_alert(traceback.format_exc()); zc.send_telegram(traceback.format_exc(), bot_token); data['telegram_messages'].append(msg)
        
            process_step['points'].append({'txt': "Error: %s" % traceback.format_exc()})



    game_data['loops'] += 1
    #print ("Loop #%d" % game_data['loops'])
    
    try:



        # If you see a button with text = 'x', click it

        elems_close_box = browser.find_elements(By.TAG_NAME, "button")
        #print ("\n\n There are %d buttons: %s\n\n" % (len(elems_close_box), str([z.text for z in elems_close_box])))

        x_symbol = u'\xd7'
        for e in [z for z in elems_close_box if z.text in [x_symbol, "x"]]:

            try:
                e.click(); time.sleep(.1); break
            except Exception:
                pass

        elems_close_box = browser.find_elements(By.ID, "close-button")
        #if len(elems_close_box) > 0:
        #    msg = "Found an id=close-button in %s" % game_data['description']; print (msg)
        #    #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
        for e in elems_close_box:

            try:
                e.click(); time.sleep(.1);
                #print ("Clicked the id=close-button")
            except Exception:
                pass
                #msg = "Failed to click id=close-button in %s\n\n%s" % (game_data['description'], traceback.format_exc()); print (msg)
                #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
        process_step['points'].append({'txt': "Error: %s" % traceback.format_exc()})
    
    try:
        num_elements = len(browser.find_elements(By.CSS_SELECTOR, 'h2[class="c-scoring-plays__header"]'))
        print("There were %d period links to scrape" % num_elements)
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        page_source = ""
        
        try:
            snips = [""] * num_elements
            for i in range(num_elements):
                print ("Get period %d" % (i+1))
                elements = browser.find_elements(By.CSS_SELECTOR, 'h2[class="c-scoring-plays__header"]')
                e = elements[i]
                txt = e.text
                if '\n' in txt: txt = txt.split("\n")[0]
                #print "period plays", i, txt
                
                try:
                    e.click()
                except Exception:
                    msg = "Error clicking a period icon in live_win_odds.py view_site_sidearm (%s)." % game_data['description']
                    full_msg = "Error clicking a period icon in live_win_odds.py view_site_sidearm (%s).  Typically, when this step fails, it's because there was an overlay that is blocking us from clicking on a period link. This is usually resolved by just clicking the x-out button manually. Although it would be good to record the class/id so we can resolve it automatically. Error detail below:\n\n%s" % (game_data['description'], traceback.format_exc())
                    print ("Could not click period plays #%d" % (i))
                    if msg not in data['telegram_messages']: zc.send_telegram(full_msg, bot_token); data['telegram_messages'].append(msg)
                    
                time.sleep(.5)
                tmp = "<Start of Period>%s" % remove_non_ascii(browser.page_source)
                if tmp not in snips:
                    snips[num_elements - i - 1] = tmp
                else:
                    print ("Duplicate content!!!"); time.sleep(5)
            page_source = "\n".join(snips)    
            game_data['consecutive_selenium_fails'] = 0
        except Exception:
            game_data['consecutive_selenium_fails'] += 1
            page_source = None
            if game_data['consecutive_selenium_fails'] % 20 == 0:
                msg = "In %s (%s), we have had %d consecutive selenium scraping errors." % (game_data['description'], local_fn, game_data['consecutive_selenium_fails'])
                msg += "\n\nMost Recent Error:\n%s" % (traceback.format_exc())
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
        if page_source is not None:
            page_source = page_source.replace("2-point GOAL", "GOAL")

        process_step['points'].append({'txt': "Read {:,} total chars from {} periods" .format( len(page_source), num_elements)})
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        

        if page_source is not None:
            data, game_data = process_sidearm_plays(data, page_source, game_data)
            process_step['result'] = "PAGE SOURCE READ"
        else:
            process_step['result'] = "NO PAGE SOURCE"
            
        if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
            # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
            try:
                arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                
                if game_data['attachments'] is None: game_data['attachments'] = []
                game_data['attachments'].append(arch_path)
            except Exception:
                msg = traceback.format_exc()
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        


        process_step['points'].append({'txt': "End of quarter: {}" .format(game_data['end_of_period'] == 1)})
        if game_data['end_of_period']:
            print("We are at the end of the quarter...")
        
        # Record this so that we know that a full scrape happened; for end-of-game detection purposes
        process_step['points'].append({'txt': "Scrape of {} plays marked @ {:.0f}" .format(len(game_data['plays_captured']), time.time())})
        if len(game_data['plays_captured']) > 0 and 'detail' in game_data['plays_captured'][-1]:
            process_step['points'].append({'txt': "Last play: {}" .format(game_data['plays_captured'][-1]['detail'])})
        n_goals = len([1 for z in game_data['plays_captured'] if 'detail' in z and z['detail'] is not None and z['detail'].startswith("Goal")])
        process_step['points'].append({'txt': "Total Goals found: {}" .format(n_goals)})
        
        if len(game_data['plays_captured']) >= game_data['num_plays']: 
            game_data['last_successful_scrape'] = time.time()
            
        
        process_step['points'].append({'txt': "Fresh data requires update (via parse_plays) if we found new plays (%s) or the game has been finalized in the DB but not in the LWO script (%s); result=%s" % (len(game_data['plays_captured']) > game_data['num_plays'], (game_data['db_game_over'] and not game_data['finalized']), len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']))})
        if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
            game_data['num_plays'] = len(game_data['plays_captured'])

            if '--use-archive' in sys.argv and '--use-play-log' not in sys.argv:
                f_play_cnt.write("{:<15}{:>10}{:>10}\n".format("Loop %d" % game_data['loops'], "%d" % len(game_data['plays_captured']), game_data['end_of_period']))
            game_data['non_update_loops'] = 0;

            #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                
            game_data = parse_plays(browser, game_data, data)
            if game_data['game_over'] and game_data['game_over_at'] is None:
                game_data['game_over_at'] = game_data['loops']
                print("Game over!!!!! we are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 80))
                game_data = mark_game_over(game_data)
            
        
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        process_step['points'].append({'txt': "Loops since last parse set to %s" % (game_data['loops_since_last_parse'])})
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
        process_step['points'].append({'txt': "Error: %s" % traceback.format_exc()})
    
    # On Feb 9th, 2024, I commented out this step; We used to do a refresh every time to ensure that new data was being pulled up, but when they added the Cookie Disclaimer modal, a refresh each loop was much more expensive to deal with; Risk here is that without a refresh, the data won't update on its own; we'll just have to keep an eye on that (hopefully adding extra VMs will reduce the memory load on each and allow the natural sidearm data refreshing to work)
    #if len(data['games']) > 1:
    #    refresh_keys(browser, game_data, data)
    
    # On Feb 20th, 2024, I added the below. Since we were no longer doing a refresh after every iteration, we weren't catching the situations where the game stopped refreshing on its own. If we see a sufficiently long delay since the last update, run a refresh
    if 'loops_since_last_parse' in game_data and game_data['loops_since_last_parse'] is not None and game_data['loops_since_last_parse'] > 0 and game_data['loops_since_last_parse']  % 30 == 0:
        # If we haven't seen a parse in 30 loops, do a refresh
        refresh_keys(browser, game_data, data)
        print("Page loading, wait for 20 seconds..."); time.sleep(20)
        
        # And now we have to close the cookie dialog if it's visible
        try:
            print ("Look for cookie warning...")
            elems = browser.find_elements(By.CSS_SELECTOR, "div[id='transcend-consent-manager']")
            if len(elems) > 0:
                elem = elems[0]
                print ("Hide cookie modal...")
                browser.execute_script("arguments[0].style.display = 'none';", elem )
            
        except Exception:
            msg = "In {}, failed trying to click out of the cookie warning".format(game_data['description'])
            if msg not in data['telegram_messages']: print (traceback.format_exc()); telegram_alert(traceback.format_exc()); zc.send_telegram(traceback.format_exc(), bot_token); data['telegram_messages'].append(msg)
        
            process_step['points'].append({'txt': "Error: %s" % traceback.format_exc()})


    # Add in some parsing logs that may have been created on a previous loop if their respective steps were not run this time around.
    if 'Parse Plays' not in [z['desc'] for z in game_data['processing_log']['steps']]:
        game_data['processing_log']['steps'].append(game_data['last_parse_process_step'])
    
    if 'pct_complete' in game_data and game_data['pct_complete'] is not None and game_data['pct_complete'] > .97:
        game_data['processing_log']['steps'].append(game_data['last_check_for_finals_step'])
    
    game_data['processing_log']['steps'].append(process_step)
    if '--debug-sidearm' in sys.argv: zc.print_dict(process_step)
    return game_data
    

def refresh_keys(browser, game_data, data):
    
    
    try:
        browser.get(game_data['url']); return game_data
        body_tags = browser.find_elements(By.TAG_NAME, "body")
        for elem in body_tags:
            try:
                #elem.send_keys(Keys.CONTROL, 'r');
                elem.send_keys(Keys.F5);
                msg = "Sent Refresh keys in %s" % game_data['description']
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                return game_data
            except Exception:
                pass
        msg = "Failed to send Refresh keys in %s" % game_data['description']
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    except Exception:
        pass
    return game_data
    
def view_site_boxscore(browser, game_data, data):

    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: return game_data
        
        browser.get(game_data['url']); print("Page loading, wait for 20 seconds..."); time.sleep(5)
        pxps = browser.find_elements(By.CSS_SELECTOR, 'a[href="%s"]' % "#pbp-tabs")
        try:
            browser.execute_script("document.body.style.zoom='70%'")
        except Exception:
            msg = "In trying to set zoom to 70%, an error occurred\n\n%s" % (traceback.format_exc())
            print (msg)
        
        if len(pxps) > 0:
            for p in pxps:
                try:
                    p.click(); time.sleep(1)
                    break
                except Exception:
                    pass
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
        
    

    game_data['loops'] += 1
    try:
        game_data['flip_quarters'] = 0 
        pbps = browser.find_elements(By.ID, "pbp")
        if pbps != []: 
            game_data['flip_quarters'] = 1; 
            pbps[0].click(); time.sleep(1.25)
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        page_source = remove_non_ascii(browser.page_source)
        
        if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
            # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
            try:
                arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                
                if game_data['attachments'] is None: game_data['attachments'] = []
                game_data['attachments'].append(arch_path)
            except Exception:
                msg = traceback.format_exc()
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    
        game_data = process_boxscore_plays(page_source, game_data)
        
        print ("   Found %d plays" % (len(game_data['plays_captured'])))
        # Record this so that we know that a full scrape happened; for end-of-game detection purposes
        if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
        
        if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
            
            game_data['num_plays'] = len(game_data['plays_captured'])
            

            
            if len(game_data['plays_captured']) > 0:
                game_data = parse_plays(browser, game_data, data)
                if game_data['game_over'] and game_data['game_over_at'] is None:
                    game_data['game_over_at'] = loops
                    print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 400))
                    game_data = mark_game_over(game_data)
                game_data['non_update_loops'] = 0
            
        else:
            game_data['non_update_loops'] += 1
            if 'last_parse' in game_data and time.time() - game_data['last_parse'] > 180 and '--use-archive' not in sys.argv: 
                print("\t\tNo updates for 3 mins, refreshing page...")
                game_data['non_update_loops'] = 0
                browser.get(game_data['url']); time.sleep(2)
                
                pxps = browser.find_elements(By.CSS_SELECTOR, 'a[href="%s"]' % "#pbp-tabs")
                print ("PBP Tabs: %d" % (len(pxps)))
                if len(pxps) > 0:
                    for p in pxps:
                        try:
                            p.click(); time.sleep(1)
                            print ("Clicked the pxp tab")
                            break
                        except Exception:
                            pass
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        
        
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


 

    return game_data
    
def view_site_statbroadcast(browser, game_data, data):
    local_fn = "view_site_statbroadcast"
    process_step = {'result': "", 'desc': "View Site StatBroadcast", 'points': []}
    if browser is None: 
        passed = True
    else:
        
        if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
            game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
            if game_data['window_handle'] is None: 
                process_step['result'] = "No Window Handle"
                process_step['points'].append({'txt': "game_data['window_handle'] is None: %s" % (game_data['window_handle'] is None)})
                game_data['processing_log']['steps'].append(process_step)
                if '--print-process-step' in sys.argv:
                    zc.print_dict(process_step)
                return game_data
            
            browser.get(game_data['url']); print("Page loading, wait for 30 seconds..."); time.sleep(30)
            
            """ REMOVED on Feb 24, 2024; this is causing more issues than it's solving since it's crashing so frequently when we try and check if it exists
            if '/broadcast/' not in game_data['url'] and '/BROADCAST/' not in game_data['url']:
                # There is a modal panel that pops up if you use a statbroadcast link with statmonitr in it; if you use the correct url, you can skip this step
                print ("Check for the broadcast panel")
                elems = browser.find_elements(By.CSS_SELECTOR, 'a[href*="broadcast/index"]')
                if len(elems) > 0:
                    print ("click the %s link" % elems[0].text)
                    #msg = "In %s, click the %s link" % (game_data['description'], elems[0].text)
                    #if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    elems[0].click() 
                    tmp_start_ms = time.time()
                    while len(browser.find_elements(By.ID, '_lcgame_pxp')) == 0 and time.time() - tmp_start_ms < 20:
                        time.sleep(1)
            """    
                    
            game_data['initial_load'] = 0
        elif game_data['url_change']:
            game_data['url_change'] = 0
            
            browser.get(game_data['url']); print("Page loading, wait for 30 seconds..."); time.sleep(30)
            
            """ REMOVED on Feb 24, 2024; this is causing more issues than it's solving since it's crashing so frequently when we try and check if it exists
            if '/broadcast/' not in game_data['url'] and '/BROADCAST/' not in game_data['url']:
                # There is a modal panel that pops up if you use a statbroadcast link with statmonitr in it; if you use the correct url, you can skip this step
                elems = browser.find_elements(By.CSS_SELECTOR, 'a[href*="broadcast/index"]')
                if len(elems) > 0:
                    print ("click the %s link" % elems[0].text)
                    #msg = "In %s, click the %s link" % (game_data['description'], elems[0].text)
                    #if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    elems[0].click() 
                    tmp_start_ms = time.time()
                    while len(browser.find_elements(By.ID, '_lcgame_pxp')) == 0 and time.time() - tmp_start_ms < 20:
                        time.sleep(1)
            """
    
        passed = False; attempts = 0

        EXECUTE_ON_LOAD_CHECKS=0
        
        if EXECUTE_ON_LOAD_CHECKS:
            try:
                # first check to see if the loading dialog is still showing
                if browser.find_element(By.ID, "loadingDialog") is not None:
                    # Since the loading dialog was still shown, wait another 10 seconds and then try
                    msg = "In %s (%s), we were going to try and click the pxp link, but the loading dialog was still being shown, so we are going to wait 10 seconds and hopefully the game data will have loaded by then." % (game_data['description'], local_fn)
                    #if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    time.sleep(10)
                
                # Then, get rid of the cookies message\
                try:
                    if len(browser.find_elements(By.ID, "acceptcookies")) > 0:
                        # Since the loading dialog was still shown, wait another 10 seconds and then try
                        
                        msg = "In %s (%s), we were going to try and click the accept cookies button." % (game_data['description'], local_fn)
                        #if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                        browser.find_elements(By.ID, "acceptcookies")[0].click();
                        time.sleep(.5)
                except Exception:
                    msg = "In %s (%s), we failed to click the acceptcookies button:\n\n%s." % (game_data['description'], local_fn, traceback.format_exc())
                    #if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
                # If there are any obvious ad overlays, try and click out of them
                try:
                    if len(browser.find_elements(By.CSS_SELECTOR, 'a[aria-label="%s"]' % "Close Ad")) > 0:
                        browser.find_element(By.CSS_SELECTOR, 'a[aria-label="%s"]' % "Close").click()
                        time.sleep(.5)
                except Exception:
                    msg = "In %s (%s), we failed to click the button to close an ad overlay:\n\n%s." % (game_data['description'], local_fn, traceback.format_exc())
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
                

            except Exception:
                process_step['result'] = "NO PXP LINK (ERR)"
                msg = "In %s (%s), we failed to move the screen to the pxp panel:\n\n%s." % (game_data['description'], local_fn, traceback.format_exc())
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                pass
        try:
            if '--debug-pxp-buttons' in sys.argv:
                print ("   Find pxp section button")
                        
            elem = browser.find_element(By.ID, '_lcgame_pxp')
            if elem is not None:
                if '--debug-pxp-buttons' in sys.argv:
                    print ("   Click pxp section button")
                elem.click(); time.sleep(.25)
                passed = True
            else:
                passed = False
                process_step['result'] = "NO PXP LINK (NONE)"
                
                #print("Successfully clicked the pxp link...")
        except Exception:
            process_step['result'] =  "NO PXP LINK (ERR)"
            
    game_data['loops'] += 1
    #if game_data['loops'] == 15:
    #    zc.send_telegram(format_snap(game_snapshot(game_data)), bot_token)
    if not passed:
        if game_data['loops'] > 5 and (game_data['last_error_msg_timestamp'] is None or (datetime.now() - game_data['last_error_msg_timestamp']).total_seconds() > 600):
            msg = "The lcgame_pxp link never appeared for the %s game" % game_data['game_file']
            msg += "\n\nAdmin URL: %s" % (game_data['admin_cockpit_url'])
            msg += "\n\nLive Stats URL: %s" % (game_data['url'])
            
            zc.send_telegram(msg, bot_token)
            game_data['last_error_msg_timestamp'] = datetime.now()
            browser.get(game_data['url']); print ("Reload page...")
            
            try:
                elems = browser.find_elements(By.ID, '_lcgame_pxp')
                if len(elems) > 0:
                    
                    elems[0].click(); time.sleep(.25)
                    passed = True
                else:
                    passed = False
                    process_step['result'] = "NO PXP LINK (NONE)"
                    
                    #print("Successfully clicked the pxp link...")
            except Exception:
                process_step['result'] =  "NO PXP LINK (ERR)"
    else:
    
        try:
            page_source = None
            if '--use-archive' in sys.argv:
                page_source = open('statbroadcast_page_source', 'r').read()
            else:
                
                
                USE_CONSEC_APPROACH = 1
                if not USE_CONSEC_APPROACH:
                
                    num_elements = len([z for z in browser.find_elements(By.CSS_SELECTOR, 'button[parent="%s"]' % "pxp") if z.get_attribute("rel") not in ['pxp']])
                
                    # Record the timestamp that the page source was read
                    game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
            
            
                    process_step['points'].append({'txt': "There were %d period links to scrape" % num_elements})
                    snips = [""] * num_elements
                    
                    for i in range(num_elements):
                        #print ("Get period %d/%d" % (i+1, num_elements))
                        elements = [z for z in browser.find_elements(By.CSS_SELECTOR, 'button[parent="%s"]' % "pxp") if z.get_attribute("rel") not in ['pxp']]
                        e = elements[i]
                        if '--skip-button-2' in sys.argv and i == 2:
                            continue
                        #print ("  %s" % e.get_attribute("rel"))
                        e.click()
                        time.sleep(.45)
                        snips[num_elements - i - 1] = remove_non_ascii(browser.page_source)
                    page_source = "\n".join(snips)
                    process_step['points'].append({'txt': "Read {:,} total chars from {} periods" .format( len(page_source), num_elements)})
                else:
                    try:
                        if '--debug-pxp-buttons' in sys.argv:
                            print ("   Retrive pxp button elements")
                        pxp_elems = [z for z in browser.find_elements(By.CSS_SELECTOR, 'button[parent="%s"]' % "pxp") if z.get_attribute("rel") not in ['pxp']]
                        if '--debug-pxp-buttons' in sys.argv:
                            print ("   Calculate n pxp button elements")
                        num_elements = len(pxp_elems)
                
                        # Record the timestamp that the page source was read
                        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
                
                
                        process_step['points'].append({'txt': "There were %d period links to scrape" % num_elements})
                        snips = [""] * num_elements
                        for i in range(num_elements):
                            if '--debug-pxp-buttons' in sys.argv:
                                print ("       Get period %d/%d" % (i+1, num_elements))
                            elements = [z for z in browser.find_elements(By.CSS_SELECTOR, 'button[parent="%s"]' % "pxp") if z.get_attribute("rel") not in ['pxp']]
                            e = elements[i]
                            if '--skip-button-2' in sys.argv and i == 2:
                                continue
                            #print ("  %s" % e.get_attribute("rel"))
                            e.click()
                            time.sleep(.45)
                            snips[num_elements - i - 1] = remove_non_ascii(browser.page_source)
                        page_source = "\n".join(snips)
                        game_data['consecutive_selenium_fails'] = 0
                    except Exception:
                        game_data['consecutive_selenium_fails'] += 1
                        page_source = None
                        if game_data['consecutive_selenium_fails'] % 20 == 0:
                            msg = "In %s (%s), we have had %d consecutive selenium scraping errors." % (game_data['description'], local_fn, game_data['consecutive_selenium_fails'])
                            msg += "\n\nMost Recent Error:\n%s" % (traceback.format_exc())
                            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    if page_source is not None:    
                        process_step['points'].append({'txt': "Read {:,} total chars from {} periods" .format( len(page_source), num_elements)})

                #f = open('statbroadcast_page_source', 'w'); f.write(page_source); f.close()
           
            if page_source is not None:
                process_step['result'] = "PAGE SOURCE READ"
                
                game_data = process_statbroadcast_plays(page_source, game_data, data, False, [])

                
            
                if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                    # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                    
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                
                # Record this so that we know that a full scrape happened; for end-of-game detection purposes
                if len(game_data['plays_captured']) >= game_data['num_plays']: 
                    game_data['last_successful_scrape'] = time.time()
                    process_step['points'].append({'txt': "Successful scrape of {} plays marked @ {:.0f}" .format(game_data['num_plays'], time.time())})
                    
                process_step['points'].append({'txt': "Fresh data requires update (via parse_plays) if we found new plays (%s) or the game has been finalized in the DB but not in the LWO script (%s); result=%s" % (len(game_data['plays_captured']) > game_data['num_plays'], (game_data['db_game_over'] and not game_data['finalized']), len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']))})
                if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
                    game_data['num_plays'] = len(game_data['plays_captured'])
                    
                    
                    #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                    #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % end_of_period)
                    if len(game_data['plays_captured']) > 0:
                        game_data = parse_plays(browser, game_data, data)
                        process_step['points'].append({'txt': "After parse_plays, was the game marked as over (%s); is game_over_at None (%s)" % (game_data['game_over'] == 1, game_data['game_over_at'] is None)})
                        if game_data['game_over'] and game_data['game_over_at'] is None:
                            game_data['game_over_at'] = loops
                            print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 80))
                        game_data['non_update_loops'] = 0
                    
                else:
                    game_data['non_update_loops'] += 1
                    if game_data['non_update_loops'] > 120:
                        print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
                        time.sleep(30); browser.find_element(By.ID, '_lcgame_pxp').click();
                game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
                process_step['points'].append({'txt': "Loops since last parse set to %s" % (game_data['loops_since_last_parse'])})

            else:
                process_step['result'] = "NO PAGE SOURCE"

        except Exception as fds:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


    time.sleep(game_data['sleep_duration'])
    
    # Add in some parsing logs that may have been created on a previous loop if their respective steps were not run this time around.
    if 'Parse Plays' not in [z['desc'] for z in game_data['processing_log']['steps']]:
        game_data['processing_log']['steps'].append(game_data['last_parse_process_step'])
    
    if 'pct_complete' in game_data and game_data['pct_complete'] is not None and game_data['pct_complete'] > .97:
        game_data['processing_log']['steps'].append(game_data['last_check_for_finals_step'])

    game_data['processing_log']['steps'].append(process_step)
    if '--print-process-step' in sys.argv:
        zc.print_dict(process_step)
    return game_data
    
def view_site_ncaa(browser, game_data, data):
    process_step = {'result': "", 'desc': "View Site Sidearm", 'points': []}
    
    # The NCAA site games have a habit of using 00:00 when the timestamp is not entered. As a result, the parser assumes it's always the end of whatever quarter they are in. Adding 00:00 will solve that problem. The only issue is potentially not knowing when the game is final, but we can rely on the FINAL tag or the last parse timeout there.
    if game_data['replacements'] is None:
        game_data['replacements'] = []

    if '00:00' not in [z['from'] for z in game_data['replacements']]:
        
        game_data['replacements'].append({'from': '00:00', 'to': ''})
        
        replacement_text_str = "~~~".join(["%s|%s" % (z['from'], z['to']) for z in game_data['replacements']])
        query = "UPDATE LaxRef_Active_Live_WP_Games set replacement_text=%s where game_ID=%s"
        param = [replacement_text_str, game_data['ID']]
        
        msg = "Query %s w/ %s in %s" % (query, param, game_data['description'])
        zc.send_telegram(msg)
        
        #cursor = zc.zcursor("LR")
        #cursor.execute(query, param); cursor.commit()
        #cursor.close()
        update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)

    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: return game_data
        
        try:
            browser.get(game_data['url']); print("Page loading, wait for 5 seconds..."); time.sleep(5)
        except Exception:
            
            msg = "Initial browser load failed in %s; will try again next time." % game_data['description']
            msg_plus = "Initial browser load failed in %s; will try again next time.\n\n%s" % (game_data['description'], traceback.format_exc())
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            return game_data
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
    


    game_data['loops'] += 1
    try:
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        page_source = remove_non_ascii(browser.page_source)
        
        process_step['points'].append({'txt': "Read {:,} total chars" .format( len(page_source))})
        
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        if page_source is not None:
            game_data = process_ncaa_plays(page_source, game_data)
            process_step['result'] = "PAGE SOURCE READ"
            if game_data['end_of_period']:
                print("We are at the end of the quarter...")
        
        else:
            process_step['result'] = "NO PAGE SOURCE"
        

        
        # Record this so that we know that a full scrape happened; for end-of-game detection purposes
        if len(game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
        
        if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
            
            if 0 and 'pct_complete' in game_data and game_data['pct_complete'] is not None and game_data['pct_complete'] > .95:
                try:
                    parse_msg = "New parse in %s w/ pct complete = %.3f" % (game_data['description'], game_data['pct_complete'])
                    parse_msg += "\nn plays_captured: %s" % (len(game_data['plays_captured']))
                    parse_msg += "\nnum_plays: %s" % (game_data['num_plays'])
                    parse_msg += "\ndb_game_over: %s" % (game_data['db_game_over'])
                    parse_msg += "\nfinalized: %s" % (game_data['finalized'])
                    zc.send_telegram(parse_msg, bot_token)
                    
                except Exception:
                    msg = "Parse msg Failed"
                    if msg not in data['telegram_messages']: zc.send_telegram("%s\n\n%s" % (msg, traceback.format_exc()), bot_token); data['telegram_messages'].append(msg)
            
            
            game_data['num_plays'] = len(game_data['plays_captured'])
            process_step['points'].append({'txt': "Fresh data requires update (via parse_plays) if we found new plays (%s) or the game has been finalized in the DB but not in the LWO script (%s); result=%s" % (len(game_data['plays_captured']) > game_data['num_plays'], (game_data['db_game_over'] and not game_data['finalized']), len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']))})
        
            game_data['non_update_loops'] = 0;


            
            game_data = parse_plays(browser, game_data, data)
            
            
            if game_data['game_over'] and game_data['game_over_at'] is None:
                game_data['game_over_at'] = loops
                print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 400))
                game_data = mark_game_over(game_data)
        

        else:
            game_data['non_update_loops'] += 1
            if game_data['non_update_loops'] > 180 and '--use-archive' not in sys.argv: 
                print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


    if 'pct_complete' in game_data and game_data['pct_complete'] is not None and game_data['pct_complete'] > .97:
        game_data['processing_log']['steps'].append(game_data['last_check_for_finals_step'])
    
    game_data['processing_log']['steps'].append(process_step)
    return game_data
    
def view_site_pointstreak(browser, game_data, data):

    browser.get(game_data['url']); print("Page loading, wait for 5 seconds..."); time.sleep(5)

    last_quote = None

    loops = 0; game_data['non_update_loops'] = 0
    game_data['plays_captured'] = []

    game_data['game_over_at'] = None
    while game_data['game_over_at'] is None or loops - 100 < game_data['game_over_at']:
        game_data['loops'] += 1
        try:
        
            # Record the timestamp that the page source was read
            game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
            if '--use-archive' in sys.argv:
                path = os.path.join(game_data['archive_dir'], "%s_loop_%04d.txt" % (game_data['game_file'], game_data['loops']))

                if os.path.isfile(path):
                    page_source = open(path, 'r').read()
                    if game_data['last_source'] == page_source:
                        page_source = ""
                    else:
                        print("Reading loop %d data from %s" % (loops, path))
                        game_data['last_source'] = page_source
                else:
                    break
            else:
            
                
                page_source = remove_non_ascii(browser.find_element(By.CLASS_NAME, "viewport").text)

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    
            game_data = process_pointstreak_plays(page_source, game_data)
            if game_data['end_of_period']:
                print("We are at the end of the quarter...")
            
            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or game_data['end_of_period'] or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                

                game_data['non_update_loops'] = 0;
                #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % end_of_period); zc.exit("1oeweksdnfaq8")
                if len(game_data['plays_captured']) > 0:
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 100))
                        game_data = mark_game_over(game_data)
                

            else:
                game_data['non_update_loops'] += 1
                if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv: print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
            game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        except Exception as fds:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


        time.sleep(0 if '--use-archive' in sys.argv else 1.5)

    return game_data
    
def view_site_stretch_2022(browser, game_data, data):

    #browser.get(game_data['url']); print("Page loading, wait for 20 seconds..."); time.sleep(5)
    
    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: 
            process_step['result'] = "No Window Handle"
            process_step['points'].append({'txt': "game_data['window_handle'] is None: %s" % (game_data['window_handle'] is None)})
            game_data['processing_log']['steps'].append(process_step)
            return game_data
        
        try:
            browser.get(game_data['url']); print("Page loading, wait for 5 seconds..."); time.sleep(5)
        except Exception:
            
            msg = "Initial browser load failed in %s; will try again next time." % game_data['description']
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
            process_step['result'] = "Browser failed to load"
            game_data['processing_log']['steps'].append(process_step)
            
            return game_data
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
    
    
    
    game_data['loops'] += 1
    try:
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
    
        


        try:
            elems = browser.find_elements(By.CSS_SELECTOR, 'a[href="%s"]' % "#stats_playbyplay")
            for e in elems:
                try:
                    e.click()
                    break
                except Exception:
                    pass
            passed = True
            #print("Successfully clicked the stats_playbyplay link...")
            attempts = 10

        except Exception:
            attempts += 1

            browser.get(game_data['url'])
            time.sleep(30)

        elems = browser.find_elements(By.ID, "recentPlays")
        if elems != []:
            
            page_source = remove_non_ascii(elems[0].text) + "\n"

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
     
            game_data = process_stretch_plays(page_source, game_data, data, None)

            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if len(game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or game_data['end_of_period'] or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                
                    
                #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % game_data['end_of_period'])
                if len(game_data['plays_captured']) > 0:
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 100))
                    game_data['non_update_loops'] = 0
                
        else:
            game_data['non_update_loops'] += 1
            if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv:
                print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
                time.sleep(10); browser.find_element(By.ID, '_lcgame_pxp').click(); time.sleep(5)
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)



    return game_data
    
def view_site_stretch(browser, game_data, data):

    #browser.get(game_data['url']); print("Page loading, wait for 20 seconds..."); time.sleep(5)
    
    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: 
            process_step['result'] = "No Window Handle"
            process_step['points'].append({'txt': "game_data['window_handle'] is None: %s" % (game_data['window_handle'] is None)})
            game_data['processing_log']['steps'].append(process_step)
            return game_data
        
        try:
            browser.get(game_data['url']); print("Page loading, wait for 5 seconds..."); time.sleep(5)
        except Exception:
            
            msg = "Initial browser load failed in %s; will try again next time." % game_data['description']
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            
            process_step['result'] = "Browser failed to load"
            game_data['processing_log']['steps'].append(process_step)
            
            return game_data
        game_data['initial_load'] = 0
        
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
    
    
    
    game_data['loops'] += 1
    try:
        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
    
        


        try:
            elems = browser.find_elements(By.CSS_SELECTOR, 'a[href="%s"]' % "#stats_playbyplay")
            for e in elems:
                try:
                    e.click()
                    break
                except Exception:
                    pass
            passed = True
            #print("Successfully clicked the stats_playbyplay link...")
            attempts = 10

        except Exception:
            attempts += 1

            browser.get(game_data['url'])
            time.sleep(30)

        """
        page_source = ""
        elems = browser.find_elements(By.CSS_SELECTOR, 'a[href*="%s"]' % "_period"); 
        print ("There are %d period elems to click" % len(elems))
        for i, e in enumerate(elems):
            try:
                tag = e.get_attribute("href"); print (tag)
                e.click(); time.sleep(.1)
                plays_elem = browser.find_element(By.ID, 'periodPlaysContainer')
                page_source += "\n<----LWO PERIOD---->\n%s\n%s" % (tag, plays_elem.get_attribute('innerHTML'))
                if i == len(elems) - 1: 
                    print (page_source)
            except Exception:
                print (traceback.format_exc())
                page_source = None
                break     
                
        print ("Captured {:,} characters".format(len(page_source)))  
        """
        
        elems = browser.find_elements(By.ID, 'periodPlaysContainer')
        if elems != []: 
            page_source = remove_non_ascii(elems[0].get_attribute("innerHTML")) + "\n"

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
     
            game_data = process_stretch_plays(page_source, game_data, data, None)

            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if len(game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or game_data['end_of_period'] or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                
                    
                #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % game_data['end_of_period'])
                if len(game_data['plays_captured']) > 0:
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 100))
                    game_data['non_update_loops'] = 0
                
        else:
            game_data['non_update_loops'] += 1
            if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv:
                print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
                time.sleep(10); browser.find_element(By.ID, '_lcgame_pxp').click(); time.sleep(5)
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        game_data['consecutive_selenium_fails'] = 0
    except Exception as fds:
        msg = traceback.format_exc()
        game_data['consecutive_selenium_fails'] += 1
        if game_data['consecutive_selenium_fails'] % 20 == 0:
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)



    return game_data
    
def view_site_stretch_backup(browser, game_data, data):

    browser.get(game_data['url']); print("Page loading, wait for 20 seconds..."); time.sleep(5)
    
    while game_data['game_over_at'] is None or loops - 100 < game_data['game_over_at']:
        game_data['loops'] += 1
        try:
            # Record the timestamp that the page source was read
            game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
            


            try:
                elems = browser.find_elements(By.CSS_SELECTOR, 'a[href="%s"]' % "#stats_playbyplay")
                for e in elems:
                    try:
                        e.click()
                        break
                    except Exception:
                        pass
                passed = True
                #print("Successfully clicked the stats_playbyplay link...")
                attempts = 10

            except Exception:
                attempts += 1

                browser.get(game_data['url'])
                time.sleep(30)

            page_source = remove_non_ascii(browser.find_element(By.ID, "recentPlays").text) + "\n"

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
     
            game_data = process_stretch_plays(page_source, game_data, data, None)

            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or end_of_period or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                
                    
                #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
                #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % end_of_period)
                if len(game_data['plays_captured']) > 0:
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 100))
                    game_data['non_update_loops'] = 0
                
            else:
                game_data['non_update_loops'] += 1
                if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv:
                    print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.refresh()
                    time.sleep(10); browser.find_element(By.ID, '_lcgame_pxp').click(); time.sleep(5)
            game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        except Exception as fds:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


        time.sleep(0 if '--use-archive' in sys.argv else 1.5)
    return game_data
    
def view_site_gametracker(browser, game_data, data):

    browser.get(game_data['url']) ; print("Page loading, wait for 5 seconds..."); time.sleep(5)
    game_data['last_refresh'] = time.time()
    
    while game_data['game_over_at'] is None or loops - 400 < game_data['game_over_at']:
        try:

            if '--use-archive' in sys.argv:
                path = os.path.join(game_data['archive_dir'], "%s_loop_%04d.txt" % (game_data['game_file'], game_data['loops']))

                if os.path.isfile(path):
                    page_source = open(path, 'r').read()
                    if game_data['last_source'] == page_source:
                        page_source = ""
                    else:
                        print("Reading loop %d data from %s" % (loops, path))
                        game_data['last_source'] = page_source
                else:
                    break
            else:
                page_source = remove_non_ascii(browser.page_source)

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)

            game_data = process_gametracker_plays(page_source, game_data)
            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or end_of_period or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                
                

                # Record this so that we know that a full scrape happened; for end-of-game detection purposes
                if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
                
                if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 100))
                        game_data = mark_game_over(game_data)

                    game_data['non_update_loops'] = 0
            else:
                game_data['non_update_loops'] += 1
                if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv: print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.get(game_data['url']); last_refresh = time.time()
            if loops % 50 == 0 and time.time() - last_refresh > 60:
                browser.get(game_data['url']); last_refresh = time.time()
        except Exception as fds:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        time.sleep(0 if '--use-archive' in sys.argv else 1.5)
        game_data['loops'] += 1

    return game_data
    
def view_site_sportselect(browser, game_data, data):
    browser.get(game_data['url']) ; print("Page loading, wait for 5 seconds..."); time.sleep(5)

    while game_data['game_over_at'] is None or loops - 400 < game_data['game_over_at']:
        try:
            # Record the timestamp that the page source was read
            game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
            html = remove_non_ascii(browser.page_source)

            if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
                try:
                    arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                    f = io.open(arch_path, 'w', encoding='utf8'); f.write(html); f.close()
                    
                    if game_data['attachments'] is None: game_data['attachments'] = []
                    game_data['attachments'].append(arch_path)
                except Exception:
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)


            game_data = process_sportselect_plays(html, data)
            
            # Record this so that we know that a full scrape happened; for end-of-game detection purposes
            if (game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
            
            
            if len(game_data['plays_captured']) > game_data['num_plays'] or end_of_period or (game_data['db_game_over'] and not game_data['finalized']):
                game_data['num_plays'] = len(game_data['plays_captured'])
                
                
                if len(game_data['plays_captured']) > 0:
                    game_data = parse_plays(browser, game_data, data)
                    if game_data['game_over'] and game_data['game_over_at'] is None:
                        game_data['game_over_at'] = loops
                        print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 400))
                        game_data = mark_game_over(game_data)

                    game_data['non_update_loops'] = 0
                
            else:
                game_data['non_update_loops'] += 1
                if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv: print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.get(game_data['url']); time.sleep(5)
            game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
        except Exception as fds:
            msg = traceback.format_exc()
            if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        time.sleep(0 if '--use-archive' in sys.argv else 1.5)
        game_data['loops'] += 1

    return game_data
    
def view_site_presto(browser, game_data, data):

    if game_data['initial_load'] or game_data['window_handle'] is None or '--single-window-execution' in sys.argv:
        
        game_data, browser, data = initialize_game_browser_tab(game_data, browser, data)
        if game_data['window_handle'] is None: return game_data
        browser.get(game_data['url']); print("Page loading, wait for 5 seconds..."); time.sleep(5)
        game_data['initial_load'] = 0
    elif game_data['url_change']:
        game_data['url_change'] = 0
        browser.get(game_data['url']); print("Page loading, wait for 2 seconds..."); time.sleep(2)
        
    

    try:
    
        game_data['flip_quarters'] = 0 
        pbps = browser.find_elements(By.ID, "pbp")
        if pbps != []: 
            game_data['flip_quarters'] = 1
            pbps[0].click(); time.sleep(1.25)

        # Record the timestamp that the page source was read
        game_data['scrape_timestamps'].append(time.time()); game_data['scrape_plays_parsed'].append(None); 
        
        
        page_source = remove_non_ascii(browser.page_source)



        while "  " in page_source:
            page_source = page_source.replace("  ", " ")
        
        if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
            # If we are debugging this game, then log the page source in a file and include the file in the attachments list to be sent to the requesting admin
            try:
                
                arch_path = os.path.join(game_data['archive_dir'], "%s_page_source.txt" % (game_data['game_file']))
                f = io.open(arch_path, 'w', encoding='utf8'); f.write(page_source); f.close()
                
                if game_data['attachments'] is None: game_data['attachments'] = []
                game_data['attachments'].append(arch_path)
            except Exception:
                msg = traceback.format_exc()
                if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)

        #print ("Processing presto play data...")
        game_data, data = process_presto_plays(page_source, game_data, data)
        
        # Record this so that we know that a full scrape happened; for end-of-game detection purposes
        if len(game_data['plays_captured']) >= game_data['num_plays']: game_data['last_successful_scrape'] = time.time()
        
        
        if len(game_data['plays_captured']) > game_data['num_plays'] or (game_data['db_game_over'] and not game_data['finalized']):
            game_data['num_plays'] = len(game_data['plays_captured'])
            
            #game_data['plays_captured'] = sorted(game_data['plays_captured'], key=lambda x:x['game_elapsed'])
            if len(game_data['plays_captured']) > 0:
                game_data = parse_plays(browser, game_data, data)
                if game_data['game_over'] and game_data['game_over_at'] is None:
                    game_data['game_over_at'] = game_data['loops']
                    print("We are at loop #%d, run until loop #%d" % (game_data['loops'], game_data['loops'] + 400))
                    game_data = mark_game_over(game_data)

                game_data['non_update_loops'] = 0
            
        else:
            game_data['non_update_loops'] += 1
            if game_data['non_update_loops'] > 120 and '--use-archive' not in sys.argv: print("\t\tNo updates for 3 mins, refreshing page..."); game_data['non_update_loops'] = 0; browser.get(game_data['url']); time.sleep(5)
        game_data['loops_since_last_parse'] = None if game_data['last_parse_loop'] is None else (game_data['loops'] - game_data['last_parse_loop'])
    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
    time.sleep(game_data['sleep_duration'])
    game_data['loops'] += 1
    return game_data

def remove_non_ascii(s): return "".join(filter(lambda x: ord(x) < 128, s)) if s is not None else s
current_milli_time = lambda : int(round(time.time() * 1000))

def there_are_active_games(data):
    num_active = sum([1 for z in data['games'] if not z['pending'] and (z['game_over_at'] is None or not z['finalized'])])
    return 1 if num_active > 0 else  0
        
new_listings = 0
success = False

def game_snapshot(game_data):
    snap = {'html_halftime_cnt': game_data['html_halftime_cnt'], 'html_final_cnt': game_data['html_final_cnt'], 'since_last_parse': None, 'since_last_successful_scrape': None, 'since_change_in_final_tags': None, 'since_change_in_halftime_tags': None}
    
    if 'time_per_parse_plays_run' in game_data:
        snap['time_per_parse_plays_run'] = game_data['time_per_parse_plays_run']
    else:
        snap['time_per_parse_plays_run'] = "N/A"
    
    snap['num_plays'] = None if 'plays_captured' not in game_data or game_data['plays_captured'] is None else len(game_data['plays_captured'])
    snap['pct_complete'] = None if 'pct_complete' not in game_data else game_data['pct_complete']
    snap['away_score'] = None if 'away_score' not in game_data else game_data['away_score']
    snap['home_score'] = None if 'home_score' not in game_data else game_data['home_score']
    snap['margin'] = None if None in [snap['away_score'], snap['home_score']] else abs(game_data['home_score'] - game_data['away_score'])
    snap['loops_since_last_parse'] = None if 'loops_since_last_parse' not in game_data else game_data['loops_since_last_parse']
    
    if 'last_parse' in game_data and game_data['last_parse'] is not None:
        snap['since_last_parse'] = time.time() - game_data['last_parse']
        
    if 'last_successful_scrape' in game_data and game_data['last_successful_scrape'] is not None:
        snap['since_last_successful_scrape'] = time.time() - game_data['last_successful_scrape']
    
    if 'last_change_in_final_tags' in game_data and game_data['last_change_in_final_tags'] is not None:
        snap['since_change_in_final_tags'] = time.time() - game_data['last_change_in_final_tags']
    
    if 'last_change_in_halftime_tags' in game_data and game_data['last_change_in_halftime_tags'] is not None:
        snap['since_change_in_halftime_tags'] = time.time() - game_data['last_change_in_halftime_tags']
       
    return snap
def format_snap(snap):
    keys = sorted(snap.keys())
    
    return "\n".join(["%s: %s" % (k, snap[k] if snap[k] is None or isinstance(snap[k], str) else (("%d" % snap[k]) if isinstance(snap[k], int) else ("%.3f" % snap[k]))) for k in keys])

def parse_reddit_content(reddit_summary):
    if "|" in reddit_summary:
        tmp = reddit_summary.split("|")[1]
    else:
        tmp = reddit_summary

    if tmp is None:
        tmp = ""
    regex = re.compile(r'Here is the \[win probability recap page\]\((.*?)\&utm_content=09fpmalqcynrpa\) for the (.*?) victory.\n\nTop stars \(by expected goals added\) for \*\*(.*?)\*\*:\n\n\* (.*?) - ([0-9.]+) EGA\n\* (.*?) - ([0-9.]+)\n\* (.*?) - ([0-9.]+)\n\nTop stars for \*\*(.*?)\*\*:\n\n\* (.*?) - ([0-9.]+)\n\* (.*?) - ([0-9.]+)\n\* (.*?) - ([0-9.]+)', re.IGNORECASE)
    match = regex.search(tmp)
    if match is None:
        return None
    else:    
        
        #print (match.groups())
        rec = {
        'winner': match.group(2)
        ,'loser': match.group(3) if match.group(10) == match.group(2) else match.group(10)
        ,'team1': match.group(3)
        ,'team1_p1': match.group(4)
        ,'team1_p1_score': float(match.group(5))
        ,'team1_p2': match.group(6)
        ,'team1_p2_score': float(match.group(7))
        ,'team1_p3': match.group(8)
        ,'team1_p3_score': float(match.group(9))
        ,'team2': match.group(10)
        ,'team2_p1': match.group(11)
        ,'team2_p1_score': float(match.group(12))
        ,'team2_p2': match.group(13)
        ,'team2_p2_score': float(match.group(14))
        ,'team2_p3': match.group(15)
        ,'team2_p3_score': float(match.group(16))}

        for z in range(1,4):
            rec['winner_p%d' % z] = {'player': rec['team1_p%d' % z] if rec['team1'] == rec['winner'] else rec['team2_p%d' % z], 'EGA': rec['team1_p%d_score' % z] if rec['team1'] == rec['winner'] else rec['team2_p%d_score' % z]}
            rec['loser_p%d' % z] = {'player': rec['team1_p%d' % z] if rec['team1'] == rec['loser'] else rec['team2_p%d' % z], 'EGA': rec['team1_p%d_score' % z] if rec['team1'] == rec['loser'] else rec['team2_p%d_score' % z]}
            if len(rec['winner_p%d' % z]['player'].split(" ")) == 2:
                rec['winner_p%d' % z]['last_name'] = rec['winner_p%d' % z]['player'].split(" ")[1]
            if len(rec['loser_p%d' % z]['player'].split(" ")) == 2:
                rec['loser_p%d' % z]['last_name'] = rec['loser_p%d' % z]['player'].split(" ")[1]

        return rec
    
    
def send_final_tweet(data, game_data):

    rec = parse_reddit_content(game_data['reddit_summary'])
    if rec is  None:
        msg = "Tried to create the final tweet message (not being sent, but still being created), for {}, but the win probability regex did not find a match.\n\nReddit Summary={}".format(game_data['description'], "None" if game_data['reddit_summary'] is None else game_data['reddit_summary'])
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
    else:
        tmp_i = int(time.time()) % 8
        tweet_msg = ["Game, set match. %s knocks off %s." % (rec['winner'], rec['loser'])
        , "It's in the books, %s knocks off %s." % (rec['winner'], rec['loser'])
        , "It's a final, %s takes down %s." % (rec['winner'], rec['loser'])
        , "It's a final, %s knocks off %s." % (rec['winner'], rec['loser'])
        , "%s beats %s." % (rec['winner'], rec['loser'])
        , "It's a final, %s knocks off %s." % (rec['winner'], rec['loser'])
        , "That's all she wrote, %s with the win over %s." % (rec['winner'], rec['loser'])
        , "Update time: %s over %s." % (rec['winner'], rec['loser'])][tmp_i]

        tweet_msg += " %s led the way for %s with %.2f EGA. Big contributions from %s and %s too." % (rec['winner_p1']['player'], rec['winner'], rec['winner_p1']['EGA'], rec['winner_p2']['player'] if 'last_name' not in rec['winner_p2'] else rec['winner_p2']['last_name'], rec['winner_p2']['player'] if 'last_name' not in rec['winner_p3'] else rec['winner_p3']['last_name'])

        if len(tweet_msg) < 160:
            tweet_msg += " %s had the top stat line (%.2f EGA) for %s." % (rec['loser_p1']['player'], rec['loser_p1']['EGA'], rec['loser'])

        if '--use-db-plays' in sys.argv:
            # Since it was from the NCAA site, it obviously wasn't live.
            pass
        else:
            try:
                query = "SELECT ID, active, msg, send_time, tweet_category from Scheduled_Tweets"
                zcursor = zc.zcursor("LOCAL")
                zcursor.execute(query, [])
                existing_scheduled_tweets = zc.dict_query_results(zcursor)
                cnt = len([1 for z in existing_scheduled_tweets if z['msg'] == tweet_msg and z['active'] == 1])
                in_reply_to_ID = None
                if cnt == 0:

                    sent_finales = [z for z in existing_scheduled_tweets if z['send_time'].strftime("%Y%m%d") == datetime.now().strftime("%Y%m%d") and z['tweet_category'] == 'final_game' and z['active'] == 1]
                    if sent_finales != []:
                        in_reply_to_ID = max([z['ID'] for z in sent_finales])

                    query = "INSERT INTO Scheduled_Tweets (ID, created_at, send_time, send_as, msg, sent, status, active, tweet_category, in_reply_to_ID) VALUES ((SELECT count(1)+1 from Scheduled_Tweets feds), %s, %s, %s, %s, 0, 'active', 1, 'final_game', %s)"
                    param = [datetime.now(), datetime.now() + timedelta(seconds=75), "laxrefbot", tweet_msg, in_reply_to_ID]
                    #print query, param
                    zcursor.execute(query, param)
                    zcursor.commit()


                zcursor.close()
            except Exception:
                msg = "Final tweet was not able to be sent for %s" % game_data['description']
                msg += "\n\n%s" % traceback.format_exc()
                print (msg)
                #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
        #cursor = zc.zcursor("LR")
        query = "UPDATE LaxRef_Game_Streams set last_update=%s, final_tweet_sent=1 where game_ID=%s"
        param = [time.time(), game_data['ID']]
        #cursor.close()
        update_laxref_db(query, param, {'game_ID': game_data['ID']}, None)
        game_data['final_tweet_sent'] = 1

    return data, game_data
    
def store_scrape_timestamps(data, game_data):
    """
    This function writes a file containing the (epoch) timestamps of each time that a game's HTML was read and the number of plays parsed during each reading; # of plays will be blank if parse_plays was not run.
    """
    
    try:
        tmp_src = os.path.join(lr_fldr, "LiveWinOdds", "ScrapeTimeStamps_%s.csv" % game_data['game_file'])
        f = open(tmp_src, 'w')
        f.write("Timestamp,PlaysParsed\n")
        for ts, pp in zip(game_data['scrape_timestamps'], game_data['scrape_plays_parsed']):
            f.write("%d,%s\n" % (ts, "" if pp is None else int(pp)))
        f.close()
    except Exception:
        msg = "When writing timestamps for %s, this error occurred\n\n%s" % (game_data['description'], traceback.format_exc())
        zc.send_email(msg, {'subject': 'LiveWinOddsError: Writing timestamps', 'from': "Live Win Odds"})
                        
    

    return data, game_data
    
def get_upload_command(game_data, data):
    
    py = os.path.join(lr_fldr, "upload_play_data.py")
    #cmd = "START \"upload_play_data: {}\" python {} --game-ID {} -home {} -away {}".format(game_data['ID'], py, game_data['ID'], "%d-%d" % (game_data['home_ID'], game_data['home_score']), "%d-%d" % (game_data['away_ID'], game_data['away_score']))
    #cmd = "python {} --game-ID {} -home {} -away {}".format(game_data['ID'], py, game_data['ID'], "%d-%d" % (game_data['home_ID'], game_data['home_score']), "%d-%d" % (game_data['away_ID'], game_data['away_score']))
    cmd = "upload_play_data.bat {} {} {}".format(game_data['ID'], "%d-%d" % (game_data['home_ID'], game_data['home_score']), "%d-%d" % (game_data['away_ID'], game_data['away_score']))

    return cmd
    
def build_debug_game_report(data, game_data):
    """
    When debugging a game (i.e. admin receiving a debug report), this function prepares a standard summary of what's been found for the game. More around the plays, goals, stats, found, than the structural processing logs that are already included.
    """
    try:
        game_data['debug_report_text'] = "???"
    except Exception:
        game_data['debug_report_text'] += "\n\nCRASH: %s" % traceback.format_exc()
        
    return data, game_data
    
def check_for_finals(data, browser):
    if '--test-db-plays' in sys.argv:
        print ("Start check for finals")
    try:
        query_tag = "check_for_finals_games"
        cursor = zc.zcursor("LR")
        if '--use-db-plays' in sys.argv:
            query = "SELECT a.ID, a.game_ID, a.game_file, a.final_tweet_sent, a.plays_uploaded from LaxRef_Game_Streams a, LaxRef_Games b, LaxRef_Active_Live_WP_Games c where c.game_ID=b.ID and DATE(b.game_date)=%s and b.ID=a.game_ID and a.active"
        else:
            query = "SELECT a.ID, a.game_ID, a.game_file, a.final_tweet_sent, a.plays_uploaded from LaxRef_Game_Streams a, LaxRef_Games b, LaxRef_Active_Live_WP_Games c where IFNULL(c.skip, 0) = 0 and c.game_ID=b.ID and DATE(b.game_date)=%s and b.ID=a.game_ID and a.active"
        param = [data['dt']]
        #print ("Query %s w/ %s" % (query, param))
        finals = cursor.dqr(query, param)
        cursor.close()
        data = increment_queries(data, query_tag, finals)
    except Exception:
        msg = "DB Fail: \n\nCould not get a response from the DB in check_for_finals."
        msg += "\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return data, browser
    
    if '--test-db-plays' in sys.argv:
        print ("Found %d" % len(finals))
        
    # We will continue to process those games that have had the final_tweet_sent flag set, but the plays_uploaded flag not set.
    finals = [z for z in finals if z['final_tweet_sent'] not in [None, 0] and (z['plays_uploaded'] is None or z['plays_uploaded'] == 0)]

    # First, check whether there are games that have been flagged as completed by the final_tweet_sent
    for i, g in enumerate(finals):
        g['out_path'] = os.path.join(lr_fldr, "LiveWinOdds", g['game_file'] + ".csv")
        if '--test-db-plays' in sys.argv:
            print (" %d in data['games']: %s" % (g['game_ID'], g['game_ID'] in [z['ID'] for z in data['games']]))
        if g['game_ID'] in [z['ID'] for z in data['games']]:
            if '--test-db-plays' in sys.argv:
                print (" Process the game home %s vs away %s" % (game_data['home_score'], game_data['away_score']))
            game_data = data['games'][ [z['ID'] for z in data['games']].index(g['game_ID'])]
            game_data['game_over_at'] = time.time(); game_data['game_over'] = 1; game_data['db_game_over'] = 1
            if None in [game_data['home_score'], game_data['away_score']]:
                msg = "The Final Tweet flag was set in game ID %d, but the home or away score was null. Hopefully it'll the parser will get a score next time around." % (g['game_ID'])
                
                
                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
            else:
                if '--already-uploaded' in sys.argv or '--use-db-plays' in sys.argv:
                    
                    #query = "UPDATE LaxRef_Game_Streams a, (SELECT c.game_ID, count(1) 'plays_uploaded' from LaxRef_Events c where c.active and c.game_ID={} group by c.game_ID) b set a.last_update={}, a.plays_uploaded=b.plays_uploaded where b.game_ID=a.game_ID and a.game_ID={}"
                    #query = query.format(g['ID'], time.time(), g['ID'])
                    #query_log_f = open(os.path.join(lr_fldr, 'Logs', 'plays_upload_query.log'), 'a')
                    #query_log_f.write("\n\n%s\n%s" % (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), query))
                    #query_log_f.close()
                    
                    tmp_query = "UPDATE LaxRef_Games set alt_home_team=%s, alt_away_team=%s where ID=%s"
                    tmp_param = [game_data['home_team'], game_data['away_team'], game_data['ID']]
                    #cursor = zc.zcursor("LR")
                    #cursor.execute(query, [])
                    #cursor.execute(query, tmp_param)
                    
                    #cursor.commit(); cursor.close()
                    update_laxref_db(tmp_query, tmp_param, {'game_ID': game_data['ID']}, None)
                    
                    # Update the Lax.Com record to show that the game is final
                    game_data['lx_game_update_query'] = "UPDATE schedule{:.0f} set clock_status='FINAL', is_final=1 where id=%s".format(data['year']-2000)
                    game_data['lx_game_update_param'] = [game_data['laxdotcom_ID']]
                    tmp_start_ms = time.time()
                    
                    print ("Query %s w/ %s" % (game_data['lx_game_update_query'], game_data['lx_game_update_param']))
                    #if input("Run this? (y/n) ").lower() != "y":
                     #   zc.exit("EXITING>>")
                    conn, cursor = zc.db(lx_db_tag)
                    
                    cursor.execute(game_data['lx_game_update_query'], game_data['lx_game_update_param'])
                    cursor.close(); conn.close()
                    
                else:
                    # Update the Lax.Com record to show that the game is final
                    game_data['lx_game_update_query'] = "UPDATE schedule{:.0f} set clock_status='FINAL', is_final=1 where id=%s".format(data['year']-2000)
                    game_data['lx_game_update_param'] = [game_data['laxdotcom_ID']]
                    tmp_start_ms = time.time()
                    
                    print ("Query %s w/ %s" % (game_data['lx_game_update_query'], game_data['lx_game_update_param']))
                    #if input("Run this? (y/n) ").lower() != "y":
                    #    zc.exit("EXITING>>")
                    conn, cursor = zc.db(lx_db_tag)
                    
                    cursor.execute(game_data['lx_game_update_query'], game_data['lx_game_update_param'])
                    cursor.close(); conn.close()
                    
                    tmp_end_ms = time.time()
                    output = None
                    cmd = get_upload_command(game_data, data)
                    if ('attempted_upload' in game_data and game_data['attempted_upload']):
                        msg = "Plays upload has already been attempted for %s" % game_data['description']
                        
                        continue
                    else:
                        game_data['attempted_upload'] = 1
                        args = cmd.split(" ")
                        
                        # Whether we are using gsutil to upload the play values or subprocess to call the upload play data script from here, we shouldn't move forward with confirming that the game has been fully processed until successful_upload has been set to 1
                        successful_upload = 0
                        
                        
                        # As of Feb 22nd, 2024, I'm experimenting with simply uploading the play data to Cloud Storage in this script and having a separate external script look for games that need to be uploaded. If UPLOAD_PLAYS_IN_LWO is set to false, then we won't run the subprocess here. It appears that nothing in this script depends on the plays being uploaded. Post-game emails and the rapid upload that is called are both based on the list of plays generated by parse_plays, not whatever is in LaxRef_Events. Even the completedFromLiveStats flag is set in the upload play data script, so it appears that we can totally skip the upload process here and rely entirely on the Cloud Storage + Cron approach. First test is Feb 23rd, 2024.
                        UPLOAD_PLAYS_IN_LWO=0    
                        
                        if UPLOAD_PLAYS_IN_LWO:
                            USE_BATCH_UPLOAD_FILE=1
                            if USE_BATCH_UPLOAD_FILE:
                            
                            
                                try:
                                    start_upload_ms = time.time()
                                    proc = subprocess.Popen(args, stdout=subprocess.PIPE)
                                    end_upload_ms = time.time()
                                    msg = "For game ID %d, upload_play_data (in live win odds) took %.3fs to call the upload play data batch script and then return." % (g['ID'], end_upload_ms - start_upload_ms)
                                    #zc.send_telegram(msg, bot_token)
                                    successful_upload = 1
                                except Exception:
                                    msg = "Failed to upload play data w/ USE_BATCH_UPLOAD_FILE==1\n\nargs:\n\n%s\n\n%s" % (cmd, traceback.format_exc())
                                    if msg is not None and msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)   
                                    output = msg
                                
                            else:
                                proc = subprocess.Popen(args, stdout=subprocess.PIPE)
                                output = proc.stdout.read()
                                if isinstance(output, bytes):
                                    output = output.decode("utf8")
                                print ("upload output\n%s" % output)
                                
                                if "upload=success" in output:
                                    successful_upload = 1
                        
                        else:
                            output = "[Starting Cloud Storage Upload] "
                            tmp_successful = 1
                            storage_fname = None; storage_src = None
                            try:
                                machine_execution = sys.argv[sys.argv.index('-execution') + 1]
                                storage_fname = "%s_%s.txt" % (datetime.now().strftime("%Y%m%d"), machine_execution)
                                storage_src = os.path.join(lr_fldr, 'Logs', 'DBQueryLogs', storage_fname)
                                
                                log_f = open(storage_src, 'a')
                                log_f.write("%s\n" % (cmd))
                                log_f.close()
                                
                            except Exception:
                                tmp_err_msg = "Step 1) Error in creating machine-specific play upload log file"
                                if tmp_err_msg is not None and tmp_err_msg not in data['telegram_messages']: zc.send_telegram("%s\n\n%s" % (tmp_err_msg, traceback.format_exc()), bot_token); data['telegram_messages'].append(tmp_err_msg)   
                                tmp_successful = 0
                                output += tmp_err_msg + "; " 
                                
                            if storage_fname is not None: # Remove check once this is working  
                                try:
                                    
                                    #Target folder: LWOPlayUploadDataAndCommands
                                    d = {'src': storage_src, 'fname': storage_fname, 'target_folder': 'ProcessingLogs/LWOPlayUploadDataAndCommands'}
                                    laxref.upload_file(d)
                                    
                                    
                                except Exception:
                                    tmp_err_msg = "Step 2) Upload Play Upload Commands file to Storage"
                                    if tmp_err_msg is not None and tmp_err_msg not in data['telegram_messages']: zc.send_telegram("%s\n\n%s\n\n%s" % (tmp_err_msg, json.dumps(d, default=zc.json_handler, indent=1), traceback.format_exc()), bot_token); data['telegram_messages'].append(tmp_err_msg)     
                                    tmp_successful = 0
                                    output += tmp_err_msg + "; " 

                                try:
                                    
                                    #LWOPlayUploadDataAndCommands
                                    storage_src = os.path.join(lr_fldr, "LiveWinOdds", game_data['game_file'] + ".csv")
                                    storage_fname = game_data['game_file'] + ".csv"
                                    d = {'src': storage_src, 'fname': storage_fname, 'target_folder': 'ProcessingLogs/LWOPlayUploadDataAndCommands'}
                                    laxref.upload_file(d)
                                        
                                except Exception:
                                    tmp_err_msg = "Step 3) Upload Play Data CSV to Storage"
                                    if tmp_err_msg is not None and tmp_err_msg not in data['telegram_messages']: zc.send_telegram("%s\n\n%s\n\n%s" % (tmp_err_msg, json.dumps(d, default=zc.json_handler, indent=1), traceback.format_exc()), bot_token); data['telegram_messages'].append(tmp_err_msg)     
                                    tmp_successful = 0        
                                    output += tmp_err_msg + "; "                         
                            successful_upload = 1
                        
                        # Update the DB record for this game so that it won't be processed by this logic again
                        if successful_upload:    
                            
                            cursor = zc.zcursor("LR")
                            
                            print ("Query %s w/ %s" % (query, param))
                            if not query.startswith("SELECT"): # I'm not sure why a query would be run here; it looks like a leftover from above; if it's a SELECT, we can ignore it
                                cursor.execute(query, param)
                            
                            trimmed_away_team = None if game_data['away_team'] is None else game_data['away_team'][0:30]
                            trimmed_home_team = None if game_data['home_team'] is None else game_data['home_team'][0:30]
                            if '--use-db-plays' not in sys.argv:
                            
                                query = "UPDATE LaxRef_Games set alt_home_team=%s, alt_away_team=%s, lwo_home_team=%s, lwo_away_team=%s where ID=%s"
                                param = [game_data['home_team'], game_data['away_team'], trimmed_home_team, trimmed_away_team, game_data['ID']]
                                print ("Query %s w/ %s" % (query, param))
                                
                                #cursor.execute(query, param)
                                
                                update_laxref_db(query, param, {'game_ID': game_data['ID']}, cursor)
                            
                            msg = None
                            try:
                                #msg = "In game ID %d the snapshot was\n\n%s" % (game_data['ID'], format_snap(game_snapshot(game_data)))
                        
                                query = "UPDATE LaxRef_Game_Streams set last_update=%s, plays_uploaded=1, state_when_finalized=%s where game_ID=%s" 
                                param = [time.time(), json.dumps(game_snapshot(game_data)), game_data['ID']]
                                #cursor.execute(query, param)
                                update_laxref_db(query, param, {'game_ID': game_data['ID']}, cursor)
                                
                            except Exception:
                                try:
                                    msg = "In game ID %d the snapshot was\n\n%s" % (game_data['ID'], str(game_snapshot(game_data)))
                                except Exception:
                                    msg = "Failed to send game snapshot for game ID %d" % (game_data['ID'])
                            if msg is not None and msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)   
                            cursor.commit(); cursor.close()
                        
                        # Generate the post-game functionality that is generated once for each completed game
                        if successful_upload:        
                            game_data = generate_post_game_email(game_data, data)
                            if UPLOAD_TO_LRP_AT_END_ONLY:
                                rapid_upload(game_data, data, None)
                            
                            if 'tournament_slot_ID' in game_data and game_data['tournament_slot_ID'] is not None:
                                try:
                                    tmp_winner_ID = game_data['home_ID'] if game_data['home_score'] > game_data['away_score'] else game_data['away_ID']
                                    tmp_loser_ID = game_data['home_ID'] if game_data['home_score'] < game_data['away_score'] else game_data['away_ID']
                                    
                                    cmd_dir = os.path.join(lr_fldr, "upon_game_completion_update_bracket_slot_and_rescore.py")
                                    cmd = "python %s --slot-ID %d --game-ID %d --winner-ID %d --loser-ID %d" % (cmd_dir, game_data['tournament_slot_ID'], game_data['ID'], tmp_winner_ID, tmp_loser_ID)
                                    zc.send_telegram("Slot update command (%s):\n\n%s" % (game_data['description'], cmd), bot_token)
                                    try:
                                        os.system(cmd)
                                        zc.send_telegram("Successfully called the bracket update command via os.system", bot_token)
                                    except Exception:
                                        
                                        zc.send_telegram("Failed to successfully call the bracket update command via os.system\n\n%s" % traceback.format_exc(), bot_token)
                                    
                                except Exception:
                                    msg = "Failed to create upon_game_completion_update_bracket_slot_and_rescore.py command for %s\n\n%s" % (game_data['description'], traceback.format_exc())
                                    if msg not in data['telegram_messages']:
                                        zc.send_telegram(msg, bot_token)
                                        data['telegram_messages'].append(msg)
                                
                        
                        else:
                            if UPLOAD_PLAYS_IN_LWO:
                                msg = "LWO.py called the upload_play_data function on game ID %d but the success tag ('upload=success') was not found in the output\n\n%s" % (g['game_ID'], output)
                                print (msg)
                                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                                msg = "LWO.py output:\n\n%s" % (output)
                                print (msg)
                                if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                            else:
                                
                                short_msg = "LWO.py tried to upload play data and command to Cloud Storage for game ID %d but the upload failed" % (g['game_ID'])
                                msg = "LWO.py tried to upload play data and command to Cloud Storage for game ID %d but the upload failed\n\n%s" % (g['game_ID'], output)
                                print (msg)
                                if short_msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(short_msg)
                    
                    game_data['game_over'] = 1

    try:
        # For games that have not already been set as db_game_over, see if we should auto-finalize; they will be caught on the next time through this function
        for g in data['games']:
            if not g['db_game_over']:
                cf_process_step = {'result': "", 'desc': "Game Is Over?", 'points': []}
                snap = game_snapshot(g)
                
                finalize = 0; checks = []
                snapkeys = ['pct_complete', 'since_last_parse', 'loops_since_last_parse', 'margin', 'num_plays', 'html_final_cnt', 'since_last_successful_scrape', 'since_change_in_final_tags']
                
                
                
                if len([1 for z in snapkeys if z not in snap or snap[z] is None]) > 0:
                    continue
                
                # If all the keys we need are present, then go ahead with the checks
                checks.append({'tag': 'Pct >= .97', 'val': snap['pct_complete'], 'fn': 0 if snap['pct_complete'] < .97 else 1 })
                checks.append({'tag': 'nPlays >= 100', 'val': snap['num_plays'], 'fn': 0 if snap['num_plays'] < 100 else 1 })
                checks.append({'tag': 'Final tag', 'val': snap['html_final_cnt'], 'fn': 0 if snap['html_final_cnt'] in [None, 0] else 1 })
                checks.append({'tag': 'Scrape since Final tag change', 'val': snap['since_last_successful_scrape'], 'fn': 0 if snap['since_last_successful_scrape'] > snap['since_change_in_final_tags'] else 1 })
                # I removed the check below on April 23, 2022; I am not sure why we would care about a check like that; although it's weird that it could be 0 and the 12 mins since last parse would be 1; I guess if they had the stream sit at 1 min left and then only set it to FINAL 23 minutes later.
                #checks.append({'tag': 'Final tag changed < 20 mins ago', 'fn': 0 if snap['since_change_in_final_tags'] > 1200 else 1 })
                if '--single-window-execution' in sys.argv:
                    checks.append({'tag': '3 mins since last parse (since_last_parse=%d)' % snap['since_last_parse'], 'val': snap['since_last_parse'], 'fn': 0 if snap['since_last_parse'] < 180 else 1 })
                else:
                    checks.append({'tag': '10 mins since last parse (since_last_parse=%d)' % snap['since_last_parse'], 'val': snap['since_last_parse'], 'fn': 0 if snap['since_last_parse'] < 600 else 1 })
                checks.append({'tag': 'Not tied', 'val': snap['margin'], 'fn': 0 if snap['margin'] == 0 else 1 })
                checks.append({'tag': 'No parse on this loop', 'val': snap['loops_since_last_parse'], 'fn': 0 if snap['loops_since_last_parse'] == 0 else 1 })
                
                
                
                cf_process_step['points'].append({'txt': "Set last_LR_upload to %s.." % zc.to_utc(datetime.now()).strftime("%Y-%m-%d %H:%M")})
                if '--show-finals-check' in sys.argv or os.path.isfile(os.path.join(lr_fldr, "LiveWinOdds", "finals_check_gID%s.txt" % (g['ID']))):
                  
                    print ("\n\n{:<75}{:<25}{:<15}".format("Finals Check Test: %s" % g['description'], "Reference Val", "Passed?"))
                    print ("-" * 115)
                    for tmp_check in checks:
                        print ("{:<75}{:<25}{:<15}".format(tmp_check['tag'], tmp_check['val'],"PASS" if tmp_check['fn'] else "FAIL"))
                    print ("\n{:<75}{:<25}{:<15}".format("g.db_game_over", g['db_game_over'], ""))
                    print ("{:<75}{:<25}{:<15}".format("g.finalized", g['finalized'], ""))
                    
                    print ("\n")
                if sum([z['fn'] for z in checks]) == len(checks):
                    cf_process_step['points'].append({'txt': "Game finals checks passed (%d/%d) mark final via laxref.cockpit..." % (len(checks), len(checks))})
                    
                    
                       
                    msg = "Via the game snapshot algo, the model thinks the %s game is over (gID %d)\n\n%s" % (g['description'], g['ID'], format_snap(snap))
                    
                    try:
                        if 'lx_game_update_query' in g:
                            msg += "\n\nIn the LX DB, we ran the following:\nQuery %s w/ %s" % (g['lx_game_update_query'], g['lx_game_update_param'])
                    except Exception:
                        msg += "\n\n%s" % traceback.format_exc()
                        
                    if 'snapshot_algorithm_sent' not in g and msg not in data['telegram_messages']: 
                        #zc.send_telegram(msg, bot_token)
                        g['snapshot_algorithm_sent'] = 1
                        #zc.send_email(msg, {'subject': 'Game Snapshot Algorithm for %s' % g['description'], 'from': "Live Win Odds"})
                        data['telegram_messages'].append(msg)
                    
                    
                    data, g = send_final_tweet(data, g)         
                    data, g = store_scrape_timestamps(data, g)         
                    

                else:
                    cf_process_step['points'].append({'txt': "Game finals checks failed, so game is not over (%d/%d failed)" % (len(checks) - sum([z['fn'] for z in checks]), len(checks))})
                    if snap['pct_complete'] >= .90:
                        # Try and figure out which tests failed
                        for c in checks:
                            cf_process_step['points'].append({'txt': "\t%s: %s" % (c['tag'], "pass" if c['fn'] else "FAIL")})
                g['last_parse_process_step'] = cf_process_step
    except Exception:
        msg = "Error checking for auto-finals...\n\n%s" % traceback.format_exc()
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
    data['fn_runs'] += 1
    return data, browser

def refresh_game_laxref_content(data, browser):
    content = []
    try:
        query_tag = "refresh_game_laxref_content"
        cursor = zc.zcursor("LR")
        games_needing_content_updates = cursor.dqr("SELECT a.ID from LaxRef_Games a, LaxRef_Content b where b.game_ID=a.ID and a.active and b.active and DATE(a.game_date)>=%s and b.content_type='recap-paragraph'", [data['yesterday_dt']])
        this_run_game_IDs = [z['gs_ID'] for z in data['games']]
        if len(games_needing_content_updates) > 0:
            # For games requiring an update, add the post-game content to the data object that will be sent up to LR site via JSON
            
            IDs = " or ".join(["game_ID=%d" % z['ID'] for z in games_needing_content_updates if z['ID'] in this_run_game_IDs])
            if len(IDs) > 0:
                query = "SELECT game_ID, content, content_type from LaxRef_Content where active and ({})".format(IDs)
                content = cursor.dqr(query, [])
                #print ("Query %s" % query)
                #print ("Returned %d rows" % len(content))
            #else:
            #    print ("No content records match any of the games on this run: %s" % str(this_run_game_IDs))
        cursor.close()
        
        
        data = increment_queries(data, query_tag, games_needing_content_updates)
        
    except Exception:
        msg = "DB Fail: \n\nCould not get a response from the DB in refresh_game_laxref_content.\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        if '--test-refresh' in sys.argv: browser.close(); sys.exit()
        return data, browser
    
    try:
        
        
            
        
        recap_paragraphs = [z for z in content if z['content_type'] == "recap-paragraph"]

        for c in recap_paragraphs:
            
            game_data = data['games'][ [z['gs_ID'] for z in data['games']].index(c['game_ID'])]
            if game_data['recap-paragraph'] != c['content']:
                print ("\n\nWas\n%s" % game_data['recap-paragraph'])
                print ("\n\nUpdated\n%s" % c['content'])
            game_data['recap-paragraph'] = c['content']
        if '--test-refresh' in sys.argv:
            input("LOOP")
       
        pass
        
    except Exception:
        msg = "Error checking for auto-finals...\n\n%s" % traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
    data['fn_runs'] += 1
    return data, browser

def reload_rosters_and_alternate_names(data, browser):
    """
    During game executions, it's possible that a player may be added to a team roster; this function runs periodically to pull those updates from the database and apply them to each game object
    """
    tmp_start_ms = time.time()
    try:
        #laxref.telegram_alert("Start %s" % ("reload_rosters_and_alternate_names"))
        
        
        log_txt = "Execution reload_rosters_and_alternate_names @ %s" % (datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        query_tag = "LaxRef_Alternate_Player_Names"
        cursor = zc.zcursor("LR")
        query = "SELECT player_ID, alternate_name, team_ID from LaxRef_Alternate_Player_Names where DATE(date_added)=%s and active"
        param = [datetime.now().strftime("%Y-%m-%d")]
        log_txt += "\nRefresh LaxRef_Alternate_Player_Names using %s w/ %s" % (query, param)
        tmp_alternate_names = cursor.dqr(query, param)
        log_txt += "\nreturned {:,} records".format(len(tmp_alternate_names))
        log_txt += "\n%s\n" % str(tmp_alternate_names)
        data = increment_queries(data, query_tag, tmp_alternate_names)
        
        for p in tmp_alternate_names:
            p['hash'] = laxref.hash_player_name(p['alternate_name'])
        
        query_tag = "rosters"
        if '--roster-year' in sys.argv:
            query = "SELECT b.player, b.ID player_ID, a.team_ID, b.pro_url_tag, a.laxdotcom_ID from LaxRef_Player_Seasons a, LaxRef_Players b where DATE(a.date_added)=%s and b.ID=a.player_ID and a.active and b.active and IFNULL(b.is_individual, 1)=1 and a.year=%s"
            param = [datetime.now().strftime("%Y-%m-%d"), sys.argv[sys.argv.index('--roster-year') + 1]]
        else:
            query = "SELECT b.player, b.ID player_ID, a.team_ID, b.pro_url_tag, a.laxdotcom_ID from LaxRef_Player_Seasons a, LaxRef_Players b where DATE(a.date_added)=%s and b.ID=a.player_ID and a.active and b.active and IFNULL(b.is_individual, 1)=1 and a.year=%s"
            param = [datetime.now().strftime("%Y-%m-%d"), data['dt'].split("-")[0]]
        
        log_txt += "\nRefresh rosters using %s w/ %s" % (query, param)
        tmp_rosters = cursor.dqr(query, param)
        log_txt += "\nreturned {:,} records".format(len(tmp_rosters))
        data = increment_queries(data, query_tag, tmp_rosters)
        for p in tmp_rosters:
            p['hash'] = laxref.hash_player_name(p['player'])
            p['last_name'] = p['player'].split(" ")[-1].upper().strip()
            p['alternate_names'] = [z['hash'] for z in tmp_alternate_names if z['player_ID'] == p['player_ID']]
            
        query_tag = "LaxRef_Active_Live_WP_Games"
        db_live_games = cursor.dqr("SELECT a.ID 'game_ID', unidentified_players_error from LaxRef_Games a, LaxRef_Active_Live_WP_Games b where a.ID=b.game_ID and a.active and DATE(a.game_date)=%s", [data['dt']])
        data = increment_queries(data, query_tag, db_live_games)
        
        
        cursor.close()
        
        
        for game_data in data['games']:
        
            # 1) Check if a new player has been added to the roster

            tmp_away_roster = [z for z in tmp_rosters if z['team_ID'] == game_data['away_ID']]            
            for tmp_player in tmp_away_roster:
                if tmp_player['player_ID'] not in [z['player_ID'] for z in game_data['away_roster']]:
                    # Add the new player to game_data['away_roster']
                    game_data['away_roster'].append(tmp_player)
                    tmp_msg = "%s has been added to the game_data.away_roster for %s" % (tmp_player['player'], game_data['away_team'])
                    print (tmp_msg)
                    #laxref.telegram_alert(tmp_msg)
                    log_txt += "\n%s" % tmp_msg

            tmp_home_roster = [z for z in tmp_rosters if z['team_ID'] == game_data['home_ID']]            
            for tmp_player in tmp_home_roster:
                if tmp_player['player_ID'] not in [z['player_ID'] for z in game_data['home_roster']]:
                    # Add the new player to game_data['home_roster']
                    game_data['home_roster'].append(tmp_player)
                    tmp_msg = "%s has been added to the game_data.home_roster for %s" % (tmp_player['player'], game_data['home_team'])
                    print (tmp_msg)
                    #laxref.telegram_alert(tmp_msg)
                    log_txt += "\n%s" % tmp_msg
            
            # 2) Check if any players have new alternate name records
            for player in game_data['home_roster']:
                new_records = [z for z in tmp_alternate_names if z['player_ID'] == player['player_ID']]
                for r in new_records:
                    if r['hash'] not in player['alternate_names']:
                        player['alternate_names'].append(r['hash'])
                        tmp_msg = "%s (hash=%s) has been added as an alternate name for %s ( on %s )" % (r['alternate_name'], r['hash'], player['player'], game_data['home_team'])
                        print (tmp_msg)
                        #laxref.telegram_alert(tmp_msg)
                        log_txt += "\n%s" % tmp_msg
                        
            for player in game_data['away_roster']:
                new_records = [z for z in tmp_alternate_names if z['player_ID'] == player['player_ID']]
                for r in new_records:
                    if r['hash'] not in player['alternate_names']:
                        player['alternate_names'].append(r['hash'])
                        tmp_msg = "%s (hash=%s) has been added as an alternate name for %s ( on %s )" % (r['alternate_name'], r['hash'], player['player'], game_data['away_team'])
                        print (tmp_msg)
                        #laxref.telegram_alert(tmp_msg)
                        log_txt += "\n%s" % tmp_msg
        
        for game_data in data['games']:                
            # 3) Make sure the unidentified_players_str record is the current one from the DB
            if game_data['ID'] in [z['game_ID'] for z in db_live_games]:
                tmp_game = db_live_games[ [z['game_ID'] for z in db_live_games].index(game_data['ID']) ]
                game_data['unidentified_players_str'] = tmp_game['unidentified_players_error']
                log_txt += "\nSet the unidentified_players_str for game ID %d to %s" % (game_data['ID'], game_data['unidentified_players_str'])
    except Exception:
        msg = "DB Fail: \n\nCould not get a response from the DB in reload_rosters_and_alternate_names.\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: print (msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        if '--test-refresh' in sys.argv: browser.close(); sys.exit()
        return data, browser
    
    data['fn_runs'] += 1
    
    log_txt += "\n\nElapsed seconds: %.2f" % (time.time() - tmp_start_ms)
    f = open(os.path.join(lr_fldr, 'Logs', 'reload_rosters_and_alternate_names.log'), 'w'); f.write(log_txt); f.close()
    
    return data, browser

def report_query_data(data, browser):
    
    
    
    msg = "LWO.py Query Egress Report (%s)\n" % datetime.now().strftime("%I:%M %p")
    
    
    data['query_log'] = sorted(data['query_log'], key=lambda x:x['estimated_egress'], reverse=True)
    for q in data['query_log']:
        q['estimated_egress_in_mb'] = q['estimated_egress'] / 1024. / 1024.
    total_mb = sum([z['estimated_egress_in_mb'] for z in data['query_log']]) 
    msg += "\n".join(["%s - %.3fMB" % (z['query_tag'], z['estimated_egress_in_mb']) for z in data['query_log']]) 
    msg += "\n\nTotal MB: {:,.3f}".format(total_mb)
    #print (msg)
    #zc.send_telegram(msg, bot_token)

    if 'fn_runs' in data:
        data['fn_runs'] += 1
    return data, browser

def assign_host(game_data):
    sidearm_regex = re.compile(r'http://.*?\.com/links/[a-z0-9]{6}$', re.IGNORECASE)
    if '--use-db-plays' in sys.argv:
        game_data['host'] = None
    elif game_data['url'] in [None, '']:
        game_data['host'] = None
    elif "xlive.htm" in game_data['url']:
        game_data['host'] = "xlive"
    elif "sidearm" in game_data['url'] or "boxscore.aspx" in game_data['url']:
        game_data['host'] = "sidearm"
    elif "gametracker" in game_data['url']:
        game_data['host'] = "gametracker"
    elif "index.dbml" in game_data['url'] or "liveStats/" in game_data['url']:
        game_data['host'] = "sportselect"
    elif "pointstreak" in game_data['url']:
        game_data['host'] = "pointstreak"
    elif (".xml" in game_data['url'] or ".XML" in game_data['url']) and ("/sports/wlax/" in game_data['url'] or "/SPORTS/WLAX/" in game_data['url'] or "/sports/w-lacros/" in game_data['url'] or "/SPORTS/MLAX/" in game_data['url'] or "/sports/mlax/" in game_data['url'] or "/sports/m-lacros/" in game_data['url']):
        game_data['host'] = "presto"
    elif ".xml" in game_data['url']:
        game_data['host'] = "boxscore"
    elif "stretch" in game_data['url']:
        game_data['host'] = "stretch"
    elif sidearm_regex.search(game_data['url'].strip()) is not None:
        game_data['host'] = "sidearm"
    elif "ncaa.com" in game_data['url']:
        if "play-by-play" not in game_data['url']:
            game_data['url'] += "/play-by-play"
        game_data['host'] = "ncaa"
    elif "statb.us" in game_data['url']:
        game_data['host'] = "statbroadcast"
    else:
        game_data['host'] = "statbroadcast"
 
    return game_data

def get_processing_log_html(game_data, data):
    html = "<html><head></head><body>"
    for i, s in enumerate(game_data['processing_log']['steps']):
        
        if s is not None:
            # s could be None if it's one of the log objects that is included in the list even if it's not run during that loop (i.e. parse_plays) and it has not been created yet.
            if 'result' not in s:
                s['result'] = "N/A"
            html += "<div style='border-bottom: solid 1px #AAA; padding-top:20px; width: 100%; display:flex;'>"
            html += "<div style='width: 75%; display:flex;'><span style='font-size:24px; font-weight: 700;'>{}</span></div>".format( s['desc'] )
            html += "<div style='width: 25%; text-align:right; display:flex;'><span class=''>{}</span></div>".format( s['result'] )
            html += "</div>"
            for j, p in enumerate(s['points']):

                html += "<div style='border-bottom: solid 1px #EEE; width: 100%; display:flex;'><span class=''>{}</span></div>".format( p['txt'] )
    
    # This function add a summary of the actual game data (scores, players, etc) to debug issues unrelated to the looping of the script
    data, game_data = build_debug_game_report(data, game_data) 
    try:
        html += "<div style='border-bottom: solid 1px #AAA; padding-top:20px; width: 100%; display:flex;'>"
        html += "<div style='width: 75%; display:flex;'><span style='font-size:24px; font-weight: 700;'>{}</span></div>".format("Game Stats Summary")
        html += "<div style='width: 25%; text-align:right; display:flex;'><span class=''>{}</span></div>".format( "" )
        html += "</div>"
        html += "<div style='border-bottom: solid 1px #EEE; width: 100%; display:flex;'><span class=''>{}</span></div>".format( game_data['debug_report_text'].replace("\n", "<BR>" ))
    except Exception:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
    html += "</body></html>"
    return game_data, data, html

def prepare_and_send_live_processing_log(game_data, data):
    """
    When an admin has requested a processing log from a specific game, this function processes the game processing log, prepares the email read-out, sends it to the admin, and then sets the debug flag back to 0 in LaxRef_Active_Live_WP_Games
    """
    res = {}
    
    
    try:
    
        

        # Prepare the email
        game_data, data, msg = get_processing_log_html(game_data, data)
        n_sends = game_data['n_debug_logs_sent'] + 1

        if 'attachments' in game_data and game_data['attachments'] is not None:
            zc.send_email(msg, {'subject': 'Game Processing Log: %s' % game_data['description'], 'from': "Live Win Odds", 'attachments': game_data['attachments']})
            game_data['attachments'] = None
        else:
            zc.send_email(msg, {'subject': 'Game Processing Log: %s' % game_data['description'], 'from': "Live Win Odds"})
        
        # Reset the flag in the database table to 0 so that logs do not continue to be sent
        
        
        query = "UPDATE LaxRef_Active_Live_WP_Games set debug_live_processing=0 where game_ID=%s" 
        param = [game_data['ID']]
        cursor = zc.zcursor("LR")
        cursor.execute(query, param)
        cursor.commit(); cursor.close()
        
        game_data['n_debug_logs_sent'] += 1
        res['success'] = 1
    except Exception:
        res['success'] = 0
        msg = "Attempting to process a debug_live_processing request. But it failed\n\n%s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    game_data['debug_live_processing'] = 0    
    return game_data, data, res
   

    
def add_tab(browser, data):
    existing_handles = browser.window_handles
    browser.execute_script('''window.open("https://ascii.com","_blank");''') 
    
    new_code = [z for z in browser.window_handles if z not in existing_handles][0]
    print ("New window hash: %s" % new_code)
    return new_code

def local_upload_file(m, upload_batch_src, specs={'league': None}):
    """
    This function is a catch all store a record of the storage upload that is required by this script. If the async flag is not set, it will actually execute the upload. If it is, that step will be skipped, but the command will be written to the batch file for subsequent processing
    """
    if '--async-upload' not in sys.argv:
        laxref.upload_file(m)
    else:
        if 'top_bucket' not in m:
            m['top_bucket'] = "capozziinc.appspot.com"
        if 'fname' not in m or m['fname'] is None:
            m['fname'] = m['src'].split("\\")[-1]
            
        if 'league_check' not in specs or not specs['league_check'] or (specs['league_check'] and '-league' in sys.argv):
            cmd = "CALL gsutil cp \"{}\" \"{}\"".format(m['src'], "gs://%s/%s" % (m['top_bucket'], m['target_folder']))
            
            # Assume that we should include everything, but if the associated command is already on the batch file, then we do not need to add it again
            add_it = 1
            try:
                existing_commands = [z.strip().lower() for z in open(upload_batch_src, 'r').read().split("\n") if z.strip() != ""]
                if cmd.strip().lower() in existing_commands:
                    add_it = 0
            except Exception:
                print("\n\n{}\n\n".format(traceback.format_exc()))
                
            # If we aren't going to add it to the active list, then just put a REM in front
            f = open(upload_batch_src, 'a'); 
            f.write("%s%s\n" % ("REM [duplicate] " if not add_it else "", cmd))
            f.close()


def record_execution_breadcrumb(data, breadcrumb):
    """
    This function records a last-action type of breadcrumb to a file. The idea is that an external script can pick up that breadcrumb file and know what's going on with this specific execution. If this script hangs for some reason, that can be a way to kick off a second execution. This function should return if the execution flag is not included in sys.argv
    """
    if '-execution' not in sys.argv:
        pass
    else:
        machine_execution = sys.argv[sys.argv.index('-execution') + 1]
        if 'txt' in breadcrumb:
            txt = breadcrumb['txt'].replace("\n", "\\n")
            
            f = open(os.path.join(lr_fldr, 'Logs', 'breadcrumb%s.log' % machine_execution).replace(" ", ""), 'w')
            f.write("%s %s" % (datetime.now().strftime("%Y%m%d%H%M%S"), txt))
            f.close()
    return data    
    
def run():
    
    browser = None
    
    data = record_execution_breadcrumb(None, {'txt': 'Begin execution'})
    if '--is-a-reprocessing' in sys.argv and datetime.now().strftime("%Y%m%d") == "20240309" and '--game-ID' in sys.argv:
        laxref.log_timestamps_generic("{:<60}{:<15}".format("    Start Live Win Odds", datetime.now().strftime("%Y%m%d %H:%M:%S.%f")[0:-3]), os.path.join(lr_fldr, "Logs", "GameReProcessingTimestampLogs"), "%s.txt" % sys.argv[sys.argv.index('--game-ID') + 1])
    
    start_get_data_object_ms = time.time()
    data = get_data_object()
    
    
    
    end_get_data_object_ms = time.time()
    print ("Data object created for %d games in %.2f seconds" % (len(data['games']), end_get_data_object_ms - start_get_data_object_ms))
    if '--start-at' in sys.argv:
        data = record_execution_breadcrumb(data, {'txt': 'Waiting to begin'})
        start_dt = datetime.strptime("%s %s" % (datetime.now().strftime("%Y%m%d"), sys.argv[sys.argv.index('--start-at') + 1]), "%Y%m%d %H:%M")
        if datetime.now() < start_dt:
            print ("Wait until %s to start processing this set of games" % (start_dt.strftime("%I:%M %p")))
            
        while datetime.now() < start_dt:
            time.sleep(1)


    if '--use-archive' not in sys.argv and '--use-db-plays' not in sys.argv:
        if '--use-firefox' in sys.argv:
            
            options = webdriver.FirefoxOptions()

            if '--headless' in sys.argv or '-headless' in sys.argv:
                options.add_argument("-headless")
                
            options.add_argument("--ignore-certificate-errors")
            options.add_argument("ignore-certificate-errors")

            options.add_argument('--ignore-ssl-errors')
            options.add_argument('ignore-ssl-errors')

            
            options.binary_location = "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
            
            browser = webdriver.Firefox(options=options)
        else:
            if USE_SERVICE:
                service = Service(executable_path=chromedriver)
                caps = webdriver.DesiredCapabilities.CHROME.copy()
                caps['acceptInsecureCerts'] = True
                try:
                    browser = webdriver.Chrome(service=service, options=chromeOptions, desired_capabilities=caps)
                except Exception:
                    browser = webdriver.Chrome(service=service, options=chromeOptions)
            else:
                browser = webdriver.Chrome(chromedriver,options=chromeOptions, desired_capabilities=chromeOptions.to_capabilities())
        
        # Should, in theory, prevent the situation where browser.get just hangs and the page is never considered loaded
        browser.set_page_load_timeout(30)
        
        # Adjust the size of the browser to be screen length - 50 px
        try:
            import ctypes
            user32 = ctypes.windll.user32
            
            screensize = user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)
            if '-sequence' in sys.argv:
                seq = int(sys.argv[sys.argv.index("-sequence") + 1])
                
                browser.set_window_position(5 + 30 * seq, 5 + seq*25)
                print ("Moved browser to %d, %d" % (10 + 30 * seq, 15 + seq*2))
            else:
                browser.set_window_position(10, 10)
            browser.set_window_size(screensize[0]-190, screensize[1]-190)
            
            #zc.send_telegram("Successfully set screen size to %d x %d" % (screensize[0]-30, screensize[1]-60), bot_token)
        except Exception:
            msg = "Failed trying to set the Selenium browser's screen size:\n\n%s" % (traceback.format_exc())
            zc.send_telegram(msg, bot_token)
    start_ms = current_milli_time()

    if '--use-archive' not in sys.argv and '--use-db-plays' not in sys.argv:
        if len(browser.window_handles) > 1:
            browser.switch_to.window(browser.window_handles[1])
            browser.close()
        browser.switch_to.window(browser.window_handles[0])
        
   
    # ID which live stats host this is based on the url
    
    for ig, game_data in enumerate(data['games']):
            
        game_data = assign_host(game_data)
        
    cycles = 0; last_runs = [
    {'fn': check_for_finals, 'return': 'data', 'gap': 60, 'tag': 'upload_final_play_data', 'last_run': 0* time.time()}
    , {'fn': refresh_game_laxref_content, 'return': 'data', 'gap': 300, 'tag': 'refresh_game_laxref_content', 'last_run': 0* time.time()}
    , {'fn': report_query_data, 'return': 'data', 'gap': 900, 'tag': 'report_query_data', 'last_run': 0* time.time()}
    , {'fn': reload_rosters_and_alternate_names, 'return': 'data', 'gap': 60, 'tag': 'reload_rosters_and_alternate_names', 'last_run': time.time()}
    ]
    
        
    
    data['fn_runs'] = 0
    machine_execution = None
    if '-execution' in sys.argv:
        machine_execution = sys.argv[sys.argv.index('-execution') + 1]
        
    kill_msg_test_sent = 0; killed = 0; last_second = None
    while there_are_active_games(data) and not killed:
        
        # If we are running a single window overflow execution and it is 6PM, we should switch this window to a normal execution to finish of the games that haven't finished yet.
        
        if '--test-single-window-restart' in sys.argv or '--single-window-execution' in sys.argv:
            restart_exec = 0
            if datetime.now().hour == 18 and datetime.now().minute >= 30:
                restart_exec = 1
            if restart_exec:
                cmd = "python " + " ".join(map(str, [z for z in sys.argv if z != "--single-window-execution"]))
                cmd = cmd.replace("--game-ID ", "--game-ID \"").replace(" --upload-to-LRP", "\" --upload-to-LRP")
                print (cmd)
           
                msg = "This was a single window execution, but it is %s, so we are going to restart this script without the single window restriction\n\n%s" % (datetime.now().strftime("%H:%M"), cmd)
                zc.send_telegram(msg, bot_token)
                browser.close()
                os.system(cmd)
                
                break
                
        # Each loop should be at minimum 3 seconds
        if last_second is not None:
            while int(time.time()) - last_second < 3:
                time.sleep(.1)
        last_second = int(time.time())        
        
        data = record_execution_breadcrumb(data, {'txt': 'Enter active games loop'})    
            
        cycles += 1
        #print ("")
        for ig, game_data in enumerate(data['games']):
            
            # Check if an admin has indicated that this script should stop running
            if os.path.isfile(os.path.join(piFolder, 'kill_live_win_odds')):
                zc.send_telegram("General kill command received for %s" % " ".join(sys.argv), bot_token)
                killed = 1
                break
            if machine_execution is not None:
                kill_if_found_fname = "kill_live_win_odds_%s" % machine_execution
                if os.path.isfile(os.path.join(piFolder, kill_if_found_fname)):
                    zc.send_telegram("Specific kill command received for %s" % " ".join(sys.argv), bot_token)
                    killed = 1
                    break
                if not kill_msg_test_sent:
                    kill_msg_test_sent = 1
                    msg = "Testing the kill process for a specific script...\n\n"
                    msg += "\n\nKill if this file is found: %s" % kill_if_found_fname
                    msg += "\n\nIt was not found..."
                    #zc.send_telegram(msg, bot_token)
            
            if not killed:
                game_data['processing_log'] = {'steps': []}
                process_step = {'desc': "To Process or not?", 'result': "PROCESS", 'result_val': 1, 'points': []}
                game_data['process_this_loop'] = 1
                
                # If this is a completed game that we are just running once, go ahead and process it
                process_step['points'].append({'txt': "Continue (and process) if db_game_over==1 or it's a one and done: %s" % (game_data['db_game_over'] and ('--one-and-done' in sys.argv or '--use-db-plays' in sys.argv))})
                if game_data['db_game_over'] and ('--one-and-done' in sys.argv or '--use-db-plays' in sys.argv):
                    continue
                
                # If the game has been marked as over, but we have not run a last loop to finalize it, then it needs to be processed
                process_step['points'].append({'txt': "Continue (and process) if db_game_over==1 and it's not in skip mode and it's not been set had the finalization stuff done: %s" % (game_data['db_game_over'] and not game_data['finalized'] and not game_data['skip'])})
                if game_data['db_game_over'] and not game_data['finalized'] and not game_data['skip']:
                    continue
                
                    
                # The game is already over.
                process_step['points'].append({'txt': "DO NOT PROCESS if db_game_over==1 or (game_over != 1 and skip != 1): %s" % (game_data['db_game_over'] or (game_data['game_over'] not in [0, None] and game_data['game_over_at'] is not None))})
                if game_data['db_game_over'] or (game_data['game_over'] not in [0, None] and game_data['game_over_at'] is not None):
                    game_data['process_this_loop'] = 0
                    
                    print ("{:<75}{:<20}{:<20}{:<20}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "OVER"))
                    
                # The game has been flagged via The LaxRef_Active_Live_WP_Games table
                process_step['points'].append({'txt': "DO NOT PROCESS if there are multiple games (%s) and skip==1 (%s): final = %s" % (len(data['games']) > 1, game_data['skip'], len(data['games']) > 1 and game_data['skip'])})
                if game_data['process_this_loop'] and len(data['games']) > 1 and game_data['skip']:
                    game_data['process_this_loop'] = 0
                    print ("{:<75}{:<20}{:<20}{:<20}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "SKIPPED"))
                if game_data['process_this_loop'] and len(data['games']) > 1 and ('status' in game_data and game_data['status'] == "pending"):
                    game_data['process_this_loop'] = 0
                    print ("{:<75}{:<20}{:<20}{:<20}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "PENDING"))
                    
                # The game has been flagged via The LaxRef_Games status field as 'pending' (i.e. can't process it because of some issue)
                process_step['points'].append({'txt': "DO NOT PROCESS if there are multiple games (%s) and pending==1 (%s): final = %s" % (len(data['games']) > 1, 'pending' in game_data and game_data['pending'], len(data['games']) > 1 and 'pending' in game_data and game_data['pending'])})
                if game_data['process_this_loop'] and len(data['games']) > 1 and 'pending' in game_data and game_data['pending']:
                    game_data['process_this_loop'] = 0
                    msg = "Because %s (%s) has been marked as pending, we are closing the browser tab and will no longer attempt to process it." % (game_data['description'], game_data['league'])
                    
                    if game_data['window_handle'] is not None: 
                        #zc.send_telegram(msg, bot_token)
                        if len(browser.window_handles) > 1:
                            browser.switch_to.window(game_data['window_handle']); browser.close()
                        else:
                            browser.get("https://google.com")
                        game_data['window_handle'] = None
                    print ("{:<75}{:<20}{:<20}{:<20}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "PENDING"))
                    
                    
                # The game has not started
                process_step['points'].append({'txt': "DO NOT PROCESS if the we haven't reached the assigned game start time yet: %s" % (game_data['game_date'] > datetime.now())})
                if game_data['process_this_loop'] and game_data['game_date'] > datetime.now() and ('--start-now' not in sys.argv and '-simulation' not in sys.argv):
                    game_data['process_this_loop'] = 0
                    print ("{:<75}{:<20}{:<20}{:<40}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "NOT STARTED (%s)" % game_data['game_date'].strftime("%I:%M %p")))
                    
                    
                if game_data['process_this_loop']:
                    print ("{:<75}{:<20}{:<20}{:>40}".format(game_data['game_file'], "NO WINDOW!!!!!" if game_data['window_handle'] is None else "", game_data['ID'], "PROCESS"))
              
                if '--one-and-done' in sys.argv:
                    game_data['game_over_at'] = time.time()
                        
                if not game_data['process_this_loop']:
                    process_step['result'] = "NO PROCESS"
                    process_step['result_val'] = 0
                    
                game_data['processing_log']['steps'].append(process_step)
        if killed:
            break
            
        n_processed_this_loop = sum([1 for z in data['games'] if z['process_this_loop'] == 1])
        if n_processed_this_loop == 0: # No games were processed, sleep for 5 seconds   
            time.sleep(5)
        elif n_processed_this_loop == 1: # Only 1 game was processed, sleep for 3 seconds   
            time.sleep(3)
        elif n_processed_this_loop == 2: # Only 2 games were processed, sleep for 1 seconds   
            time.sleep(1)
            
        for ig, game_data in enumerate(data['games']):
            if os.path.isfile(os.path.join(piFolder, 'kill_live_win_odds')):
                zc.send_telegram("General kill command received for %s" % " ".join(sys.argv), bot_token)
                killed = 1
                break
            if machine_execution is not None:
                kill_if_found_fname = "kill_live_win_odds_%s" % machine_execution
                if os.path.isfile(os.path.join(piFolder, kill_if_found_fname)):
                    zc.send_telegram("Specific kill command received for %s" % " ".join(sys.argv), bot_token)
                    killed = 1
                    break
                if not kill_msg_test_sent:
                    kill_msg_test_sent = 1
                    msg = "Testing the kill process for a specific script...\n\n"
                    msg += "\n\nKill if this file is found: %s" % kill_if_found_fname
                    msg += "\n\nIt was not found..."
                    #zc.send_telegram(msg, bot_token)
            
            if not killed:
                if game_data['process_this_loop']:
                    if '--use-db-plays' in sys.argv:
                        #123
                        
                        game_data = parse_plays(None, game_data, data)
                        if 'last_parse_process_step' in game_data and game_data['last_parse_process_step'] is not None and game_data['last_parse_process_step']['result'] in ["ERROR/CRASH"]:
                            msg = "Because we could not create a game object for %s, we are going to exit the script\n\nError: %s" % (game_data['description'], zc.print_dict(game_data['last_parse_process_step']['points']))
                            zc.send_telegram(msg, bot_token); zc.exit("GAME OBJECT FAIL")
                        
                        if '--set-laxshop-to-final' in sys.argv:
                            # Update the Lax.Com record to show that the game is final
                            game_data['lx_game_update_query'] = "UPDATE schedule{:.0f} set clock_status='FINAL', is_final=1 where id=%s".format(data['year']-2000)
                            game_data['lx_game_update_param'] = [game_data['laxdotcom_ID']]
                            tmp_start_ms = time.time()
                            
                            print ("Query %s w/ %s" % (game_data['lx_game_update_query'], game_data['lx_game_update_param']))
                            #if input("Run this? (y/n) ").lower() != "y":
                            #    zc.exit("EXITING>>")
                            conn, cursor = zc.db(lx_db_tag)
                            cursor.execute(game_data['lx_game_update_query'], game_data['lx_game_update_param'])
                            cursor.close(); conn.close()
                    
                        game_data['game_over_at'] = datetime.now()
                    else:
                        process_step = {'desc': "ID Processing function", 'result': "PROCESS", 'result_val': 1, 'points': []}
                        # We want to switch to the right browser tab here because it's central and we need the code once, but if a game hasn't been set up yet, then this will fail
                        if game_data['window_handle'] is not None:
                            switched = 0
                            try:
                                browser.switch_to.window(game_data['window_handle']); time.sleep(1); switched = 1
                            except Exception:
                                if (game_data['last_error_msg_timestamp'] is None or (datetime.now() - game_data['last_error_msg_timestamp']).total_seconds() > 600):
                                    msg = "Could not switch to the browser window for the %s game" % game_data['game_file']
                                    msg_plus = "Could not switch to the browser window for the %s game\n\n%s" % (game_data['game_file'], traceback.format_exc())
                                    #if msg not in data['telegram_messages']: zc.send_telegram(msg_plus, bot_token); data['telegram_messages'].append(msg)
                                    game_data['last_error_msg_timestamp'] = datetime.now()
                        else:
                            switched = 1
                            
                        if not switched and not game_data['url_change']:
                            process_step['result'] = "NOT SWITCHED"; process_step['result_val'] = 0
                            process_step['points'].append({'txt': "NOT SWITCHED"})
                            game_data['processing_log']['steps'].append(process_step)         
                        else:
                            #print (" Processing %s" % game_data['description'])
                            view_site_fn = None
                            
                            process_step['result'] = "NO VIEW SITE FN (URL=%s; HOST=%s)" % (game_data['url'], game_data['host']); process_step['result_val'] = 0
                       
                            if game_data['url'] is not None and "\\Documents\\" in game_data['url']:
                                view_site_fn = view_site_local
                                process_step['result'] = "View using local"; process_step['result_val'] = 1
                                
                            elif game_data['host'] == "xlive":
                                view_site_fn = view_site_xlive
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "sidearm":
                                view_site_fn = view_site_sidearm
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "gametracker":
                                view_site_fn = view_site_gametracker
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "sportselect":
                                view_site_fn = view_site_sportselect
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "pointstreak":
                                view_site_fn = view_site_pointstreak
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "presto":
                                view_site_fn = view_site_presto
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "boxscore":
                                view_site_fn = view_site_boxscore
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "stretch":
                                view_site_fn = view_site_stretch
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            elif game_data['host'] == "ncaa":
                                view_site_fn = view_site_ncaa
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                                
                            elif game_data['host'] == "statbroadcast":
                                view_site_fn = view_site_statbroadcast
                                process_step['result'] = "View using %s" % game_data['host']; process_step['result_val'] = 1
                            
                            
                            game_data['processing_log']['steps'].append(process_step)                        

                            if view_site_fn is not None:                         
                                game_data = view_site_fn(browser, game_data, data)
                            

                if 'debug_live_processing' in game_data and game_data['debug_live_processing']:
                    if len(data['games']) == 1 or not game_data['skip']:
                        game_data, data, result = prepare_and_send_live_processing_log(game_data, data)
        
        if killed:
            break
        
        # Refresh the game dates just in case something has changed on that front
        if '--auto-refresh' in sys.argv: 
            data = refresh_game_objects(data)
            
        # Fast is 30; normal is 90; slow would be 300
        # I tried a day where I had way more executions than normal (i.e. 30) and I was getting a lot of very slow refresh times with the refresh setting at 30. Going to shift that to 180 to see if we get fewer warnings (it was a Tuesday, so there will be 3x the number of games although just 20% more executions)
        
        # [ March 6th, 2024] Used 180 for a few weeks and did not see any more of those warnings, so I'm going to switch to 120 seconds and see if they come back; less errors is good, but 3 minutes was a long time between refreshes (that's an issue because things like abbreviation entries don't feed into the loop until a refresh happens)
        # [ March 9th, 2024] Didn't have any issues with the error re-occuring with a 120 gap; I am also shifting to fewer executions and more games per execution, which should help. Going to try 60 and see if that still works fine.
        elif time.time() - data['last_game_objects_refresh'] > 60:
            data = refresh_game_objects(data)
            data['last_game_objects_refresh'] = time.time()
        
        if '--reload-laxref' in sys.argv and cycles % 5 == 0:
            reload(laxref)
        
        # Check if any of the functions that are run periodically (not with every loop) need to be run again
        fns = [z for z in last_runs if time.time() - z['last_run'] > z['gap']]
        if '--test-db-plays' in sys.argv:
            print("%s or %s=%s" % (not there_are_active_games(data), len(fns) > 0, not there_are_active_games(data) or len(fns) > 0))
        if not there_are_active_games(data) or len(fns) > 0:
            print ("Run the following function(s): %s" % ", ".join([z['tag'] for z in fns]))
            for fn in fns:
                fn['last_run'] = time.time()
                if fn['return'] == "data":
                    data, browser = fn['fn'](data, browser)
    data, browser = report_query_data(data, browser)
    
def view_site_local(browser, game_data, data):
    process_step = {'result': "", 'desc': "View Site Local", 'points': []}
    plays_captured = []

    game_url_html_src = game_data['url']
    last_quote = None

    game_data['loops'] += 1
    try:
        page_source = open(game_url_html_src, 'r').read()
        
        if '--test-peshko' in sys.argv:
            page_source = page_source.replace("Johnathan Peshko", "John Peshko")

        plays_captured, end_of_period = process_local_plays(page_source, game_data, data, False, [], None)
        
        if len(game_data['plays_captured']) < len(plays_captured):
            game_data['plays_captured'] = plays_captured
            num_plays = len(game_data['plays_captured'])
            #plays_captured = sorted(plays_captured, key=lambda x:x['game_elapsed'])
            #print_plays(plays_captured); print("\n\tEnd of period: %s\n" % end_of_period)
            #game_over, data = parse_plays(browser, plays_captured, data, loops, end_of_period)
            game_data = parse_plays(browser, game_data, data)
            if game_data['game_over'] and game_data['game_over_at'] is None:
                game_data['game_over_at'] = loops
                print("We are at loop #%d, run until loop #%d" % (loops, loops + 80))
            game_data['non_update_loops'] = 0
        else:
            game_data['non_update_loops'] += 1

    except Exception as fds:
        msg = traceback.format_exc()
        if msg not in data['telegram_messages']: print (msg); telegram_alert(msg); zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)

    #dir_name = os.path.join('/home/pi/zack/Logs')
    #if os.path.isfile(os.path.join(dir_name, data['filename'])):
    #    os.remove(os.path.join(dir_name, data['filename']))
    #    break

    return game_data
    
def process_local_plays(play_data, game_data, data, most_recent, plays_captured, manual_quarter):

    play_data, game_data = clean_data(play_data, game_data)
    
    #f = open('local_play_data', 'w'); f.write(play_data); f.close()

    play_regexes = []
    play_regexes.append({'regex': re.compile(r'<tr(?: class=\"[^>]*?\")?><td class=\".*?\">(?:<div class=\".*?\"></div>)?</td><td>.*?</td><td(?: class=\".*?\")?><div(?: class=\".*?\")?>.*?</div></td><td class=\".*?\">([0-9]+?):([0-9]+?)</td><td(?: class=\".*?\")?>(.*?)</td></tr>', re.IGNORECASE), 'minute_group': 1, 'second_group': 2, 'play_group': 3})


    header_regex = re.compile(r'<div class=\".*?\"\s*>(Period ([0-9]+) Plays)</div>', re.IGNORECASE)
    matches = re.findall(header_regex, play_data)

    play_data_list = []
    tmp = play_data
    last_loc = None
    if len(matches) == 0:
        pass
    elif len(matches) == 1:
        play_data_list.append({'quarter': int(matches[0][1]), 'text': play_data})
    else:
        unique_quarters = list(set([z[1] for z in matches]))
        dups = True if len(unique_quarters) < len(matches) else False

        if not dups:
            for i, m in enumerate(matches):
                if i + 1 < len(matches):
                    start_loc = tmp.index(m[0])
                    end_loc = tmp.index(matches[i+1][0])
                    quarter = int(m[1])
                    #print m, start_loc, end_loc, quarter

                    play_data_list.append({'quarter': quarter, 'text': tmp[start_loc:end_loc]})

                else:
                    start_loc = tmp.index(m[0])
                    quarter = int(m[1])
                    print (m, start_loc, end_loc, quarter)

                    play_data_list.append({'quarter': quarter, 'text': tmp[start_loc:]})







    last_match = None
    end_of_period = False
    plays_added = 0
    plays_already_added = 0
    first_non_play_match = 1
    for i, p in enumerate(play_data_list):

        quarter = p['quarter']
        for r in play_regexes:
            matches = re.findall(r['regex'], p['text'])



            for im, m in enumerate(matches):
                remaining = 60*int(m[-1+r['minute_group']]) + int(m[-1+r['second_group']])
                quarter_elapsed = (900 if quarter < 5 else 240) - remaining
                game_elapsed = min(4, quarter - 1) * 900 + max(0, quarter-5)*240 + quarter_elapsed
                pct_complete = float(game_elapsed)/3600.0
                play = {'game_elapsed': game_elapsed, 'quarter': quarter, 'pct_complete': pct_complete}

                if '--show-plays' in sys.argv:
                    print ("{:<10}{:<150}{:<5}{:<20}" .format ("%d / %d" % (im+1, len(matches)), str(m), quarter, "%.1f%%" % (100.*pct_complete)))

                sub_play_regex = re.compile(r'(.*?) (?:by|for|against|on) ([A-Z\-0-9\~\(\)]+?),?(\s.+?)?(\.?$|\n\s*.+?\.?$)', re.IGNORECASE)
                detail = m[-1 + r['play_group']]
                if manual_quarter is None:
                    if im == len(matches)-1: last_match = detail
                else:
                    if im == 0: last_match = detail


                #print "\t%s" % detail
                play_match = sub_play_regex.search(detail)
                if play_match is not None:
                    if play_match.group(3) is None:
                        detail = play_match.group(4)
                    else:
                        detail = "%s%s" % (play_match.group(3), play_match.group(4))

                    details = "%s by %s %s" % (play_match.group(1), play_match.group(2), detail)
                    play['team']  = play_match.group(2)

                    play['event_type'], translate_msg = laxref.translate_event_type(play_match.group(1), detail, details)
                    play['detail'] = details
                    rec = "%s|%s" % (play['pct_complete'], play['detail'])
                    if rec not in ["%s|%s" % (z['pct_complete'], z['detail']) for z in plays_captured]:
                        plays_captured.append(play)
                        plays_added += 1
                    else:
                        plays_already_added += 1
                elif we_cant_ignore_unknown_play(game_data, detail) and lineup_regex.search(detail) is None and not detail.startswith("For ") and "SUBSTITUTION" not in detail.upper() and "MEDIA TIMEOUT" not in detail.upper():
                    error_msg = "Error: the regex could not play_match on: %s" % (detail)
                    data, game_data, first_non_play_match = notify_regex_error(data, game_data, error_msg, first_non_play_match)
    #print "Last match: %s" % last_match
    if last_match in end_of_period_strings: end_of_period = True

    print ("\nWe added %d newly found plays and did not add %d plays that were already stored.\n" % (plays_added, plays_already_added))
    #time.sleep(1)
    return plays_captured, end_of_period

    
def refresh_game_objects(data):
    """ 
    This function is run periodically to pull updates that have been made to the database in to the actual game records.
    """
    refresh_start_ms = time.time()
    
    try:
        
        # In some cases, if we are using the separate upload_modified_... script to make actual DB updates, it's possible that the loop that contains a player's insert query to the LX game_data table can be skipped (perhaps it's overwritten by a new loop before the script can deal with it); so we want to refresh the current data in the LX database so that if that insert was skipped, it'll show up as a missing player and be re-triggered
        lx_game_data_query = "SELECT a.schedule_id, a.roster_id, a.goals, a.assists, a.saves, a.goals_allowed, a.shots, a.gb, a.turnovers, a.ct, a.fo_won, a.fo_taken from game_data{:.0f} a, schedule{:.0f} b where DATE(b.date)=%s and b.id=a.schedule_id".format(data['year']-2000, data['year']-2000)
        lx_game_data_param = [data['dt']]
        tmp_start_ms = time.time()
        conn, cursor = zc.db(lx_db_tag)
        cursor.execute(lx_game_data_query, lx_game_data_param)
        tmp_game_data_records = zc.dict_query_results(cursor)
        cursor.close(); conn.close()
        tmp_end_ms = time.time()
        
        
        cursor = zc.zcursor("LR")
        query_tag = "LaxRef_Teams.replacement_text"
        cursor.execute("SELECT ID team_ID, replacement_text from LaxRef_Teams where active and NOT ISNULL(replacement_text)", [])
        tmp_team_replacement_text = zc.dict_query_results(cursor)
        data = increment_queries(data, query_tag, tmp_team_replacement_text)
        
        query_tag = "rgo_db_games"
        db_games = cursor.dqr("SELECT a.ID, a.game_date from LaxRef_Games a where active and DATE(a.game_date)=%s", [data['dt']])
        data = increment_queries(data, query_tag, db_games)
        
        query_tag = "rgo_db_live_games"
        db_live_games = cursor.dqr("SELECT a.ID 'game_ID', IFNULL(b.clear_abbreviations, 0) clear_abbreviations, IFNULL(b.debug_live_processing, 0) debug_live_processing, b.replacement_text, b.first_timestamp_is_zero, IFNULL(b.ignore_unidentified_players_error, 0) ignore_unidentified_players_error, b.skip, b.reverse_timestamps from LaxRef_Games a, LaxRef_Active_Live_WP_Games b where a.ID=b.game_ID and a.active and DATE(a.game_date)=%s", [data['dt']])
        data = increment_queries(data, query_tag, db_live_games)
        if '--log-rgo-db-live-games' in sys.argv:
            flog = io.open(os.path.join(lr_fldr, "Logs", "rgo_db_live_games.json"), 'w', encoding="utf8")
            flog.write(json.dumps(db_live_games, default=zc.json_handler, indent=2)); flog.close()
        
        query_tag = "rgo_db_game_streams"
        db_game_streams = cursor.dqr("SELECT a.ID 'game_ID', b.abbreviation_user_response_dict, CASE WHEN a.status='pending' THEN 1 ELSE 0 END 'pending', b.url_confirmed, b.url, b.ignore_duplicate_plays_error from LaxRef_Games a, LaxRef_Game_Streams b where a.ID=b.game_ID and a.active and DATE(a.game_date)=%s", [data['dt']])
        data = increment_queries(data, query_tag, db_game_streams)
        cursor.close()
    except Exception:
        msg = "DB Fail: \n\nCould not get a response from the DB in refresh_game_objects: %s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return data
        
    misc = {'changed_dates': 0, 'changed_urls': 0, 'changed_pending': 0, 'changed_skips': 0}
    for i, g in enumerate(data['games']):
    
        
        g['lx_PGS_records'] = [z for z in tmp_game_data_records if z['schedule_id'] == g['laxdotcom_ID']]
        g['url_change'] = 0
        db_game = None
        if g['ID'] in [z['ID'] for z in db_games]:
            db_game = db_games[ [z['ID'] for z in db_games].index(g['ID'])]
        
        if db_game is not None:
            if db_game['game_date'] != g['game_date']:
                misc['changed_dates'] += 1
                g['game_date'] = db_game['game_date']
                g['num_plays'] = 0
                
                print ("Set num plays to zero because the game_date changed")
                g['home_team'] = None; g['away_team'] = None
        
        live_game = None
        if g['ID'] in [z['game_ID'] for z in db_live_games]:
            live_game = db_live_games[ [z['game_ID'] for z in db_live_games].index(g['ID'])]
        
        if live_game is not None:
            if g['first_timestamp_is_zero'] != live_game['first_timestamp_is_zero']:
                g['first_timestamp_is_zero'] = live_game['first_timestamp_is_zero']
            
            g['debug_live_processing'] = live_game['debug_live_processing']
            if g['ignore_unidentified_players_error'] != live_game['ignore_unidentified_players_error']:
                msg = "In refresh_game_objects function, we received a command to update ignore_unidentified_players_error to %s" % live_game['ignore_unidentified_players_error']
                #zc.send_telegram(msg, bot_token)
            g['ignore_unidentified_players_error'] = live_game['ignore_unidentified_players_error']
            
            if live_game['clear_abbreviations']:
                msg = "In refresh_game_objects function, we received a command to clear the abbreviations for %s" % g['description']
                #zc.send_telegram(msg, bot_token)
                g['home_team'] = None
                g['away_team'] = None
                g['home_abbreviation'] = None
                g['away_abbreviation'] = None
                g['pending'] = 0 if g['status'] != "pending" else 1
                g['loops'] = 0
                
                g['consecutive_quarter_duplications'] = 0
                g['consecutive_selenium_fails'] = 0
                g['html_final_cnt'] = None
                g['html_halftime_cnt'] = None
                g['last_change_in_final_tags'] = None
                g['last_change_in_halftime_tags'] = None
                g['consec_missing'] = 0
                g['last_parse_process_step'] = None
                g['last_check_for_finals_step'] = None
                g['non_update_loops'] = 0
                g['end_of_period'] = None
                g['reddit_summary'] = None
                g['plays_captured'] = []
                g['last_refresh'] = None
                g['num_plays'] = 0
                g['loops_since_last_parse'] = 0
                g['last_abbreviation_request'] = 0
                g['last_bad_play_type_error'] = 0
                g['last_parse_loop'] = None
                g['skip'] = 0 if 'skip' not in g or g['skip'] in [None, 0] else 1
                g['reverse_timestamps'] = 0 if 'reverse_timestamps' not in g or g['reverse_timestamps'] in [None, 0] else 1
                g['game_over_at'] = None
        
        
                cursor = zc.zcursor("LR")
                query = "UPDATE LaxRef_Active_Live_WP_Games set bad_play_type_error=NULL, input_required=0, skip=0, clear_abbreviations=0 where game_ID=%s"
                param = [g['ID']]
                cursor.execute(query, param)
                try:
                    query = "UPDATE LaxRef_Game_Streams set abbreviation_user_question=NULL, abbreviation_user_response_dict=NULL, abbreviation_user_response=NULL where game_ID=%s"
                    param = [g['ID']]
                    cursor.execute(query, param)
                except Exception:
                    
                    msg = traceback.format_exc()
                    if msg not in data['telegram_messages']: telegram_alert(msg); data['telegram_messages'].append(msg)
                    
                cursor.commit()
                cursor.close()
                live_game['clear_abbreviations'] = 0
                
            
            
            
            if g['replacement_text'] != live_game['replacement_text']:
                msg = "Updating the replacement text for %s\n\nWas: %s\n\nIs now: %s" % (g['description'], g['replacement_text'], live_game['replacement_text'])
                if '--log-game-replacement-text' in sys.argv:
                    flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % g['ID']), 'a')
                    flog.write("\n@ %s\n\n%s" % (datetime.now().strftime("%H:%M:%S"), msg))
                    flog.close()
                #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                g['replacement_text'] = live_game['replacement_text']
                g['replacements'] = [{'from': z.split("|")[0], 'to': z.split("|")[1]} for z in g['replacement_text'].split("~~~") if len(z.split("|")) == 2]
                g['replacements'] = sorted(g['replacements'], key=lambda x:len(x['from']), reverse=True)
                g['num_plays'] = 0
                g['home_team'] = None; g['away_team'] = None
                
                game_tmp_team_replacement_text = []
                if 'home_ID' in g and 'away_ID' in g and None not in [g['home_ID'], g['away_ID']]:
                    game_tmp_team_replacement_text = [z for z in tmp_team_replacement_text if z['team_ID'] in [g['home_ID'], g['away_ID']]]
                    if len(game_tmp_team_replacement_text) > 0:
                        
                        for team_replacement_text in game_tmp_team_replacement_text:
                            tmp_replacements_list = [{'from': z.split("|")[0], 'to': z.split("|")[1]} for z in team_replacement_text['replacement_text'].split("~~~") if len(z.split("|")) == 2]
                            if '--log-game-replacement-text' in sys.argv:
                                flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % g['ID']), 'a')
                                flog.write("\n@ %s\n\nTeam-Specific Replacement Text from team ID %d:\n\n%s" % (datetime.now().strftime("%H:%M:%S"), team_replacement_text['team_ID'], json.dumps(tmp_replacements_list, default=zc.json_handler, indent=2)))
                                flog.close()
                            if g['replacements'] is None:
                                g['replacements'] = tmp_replacements_list
                            else:
                                g['replacements'] += tmp_replacements_list
                            g['replacements'] = sorted(g['replacements'], key=lambda x:len(x['from']), reverse=True)
                            
                        if '--log-game-replacement-text' in sys.argv:
                            flog = io.open(os.path.join(lr_fldr, "Logs", "game_replacement_text_summary_log_%07d.txt" % g['ID']), 'a')
                            flog.write("\n@ %s\n\nFinal Replacement Text after adding team-specific pairs is\n\n%s" % (datetime.now().strftime("%H:%M:%S"), json.dumps(g['replacements'], default=zc.json_handler, indent=2)))
                            flog.close()
                
            if g['skip'] != live_game['skip']:
                misc['changed_skips'] += 1
                
                g['skip'] = live_game['skip']
                g['num_plays'] = 0
                g['home_team'] = None; g['away_team'] = None
                
            if g['reverse_timestamps'] != live_game['reverse_timestamps']:
                g['reverse_timestamps'] = live_game['reverse_timestamps']
                if live_game['reverse_timestamps'] is not None:
                    msg = "Reverse Timestamps change flagged for game ID %d (%s)" % (g['ID'], g['description'])
                    if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        
        game_stream = None
        if g['ID'] in [z['game_ID'] for z in db_game_streams]:
            game_stream = db_game_streams[ [z['game_ID'] for z in db_game_streams].index(g['ID'])]
        
        if game_stream is not None:
            g['ignore_duplicate_plays_error'] = game_stream['ignore_duplicate_plays_error']
            
            if game_stream["abbreviation_user_response_dict"] not in [None, '', 'null'] and isinstance(game_stream["abbreviation_user_response_dict"], str):
                tmp_abbreviation_user_response_dict = json.loads(game_stream["abbreviation_user_response_dict"])
            else:
                tmp_abbreviation_user_response_dict = []
                
            flag_abbreviations_change = 0
            if len(tmp_abbreviation_user_response_dict) != len(g["abbreviation_user_response_dict"]):
                flag_abbreviations_change = 1
            elif json.dumps(tmp_abbreviation_user_response_dict) != json.dumps(g["abbreviation_user_response_dict"]):
                flag_abbreviations_change = 1
                
            if flag_abbreviations_change:
                
                msg = "Abbreviations change flagged for game ID %d (%s), old abbreviations object was %s; new input is\n\n%s" % (g['ID'], g['description'], json.dumps(g["abbreviation_user_response_dict"]), json.dumps(tmp_abbreviation_user_response_dict))
                #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                
                g['home_team'] = None
                g['away_team'] = None
                g['home_abbreviation'] = None
                g['away_abbreviation'] = None
                for tmp_abbrev in g["abbreviation_user_response_dict"]:
                
                    g['home_abbreviations'] = [z for z in g['home_abbreviations'] if z != tmp_abbrev['team'].upper()]
                    g['away_abbreviations'] = [z for z in g['away_abbreviations'] if z != tmp_abbrev['team'].upper()]
                    
                g["abbreviation_user_response_dict"] = tmp_abbreviation_user_response_dict
            g['url_confirmed'] = game_stream['url_confirmed']
            
            if g['url'] != game_stream['url']:
                
                # If it was truly a new URL, set numplays to zero and reset the other information
                comp_urlA = g['url']
                comp_urlB = game_stream['url']
                
                if comp_urlA is None and comp_urlB is not None:
                    g['url'] = game_stream['url']
                    g['url_change'] = 1
                    data['games'][i] = assign_host(g) # Re-ID which provider is running the game stream
                    
                elif None not in [comp_urlA, comp_urlB]:
                
                    comp_urlA = comp_urlA.replace("play-by-play", "").replace("/", "")
                    comp_urlB = comp_urlB.replace("play-by-play", "").replace("/", "")
                    if '-simulation' not in sys.argv and comp_urlA != comp_urlB:
                        g['num_plays'] = 0
                        g['home_team'] = None; g['away_team'] = None
                        
                        misc['changed_urls'] += 1
                        msg = "URL change flagged for game ID %d (%s), old url was %s; new url is\n\n%s" % (g['ID'], g['description'], g['url'], game_stream['url'])
                        #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
                    
                    g['url'] = game_stream['url']
                    
                    
                    g['url_change'] = 1
                    
                    data['games'][i] = assign_host(g) # Re-ID which provider is running the game stream
            
            # Games cannot be switched back from pending because pending means that the browser tab was closed; only process if the new pending value=1.
            if g['pending'] != game_stream['pending'] and game_stream['pending']:
                misc['changed_pending'] += 1
                g['pending'] = game_stream['pending']
                
                g['num_plays'] = 0
                g['home_team'] = None; g['away_team'] = None
                msg = "Game ID %d (%s) has been set to pending" % (g['ID'], g['description'])
                #if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
    try:
        # Update subscribers in case they made a change mid-game
        query_tag = "refresh_subscribers"
        conn, cursor = LRP_connect(data['secrets']['web'])
        cursor.execute("SELECT user_ID, subscription_ID, encrypted_email, favorite_team_ID, favorite_player_ID, receive_end_game_emails from (Select a.ID 'user_ID', c.ID 'subscription_ID', a.email 'encrypted_email', d.favorite_team_ID, d.favorite_player_ID, CASE WHEN a.ID=1 THEN 1 ELSE IFNULL(d.receive_end_game_emails, 1) END receive_end_game_emails from LRP_Users a, LRP_Groups b, LRP_Subscriptions c, LRP_User_Preferences d where a.active and b.active and c.active and c.status='active' and NOT ISNULL(d.favorite_team_ID) and d.active and b.group_type='individual' and b.user_ID=a.ID and c.product_ID=7 and d.user_ID=a.ID and c.group_ID=b.ID and b.group_type!='media') data group by user_ID, subscription_ID, encrypted_email, favorite_team_ID, favorite_player_ID, receive_end_game_emails", [])
        data['basic_subscribers'] = zc.dict_query_results(cursor)
        for s in data['basic_subscribers']:
            s['sub_type'] = "basic"
        
        cursor.execute("Select a.ID 'user_ID', c.ID 'subscription_ID', a.email 'encrypted_email', b.team_ID favorite_team_ID, NULL favorite_player_ID, IFNULL(d.receive_end_game_emails, 1) 'receive_end_game_emails' from LRP_Users a, LRP_Groups b, LRP_Group_Access e, LRP_Subscriptions c, LRP_User_Preferences d where a.active and IFNULL(a.is_admin, 0)=0 and b.active and c.active and c.status='active' and d.active and b.group_type='team' and e.group_ID=b.ID and e.user_ID=a.ID and e.status='active' and (c.product_ID=3 or c.product_ID=6 or c.product_ID=9) and d.user_ID=a.ID and c.group_ID=b.ID", [])
        data['team_subscribers'] = zc.dict_query_results(cursor)
        for s in data['team_subscribers']:
            s['sub_type'] = "team"
        
        cursor.close(); conn.close()
        
        
            
        data = increment_queries(data, query_tag, data['basic_subscribers'])
        
    except Exception:
        msg = "DB Fail: \n\nCould not get a response from the DB in refresh_game_objects: %s" % traceback.format_exc()
        print (msg)
        if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
        return data
    
    if 'consec_slow_refreshes' not in data:
        data['consec_slow_refreshes'] = 0
        
    tmp_elapsed = time.time() - refresh_start_ms
    if tmp_elapsed > 20:
        data['consec_slow_refreshes'] += 1
        if data['consec_slow_refreshes'] > 20 and data['consec_slow_refreshes'] % 20 == 0:
            
            msg = ("\n[WARNING] Live Win Odds: RefreshGameObjects Report: %s (run in %.2f)s\n" % (datetime.now().strftime("%H:%M:%S"), tmp_elapsed))
            msg += ("\n".join(["{:<20}{:>10}".format(k, misc[k]) for k in misc.keys()]))
            if msg not in data['telegram_messages']: zc.send_telegram(msg, bot_token); data['telegram_messages'].append(msg)
    
            data['consec_slow_refreshes'] = 0
            
    else:
        data['consec_slow_refreshes'] = 0
        
    
    return data
    
def increment_queries(data, query_tag, res):
    """
    This function is designed to keep track of the queries run by this script. This allows us to make sure we aren't holding things up by running queries more than we need to. Also, since we pay for data egress, knowing how much data is being downloaded is good to know.
    """
    add_new_log = 0
    if query_tag not in [z['query_tag'] for z in data['query_log']]:
        data['query_log'].append({'query_tag': query_tag, 'calls': 0., 'with_data_calls': 0., 'estimated_egress': 0.})
        
    ql = data['query_log'][ [z['query_tag'] for z in data['query_log']].index(query_tag) ]
    ql['calls'] += 1.
    if len(res) > 0:
        ql['with_data_calls'] += 1.
        ql['estimated_egress'] += float(len(res)) * len(str(res[0]))
  
    return data    
    

try:

    if '--use-db-plays' in sys.argv and datetime.now().strftime("%Y%m%d%H") in ["2024031010", "2024031011", "2024031012"]:
        zc.exit("\n\nSKIPPING TO HELP FULL LRP UPLOAD FINISH FASTER!!!!!!!!!!\n\n")
        
    # If it's after 
    if '--single-window-execution' in sys.argv and (datetime.now().hour > 18 or (datetime.now().hour == 18 and datetime.now().minute >= 30)):
        sys.argv[sys.argv.index('--single-window-execution') + 1] = ""
    run()
    data = record_execution_breadcrumb(None, {'txt': 'Execution complete'})
    
except Exception as e:
    data = record_execution_breadcrumb(None, {'txt': 'Execution crashed'})
    initial_error = traceback.format_exc()
    print (initial_error)
    re_trigger = 1
    
    try:
        chromedriver_regex = re.compile(r'(only supports Chrome version ([0-9]+)[\s\r\n]*?Current browser version is ([0-9]+))', re.IGNORECASE)
        chromedriver_match = chromedriver_regex.search(initial_error)
        if chromedriver_match:
            
            re_trigger = 0
            query1 = "INSERT INTO LRP_Sent_Email_Records (ID, send_date, active, recipient, status, email_ID, recipient_type) VALUES ((SELECT IFNULL(max(ID), 0)+1 from LRP_Sent_Email_Records fds), %s, %s, %s, %s, (SELECT IFNULL(max(ID),0)+1 from LRP_Emails fds), %s, %s, %s)"
            param1 = [zc.to_utc(datetime.now() + timedelta(seconds=300 + offset)), 1, encrypt(admin_email), 'scheduled', 'ind']
            
            
            query2 = "INSERT INTO LRP_Emails (ID, send_date, active, subject, email_type, status, content, send_as) VALUES ((SELECT IFNULL(max(ID),0)+1 from LRP_Emails fds), %s, %s, %s, %s, %s, %s, %s)"
            param2 = [zc.to_utc(datetime.now() + timedelta(seconds=300 + offset)), 1, encrypt('ChromeDriver needs to be replaced on %s' % (laxref_machine_ID)), 'htmlContent', 'scheduled', chromedriver_match.group(1), admin_email]
            
            queries = []; params = []
            queries.append(query1); params.append(param1)
            queries.append(query2); params.append(param2)
                
            conn, cursor = LRP_connect(data['secrets']['web'])
            for q, p in zip(queries, params):
                cursor.execute(q, p)
            
            if '--no-commit' not in sys.argv: conn.commit()
            cursor.close(); conn.close()
        
    except Exception:
        zc.send_telegram("In LWO, trying to identify a chromedriver error. This happened\n\n%s" % traceback.format_exc(), bot_token)

    if '--game-ID' in sys.argv:
        msg = "Error in win odds script for game_ID %s: %s\n\n" % (sys.argv[ sys.argv.index('--game-ID') + 1], initial_error)
    else:
        msg = "Error in win odds script: %s\n\n" % (initial_error)
    if '-quiet' not in sys.argv:    zc.send_crash(msg, bot_token)

    
    cmd = "python " + " ".join(map(str, sys.argv))
    cmd = cmd.replace("--game-ID ", "--game-ID \"").replace(" --upload-to-LRP", "\" --upload-to-LRP")
    print (cmd)
    if '-execution' in sys.argv and re_trigger:
        msg = "Script failed, wait for 60 seconds, then run\n\n%s" % cmd
        zc.send_telegram(msg, bot_token)
        for i in range(60):
            time.sleep(1)
        os.system(cmd)
