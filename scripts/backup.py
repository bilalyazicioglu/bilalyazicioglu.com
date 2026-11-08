#!/usr/bin/env python3
"""Private, checksummed content backups. Never archives environment or credentials."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def inventory(root):
    result = {}
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlinks are not allowed in a content backup')
        if path.is_file() and path != root / 'manifest.json':
            result[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def extract(archive, destination):
    # Allow only plain files/directories under the three explicit backup roots.
    with tarfile.open(archive, 'r:gz') as source:
        members = source.getmembers()
        names = set()
        for item in members:
            parts = Path(item.name).parts
            if (item.name in names or not parts or item.name.startswith('/') or '..' in parts
                    or parts[0] not in {'content', 'data', 'legacy-uploads', 'manifest.json'}
                    or not (item.isfile() or item.isdir())):
                raise ValueError('Unsafe or duplicate archive entry')
            names.add(item.name)
        source.extractall(destination, members=members, filter='data')
    manifest = json.loads((destination / 'manifest.json').read_text())
    if manifest['format'] != 1 or inventory(destination) != manifest['files']:
        raise ValueError('Backup checksum mismatch')
    if not (destination / 'content').is_dir() or not (destination / 'data').is_dir():
        raise ValueError('Incomplete backup')
    return manifest


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('create')
    create.add_argument('--container', default='blog')
    create.add_argument('--directory', default='.operations/backups')
    verify = sub.add_parser('verify')
    verify.add_argument('archive')
    restore = sub.add_parser('restore')
    restore.add_argument('archive')
    restore.add_argument('destination')
    args = parser.parse_args()
    if args.command == 'create':
        if docker('inspect', '-f', '{{.State.Running}}', args.container) != 'false':
            raise ValueError('Stop the container first for a consistent backup')
        directory = Path(args.directory).resolve()
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        with tempfile.TemporaryDirectory(dir=directory) as temp:
            root = Path(temp)
            for name, location in [('content', '/app/content'), ('data', '/app/data'), ('legacy-uploads', '/app/public/uploads/blog')]:
                (root / name).mkdir()
                result = subprocess.run(['docker', 'cp', f'{args.container}:{location}/.', str(root / name)], capture_output=True)
                if result.returncode and name != 'legacy-uploads':
                    raise ValueError(f'Could not copy {name}')
            manifest = {'format': 1, 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'image': docker('inspect', '-f', '{{.Image}}', args.container), 'files': inventory(root)}
            (root / 'manifest.json').write_text(json.dumps(manifest, indent=2))
            target = directory / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.tar.gz')
            temporary = target.with_suffix('.partial')
            with tarfile.open(temporary, 'w:gz') as out:
                for item in root.iterdir():
                    out.add(item, arcname=item.name)
            with tempfile.TemporaryDirectory(dir=directory) as check:
                extract(temporary, Path(check))
            temporary.rename(target)
            print(target)
    elif args.command == 'verify':
        with tempfile.TemporaryDirectory() as temp:
            manifest = extract(args.archive, Path(temp))
            print(f"Verified {len(manifest['files'])} files; backup from {manifest['createdAt']}")
    else:
        destination = Path(args.destination)
        destination.mkdir(mode=0o700, parents=True, exist_ok=True)
        if any(destination.iterdir()):
            raise ValueError('Restore destination must be empty')
        manifest = extract(args.archive, destination)
        print(f"Restored and verified {len(manifest['files'])} files into {destination}")

if __name__ == '__main__':
    main()
