# MedCore API (FastAPI)

## Setup

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy the environment file and edit values:

```bash
copy .env.example .env
```

3. Create the MySQL database and tables:

```sql
source schema.sql;
```

4. Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs are available at http://localhost:8000/docs
