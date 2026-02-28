import os
from typing import Generator

import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool

_pool: MySQLConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is not None:
        return
    try:
        _pool = MySQLConnectionPool(
            pool_name="medcore_pool",
            pool_size=int(os.getenv("MYSQL_POOL_SIZE", "5")),
            host=os.getenv("MYSQL_HOST", "localhost"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "medcore_hms"),
        )
    except Exception as e:
        print(f"Error initializing MySQL pool: {e}")
        raise e


def get_conn():
    if _pool is None:
        init_pool()
    assert _pool is not None
    try:
        conn = _pool.get_connection()
        yield conn
    finally:
        if 'conn' in locals():
            conn.close()
