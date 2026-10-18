#!/usr/bin/env python3
"""Merge per-skill SkillSpector SARIF files into one run with repo-relative paths.

SkillSpector writes locations relative to the scanned skill (SKILL.md, scripts/x.sh) and one run per scan.
Code scanning needs paths from the repo root and accepts one run per tool and category in an upload. It also
opens alerts for results marked as suppressed, so results suppressed by .skillspector/<skill>.yaml are left out;
their reasons live in those files.

    merge_skillspector_sarif.py <dir with <skill>.sarif files> <output.sarif>
"""
import glob
import json
import os
import sys

src, out = sys.argv[1], sys.argv[2]
merged, rules, results = None, {}, []
for path in sorted(glob.glob(os.path.join(src, '*.sarif'))):
    prefix = 'skills/' + os.path.basename(path)[: -len('.sarif')] + '/'
    for run in json.load(open(path))['runs']:
        for rule in run['tool']['driver'].get('rules', []):
            rules[rule['id']] = rule
        for result in run.get('results', []):
            if result.get('suppressions'):
                continue
            result.pop('ruleIndex', None)  # indexes point into the per-skill rule list
            for loc in result.get('locations', []) + result.get('relatedLocations', []):
                art = loc.get('physicalLocation', {}).get('artifactLocation', {})
                if 'uri' in art and not art['uri'].startswith(prefix):
                    art['uri'] = prefix + art['uri']
            results.append(result)
        if merged is None:
            merged = run

if merged is None:
    sys.exit('no SARIF files in ' + src)
merged['tool']['driver']['rules'] = list(rules.values())
merged['results'] = results
merged.pop('invocations', None)  # per-skill, and they name the CI runner's paths
json.dump({'version': '2.1.0', '$schema': 'https://json.schemastore.org/sarif-2.1.0.json', 'runs': [merged]},
          open(out, 'w'), indent=1)
print(f'{len(results)} results from {len(rules)} rules → {out}')
