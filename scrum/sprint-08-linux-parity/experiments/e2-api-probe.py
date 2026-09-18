# E2 diagnostic: test the glm endpoint + token directly (no proxy), printing only
# the HTTP status and response shape — never the token. Throwaway experiment tool.
import json, urllib.request, urllib.error

cfg = open('/tmp/ctc-e2/home/config.toml').read()
token = next(line.split('=', 1)[1].strip().strip('"') for line in cfg.splitlines()
             if line.strip().startswith('experimental_bearer_token'))
base = next(line.split('=', 1)[1].strip().strip('"') for line in cfg.splitlines()
            if line.strip().startswith('base_url'))
model = next(line.split('=', 1)[1].strip().strip('"') for line in cfg.splitlines()
             if line.strip().startswith('model') and 'model_' not in line)

req = urllib.request.Request(
    base.rstrip('/') + '/chat/completions',
    data=json.dumps({'model': model, 'messages': [{'role': 'user', 'content': 'reply with exactly: ok'}],
                     'max_tokens': 8}).encode(),
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        body = json.load(r)
        print('STATUS', r.status, '| model reply:', body['choices'][0]['message']['content'][:40])
except urllib.error.HTTPError as e:
    print('HTTP_ERROR', e.code, e.read()[:200])
except Exception as e:
    print('FAIL', type(e).__name__, str(e)[:150])
