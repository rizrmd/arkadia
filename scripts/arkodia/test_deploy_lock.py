import json
import os
from pathlib import Path
import select
import signal
import subprocess
import tempfile
import unittest

HELPER = Path(__file__).with_name('deploy-lock.sh').resolve()


class DeployLockTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.env = dict(os.environ, HOME=self.temporary.name,
                        FURAL_TASK_ID='fixture_task', FURAL_TURN_ID='fixture_turn')
        self.source = 'set -euo pipefail; source "$1"; '
        self.metadata = Path(self.temporary.name) / 'releases/arkodia-deploy.lock.owner.json'

    def run_guard(self):
        return subprocess.run(['bash', '-c', self.source +
                               'acquire_arkodia_deploy_lock; release_arkodia_deploy_lock_metadata',
                               'fixture', str(HELPER)], env=self.env,
                              capture_output=True, text=True, timeout=5)

    def owner(self, child=False):
        tail = ('sleep 30 & echo CHILD=$!; wait' if child else
                'read -r finish; release_arkodia_deploy_lock_metadata')
        process = subprocess.Popen(['bash', '-c', self.source +
                                    'acquire_arkodia_deploy_lock; ' + tail,
                                    'fixture', str(HELPER)], env=self.env,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True)
        self.addCleanup(self.stop, process)
        self.assertTrue(select.select([process.stdout], [], [], 5)[0], 'owner did not start')
        record = json.loads(process.stdout.readline())
        self.assertEqual(record['event'], 'arkodia_deploy_lock_acquired')
        self.assertEqual(record['pid'], process.pid)
        return process, record

    @staticmethod
    def stop(process):
        if process.poll() is None:
            process.kill()
        process.communicate(timeout=5)

    def test_live_owner_is_reported_without_bypassing_lock(self):
        process, owner = self.owner()
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        rejection = json.loads(result.stderr)
        self.assertEqual(rejection['error_class'], 'busy')
        self.assertEqual(rejection['recorded_owner']['pid'], process.pid)
        self.assertTrue(rejection['recorded_owner']['pid_alive'])
        self.assertEqual(rejection['recorded_owner']['trace_id'], owner['trace_id'])
        self.assertNotEqual(rejection['trace_id'], owner['trace_id'])
        self.assertEqual(json.loads(self.metadata.read_text())['pid'], process.pid)
        process.communicate('\n', timeout=5)
        self.assertFalse(self.metadata.exists())
        self.assertEqual(self.run_guard().returncode, 0)

    def test_abandoned_metadata_does_not_block_an_unlocked_file(self):
        self.metadata.parent.mkdir(parents=True)
        self.metadata.write_text(json.dumps({'pid': 4194304, 'trace_id': 'old'}))
        self.assertEqual(self.run_guard().returncode, 0)
        self.assertFalse(self.metadata.exists())

    def test_missing_metadata_still_rejects_a_held_lock(self):
        self.owner()
        self.metadata.unlink()
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stderr)['owner_metadata_status'], 'missing')

    def test_untrusted_metadata_fields_are_not_logged(self):
        self.owner()
        data = json.loads(self.metadata.read_text())
        data.update(command='private fixture command', token='private fixture token')
        self.metadata.write_text(json.dumps(data))
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('private fixture', result.stderr)
        self.assertEqual(set(json.loads(result.stderr)['recorded_owner']),
                         {'pid', 'pid_alive', 'trace_id', 'task_id', 'turn_id', 'started_at'})

    def test_invalid_metadata_is_reported_without_breaking_lock(self):
        self.owner()
        self.metadata.write_text('private invalid JSON fixture')
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        record = json.loads(result.stderr)
        self.assertEqual(record['owner_metadata_status'], 'unreadable')
        self.assertEqual(record['diagnostic_error_class'], 'JSONDecodeError')
        self.assertNotIn('private invalid', result.stderr)

    def test_non_busy_flock_failure_preserves_status(self):
        tools = Path(self.temporary.name) / 'bin'
        tools.mkdir()
        fake = tools / 'flock'
        fake.write_text('#!/bin/sh\nexit 73\n')
        fake.chmod(0o755)
        self.env['PATH'] = str(tools) + os.pathsep + self.env['PATH']
        result = self.run_guard()
        self.assertEqual(result.returncode, 73)
        self.assertEqual(json.loads(result.stderr)['error_class'], 'lock_error')

    def test_dead_parent_does_not_authorize_breaking_a_child_held_lock(self):
        process, _ = self.owner(child=True)
        self.assertTrue(select.select([process.stdout], [], [], 5)[0])
        child_pid = int(process.stdout.readline().strip().removeprefix('CHILD='))
        self.addCleanup(os.kill, child_pid, signal.SIGTERM)
        process.kill()
        process.wait(timeout=5)
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        rejection = json.loads(result.stderr)
        self.assertFalse(rejection['recorded_owner']['pid_alive'])
        self.assertEqual(rejection['error_class'], 'busy')


if __name__ == '__main__':
    unittest.main()
