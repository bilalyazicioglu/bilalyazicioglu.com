import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from backup import extract


class BackupTests(unittest.TestCase):
    def archive(self, directory, corrupt=False):
        root = Path(directory)
        archive = root / 'backup.tar.gz'
        files = {'content/blog/post.mdx': b'---\ntitle: draft\n---\nprivate', 'content/uploads/blog/photo.png': b'photo', 'content/manifest.json': b'nested', 'data/views.json': b'{"post":3}'}
        manifest = {'format': 1, 'createdAt': '2026-11-07T00:00:00Z', 'files': {k: hashlib.sha256(v).hexdigest() for k, v in files.items()}}
        with tarfile.open(archive, 'w:gz') as tar:
            for directory in ['content', 'content/blog', 'content/uploads', 'content/uploads/blog', 'data']:
                item = tarfile.TarInfo(directory); item.type = tarfile.DIRTYPE; tar.addfile(item)
            for name, content in {**files, 'manifest.json': json.dumps(manifest).encode()}.items():
                if corrupt and name == 'data/views.json': content = b'changed'
                item = tarfile.TarInfo(name); item.size = len(content); tar.addfile(item, io.BytesIO(content))
        return archive, files

    def test_restore_preserves_posts_uploads_and_views(self):
        with tempfile.TemporaryDirectory() as temp:
            archive, files = self.archive(temp)
            destination = Path(temp) / 'restore'; destination.mkdir()
            extract(archive, destination)
            for name, content in files.items(): self.assertEqual((destination / name).read_bytes(), content)

    def test_corruption_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive, _ = self.archive(temp, corrupt=True)
            destination = Path(temp) / 'restore'; destination.mkdir()
            with self.assertRaisesRegex(ValueError, 'checksum'): extract(archive, destination)

    def test_escape_and_links_are_rejected_before_extraction(self):
        for name, kind in [('../escape', tarfile.REGTYPE), ('content/link', tarfile.SYMTYPE), ('/absolute', tarfile.REGTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temp:
                archive = Path(temp) / 'bad.tar.gz'
                with tarfile.open(archive, 'w:gz') as tar:
                    item = tarfile.TarInfo(name); item.type = kind; item.linkname = '/etc/passwd'; tar.addfile(item)
                with self.assertRaisesRegex(ValueError, 'Unsafe'): extract(archive, Path(temp))

if __name__ == '__main__': unittest.main()
