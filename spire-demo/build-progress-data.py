import json,datetime,collections,argparse,csv,statistics
from pathlib import Path
from zoneinfo import ZoneInfo
base=Path(__file__).parent.parent
parser=argparse.ArgumentParser(description='Build sanitized run progress and recorded token usage from local evidence.')
parser.add_argument('--history-dir',type=Path,required=True,help='Native modded profile saves/history directory')
args=parser.parse_args()
hist=args.history_dir
native=sorted([json.loads(p.read_text()) for p in hist.glob('*.run')],key=lambda d:d['start_time'])
logs=sorted((base/'.private/spire-runs').glob('*.jsonl'))
rows=[];onsets={};reviews={}
for idx,p in enumerate(logs):
 input_tokens=0;output_tokens=0;missing_usage=0;calls=0;count=0;start=None;end=None;policies=[];vers=[];maxfloor=0;act=1;assisted=False;finalhp=None;bosses=[]
 for l in p.open():
  try:d=json.loads(l)
  except:continue
  s=d.get('state',{});r=s.get('run',{});maxfloor=max(maxfloor,r.get('floor',0));act=max(act,r.get('act',1))
  if d.get('kind')=='run_end':end=d['time'];finalhp=s.get('player',{}).get('hp')
  if d.get('kind')!='decision':continue
  count+=1;start=start or d['time']
  usage=d.get('usage') or {}
  missing_usage+=int('input_tokens' not in usage)
  input_tokens+=usage.get('input_tokens',0)
  output_tokens+=usage.get('output_tokens',0)
  calls+=(d.get('deliberation') or {}).get('calls',1)
  for key,arr,registry in [('policy',policies,onsets),('deliberation',vers,reviews)]:
   v=d.get(key);v=v.get('version') if isinstance(v,dict) else v
   if v:
    if v not in arr:arr.append(v)
    if v not in registry or d['time']<registry[v]['time']:registry[v]={'time':d['time'],'run':idx+1}
  assisted=assisted or bool(d.get('adviser'))
  if s.get('state_type')=='boss':
   for e in s.get('battle',{}).get('enemies',[]):
    if e.get('name') not in bosses:bosses.append(e.get('name'))
 n=native[idx]
 session_start=p.stem[:10]+'T'+p.stem[11:19].replace('-',':')+p.stem[19:]
 t=datetime.datetime.fromisoformat(session_start.replace('Z','+00:00')).timestamp()
 assert abs(t-n['start_time'])<1800,(idx,start,n['start_time'])
 reason=n.get('killed_by_encounter','NONE.NONE').split('.')[-1].replace('_',' ').title()
 rows.append({'n':idx+1,'start':start,'end':end,'floor':maxfloor,'act':act,'win':n['win'],'seconds':n['run_time'],'decisions':count,'inputTokens':input_tokens,'outputTokens':output_tokens,'totalTokens':input_tokens+output_tokens,'missingUsage':missing_usage,'loggedCalls':calls,'policies':policies,'reviews':vers,'assisted':assisted,'encounter':reason if reason!='None' else ('Victory' if n['win'] else 'Unrecorded'),'bosses':bosses,'ascension':n['ascension']})
assert len(rows)==len(native)==182
# Publish calendar dates, never exact activity times. Retain timestamps above for matching.
def public_date(value):
 return datetime.datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(ZoneInfo('America/New_York')).date().isoformat() if value else None
for row in rows:
 for key in ('start','end'):row[key]=public_date(row[key])
for registry in (onsets,reviews):
 for version in registry.values():version['time']=public_date(version['time'])
out={'runs':rows,'plannerVersions':onsets,'reviewVersions':reviews,'tokenAccounting':'Sums usage on decision entries, once per decision including its aggregated review passes. Includes previews, cancelled and stale decisions when logged. Excludes offline tests and Luna tokens; failed or interrupted pipelines without a decision entry may be missing. Recorded usage is not a billing total.','totalInputTokens':sum(r['inputTokens'] for r in rows),'totalOutputTokens':sum(r['outputTokens'] for r in rows),'totalDecisions':sum(r['decisions'] for r in rows),'source':'Native run history reconciled chronologically against 182 Jev JSONL sessions. Outcomes from native win flag; floors and decisions from logs.','snapshot':'2026-09-23'}
(base/'spire-demo/progress-site/dist/data.json').write_text(json.dumps(out,separators=(',',':')))
with (base/'spire-demo/progress-site/dist/run-tokens.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,lineterminator='\n',fieldnames=['n','start','act','floor','win','decisions','inputTokens','outputTokens','totalTokens','missingUsage','inputCostUSD','outputCostUSD','totalCostUSD'])
 writer.writeheader()
 for r in rows:
  estimated=f"{r['inputTokens']/1e6*0.042:.6f}"
  record={**r,'inputCostUSD':estimated,'outputCostUSD':'0.000000','totalCostUSD':estimated}
  writer.writerow({k:record[k] for k in writer.fieldnames})
print(json.dumps({'runs':len(rows),'inputTokens':out['totalInputTokens'],'outputTokens':out['totalOutputTokens'],'meanInput':out['totalInputTokens']/len(rows),'medianInput':statistics.median(r['inputTokens'] for r in rows),'rangeInput':[min(r['inputTokens'] for r in rows),max(r['inputTokens'] for r in rows)],'winningRun':rows[-1],'missingUsage':sum(r['missingUsage'] for r in rows)},indent=2))
