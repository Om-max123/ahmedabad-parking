import sqlite3

db_path = 'C:/Users/omdha/AppData/Roaming/pgAdmin/pgadmin4.db'
try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print("Tables in pgadmin4.db:", tables)
    if 'server' in tables:
        servers = c.execute("SELECT * FROM server").fetchall()
        print("Configured servers count:", len(servers))
        for s in servers:
            print("Server row:", s)
    else:
        print("No server table found.")
except Exception as e:
    print("Error:", e)
