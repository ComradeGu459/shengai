#!/usr/bin/env python3
"""PP-OCRv6 Small 的 RapidOCR 直载 ONNX runner。

该进程只从 stdin 读取严格 JSON 请求，从 stdout 写仅含 boxes 的 JSON。模型、后端和
digest 全部由父进程显式传入；RapidOCR 只接收本地 det/rec/class ONNX 文件，不下载模型、
不切换后端、不输出输入帧或模型路径。
"""

from __future__ import annotations

import argparse
import base64
import contextlib
import json
import math
import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


PROTOCOL = "screen_text_local_ocr_v1"
DETECTION_MODEL = "PP-OCRv6_small_det"
RECOGNITION_MODEL = "PP-OCRv6_small_rec"
CLASSIFICATION_MODEL = "ch_ppocr_mobile_v2.0_cls_mobile.onnx"
BACKENDS = {"openvino", "onnxruntime"}
SHA256 = 64


def fail() -> None:
    # 不输出异常正文、路径、模型名或输入内容；Node 父进程只把非零退出映射为 unknown。
    raise SystemExit(2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--backend", required=True)
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--det-model", required=True)
    parser.add_argument("--rec-model", required=True)
    parser.add_argument("--model-digest", required=True)
    parser.add_argument("--protocol", required=True)
    args = parser.parse_args()
    if args.backend not in BACKENDS or args.protocol != PROTOCOL:
        fail()
    if args.det_model != DETECTION_MODEL or args.rec_model != RECOGNITION_MODEL:
        fail()
    if len(args.model_digest) != SHA256 or any(char not in "0123456789abcdefABCDEF" for char in args.model_digest):
        fail()
    model_dir = Path(args.model_dir).resolve()
    det_dir = (model_dir / DETECTION_MODEL).resolve()
    rec_dir = (model_dir / RECOGNITION_MODEL).resolve()
    for child in (det_dir, rec_dir):
        try:
            child.relative_to(model_dir)
        except ValueError:
            fail()
        if not child.is_dir():
            fail()
        onnx_files = sorted(item for item in child.iterdir() if item.is_file() and item.suffix.casefold() == ".onnx")
        if len(onnx_files) != 1:
            fail()
    cls_path = (model_dir / CLASSIFICATION_MODEL).resolve()
    try:
        cls_path.relative_to(model_dir)
    except ValueError:
        fail()
    if not cls_path.is_file() or cls_path.suffix.casefold() != ".onnx":
        fail()
    args.model_dir = model_dir
    args.det_dir = det_dir
    args.rec_dir = rec_dir
    args.det_path = next(item for item in det_dir.iterdir() if item.is_file() and item.suffix.casefold() == ".onnx")
    args.rec_path = next(item for item in rec_dir.iterdir() if item.is_file() and item.suffix.casefold() == ".onnx")
    args.cls_path = cls_path
    return args


def parse_request(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail()
    expected = {"protocolVersion", "attemptId", "requestId", "modelVersion", "language", "media", "frames"}
    if set(value) != expected or value.get("protocolVersion") != PROTOCOL:
        fail()
    if not isinstance(value.get("frames"), list) or not value["frames"]:
        fail()
    return value


def decode_frame(item: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
    expected = {"frameIndex", "capturedAtMs", "width", "height", "contentType", "bytesBase64"}
    if set(item) != expected or item.get("contentType") not in {"image/png", "image/jpeg", "image/webp"}:
        fail()
    encoded = item.get("bytesBase64")
    if not isinstance(encoded, str) or not encoded or len(encoded) % 4:
        fail()
    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception:
        fail()
    if not raw or len(raw) > 7_500_000:
        fail()
    # OpenCV is the only image decoder used by this runner; no format fallback is attempted.
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        fail()
    if image is None:
        fail()
    return image, item


def box_from_result(
    raw_box: Any,
    text: str,
    confidence: float,
    frame: dict[str, Any],
    language: str,
    video_duration_ms: int,
) -> dict[str, Any]:
    try:
        points = raw_box.tolist() if hasattr(raw_box, "tolist") else raw_box
        if not isinstance(points, (list, tuple)) or len(points) != 4:
            fail()
        if all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in points):
            coordinates = [float(value) for value in points]
            x0, y0, right0, bottom0 = coordinates
            if right0 <= x0 or bottom0 <= y0:
                fail()
            polygon = [(x0, y0), (right0, bottom0)]
        else:
            polygon = []
            for point in points:
                if not isinstance(point, (list, tuple)) or len(point) < 2:
                    fail()
                x_value, y_value = point[0], point[1]
                if not isinstance(x_value, (int, float)) or not isinstance(y_value, (int, float)):
                    fail()
                polygon.append((float(x_value), float(y_value)))
        if not all(math.isfinite(coordinate) for point in polygon for coordinate in point):
            fail()
        frame_width = int(frame["width"])
        frame_height = int(frame["height"])
        if frame_width < 1 or frame_height < 1:
            fail()
        left_raw = min(point[0] for point in polygon)
        top_raw = min(point[1] for point in polygon)
        right_raw = max(point[0] for point in polygon)
        bottom_raw = max(point[1] for point in polygon)
        if right_raw <= 0 or bottom_raw <= 0 or left_raw >= frame_width or top_raw >= frame_height:
            fail()
        x = max(0, min(frame_width - 1, math.floor(left_raw)))
        y = max(0, min(frame_height - 1, math.floor(top_raw)))
        right = max(x + 1, min(frame_width, math.ceil(right_raw)))
        bottom = max(y + 1, min(frame_height, math.ceil(bottom_raw)))
    except Exception:
        fail()
    width = right - x
    height = bottom - y
    if not text or width < 1 or height < 1:
        fail()
    try:
        confidence_value = float(confidence)
    except Exception:
        fail()
    if confidence_value != confidence_value or confidence_value < 0 or confidence_value > 1:
        fail()
    captured_at_ms = frame["capturedAtMs"]
    start_ms = min(captured_at_ms, max(0, video_duration_ms - 1))
    end_ms = max(start_ms + 1, min(video_duration_ms, start_ms + 1_000))
    return {
        "frameIndex": frame["frameIndex"],
        "text": text,
        "confidence": confidence_value,
        "language": language,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "startMs": start_ms,
        "endMs": end_ms,
    }


def result_fields(value: Any) -> tuple[Any, Any, Any]:
    """读取 RapidOCR 输出的 boxes/txts/scores，不接受供应商 JSON fallback。"""
    if isinstance(value, dict):
        candidate: Any = value.get("res", value)
        if not isinstance(candidate, dict):
            fail()
        return candidate.get("boxes"), candidate.get("txts"), candidate.get("scores")
    boxes = getattr(value, "boxes", None)
    texts = getattr(value, "txts", None)
    scores = getattr(value, "scores", None)
    if boxes is None and texts is None and scores is None:
        return None, None, None
    if boxes is None or texts is None or scores is None:
        fail()
    return boxes, texts, scores


def as_sequence(value: Any) -> list[Any]:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        return list(value)
    fail()
    return []


def build_ocr_engine(args: argparse.Namespace) -> Any:
    """以显式本地 ONNX 路径创建单一 RapidOCR 引擎；失败即退出，不下载/回退。"""
    try:
        from rapidocr import EngineType, ModelType, OCRVersion, RapidOCR  # type: ignore
    except Exception:
        fail()
    engine_type = {
        "openvino": EngineType.OPENVINO,
        "onnxruntime": EngineType.ONNXRUNTIME,
    }.get(args.backend)
    if engine_type is None:
        fail()
    params = {
        "Global.model_root_dir": str(args.model_dir),
        "Global.use_cls": False,
        "Global.use_det": True,
        "Global.use_rec": True,
        "Global.log_level": "ERROR",
        "Det.engine_type": engine_type,
        "Det.lang_type": "ch",
        "Det.model_type": ModelType.SMALL,
        "Det.ocr_version": OCRVersion.PPOCRV6,
        "Det.model_path": str(args.det_path),
        "Det.limit_side_len": 736,
        "Det.limit_type": "min",
        "Det.thresh": 0.3,
        "Det.box_thresh": 0.6,
        "Det.unclip_ratio": 1.5,
        "Cls.engine_type": engine_type,
        "Cls.model_type": ModelType.MOBILE,
        "Cls.ocr_version": OCRVersion.PPOCRV4,
        "Cls.model_path": str(args.cls_path),
        "Rec.engine_type": engine_type,
        "Rec.lang_type": "ch",
        "Rec.model_type": ModelType.SMALL,
        "Rec.ocr_version": OCRVersion.PPOCRV6,
        "Rec.model_path": str(args.rec_path),
        "Rec.rec_keys_path": None,
        "Rec.rec_batch_num": 1,
    }
    try:
        return RapidOCR(params=params)
    except Exception:
        fail()


def recognize(engine: Any, request: dict[str, Any]) -> list[dict[str, Any]]:
    media = request.get("media")
    if not isinstance(media, dict) or media.get("inputKind") != "server_extracted_frames" or media.get("checksumAlgorithm") != "sha256":
        fail()
    video_duration_ms = media.get("videoDurationMs")
    if isinstance(video_duration_ms, bool) or not isinstance(video_duration_ms, int) or video_duration_ms < 1 or video_duration_ms > 86_400_000:
        fail()
    frames = []
    frame_meta = []
    for item in request["frames"]:
        if not isinstance(item, dict):
            fail()
        image, metadata = decode_frame(item)
        frames.append(image)
        frame_meta.append(metadata)
    boxes: list[dict[str, Any]] = []
    try:
        for index, image in enumerate(frames):
            result = engine(image, use_det=True, use_cls=False, use_rec=True)
            if index >= len(frame_meta):
                fail()
            rec_boxes, texts, scores = result_fields(result)
            if rec_boxes is None and texts is None and scores is None:
                continue
            if rec_boxes is None or texts is None or scores is None:
                fail()
            texts = as_sequence(texts)
            scores = as_sequence(scores)
            rec_boxes = as_sequence(rec_boxes)
            if len(texts) != len(scores):
                fail()
            if len(rec_boxes) != len(texts):
                fail()
            for raw_box, text, score in zip(rec_boxes, texts, scores):
                if not isinstance(text, str):
                    fail()
                boxes.append(box_from_result(raw_box, text.strip(), float(score), frame_meta[index], request["language"], video_duration_ms))
    except SystemExit:
        raise
    except Exception:
        fail()
    if len(boxes) > 2_000:
        fail()
    return boxes


@contextmanager
def suppress_native_output(devnull_fd: int, sink: Any) -> Iterator[None]:
    """将 Python 与原生 fd 输出一起隔离，且在退出时恢复原 fd。"""
    saved_stdout_fd = os.dup(1)
    saved_stderr_fd = os.dup(2)
    try:
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(devnull_fd, 1)
        os.dup2(devnull_fd, 2)
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            yield
    finally:
        try:
            os.dup2(saved_stdout_fd, 1)
        finally:
            os.close(saved_stdout_fd)
        try:
            os.dup2(saved_stderr_fd, 2)
        finally:
            os.close(saved_stderr_fd)


def run() -> None:
    protocol_fd: int | None = None
    protocol_out: Any | None = None
    devnull_fd: int | None = None
    sink: Any | None = None
    try:
        # 协议 fd 与进程 stdout 解耦；后续 dup2(1, /dev/null) 不会吞掉协议行。
        protocol_fd = os.dup(sys.stdout.fileno())
        protocol_out = os.fdopen(protocol_fd, "w", encoding="utf-8", buffering=1, closefd=True)
        protocol_fd = None
        devnull_fd = os.open(os.devnull, os.O_WRONLY)
        sink = open(os.devnull, "w", encoding="utf-8")
        args = parse_args()
        with suppress_native_output(devnull_fd, sink):
            engine = build_ocr_engine(args)
        protocol_out.write(json.dumps({"ready": PROTOCOL}, separators=(",", ":")))
        protocol_out.write("\n")
        protocol_out.flush()
        for line in sys.stdin:
            try:
                request = parse_request(json.loads(line))
                with suppress_native_output(devnull_fd, sink):
                    boxes = recognize(engine, request)
            except SystemExit:
                raise
            except Exception:
                fail()
            protocol_out.write(json.dumps({"boxes": boxes}, ensure_ascii=False, separators=(",", ":")))
            protocol_out.write("\n")
            protocol_out.flush()
    except SystemExit:
        raise
    except Exception:
        fail()
    finally:
        if sink is not None:
            sink.close()
        if devnull_fd is not None:
            os.close(devnull_fd)
        if protocol_out is not None:
            protocol_out.close()
        elif protocol_fd is not None:
            os.close(protocol_fd)


if __name__ == "__main__":
    run()
