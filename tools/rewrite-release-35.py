import copy
import hashlib
import io
import json
import os
import posixpath
import subprocess
import sys
import tarfile


base_archive, wrapper_root, output_archive, output_manifest, output_audit = map(os.path.abspath, sys.argv[1:6])
replacement_paths = {
    "backend/src/modules/terms/term-openai-compatible-adapter.ts": os.path.join(wrapper_root, "backend", "src", "modules", "terms", "term-openai-compatible-adapter.ts"),
    "backend/dist/modules/terms/term-openai-compatible-adapter.js": os.path.join(wrapper_root, "backend", "dist", "modules", "terms", "term-openai-compatible-adapter.js"),
    "backend/dist/modules/terms/term-openai-compatible-adapter.js.map": os.path.join(wrapper_root, "backend", "dist", "modules", "terms", "term-openai-compatible-adapter.js.map"),
}


def digest_bytes(data):
    return hashlib.sha256(data).hexdigest()


def digest_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def member_digest(tf, member):
    digest = hashlib.sha256()
    stream = tf.extractfile(member)
    if stream is None:
        raise RuntimeError(f"regular member cannot be read: {member.name}")
    with stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def member_bytes(tf, member):
    stream = tf.extractfile(member)
    if stream is None:
        raise RuntimeError(f"regular member cannot be read: {member.name}")
    with stream:
        return stream.read()


def link_is_safe(member, names):
    if not member.linkname or posixpath.isabs(member.linkname):
        return False
    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(member.name), member.linkname))
    return resolved not in ("..", ".") and not resolved.startswith("../") and resolved in names


def triple(member):
    return (member.name, member.type, member.linkname)


if any(os.path.exists(path) for path in (output_archive, output_manifest, output_audit)):
    raise RuntimeError("SERVER-35 output already exists")

replacements = {}
for name, path in replacement_paths.items():
    with open(path, "rb") as handle:
        replacements[name] = handle.read()

js_path = replacement_paths["backend/dist/modules/terms/term-openai-compatible-adapter.js"]
map_path = replacement_paths["backend/dist/modules/terms/term-openai-compatible-adapter.js.map"]
check = subprocess.run(["node", "--check", js_path], capture_output=True, text=True)
if check.returncode != 0:
    raise RuntimeError(f"replacement JS node --check failed: {check.stderr.strip()}")
json.loads(replacements["backend/dist/modules/terms/term-openai-compatible-adapter.js.map"].decode("utf-8"))
markers = [
    "flattenedKey",
    "thinking: { type: 'disabled' }",
    "max_tokens: 16_384",
    "TERM_TARGET_JSON_STRUCTURE_EXAMPLE",
]
marker_presence = {marker: marker in replacements["backend/dist/modules/terms/term-openai-compatible-adapter.js"].decode("utf-8") for marker in markers}
if not all(marker_presence.values()):
    raise RuntimeError(f"replacement marker gate failed: {marker_presence}")

