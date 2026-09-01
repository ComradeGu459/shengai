import argparse
import hashlib
import json
import os
import posixpath
import stat
import tarfile


REPARSE_POINT = 0x400


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("stage")
    parser.add_argument("archive")
    return parser.parse_args()


def is_reparse_point(path):
    return bool(getattr(os.lstat(path), "st_file_attributes", 0) & REPARSE_POINT)


def extended_path(path):
    if os.name == "nt" and not path.startswith("\\\\?\\"):
        return "\\\\?\\" + path
    return path


def archive_link_target(path, root):
    raw_target = os.readlink(path)
    if raw_target.startswith("\\\\?\\"):
        raw_target = raw_target[4:]
    target = extended_path(
        os.path.abspath(raw_target if os.path.isabs(raw_target) else os.path.join(os.path.dirname(path), raw_target))
    )
    root_real = os.path.realpath(root)
    target_real = os.path.realpath(target)
    if os.path.commonpath([root_real, target_real]).lower() != root_real.lower():
        raise RuntimeError(f"out-of-tree reparse target: {path} -> {target}")
    return os.path.relpath(target, os.path.dirname(path)).replace(os.sep, "/")


def write_member(path, name, root, archive, seen, counts):
    metadata = os.lstat(path)
    info = tarfile.TarInfo(name)
    info.mtime = int(metadata.st_mtime)
    info.uid = 0
    info.gid = 0
    info.uname = ""
    info.gname = ""

    if is_reparse_point(path):
        info.type = tarfile.SYMTYPE
        info.mode = 0o777
        info.linkname = archive_link_target(path, root)
        archive.addfile(info)
        counts["symlinkCount"] += 1
        counts["memberCount"] += 1
        return

    if stat.S_ISDIR(metadata.st_mode):
        info.type = tarfile.DIRTYPE
        info.mode = 0o755
        archive.addfile(info)
        counts["directoryCount"] += 1
        counts["memberCount"] += 1
        children = sorted(os.scandir(path), key=lambda entry: entry.name)
        for child in children:
            write_member(child.path, posixpath.join(name, child.name), root, archive, seen, counts)
        return

    if not stat.S_ISREG(metadata.st_mode):
        raise RuntimeError(f"unsupported filesystem entry: {path}")

    identity = (getattr(metadata, "st_dev", 0), getattr(metadata, "st_ino", 0), metadata.st_size)
    if identity in seen:
        info.type = tarfile.LNKTYPE
        info.mode = 0o644
        info.linkname = seen[identity]
        archive.addfile(info)
        counts["hardlinkCount"] += 1
        counts["memberCount"] += 1
        return

    info.type = tarfile.REGTYPE
    info.mode = 0o644
    info.size = metadata.st_size
    with open(path, "rb") as source:
        archive.addfile(info, source)
    seen[identity] = name
    counts["regularFileCount"] += 1
    counts["memberCount"] += 1


def main():
    args = parse_args()
    stage = extended_path(os.path.abspath(args.stage))
    archive_path = os.path.abspath(args.archive)
    if os.path.exists(archive_path):
        raise RuntimeError(f"refusing to overwrite archive: {archive_path}")
    roots = ["backend", "static"]
    if os.path.isdir(os.path.join(stage, "system-static")):
        roots.append("system-static")
    for required in roots:
        if not os.path.isdir(os.path.join(stage, required)):
            raise RuntimeError(f"missing required stage root: {required}")

    counts = {
        "memberCount": 0,
        "regularFileCount": 0,
        "directoryCount": 0,
        "symlinkCount": 0,
        "hardlinkCount": 0,
    }
    seen = {}
    try:
        with tarfile.open(archive_path, "w:gz", format=tarfile.PAX_FORMAT) as archive:
            for required in roots:
                write_member(os.path.join(stage, required), required, stage, archive, seen, counts)
    except Exception:
        if os.path.exists(archive_path):
            os.remove(archive_path)
        raise

    with open(archive_path, "rb") as source:
        digest = hashlib.sha256(source.read()).hexdigest()
    result = {**counts, "roots": roots, "bytes": os.path.getsize(archive_path), "sha256": digest}
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
