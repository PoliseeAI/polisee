To use:

Create an env file at `george/.env`:

```
DB_NAME="bbb"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

OPENAI_API_KEY="<key>"
```

Then set up the Python env:

```bash
cd george
python3 -m venv venv 
source venv/bin/activate
pip install -r requirements.txt
```

Set up the local DB (you need postgres installed):

```bash
createdb bbb
psql -U postgres -d bbb -f schema.sql
```

Run the first script:

```bash
python process_bill.py
```

This parses `bbb.xml`, scrapes the linked bills, and creates the data with embeddings, dumped to a local file `output.sql`.

Load the data into the DB:

```bash
psql -U postgres -d bbb -f output.sql
```

Then run the second script, which opens the CLI to query the database:

```bash
python query_bill.py
```
