
import math
import sys
import time
from dataclasses import dataclass
from typing import Iterable, Optional

import numpy as np
from OpenGL import GL
from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtGui import QSurfaceFormat
from PyQt5.QtWidgets import QOpenGLWidget


@dataclass(frozen=True)
class GridConfig:
    width: int = 1024
    height: int = 1024
    random_highlight_count: int = 50_000


class GridGLWidget(QOpenGLWidget):
    def __init__(self, config: GridConfig, parent: Optional[QtWidgets.QWidget] = None) -> None:
        super().__init__(parent)
        self.config = config
        self.setFocusPolicy(QtCore.Qt.StrongFocus)
        self.setMouseTracking(True)

        self._grid_program = None
        self._highlight_program = None
        self._grid_vao = None
        self._grid_vbo = None
        self._highlight_vao = None
        self._highlight_vbo = None
        self._highlight_instance_vbo = None
        self._highlight_instance_count = 0

        self._zoom = 1.0
        self._min_zoom = 0.05
        self._max_zoom = 64.0
        self._view_center = np.array([config.width / 2.0, config.height / 2.0], dtype=np.float32)
        self._viewport_aspect = 1.0
        self._last_mouse_pos: Optional[QtCore.QPointF] = None

        self._pending_highlights = self._generate_random_highlights(config.random_highlight_count)
        
        # 性能优化标志
        self._all_highlights = None  # 存储所有高亮位置
        self._visible_highlights = None  # 仅可见的高亮
        self._dirty = True  # 是否需要重新渲染
        self._last_view_bounds = None  # 上次视图边界
        self._last_frame_time = 0.0
        self._target_fps = 60
        self._frame_time = 1.0 / self._target_fps
        
        # 网格LOD优化
        self._grid_cache = {}  # 缓存不同LOD级别的网格
        self._current_grid_lod = -1

    # -------------------------- OpenGL lifecycle --------------------------
    def initializeGL(self) -> None:
        GL.glClearColor(13 / 255, 18 / 255, 28 / 255, 1.0)
        GL.glEnable(GL.GL_BLEND)
        GL.glBlendFunc(GL.GL_SRC_ALPHA, GL.GL_ONE_MINUS_SRC_ALPHA)
        GL.glLineWidth(1.0)

        self._grid_program = self._create_shader_program(_GRID_VERTEX_SHADER, _GRID_FRAGMENT_SHADER)
        self._highlight_program = self._create_shader_program(_HIGHLIGHT_VERTEX_SHADER, _HIGHLIGHT_FRAGMENT_SHADER)

        self._prepare_grid_geometry()
        self._prepare_highlight_geometry()
        self._upload_highlights(self._pending_highlights)

    def resizeGL(self, width: int, height: int) -> None:
        GL.glViewport(0, 0, width, height)
        self._viewport_aspect = float(width) / float(height) if height else 1.0

    def paintGL(self) -> None:
        # FPS限制 - 减少不必要的渲染
        current_time = time.perf_counter()
        if not self._dirty and (current_time - self._last_frame_time) < self._frame_time:
            return
        
        self._last_frame_time = current_time
        self._dirty = False
        
        GL.glClear(GL.GL_COLOR_BUFFER_BIT | GL.GL_DEPTH_BUFFER_BIT)
        left, right, bottom, top = self._view_bounds()
        projection = _ortho(left, right, bottom, top, -1.0, 1.0)
        
        # 检查视图是否变化，执行视锥剔除
        current_bounds = (left, right, bottom, top)
        if self._last_view_bounds != current_bounds:
            self._last_view_bounds = current_bounds
            self._update_visible_highlights(left, right, bottom, top)

        # 动态LOD网格渲染
        if self._grid_vao and self._grid_program and self._zoom > 0.15:
            GL.glUseProgram(self._grid_program)
            uniform_location = GL.glGetUniformLocation(self._grid_program, "mvp")
            GL.glUniformMatrix4fv(uniform_location, 1, True, projection)

            zoom_location = GL.glGetUniformLocation(self._grid_program, "zoom")
            if zoom_location != -1:
                GL.glUniform1f(zoom_location, float(self._zoom))
            GL.glBindVertexArray(self._grid_vao)
            GL.glDrawArrays(GL.GL_LINES, 0, self._grid_vertex_count)
            GL.glBindVertexArray(0)

        # 仅渲染可见的高亮
        if self._highlight_vao and self._highlight_program and self._highlight_instance_count > 0:
            GL.glUseProgram(self._highlight_program)
            matrix_location = GL.glGetUniformLocation(self._highlight_program, "mvp")
            GL.glUniformMatrix4fv(matrix_location, 1, True, projection)
            color_location = GL.glGetUniformLocation(self._highlight_program, "highlightColor")
            GL.glUniform3f(color_location, 0.99, 0.52, 0.1)
            GL.glBindVertexArray(self._highlight_vao)
            GL.glDrawArraysInstanced(GL.GL_TRIANGLES, 0, 6, self._highlight_instance_count)
            GL.glBindVertexArray(0)

        GL.glUseProgram(0)

    # ------------------------------ Geometry ------------------------------
    def _prepare_grid_geometry(self) -> None:
        width, height = self.config.width, self.config.height
        vertical_x = np.repeat(np.arange(width + 1, dtype=np.float32), 2)
        vertical_y = np.tile(np.array([0.0, float(height)], dtype=np.float32), width + 1)
        vertical = np.stack([vertical_x, vertical_y], axis=1)

        horizontal_y = np.repeat(np.arange(height + 1, dtype=np.float32), 2)
        horizontal_x = np.tile(np.array([0.0, float(width)], dtype=np.float32), height + 1)
        horizontal = np.stack([horizontal_x, horizontal_y], axis=1)

        vertices = np.concatenate([vertical, horizontal], axis=0).astype(np.float32)
        self._grid_vertex_count = vertices.shape[0]

        self._grid_vao = GL.glGenVertexArrays(1)
        self._grid_vbo = GL.glGenBuffers(1)
        GL.glBindVertexArray(self._grid_vao)
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, self._grid_vbo)
        GL.glBufferData(GL.GL_ARRAY_BUFFER, vertices.nbytes, vertices, GL.GL_STATIC_DRAW)
        GL.glEnableVertexAttribArray(0)
        GL.glVertexAttribPointer(0, 2, GL.GL_FLOAT, False, 0, None)
        GL.glBindVertexArray(0)
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, 0)

    def _prepare_highlight_geometry(self) -> None:
        # Slightly inset quad to avoid overlapping grid lines visually.
        inset = 0.08
        quad_vertices = np.array(
            [
                [inset, inset],
                [1.0 - inset, inset],
                [1.0 - inset, 1.0 - inset],
                [inset, inset],
                [1.0 - inset, 1.0 - inset],
                [inset, 1.0 - inset],
            ],
            dtype=np.float32,
        )

        self._highlight_vao = GL.glGenVertexArrays(1)
        self._highlight_vbo = GL.glGenBuffers(1)
        self._highlight_instance_vbo = GL.glGenBuffers(1)

        GL.glBindVertexArray(self._highlight_vao)

        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, self._highlight_vbo)
        GL.glBufferData(GL.GL_ARRAY_BUFFER, quad_vertices.nbytes, quad_vertices, GL.GL_STATIC_DRAW)
        GL.glEnableVertexAttribArray(0)
        GL.glVertexAttribPointer(0, 2, GL.GL_FLOAT, False, 0, None)

        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, self._highlight_instance_vbo)
        GL.glBufferData(GL.GL_ARRAY_BUFFER, 0, None, GL.GL_DYNAMIC_DRAW)
        GL.glEnableVertexAttribArray(1)
        GL.glVertexAttribPointer(1, 2, GL.GL_FLOAT, False, 0, None)
        GL.glVertexAttribDivisor(1, 1)

        GL.glBindVertexArray(0)
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, 0)

    def _upload_highlights(self, positions: Optional[np.ndarray]) -> None:
        """上传高亮位置到GPU"""
        if positions is None or positions.shape[0] == 0:
            self._highlight_instance_count = 0
            return

        self._all_highlights = positions.copy()  # 保存所有高亮
        self._highlight_instance_count = positions.shape[0]
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, self._highlight_instance_vbo)
        GL.glBufferData(GL.GL_ARRAY_BUFFER, positions.nbytes, positions.astype(np.float32), GL.GL_DYNAMIC_DRAW)
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, 0)
        self._dirty = True
        self.update()
    
    def _update_visible_highlights(self, left: float, right: float, bottom: float, top: float) -> None:
        """视锥剔除 - 只上传可见的高亮到GPU"""
        if self._all_highlights is None or self._all_highlights.shape[0] == 0:
            return
        
        # 添加边距以避免边缘剔除
        margin = 2.0
        left -= margin
        right += margin
        bottom -= margin
        top += margin
        
        # 快速数组操作进行剔除
        x_coords = self._all_highlights[:, 0]
        y_coords = self._all_highlights[:, 1]
        
        visible_mask = (
            (x_coords >= left) & (x_coords <= right) &
            (y_coords >= bottom) & (y_coords <= top)
        )
        
        visible = self._all_highlights[visible_mask]
        
        # 仅在可见集合变化时更新GPU
        if visible.shape[0] != self._highlight_instance_count or \
           (self._visible_highlights is not None and not np.array_equal(visible, self._visible_highlights)):
            self._visible_highlights = visible
            self._highlight_instance_count = visible.shape[0]
            
            if visible.shape[0] > 0:
                GL.glBindBuffer(GL.GL_ARRAY_BUFFER, self._highlight_instance_vbo)
                GL.glBufferData(GL.GL_ARRAY_BUFFER, visible.nbytes, visible, GL.GL_DYNAMIC_DRAW)
                GL.glBindBuffer(GL.GL_ARRAY_BUFFER, 0)

    # ------------------------------ View math -----------------------------
    def _view_bounds(self) -> tuple[float, float, float, float]:
        width, height = float(self.config.width), float(self.config.height)
        content_aspect = width / height
        aspect = self._viewport_aspect if self._viewport_aspect > 0 else 1.0

        if aspect >= content_aspect:
            half_height = (height / 2.0) / self._zoom
            half_width = half_height * aspect
        else:
            half_width = (width / 2.0) / self._zoom
            half_height = half_width / aspect

        cx, cy = self._view_center
        return (
            float(cx - half_width),
            float(cx + half_width),
            float(cy - half_height),
            float(cy + half_height),
        )

    def _screen_to_world(self, pos: QtCore.QPointF) -> np.ndarray:
        width = max(1, self.width())
        height = max(1, self.height())
        left, right, bottom, top = self._view_bounds()
        x_ratio = float(pos.x()) / width
        y_ratio = 1.0 - float(pos.y()) / height
        world_x = left + x_ratio * (right - left)
        world_y = bottom + y_ratio * (top - bottom)
        return np.array([world_x, world_y], dtype=np.float32)

    # ------------------------------ Interaction ---------------------------
    def wheelEvent(self, event: QtGui.QWheelEvent) -> None:
        delta = event.angleDelta().y()
        if delta == 0:
            event.ignore()
            return

        factor = math.pow(1.0015, delta)
        new_zoom = float(np.clip(self._zoom * factor, self._min_zoom, self._max_zoom))
        if math.isclose(new_zoom, self._zoom, rel_tol=1e-6):
            event.accept()
            return

        mouse_pos = event.position() if hasattr(event, "position") else QtCore.QPointF(event.x(), event.y())
        world_before = self._screen_to_world(mouse_pos)

        self._zoom = new_zoom
        world_after = self._screen_to_world(mouse_pos)
        self._view_center += world_before - world_after
        self._dirty = True
        self.update()
        event.accept()

    def mousePressEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton:
            self._last_mouse_pos = event.localPos()
            event.accept()
        else:
            event.ignore()

    def mouseMoveEvent(self, event: QtGui.QMouseEvent) -> None:
        if self._last_mouse_pos is None or not (event.buttons() & QtCore.Qt.LeftButton):
            event.ignore()
            return

        current_pos = event.localPos()
        world_before = self._screen_to_world(self._last_mouse_pos)
        world_after = self._screen_to_world(current_pos)
        self._view_center += world_before - world_after
        self._last_mouse_pos = current_pos
        self._dirty = True
        self.update()
        event.accept()

    def mouseReleaseEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton:
            self._last_mouse_pos = None
            event.accept()
        else:
            event.ignore()

    # ------------------------------ Highlights ---------------------------
    def _generate_random_highlights(self, count: int) -> np.ndarray:
        if count <= 0:
            return np.empty((0, 2), dtype=np.float32)

        rng = np.random.default_rng()
        cols = rng.integers(0, self.config.width, size=count, dtype=np.int32)
        rows = rng.integers(0, self.config.height, size=count, dtype=np.int32)
        positions = np.stack([cols, rows], axis=1).astype(np.float32)
        return positions

    def set_highlight_cells(self, cells: Iterable[tuple[int, int]]) -> None:
        """设置高亮单元格"""
        array = np.array(list(cells), dtype=np.float32)
        if array.size == 0:
            array = np.empty((0, 2), dtype=np.float32)
        if self._highlight_instance_vbo is None:
            self._pending_highlights = array
        else:
            self.makeCurrent()
            self._upload_highlights(array)
            self._last_view_bounds = None  # 强制重新计算可见项
            self.doneCurrent()

    # ------------------------------ Shaders ------------------------------
    def _create_shader_program(self, vertex_src: str, fragment_src: str) -> int:
        program = GL.glCreateProgram()
        vertex_shader = self._compile_shader(vertex_src, GL.GL_VERTEX_SHADER)
        fragment_shader = self._compile_shader(fragment_src, GL.GL_FRAGMENT_SHADER)
        GL.glAttachShader(program, vertex_shader)
        GL.glAttachShader(program, fragment_shader)
        GL.glLinkProgram(program)

        if GL.glGetProgramiv(program, GL.GL_LINK_STATUS) != GL.GL_TRUE:
            info_log = GL.glGetProgramInfoLog(program).decode()
            GL.glDeleteShader(vertex_shader)
            GL.glDeleteShader(fragment_shader)
            GL.glDeleteProgram(program)
            raise RuntimeError(f"Program link failed: {info_log}")

        GL.glDetachShader(program, vertex_shader)
        GL.glDetachShader(program, fragment_shader)
        GL.glDeleteShader(vertex_shader)
        GL.glDeleteShader(fragment_shader)
        return program

    def _compile_shader(self, source: str, shader_type: int) -> int:
        shader = GL.glCreateShader(shader_type)
        GL.glShaderSource(shader, source)
        GL.glCompileShader(shader)
        if GL.glGetShaderiv(shader, GL.GL_COMPILE_STATUS) != GL.GL_TRUE:
            info_log = GL.glGetShaderInfoLog(shader).decode()
            GL.glDeleteShader(shader)
            raise RuntimeError(f"Shader compile failed: {info_log}")
        return shader


