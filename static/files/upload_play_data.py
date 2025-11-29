# -*- coding: utf-8 -*-
"""
Created on Tue Nov 17 14:10:05 2015

@author: zcapozzi002
"""

import time, datetime, sys, os, json
from time import strptime
from datetime import datetime, date

import requests


import re

import subprocess



piFolder = "/home/pi/zack/"
if not os.path.isdir(piFolder):
    piFolder = "C:\\Users\\zcapo\\Documents\\workspace"
    if not os.path.isdir(piFolder):
        piFolder = "C:\\Users\\zcapozzi002\\Documents\\workspace"

zc_fldr = os.path.join(piFolder,"ZackInc")
lr_fldr = os.path.join(piFolder,"LacrosseReference")
win_odds_folder = os.path.join(lr_fldr, 'LiveWinOdds')

sys.path.insert(0, zc_fldr)
import zack_inc_lite as zc
import laxref
import traceback

script_name = __file__.replace(".py", "").split("\\")[-1]
zc.log_script_execution(script_name)
bot_token = json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())['local']['bot_token']
image_bot_token = json.loads(open(os.path.join(lr_fldr, "LRP", "client_secrets.json"), 'r').read())['local']['image_bot_token']
import telepot
import traceback


def run():
    
    cli_args = [
        {'arg': '-g', 'arg_str': '-g [gameID]', 'required': False, 'desc': 'Determines which game record the plays are assigned to...'}
        , {'arg': '--game-ID', 'arg_str': '--game-ID [gameID]', 'required': False, 'desc': 'Determines which game record the plays are assigned to...'}
        , {'arg': '-home', 'arg_str': '-home [home_team_ID-score]', 'required': False, 'desc': 'If this is used, we can skip the confirmation step assuming the data matches what is calculated from the plays list.'}
        , {'arg': '-away', 'arg_str': '-away [away_team_ID-score]', 'required': False, 'desc': 'If this is used, we can skip the confirmation step assuming the data matches what is calculated from the plays list.'}
    ]

    show_help = len([1 for z in cli_args if z['arg'] not in sys.argv and z['required']])
    if show_help or '-h' in sys.argv or '-help' in sys.argv:
        print ("Command Line Help\n%s\n  %s\n\n" % ('-'*150, "\n  ".join(["%s %s%s" % ("{:<20}".format(z['arg_str'] + ":"), "{:>20}".format("(required)   " if z['required'] and z['arg'] not in sys.argv else ""), "{:>20}".format(z['desc'])) for z in cli_args])))
        sys.exit()

    fnames = []
    
    if '-g' in sys.argv:

        game_ID = int(sys.argv[sys.argv.index('-g')+1])
    elif '--game-ID' in sys.argv:

        game_ID = int(sys.argv[sys.argv.index('--game-ID')+1])
    
    comp = None
    if '-home' in sys.argv and '-away' in sys.argv:
        tmp_home = sys.argv[sys.argv.index('-home') + 1].split('-')
        tmp_away = sys.argv[sys.argv.index('-away') + 1].split('-')
        comp = {'home_ID': int(tmp_home[0]), 'home_score': int(tmp_home[1]), 'away_ID': int(tmp_away[0]), 'away_score': int(tmp_away[1])}
    
    email_subject = "UploadPlayDataLog: Game %d" % game_ID
    log_msg = "Started the upload play data script for game ID %d @ %s" % (game_ID, datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    #zc.send_email(log_msg, {'subject': email_subject})
    
    cursor = zc.zcursor("LR")

    query = "SELECT a.ID, b.game_file, a.status, a.home_ID, a.away_ID, a.league from LaxRef_Games a, LaxRef_Game_Streams b where a.active and b.active and a.ID=%s and a.ID=b.game_ID"
    db_game = cursor.dqr(query, [game_ID])[0]
    
    query = "SELECT 1 from LaxRef_Events a where active and a.game_ID=%s limit 1"
    existing_events = cursor.dqr(query, [game_ID])
    n_existing_events = len(existing_events)
    cursor.close();
    
    
    log_msg = ""
    if "complete" in db_game['status'] and n_existing_events > 0:
        msg = "LaxRef Event records already uploaded for %s" % (db_game['game_file'])
        print (msg)
        zc.send_crash(msg, bot_token)
        sys.exit()

    fname = db_game['game_file']

    path = os.path.join(win_odds_folder, fname + ".csv")
    if not os.path.isfile(path):
        print ("File not found: %s" % path); sys.exit()


    print ("\nuploading %s" % (fname))
    data = [z.split(",") for z in filter(None, open(path, 'r').read().split('\n'))]
    log_msg += "\nRetrieve data from file: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    #print data[0]

    print (data[1][7], " vs ", data[1][8])
    game = {'team1': data[1][7].strip(), 'team2': data[1][8].strip(), 'alt_team1': None, 'alt_team2': None, 'team1_score': 0, 'team2_score':0 , 'overtime': 0}

    confirmed_team1, tmp_ID1, confirmed_team2, tmp_ID2 = laxref.translate_confirmed_teams(data[1][7], data[1][8], data[1][7], data[1][8], {'league': db_game['league']})
    log_msg += "\nTranslate confirmed teams: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    
    game['team1_ID'] = int(data[1][14].strip())
    game['team2_ID'] = int(data[1][15].strip())

    rows = []
    last_game_state = 0
    for i, data_row in enumerate(data[1:]):
        row = {}
        for h, d in zip(data[0], data_row):
            if h not in ['gifPath', 'Away', 'Home', 'lineColor', 'endOfPeriod', 'Home', 'HomeOdds', 'Timestamp', '']:
                row[h] = d.strip().replace(";", ",")
                while "  " in row[h]:
                    row[h] = row[h].replace("  ", " ")
        if 'Seq' not in row:
            row['Seq'] = i
        if row['Details'].endswith(" ."): row['Details'] = row['Details'][0:-2] + "."

        if game['alt_team1'] is None:
            if game['team1'].upper() == row['Team'].upper():
                game['alt_team1'] = row['Team']
        if game['alt_team2'] is None:
            if game['team2'].upper() == row['Team'].upper():
                game['alt_team2'] = row['Team']


        seconds_elapsed = int(float(row['PctComplete'])*3600.)
        if seconds_elapsed < 3600:
            quarter = 1 + (seconds_elapsed)/900
        elif seconds_elapsed == 3600 and i == len(data)-2:
            quarter = 4
        else:
            quarter = 5 + (seconds_elapsed-3600)/240
            game['overtime'] = 1
        #print row['Team'], row['Details']
        if int(row['GameState']) != last_game_state and (game['team1'].strip().upper() == row["Team"].strip().upper()):
            game['team1_score'] += 1
        if int(row['GameState']) != last_game_state and (game['team2'].strip().upper() == row["Team"].strip().upper()):
            game['team2_score'] += 1

        last_game_state = int(row['GameState'])
        row['param'] = [None, game_ID, row['Play'], row['Team'], seconds_elapsed/60, seconds_elapsed%60, int(row['GameState']), row['Details'], quarter, row['Seq']]
        rows.append(row)

    log_msg += "\nAppend game state to plays: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    

    rows = sorted(rows, key=lambda x:x['PctComplete'])
    #zc.print_dict(rows[0:10])

    print (" Run %d event insert queries..." % len(rows))

    print ("Home: %s (%d goals)\t\tAway: %s (%d goals)" % (game['team1'], game['team1_score'], game['team2'], game['team2_score']))

    if comp is None:
        if '--auto-upload' in sys.argv:
            response = "Y"
        else:
            response = input("Enter one of the following:\n\t'y' if everything looks good\n\t'n' if something is wrong\n\t's' if the teams are backwards\n\t\tYour response:  ")

        if response.strip() in ["N", "n"]:
            print ("\n\nOk, sort it out and we'll be waiting...\n\n"); return

        elif response.strip() in ["Y", "y"]:
            print ("\n\nUploading %d plays...\n\n"  % len(rows))
     

        else:
            print (" Didn't understand your input...\n\n"); return
    else:
        if game['team1_ID'] == comp['home_ID'] and game['team2_ID'] == comp['away_ID'] and game['team1_score'] == comp['home_score'] and game['team2_score'] == comp['away_score']:
            print ("Comp matched the calculated values, commence upload...")
            if datetime.now() < datetime(2021, 2, 8):
                msg = "All team IDs and scores matched the input for game ID %d" % game_ID
                zc.send_telegram(msg, bot_token)
        else:
            msg = "\n\nFor game ID %d, calculations did not match inputs...skipping upload" % game_ID
            msg += "\n{:<13}{:<5}{:<5}".format("Home ID", comp['home_ID'], game['team1_ID'])
            msg += "\n{:<13}{:<5}{:<5}".format("Home Score", comp['home_score'], game['team1_score'])
            msg += "\n{:<13}{:<5}{:<5}".format("Away ID", comp['away_ID'], game['team2_ID'])
            msg += "\n{:<13}{:<5}{:<5}".format("Away Score", comp['away_score'], game['team2_score'])
            print (msg)
            zc.send_telegram(msg)

    conn, cursor = zc.mysql_connect("LR")
    cursor.execute("START TRANSACTION")

    query = "INSERT INTO LaxRef_Events (ID, game_ID, event_type, team, game_elapsed_minutes, game_elapsed_seconds, game_state, details, quarter, seq, active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)"

    for i, r in enumerate(rows):
        

        if i % 20 == 0:
            print ("    Query %03d/%03d..." % (i+1, len(rows)))
        r['param'][0] = None
        cursor.execute(query, r['param'])
    
    log_msg += "\nUpload plays: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    
    
    if len(rows) == 0:  
        zc.send_telegram("0 plays for game ID %d (via upload_play_data.py)" % (len(rows), game_ID), bot_token)
    else:
        query = "UPDATE LaxRef_Games set confirmed_home_team=(SELECT name from LaxRef_Teams where ID=%s), confirmed_away_team=(SELECT name from LaxRef_Teams where ID=%s), home_team=%s, away_team=%s, home_score=%s, away_score=%s, status='completedFromLiveStats' where ID=%s"
        param = [game['team1_ID'], game['team2_ID'], game['team1'], game['team2'], game['team1_score'], game['team2_score'], game_ID]

        cursor.execute(query,  param)    
        # Do not comment out the upload=success line; it is used as a flag in live_win_odds.py to tell that the upload succeeded
        print ("upload=success")
        
    log_msg += "\nUpdate this game record: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    

    if '--no-commit' not in sys.argv: cursor.execute("COMMIT")
    
    cursor.execute("UPDATE LaxRef_Games a, (SELECT b.game_ID, count(1) n_db_events from  LaxRef_Events b where game_ID=%s and active group by game_ID) events set a.n_db_events=events.n_db_events where events.game_ID=a.ID and a.ID=%s", [game_ID, game_ID])
    log_msg += "\nUpdate all game records: %s" % (datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    
    if '--no-commit' not in sys.argv: cursor.execute("COMMIT")
    cursor.close(); conn.close()

    if len(rows) > 0 and '--run-refresh-on-upload' in sys.argv:
        #zc.send_telegram("Attempting to run a game dict refresh for game ID %d" % (game_ID), bot_token)
        try:
            cursor = zc.zcursor("LR")
            g = laxref.create_game_dict(cursor, game_ID, [], {}, False)
            cursor.close()
        except Exception:
            g = None
            zc.send_telegram("Game dict refresh for game ID %d failed.\n\n%s\n\n\%s" % (game_ID, traceback.format_exc(), " ".join(sys.argv)), bot_token)
                
    log_msg += "Done the upload play data script for game ID %d @ %s" % (game_ID, datetime.now().strftime("%H:%M:%S.%f")[0:-3])
    
    #zc.send_email(log_msg, {'subject': email_subject})
    
def convert_storage_files_to_windows_batch():
    """
    This function loops through all possible machine executions for the LiveStats VMs to see if any of them have produced (and the batch file has downloaded) a list of commands to trigger the upload_play_data.py script for a particular game. We'll check whether those games have been processed here and if they have not, we will add them to a batch file so that all the games that need to be uploaded can be uploaded.
    """
    repo_dir = os.path.join(lr_fldr, "Logs", "LWOPlayUploadDataAndCommands", datetime.now().strftime("%b%Y").upper())
    n_machines = 5
    machines = range(1, n_machines + 1)
    n_executions = 12
    executions = range(0, n_executions)
    print (repo_dir)
    
    games_with_available_play_data = []
    games_with_errors = []
    game_IDs_found = []
    dt = datetime.now().strftime("%Y%m%d")
    for i in machines:
        for j in executions:
            fname = "%s_LiveStatsVM%d_%d.txt" % (dt, i, j)
            src = os.path.join(repo_dir, fname)
            if os.path.isfile(src):
                rows = [z.replace("upload_play_data.bat ", "") for z in open(src, 'r').read().split("\n") if z.strip() != '']
                print ("\n\n File: %s" % fname)

                for g in rows:
                    d = {'txt': g, 'fname': fname, 'has_already_been_uploaded': 0, 'has_already_been_attempted': 0}
                    try:
                        tokens = g.split(" ")
                        
                        d['game_ID'] = int(tokens[0])
                        d['team1_ID'] = int(tokens[1].split("-")[0])
                        d['team1_score'] = int(tokens[1].split("-")[1])
                        d['team2_ID'] = int(tokens[2].split("-")[0])
                        d['team2_score'] = int(tokens[2].split("-")[1])
                        if d['game_ID'] not in [z['game_ID'] for z in games_with_available_play_data]:
                            games_with_available_play_data.append(d)
                            game_IDs_found.append(d['game_ID'])
                    except Exception:
                        print (traceback.format_exc())
                        d['error'] = traceback.format_exc()
                        games_with_errors.append(d)
    
    unprocessed_games_with_available_play_data = [z for z in games_with_available_play_data if not z['has_already_been_uploaded']]
    unprocessed_games_with_available_play_data_and_no_db_plays = None
    if len(unprocessed_games_with_available_play_data) == 0:
        # Either there are no games with play data yet or all those games have already been processed
        msg = ("%d games in total; %d games still need to be processed" % (len(games_with_available_play_data), len(unprocessed_games_with_available_play_data)))
        print (msg)
        if '-notify' in sys.argv:
            zc.send_crash(msg, bot_token)
        return
    else:
    
        # Retrieve db game records for the IDs associated with these games
        cursor = zc.zcursor("LR")

        query = "SELECT a.ID, b.game_file, a.status, a.home_ID, a.away_ID, a.league from LaxRef_Games a, LaxRef_Game_Streams b where a.active and b.active and ({}) and a.ID=b.game_ID".format(" or ".join(["a.ID=%d" % z for z in game_IDs_found]))
        print (query)
        query1_start_ms = time.time()
        db_games = cursor.dqr(query, [])
        query1_elapsed_ms = time.time() - query1_start_ms
        
        query = "SELECT a.game_ID, count(1) n_events from LaxRef_Events a where a.active and ({}) group by game_ID".format(" or ".join(["a.game_ID=%d" % z for z in game_IDs_found]))
        print (query)
        query2_start_ms = time.time()
        existing_events = cursor.dqr(query, [])
        query2_elapsed_ms = time.time() - query2_start_ms
       
        cursor.close();
    
        print ("{:<30}{:>10}".format("Query 1 Elapsed", "{:.4f}s".format(query1_elapsed_ms)))
        print ("{:<30}{:>10}".format("Query 2 Elapsed", "{:.4f}s".format(query2_elapsed_ms)))
        
        for g in unprocessed_games_with_available_play_data:
            db_game = None
            if g['game_ID'] in [z['ID'] for z in db_games]:
                db_game = db_games[ [z['ID'] for z in db_games].index(g['game_ID']) ]
                g['n_existing_events'] = 0
                g['game_file'] = db_game['game_file']
                g['game_file_downloaded'] = 1 if os.path.isfile(os.path.join(win_odds_folder, g['game_file'] + ".csv")) else 0
                if g['game_ID'] in [z['game_ID'] for z in existing_events]:
                    counts = existing_events[ [z['game_ID'] for z in existing_events].index(g['game_ID']) ]
                    g['n_existing_events'] = counts['n_events']
            else:
                g['error'] = "No db game found"

        print ("\n\n unprocessed_games_with_available_play_data")
        zc.print_dict(unprocessed_games_with_available_play_data)
        
        unprocessed_games_with_available_play_data_and_no_db_plays = [z for z in unprocessed_games_with_available_play_data if not z['has_already_been_attempted'] and 'n_existing_events' in z and z['n_existing_events'] == 0 and "&" not in z['game_file']]

    # These are the games that were found in the database, but do not have any DB events uploaded yet
    if unprocessed_games_with_available_play_data_and_no_db_plays is not None:
        unprocessed_games_with_available_play_data_and_no_db_plays_not_downloaded = [z for z in unprocessed_games_with_available_play_data_and_no_db_plays if not z['game_file_downloaded']]
        
        for g in unprocessed_games_with_available_play_data_and_no_db_plays:
            g['cmd'] = ""
            if not g['game_file_downloaded']:
                g['cmd'] = "CALL gsutil cp gs://capozziinc.appspot.com/ProcessingLogs/LWOPlayUploadDataAndCommands/{}.csv {}".format(g['game_file'], os.path.join(win_odds_folder, "{}.csv".format(g['game_file'])))
            g['cmd'] += "\nCALL {} {}\n\n".format(os.path.join(lr_fldr, 'upload_play_data.bat'), g['txt'])
            #if 490 in [g['team1_ID'], g['team2_ID']]:
            #    g['cmd'] += "\nCALL python {} --game-ID {} --use-db-plays --send-emails\n\n".format(os.path.join(lr_fldr, 'live_win_odds.py'), g['game_ID'])
        
        if len(unprocessed_games_with_available_play_data_and_no_db_plays) > 0:
            f = open(os.path.join(lr_fldr, "Logs", "LWOPlayUploadDataAndCommands", "download_game_file_CSVs.bat"), 'w')
            f.write("\n".join([z['cmd'] for z in unprocessed_games_with_available_play_data_and_no_db_plays]))
            f.write("\n\nexit")
            f.close()
try:                    

    if '--convert-storage-command-lists-to-single-download-batch-file' in sys.argv:
        convert_storage_files_to_windows_batch(); print ("\n\nComplete...exiting."); sys.exit()
    run()

except Exception as e:

    print (traceback.format_exc())
    zc.send_crash(traceback.format_exc(), bot_token)