try:
    with tarfile.open(base_archive, "r:gz") as source, tarfile.open(output_archive, "w:gz") as target:
        for member in source:
            info = copy.copy(member)
            if member.name in replacements:
                if not member.isfile():
                    raise RuntimeError(f"replacement member is not regular: {member.name}")
                data = replacements[member.name]
                info.size = len(data)
                target.addfile(info, io.BytesIO(data))
            elif member.isfile():
                stream = source.extractfile(member)
                if stream is None:
                    raise RuntimeError(f"source member cannot be read: {member.name}")
                with stream:
                    target.addfile(info, stream)
            else:
                target.addfile(info)

    with tarfile.open(base_archive, "r:gz") as before, tarfile.open(output_archive, "r:gz") as after:
        old_members = before.getmembers()
        new_members = after.getmembers()
        if len(old_members) != len(new_members):
            raise RuntimeError(f"member count mismatch: before={len(old_members)} after={len(new_members)}")
        old_triples = [triple(member) for member in old_members]
        new_triples = [triple(member) for member in new_members]
        if old_triples != new_triples:
            raise RuntimeError("name/type/linkname sequence changed")
        names = {member.name for member in new_members}
        links = [member for member in new_members if member.issym()]
        if len(links) != 476 or any(not link_is_safe(member, names) for member in links):
            raise RuntimeError("symlink relative-boundary gate failed")
        changed = []
        regular_files = []
        for old_member, new_member in zip(old_members, new_members):
            if old_member.isfile():
                old_sha = member_digest(before, old_member)
                new_sha = member_digest(after, new_member)
                if old_sha != new_sha:
                    changed.append(new_member.name)
                regular_files.append({"path": new_member.name, "bytes": new_member.size, "sha256": new_sha})
        if len(changed) != 3 or set(changed) != set(replacements):
            raise RuntimeError(f"content SHA diff is not exactly three replacements: {changed}")
        for name, data in replacements.items():
            entry = next(item for item in regular_files if item["path"] == name)
            if entry["bytes"] != len(data) or entry["sha256"] != digest_bytes(data):
                raise RuntimeError(f"replacement content mismatch: {name}")
        js_member = next(member for member in new_members if member.name == "backend/dist/modules/terms/term-openai-compatible-adapter.js")
        map_member = next(member for member in new_members if member.name == "backend/dist/modules/terms/term-openai-compatible-adapter.js.map")
        output_js = member_bytes(after, js_member).decode("utf-8")
        json.loads(member_bytes(after, map_member).decode("utf-8"))
        output_marker_presence = {marker: marker in output_js for marker in markers}
        if output_marker_presence != marker_presence:
            raise RuntimeError(f"reopened output marker gate failed: {output_marker_presence}")
        summary = {
            "memberCount": len(new_members),
            "regularFileCount": sum(1 for member in new_members if member.isfile()),
            "symlinkCount": len(links),
            "relativeSymlinkCount": len(links),
            "absoluteSymlinkCount": 0,
            "outOfTreeOrMissingSymlinkCount": 0,
            "changedRegularMembers": changed,
            "markerPresence": output_marker_presence,
            "nodeCheck": True,
            "mapJson": True,
        }

    archive_bytes = os.path.getsize(output_archive)
    archive_sha = digest_file(output_archive)
    manifest = {
        "schema": "qimao.term-control.release/v1",
        "candidateId": "term-provider-usage-20260830-r1",
        "generatedFrom": "term-provider-json-20260830-r1+BACK-25+BACK-10+usage-readUsage",
        "rewrite": "streaming-tarfile-member-rewrite",
        "baseArchive": {"bytes": os.path.getsize(base_archive), "sha256": digest_file(base_archive)},
        "packageLayout": ["backend", "deploy", "package.json", "packages", "pnpm-lock.yaml", "pnpm-workspace.yaml", "system-frontend"],
        "summary": summary,
        "files": regular_files,
        "archive": {"bytes": archive_bytes, "sha256": archive_sha},
    }
    with open(output_manifest, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    manifest_bytes = os.path.getsize(output_manifest)
    manifest_sha = digest_file(output_manifest)
    audit = {
        "schema": "qimao.term-control.release-audit/v1",
        "candidateId": manifest["candidateId"],
        "archive": {"bytes": archive_bytes, "sha256": archive_sha, "memberCount": summary["memberCount"]},
        "manifest": {"bytes": manifest_bytes, "sha256": manifest_sha},
        "rewrite": {"changedRegularMembers": changed, "contentShaDiffCount": len(changed)},
        "links": {"count": summary["symlinkCount"], "relative": summary["relativeSymlinkCount"], "absolute": summary["absoluteSymlinkCount"], "outOfTreeOrMissing": summary["outOfTreeOrMissingSymlinkCount"]},
        "contracts": {"nodeCheck": True, "mapJson": True, "markers": output_marker_presence},
        "packageLayout": manifest["packageLayout"],
    }
    with open(output_audit, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(audit, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps(audit, ensure_ascii=False, separators=(",", ":")))
except Exception:
    for path in (output_archive, output_manifest, output_audit):
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
    raise
