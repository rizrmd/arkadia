#!/usr/bin/env python3
"""Bounded deploy-lock evidence. Metadata never authorizes breaking a lock."""
import datetime
import json
import os
from pathlib import Path
import re
import sys
import tempfile


def label(value):
    return value if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,80}", value) else ""


def emit(record, failed=False):
    print(json.dumps(record, separators=(",", ":")), file=sys.stderr if failed else sys.stdout, flush=True)


def main():
    action, lock_path, pid_text = sys.argv[1:4]
    pid = int(pid_text)
    metadata = Path(lock_path + ".owner.json")
    trace = label(os.environ.get("ARKODIA_DEPLOY_TRACE_ID", ""))
    record = {"event": "arkodia_deploy_lock_" + action, "trace_id": trace,
              "task_id": label(os.environ.get("FURAL_TASK_ID", "")),
              "turn_id": label(os.environ.get("FURAL_TURN_ID", ""))}
    if action == "acquired":
        owner = dict(record, pid=pid, started_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
        fd, temporary = tempfile.mkstemp(prefix=".arkodia-lock-", dir=metadata.parent)
        try:
            with os.fdopen(fd, "w") as output:
                json.dump(owner, output)
            os.replace(temporary, metadata)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        emit(owner)
        return
    owner = None
    try:
        if metadata.stat().st_size > 4096:
            raise ValueError("oversize metadata")
        owner = json.loads(metadata.read_text())
        if not isinstance(owner, dict):
            raise ValueError("invalid metadata")
        record["owner_metadata_status"] = "available"
    except FileNotFoundError:
        record["owner_metadata_status"] = "missing"
    except (OSError, ValueError) as error:
        record["owner_metadata_status"] = "unreadable"
        record["diagnostic_error_class"] = type(error).__name__
    if action == "release":
        # This runs before Bash closes FD 9. Never delete another invocation's record.
        if owner and owner.get("pid") == pid and owner.get("trace_id") == trace:
            metadata.unlink()
        elif record["owner_metadata_status"] == "unreadable":
            emit(dict(record, event="arkodia_deploy_lock_metadata_failed"), True)
            sys.exit(1)
        return
    if action != "rejected":
        raise ValueError("invalid action")
    status = int(sys.argv[4])
    record.update(flock_exit_code=status, error_class="busy" if status == 1 else "lock_error")
    if owner:
        owner_pid = owner.get("pid")
        observed = {key: label(owner.get(key, "")) for key in ("trace_id", "task_id", "turn_id")}
        started_at = owner.get("started_at")
        if isinstance(started_at, str) and len(started_at) <= 80:
            try:
                observed["started_at"] = datetime.datetime.fromisoformat(started_at).isoformat()
            except ValueError:
                observed["started_at_status"] = "invalid"
        if type(owner_pid) is int and 0 < owner_pid <= 4194304:
            observed["pid"] = owner_pid
            try:
                os.kill(owner_pid, 0)
                observed["pid_alive"] = True
            except ProcessLookupError:
                observed["pid_alive"] = False
            except PermissionError:
                observed["pid_alive"] = "unknown"
        record["recorded_owner"] = observed
    emit(record, True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"event": "arkodia_deploy_lock_diagnostic_failed",
              "trace_id": label(os.environ.get("ARKODIA_DEPLOY_TRACE_ID", "")),
              "error_class": type(error).__name__}, True)
        sys.exit(1)
