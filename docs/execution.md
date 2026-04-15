# Execution

Bash is a universal interface to computation.
Anything you can do from a terminal, the model can do by creating a script.

## Convention

Place a script in `_run/` and the harness executes it automatically.
Output lands in `_output/<name>.log`.
The model gets another turn to see results and react.
The `_run/` directory is consumed after execution.

## Capabilities

Browse the web:

```bash
curl -s https://example.com > page.html
```

Query a database:

```bash
psql -h db.host -c "SELECT * FROM users LIMIT 10" > results.txt
```

Deploy to production:

```bash
kubectl apply -f k8s/deployment.yaml
```

Train a model:

```bash
# timeout: 600
python3 train.py --epochs 10 --output model.pt
```

Call another model:

```bash
curl -s https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-5-mini","messages":[...]}' > response.json
```

## Process Isolation

Each script runs in its own process group.
When the script finishes or times out, the entire group is killed.
No orphaned background processes leaking between turns.

## Timeout

Default execution timeout is 30 seconds.
Scripts can declare their own in the first few lines:

```bash
# timeout: 300
python3 train.py --epochs 50
```

## Principle

New capabilities are just new conventions.
The model never learns a new trick.
It just keeps making files.

## Limits

Binary files cannot be written directly in a diff.
But the model can write code that creates a binary,
and the harness runs that code, and the binary appears on disk.
No one hand-authors a PNG. You use a tool.
The tool is a script. The script is a text file.
Text files are diffs. The loop closes.
