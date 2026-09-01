#!/usr/bin/env python3
"""离线验证候选 runner 的末帧时间与画面裁剪边界。"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from typing import Any


def load_runner(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location("qimao_geometry_candidate", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("candidate_import_spec_invalid")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def assert_case(
    module: ModuleType,
    raw_box: Any,
    captured_at_ms: int,
    duration_ms: int,
    expected: dict[str, int],
) -> None:
    result = module.box_from_result(
        raw_box,
        "边界",
        0.9,
        {
            "frameIndex": 0,
            "capturedAtMs": captured_at_ms,
            "width": 100,
            "height": 80,
        },
        "zh-CN",
        duration_ms,
    )
    actual = {key: result[key] for key in expected}
    if actual != expected:
        raise RuntimeError(f"geometry_boundary_mismatch:{actual!r}")


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("candidate_path_required")
    candidate = Path(sys.argv[1]).resolve(strict=True)
    module = load_runner(candidate)
    assert_case(
        module,
        [1.2, 2.1, 7.9, 9.0],
        9_500,
        10_000,
        {"x": 1, "y": 2, "width": 7, "height": 7, "startMs": 9_500, "endMs": 10_000},
    )
    assert_case(
        module,
        [[2.2, 3.0], [9.0, 3.0], [9.0, 11.0], [2.2, 11.0]],
        10_000,
        10_000,
        {"x": 2, "y": 3, "width": 7, "height": 8, "startMs": 9_999, "endMs": 10_000},
    )
    assert_case(
        module,
        [[2.2, 3.0], [9.0, 3.0], [9.0, 11.0], [2.2, 11.0]],
        1,
        1,
        {"x": 2, "y": 3, "width": 7, "height": 8, "startMs": 0, "endMs": 1},
    )
    print("geometry_preflight=passed boundaries=3")


if __name__ == "__main__":
    main()
