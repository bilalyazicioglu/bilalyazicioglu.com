#!/usr/bin/env bash
set -euo pipefail
image=${1:?usage: scripts/test-image.sh image expected-sha}
sha=${2:?expected-sha}
container="portfolio-image-drill-$$"
trap 'docker rm -fv "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" -e DEPLOYED_AT=2026-11-08T00:00:00Z "$image" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$container" node -e 'fetch("http://127.0.0.1:3000/api/status").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' 2>/dev/null; then break; fi
  sleep 1
done
docker exec -i "$container" node - "$sha" <<'JS'
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
  const base='http://127.0.0.1:3000';
  const status=await (await fetch(base+'/api/status')).json();
  assert.equal(status.backend,'homeserver');
  assert.equal(status.release.sha,process.argv[2]);
  assert.equal(status.release.activatedAt,'2026-11-08T00:00:00Z');
  assert.ok(status.release.builtAt);
  for (const path of ['/','/infra','/blog','/resume.pdf']) {
    const response=await fetch(base+path);assert.equal(response.status,200,path);
    await response.body.cancel();
  }
  assert.equal((await fetch(base+'/api/admin/posts')).status,404);
  fs.mkdirSync('/app/content/uploads/blog',{recursive:true});
  fs.writeFileSync('/app/content/uploads/blog/drill.svg','<svg></svg>');
  const media=await fetch(base+'/uploads/blog/drill.svg');
  assert.equal(media.status,200);assert.equal(await media.text(),'<svg></svg>');
  console.log('Image smoke passed: public status, pages, disabled admin and persistent media.');
})().catch(error=>{console.error(error);process.exit(1)});
JS
