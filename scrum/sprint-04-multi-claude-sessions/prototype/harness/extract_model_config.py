"""Structured extraction of model/provider settings into the isolated CODEX_HOME.

Parses the daily config.toml with a real TOML parser (tomllib), keeps only the
top-level model keys and the referenced [model_providers.<provider>] table, and
serializes with the toml library (SM review f0dc8475: line regex is unreliable
for quoted keys, literal/multiline values and sub-tables).

Auth rides inside the provider table (experimental_bearer_token): it is written
ONLY to the isolated home's temporary config, never printed, never committed.
Daily hooks, plugins, marketplaces, mcp_servers, projects and hooks.state trust
hashes are deliberately excluded.
"""

import argparse
import sys
import tomllib
from pathlib import Path

import toml

TOP_KEYS = [
    'model',
    'model_provider',
    'model_reasoning_effort',
    'disable_response_storage',
    'approval_policy',
    'sandbox_mode',
    'model_context_window',
    'model_auto_compact_token_limit',
]
EXCLUDED = ['hooks', 'plugins', 'marketplaces', 'mcp_servers', 'projects']


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', required=True)
    ap.add_argument('--target', required=True)
    args = ap.parse_args()

    src = tomllib.loads(Path(args.source).read_text(encoding='utf-8'))
    provider = src.get('model_provider')
    if not isinstance(provider, str) or not provider:
        print('model_provider missing in the source config', file=sys.stderr)
        return 1
    table = (src.get('model_providers') or {}).get(provider)
    if not isinstance(table, dict):
        print(f'model_providers.{provider} missing in the source config', file=sys.stderr)
        return 1

    out = {k: src[k] for k in TOP_KEYS if k in src}
    out['model_providers'] = {provider: table}
    Path(args.target).write_text(toml.dumps(out), encoding='utf-8')

    # Validation: re-parse the written file and prove it carries exactly what
    # was intended - same values, provider table intact, excluded sections gone.
    check = tomllib.loads(Path(args.target).read_text(encoding='utf-8'))
    assert check.get('model_providers', {}).get(provider) == table, 'provider table changed'
    for k in out:
        if k != 'model_providers':
            assert check.get(k) == out[k], f'value changed: {k}'
    leaked = [s for s in EXCLUDED if s in check]
    assert not leaked, f'excluded sections leaked: {leaked}'

    print('extraction ok (written config re-parsed and validated)')
    print('top-level keys:', ', '.join(k for k in TOP_KEYS if k in check))
    print(f'provider table: model_providers.{provider} (keys: ' + ', '.join(table) + ')')
    present = [s for s in EXCLUDED if s in src]
    print('daily sections excluded here:', ', '.join(f'[{s}]' for s in present) or '(none found)')
    print(f'written: {args.target}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
