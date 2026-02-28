import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def init_db():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
        )
        cursor = conn.cursor()
        
        # Read schema.sql
        with open("schema.sql", "r") as f:
            schema = f.read()
            
        # Execute each command separated by ;
        for command in schema.split(";"):
            if command.strip():
                try:
                    cursor.execute(command)
                except mysql.connector.Error as err:
                    print(f"Error executing command: {err}")
                    
        conn.commit()
        cursor.close()
        conn.close()
        print("Database initialized successfully!")
    except mysql.connector.Error as err:
        print(f"Connection error: {err}")

if __name__ == "__main__":
    init_db()
