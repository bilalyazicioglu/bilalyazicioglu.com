"""Exercise the actual release shell scripts against a deterministic Docker adapter."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parent
DOCKER = '''#!/usr/bin/env python3
import json, os, pathlib, sys
root=pathlib.Path(os.environ['FIXTURE_ROOT']); statefile=root/'state.json'
s=json.loads(statefile.read_text()); a=sys.argv[1:]; mode=os.environ.get('FAIL_STAGE','')
s['commands'].append(a)
def save(): statefile.write_text(json.dumps(s))
if a[0]=='inspect':
    template=a[a.index('-f')+1]
    if 'State.Running' in template: print(str(s['running']).lower())
    elif '.Image' in template: print(s['image'])
    elif '.Config.Env' in template: print('DEPLOYED_AT=2026-01-01T00:00:00Z')
    else: print('fixture-network')
elif a[0]=='run': print('candidate-fixture')
elif a[0]=='exec':
    container=a[1]
    if 'node' in a:
        if container=='candidate-fixture' and mode=='candidate': save(); sys.exit(1)
        if container=='blog' and mode=='activation' and s['image']!='old-image': save(); sys.exit(1)
    elif 'wget' in a and mode=='rollback': save(); sys.exit(1)
elif a[0]=='stop': s['running']=False
elif a[0]=='start': s['running']=True
elif a[0]=='compose' and 'up' in a:
    s['image']=os.environ.get('BLOG_IMAGE','unknown'); s['running']=True
elif a[0]=='cp':
    if mode=='backup' and '/app/data/' in a[1]: save(); sys.exit(1)
    destination=pathlib.Path(a[-1]); destination.mkdir(exist_ok=True)
    (destination/'fixture.txt').write_text(a[1])
save()
'''


class DeploymentTests(unittest.TestCase):
    def run_case(self, mode, rollback=False):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); repo=root/'repo'; repo.mkdir(); (repo/'scripts').mkdir()
            for name in ['deploy.sh','rollback.sh','backup.py','install-backup-cron.sh']:
                shutil.copy(SCRIPTS/name, repo/'scripts'/name)
            def git(*args):
                return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.DEVNULL, text=True).strip()
            git('init','-b','main'); git('config','user.email','fixture@example.test'); git('config','user.name','Fixture')
            git('add','.'); git('commit','-m','fixture')
            remote=root/'remote.git'; subprocess.run(['git','clone','--bare',str(repo),str(remote)], check=True, capture_output=True)
            git('remote','add','origin',str(remote))
            binpath=root/'bin'; binpath.mkdir()
            for name, content in {'docker':DOCKER, 'sleep':'#!/bin/sh\nexit 0\n', 'crontab':'#!/bin/sh\ncat >/dev/null\n', 'seq':'#!/bin/sh\necho 1\n'}.items():
                p=binpath/name; p.write_text(content); p.chmod(0o755)
            # flock is Linux-specific; the test host may be macOS. No concurrency in this fixture.
            if not shutil.which('flock'):
                p=binpath/'flock';p.write_text('#!/bin/sh\nexit 0\n');p.chmod(0o755)
            statefile=root/'state.json';statefile.write_text(json.dumps({'running':True,'image':'old-image','commands':[]}))
            env={**os.environ,'PATH':str(binpath)+os.pathsep+os.environ['PATH'],'FIXTURE_ROOT':str(root),'FAIL_STAGE':mode}
            result=subprocess.run(['bash',str(repo/'scripts/deploy.sh')],env=env,capture_output=True,text=True)
            state=json.loads(statefile.read_text())
            self.assertTrue(state['running'], result.stderr)
            if mode:
                self.assertNotEqual(result.returncode,0, result.stdout)
                self.assertEqual(state['image'],'old-image', result.stderr)
                if mode=='candidate': self.assertFalse(any(a[0]=='stop' for a in state['commands']))
            else:
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertTrue(state['image'].startswith('portfolio-blog:'))
                backup=Path((repo/'.operations/latest-backup').read_text().strip())
                self.assertTrue(backup.exists())
                if rollback:
                    result=subprocess.run(['bash',str(repo/'scripts/rollback.sh')],env=env,capture_output=True,text=True)
                    self.assertEqual(result.returncode,0,result.stderr)
                    self.assertEqual(json.loads(statefile.read_text())['image'],'old-image')

    def test_candidate_failure_preserves_running_release(self): self.run_case('candidate')
    def test_backup_failure_restarts_original(self): self.run_case('backup')
    def test_activation_failure_restores_previous_image(self): self.run_case('activation')
    def test_success_and_manual_rollback(self): self.run_case('',rollback=True)

if __name__=='__main__': unittest.main()
