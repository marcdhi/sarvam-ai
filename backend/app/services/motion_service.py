"""AI-powered motion graphics generation service.

Takes natural language descriptions and produces structured motion graphics
specifications (scenes, layers, keyframes, easing).
"""

from __future__ import annotations

import json
import uuid
from typing import Optional

import anthropic
import openai
from loguru import logger

from backend.app.config import settings
from backend.app.models.motion import (
    EasingName,
    Keyframe,
    LayerAppearance,
    LayerEffects,
    LayerTransform,
    LayerType,
    MotionLayer,
    MotionProject,
    MotionScene,
    SceneTransition,
    ShapeProperties,
    TextProperties,
    TransitionType,
)

# ─── System Prompt ──────────────────────────────────────────────────────────

MOTION_SYSTEM_PROMPT = """You are an expert motion graphics designer, like a senior animator who uses tools like Jitter and After Effects daily. You create beautiful, professional motion graphics specifications in structured JSON.

Given a user's description of the motion graphics they want, produce a complete animation specification as a JSON object.

Canvas coordinate system: origin (0,0) is top-left. Positive x is right, positive y is down.

Output this exact JSON structure:
{
  "scenes": [
    {
      "name": "Scene Name",
      "duration": 5,
      "bgColor": "#000000",
      "transition": {"type": "fade", "duration": 0.5},
      "layers": [
        {
          "name": "Layer Name",
          "type": "text|shape|image|group",
          "inPoint": 0,
          "outPoint": 5,
          "transform": {
            "x": 960, "y": 540,
            "width": 400, "height": 100,
            "rotation": 0, "opacity": 1,
            "scaleX": 1, "scaleY": 1,
            "anchorX": 0.5, "anchorY": 0.5
          },
          "appearance": {
            "fill": "#ffffff",
            "stroke": "transparent",
            "strokeWidth": 0,
            "borderRadius": 0
          },
          "effects": {
            "blur": 0,
            "shadowX": 0, "shadowY": 4, "shadowBlur": 10,
            "shadowColor": "rgba(0,0,0,0.3)", "shadowOpacity": 0
          },
          "textProps": {
            "text": "Hello World",
            "fontSize": 64,
            "fontFamily": "Inter",
            "fontWeight": 700,
            "letterSpacing": 0,
            "lineHeight": 1.2,
            "textAlign": "center",
            "color": "#ffffff"
          },
          "shapeProps": {
            "shapeType": "rectangle",
            "points": null
          },
          "keyframes": {
            "propertyName": [
              {"time": 0, "value": 0, "easing": "easeOut"},
              {"time": 1.5, "value": 100, "easing": "easeInOut"}
            ]
          }
        }
      ]
    }
  ]
}

RULES:
1. Only include textProps for text layers, shapeProps for shape layers
2. Keyframes are ABSOLUTE times in seconds (not relative)
3. Available easing values: "linear", "easeIn", "easeOut", "easeInOut", "spring", "bounce"
4. Animatable properties: x, y, width, height, rotation, opacity, scaleX, scaleY, blur, shadowBlur, shadowOpacity, fontSize, letterSpacing, borderRadius, strokeWidth, trimStart, trimEnd
5. Color properties (fill, stroke) can also be keyframed with hex string values
6. Position elements relative to the canvas size provided
7. Use professional motion design principles: stagger animations, use easing, create visual hierarchy
8. Layer order matters: first layer = bottom, last layer = top (like z-index)
9. Available transition types between scenes: "none", "fade", "slideLeft", "slideRight", "slideUp", "slideDown", "dissolve", "wipe"
10. Keep text concise and impactful for motion graphics
11. Use complementary colors and consistent visual style
12. Create smooth, polished animations — avoid jarring movements

Return ONLY valid JSON, no markdown formatting or explanation."""


MOTION_EDIT_PROMPT = """You are editing an existing motion graphics scene. The user wants to modify it.

Current scene JSON:
{scene_json}

User's edit instruction: {instruction}

Apply the requested changes and return the COMPLETE updated scene JSON (same structure as above). Only modify what the user asked for — keep everything else the same. Return ONLY valid JSON."""


# ─── Service ────────────────────────────────────────────────────────────────

