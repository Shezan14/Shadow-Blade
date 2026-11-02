# Graphics and Rendering

## Rendering pipeline

The game requires a WebGL 2 context and displays a fallback panel when one is unavailable. `WebGLRenderer` uses antialiasing, sRGB output, ACES filmic tone mapping, soft shadow maps, and a high-performance GPU preference. The canvas follows the browser viewport and caps device pixel ratio to control fill cost.

The camera is a perspective camera, which makes distant objects appear smaller and produces the expected third-person depth. Near and far clipping planes limit unnecessary depth range. Exponential fog blends distant ruins into the dark background and strengthens depth perception without post-processing.

## Modeling and transformations

The warrior, enemies, bosses, arena, pillars, crystals, ruins, weapons, and portals are assembled from boxes, cylinders, cones, spheres, planes, octahedra, and custom buffer geometry. Reusable materials and instanced/repeated forms keep memory and draw cost manageable. Translation moves characters and projectiles, rotation drives facing and attacks, and scale communicates enemy size, health bars, death reactions, and visual pulses.

Three.js composes each object's translation, quaternion/rotation, and scale into local and world matrices. Hierarchical groups are important: rotating an arm also moves the sword attached to that arm, while moving the player root carries the complete character.

## Lighting and shading

A hemisphere light supplies readable ambient light. A shadow-casting directional moon light establishes form, while four colored point lights identify Fire, Ice, Lightning, and Wind areas. These lights breathe subtly and brighten when their element is cast. Standard and Phong-style materials respond to lights; emissive materials make runes, cores, and crystals appear energized even in darkness.

The particle system uses a small custom GLSL shader. The vertex shader projects every point and scales it with camera distance. The fragment shader creates soft circular or diamond masks, rotates them, applies color and opacity, and discards invisible pixels.

## Performance strategy

The project avoids expensive bloom and large textures. Shadow resolution is fixed at 1024, particle capacity is bounded, effects are reused, and geometry remains low-poly. The runtime records FPS, draw calls, and triangle count. Only after several sustained low-FPS samples does it reduce render pixel density; sustained recovery restores quality gradually. Press F1 to inspect these values and F2 to display collision bounds.