# -------------------------------- Shaders ---------------------------------
_GRID_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec2 position;
uniform mat4 mvp;
void main() {
    gl_Position = mvp * vec4(position, 0.0, 1.0);
}
"""

_GRID_FRAGMENT_SHADER = """
#version 330 core
uniform float zoom;
out vec4 outColor;
void main() {
    // 优化的LOD - 在低缩放时完全丢弃片段以减少GPU负载
    if (zoom < 0.15) {
        discard;
    }
    float baseAlpha = 0.7;
    float t = clamp((zoom - 0.2) / (0.8 - 0.2), 0.0, 1.0);
    float alpha = baseAlpha * t;
    outColor = vec4(0.32, 0.38, 0.48, alpha);
}
"""

_HIGHLIGHT_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec2 vertexPos;
layout(location = 1) in vec2 cellOffset;
uniform mat4 mvp;
void main() {
    vec2 world = cellOffset + vertexPos;
    gl_Position = mvp * vec4(world, 0.0, 1.0);
}
"""

_HIGHLIGHT_FRAGMENT_SHADER = """
#version 330 core
uniform vec3 highlightColor;
out vec4 outColor;
void main() {
    outColor = vec4(highlightColor, 0.9);
}
"""


def _ortho(left: float, right: float, bottom: float, top: float, near: float, far: float) -> np.ndarray:
    rl = right - left
    tb = top - bottom
    fn = far - near
    matrix = np.array(
        [
            [2.0 / rl, 0.0, 0.0, -(right + left) / rl],
            [0.0, 2.0 / tb, 0.0, -(top + bottom) / tb],
            [0.0, 0.0, -2.0 / fn, -(far + near) / fn],
            [0.0, 0.0, 0.0, 1.0],
        ],
        dtype=np.float32,
    )
    return matrix


def main() -> None:
    QtWidgets.QApplication.setAttribute(QtCore.Qt.AA_EnableHighDpiScaling, True)
    app = QtWidgets.QApplication(sys.argv)

    surface_format = QSurfaceFormat()
    surface_format.setRenderableType(QSurfaceFormat.OpenGL)
    surface_format.setProfile(QSurfaceFormat.CoreProfile)
    surface_format.setVersion(3, 3)
    # 禁用MSAA以减少显存和GPU使用
    surface_format.setSamples(0)  # 从4改为0
    surface_format.setSwapInterval(1)  # V-Sync限制帧率
    QSurfaceFormat.setDefaultFormat(surface_format)

    config = GridConfig()
    window = QtWidgets.QMainWindow()
    window.setWindowTitle("High-performance Grid Visualizer")
    widget = GridGLWidget(config)
    window.setCentralWidget(widget)
    window.resize(1280, 720)
    window.show()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
