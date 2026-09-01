from __future__ import annotations

import argparse
import importlib.util
import inspect
import json
import math
import os
import sys
from pathlib import Path
from types import FrameType, ModuleType
from typing import Any


class DiagnosticFailure(BaseException):
    def __init__(self, category: str, frame_index: int | None) -> None:
        super().__init__(category)
        self.category = category
        self.frame_index = frame_index


last_internal_exception: tuple[str, str, int, int | None] | None = None
production_path: Path


def safe_component(value: str) -> str:
    return ''.join(char if char.isalnum() else '_' for char in value)[:80]


def frame_index_from(frame: FrameType | None) -> int | None:
    current = frame
    while current is not None:
        if current.f_code.co_name == 'recognize':
            value = current.f_locals.get('index')
            return value if isinstance(value, int) and value >= 0 else None
        current = current.f_back
    return None


def diagnostic_fail() -> None:
    caller = inspect.currentframe().f_back
    function = safe_component(caller.f_code.co_name if caller is not None else 'unknown')
    line = caller.f_lineno if caller is not None else 0
    raise DiagnosticFailure(f'explicit_{function}_line_{line}', frame_index_from(caller))


def trace(frame: FrameType, event: str, arg: Any):
    global last_internal_exception
    if event != 'exception' or Path(frame.f_code.co_filename).resolve() != production_path:
        return trace
    exception_type = arg[0]
    if exception_type in {DiagnosticFailure, SystemExit, StopIteration, GeneratorExit}:
        return trace
    last_internal_exception = (
        safe_component(exception_type.__name__),
        safe_component(frame.f_code.co_name),
        frame.f_lineno,
        frame_index_from(frame),
    )
    return trace


def load_module(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location('qimao_production_ocr_runner', path)
    if spec is None or spec.loader is None:
        raise DiagnosticFailure('production_runner_import', None)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def required(name: str) -> str:
    value = os.environ.get(name, '').strip()
    if not value:
        raise DiagnosticFailure(f'missing_{safe_component(name)}', None)
    return value


def validate_node_contract(boxes: list[dict[str, Any]], request: dict[str, Any]) -> None:
    if len(boxes) > 2_000:
        raise DiagnosticFailure('node_contract_box_limit', None)
    frames = {frame['frameIndex']: frame for frame in request['frames']}
    expected = {'frameIndex', 'text', 'confidence', 'language', 'x', 'y', 'width', 'height', 'startMs', 'endMs'}
    for box_index, box in enumerate(boxes):
        if not isinstance(box, dict) or set(box) != expected:
            raise DiagnosticFailure(f'node_contract_keys_box_{box_index}', None)
        frame_index = box['frameIndex']
        frame = frames.get(frame_index) if isinstance(frame_index, int) and not isinstance(frame_index, bool) else None
        if frame is None or frame_index < 0 or frame_index > 599:
            raise DiagnosticFailure(f'node_contract_frame_box_{box_index}', frame_index if isinstance(frame_index, int) else None)
        text = box['text']
        if not isinstance(text, str) or not text or len(text) > 500:
            raise DiagnosticFailure(f'node_contract_text_box_{box_index}', frame_index)
        confidence = box['confidence']
        if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) \
                or not math.isfinite(confidence) or confidence < 0 or confidence > 1:
            raise DiagnosticFailure(f'node_contract_confidence_box_{box_index}', frame_index)
        if box['language'] != request['language']:
            raise DiagnosticFailure(f'node_contract_language_box_{box_index}', frame_index)
        for name, minimum, maximum in (
            ('x', 0, 7_679), ('y', 0, 4_319), ('width', 1, 7_680), ('height', 1, 4_320),
            ('startMs', 0, 86_400_000), ('endMs', 1, 86_400_000),
        ):
            value = box[name]
            if not isinstance(value, int) or isinstance(value, bool) or value < minimum or value > maximum:
                raise DiagnosticFailure(f'node_contract_{name}_box_{box_index}', frame_index)
        if box['x'] + box['width'] > frame['width'] or box['y'] + box['height'] > frame['height']:
            raise DiagnosticFailure(f'node_contract_geometry_box_{box_index}', frame_index)
        if box['endMs'] <= box['startMs'] or box['startMs'] > frame['capturedAtMs'] \
                or box['endMs'] < frame['capturedAtMs']:
            raise DiagnosticFailure(f'node_contract_time_box_{box_index}', frame_index)


def main() -> None:
    global production_path, last_internal_exception
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--request', required=True)
    wrapper_args = parser.parse_args()
    production_path = Path(required('QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT')).resolve()
    module = load_module(production_path)
    module.fail = diagnostic_fail
    sys.argv = [
        str(production_path),
        '--backend', required('QIMAO_LOCAL_OCR_SIDECAR_BACKEND'),
        '--model-dir', required('QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR'),
        '--det-model', 'PP-OCRv6_small_det',
        '--rec-model', 'PP-OCRv6_small_rec',
        '--model-digest', required('QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST'),
        '--protocol', 'screen_text_local_ocr_v1',
    ]
    sys.settrace(trace)
    args = module.parse_args()
    devnull_fd = os.open(os.devnull, os.O_WRONLY)
    sink = open(os.devnull, 'w', encoding='utf-8')
    try:
        with module.suppress_native_output(devnull_fd, sink):
            engine = module.build_ocr_engine(args)
        last_internal_exception = None
        request = module.parse_request(json.loads(Path(wrapper_args.request).read_text(encoding='utf-8')))
        with module.suppress_native_output(devnull_fd, sink):
            boxes = module.recognize(engine, request)
        validate_node_contract(boxes, request)
        print(f'diagnostic=passed frames:{len(request["frames"])} boxes:{len(boxes)} node_contract:passed')
    except DiagnosticFailure as error:
        if last_internal_exception is None:
            category = error.category
            frame_index = error.frame_index
        else:
            exception_type, function, line, frame_index = last_internal_exception
            category = f'exception_{exception_type}_{function}_line_{line}'
        suffix = f' frame_index:{frame_index}' if frame_index is not None else ''
        print(f'diagnostic=failed category:{category}{suffix}')
    finally:
        sys.settrace(None)
        sink.close()
        os.close(devnull_fd)


if __name__ == '__main__':
    try:
        main()
    except DiagnosticFailure as error:
        print(f'diagnostic=failed category:{error.category}')
    except BaseException as error:
        print(f'diagnostic=failed category:wrapper_{safe_component(type(error).__name__)}')