class MotionService:
    def __init__(self) -> None:
        self._anthropic: anthropic.Anthropic | None = None
        self._openai: openai.OpenAI | None = None

    @property
    def anthropic_client(self) -> anthropic.Anthropic:
        if self._anthropic is None:
            self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        return self._anthropic

    @property
    def openai_client(self) -> openai.OpenAI:
        if self._openai is None:
            self._openai = openai.OpenAI(api_key=settings.openai_api_key)
        return self._openai

    # ─── Generate from Prompt ───────────────────────────────────────────

    async def generate_from_prompt(
        self,
        prompt: str,
        canvas_width: int = 1920,
        canvas_height: int = 1080,
        duration: float = 5,
        style: Optional[str] = None,
    ) -> MotionProject:
        """Generate a complete motion graphics project from a text description."""
        user_prompt = f"""Create a motion graphics animation for the following:

Description: {prompt}
Canvas size: {canvas_width}x{canvas_height}
Target duration: {duration} seconds
"""
        if style:
            user_prompt += f"Visual style: {style}\n"

        user_prompt += "\nGenerate the full scene specification as JSON."

        raw_json = await self._call_llm(user_prompt)
        return self._parse_project(raw_json, canvas_width, canvas_height)

    # ─── Edit Existing Scene ────────────────────────────────────────────

    async def edit_scene(
        self,
        scene: MotionScene,
        instruction: str,
    ) -> MotionScene:
        """Edit an existing scene based on a natural language instruction."""
        scene_json = scene.model_dump_json(indent=2)
        prompt = MOTION_EDIT_PROMPT.format(
            scene_json=scene_json,
            instruction=instruction,
        )
        raw_json = await self._call_llm(prompt, system=None)
        data = json.loads(raw_json)
        return self._parse_scene(data)

    # ─── LLM Call ───────────────────────────────────────────────────────

    async def _call_llm(self, user_prompt: str, system: Optional[str] = MOTION_SYSTEM_PROMPT) -> str:
        """Call the configured LLM and return raw text response."""
        import asyncio

        model = settings.script_model

        if model.startswith("claude"):
            def _call():
                kwargs: dict = {
                    "model": model,
                    "max_tokens": 8192,
                    "messages": [{"role": "user", "content": user_prompt}],
                }
                if system:
                    kwargs["system"] = system
                msg = self.anthropic_client.messages.create(**kwargs)
                return msg.content[0].text

            return await asyncio.to_thread(_call)

        else:
            # OpenAI-compatible
            def _call():
                messages = []
                if system:
                    messages.append({"role": "system", "content": system})
                messages.append({"role": "user", "content": user_prompt})
                resp = self.openai_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=8192,
                    temperature=0.7,
                )
                return resp.choices[0].message.content

            return await asyncio.to_thread(_call)

    # ─── Parsing ────────────────────────────────────────────────────────

    def _parse_project(self, raw_json: str, width: int, height: int) -> MotionProject:
        """Parse LLM JSON output into a MotionProject."""
        # Strip markdown code fences if present
        text = raw_json.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        data = json.loads(text)
        scenes_data = data.get("scenes", [data] if "layers" in data else [])

        scenes: list[MotionScene] = []
        for sd in scenes_data:
            scenes.append(self._parse_scene(sd))

        project_id = uuid.uuid4().hex[:12]
        return MotionProject(
            id=project_id,
            name="AI Generated Motion",
            canvasWidth=width,
            canvasHeight=height,
            fps=30,
            scenes=scenes,
        )

    def _parse_scene(self, data: dict) -> MotionScene:
        """Parse a single scene dict into a MotionScene."""
        layers: list[MotionLayer] = []
        for ld in data.get("layers", []):
            layers.append(self._parse_layer(ld))

        transition = None
        if "transition" in data and data["transition"]:
            td = data["transition"]
            transition = SceneTransition(
                type=TransitionType(td.get("type", "none")),
                duration=td.get("duration", 0.5),
            )

        return MotionScene(
            id=uuid.uuid4().hex[:12],
            name=data.get("name", "Scene"),
            duration=data.get("duration", 5),
            bgColor=data.get("bgColor", "#000000"),
            layers=layers,
            transition=transition,
        )

    def _parse_layer(self, data: dict) -> MotionLayer:
        """Parse a single layer dict into a MotionLayer."""
        layer_type = LayerType(data.get("type", "shape"))

        # Parse transform
        t = data.get("transform", {})
        transform = LayerTransform(
            x=t.get("x", 0), y=t.get("y", 0),
            width=t.get("width", 200), height=t.get("height", 200),
            rotation=t.get("rotation", 0), opacity=t.get("opacity", 1),
            scaleX=t.get("scaleX", 1), scaleY=t.get("scaleY", 1),
            anchorX=t.get("anchorX", 0.5), anchorY=t.get("anchorY", 0.5),
        )

        # Parse appearance
        a = data.get("appearance", {})
        appearance = LayerAppearance(
            fill=a.get("fill", "#ffffff"),
            stroke=a.get("stroke", "transparent"),
            strokeWidth=a.get("strokeWidth", 0),
            borderRadius=a.get("borderRadius", 0),
        )

        # Parse effects
        e = data.get("effects", {})
        effects = LayerEffects(
            blur=e.get("blur", 0),
            shadowX=e.get("shadowX", 0), shadowY=e.get("shadowY", 0),
            shadowBlur=e.get("shadowBlur", 0),
            shadowColor=e.get("shadowColor", "rgba(0,0,0,0.3)"),
            shadowOpacity=e.get("shadowOpacity", 0),
        )

        # Parse type-specific props
        text_props = None
        if layer_type == LayerType.text and "textProps" in data:
            tp = data["textProps"]
            text_props = TextProperties(**{k: v for k, v in tp.items() if v is not None})

        shape_props = None
        if layer_type == LayerType.shape and "shapeProps" in data:
            sp = data["shapeProps"]
            shape_props = ShapeProperties(**{k: v for k, v in sp.items() if v is not None})

        # Parse keyframes
        keyframes: dict[str, list[Keyframe]] = {}
        for prop, kf_list in data.get("keyframes", {}).items():
            parsed_kfs: list[Keyframe] = []
            for kf in kf_list:
                easing_val = kf.get("easing", "easeInOut")
                try:
                    easing = EasingName(easing_val)
                except ValueError:
                    easing = EasingName.ease_in_out
                parsed_kfs.append(Keyframe(
                    id=uuid.uuid4().hex[:8],
                    time=kf["time"],
                    value=kf["value"],
                    easing=easing,
                ))
            keyframes[prop] = parsed_kfs

        # Parse children for groups
        children = None
        if layer_type == LayerType.group and "children" in data:
            children = [self._parse_layer(c) for c in data["children"]]

        return MotionLayer(
            id=uuid.uuid4().hex[:12],
            name=data.get("name", "Layer"),
            type=layer_type,
            visible=data.get("visible", True),
            locked=data.get("locked", False),
            inPoint=data.get("inPoint", 0),
            outPoint=data.get("outPoint", 5),
            transform=transform,
            appearance=appearance,
            effects=effects,
            textProps=text_props,
            shapeProps=shape_props,
            keyframes=keyframes,
            children=children,
        )


# Singleton
motion_service = MotionService()
